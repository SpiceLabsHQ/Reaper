/**
 * @fileoverview Structural and semantic contract tests for generated output files.
 *
 * Validates that all files produced by the EJS build system satisfy the
 * contracts Claude Code requires: valid YAML frontmatter, no EJS residue,
 * no template-variable leaks, correct hooks.json schema, and semantic
 * invariants per agent category (e.g., coding agents contain TDD protocol).
 *
 * Runs post-build, consuming files from disk. Does not import the build
 * system or modify any files (imports only classification constants).
 *
 * @example
 * node --test scripts/contracts.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  AGENT_TYPES,
  TDD_AGENTS,
} = require('./build');

// ---------------------------------------------------------------------------
// Paths — resolved relative to this file's parent (scripts/) then up to root
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '..');
const AGENTS_DIR = path.join(ROOT, 'agents');
const COMMANDS_DIR = path.join(ROOT, 'commands');
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
// Contract: issue-tracker skills have required frontmatter fields
// ---------------------------------------------------------------------------

/**
 * All issue-tracker skills that must exist with valid frontmatter.
 * These are NOT user-invocable — they are platform skills loaded by
 * orchestrator commands based on detected task system.
 */
const ISSUE_TRACKER_SKILLS = [
  'issue-tracker-github',
  'issue-tracker-beads',
  'issue-tracker-jira',
  'issue-tracker-planfile',
];

/**
 * Resolves the generated SKILL.md path for a skill name.
 * @param {string} skillName - Skill directory name (e.g. 'issue-tracker-github')
 * @returns {string} Absolute path to the SKILL.md file
 */
function skillFilePath(skillName) {
  return path.join(SKILLS_DIR, skillName, 'SKILL.md');
}

describe('Contract: issue-tracker skill frontmatter', () => {
  for (const skillName of ISSUE_TRACKER_SKILLS) {
    const filePath = skillFilePath(skillName);
    const relative = `skills/${skillName}/SKILL.md`;

    it(`${relative} exists`, () => {
      assert.ok(
        fs.existsSync(filePath),
        `${relative} not found at ${filePath}`
      );
    });

    it(`${relative} has valid YAML frontmatter`, () => {
      const content = fs.readFileSync(filePath, 'utf8');
      const fm = extractFrontmatter(content);
      assert.ok(
        fm !== null,
        `${relative} is missing YAML frontmatter (--- delimiters)`
      );
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

    it(`${relative} frontmatter contains "allowed-tools" field`, () => {
      const content = fs.readFileSync(filePath, 'utf8');
      const fm = extractFrontmatter(content);
      assert.ok(fm !== null, `${relative} is missing frontmatter`);
      assert.ok(
        frontmatterHasField(fm, 'allowed-tools'),
        `${relative} frontmatter is missing required "allowed-tools" field`
      );
    });

    it(`${relative} is NOT user-invocable`, () => {
      const content = fs.readFileSync(filePath, 'utf8');
      const fm = extractFrontmatter(content);
      assert.ok(fm !== null, `${relative} is missing frontmatter`);
      assert.ok(
        !frontmatterHasField(fm, 'user-invocable'),
        `${relative} must NOT have "user-invocable" field (platform skills are loaded by orchestrator)`
      );
    });
  }
});

// ---------------------------------------------------------------------------
// Contract: issue-tracker skills contain all 7 abstract operations
// ---------------------------------------------------------------------------

/**
 * The 7 abstract operations every issue-tracker skill must implement.
 * Defined in the task-system-operations partial.
 */
const ABSTRACT_OPERATIONS = [
  'FETCH_ISSUE',
  'LIST_CHILDREN',
  'CREATE_ISSUE',
  'UPDATE_ISSUE',
  'ADD_DEPENDENCY',
  'QUERY_DEPENDENCY_TREE',
  'CLOSE_ISSUE',
];

describe('Contract: issue-tracker operations completeness', () => {
  for (const skillName of ISSUE_TRACKER_SKILLS) {
    const filePath = skillFilePath(skillName);
    const relative = `skills/${skillName}/SKILL.md`;

    for (const operation of ABSTRACT_OPERATIONS) {
      it(`${relative} contains operation ${operation}`, () => {
        assert.ok(
          fs.existsSync(filePath),
          `${relative} not found at ${filePath}`
        );
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(
          content.includes(operation),
          `${relative} is missing abstract operation "${operation}"`
        );
      });
    }
  }
});

// ---------------------------------------------------------------------------
// Contract: issue-tracker skills cover identical operation sets
// ---------------------------------------------------------------------------

describe('Contract: issue-tracker cross-skill operation consistency', () => {
  it('all 4 issue-tracker skills cover the same set of operations', () => {
    const operationSets = {};

    for (const skillName of ISSUE_TRACKER_SKILLS) {
      const filePath = skillFilePath(skillName);
      assert.ok(
        fs.existsSync(filePath),
        `skills/${skillName}/SKILL.md not found`
      );
      const content = fs.readFileSync(filePath, 'utf8');

      // Extract which of the 7 abstract operations appear in each skill
      const found = ABSTRACT_OPERATIONS.filter((op) => content.includes(op));
      operationSets[skillName] = found.sort();
    }

    // Compare all skills against the first one
    const [first, ...rest] = ISSUE_TRACKER_SKILLS;
    const reference = operationSets[first];

    for (const skillName of rest) {
      assert.deepStrictEqual(
        operationSets[skillName],
        reference,
        `Operation set mismatch: ${skillName} differs from ${first}.\n` +
          `  ${first}: [${reference.join(', ')}]\n` +
          `  ${skillName}: [${operationSets[skillName].join(', ')}]`
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Contract: consumer routing table references all 4 issue-tracker skills
// ---------------------------------------------------------------------------

/**
 * The 4 fully-qualified skill names expected in the Platform Skill Routing table.
 */
const EXPECTED_ROUTING_ENTRIES = [
  'reaper:issue-tracker-github',
  'reaper:issue-tracker-beads',
  'reaper:issue-tracker-jira',
  'reaper:issue-tracker-planfile',
];

describe('Contract: consumer routing table references all issue-tracker skills', () => {
  const filePath = path.join(COMMANDS_DIR, 'takeoff.md');
  const relative = 'commands/takeoff.md';

  for (const entry of EXPECTED_ROUTING_ENTRIES) {
    it(`${relative} routing table contains ${entry}`, () => {
      assert.ok(
        fs.existsSync(filePath),
        `${relative} not found at ${filePath}`
      );
      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(
        content.includes(entry),
        `${relative} Platform Skill Routing table is missing entry for "${entry}"`
      );
    });
  }
});

// ---------------------------------------------------------------------------
// Contract: consumer detection content contains expected mechanism keywords
// ---------------------------------------------------------------------------

/**
 * Keywords that must appear in the task-system-operations detection content.
 * These verify the detection mechanism is properly rendered in consumers.
 */
const DETECTION_KEYWORDS = [
  { keyword: 'git log', label: 'commit-based detection (git log)' },
  { keyword: 'TASK_SYSTEM', label: 'output variable (TASK_SYSTEM)' },
  { keyword: 'markdown_only', label: 'fallback detection (markdown_only)' },
];

describe('Contract: consumer detection content contains mechanism keywords', () => {
  const filePath = path.join(COMMANDS_DIR, 'takeoff.md');
  const relative = 'commands/takeoff.md';

  for (const { keyword, label } of DETECTION_KEYWORDS) {
    it(`${relative} contains detection keyword: ${label}`, () => {
      assert.ok(
        fs.existsSync(filePath),
        `${relative} not found at ${filePath}`
      );
      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(
        content.includes(keyword),
        `${relative} is missing detection mechanism keyword "${keyword}" (${label})`
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

// ---------------------------------------------------------------------------
// Contract 10: PostToolUse hook contains formatter allowlist mechanism
// ---------------------------------------------------------------------------

describe('Contract: PostToolUse hook formatter allowlist and logging', () => {
  /**
   * Helper to extract the PostToolUse Write|Edit hook command string.
   * @returns {string} The command string from the PostToolUse hook
   */
  function getPostToolUseCommand() {
    const parsed = JSON.parse(fs.readFileSync(HOOKS_FILE, 'utf8'));
    const postToolUse = parsed.hooks.PostToolUse;
    assert.ok(
      Array.isArray(postToolUse) && postToolUse.length > 0,
      'hooks.json must have PostToolUse entries'
    );
    const writeEditEntry = postToolUse.find((e) => e.matcher === 'Write|Edit');
    assert.ok(
      writeEditEntry,
      'PostToolUse must have a Write|Edit matcher entry'
    );
    assert.ok(
      writeEditEntry.hooks.length > 0,
      'PostToolUse Write|Edit entry must have at least one hook'
    );
    return writeEditEntry.hooks[0].command;
  }

  it('reads allowlist from CLAUDE.md using "Reaper: formatter-allowlist" pattern', () => {
    const cmd = getPostToolUseCommand();
    assert.ok(
      cmd.includes('Reaper: formatter-allowlist'),
      'PostToolUse command must check for "Reaper: formatter-allowlist" in CLAUDE.md'
    );
  });

  it('reads CLAUDE.md file to detect allowlist configuration', () => {
    const cmd = getPostToolUseCommand();
    assert.ok(
      cmd.includes('CLAUDE.md'),
      'PostToolUse command must reference CLAUDE.md for configuration'
    );
  });

  it('supports formatter execution logging via "Reaper: formatter-log" pattern', () => {
    const cmd = getPostToolUseCommand();
    assert.ok(
      cmd.includes('Reaper: formatter-log'),
      'PostToolUse command must check for "Reaper: formatter-log" in CLAUDE.md'
    );
  });

  it('preserves backwards compatibility with trailing true', () => {
    const cmd = getPostToolUseCommand();
    assert.ok(
      cmd.trimEnd().endsWith('true'),
      'PostToolUse command must end with "true" for safe exit (backwards compatible)'
    );
  });

  it('filters formatters against allowlist when configured', () => {
    const cmd = getPostToolUseCommand();
    // The command must contain logic that checks a formatter name against the
    // allowlist variable before execution. Look for the pattern of checking
    // if the allowlist is set and whether a formatter name is in it.
    assert.ok(
      cmd.includes('REAPER_ALLOWLIST'),
      'PostToolUse command must use a REAPER_ALLOWLIST variable for allowlist checking'
    );
  });

  it('logs formatter name and file path when logging is enabled', () => {
    const cmd = getPostToolUseCommand();
    // When logging is enabled, the command must output which formatter ran
    // and which file was formatted.
    assert.ok(
      cmd.includes('REAPER_LOG'),
      'PostToolUse command must use a REAPER_LOG variable for logging control'
    );
  });
});

// ---------------------------------------------------------------------------
// Semantic contract helpers
// ---------------------------------------------------------------------------

/**
 * Checks whether markdown content contains a level-2 heading matching a
 * regex pattern. Searches only outside fenced code blocks to avoid
 * false positives from code examples.
 * @param {string} content - Full markdown content
 * @param {RegExp} pattern - Pattern to match against heading text
 * @returns {boolean}
 */
function hasSection(content, pattern) {
  const prose = stripCodeBlocks(content);
  const headings = prose.match(/^## .+$/gm) || [];
  return headings.some((h) => pattern.test(h));
}

/**
 * Resolves the generated agent file path from agent name.
 * @param {string} agentName - Agent name (e.g. 'bug-fixer')
 * @returns {string} Absolute path to the generated agent .md file
 */
function agentFilePath(agentName) {
  return path.join(AGENTS_DIR, `${agentName}.md`);
}

// ---------------------------------------------------------------------------
// Semantic contract definitions (data-driven)
// ---------------------------------------------------------------------------

/**
 * Maps category keys to required section patterns.
 * Each entry produces a describe block asserting section presence.
 */
const SEMANTIC_CONTRACTS = {
  coding: {
    label: 'coding agents',
    agents: () => AGENT_TYPES.coding,
    sections: [
      { pattern: /TDD/, label: 'TDD protocol section' },
      { pattern: /GIT OPERATION PROHIBITIONS/i, label: 'git prohibitions section' },
      { pattern: /Pre-Output Verification/i, label: 'pre-output verification section' },
    ],
  },
  review: {
    label: 'review agents',
    agents: () => AGENT_TYPES.review,
    sections: [
      { pattern: /Output Requirements/i, label: 'output requirements section' },
      { pattern: /Required JSON/i, label: 'required JSON schema section' },
    ],
  },
  planning: {
    label: 'planning agents',
    agents: () => AGENT_TYPES.planning,
    sections: [
      { pattern: /^## Scope/, label: 'scope boundary section' },
    ],
  },
};

/**
 * Registers a describe block from a SEMANTIC_CONTRACTS entry.
 * Generates one test per agent per required section.
 * @param {string} key - Key into SEMANTIC_CONTRACTS
 */
function registerSemanticSuite(key) {
  const contract = SEMANTIC_CONTRACTS[key];
  describe(`Contract: ${contract.label} have required sections`, () => {
    const agents = contract.agents();
    assert.ok(
      agents.length > 0,
      `Expected at least one ${contract.label} agent`
    );

    for (const agentName of agents) {
      for (const { pattern, label } of contract.sections) {
        it(`${agentName} contains ${label}`, () => {
          const filePath = agentFilePath(agentName);
          assert.ok(fs.existsSync(filePath), `${agentName}.md not found`);
          const content = fs.readFileSync(filePath, 'utf8');
          assert.ok(
            hasSection(content, pattern),
            `${agentName}.md is missing required ${label}`
          );
        });
      }
    }
  });
}

// Register all semantic contract suites
registerSemanticSuite('coding');
registerSemanticSuite('review');
registerSemanticSuite('planning');

// ---------------------------------------------------------------------------
// Contract: feature-developer has blast-radius impact scan instruction
// ---------------------------------------------------------------------------

describe('Contract: feature-developer has impact scan instruction', () => {
  it('feature-developer contains blast-radius impact scan instruction', () => {
    const content = fs.readFileSync(agentFilePath('feature-developer'), 'utf8');
    assert.ok(
      /dangling|impact scan|direct importers/i.test(content),
      'feature-developer.md is missing blast-radius impact scan instruction'
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: TDD agents are a subset of coding agents
// ---------------------------------------------------------------------------

describe('Contract: TDD agents are classified as coding agents', () => {
  const codingAgents = AGENT_TYPES.coding;
  assert.ok(TDD_AGENTS.length > 0, 'Expected at least one TDD agent');

  for (const agentName of TDD_AGENTS) {
    it(`${agentName} is in AGENT_TYPES.coding`, () => {
      assert.ok(
        codingAgents.includes(agentName),
        `${agentName} is in TDD_AGENTS but not in AGENT_TYPES.coding`
      );
    });
  }
});

// ---------------------------------------------------------------------------
// Contract: command frontmatter
// ---------------------------------------------------------------------------

/**
 * All user-invocable commands that produce generated .md files.
 */
const ALL_COMMANDS = [
  'ship',
  'takeoff',
  'status-worktrees',
  'flight-plan',
  'squadron',
  'claude-sync',
  'start',
  'configure-quality-gates',
];

/**
 * Resolves the generated command file path from command name.
 * @param {string} commandName - Command name (e.g. 'ship')
 * @returns {string} Absolute path to the generated command .md file
 */
function commandFilePath(commandName) {
  return path.join(COMMANDS_DIR, `${commandName}.md`);
}

describe('Contract: command frontmatter', () => {
  assert.ok(
    ALL_COMMANDS.length > 0,
    'Expected at least one command .md file in commands/'
  );

  for (const commandName of ALL_COMMANDS) {
    const filePath = commandFilePath(commandName);
    const relative = `commands/${commandName}.md`;

    it(`${relative} has valid YAML frontmatter`, () => {
      assert.ok(fs.existsSync(filePath), `${relative} not found`);
      const content = fs.readFileSync(filePath, 'utf8');
      const fm = extractFrontmatter(content);
      assert.ok(
        fm !== null,
        `${relative} is missing YAML frontmatter (--- delimiters)`
      );
    });

    it(`${relative} frontmatter contains "description" field`, () => {
      assert.ok(fs.existsSync(filePath), `${relative} not found`);
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
// Semantic contract definitions for commands (data-driven)
// ---------------------------------------------------------------------------

/**
 * Maps command names to required section patterns.
 * Each entry produces a describe block asserting section presence.
 * Follows the same data-driven pattern as SEMANTIC_CONTRACTS for agents.
 */
const COMMAND_SEMANTIC_CONTRACTS = {
  ship: {
    label: 'ship command',
    commands: () => ['ship'],
    sections: [
      { pattern: /Scope Boundary/i, label: 'scope boundary section' },
      { pattern: /Error Handling/i, label: 'error handling section' },
      { pattern: /Background Task Cleanup/i, label: 'background task cleanup section' },
    ],
  },
  takeoff: {
    label: 'takeoff command',
    commands: () => ['takeoff'],
    sections: [
      { pattern: /Orchestrator Role/i, label: 'orchestrator role section' },
      { pattern: /Quality Gate/i, label: 'quality gate section' },
      { pattern: /Background Task Cleanup/i, label: 'background task cleanup section' },
    ],
  },
  'status-worktrees': {
    label: 'status-worktrees command',
    commands: () => ['status-worktrees'],
    sections: [
      { pattern: /Instructions/i, label: 'instructions section' },
      { pattern: /Example Output/i, label: 'example output section' },
    ],
  },
  'flight-plan': {
    label: 'flight-plan command',
    commands: () => ['flight-plan'],
    sections: [
      { pattern: /Scope Boundary/i, label: 'scope boundary section' },
      { pattern: /Background Task Cleanup/i, label: 'background task cleanup section' },
    ],
  },
  squadron: {
    label: 'squadron command',
    commands: () => ['squadron'],
    sections: [
      { pattern: /PHASE 1/i, label: 'phase 1 section' },
      { pattern: /Error Handling/i, label: 'error handling section' },
      { pattern: /Background Task Cleanup/i, label: 'background task cleanup section' },
    ],
  },
  'claude-sync': {
    label: 'claude-sync command',
    commands: () => ['claude-sync'],
    sections: [
      { pattern: /Pre-Flight Validation/i, label: 'pre-flight validation section' },
      { pattern: /Important Notes/i, label: 'important notes section' },
    ],
  },
  start: {
    label: 'start command',
    commands: () => ['start'],
    sections: [
      { pattern: /Scope Boundary/i, label: 'scope boundary section' },
      { pattern: /Mode 1/i, label: 'mode 1 bare invocation section' },
      { pattern: /Mode 2/i, label: 'mode 2 input classification section' },
    ],
  },
  'configure-quality-gates': {
    label: 'configure-quality-gates command',
    commands: () => ['configure-quality-gates'],
    sections: [
      { pattern: /detection/i, label: 'detection section' },
      { pattern: /approval flow/i, label: 'approval flow section' },
      { pattern: /claude\.md write/i, label: 'claude.md write section' },
      { pattern: /commit/i, label: 'commit section' },
    ],
  },
};

/**
 * Registers a describe block from a COMMAND_SEMANTIC_CONTRACTS entry.
 * Generates one test per command per required section.
 * Mirrors registerSemanticSuite but resolves paths from COMMANDS_DIR.
 * @param {string} key - Key into COMMAND_SEMANTIC_CONTRACTS
 */
function registerCommandSemanticSuite(key) {
  const contract = COMMAND_SEMANTIC_CONTRACTS[key];
  describe(`Contract: ${contract.label} has required sections`, () => {
    const commands = contract.commands();
    assert.ok(
      commands.length > 0,
      `Expected at least one ${contract.label} command`
    );

    for (const commandName of commands) {
      for (const { pattern, label } of contract.sections) {
        it(`${commandName} contains ${label}`, () => {
          const filePath = commandFilePath(commandName);
          assert.ok(fs.existsSync(filePath), `${commandName}.md not found`);
          const content = fs.readFileSync(filePath, 'utf8');
          assert.ok(
            hasSection(content, pattern),
            `${commandName}.md is missing required ${label}`
          );
        });
      }
    }
  });
}

// Register all command semantic contract suites
registerCommandSemanticSuite('ship');
registerCommandSemanticSuite('takeoff');
registerCommandSemanticSuite('status-worktrees');
registerCommandSemanticSuite('flight-plan');
registerCommandSemanticSuite('squadron');
registerCommandSemanticSuite('claude-sync');
registerCommandSemanticSuite('start');
registerCommandSemanticSuite('configure-quality-gates');

// ---------------------------------------------------------------------------
// Contract: takeoff materializes PLAN_CONTEXT before Gate 2 dispatch
// ---------------------------------------------------------------------------

describe('Contract: takeoff PLAN_CONTEXT materialization', () => {
  const filePath = path.join(COMMANDS_DIR, 'takeoff.md');
  const relative = 'commands/takeoff.md';

  it(`${relative} contains PLAN_CONTEXT materialization step`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      content.includes('PLAN_CONTEXT'),
      `${relative} must contain PLAN_CONTEXT materialization before Gate 2 dispatch`
    );
  });

  it(`${relative} searches .claude/plans/ for plan file before Gate 2`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      content.includes('.claude/plans/'),
      `${relative} must reference .claude/plans/ as the plan file source for PLAN_CONTEXT`
    );
  });

  it(`${relative} falls back to FETCH_ISSUE when no plan file found`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    // The PLAN_CONTEXT section must mention FETCH_ISSUE as the fallback source
    assert.ok(
      content.includes('FETCH_ISSUE'),
      `${relative} must reference FETCH_ISSUE as the fallback source for PLAN_CONTEXT`
    );
  });

  it(`${relative} PLAN_CONTEXT section appears before Step 4 (Deploy Gates)`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const planContextIdx = content.indexOf('PLAN_CONTEXT');
    const step4Idx = content.indexOf('### Step 4: Deploy Gates');
    assert.ok(
      planContextIdx !== -1,
      `${relative} must contain PLAN_CONTEXT`
    );
    assert.ok(
      step4Idx !== -1,
      `${relative} must contain "### Step 4: Deploy Gates"`
    );
    assert.ok(
      planContextIdx < step4Idx,
      `${relative} PLAN_CONTEXT must appear before "Step 4: Deploy Gates" (found at index ${planContextIdx}, Step 4 at ${step4Idx})`
    );
  });

  it(`${relative} documents graceful degradation when neither plan file nor issue body found`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    // Graceful degradation means omitting PLAN_CONTEXT with a warning, not failing the gate
    assert.ok(
      /warn|omit|skip|not found/i.test(content.slice(
        content.indexOf('PLAN_CONTEXT'),
        content.indexOf('PLAN_CONTEXT') + 2000
      )),
      `${relative} must document graceful degradation (warn/omit) when PLAN_CONTEXT cannot be resolved`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: test-runner validation does not require PLAN_CONTEXT or TEST_RUNNER_RESULTS
// (ADR-0012: test-runner is Gate 1; these fields are Gate 2 reviewer concerns)
// ---------------------------------------------------------------------------

describe('Contract: test-runner validation does not declare PLAN_CONTEXT or TEST_RUNNER_RESULTS as required inputs', () => {
  const filePath = path.join(AGENTS_DIR, 'test-runner.md');
  const relative = 'agents/test-runner.md';

  it(`${relative} should not require PLAN_CONTEXT in validation section`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    // test-runner is Gate 1; it should not declare PLAN_CONTEXT as a required input
    assert.ok(
      !content.match(/PLAN_CONTEXT.*required/i),
      `${relative} must not declare PLAN_CONTEXT as a required input — test-runner is Gate 1 and does not consume plan context`
    );
  });

  it(`${relative} should not require TEST_RUNNER_RESULTS in validation section`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    // TEST_RUNNER_RESULTS is passed from Gate 1 to Gate 2; test-runner must not require it of itself
    assert.ok(
      !content.match(/TEST_RUNNER_RESULTS.*required/i),
      `${relative} must not declare TEST_RUNNER_RESULTS as a required input — this field is produced by test-runner, not consumed by it`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: takeoff Step 3.5 passes lightweight PLAN_CONTEXT reference (ADR-0012)
// ---------------------------------------------------------------------------

describe('Contract: takeoff Step 3.5 passes lightweight PLAN_CONTEXT reference (ADR-0012)', () => {
  const filePath = path.join(COMMANDS_DIR, 'takeoff.md');
  const relative = 'commands/takeoff.md';

  it(`${relative} Step 3.5 should not instruct full-content materialization of PLAN_CONTEXT`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    // ADR-0012: takeoff must NOT read and inject full plan content — reviewers self-serve
    assert.ok(
      !content.match(/Materialize PLAN_CONTEXT/i),
      `${relative} must not contain "Materialize PLAN_CONTEXT" — ADR-0012 replaced full materialization with a lightweight reference`
    );
  });

  it(`${relative} Step 3.5 should pass task ID as the PLAN_CONTEXT reference`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    // Gate 2 reviewers receive a task reference, not materialized content
    assert.ok(
      content.match(/task:\s*\[TASK_ID\]/i),
      `${relative} must pass a task ID reference (task: [TASK_ID]) in the PLAN_CONTEXT block so Gate 2 reviewers can self-serve context`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: Visual vocabulary gauge states in generated command files
// ---------------------------------------------------------------------------

/**
 * Command files that include the visual-vocabulary partial.
 * Each must contain the six gauge state labels in their generated output.
 */
const VISUAL_VOCAB_COMMANDS = ['takeoff', 'ship', 'status-worktrees', 'squadron', 'flight-plan'];

/**
 * The six canonical gauge state labels from the visual-vocabulary partial.
 */
const GAUGE_STATES = ['LANDED', 'ON APPROACH', 'IN FLIGHT', 'TAKING OFF', 'TAXIING', 'FAULT'];

describe('Contract: command files contain visual vocabulary gauge states', () => {
  assert.ok(
    VISUAL_VOCAB_COMMANDS.length > 0,
    'Expected at least one command with visual vocabulary'
  );

  for (const commandName of VISUAL_VOCAB_COMMANDS) {
    const filePath = path.join(COMMANDS_DIR, `${commandName}.md`);
    const relative = `commands/${commandName}.md`;

    it(`${relative} exists`, () => {
      assert.ok(
        fs.existsSync(filePath),
        `${relative} not found at ${filePath}`
      );
    });

    for (const state of GAUGE_STATES) {
      it(`${relative} contains gauge state "${state}"`, () => {
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(
          content.includes(state),
          `${relative} is missing gauge state "${state}" from visual vocabulary`
        );
      });
    }
  }
});

// ---------------------------------------------------------------------------
// Contract: CLAUDE.md disable preamble in generated command files
// ---------------------------------------------------------------------------

describe('Contract: command files contain disable preamble', () => {
  for (const commandName of VISUAL_VOCAB_COMMANDS) {
    const filePath = path.join(COMMANDS_DIR, `${commandName}.md`);
    const relative = `commands/${commandName}.md`;

    it(`${relative} contains "Reaper: disable ASCII art" opt-out text`, () => {
      assert.ok(
        fs.existsSync(filePath),
        `${relative} not found at ${filePath}`
      );
      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(
        content.includes('Reaper: disable ASCII art'),
        `${relative} is missing the CLAUDE.md disable preamble ("Reaper: disable ASCII art")`
      );
    });
  }
});

// ---------------------------------------------------------------------------
// Contract: status-worktrees contains fleet dashboard elements
// ---------------------------------------------------------------------------

describe('Contract: status-worktrees contains fleet dashboard elements', () => {
  const filePath = path.join(COMMANDS_DIR, 'status-worktrees.md');
  const relative = 'commands/status-worktrees.md';

  it(`${relative} exists`, () => {
    assert.ok(
      fs.existsSync(filePath),
      `${relative} not found at ${filePath}`
    );
  });

  it(`${relative} contains fleet dashboard reference`, () => {
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      /[Ff]leet/i.test(content),
      `${relative} is missing fleet dashboard reference`
    );
  });

  it(`${relative} contains gauge bar rendering`, () => {
    const content = fs.readFileSync(filePath, 'utf8');
    // The status-worktrees command renders gauge bars using block characters
    assert.ok(
      content.includes('██'),
      `${relative} is missing gauge bar block characters`
    );
    assert.ok(
      content.includes('░░'),
      `${relative} is missing gauge bar empty block characters`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: status-worktrees TAKING OFF state detection and rendering
// ---------------------------------------------------------------------------

describe('Contract: status-worktrees TAKING OFF state in shell script', () => {
  const filePath = path.join(COMMANDS_DIR, 'status-worktrees.md');
  const relative = 'commands/status-worktrees.md';

  it(`${relative} determine_fleet_state detects TAKING OFF (TASK.md, no commits, no changes)`, () => {
    const content = fs.readFileSync(filePath, 'utf8');
    // The state detection logic must distinguish TAKING OFF from TAXIING
    // TAKING OFF: TASK.md exists but no commits beyond branch point and no uncommitted changes
    assert.ok(
      content.includes('TAKING OFF'),
      `${relative} shell script must detect TAKING OFF state`
    );
    // Must check for TASK.md in the state detection logic
    assert.ok(
      content.includes('TASK.md') && content.includes('TAKING OFF'),
      `${relative} must use TASK.md to distinguish TAKING OFF from TAXIING`
    );
  });

  it(`${relative} render_gauge includes TAKING OFF with ███░░░░░░░ bar`, () => {
    const content = fs.readFileSync(filePath, 'utf8');
    // The render_gauge function must have a case for TAKING OFF
    assert.ok(
      content.includes('"TAKING OFF"') && content.includes('███░░░░░░░'),
      `${relative} render_gauge must map TAKING OFF to ███░░░░░░░ gauge bar`
    );
  });

  it(`${relative} has SORTED_TAKINGOFF array for sort bucketing`, () => {
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      content.includes('SORTED_TAKINGOFF'),
      `${relative} must declare SORTED_TAKINGOFF array for sort bucketing`
    );
  });

  it(`${relative} sort order is FAULT, IN FLIGHT, TAKING OFF, ON APPROACH, TAXIING, LANDED`, () => {
    const content = fs.readFileSync(filePath, 'utf8');
    // The SORTED_FLEET merge must include TAKING OFF between IN FLIGHT and ON APPROACH
    const sortedFleetLine = content.match(/SORTED_FLEET=\(.*\)/);
    assert.ok(
      sortedFleetLine,
      `${relative} must have a SORTED_FLEET merge line`
    );
    const mergedLine = sortedFleetLine[0];
    const inflightIndex = mergedLine.indexOf('INFLIGHT');
    const takingoffIndex = mergedLine.indexOf('TAKINGOFF');
    const onapproachIndex = mergedLine.indexOf('ONAPPROACH');
    assert.ok(
      inflightIndex < takingoffIndex && takingoffIndex < onapproachIndex,
      `SORTED_FLEET merge must order INFLIGHT before TAKINGOFF before ONAPPROACH`
    );
  });

  it(`${relative} fleet summary footer includes "taking off" count`, () => {
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      content.includes('taking off'),
      `${relative} fleet summary must include "taking off" count`
    );
  });

  it(`${relative} Status States section documents TAKING OFF`, () => {
    const content = fs.readFileSync(filePath, 'utf8');
    // The Status States section must list TAKING OFF with its gauge bar
    assert.ok(
      content.includes('`TAKING OFF`'),
      `${relative} Status States section must document TAKING OFF`
    );
  });

  it(`${relative} example output includes a TAKING OFF worktree`, () => {
    const content = fs.readFileSync(filePath, 'utf8');
    // The example output section should show a worktree in TAKING OFF state
    const exampleSection = content.slice(content.indexOf('## Example Output'));
    assert.ok(
      exampleSection.includes('TAKING OFF'),
      `${relative} Example Output must include a worktree in TAKING OFF state`
    );
  });

  it(`${relative} state determination comment documents TAKING OFF`, () => {
    const content = fs.readFileSync(filePath, 'utf8');
    // The comment block at the top of determine_fleet_state should document TAKING OFF
    assert.ok(
      content.includes('TAKING OFF') && content.includes('TASK.md exists'),
      `${relative} state determination comments must document TAKING OFF with TASK.md condition`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: squadron nameplate uses stance summaries, not generic "Take."
// ---------------------------------------------------------------------------

describe('Contract: squadron nameplate uses stance summaries', () => {
  const filePath = path.join(COMMANDS_DIR, 'squadron.md');
  const relative = 'commands/squadron.md';

  it(`${relative} does not contain generic "Take." nameplate`, () => {
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      !content.includes('** — Take.'),
      `${relative} still contains the generic "Take." nameplate — replace with a stance summary`
    );
  });

  it(`${relative} rendered example nameplate has a stance summary`, () => {
    const content = fs.readFileSync(filePath, 'utf8');
    // The rendered example should show DATABASE ARCHITECT with a multi-word
    // stance summary (not just "Take.") after the em-dash
    const nameplatePattern = /\*\*DATABASE ARCHITECT\*\* — \S.{10,}/;
    assert.ok(
      nameplatePattern.test(content),
      `${relative} rendered example nameplate must show a stance summary (10+ chars after em-dash)`
    );
  });

  it(`${relative} facilitator instruction mentions stance summary`, () => {
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      content.includes('stance summary'),
      `${relative} must instruct the facilitator to write a stance summary for each nameplate`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: takeoff Per-Unit Cycle contains TAKING OFF announcement
// ---------------------------------------------------------------------------

describe('Contract: takeoff Per-Unit Cycle TAKING OFF announcement', () => {
  const filePath = path.join(COMMANDS_DIR, 'takeoff.md');
  const relative = 'commands/takeoff.md';

  /**
   * Extracts the Per-Unit Cycle section from takeoff.md content.
   * The section starts at "### Per-Unit Cycle" and ends at the next
   * heading of the same or higher level (##).
   * @param {string} content - Full markdown content
   * @returns {string} The Per-Unit Cycle section text
   */
  function extractPerUnitCycle(content) {
    const startMarker = '### Per-Unit Cycle';
    const startIndex = content.indexOf(startMarker);
    if (startIndex === -1) return '';

    // Find the next ## or ### heading after the Per-Unit Cycle section
    const rest = content.slice(startIndex + startMarker.length);
    const nextSectionMatch = rest.match(/\n##[# ]/);
    if (nextSectionMatch) {
      return content.slice(startIndex, startIndex + startMarker.length + nextSectionMatch.index);
    }
    return content.slice(startIndex);
  }

  it(`${relative} Per-Unit Cycle contains TAKING OFF announcement`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const perUnitSection = extractPerUnitCycle(content);
    assert.ok(
      perUnitSection.length > 0,
      `${relative} must contain a Per-Unit Cycle section`
    );
    assert.ok(
      perUnitSection.includes('TAKING OFF'),
      `Per-Unit Cycle section must include a TAKING OFF announcement`
    );
  });

  it(`${relative} TAKING OFF announcement appears before coding agent deployment step`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const perUnitSection = extractPerUnitCycle(content);

    const takingOffIndex = perUnitSection.indexOf('TAKING OFF');
    const deployIndex = perUnitSection.indexOf('Deploy the specified coding agent');

    assert.ok(
      takingOffIndex >= 0,
      `Per-Unit Cycle must contain TAKING OFF`
    );
    assert.ok(
      deployIndex >= 0,
      `Per-Unit Cycle must contain coding agent deployment step`
    );
    assert.ok(
      takingOffIndex < deployIndex,
      `TAKING OFF announcement must appear BEFORE the coding agent deployment step`
    );
  });

  it(`${relative} TAKING OFF announcement includes gauge bar`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const perUnitSection = extractPerUnitCycle(content);

    // The TAKING OFF gauge bar is 3 filled + 7 empty: ███░░░░░░░
    assert.ok(
      perUnitSection.includes('███░░░░░░░'),
      `Per-Unit Cycle TAKING OFF announcement must include the gauge bar (███░░░░░░░)`
    );
  });

  it(`${relative} Preflight Card still uses TAXIING gauge (not TAKING OFF)`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');

    // Find the Preflight Announcement section
    const preflightSection = content.slice(
      content.indexOf('## Preflight Announcement'),
      content.indexOf('## Strategy Execution')
    );
    assert.ok(
      preflightSection.includes('TAXIING'),
      `Preflight Announcement section must still reference TAXIING`
    );
    // The Preflight Card template in visual vocabulary ends with TAXIING,
    // and the Preflight Announcement section should NOT say TAKING OFF
    assert.ok(
      !preflightSection.includes('TAKING OFF'),
      `Preflight Announcement section must NOT reference TAKING OFF (Preflight Card stays at TAXIING)`
    );
  });

  it(`${relative} Per-Unit Cycle distinguishes TAXIING from TAKING OFF`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const perUnitSection = extractPerUnitCycle(content);

    // The per-unit cycle should reference both states to distinguish them
    assert.ok(
      perUnitSection.includes('TAKING OFF'),
      `Per-Unit Cycle must reference TAKING OFF`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: squadron output must not contain Five Keys (CLAUDE.md scope boundary)
// ---------------------------------------------------------------------------

describe('Contract: squadron output respects scope boundary', () => {
  // The Five Keys are Reaper's internal design values and must not be imposed
  // on target projects via command output. Squadron assembles domain experts
  // that advise on the user's codebase, so its prompt must not leak
  // Reaper-internal philosophy into that advice.
  const filePath = path.join(COMMANDS_DIR, 'squadron.md');
  const relative = 'commands/squadron.md';

  it(`${relative} must not contain "Five Keys" (CLAUDE.md scope boundary)`, () => {
    assert.ok(
      fs.existsSync(filePath),
      `${relative} not found at ${filePath}`
    );
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      !content.includes('Five Keys'),
      `${relative} contains "Five Keys" — Reaper's internal design values must not leak into command output (scope boundary violation)`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: agent deployment template uses compressed 5-field structure
// ---------------------------------------------------------------------------

describe('Contract: agent deployment template is compressed (5 fields)', () => {
  const filePath = path.join(COMMANDS_DIR, 'takeoff.md');
  const relative = 'commands/takeoff.md';

  /**
   * Extracts the Agent Deployment Template section from takeoff.md.
   * @param {string} content - Full markdown content
   * @returns {string} The deployment template section text
   */
  function extractDeploymentSection(content) {
    const startMarker = '## Agent Deployment Template';
    const startIndex = content.indexOf(startMarker);
    if (startIndex === -1) return '';

    const rest = content.slice(startIndex + startMarker.length);
    const nextSectionMatch = rest.match(/\n## [^#]/);
    if (nextSectionMatch) {
      return content.slice(
        startIndex,
        startIndex + startMarker.length + nextSectionMatch.index
      );
    }
    return content.slice(startIndex);
  }

  it(`${relative} deployment template contains BRIEF field (renamed from DESCRIPTION)`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const section = extractDeploymentSection(content);
    assert.ok(
      section.length > 0,
      `${relative} must contain an Agent Deployment Template section`
    );
    assert.ok(
      section.includes('BRIEF:'),
      `deployment template must use BRIEF field (renamed from DESCRIPTION)`
    );
  });

  it(`${relative} deployment template does NOT contain QUALITY field`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const section = extractDeploymentSection(content);
    assert.ok(
      !section.includes('QUALITY:'),
      `deployment template must NOT contain QUALITY field (removed for compression)`
    );
  });

  it(`${relative} deployment template does NOT contain GATE_EXPECTATIONS field`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const section = extractDeploymentSection(content);
    assert.ok(
      !section.includes('GATE_EXPECTATIONS:'),
      `deployment template must NOT contain GATE_EXPECTATIONS field (removed for compression)`
    );
  });

  it(`${relative} deployment template has exactly 5 prompt fields`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const section = extractDeploymentSection(content);

    // Extract the code block that defines the template structure
    const codeBlockMatch = section.match(/```[\s\S]*?```/);
    assert.ok(codeBlockMatch, `deployment template must have a code block`);
    const codeBlock = codeBlockMatch[0];

    const expectedFields = ['TASK:', 'WORKTREE:', 'BRIEF:', 'SCOPE:', 'RESTRICTION:'];
    for (const field of expectedFields) {
      assert.ok(
        codeBlock.includes(field),
        `deployment template code block must contain ${field}`
      );
    }
  });

  it(`${relative} deployment template does NOT contain "Populating GATE_EXPECTATIONS"`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const section = extractDeploymentSection(content);
    assert.ok(
      !section.includes('Populating GATE_EXPECTATIONS'),
      `deployment template must NOT contain the "Populating GATE_EXPECTATIONS" paragraph`
    );
  });

  it(`${relative} deployment template retains "After the agent returns" guidance`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const section = extractDeploymentSection(content);
    assert.ok(
      section.includes('After the agent returns'),
      `deployment template must retain the "After the agent returns" paragraph`
    );
  });

  it(`${relative} deployment example uses glob patterns for SCOPE`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const section = extractDeploymentSection(content);

    // The example SCOPE should use glob patterns like src/auth/**
    assert.ok(
      /SCOPE:.*\*\*/.test(section),
      `deployment template example SCOPE must use glob patterns (e.g., src/auth/**)`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: quality gate iteration rules include resume-based retry pattern
// ---------------------------------------------------------------------------

describe('Contract: takeoff iteration rules include resume-based retry pattern', () => {
  const filePath = path.join(COMMANDS_DIR, 'takeoff.md');
  const relative = 'commands/takeoff.md';

  /**
   * Extracts the Iteration Rules section from takeoff.md content.
   * The section starts at "### Iteration Rules" and ends at the next
   * heading of the same or higher level (## or ###).
   * @param {string} content - Full markdown content
   * @returns {string} The Iteration Rules section text
   */
  function extractIterationRules(content) {
    const startMarker = '### Iteration Rules';
    const startIndex = content.indexOf(startMarker);
    if (startIndex === -1) return '';

    const rest = content.slice(startIndex + startMarker.length);
    const nextSectionMatch = rest.match(/\n###? [^#]/);
    if (nextSectionMatch) {
      return content.slice(
        startIndex,
        startIndex + startMarker.length + nextSectionMatch.index
      );
    }
    return content.slice(startIndex);
  }

  it(`${relative} Iteration Rules section exists`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const section = extractIterationRules(content);
    assert.ok(
      section.length > 0,
      `${relative} must contain an Iteration Rules section`
    );
  });

  it(`${relative} instructs capturing agent_id from Task responses`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const section = extractIterationRules(content);
    assert.ok(
      section.includes('agent_id'),
      `Iteration Rules must instruct capturing agent_id from Task tool responses`
    );
  });

  it(`${relative} includes Task --resume template for retry`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const section = extractIterationRules(content);
    assert.ok(
      section.includes('Task --resume'),
      `Iteration Rules must include Task --resume template for efficient retry`
    );
  });

  it(`${relative} includes resume-vs-fresh decision table`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const section = extractIterationRules(content);
    // Decision table must have conditions for resume, fresh deployment, and escalation
    assert.ok(
      section.includes('agent_id available') || section.includes('agent_id') && section.includes('Resume'),
      `Iteration Rules must include a resume-vs-fresh decision table`
    );
    assert.ok(
      section.includes('stale') || section.includes('error on resume'),
      `Decision table must handle stale agent_id (fallback to fresh deployment)`
    );
    assert.ok(
      section.includes('Max retries') || section.includes('exceeded'),
      `Decision table must handle max retries exceeded (escalation)`
    );
  });

  it(`${relative} preserves existing iteration rules content`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const section = extractIterationRules(content);
    // Original content must still be present
    assert.ok(
      section.includes('blocking_issues'),
      `Iteration Rules must preserve the original blocking_issues instruction`
    );
    assert.ok(
      section.includes('re-run the failed gate'),
      `Iteration Rules must preserve the re-run failed gate instruction`
    );
    assert.ok(
      section.includes('differential retry limits'),
      `Iteration Rules must preserve the differential retry limits reference`
    );
    assert.ok(
      section.includes('Work autonomously'),
      `Iteration Rules must preserve the autonomous work instruction`
    );
  });

  it(`${relative} does NOT add resume pattern to planner branch`, () => {
    // The workflow-planner should NOT contain Task --resume instructions
    const plannerPath = path.join(AGENTS_DIR, 'workflow-planner.md');
    assert.ok(fs.existsSync(plannerPath), 'workflow-planner.md not found');
    const plannerContent = fs.readFileSync(plannerPath, 'utf8');
    assert.ok(
      !plannerContent.includes('Task --resume'),
      `workflow-planner.md must NOT contain Task --resume (planner branch must be unmodified)`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: code-review specialty files (existence and line count)
// ---------------------------------------------------------------------------

describe('Contract: code-review skill specialty files', () => {
  const specialtyFiles = [
    {
      name: 'application-code',
      relative: 'skills/code-review/application-code.md',
      maxLines: 80,
    },
    {
      name: 'database-migration',
      relative: 'skills/code-review/database-migration.md',
      maxLines: 80,
    },
    {
      name: 'agent-prompt',
      relative: 'skills/code-review/agent-prompt.md',
      maxLines: 80,
    },
    {
      name: 'documentation',
      relative: 'skills/code-review/documentation.md',
      maxLines: 80,
    },
    {
      name: 'architecture-review',
      relative: 'skills/code-review/architecture-review.md',
      maxLines: 80,
    },
  ];

  for (const { name, relative, maxLines } of specialtyFiles) {
    const filePath = path.join(SKILLS_DIR, 'code-review', `${name}.md`);

    it(`${relative} exists after build`, () => {
      assert.ok(
        fs.existsSync(filePath),
        `${relative} not found at ${filePath} — run npm run build to generate`
      );
    });

    it(`${relative} is within the ${maxLines}-line limit`, () => {
      assert.ok(
        fs.existsSync(filePath),
        `${relative} not found — run npm run build to generate`
      );
      const content = fs.readFileSync(filePath, 'utf8');
      const lineCount = content.split('\n').length;
      assert.ok(
        lineCount <= maxLines,
        `${relative} exceeds ${maxLines}-line limit (${lineCount} lines) — keep specialty files concise`
      );
    });
  }
});

// ---------------------------------------------------------------------------
// Contract: code-review skill frontmatter and JSON output contract
// ---------------------------------------------------------------------------

describe('Contract: code-review skill', () => {
  const filePath = skillFilePath('code-review');
  const relative = 'skills/code-review/SKILL.md';

  it(`${relative} exists after build`, () => {
    assert.ok(
      fs.existsSync(filePath),
      `${relative} not found at ${filePath} — run npm run build to generate`
    );
  });

  it(`${relative} frontmatter contains "name" field`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const fm = extractFrontmatter(content);
    assert.ok(fm !== null, `${relative} is missing YAML frontmatter (--- delimiters)`);
    assert.ok(
      frontmatterHasField(fm, 'name'),
      `${relative} frontmatter is missing required "name" field`
    );
  });

  it(`${relative} frontmatter contains "description" field`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const fm = extractFrontmatter(content);
    assert.ok(fm !== null, `${relative} is missing frontmatter`);
    assert.ok(
      frontmatterHasField(fm, 'description'),
      `${relative} frontmatter is missing required "description" field`
    );
  });

  it(`${relative} frontmatter contains "allowed-tools" field`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const fm = extractFrontmatter(content);
    assert.ok(fm !== null, `${relative} is missing frontmatter`);
    assert.ok(
      frontmatterHasField(fm, 'allowed-tools'),
      `${relative} frontmatter is missing required "allowed-tools" field`
    );
  });

  it(`${relative} is NOT user-invocable`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const fm = extractFrontmatter(content);
    assert.ok(fm !== null, `${relative} is missing frontmatter`);
    assert.ok(
      !frontmatterHasField(fm, 'user-invocable'),
      `${relative} must NOT have "user-invocable" field (loaded by orchestrator, not user-invocable)`
    );
  });

  it(`${relative} documents that orchestrator computes all_checks_passed`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      content.includes('The orchestrator computes'),
      `${relative} must document that the orchestrator computes all_checks_passed (not the reviewer)`
    );
  });

  it(`${relative} is within the 150-line limit`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const lineCount = content.split('\n').length;
    assert.ok(
      lineCount <= 150,
      `${relative} exceeds 150-line limit (${lineCount} lines) — keep the skill concise`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: gate profile correctness (B1)
// ---------------------------------------------------------------------------

/**
 * All 10 work types that must appear in the gate profile lookup table.
 */
const GATE_PROFILE_WORK_TYPES = [
  'application_code',
  'test_code',
  'agent_prompt',
  'database_migration',
  'documentation',
  'infrastructure_config',
  'api_specification',
  'ci_cd_pipeline',
  'configuration',
  'architecture_review',
];

/**
 * The valid Gate 2 reviewer agents that may appear in the Gate 2 column.
 */
const VALID_GATE2_AGENTS = [
  'reaper:database-architect',
  'reaper:ai-prompt-engineer',
  'reaper:technical-writer',
  'reaper:deployment-engineer',
  'reaper:principal-engineer',
  'reaper:security-auditor',
];

describe('Contract: gate profile correctness — all 10 work types and valid Gate 2 agents', () => {
  const sourcePath = path.join(ROOT, 'src', 'partials', 'quality-gate-protocol.ejs');
  const sourceRelative = 'src/partials/quality-gate-protocol.ejs';

  it(`${sourceRelative} exists`, () => {
    assert.ok(
      fs.existsSync(sourcePath),
      `${sourceRelative} not found at ${sourcePath}`
    );
  });

  for (const workType of GATE_PROFILE_WORK_TYPES) {
    it(`${sourceRelative} mentions work type "${workType}"`, () => {
      assert.ok(fs.existsSync(sourcePath), `${sourceRelative} not found`);
      const content = fs.readFileSync(sourcePath, 'utf8');
      assert.ok(
        content.includes(workType),
        `${sourceRelative} is missing work type "${workType}" in the gate profile table`
      );
    });
  }

  it(`${sourceRelative} every Gate 2 column value is a valid Gate 2 agent`, () => {
    assert.ok(fs.existsSync(sourcePath), `${sourceRelative} not found`);
    const content = fs.readFileSync(sourcePath, 'utf8');

    // The gate profile table header is:
    //   | Work Type | Gate 1 (blocking) | Gate 2 (parallel) |
    // Gate 2 is the 3rd pipe-delimited column (0-indexed: 2).
    // Parse table data rows (skip header and separator rows).
    const tableRows = content.split('\n').filter((line) => {
      // Table data rows start and end with | and contain at least 3 cells
      if (!line.startsWith('|') || !line.endsWith('|')) return false;
      const cells = line.split('|').slice(1, -1);
      if (cells.length < 3) return false;
      // Skip separator rows (only dashes/spaces)
      if (/^[\s|-]+$/.test(line)) return false;
      // Skip header row
      if (line.includes('Gate 2 (parallel)')) return false;
      // Skip rows without a reaper: agent in column 2 (Gate 2 column)
      return cells[2] && cells[2].includes('reaper:');
    });

    assert.ok(
      tableRows.length > 0,
      `${sourceRelative} must contain gate profile table rows with Gate 2 agent values`
    );

    const foundAgents = [];
    for (const row of tableRows) {
      const cells = row.split('|').slice(1, -1);
      // Column index 2 is the Gate 2 column
      const gate2Cell = cells[2].trim();
      const agents = gate2Cell.match(/reaper:[a-z-]+/g) || [];
      foundAgents.push(...agents);
    }

    const uniqueAgents = [...new Set(foundAgents)];
    assert.ok(
      uniqueAgents.length > 0,
      `${sourceRelative} must have at least one Gate 2 agent value in the gate profile table`
    );

    for (const agent of uniqueAgents) {
      assert.ok(
        VALID_GATE2_AGENTS.includes(agent),
        `${sourceRelative} contains unknown Gate 2 agent "${agent}" — must be one of: ${VALID_GATE2_AGENTS.join(', ')}`
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Contract: work-type detection patterns (B2)
// ---------------------------------------------------------------------------

/**
 * Parametric tests verifying that work-type detection pattern descriptions
 * are present in the quality-gate-protocol source. These are presence checks
 * on the pattern table, confirming that the orchestrator's classification
 * logic covers key example paths.
 */
const WORK_TYPE_PATTERN_CASES = [
  {
    examplePath: 'src/auth.ts',
    workType: 'application_code',
    // src/ prefix is described in the pattern table
    patternHint: 'src/',
  },
  {
    examplePath: 'terraform/main.tf',
    workType: 'infrastructure_config',
    patternHint: 'terraform/',
  },
  {
    examplePath: 'migrations/0001_add_users.sql',
    workType: 'database_migration',
    patternHint: 'migrations/',
  },
  {
    examplePath: 'src/agents/bug-fixer.ejs',
    workType: 'agent_prompt',
    patternHint: 'src/agents/',
  },
  {
    examplePath: 'docs/README.md',
    workType: 'documentation',
    patternHint: 'docs/',
  },
  {
    examplePath: '.github/workflows/test.yml',
    workType: 'ci_cd_pipeline',
    patternHint: '.github/workflows/',
  },
];

describe('Contract: work-type detection pattern descriptions are present', () => {
  const sourcePath = path.join(ROOT, 'src', 'partials', 'quality-gate-protocol.ejs');
  const sourceRelative = 'src/partials/quality-gate-protocol.ejs';

  for (const { examplePath, workType, patternHint } of WORK_TYPE_PATTERN_CASES) {
    it(`pattern table describes "${patternHint}" → "${workType}" (example: ${examplePath})`, () => {
      assert.ok(fs.existsSync(sourcePath), `${sourceRelative} not found`);
      const content = fs.readFileSync(sourcePath, 'utf8');

      // Both the pattern hint and work type must appear in the file
      assert.ok(
        content.includes(patternHint),
        `${sourceRelative} pattern table is missing pattern hint "${patternHint}" (needed for ${examplePath} → ${workType})`
      );
      assert.ok(
        content.includes(workType),
        `${sourceRelative} pattern table is missing work type "${workType}"`
      );
    });
  }
});

// ---------------------------------------------------------------------------
// Contract: code-review SKILL.md JSON output contract fields (B3)
// ---------------------------------------------------------------------------

describe('Contract: code-review SKILL.md JSON output contract field presence', () => {
  const filePath = skillFilePath('code-review');
  const relative = 'skills/code-review/SKILL.md';

  /**
   * Extracts the first fenced JSON code block from markdown content.
   * Returns null if no JSON code block is found.
   * @param {string} content - Full markdown content
   * @returns {string|null} The text inside the first ```json ... ``` block
   */
  function extractJsonCodeBlock(content) {
    const match = content.match(/```json\n([\s\S]*?)```/);
    return match ? match[1] : null;
  }

  const requiredFields = [
    'blocking_issues',
    'scope_violations',
    'files_reviewed',
    'plan_coverage',
    'summary',
  ];

  for (const field of requiredFields) {
    it(`${relative} JSON contract contains required field "${field}"`, () => {
      assert.ok(fs.existsSync(filePath), `${relative} not found`);
      const content = fs.readFileSync(filePath, 'utf8');
      const jsonBlock = extractJsonCodeBlock(content);
      assert.ok(
        jsonBlock !== null,
        `${relative} must contain a JSON code block with the output contract`
      );
      assert.ok(
        jsonBlock.includes(`"${field}"`),
        `${relative} JSON contract is missing required field "${field}"`
      );
    });
  }

  it(`${relative} JSON contract does NOT contain "all_checks_passed" (orchestrator computes it)`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const jsonBlock = extractJsonCodeBlock(content);
    assert.ok(
      jsonBlock !== null,
      `${relative} must contain a JSON code block with the output contract`
    );
    assert.ok(
      !jsonBlock.includes('"all_checks_passed"'),
      `${relative} JSON contract must NOT contain "all_checks_passed" — the orchestrator computes this value and reviewers should not output it`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: SME agent files do not contain gate-specific schema vocabulary (C)
// ---------------------------------------------------------------------------

/**
 * SME agent source files that perform Gate 2 reviews ONLY via the code-review
 * skill — they are not gate-capable review agents in their own right.
 * They must NOT define the code-review skill's JSON output schema, since that
 * contract lives exclusively in SKILL.md.
 *
 * This test prevents skill boundary erosion: if an SME agent starts embedding
 * SKILL.md schema definitions directly, the skill contract becomes ambiguous.
 *
 * Note: ai-prompt-engineer, technical-writer, and deployment-engineer are
 * excluded here because they ARE gate-capable review agents with their own
 * native output contracts that legitimately include blocking_issues.
 */
const SME_AGENT_SOURCES = [
  'src/agents/feature-developer.ejs',
  'src/agents/cloud-architect.ejs',
  'src/agents/database-architect.ejs',
  'src/agents/api-designer.ejs',
];

/**
 * Gate-specific schema terms that belong exclusively in SKILL.md.
 * These are checked as JSON field definition patterns (with colon) to
 * distinguish schema definitions from legitimate prose references.
 *
 * For example, an agent may say "the skill returns blocking_issues" in prose,
 * but should never contain `"blocking_issues":` (a JSON field definition).
 */
const GATE_SCHEMA_TERMS = [
  '"gate_status":',
  '"blocking_issues":',
  '"files_reviewed":',
  '"plan_coverage":',
];

describe('Contract: SME agent sources do not contain gate-specific schema definitions', () => {
  for (const agentRelative of SME_AGENT_SOURCES) {
    const agentPath = path.join(ROOT, agentRelative);

    it(`${agentRelative} exists`, () => {
      assert.ok(
        fs.existsSync(agentPath),
        `${agentRelative} not found at ${agentPath}`
      );
    });

    for (const schemaTerm of GATE_SCHEMA_TERMS) {
      it(`${agentRelative} does not contain gate schema term "${schemaTerm}"`, () => {
        assert.ok(fs.existsSync(agentPath), `${agentRelative} not found`);
        const content = fs.readFileSync(agentPath, 'utf8');
        assert.ok(
          !content.includes(schemaTerm),
          `${agentRelative} contains gate-specific schema definition "${schemaTerm}" — this belongs only in skills/code-review/SKILL.md (skill boundary violation)`
        );
      });
    }
  }
});

// ---------------------------------------------------------------------------
// Contract: no-commits-policy partial — all strategies use branch-manager
// ---------------------------------------------------------------------------

describe('Contract: no-commits-policy — all strategies direct branch-manager to commit', () => {
  const sourcePath = path.join(ROOT, 'src', 'partials', 'no-commits-policy.ejs');
  const sourceRelative = 'src/partials/no-commits-policy.ejs';

  it(`${sourceRelative} Strategy 1 & 2 directs orchestrator to deploy branch-manager (not manual user commit)`, () => {
    assert.ok(fs.existsSync(sourcePath), `${sourceRelative} not found`);
    const content = fs.readFileSync(sourcePath, 'utf8');

    // Must NOT say users commit manually for Strategy 1 & 2
    assert.ok(
      !content.includes('user commits and merges manually'),
      `${sourceRelative} must not say "user commits and merges manually" for Strategy 1 & 2 — orchestrator should direct branch-manager to commit`
    );
  });

  it(`${sourceRelative} very_small_direct & medium_single_branch mentions branch-manager for committing`, () => {
    assert.ok(fs.existsSync(sourcePath), `${sourceRelative} not found`);
    const content = fs.readFileSync(sourcePath, 'utf8');

    // very_small_direct & medium_single_branch line must reference branch-manager
    const strategyLine = content.split('\n').find(
      (line) => line.includes('very_small_direct') && line.includes('medium_single_branch')
    );
    assert.ok(
      strategyLine !== undefined,
      `${sourceRelative} must have a line referencing "very_small_direct" and "medium_single_branch"`
    );
    assert.ok(
      strategyLine.includes('branch-manager'),
      `${sourceRelative} very_small_direct & medium_single_branch line must reference branch-manager for committing (found: "${strategyLine.trim()}")`
    );
  });

  it(`${sourceRelative} large_multi_worktree also mentions branch-manager for committing`, () => {
    assert.ok(fs.existsSync(sourcePath), `${sourceRelative} not found`);
    const content = fs.readFileSync(sourcePath, 'utf8');

    const strategyLine = content.split('\n').find((line) => line.includes('large_multi_worktree'));
    assert.ok(
      strategyLine !== undefined,
      `${sourceRelative} must have a line referencing "large_multi_worktree"`
    );
    assert.ok(
      strategyLine.includes('branch-manager'),
      `${sourceRelative} large_multi_worktree line must reference branch-manager for committing (found: "${strategyLine.trim()}")`
    );
  });

  it(`${sourceRelative} contains "unless the user prescribes otherwise" escape hatch`, () => {
    assert.ok(fs.existsSync(sourcePath), `${sourceRelative} not found`);
    const content = fs.readFileSync(sourcePath, 'utf8');
    assert.ok(
      content.includes('unless the user prescribes otherwise') ||
        content.includes('user prescribes otherwise'),
      `${sourceRelative} must contain "unless the user prescribes otherwise" escape hatch`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: branch-manager medium_single_branch uses shared worktree + branch-manager commits
// ---------------------------------------------------------------------------

describe('Contract: branch-manager medium_single_branch uses shared worktree with branch-manager commits', () => {
  const filePath = agentFilePath('branch-manager');
  const relative = 'agents/branch-manager.md';

  it(`${relative} Strategy-Based Authority table has medium_single_branch row with worktree`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    // medium_single_branch row must mention worktree creation
    const tableRows = content.split('\n').filter((line) =>
      line.startsWith('|') && line.includes('medium_single_branch') && line.includes('worktree')
    );
    assert.ok(
      tableRows.length > 0,
      `${relative} Strategy-Based Authority table must have a medium_single_branch row referencing worktree`
    );
  });

  it(`${relative} Strategy-Based Authority table medium_single_branch row includes commits`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    // medium_single_branch table row must indicate branch-manager does commits (not "None")
    const tableLines = content.split('\n');
    const strategy2Row = tableLines.find(
      (line) => line.startsWith('|') && line.includes('medium_single_branch')
    );
    assert.ok(
      strategy2Row !== undefined,
      `${relative} must have a medium_single_branch row in the strategy table`
    );
    // The row should NOT say "None" for commits column when worktree is present
    // It should reference commits or branch-manager committing
    assert.ok(
      !(/\|\s*None\s*\|.*\|\s*None\s*\|/.test(strategy2Row)),
      `${relative} medium_single_branch row must not have None for both Commits and Merges when using worktree`
    );
  });

  it(`${relative} contains a medium_single_branch Workflow section`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      content.includes('medium_single_branch Workflow'),
      `${relative} must contain a "medium_single_branch Workflow" section`
    );
  });

  it(`${relative} medium_single_branch Workflow describes creating a shared worktree`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const s2Start = content.indexOf('medium_single_branch Workflow');
    assert.ok(s2Start !== -1, `${relative} must contain medium_single_branch Workflow`);
    // The section should end before the next ## heading or large_multi_worktree Workflow
    const s3Start = content.indexOf('large_multi_worktree Workflow');
    const section = s3Start !== -1
      ? content.slice(s2Start, s3Start)
      : content.slice(s2Start, s2Start + 2000);
    assert.ok(
      /worktree/i.test(section),
      `${relative} medium_single_branch Workflow must describe creating a shared worktree`
    );
  });

  it(`${relative} medium_single_branch Workflow states coding agents do not commit`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const s2Start = content.indexOf('medium_single_branch Workflow');
    assert.ok(s2Start !== -1, `${relative} must contain medium_single_branch Workflow`);
    const s3Start = content.indexOf('large_multi_worktree Workflow');
    const section = s3Start !== -1
      ? content.slice(s2Start, s3Start)
      : content.slice(s2Start, s2Start + 2000);
    assert.ok(
      /no commit|without commit|no.*commit|uncommitted|never commit/i.test(section),
      `${relative} medium_single_branch Workflow must state that coding agents work without committing`
    );
  });

  it(`${relative} medium_single_branch Workflow states branch-manager commits after gates pass`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const s2Start = content.indexOf('medium_single_branch Workflow');
    assert.ok(s2Start !== -1, `${relative} must contain medium_single_branch Workflow`);
    const s3Start = content.indexOf('large_multi_worktree Workflow');
    const section = s3Start !== -1
      ? content.slice(s2Start, s3Start)
      : content.slice(s2Start, s2Start + 2000);
    assert.ok(
      /branch-manager.*commit|commit.*branch-manager/i.test(section),
      `${relative} medium_single_branch Workflow must state that branch-manager commits after quality gates pass`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: workflow-planner-planning skill Strategy 2 mentions shared worktree
// (Content moved from agent to planning skill as part of refactor)
// ---------------------------------------------------------------------------

describe('Contract: workflow-planner-planning skill medium_single_branch mentions shared worktree', () => {
  const filePath = skillFilePath('workflow-planner-planning');
  const relative = 'skills/workflow-planner-planning/SKILL.md';

  it(`${relative} Strategy 2 description mentions shared worktree`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const s2Start = content.indexOf('Strategy 2: Medium Single Branch');
    assert.ok(
      s2Start !== -1,
      `${relative} must contain "Strategy 2: Medium Single Branch" section`
    );
    const s3Start = content.indexOf('Strategy 3: Large Multi-Worktree');
    const section = s3Start !== -1
      ? content.slice(s2Start, s3Start)
      : content.slice(s2Start, s2Start + 2000);
    assert.ok(
      /shared worktree|single.*worktree|worktree.*shared/i.test(section),
      `${relative} Strategy 2 description must mention a shared worktree`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: file-conflict-detection partial heading acknowledges worktree model
// ---------------------------------------------------------------------------

describe('Contract: file-conflict-detection partial acknowledges worktree-based isolation', () => {
  const sourcePath = path.join(ROOT, 'src', 'partials', 'file-conflict-detection.ejs');
  const sourceRelative = 'src/partials/file-conflict-detection.ejs';

  it(`${sourceRelative} heading no longer implies branch-only model`, () => {
    assert.ok(fs.existsSync(sourcePath), `${sourceRelative} not found`);
    const content = fs.readFileSync(sourcePath, 'utf8');
    // The old heading was "Strategy 2: Single Branch Parallel Work"
    // which implied no worktree isolation. Must be updated.
    assert.ok(
      !content.includes('Single Branch Parallel Work'),
      `${sourceRelative} heading must not say "Single Branch Parallel Work" — update to acknowledge worktree-based model`
    );
  });

  it(`${sourceRelative} references worktree-based isolation for medium_single_branch`, () => {
    assert.ok(fs.existsSync(sourcePath), `${sourceRelative} not found`);
    const content = fs.readFileSync(sourcePath, 'utf8');
    assert.ok(
      /worktree/i.test(content),
      `${sourceRelative} must reference worktree-based isolation for medium_single_branch`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: todowrite-plan-protocol cleanup note covers both strategies
// ---------------------------------------------------------------------------

describe('Contract: todowrite-plan-protocol cleanup note covers both strategies', () => {
  const sourcePath = path.join(ROOT, 'src', 'partials', 'todowrite-plan-protocol.ejs');
  const sourceRelative = 'src/partials/todowrite-plan-protocol.ejs';

  it(`${sourceRelative} cleanup note covers medium_single_branch`, () => {
    assert.ok(fs.existsSync(sourcePath), `${sourceRelative} not found`);
    const content = fs.readFileSync(sourcePath, 'utf8');
    assert.ok(
      content.includes('medium_single_branch'),
      `${sourceRelative} cleanup note must mention "medium_single_branch" strategy`
    );
  });

  it(`${sourceRelative} medium_single_branch cleanup note says cleanup at completion`, () => {
    assert.ok(fs.existsSync(sourcePath), `${sourceRelative} not found`);
    const content = fs.readFileSync(sourcePath, 'utf8');
    // Find the line(s) referencing medium_single_branch
    const lines = content.split('\n');
    const mediumLine = lines.find((l) => l.includes('medium_single_branch'));
    assert.ok(
      mediumLine !== undefined,
      `${sourceRelative} must have a line mentioning medium_single_branch`
    );
    assert.ok(
      /completion|end|finish|after.*merge|once|done/i.test(mediumLine),
      `${sourceRelative} medium_single_branch cleanup note must indicate cleanup at completion (found: "${mediumLine.trim()}")`
    );
  });

  it(`${sourceRelative} large_multi_worktree cleanup note specifies per-unit cleanup`, () => {
    assert.ok(fs.existsSync(sourcePath), `${sourceRelative} not found`);
    const content = fs.readFileSync(sourcePath, 'utf8');
    // Find the line(s) referencing large_multi_worktree
    const lines = content.split('\n');
    const largeLine = lines.find((l) => l.includes('large_multi_worktree'));
    assert.ok(
      largeLine !== undefined,
      `${sourceRelative} must have a line mentioning large_multi_worktree`
    );
    assert.ok(
      /per.unit|each unit|per worktree|each worktree/i.test(largeLine),
      `${sourceRelative} large_multi_worktree cleanup note must specify per-unit cleanup (found: "${largeLine.trim()}")`
    );
  });
});

// ---------------------------------------------------------------------------
// Takeoff-specific extraction helpers (module scope — shared across describe blocks)
// ---------------------------------------------------------------------------

/**
 * Extracts the Strategy Notes section from takeoff.md content.
 * @param {string} content - Full markdown content
 * @returns {string} The Strategy Notes section text
 */
function extractStrategyNotes(content) {
  const startMarker = '### Strategy Notes';
  const startIndex = content.indexOf(startMarker);
  if (startIndex === -1) return '';

  const rest = content.slice(startIndex + startMarker.length);
  const nextSectionMatch = rest.match(/\n###? /);
  if (nextSectionMatch) {
    return content.slice(startIndex, startIndex + startMarker.length + nextSectionMatch.index);
  }
  return content.slice(startIndex);
}

/**
 * Extracts the full Per-Unit Cycle block from takeoff.md content.
 * The work-unit-cleanup partial renders a "## Background Task Cleanup"
 * heading inside the numbered list, which means a simple ##[# ] boundary
 * stops too early. This function instead uses the "### Continuation Rule"
 * heading as the terminator so that items 7-10 (which appear after the
 * partial injection) are included in the extracted text.
 * @param {string} content - Full markdown content
 * @returns {string} The Per-Unit Cycle section text including post-partial items
 */
function extractFullPerUnitCycle(content) {
  const startMarker = '### Per-Unit Cycle';
  const startIndex = content.indexOf(startMarker);
  if (startIndex === -1) return '';

  // Use "### Continuation Rule" as the end boundary, which comes after
  // the work-unit-cleanup partial's heading and the remaining numbered steps.
  const endMarker = '### Continuation Rule';
  const endIndex = content.indexOf(endMarker);
  if (endIndex !== -1 && endIndex > startIndex) {
    return content.slice(startIndex, endIndex);
  }

  // Fallback: next ## heading
  const rest = content.slice(startIndex + startMarker.length);
  const nextSectionMatch = rest.match(/\n## [^#]/);
  if (nextSectionMatch) {
    return content.slice(startIndex, startIndex + startMarker.length + nextSectionMatch.index);
  }
  return content.slice(startIndex);
}

/**
 * Extracts the Worktree Cleanup section from takeoff.md content.
 * This section contains the per-strategy worktree cleanup instructions.
 * @param {string} content - Full markdown content
 * @returns {string} The Worktree Cleanup section text
 */
function extractWorktreeCleanupSection(content) {
  const startMarker = '## Worktree Cleanup';
  const startIndex = content.indexOf(startMarker);
  if (startIndex === -1) return '';

  const rest = content.slice(startIndex + startMarker.length);
  const nextSectionMatch = rest.match(/\n## [^#]/);
  if (nextSectionMatch) {
    return content.slice(startIndex, startIndex + startMarker.length + nextSectionMatch.index);
  }
  return content.slice(startIndex);
}

// ---------------------------------------------------------------------------
// Contract: takeoff strategy descriptions — feature branch + worktree for all strategies
// ---------------------------------------------------------------------------

describe('Contract: takeoff strategy descriptions require feature branch and worktree', () => {
  const filePath = path.join(COMMANDS_DIR, 'takeoff.md');
  const relative = 'commands/takeoff.md';

  it(`${relative} very_small_direct description mentions creating a feature branch`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const strategyNotes = extractStrategyNotes(content);
    assert.ok(
      strategyNotes.length > 0,
      `${relative} must contain a Strategy Notes section`
    );
    // Extract just the very_small_direct bullet
    const lines = strategyNotes.split('\n');
    const vsdLine = lines.find((l) => l.includes('very_small_direct'));
    assert.ok(
      vsdLine !== undefined,
      `Strategy Notes must have a very_small_direct bullet`
    );
    assert.ok(
      /feature branch/i.test(vsdLine),
      `very_small_direct description must mention creating a feature branch (found: "${vsdLine.trim()}")`
    );
  });

  it(`${relative} very_small_direct description mentions worktree setup`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const strategyNotes = extractStrategyNotes(content);
    const lines = strategyNotes.split('\n');
    const vsdLine = lines.find((l) => l.includes('very_small_direct'));
    assert.ok(vsdLine !== undefined, `Strategy Notes must have a very_small_direct bullet`);
    assert.ok(
      /worktree/i.test(vsdLine),
      `very_small_direct description must mention worktree setup (found: "${vsdLine.trim()}")`
    );
  });

  it(`${relative} medium_single_branch description mentions creating a shared worktree`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const strategyNotes = extractStrategyNotes(content);
    const lines = strategyNotes.split('\n');
    const msbLine = lines.find((l) => l.includes('medium_single_branch'));
    assert.ok(
      msbLine !== undefined,
      `Strategy Notes must have a medium_single_branch bullet`
    );
    assert.ok(
      /shared worktree|single.*worktree/i.test(msbLine),
      `medium_single_branch description must mention creating a shared worktree (found: "${msbLine.trim()}")`
    );
  });

  it(`${relative} medium_single_branch description mentions feature branch`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const strategyNotes = extractStrategyNotes(content);
    const lines = strategyNotes.split('\n');
    const msbLine = lines.find((l) => l.includes('medium_single_branch'));
    assert.ok(msbLine !== undefined, `Strategy Notes must have a medium_single_branch bullet`);
    assert.ok(
      /feature branch/i.test(msbLine),
      `medium_single_branch description must mention feature branch (found: "${msbLine.trim()}")`
    );
  });

  it(`${relative} very_small_direct description mentions worktree-manager skill or branch-manager`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const strategyNotes = extractStrategyNotes(content);
    const lines = strategyNotes.split('\n');
    const vsdLine = lines.find((l) => l.includes('very_small_direct'));
    assert.ok(vsdLine !== undefined, `Strategy Notes must have a very_small_direct bullet`);
    assert.ok(
      /worktree-manager|branch-manager/i.test(vsdLine),
      `very_small_direct description must reference worktree-manager or branch-manager for worktree setup (found: "${vsdLine.trim()}")`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: takeoff work-unit-cleanup partial appears exactly once
// ---------------------------------------------------------------------------

describe('Contract: takeoff work-unit-cleanup partial appears exactly once', () => {
  const sourcePath = path.join(ROOT, 'src', 'commands', 'takeoff.ejs');
  const sourceRelative = 'src/commands/takeoff.ejs';

  it(`${sourceRelative} includes work-unit-cleanup partial exactly once`, () => {
    assert.ok(fs.existsSync(sourcePath), `${sourceRelative} not found`);
    const content = fs.readFileSync(sourcePath, 'utf8');
    const matches = content.match(/include\(['"]partials\/work-unit-cleanup['"]/g) || [];
    assert.strictEqual(
      matches.length,
      1,
      `${sourceRelative} must include work-unit-cleanup partial exactly once (found ${matches.length} occurrences). ` +
        `Remove the duplicate from the Completion section.`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: takeoff Per-Unit Cycle issue lifecycle — UPDATE_ISSUE and CLOSE_ISSUE
// ---------------------------------------------------------------------------

describe('Contract: takeoff Per-Unit Cycle issue lifecycle', () => {
  const filePath = path.join(COMMANDS_DIR, 'takeoff.md');
  const relative = 'commands/takeoff.md';

  it(`${relative} Per-Unit Cycle step 1 includes UPDATE_ISSUE to mark in_progress`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const perUnitSection = extractFullPerUnitCycle(content);
    assert.ok(perUnitSection.length > 0, `${relative} must contain a Per-Unit Cycle section`);

    // Step 1 is between "1." and "2." in the numbered list
    const step1Match = perUnitSection.match(/1\.([\s\S]*?)(?=\n\d+\.)/);
    const step1Text = step1Match ? step1Match[1] : '';
    assert.ok(
      step1Text.includes('UPDATE_ISSUE') || step1Text.includes('in_progress'),
      `Per-Unit Cycle step 1 must include UPDATE_ISSUE to mark the issue as in_progress for tracked issues (step 1 text: "${step1Text.trim().substring(0, 200)}")`
    );
  });

  it(`${relative} Per-Unit Cycle step 1 specifies non-markdown_only platforms for UPDATE_ISSUE`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const perUnitSection = extractFullPerUnitCycle(content);

    const step1Match = perUnitSection.match(/1\.([\s\S]*?)(?=\n\d+\.)/);
    const step1Text = step1Match ? step1Match[1] : '';
    assert.ok(
      /non.markdown|markdown_only|tracked issue/i.test(step1Text),
      `Per-Unit Cycle step 1 UPDATE_ISSUE must qualify for non-markdown_only platforms`
    );
  });

  it(`${relative} Per-Unit Cycle CLOSE_ISSUE applies to all tracked issues (not just pre-planned)`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const perUnitSection = extractFullPerUnitCycle(content);

    // The close issue step must NOT be restricted to pre-planned only
    // It should say "any tracked issue" or similar inclusive language
    const closeLine = perUnitSection.split('\n').find(
      (l) => l.includes('CLOSE_ISSUE') || (l.includes('close') && l.includes('issue'))
    );
    assert.ok(
      closeLine !== undefined,
      `Per-Unit Cycle must have a step referencing CLOSE_ISSUE`
    );
    assert.ok(
      !/\bpre-planned child issue only\b|only pre-planned|if this is a pre-planned/i.test(closeLine),
      `Per-Unit Cycle CLOSE_ISSUE must not be restricted to pre-planned child issues only (found: "${closeLine.trim()}")`
    );
    assert.ok(
      /any tracked|tracked issue|non.markdown/i.test(perUnitSection),
      `Per-Unit Cycle CLOSE_ISSUE must apply to any tracked issue on non-markdown_only platforms`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: takeoff worktree cleanup — per-unit for large, at-completion for others
// ---------------------------------------------------------------------------

describe('Contract: takeoff worktree cleanup strategy', () => {
  const filePath = path.join(COMMANDS_DIR, 'takeoff.md');
  const relative = 'commands/takeoff.md';

  it(`${relative} Per-Unit Cycle mentions worktree removal for large_multi_worktree`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const perUnitSection = extractFullPerUnitCycle(content);
    assert.ok(
      /large_multi_worktree.*worktree|worktree.*large_multi_worktree/i.test(perUnitSection) ||
        (perUnitSection.includes('large_multi_worktree') && /remove.*worktree|worktree.*remov/i.test(perUnitSection)),
      `Per-Unit Cycle must mention worktree removal for large_multi_worktree strategy`
    );
  });

  it(`${relative} Per-Unit Cycle large_multi_worktree worktree removal goes through worktree-manager skill`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const perUnitSection = extractFullPerUnitCycle(content);
    assert.ok(
      perUnitSection.includes('worktree-manager'),
      `Per-Unit Cycle worktree removal must go through the worktree-manager skill (never direct git worktree remove)`
    );
  });

  it(`${relative} Per-Unit Cycle large_multi_worktree worktree removal includes reference check`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const perUnitSection = extractFullPerUnitCycle(content);
    assert.ok(
      /reference|still.*reference|no other.*reference|other.*unit/i.test(perUnitSection),
      `Per-Unit Cycle large_multi_worktree worktree removal must include a reference check before removing`
    );
  });

  it(`${relative} Worktree Cleanup section mentions medium_single_branch and very_small_direct`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const cleanupSection = extractWorktreeCleanupSection(content);
    assert.ok(
      cleanupSection.length > 0,
      `${relative} must contain a Worktree Cleanup section`
    );
    assert.ok(
      cleanupSection.includes('medium_single_branch'),
      `Worktree Cleanup section must mention medium_single_branch strategy`
    );
    assert.ok(
      cleanupSection.includes('very_small_direct'),
      `Worktree Cleanup section must mention very_small_direct strategy`
    );
  });

  it(`${relative} Worktree Cleanup section worktree removal goes through worktree-manager skill`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const cleanupSection = extractWorktreeCleanupSection(content);
    assert.ok(
      cleanupSection.includes('worktree-manager'),
      `Worktree Cleanup section worktree removal must reference the worktree-manager skill`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: user communication contract included in all primary workflow commands
// ---------------------------------------------------------------------------

/**
 * Sentinel string embedded by the user-comms-contract partial.
 * Each primary workflow command must include the partial so that communication
 * rules are present in every user-facing orchestration command.
 */
const USER_COMMS_SENTINEL = '<!-- user-comms-contract -->';

/**
 * Primary workflow commands that must include the user-comms-contract partial.
 * Matches ALL_COMMANDS — every user-invocable orchestration command.
 */
const PRIMARY_WORKFLOW_COMMANDS = [
  'flight-plan',
  'takeoff',
  'squadron',
  'ship',
  'status-worktrees',
  'start',
  'claude-sync',
  'configure-quality-gates',
];

describe('Contract: user communication contract included in all primary workflow commands', () => {
  for (const commandName of PRIMARY_WORKFLOW_COMMANDS) {
    const filePath = commandFilePath(commandName);
    const relative = `commands/${commandName}.md`;

    it(`${relative} includes user-comms-contract partial`, () => {
      assert.ok(fs.existsSync(filePath), `${relative} not found at ${filePath}`);
      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(
        content.includes(USER_COMMS_SENTINEL),
        `${relative} is missing the user-comms-contract partial — add <%- include('partials/user-comms-contract') %> to src/commands/${commandName}.ejs`
      );
    });
  }
});

// ---------------------------------------------------------------------------
// Contract: flight-plan must not hardcode platform skill names outside Phase 1
// ---------------------------------------------------------------------------

describe('Contract: flight-plan does not hardcode platform skill names outside Phase 1', () => {
  const filePath = commandFilePath('flight-plan');
  const relative = 'commands/flight-plan.md';

  it(`${relative} does not name reaper:issue-tracker-planfile outside the Phase 1 skill-routing table`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found at ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf8');

    // The Phase 1 routing table is the only legitimate place to name this skill.
    // Count total occurrences — exactly one is expected (the table row in Phase 1).
    // Any additional occurrence means the skill has leaked into later phases (scope boundary violation).
    const occurrences = (content.match(/reaper:issue-tracker-planfile/g) || []).length;
    assert.ok(
      occurrences <= 1,
      `${relative} contains ${occurrences} occurrences of "reaper:issue-tracker-planfile" but at most 1 is allowed (Phase 1 routing table only). ` +
      `Extra occurrences outside Phase 1 are platform-skill name hardcoding violations — ` +
      `use abstract operations (CREATE_ISSUE, CLOSE_ISSUE) and the loaded platform skill instead.`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: flight-plan contains visual vocabulary card templates
// ---------------------------------------------------------------------------

describe('Contract: flight-plan contains visual vocabulary card templates', () => {
  const filePath = commandFilePath('flight-plan');
  const relative = 'commands/flight-plan.md';

  it(`${relative} exists`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found at ${filePath}`);
  });

  it(`${relative} contains briefing card template`, () => {
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      /[Bb]riefing [Cc]ard/i.test(content),
      `${relative} is missing the Briefing Card template from visual-vocabulary`
    );
  });

  it(`${relative} contains filed card template`, () => {
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      /[Ff]iled [Cc]ard/i.test(content),
      `${relative} is missing the Filed Card template from visual-vocabulary`
    );
  });

  it(`${relative} renders filed card in Phase 7 completion output`, () => {
    const content = fs.readFileSync(filePath, 'utf8');
    // Phase 7 contains the completion instructions; filed card should appear there
    const phase7Start = content.indexOf('Phase 7');
    assert.ok(phase7Start >= 0, `${relative} is missing Phase 7`);
    const phase7Content = content.slice(phase7Start);
    assert.ok(
      /[Ff]iled [Cc]ard/i.test(phase7Content) || phase7Content.includes('FILED') || phase7Content.includes('LANDED'),
      `${relative} Phase 7 should reference the Filed Card or LANDED gauge`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: flight-plan must not embed a hardcoded completion template
// ---------------------------------------------------------------------------

describe('Contract: flight-plan does not embed hardcoded completion templates', () => {
  const filePath = commandFilePath('flight-plan');
  const relative = 'commands/flight-plan.md';

  it(`${relative} does not contain "Plan Complete (Markdown Mode)" inline template`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found at ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      !content.includes('Plan Complete (Markdown Mode)'),
      `${relative} contains "Plan Complete (Markdown Mode)" — this is a hardcoded platform-specific completion template. ` +
      `Output templates belong in the platform skill (reaper:issue-tracker-planfile), not in the command file.`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: workflow-planner-planning skill dirty-root safety check
// (Content moved from agent to planning skill as part of refactor)
// ---------------------------------------------------------------------------

describe('Contract: workflow-planner-planning skill dirty-root safety check', () => {
  const filePath = skillFilePath('workflow-planner-planning');
  const relative = 'skills/workflow-planner-planning/SKILL.md';

  it(`${relative} contains "Dirty-Root Safety Check" section heading`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      content.includes('Dirty-Root Safety Check'),
      `${relative} must contain a "Dirty-Root Safety Check" section heading`
    );
  });

  it(`${relative} dirty-root check uses git status --porcelain`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      content.includes('git status --porcelain'),
      `${relative} dirty-root check must use "git status --porcelain" as the detection command`
    );
  });

  it(`${relative} dirty-root check escalates very_small_direct to medium_single_branch`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    // The section must co-locate uncommitted/dirty language with medium_single_branch escalation
    assert.ok(
      /uncommitted[\s\S]{0,300}medium_single_branch|medium_single_branch[\s\S]{0,300}uncommitted/
        .test(content),
      `${relative} must describe escalating to medium_single_branch when root has uncommitted changes`
    );
  });

  it(`${relative} dirty-root check fires unconditionally after strategy selection`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    // "Post-Selection" in heading and "unconditionally" in body confirm post-selection behaviour
    assert.ok(
      content.includes('Post-Selection') && content.includes('unconditionally'),
      `${relative} dirty-root section must be labelled "Post-Selection" and instruct applying the check unconditionally`
    );
  });

  it(`${relative} dirty-root check applies to single-document override with no exemptions`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      content.includes('with no exemptions'),
      `${relative} must state the dirty-root check applies "with no exemptions", including when the single-document override selected the strategy`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: takeoff dirty-root escalation
// ---------------------------------------------------------------------------

describe('Contract: takeoff dirty-root escalation', () => {
  const filePath = path.join(COMMANDS_DIR, 'takeoff.md');
  const relative = 'commands/takeoff.md';

  /**
   * Extracts the Dirty-Root Escalation section from takeoff.md.
   * The section starts at "## Dirty-Root Escalation" and ends at the next
   * top-level heading ("## ").
   * @param {string} content - Full markdown content
   * @returns {string} The Dirty-Root Escalation section text
   */
  function extractDirtyRootSection(content) {
    const startMarker = '## Dirty-Root Escalation';
    const startIndex = content.indexOf(startMarker);
    if (startIndex === -1) return '';

    const rest = content.slice(startIndex + startMarker.length);
    const nextSectionMatch = rest.match(/\n## [^#]/);
    if (nextSectionMatch) {
      return content.slice(startIndex, startIndex + startMarker.length + nextSectionMatch.index);
    }
    return content.slice(startIndex);
  }

  it(`${relative} contains "Dirty-Root Escalation" section`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const section = extractDirtyRootSection(content);
    assert.ok(
      section.length > 0,
      `${relative} must contain a "## Dirty-Root Escalation" section`
    );
  });

  it(`${relative} dirty-root escalation uses git status --porcelain`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const section = extractDirtyRootSection(content);
    assert.ok(
      section.includes('git status --porcelain'),
      `${relative} Dirty-Root Escalation must use "git status --porcelain" as the detection command`
    );
  });

  it(`${relative} dirty-root escalation overrides very_small_direct to medium_single_branch`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const section = extractDirtyRootSection(content);
    assert.ok(
      section.includes('very_small_direct') && section.includes('medium_single_branch'),
      `${relative} Dirty-Root Escalation must reference both very_small_direct (trigger condition) and medium_single_branch (escalation target)`
    );
  });

  it(`${relative} dirty-root escalation emits the expected user-facing message`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const section = extractDirtyRootSection(content);
    // The escalation message must include "uncommitted changes" and "medium_single_branch"
    assert.ok(
      /uncommitted changes[\s\S]{0,200}medium_single_branch|medium_single_branch[\s\S]{0,200}uncommitted changes/
        .test(section),
      `${relative} Dirty-Root Escalation must include a user-facing message containing "uncommitted changes" co-located with "medium_single_branch"`
    );
  });

  it(`${relative} dirty-root escalation is a universal post-selection check`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const section = extractDirtyRootSection(content);
    // The section must indicate it fires after any source determines the strategy
    assert.ok(
      /universal|any source|regardless/i.test(section),
      `${relative} Dirty-Root Escalation must state it is a universal post-selection check (fires regardless of strategy source)`
    );
  });

  it(`${relative} dirty-root escalation appears before Preflight Announcement`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const dirtyRootIdx = content.indexOf('## Dirty-Root Escalation');
    const preflightIdx = content.indexOf('## Preflight Announcement');
    assert.ok(
      dirtyRootIdx !== -1,
      `${relative} must contain "## Dirty-Root Escalation"`
    );
    assert.ok(
      preflightIdx !== -1,
      `${relative} must contain "## Preflight Announcement"`
    );
    assert.ok(
      dirtyRootIdx < preflightIdx,
      `${relative} "## Dirty-Root Escalation" must appear before "## Preflight Announcement" ` +
        `(found at index ${dirtyRootIdx}, Preflight at ${preflightIdx})`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: takeoff quality gate config check (pre-flight advisory)
// ---------------------------------------------------------------------------

describe('Contract: takeoff quality gate config check', () => {
  const filePath = path.join(COMMANDS_DIR, 'takeoff.md');
  const relative = 'commands/takeoff.md';

  it(`${relative} has a Quality Gate Config Check section`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      hasSection(content, /Quality Gate Config Check/i),
      `${relative} must contain a "## Quality Gate Config Check" section (pre-flight advisory for missing gate commands)`
    );
  });

  it(`${relative} Quality Gate Config Check section appears before Preflight Announcement`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const configCheckIdx = content.indexOf('## Quality Gate Config Check');
    const preflightIdx = content.indexOf('## Preflight Announcement');
    assert.ok(
      configCheckIdx !== -1,
      `${relative} must contain "## Quality Gate Config Check"`
    );
    assert.ok(
      preflightIdx !== -1,
      `${relative} must contain "## Preflight Announcement"`
    );
    assert.ok(
      configCheckIdx < preflightIdx,
      `${relative} "## Quality Gate Config Check" must appear before "## Preflight Announcement" ` +
        `(found at index ${configCheckIdx}, Preflight at ${preflightIdx})`
    );
  });

  it(`${relative} Quality Gate Config Check section references configure-quality-gates`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const sectionStart = content.indexOf('## Quality Gate Config Check');
    assert.ok(sectionStart !== -1, `${relative} must contain "## Quality Gate Config Check"`);

    // Extract the section content up to the next ## heading
    const rest = content.slice(sectionStart);
    const nextHeadingMatch = rest.match(/\n## [^#]/);
    const section = nextHeadingMatch
      ? rest.slice(0, nextHeadingMatch.index)
      : rest;

    assert.ok(
      section.includes('configure-quality-gates'),
      `Quality Gate Config Check section must reference "/reaper:configure-quality-gates" command`
    );
  });

  it(`${relative} Quality Gate Config Check section is non-blocking`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const sectionStart = content.indexOf('## Quality Gate Config Check');
    assert.ok(sectionStart !== -1, `${relative} must contain "## Quality Gate Config Check"`);

    const rest = content.slice(sectionStart);
    const nextHeadingMatch = rest.match(/\n## [^#]/);
    const section = nextHeadingMatch
      ? rest.slice(0, nextHeadingMatch.index)
      : rest;

    assert.ok(
      /non-blocking|continue|advisory/i.test(section),
      `Quality Gate Config Check section must be non-blocking (takeoff continues regardless)`
    );
  });

  it(`${relative} Quality Gate Config Check section requires no tool calls`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const sectionStart = content.indexOf('## Quality Gate Config Check');
    assert.ok(sectionStart !== -1, `${relative} must contain "## Quality Gate Config Check"`);

    const rest = content.slice(sectionStart);
    const nextHeadingMatch = rest.match(/\n## [^#]/);
    const section = nextHeadingMatch
      ? rest.slice(0, nextHeadingMatch.index)
      : rest;

    // The check must not require Bash or Read tool calls — it is prompt-level only
    assert.ok(
      /loaded context|CLAUDE\.md|context/i.test(section),
      `Quality Gate Config Check must operate on loaded context (no tool calls) — check should inspect CLAUDE.md or loaded context`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: takeoff Per-Unit Cycle has a branch-manager commit step after gates
// ---------------------------------------------------------------------------

describe('Contract: takeoff Per-Unit Cycle has branch-manager commit step after gates pass', () => {
  const filePath = path.join(COMMANDS_DIR, 'takeoff.md');
  const relative = 'commands/takeoff.md';

  it(`${relative} Per-Unit Cycle deploys reaper:branch-manager to commit after gates pass`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const perUnitSection = extractFullPerUnitCycle(content);
    assert.ok(
      perUnitSection.length > 0,
      `${relative} must contain a Per-Unit Cycle section`
    );
    assert.ok(
      /branch-manager.*commit|commit.*branch-manager|deploy.*branch-manager.*commit|branch-manager.*to commit/i.test(perUnitSection),
      `Per-Unit Cycle must include a step deploying reaper:branch-manager to commit after gates pass`
    );
  });

  it(`${relative} Per-Unit Cycle commit step is commit-only (not merge to develop)`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const perUnitSection = extractFullPerUnitCycle(content);
    assert.ok(
      perUnitSection.length > 0,
      `${relative} must contain a Per-Unit Cycle section`
    );
    // The commit step must explicitly state it is commit-only, not merge
    assert.ok(
      /commit.only|commit-only|do not merge/i.test(perUnitSection),
      `Per-Unit Cycle branch-manager commit step must be commit-only — must not merge to develop`
    );
  });

  it(`${relative} Per-Unit Cycle commit step appears after quality gates run`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const perUnitSection = extractFullPerUnitCycle(content);
    assert.ok(
      perUnitSection.length > 0,
      `${relative} must contain a Per-Unit Cycle section`
    );
    // The commit step must appear after "quality gates" or "gates pass"
    const commitIdx = perUnitSection.search(/branch-manager.*commit|commit.*branch-manager/i);
    const gatesIdx = perUnitSection.search(/quality gate|Run quality|gate.*pass/i);
    assert.ok(
      commitIdx !== -1,
      `Per-Unit Cycle must contain a branch-manager commit step`
    );
    assert.ok(
      gatesIdx !== -1,
      `Per-Unit Cycle must contain a quality gates step`
    );
    assert.ok(
      gatesIdx < commitIdx,
      `Per-Unit Cycle quality gates step must appear before the branch-manager commit step ` +
        `(gates at index ${gatesIdx}, commit at index ${commitIdx})`
    );
  });

  it(`${relative} quick-reference summary includes branch-manager commit step`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    // The quick-reference block (blockquote summary) must also reference the commit step
    assert.ok(
      /branch-manager.*commit|Deploy branch-manager to commit/i.test(content),
      `${relative} must reference a "Deploy branch-manager to commit" step in the per-unit cycle summary`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: branch-manager does not contain stale dual-authorization content
// ---------------------------------------------------------------------------

describe('Contract: branch-manager does not contain stale Dual Authorization content', () => {
  const filePath = agentFilePath('branch-manager');
  const relative = 'agents/branch-manager.md';

  it(`${relative} does not contain "allow_main_merge"`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      !content.includes('allow_main_merge'),
      `${relative} must not contain "allow_main_merge" — this was removed when branch-manager was simplified to a pure executor`
    );
  });

  it(`${relative} does not contain "Dual Authorization"`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      !content.includes('Dual Authorization'),
      `${relative} must not contain "Dual Authorization" — this was removed when branch-manager was simplified to a pure executor`
    );
  });

  it(`${relative} does not contain "dual_authorization"`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      !content.includes('dual_authorization'),
      `${relative} must not contain "dual_authorization" — this was removed when branch-manager was simplified to a pure executor`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: branch-manager large_multi_worktree merge isolation invariant
// ---------------------------------------------------------------------------
//
// The large_multi_worktree merge step must NEVER use `git checkout` in the root
// context. All merges must happen inside a temporary integration worktree so
// that conflicts surface in ./trees/, not in the root workspace.
//
// Pattern enforced:
//   git branch integration-temp feature/[TASK_ID]-review
//   git worktree add ./trees/[TASK_ID]-integration integration-temp
//   git -C ./trees/[TASK_ID]-integration merge feature/[TASK_ID]-[COMPONENT] --no-ff
//   git branch -f feature/[TASK_ID]-review integration-temp
//   git worktree remove ./trees/[TASK_ID]-integration && git branch -d integration-temp
// ---------------------------------------------------------------------------

describe('Contract: branch-manager large_multi_worktree merge uses isolated integration worktree', () => {
  const filePath = agentFilePath('branch-manager');
  const relative = 'agents/branch-manager.md';

  // Helper: extract the large_multi_worktree Workflow section text
  function getLargeMultiSection(content) {
    const start = content.indexOf('large_multi_worktree Workflow');
    if (start === -1) return '';
    // Section ends at the next ## heading or end of file
    const afterStart = content.slice(start);
    const nextSection = afterStart.search(/\n## /);
    return nextSection !== -1 ? afterStart.slice(0, nextSection) : afterStart;
  }

  it(`${relative} large_multi_worktree Workflow section exists`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      content.includes('large_multi_worktree Workflow'),
      `${relative} must contain a "large_multi_worktree Workflow" section`
    );
  });

  it(`${relative} large_multi_worktree Workflow does not use bare 'git checkout' outside ./trees/ context`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const section = getLargeMultiSection(content);
    assert.ok(section.length > 0, `${relative} must have a large_multi_worktree Workflow section`);

    // Only examine lines where 'git checkout' appears as an executed command, not as a
    // prose prohibition. Command lines are those that start with 'git checkout' (after
    // optional whitespace / backtick / shell-prompt markers) and are not describing a
    // prohibition (i.e., the line does NOT contain "never", "not", "instead", "avoid").
    const lines = section.split('\n');
    const bareCheckoutLines = lines.filter((line) => {
      // The line must contain 'git checkout' as a potential command
      if (!/git checkout\b/.test(line)) return false;
      // Skip lines that are prose prohibitions — they describe what NOT to do
      if (/never|not|avoid|instead|prohibited/i.test(line)) return false;
      // A command line starts with optional whitespace/backtick then 'git checkout'
      // (after stripping list markers like "- " or "   ")
      return /^\s*`?\s*git checkout\b/.test(line);
    });
    assert.strictEqual(
      bareCheckoutLines.length,
      0,
      `${relative} large_multi_worktree Workflow must not execute bare 'git checkout' as a command. ` +
      `Found: ${bareCheckoutLines.map((l) => l.trim()).join('; ')}`
    );
  });

  it(`${relative} large_multi_worktree Workflow uses 'git worktree add' for integration worktree`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const section = getLargeMultiSection(content);
    assert.ok(section.length > 0, `${relative} must have a large_multi_worktree Workflow section`);
    assert.ok(
      /git worktree add.*integration/i.test(section),
      `${relative} large_multi_worktree Workflow must use 'git worktree add' to create an integration worktree`
    );
  });

  it(`${relative} large_multi_worktree Workflow runs merge via 'git -C ./trees/' (not in root)`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const section = getLargeMultiSection(content);
    assert.ok(section.length > 0, `${relative} must have a large_multi_worktree Workflow section`);
    assert.ok(
      /git -C \.\/trees\/.*merge/i.test(section),
      `${relative} large_multi_worktree Workflow must run merge inside a worktree via 'git -C ./trees/...'`
    );
  });

  it(`${relative} large_multi_worktree Workflow uses 'git branch -f' to advance review branch ref without checkout`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const section = getLargeMultiSection(content);
    assert.ok(section.length > 0, `${relative} must have a large_multi_worktree Workflow section`);
    assert.ok(
      /git branch -f/.test(section),
      `${relative} large_multi_worktree Workflow must use 'git branch -f' to advance the review branch ref ` +
      `without switching root's branch`
    );
  });

  it(`${relative} large_multi_worktree Workflow cleans up integration worktree after merge`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const section = getLargeMultiSection(content);
    assert.ok(section.length > 0, `${relative} must have a large_multi_worktree Workflow section`);
    assert.ok(
      /worktree remove.*integration|git branch -d.*integration/i.test(section),
      `${relative} large_multi_worktree Workflow must clean up the integration worktree and temp branch after merge`
    );
  });

  it(`${relative} Safety Protocols rule #5 clarifies teardown navigation is distinct from merge operations`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    // Rule 5 should now distinguish teardown (where root navigation is valid)
    // from merge operations (which must always use isolated worktrees)
    const safetySection = (() => {
      const start = content.indexOf('Safety Protocols');
      if (start === -1) return '';
      const after = content.slice(start);
      const next = after.search(/\n## /);
      return next !== -1 ? after.slice(0, next) : after;
    })();
    assert.ok(
      safetySection.length > 0,
      `${relative} must contain a Safety Protocols section`
    );
    assert.ok(
      /teardown|tear.?down/i.test(safetySection),
      `${relative} Safety Protocols rule #5 must specifically mention teardown as the valid use case for root navigation`
    );
    assert.ok(
      /never.*merge|merge.*never|merge.*isolation|isolation.*merge|not.*for.*merge|merge.*not/i.test(safetySection),
      `${relative} Safety Protocols must clarify that root navigation is not for merge operations`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: branch-manager stop-and-report doctrine and explicit prohibitions
// ---------------------------------------------------------------------------
//
// The branch-manager must never autonomously self-remediate failures. When any
// operation fails or the repo is in an unexpected state, the agent must stop
// and return status: error with details — not attempt to fix the situation.
//
// Specific prohibitions enforced here:
//   1. Hooks are mandatory: always respect git hooks, never circumvent them
//   2. No git stash on files the agent did not create
//   3. No autonomous file deletion or movement beyond orchestrator direction
//   4. Safety Protocol #7 (staged artifact detection): report and stop, do not
//      autonomously unstage (git rm --cached) or modify .gitignore
//   5. Stop-and-report doctrine: return status: error on unexpected state
// ---------------------------------------------------------------------------

describe('Contract: branch-manager hook respect obligation', () => {
  const filePath = agentFilePath('branch-manager');
  const relative = 'agents/branch-manager.md';

  it(`${relative} states the positive obligation to always respect git hooks`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const prose = stripCodeBlocks(content);
    assert.ok(
      /hooks are mandatory|always respect.*hook|respect git hook/i.test(prose),
      `${relative} must state the positive obligation that git hooks are mandatory checkpoints to be respected`
    );
  });

  it(`${relative} instructs capturing hook output and returning status: error when a hook blocks`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const prose = stripCodeBlocks(content);
    assert.ok(
      /hook.*block|hook.*output|hook.*status.*error|hook.*blocking_issues/i.test(prose),
      `${relative} must instruct the agent to capture hook output and return status: error when a hook blocks a commit`
    );
  });

  it(`${relative} states hook failure is a real failure to report`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const prose = stripCodeBlocks(content);
    assert.ok(
      /hook.*fail.*report|hook.*fail.*stop|hook failure.*real|pre-commit.*fail|hook.*block.*commit/i.test(prose),
      `${relative} must state that hook failure is a real failure to be reported, not bypassed`
    );
  });
});

describe('Contract: branch-manager prohibits autonomous git stash', () => {
  const filePath = agentFilePath('branch-manager');
  const relative = 'agents/branch-manager.md';

  it(`${relative} prohibits git stash on files the agent did not create`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const prose = stripCodeBlocks(content);
    assert.ok(
      /git stash/i.test(prose),
      `${relative} must explicitly mention "git stash" as a prohibited operation`
    );
    const stashLines = prose
      .split('\n')
      .filter((line) => /git stash/i.test(line));
    const hasProhibitionContext = stashLines.some((line) =>
      /never|prohibit|not.*use|must not|forbidden|do not/i.test(line)
    );
    assert.ok(
      hasProhibitionContext,
      `${relative} must use "git stash" in a prohibition context — found lines: ${stashLines.map((l) => l.trim()).join('; ')}`
    );
  });

  it(`${relative} prohibits git stash pop`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const prose = stripCodeBlocks(content);
    assert.ok(
      /git stash pop|stash.*pop/i.test(prose),
      `${relative} must explicitly mention "git stash pop" as a prohibited operation`
    );
  });
});

describe('Contract: branch-manager prohibits autonomous file deletion and movement', () => {
  const filePath = agentFilePath('branch-manager');
  const relative = 'agents/branch-manager.md';

  it(`${relative} prohibits deleting or moving files beyond orchestrator direction`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const prose = stripCodeBlocks(content);
    assert.ok(
      /never.*delete.*file|never.*move.*file|do not.*delete.*file|do not.*move.*file|prohibit.*delet|prohibit.*mov/i.test(prose),
      `${relative} must explicitly prohibit deleting or moving files beyond what the orchestrator directed`
    );
  });
});

describe('Contract: branch-manager Safety Protocol #7 uses stop-and-report for staged artifacts', () => {
  const filePath = agentFilePath('branch-manager');
  const relative = 'agents/branch-manager.md';

  // Helper: extract the Safety Protocols section
  function getSafetySection(content) {
    const start = content.indexOf('Safety Protocols');
    if (start === -1) return '';
    const after = content.slice(start);
    const next = after.search(/\n## /);
    return next !== -1 ? after.slice(0, next) : after;
  }

  it(`${relative} Safety Protocol for staged artifacts reports and stops — does not autonomously unstage`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const safetySection = getSafetySection(content);
    assert.ok(safetySection.length > 0, `${relative} must contain a Safety Protocols section`);

    // Must mention reporting / blocking on artifact discovery
    assert.ok(
      /report.*block|block.*report|stop.*report|report.*stop|blocking issue/i.test(safetySection),
      `${relative} Safety Protocols staged artifact rule must require reporting a blocking issue and stopping`
    );

    // Must NOT instruct autonomous unstaging via git rm --cached as the resolution
    // (it may mention it as the old behavior in a prohibition, but must not be the directive)
    const lines = safetySection.split('\n');
    const unstageDirectiveLines = lines.filter((line) => {
      if (!/git rm.*--cached|git rm -r.*--cached/.test(line)) return false;
      // Skip lines that are prohibitions or "old behavior" notes
      if (/never|not|prohibit|do not|instead|old|was|removed|stop/i.test(line)) return false;
      // A directive line starts with directive verbs or is in a code block context
      return /unstage|remove.*staging|rm.*--cached/.test(line);
    });
    assert.strictEqual(
      unstageDirectiveLines.length,
      0,
      `${relative} Safety Protocols must not instruct autonomous 'git rm --cached' as artifact remediation. ` +
        `Found directive lines: ${unstageDirectiveLines.map((l) => l.trim()).join('; ')}`
    );
  });

  it(`${relative} Safety Protocol for staged artifacts does not autonomously modify .gitignore`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const safetySection = getSafetySection(content);
    assert.ok(safetySection.length > 0, `${relative} must contain a Safety Protocols section`);

    // The safety section must not instruct adding to .gitignore as part of artifact remediation
    const lines = safetySection.split('\n');
    const gitignoreDirectiveLines = lines.filter((line) => {
      if (!/.gitignore/.test(line)) return false;
      // Skip prohibition lines
      if (/never|not|prohibit|do not|instead|stop/i.test(line)) return false;
      // A directive to add to .gitignore as resolution
      return /add.*\.gitignore|\.gitignore.*add|update.*\.gitignore/.test(line);
    });
    assert.strictEqual(
      gitignoreDirectiveLines.length,
      0,
      `${relative} Safety Protocols must not instruct autonomous .gitignore modification as artifact remediation. ` +
        `Found directive lines: ${gitignoreDirectiveLines.map((l) => l.trim()).join('; ')}`
    );
  });
});

describe('Contract: branch-manager stop-and-report doctrine on unexpected state', () => {
  const filePath = agentFilePath('branch-manager');
  const relative = 'agents/branch-manager.md';

  it(`${relative} requires returning status: error when operation fails or repo is in unexpected state`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const prose = stripCodeBlocks(content);
    assert.ok(
      /status.*error.*unexpected|unexpected.*state.*stop|fail.*stop.*report|stop.*and.*report|self.?remediat/i.test(prose),
      `${relative} must contain a stop-and-report doctrine: on failure or unexpected state, return status: error — do not self-remediate`
    );
  });

  it(`${relative} explicitly prohibits self-remediation`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const prose = stripCodeBlocks(content);
    assert.ok(
      /do not self.?remediat|never.*self.?remediat|self.?remediat.*prohibit|not.*attempt.*fix|do not.*attempt.*fix/i.test(prose),
      `${relative} must explicitly prohibit self-remediation (the orchestrator, not the agent, decides how to respond to failures)`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: commands contain mission banner
// ---------------------------------------------------------------------------

describe('Contract: commands contain mission banner', () => {
  it("commands/takeoff.md contains 'REAPER // TAKEOFF'", () => {
    const filePath = commandFilePath('takeoff');
    const relative = 'commands/takeoff.md';
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      content.includes('REAPER // TAKEOFF'),
      `${relative} is missing mission banner 'REAPER // TAKEOFF'`
    );
  });

  it("commands/flight-plan.md contains 'REAPER // FLIGHT PLAN'", () => {
    const filePath = commandFilePath('flight-plan');
    const relative = 'commands/flight-plan.md';
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      content.includes('REAPER // FLIGHT PLAN'),
      `${relative} is missing mission banner 'REAPER // FLIGHT PLAN'`
    );
  });

  it("commands/claude-sync.md contains 'REAPER // CLAUDE SYNC'", () => {
    const filePath = commandFilePath('claude-sync');
    const relative = 'commands/claude-sync.md';
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      content.includes('REAPER // CLAUDE SYNC'),
      `${relative} is missing mission banner 'REAPER // CLAUDE SYNC'`
    );
  });

  it("commands/configure-quality-gates.md contains 'REAPER // CONFIGURE QUALITY GATES'", () => {
    const filePath = commandFilePath('configure-quality-gates');
    const relative = 'commands/configure-quality-gates.md';
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      content.includes('REAPER // CONFIGURE QUALITY GATES'),
      `${relative} is missing mission banner 'REAPER // CONFIGURE QUALITY GATES'`
    );
  });

  it("commands/ship.md contains 'REAPER // SHIP'", () => {
    const filePath = commandFilePath('ship');
    const relative = 'commands/ship.md';
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      content.includes('REAPER // SHIP'),
      `${relative} is missing mission banner 'REAPER // SHIP'`
    );
  });

  it("commands/status-worktrees.md contains 'REAPER // STATUS'", () => {
    const filePath = commandFilePath('status-worktrees');
    const relative = 'commands/status-worktrees.md';
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      content.includes('REAPER // STATUS'),
      `${relative} is missing mission banner 'REAPER // STATUS'`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: takeoff completion section references /reaper:ship as a PR option
// ---------------------------------------------------------------------------

describe('Contract: takeoff completion section references /reaper:ship', () => {
  const filePath = path.join(COMMANDS_DIR, 'takeoff.md');
  const relative = 'commands/takeoff.md';

  it(`${relative} completion control tower prompt mentions /reaper:ship`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      content.includes('/reaper:ship'),
      `${relative} completion section must mention /reaper:ship as an option for opening a PR`
    );
  });

  it(`${relative} Response Handling table contains a row for PR-intent language`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    // The table row must map PR-intent language to /reaper:ship
    assert.ok(
      content.includes('open a PR') || content.includes('create PR'),
      `${relative} Response Handling table must include a row for PR-intent language ("open a PR" or "create PR")`
    );
  });

  it(`${relative} Response Handling table maps PR-intent to /reaper:ship`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    // Both the PR-intent language and /reaper:ship must appear in the same area
    // (the Response Handling table section). Find the table and verify both are present.
    const tableStart = content.indexOf('### Response Handling');
    assert.ok(
      tableStart !== -1,
      `${relative} must contain a "### Response Handling" section`
    );
    const tableSection = content.slice(tableStart, tableStart + 2000);
    assert.ok(
      (tableSection.includes('open a PR') || tableSection.includes('create PR')) &&
        tableSection.includes('/reaper:ship'),
      `${relative} Response Handling table must map PR-intent language to /reaper:ship`
    );
  });

  it(`${relative} existing merge-to-develop row is preserved`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const tableStart = content.indexOf('### Response Handling');
    assert.ok(tableStart !== -1, `${relative} must contain "### Response Handling"`);
    const tableSection = content.slice(tableStart, tableStart + 2000);
    assert.ok(
      tableSection.includes('merge') && tableSection.includes('develop'),
      `${relative} Response Handling table must preserve the existing merge-to-develop row`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: workflow-planner-planning skill
// ---------------------------------------------------------------------------

describe('workflow-planner-planning skill', () => {
  const SKILL_NAME = 'workflow-planner-planning';
  const filePath = skillFilePath(SKILL_NAME);
  const relative = `skills/${SKILL_NAME}/SKILL.md`;

  it(`${relative} exists`, () => {
    assert.ok(
      fs.existsSync(filePath),
      `${relative} not found at ${filePath} — run npm run build to generate it`
    );
  });

  it(`${relative} has valid YAML frontmatter`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const fm = extractFrontmatter(content);
    assert.ok(fm !== null, `${relative} is missing YAML frontmatter (--- delimiters)`);
  });

  it(`${relative} frontmatter name === 'workflow-planner-planning'`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const fm = extractFrontmatter(content);
    assert.ok(fm !== null, `${relative} is missing frontmatter`);
    assert.ok(
      /^name\s*:\s*workflow-planner-planning\s*$/m.test(fm),
      `${relative} frontmatter "name" must be "workflow-planner-planning"`
    );
  });

  it(`${relative} frontmatter context === 'fork'`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const fm = extractFrontmatter(content);
    assert.ok(fm !== null, `${relative} is missing frontmatter`);
    assert.ok(
      /^context\s*:\s*fork\s*$/m.test(fm),
      `${relative} frontmatter "context" must be "fork"`
    );
  });

  it(`${relative} frontmatter agent === 'reaper:workflow-planner'`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const fm = extractFrontmatter(content);
    assert.ok(fm !== null, `${relative} is missing frontmatter`);
    assert.ok(
      /^agent\s*:\s*reaper:workflow-planner\s*$/m.test(fm),
      `${relative} frontmatter "agent" must be "reaper:workflow-planner"`
    );
  });

  it(`${relative} body contains Strategy Selection section`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      /Strategy Selection/i.test(content),
      `${relative} must contain a "Strategy Selection" section`
    );
  });

  it(`${relative} body contains JSON Planning Report section`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      /JSON/i.test(content),
      `${relative} must contain a JSON schema section`
    );
  });

  it(`${relative} body contains Work Package section`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      /Work Package/i.test(content),
      `${relative} must contain a "Work Package" section`
    );
  });

  it(`${relative} body contains Grounding instruction`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      /[Gg]rounding/i.test(content),
      `${relative} must contain grounding instruction`
    );
  });

  it(`${relative} body contains Input Validation section`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      /Input Validation/i.test(content),
      `${relative} must contain an "Input Validation" section`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: workflow-planner-verification skill
// ---------------------------------------------------------------------------

describe('workflow-planner-verification skill', () => {
  const SKILL_NAME = 'workflow-planner-verification';
  const filePath = skillFilePath(SKILL_NAME);
  const relative = `skills/${SKILL_NAME}/SKILL.md`;

  it(`${relative} exists`, () => {
    assert.ok(
      fs.existsSync(filePath),
      `${relative} not found at ${filePath} — run npm run build to generate it`
    );
  });

  it(`${relative} has valid YAML frontmatter`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const fm = extractFrontmatter(content);
    assert.ok(fm !== null, `${relative} is missing YAML frontmatter (--- delimiters)`);
  });

  it(`${relative} frontmatter name === 'workflow-planner-verification'`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const fm = extractFrontmatter(content);
    assert.ok(fm !== null, `${relative} is missing frontmatter`);
    assert.ok(
      /^name\s*:\s*workflow-planner-verification\s*$/m.test(fm),
      `${relative} frontmatter "name" must be "workflow-planner-verification"`
    );
  });

  it(`${relative} frontmatter context === 'fork'`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const fm = extractFrontmatter(content);
    assert.ok(fm !== null, `${relative} is missing frontmatter`);
    assert.ok(
      /^context\s*:\s*fork\s*$/m.test(fm),
      `${relative} frontmatter "context" must be "fork"`
    );
  });

  it(`${relative} frontmatter agent === 'reaper:workflow-planner'`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const fm = extractFrontmatter(content);
    assert.ok(fm !== null, `${relative} is missing frontmatter`);
    assert.ok(
      /^agent\s*:\s*reaper:workflow-planner\s*$/m.test(fm),
      `${relative} frontmatter "agent" must be "reaper:workflow-planner"`
    );
  });

  it(`${relative} body contains verification criterion table`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      /[Cc]riterion/i.test(content),
      `${relative} must contain a criterion table for the 4 orchestratability criteria`
    );
  });

  it(`${relative} body contains auto-fix protocol`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      /[Aa]uto-[Ff]ix/i.test(content),
      `${relative} must contain the auto-fix protocol`
    );
  });

  it(`${relative} body contains verification workflow steps`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      /[Vv]erification/i.test(content),
      `${relative} must contain verification workflow steps`
    );
  });

  it(`${relative} body contains JSON output schema`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      /JSON/i.test(content),
      `${relative} must contain a JSON output schema`
    );
  });

  it(`${relative} body contains verification_mode field in JSON schema`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      content.includes('verification_mode'),
      `${relative} JSON schema must include "verification_mode" field`
    );
  });

  it(`${relative} body contains Verification vs Planning comparison`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      /[Pp]lanning/i.test(content),
      `${relative} must contain Verification vs Planning comparison table`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: workflow-planner agent (refactored)
// Validates that the agent is a thin routing layer after process extraction
// ---------------------------------------------------------------------------

describe('workflow-planner agent (refactored)', () => {
  const filePath = agentFilePath('workflow-planner');
  const relative = 'agents/workflow-planner.md';

  it(`${relative} line count is less than 150`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const lineCount = content.split('\n').length;
    assert.ok(
      lineCount < 150,
      `${relative} must be under 150 lines (currently ${lineCount}) — process content should live in skills`
    );
  });

  it(`${relative} contains 'workflow-planner-planning' skill routing reference`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      content.includes('workflow-planner-planning'),
      `${relative} must reference the 'workflow-planner-planning' skill for routing`
    );
  });

  it(`${relative} contains 'workflow-planner-verification' skill routing reference`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      content.includes('workflow-planner-verification'),
      `${relative} must reference the 'workflow-planner-verification' skill for routing`
    );
  });

  it(`${relative} does NOT contain 'Scoring Rubric'`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      !content.includes('Scoring Rubric'),
      `${relative} must NOT contain 'Scoring Rubric' — this process content belongs in the planning skill`
    );
  });

  it(`${relative} does NOT contain 'Anti-Patterns'`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      !content.includes('Anti-Patterns'),
      `${relative} must NOT contain 'Anti-Patterns' — this process content belongs in the planning skill`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: takeoff command: workflow-planner-planning skill invocation
// ---------------------------------------------------------------------------

describe('takeoff command: workflow-planner-planning skill invocation', () => {
  const filePath = path.join(COMMANDS_DIR, 'takeoff.md');
  const relative = 'commands/takeoff.md';

  it(`${relative} contains 'workflow-planner-planning' skill name`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      content.includes('workflow-planner-planning'),
      `${relative} must reference the 'workflow-planner-planning' skill for planning invocation`
    );
  });

  it(`${relative} does NOT contain 'Task --subagent_type reaper:workflow-planner'`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      !content.includes('Task --subagent_type reaper:workflow-planner'),
      `${relative} must NOT contain 'Task --subagent_type reaper:workflow-planner' — use Skill invocation instead`
    );
  });

  it(`${relative} does NOT contain 'deploy reaper:workflow-planner'`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      !content.includes('deploy reaper:workflow-planner'),
      `${relative} must NOT contain 'deploy reaper:workflow-planner' — use skill invocation language instead`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: flight-plan command: workflow-planner-verification skill invocation
// ---------------------------------------------------------------------------

describe('flight-plan command: workflow-planner-verification skill invocation', () => {
  const filePath = path.join(COMMANDS_DIR, 'flight-plan.md');
  const relative = 'commands/flight-plan.md';

  it(`${relative} contains 'workflow-planner-verification' skill name`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      content.includes('workflow-planner-verification'),
      `${relative} must reference the 'workflow-planner-verification' skill for Phase 6 verification`
    );
  });

  it(`${relative} does NOT contain 'Task --subagent_type reaper:workflow-planner'`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      !content.includes('Task --subagent_type reaper:workflow-planner'),
      `${relative} must NOT contain 'Task --subagent_type reaper:workflow-planner' — use Skill invocation instead`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: Gate 2 partial failure — orchestrator combines blocking_issues
// and re-runs both Gate 2 agents after coding agent addresses issues
//
// Scenario: security-auditor passes, code-review SME fails (or vice versa).
// The orchestrator must NOT treat the passing agent's verdict as final and
// only retry the failing agent. Instead:
//   1. Collect blocking_issues from EVERY Gate 2 agent (pass AND fail).
//   2. Give the coding agent the COMBINED list before remediation.
//   3. Re-deploy ALL Gate 2 agents in a single parallel message on retry.
//
// Source of truth: src/partials/quality-gate-protocol.ejs
//   "If either fails, combine `blocking_issues` from both before redeploying
//    the coding agent."
// ---------------------------------------------------------------------------

describe('Contract: Gate 2 partial failure — combine blocking_issues and re-run both agents', () => {
  /**
   * The Parallel Deployment Pattern section in commands/takeoff.md contains
   * the orchestrator-role rendering of quality-gate-protocol.ejs.
   * We extract it to focus assertions on the Gate 2 retry behaviour.
   *
   * @param {string} content - Full takeoff.md content
   * @returns {string} The Parallel Deployment Pattern section text
   */
  function extractParallelDeploymentPattern(content) {
    const startMarker = '### Parallel Deployment Pattern';
    const startIndex = content.indexOf(startMarker);
    if (startIndex === -1) return '';

    // Ends at the next ### or ## heading
    const rest = content.slice(startIndex + startMarker.length);
    const nextSectionMatch = rest.match(/\n###? /);
    if (nextSectionMatch) {
      return content.slice(
        startIndex,
        startIndex + startMarker.length + nextSectionMatch.index
      );
    }
    return content.slice(startIndex);
  }

  const takeoffPath = path.join(COMMANDS_DIR, 'takeoff.md');
  const takeoffRelative = 'commands/takeoff.md';

  const sourcePath = path.join(ROOT, 'src', 'partials', 'quality-gate-protocol.ejs');
  const sourceRelative = 'src/partials/quality-gate-protocol.ejs';

  // ------------------------------------------------------------------
  // AC1: blocking_issues from both Gate 2 agents are combined before retry
  // ------------------------------------------------------------------

  it(`${sourceRelative} Parallel Deployment Pattern instructs combining blocking_issues from both agents`, () => {
    assert.ok(fs.existsSync(sourcePath), `${sourceRelative} not found`);
    const content = fs.readFileSync(sourcePath, 'utf8');
    // The partial must contain language that says to combine blocking_issues
    // from BOTH Gate 2 agents when either one fails — not just from the failing agent.
    assert.ok(
      /combine.*blocking_issues|blocking_issues.*combine/i.test(content),
      `${sourceRelative} Parallel Deployment Pattern must instruct combining blocking_issues from both Gate 2 agents ` +
        `when one fails (e.g. "combine blocking_issues from both before redeploying")`
    );
  });

  it(`${takeoffRelative} Parallel Deployment Pattern instructs combining blocking_issues from both agents`, () => {
    assert.ok(fs.existsSync(takeoffPath), `${takeoffRelative} not found`);
    const content = fs.readFileSync(takeoffPath, 'utf8');
    const section = extractParallelDeploymentPattern(content);
    assert.ok(
      section.length > 0,
      `${takeoffRelative} must contain a "### Parallel Deployment Pattern" section`
    );
    // The rendered orchestrator output must preserve the combine instruction
    assert.ok(
      /combine.*blocking_issues|blocking_issues.*combine/i.test(section),
      `${takeoffRelative} Parallel Deployment Pattern must instruct combining blocking_issues from both Gate 2 agents ` +
        `when one fails — found section:\n${section.slice(0, 400)}`
    );
  });

  // ------------------------------------------------------------------
  // AC2: after retry, both Gate 2 agents re-run (not just the failed one)
  // ------------------------------------------------------------------

  it(`${sourceRelative} Parallel Deployment Pattern deploys Gate 2 agents in a single message (not individually)`, () => {
    assert.ok(fs.existsSync(sourcePath), `${sourceRelative} not found`);
    const content = fs.readFileSync(sourcePath, 'utf8');
    // The partial must require deploying Gate 2 agents together in one message,
    // which ensures both re-run on retry (not just the failed agent).
    assert.ok(
      /single message|simultaneously/i.test(content),
      `${sourceRelative} must require deploying Gate 2 agents in a single message (simultaneously), ` +
        `ensuring both agents re-run on retry — not just the failing one`
    );
  });

  it(`${takeoffRelative} Parallel Deployment Pattern deploys Gate 2 agents in a single message on retry`, () => {
    assert.ok(fs.existsSync(takeoffPath), `${takeoffRelative} not found`);
    const content = fs.readFileSync(takeoffPath, 'utf8');
    const section = extractParallelDeploymentPattern(content);
    assert.ok(
      section.length > 0,
      `${takeoffRelative} must contain a "### Parallel Deployment Pattern" section`
    );
    // Rendered output must preserve the single-message deployment requirement
    assert.ok(
      /single message|simultaneously/i.test(section),
      `${takeoffRelative} Parallel Deployment Pattern must specify deploying Gate 2 agents in a single message — ` +
        `this guarantees both agents re-run together on retry, not sequentially or individually`
    );
  });

  // ------------------------------------------------------------------
  // AC3: the "re-run failed gate only" iteration rule does not apply
  // within Gate 2 — partial failure still triggers a full Gate 2 re-run
  // ------------------------------------------------------------------

  it(`${sourceRelative} Iteration Rules "re-run failed gate" applies to Gate 1 vs Gate 2, not within Gate 2`, () => {
    assert.ok(fs.existsSync(sourcePath), `${sourceRelative} not found`);
    const content = fs.readFileSync(sourcePath, 'utf8');

    // The Iteration Rules section says "re-run the failed gate (not all gates)".
    // This refers to not repeating Gate 1 when Gate 2 fails — it does NOT mean
    // running only the failing Gate 2 agent. The Parallel Deployment Pattern
    // overrides this for within-Gate-2 behaviour by requiring a combined re-run.
    // Both sections must coexist in the same source file.
    assert.ok(
      content.includes('re-run the failed gate'),
      `${sourceRelative} must contain the "re-run the failed gate" iteration rule (for Gate 1 vs Gate 2 sequencing)`
    );
    assert.ok(
      /combine.*blocking_issues|blocking_issues.*combine/i.test(content),
      `${sourceRelative} must also contain the combining instruction for within-Gate-2 partial failure — ` +
        `both rules must coexist: "re-run failed gate" (inter-gate) and "combine blocking_issues" (intra-Gate-2)`

// Contract: quality-gate-protocol union semantics — 3-work-type deduplication
//
// When a changeset spans application_code + database_migration + documentation,
// the union of those three profiles must produce exactly one Gate 1 agent
// (reaper:test-runner, from application_code) and a deduplicated Gate 2 set
// containing all four unique reviewers from the three profiles.
//
// Gate profile lookup (from quality-gate-protocol.ejs):
//   application_code  → Gate 1: reaper:test-runner
//                        Gate 2: reaper:principal-engineer, reaper:security-auditor
//   database_migration → Gate 1: --
//                        Gate 2: reaper:database-architect
//   documentation      → Gate 1: --
//                        Gate 2: reaper:technical-writer
//
// Union result:
//   Gate 1 (deduped): reaper:test-runner (exactly 1; only application_code contributes)
//   Gate 2 (deduped): reaper:principal-engineer, reaper:security-auditor,
//                     reaper:database-architect, reaper:technical-writer (4 unique agents)
// ---------------------------------------------------------------------------

describe('Contract: quality-gate-protocol union semantics — 3-work-type deduplication', () => {
  const sourcePath = path.join(ROOT, 'src', 'partials', 'quality-gate-protocol.ejs');
  const sourceRelative = 'src/partials/quality-gate-protocol.ejs';

  /**
   * Parses the first gate profile lookup table from the quality-gate-protocol source.
   *
   * Only the primary table (inside the orchestrator role block) uses fully-qualified
   * "reaper:agent-name" references. A second summary table uses short names and must
   * be skipped — we stop parsing after the first table exits.
   *
   * Returns a map of workType -> { gate1: string[], gate2: string[] } where
   * each array contains the fully-qualified reaper: agent names listed in that column.
   * A '--' or empty value yields an empty array.
   *
   * @param {string} content - Full EJS source content
   * @returns {Map<string, { gate1: string[], gate2: string[] }>}
   */
  function parseGateProfileTable(content) {
    const profiles = new Map();

    const lines = content.split('\n');
    // Locate the primary table: header row contains "Gate 1 (blocking)" and "Gate 2 (parallel)"
    // Stop parsing as soon as we leave the first table (so the summary table doesn't overwrite).
    let inTable = false;
    let tableFound = false;

    for (const line of lines) {
      if (!line.startsWith('|')) {
        if (inTable) {
          // First table just ended — stop processing to avoid the summary table.
          break;
        }
        continue;
      }
      if (line.includes('Gate 1 (blocking)') && line.includes('Gate 2 (parallel)')) {
        if (tableFound) {
          // A second table header — stop to avoid reading the short-name summary table.
          break;
        }
        inTable = true;
        tableFound = true;
        continue;
      }
      // Skip separator row
      if (/^[\s|:-]+$/.test(line)) continue;
      if (!inTable) continue;

      // Parse a data row: | work_type | gate1 | gate2 |
      const cells = line.split('|').slice(1, -1).map((c) => c.trim());
      if (cells.length < 3) continue;

      const workType = cells[0].replace(/`/g, '');
      const gate1Agents = (cells[1].match(/reaper:[a-z-]+/g) || []);
      const gate2Agents = (cells[2].match(/reaper:[a-z-]+/g) || []);

      profiles.set(workType, { gate1: gate1Agents, gate2: gate2Agents });
    }

    return profiles;
  }

  /**
   * Computes the union gate profile for a set of work types, applying the
   * deduplication rules documented in the "Union Semantics for Mixed Changesets"
   * section of quality-gate-protocol.ejs:
   *
   *   1. Collect all unique Gate 1 agents across matching profiles.
   *   2. Collect all unique Gate 2 agents across matching profiles (deduplicated).
   *
   * @param {Map<string, { gate1: string[], gate2: string[] }>} profiles
   * @param {string[]} workTypes
   * @returns {{ gate1: string[], gate2: string[] }}
   */
  function computeUnion(profiles, workTypes) {
    const gate1Set = new Set();
    const gate2Set = new Set();

    for (const wt of workTypes) {
      const profile = profiles.get(wt);
      if (!profile) continue;
      for (const a of profile.gate1) gate1Set.add(a);
      for (const a of profile.gate2) gate2Set.add(a);
    }

    return {
      gate1: [...gate1Set],
      gate2: [...gate2Set],
    };
  }

  it(`${sourceRelative} exists`, () => {
    assert.ok(
      fs.existsSync(sourcePath),
      `${sourceRelative} not found at ${sourcePath}`
    );
  });

  it(`${sourceRelative} documents union semantics section`, () => {
    assert.ok(fs.existsSync(sourcePath), `${sourceRelative} not found`);
    const content = fs.readFileSync(sourcePath, 'utf8');
    assert.ok(
      content.includes('Union Semantics'),
      `${sourceRelative} must contain a "Union Semantics" section describing how mixed changesets are handled`
    );
  });

  it('union of application_code + database_migration + documentation yields exactly one Gate 1 agent', () => {
    assert.ok(fs.existsSync(sourcePath), `${sourceRelative} not found`);
    const content = fs.readFileSync(sourcePath, 'utf8');
    const profiles = parseGateProfileTable(content);

    const workTypes = ['application_code', 'database_migration', 'documentation'];
    const union = computeUnion(profiles, workTypes);

    // Gate 1: only application_code contributes reaper:test-runner;
    // database_migration and documentation have no Gate 1 agents.
    assert.strictEqual(
      union.gate1.length,
      1,
      `Union Gate 1 must have exactly 1 agent (no duplicates). Got: [${union.gate1.join(', ')}]`
    );
    assert.strictEqual(
      union.gate1[0],
      'reaper:test-runner',
      `Union Gate 1 must be reaper:test-runner (the sole Gate 1 contributor)`
    );
  });

  it('union of application_code + database_migration + documentation Gate 1 has no duplicates', () => {
    assert.ok(fs.existsSync(sourcePath), `${sourceRelative} not found`);
    const content = fs.readFileSync(sourcePath, 'utf8');
    const profiles = parseGateProfileTable(content);

    const workTypes = ['application_code', 'database_migration', 'documentation'];
    const union = computeUnion(profiles, workTypes);

    const uniqueGate1 = [...new Set(union.gate1)];
    assert.strictEqual(
      union.gate1.length,
      uniqueGate1.length,
      `Union Gate 1 must have no duplicate agents. Got: [${union.gate1.join(', ')}]`
    );
  });

  it('union of application_code + database_migration + documentation Gate 2 contains all required agents', () => {
    assert.ok(fs.existsSync(sourcePath), `${sourceRelative} not found`);
    const content = fs.readFileSync(sourcePath, 'utf8');
    const profiles = parseGateProfileTable(content);

    const workTypes = ['application_code', 'database_migration', 'documentation'];
    const union = computeUnion(profiles, workTypes);

    // application_code contributes: reaper:principal-engineer, reaper:security-auditor
    // database_migration contributes: reaper:database-architect
    // documentation contributes: reaper:technical-writer
    const expectedGate2 = [
      'reaper:principal-engineer',
      'reaper:security-auditor',
      'reaper:database-architect',
      'reaper:technical-writer',
    ];

    for (const agent of expectedGate2) {
      assert.ok(
        union.gate2.includes(agent),
        `Union Gate 2 must include ${agent} (contributed by its respective work type). ` +
          `Got: [${union.gate2.join(', ')}]`
      );
    }
  });

  it('union of application_code + database_migration + documentation Gate 2 has no duplicate agents', () => {
    assert.ok(fs.existsSync(sourcePath), `${sourceRelative} not found`);
    const content = fs.readFileSync(sourcePath, 'utf8');
    const profiles = parseGateProfileTable(content);

    const workTypes = ['application_code', 'database_migration', 'documentation'];
    const union = computeUnion(profiles, workTypes);

    const uniqueGate2 = [...new Set(union.gate2)];
    assert.strictEqual(
      union.gate2.length,
      uniqueGate2.length,
      `Union Gate 2 must have no duplicate agents. Got: [${union.gate2.join(', ')}]`
    );
  });

  it('union of application_code + database_migration + documentation Gate 2 has exactly 4 unique agents', () => {
    assert.ok(fs.existsSync(sourcePath), `${sourceRelative} not found`);
    const content = fs.readFileSync(sourcePath, 'utf8');
    const profiles = parseGateProfileTable(content);

    const workTypes = ['application_code', 'database_migration', 'documentation'];
    const union = computeUnion(profiles, workTypes);

    assert.strictEqual(
      union.gate2.length,
      4,
      `Union Gate 2 must have exactly 4 unique agents ` +
        `(principal-engineer + security-auditor + database-architect + technical-writer). ` +
        `Got ${union.gate2.length}: [${union.gate2.join(', ')}]`
    );
  });
});
