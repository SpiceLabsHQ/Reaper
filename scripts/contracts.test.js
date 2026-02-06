/**
 * @fileoverview Structural contract tests for generated output files.
 *
 * Validates that all files produced by the EJS build system satisfy the
 * contracts Claude Code requires: valid YAML frontmatter, no EJS residue,
 * no template-variable leaks, and correct hooks.json schema.
 *
 * Runs post-build, consuming files from disk. Does not import the build
 * system or modify any files.
 *
 * @example
 * node --test scripts/contracts.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Paths — resolved relative to this file's parent (scripts/) then up to root
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '..');
const AGENTS_DIR = path.join(ROOT, 'agents');
const SKILLS_DIR = path.join(ROOT, 'skills');
const HOOKS_FILE = path.join(ROOT, 'hooks', 'hooks.json');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Recursively collects files matching a predicate under a directory.
 * @param {string} dir  - Directory to walk
 * @param {(name: string) => boolean} predicate - Filter by filename
 * @returns {string[]} Absolute paths of matching files
 */
function collectFiles(dir, predicate) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full, predicate));
    } else if (entry.isFile() && predicate(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Extracts the raw YAML frontmatter block from file content.
 * Returns null when no frontmatter delimiters are found.
 * @param {string} content - Full file content
 * @returns {string|null} The text between the opening and closing --- lines
 */
function extractFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : null;
}

/**
 * Strips fenced code blocks (``` ... ```) from markdown content so that
 * checks on prose do not false-positive on code examples.
 * @param {string} content - Markdown content
 * @returns {string} Content with fenced code blocks removed
 */
function stripCodeBlocks(content) {
  return content.replace(/^```[\s\S]*?^```/gm, '');
}

/**
 * Checks whether a YAML frontmatter block contains a given field name.
 * Uses a simple line-start match — no YAML parser needed.
 * @param {string} frontmatter - Raw frontmatter text (between --- delimiters)
 * @param {string} field       - Field name to look for (e.g. "name")
 * @returns {boolean}
 */
function frontmatterHasField(frontmatter, field) {
  const regex = new RegExp(`^${field}\\s*:`, 'm');
  return regex.test(frontmatter);
}

// ---------------------------------------------------------------------------
// Contract definitions (data-driven)
// ---------------------------------------------------------------------------

/**
 * EJS tag patterns that must never appear in generated output.
 * Each entry is a regex source string and a human-readable label.
 */
const EJS_TAG_PATTERNS = [
  { pattern: '<%=', label: 'output tag <%=' },
  { pattern: '<%-', label: 'unescaped output tag <%-' },
  { pattern: '-%>', label: 'trimming close tag -%>' },
  // Generic open/close — catch any remaining EJS tag variants.
  { pattern: '<%', label: 'open tag <%' },
  { pattern: '%>', label: 'close tag %>' },
];

/**
 * Patterns that indicate a template variable leaked as the literal
 * string "undefined".  We only flag occurrences that look like template
 * output (value positions) rather than normal English prose.
 *
 * Each regex is tested against every non-code-block line.
 */
const UNDEFINED_LEAK_PATTERNS = [
  // YAML-style value:  "key: undefined"
  /:\s+undefined\s*$/,
  // Assignment:        "= undefined"
  /=\s*undefined\s*$/,
  // Standalone on a line (possibly with whitespace)
  /^\s*undefined\s*$/,
];

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

const agentFiles = collectFiles(AGENTS_DIR, (name) => name.endsWith('.md'));
const skillDefinitionFiles = collectFiles(SKILLS_DIR, (name) => name === 'SKILL.md');
const allSkillMdFiles = collectFiles(SKILLS_DIR, (name) => name.endsWith('.md'));
const allGeneratedMdFiles = [...agentFiles, ...allSkillMdFiles];

// ---------------------------------------------------------------------------
// Contract 1 & 2: Agent frontmatter
// ---------------------------------------------------------------------------

describe('Contract: agent frontmatter', () => {
  assert.ok(
    agentFiles.length > 0,
    'Expected at least one agent .md file in agents/'
  );

  for (const filePath of agentFiles) {
    const relative = path.relative(ROOT, filePath);

    it(`${relative} has valid YAML frontmatter`, () => {
      const content = fs.readFileSync(filePath, 'utf8');
      const fm = extractFrontmatter(content);
      assert.ok(fm !== null, `${relative} is missing YAML frontmatter (--- delimiters)`);
    });

    it(`${relative} frontmatter contains "name" field`, () => {
      const content = fs.readFileSync(filePath, 'utf8');
      const fm = extractFrontmatter(content);
      assert.ok(fm !== null, `${relative} is missing frontmatter`);
      assert.ok(
        frontmatterHasField(fm, 'name'),
        `${relative} frontmatter is missing required "name" field`
      );
    });

    it(`${relative} frontmatter contains "description" field`, () => {
      const content = fs.readFileSync(filePath, 'utf8');
      const fm = extractFrontmatter(content);
      assert.ok(fm !== null, `${relative} is missing frontmatter`);
      assert.ok(
        frontmatterHasField(fm, 'description'),
        `${relative} frontmatter is missing required "description" field`
      );
    });
  }
});

// ---------------------------------------------------------------------------
// Contract 3: Skill frontmatter (SKILL.md files only)
// ---------------------------------------------------------------------------

describe('Contract: skill frontmatter', () => {
  assert.ok(
    skillDefinitionFiles.length > 0,
    'Expected at least one SKILL.md file in skills/'
  );

  for (const filePath of skillDefinitionFiles) {
    const relative = path.relative(ROOT, filePath);

    it(`${relative} has valid YAML frontmatter`, () => {
      const content = fs.readFileSync(filePath, 'utf8');
      const fm = extractFrontmatter(content);
      assert.ok(fm !== null, `${relative} is missing YAML frontmatter (--- delimiters)`);
    });

    it(`${relative} frontmatter contains "name" field`, () => {
      const content = fs.readFileSync(filePath, 'utf8');
      const fm = extractFrontmatter(content);
      assert.ok(fm !== null, `${relative} is missing frontmatter`);
      assert.ok(
        frontmatterHasField(fm, 'name'),
        `${relative} frontmatter is missing required "name" field`
      );
    });
  }
});

// ---------------------------------------------------------------------------
// Contract 4: No unresolved EJS tags in generated .md files
// ---------------------------------------------------------------------------

describe('Contract: no EJS residue in generated files', () => {
  assert.ok(
    allGeneratedMdFiles.length > 0,
    'Expected at least one generated .md file'
  );

  for (const filePath of allGeneratedMdFiles) {
    const relative = path.relative(ROOT, filePath);

    it(`${relative} contains no unresolved EJS tags`, () => {
      const content = fs.readFileSync(filePath, 'utf8');

      for (const { pattern, label } of EJS_TAG_PATTERNS) {
        assert.ok(
          !content.includes(pattern),
          `${relative} contains EJS ${label} — build may have left unresolved template tags`
        );
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Contract 5: No template-variable "undefined" leaks outside code blocks
// ---------------------------------------------------------------------------

describe('Contract: no "undefined" template leaks outside code blocks', () => {
  for (const filePath of allGeneratedMdFiles) {
    const relative = path.relative(ROOT, filePath);

    it(`${relative} has no template-leaked "undefined" values`, () => {
      const content = fs.readFileSync(filePath, 'utf8');
      const prose = stripCodeBlocks(content);
      const lines = prose.split('\n');

      const leaks = [];
      for (let i = 0; i < lines.length; i++) {
        for (const re of UNDEFINED_LEAK_PATTERNS) {
          if (re.test(lines[i])) {
            leaks.push({ line: i + 1, text: lines[i].trim() });
          }
        }
      }

      assert.strictEqual(
        leaks.length,
        0,
        `${relative} has template-leaked "undefined" at:\n` +
          leaks.map((l) => `  line ${l.line}: ${l.text}`).join('\n')
      );
    });
  }
});

// ---------------------------------------------------------------------------
// Contract 6: hooks.json is valid JSON
// ---------------------------------------------------------------------------

describe('Contract: hooks.json structure', () => {
  it('hooks.json exists and parses as valid JSON', () => {
    assert.ok(
      fs.existsSync(HOOKS_FILE),
      `hooks.json not found at ${HOOKS_FILE}`
    );

    const raw = fs.readFileSync(HOOKS_FILE, 'utf8');
    let parsed;
    assert.doesNotThrow(() => {
      parsed = JSON.parse(raw);
    }, `hooks.json is not valid JSON`);
  });

  // ---------------------------------------------------------------------------
  // Contract 7: hooks.json has top-level { hooks: {} } structure
  // ---------------------------------------------------------------------------

  it('hooks.json has a top-level "hooks" object', () => {
    const parsed = JSON.parse(fs.readFileSync(HOOKS_FILE, 'utf8'));

    assert.ok(
      Object.prototype.hasOwnProperty.call(parsed, 'hooks'),
      'hooks.json is missing top-level "hooks" key'
    );
    assert.strictEqual(
      typeof parsed.hooks,
      'object',
      '"hooks" value must be an object'
    );
    assert.ok(
      parsed.hooks !== null && !Array.isArray(parsed.hooks),
      '"hooks" value must be a plain object (not null or array)'
    );
  });

  // ---------------------------------------------------------------------------
  // Contract 8: Each hook category entry has matcher + hooks array
  // ---------------------------------------------------------------------------

  it('each hook category entry has "matcher" (string) and "hooks" (array)', () => {
    const parsed = JSON.parse(fs.readFileSync(HOOKS_FILE, 'utf8'));
    const categories = Object.keys(parsed.hooks);

    assert.ok(
      categories.length > 0,
      'hooks.json "hooks" object should have at least one category'
    );

    for (const category of categories) {
      const entries = parsed.hooks[category];
      assert.ok(
        Array.isArray(entries),
        `hooks.${category} must be an array`
      );

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const loc = `hooks.${category}[${i}]`;

        assert.ok(
          Object.prototype.hasOwnProperty.call(entry, 'matcher'),
          `${loc} is missing "matcher" property`
        );
        assert.strictEqual(
          typeof entry.matcher,
          'string',
          `${loc}.matcher must be a string`
        );

        assert.ok(
          Object.prototype.hasOwnProperty.call(entry, 'hooks'),
          `${loc} is missing "hooks" property`
        );
        assert.ok(
          Array.isArray(entry.hooks),
          `${loc}.hooks must be an array`
        );
      }
    }
  });

  // ---------------------------------------------------------------------------
  // Contract 9: Each individual hook has type + command
  // ---------------------------------------------------------------------------

  it('each hook in a hooks array has "type" (string) and "command" (string)', () => {
    const parsed = JSON.parse(fs.readFileSync(HOOKS_FILE, 'utf8'));

    for (const category of Object.keys(parsed.hooks)) {
      const entries = parsed.hooks[category];

      for (let i = 0; i < entries.length; i++) {
        const hookList = entries[i].hooks;

        for (let j = 0; j < hookList.length; j++) {
          const hook = hookList[j];
          const loc = `hooks.${category}[${i}].hooks[${j}]`;

          assert.ok(
            Object.prototype.hasOwnProperty.call(hook, 'type'),
            `${loc} is missing "type" property`
          );
          assert.strictEqual(
            typeof hook.type,
            'string',
            `${loc}.type must be a string`
          );

          assert.ok(
            Object.prototype.hasOwnProperty.call(hook, 'command'),
            `${loc} is missing "command" property`
          );
          assert.strictEqual(
            typeof hook.command,
            'string',
            `${loc}.command must be a string`
          );
        }
      }
    }
  });
});
