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
  GATE_CAPABLE_AGENTS,
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
  gateCapable: {
    label: 'gate-capable agents',
    agents: () => GATE_CAPABLE_AGENTS,
    sections: [
      { pattern: /GATE_MODE/, label: 'GATE_MODE section' },
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
registerSemanticSuite('gateCapable');
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
      { pattern: /Plan File/i, label: 'plan file section' },
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
const VISUAL_VOCAB_COMMANDS = ['takeoff', 'ship', 'status-worktrees', 'squadron'];

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

  it(`${sourceRelative} Strategy 1 & 2 mentions branch-manager for committing`, () => {
    assert.ok(fs.existsSync(sourcePath), `${sourceRelative} not found`);
    const content = fs.readFileSync(sourcePath, 'utf8');

    // Strategy 1 & 2 line must reference branch-manager
    const strategyLine = content.split('\n').find((line) => line.includes('Strategy 1') && line.includes('2'));
    assert.ok(
      strategyLine !== undefined,
      `${sourceRelative} must have a line referencing "Strategy 1" and "2"`
    );
    assert.ok(
      strategyLine.includes('branch-manager'),
      `${sourceRelative} Strategy 1 & 2 line must reference branch-manager for committing (found: "${strategyLine.trim()}")`
    );
  });

  it(`${sourceRelative} Strategy 3 also mentions branch-manager for committing`, () => {
    assert.ok(fs.existsSync(sourcePath), `${sourceRelative} not found`);
    const content = fs.readFileSync(sourcePath, 'utf8');

    const strategyLine = content.split('\n').find((line) => line.includes('Strategy 3'));
    assert.ok(
      strategyLine !== undefined,
      `${sourceRelative} must have a line referencing "Strategy 3"`
    );
    assert.ok(
      strategyLine.includes('branch-manager'),
      `${sourceRelative} Strategy 3 line must reference branch-manager for committing (found: "${strategyLine.trim()}")`
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
// Contract: quality-gate-protocol Commit on Pass — feature branch constraint
// ---------------------------------------------------------------------------

describe('Contract: quality-gate-protocol Commit on Pass feature branch constraint', () => {
  const sourcePath = path.join(ROOT, 'src', 'partials', 'quality-gate-protocol.ejs');
  const sourceRelative = 'src/partials/quality-gate-protocol.ejs';

  /**
   * Extracts the "Commit on Pass" section from quality-gate-protocol.ejs.
   * @param {string} content - Full file content
   * @returns {string} The Commit on Pass section text, or empty string if not found
   */
  function extractCommitOnPass(content) {
    const startMarker = '### Commit on Pass';
    const startIndex = content.indexOf(startMarker);
    if (startIndex === -1) return '';

    const rest = content.slice(startIndex + startMarker.length);
    const nextSectionMatch = rest.match(/\n###? /);
    if (nextSectionMatch) {
      return content.slice(startIndex, startIndex + startMarker.length + nextSectionMatch.index);
    }
    return content.slice(startIndex);
  }

  it(`${sourceRelative} Commit on Pass section exists`, () => {
    assert.ok(fs.existsSync(sourcePath), `${sourceRelative} not found`);
    const content = fs.readFileSync(sourcePath, 'utf8');
    const section = extractCommitOnPass(content);
    assert.ok(
      section.length > 0,
      `${sourceRelative} must contain a "### Commit on Pass" section`
    );
  });

  it(`${sourceRelative} Commit on Pass specifies commits go to feature branch only`, () => {
    assert.ok(fs.existsSync(sourcePath), `${sourceRelative} not found`);
    const content = fs.readFileSync(sourcePath, 'utf8');
    const section = extractCommitOnPass(content);
    assert.ok(
      section.includes('feature branch'),
      `${sourceRelative} Commit on Pass must explicitly state commits go to the feature branch`
    );
  });

  it(`${sourceRelative} Commit on Pass contains "never" constraint for main/master/develop`, () => {
    assert.ok(fs.existsSync(sourcePath), `${sourceRelative} not found`);
    const content = fs.readFileSync(sourcePath, 'utf8');
    const section = extractCommitOnPass(content);
    assert.ok(
      /never.*master|never.*main|never.*develop|master.*never|main.*never|develop.*never/i.test(section),
      `${sourceRelative} Commit on Pass must contain a "never" constraint for master/main/develop branches`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: branch-manager Strategy 2 uses shared worktree + branch-manager commits
// ---------------------------------------------------------------------------

describe('Contract: branch-manager Strategy 2 uses shared worktree with branch-manager commits', () => {
  const filePath = agentFilePath('branch-manager');
  const relative = 'agents/branch-manager.md';

  it(`${relative} Strategy-Based Authority table has Strategy 2 row with worktree`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    // Strategy 2 row must mention worktree creation
    const tableRows = content.split('\n').filter((line) =>
      line.startsWith('|') && line.includes('2') && (line.includes('Medium') || line.includes('worktree'))
    );
    assert.ok(
      tableRows.length > 0,
      `${relative} Strategy-Based Authority table must have a Strategy 2 row referencing worktree`
    );
  });

  it(`${relative} Strategy-Based Authority table Strategy 2 row includes commits`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    // Strategy 2 table row must indicate branch-manager does commits (not "None")
    const tableLines = content.split('\n');
    const strategy2Row = tableLines.find(
      (line) => line.startsWith('|') && /\|\s*2\s*\(/.test(line)
    );
    assert.ok(
      strategy2Row !== undefined,
      `${relative} must have a Strategy 2 row in the strategy table (format: "| 2 (...")`
    );
    // The row should NOT say "None" for commits column when worktree is present
    // It should reference commits or branch-manager committing
    assert.ok(
      !(/\|\s*None\s*\|.*\|\s*None\s*\|/.test(strategy2Row)),
      `${relative} Strategy 2 row must not have None for both Commits and Merges when using worktree`
    );
  });

  it(`${relative} contains a Strategy 2 Workflow section`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      content.includes('Strategy 2 Workflow'),
      `${relative} must contain a "Strategy 2 Workflow" section`
    );
  });

  it(`${relative} Strategy 2 Workflow describes creating a shared worktree`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const s2Start = content.indexOf('Strategy 2 Workflow');
    assert.ok(s2Start !== -1, `${relative} must contain Strategy 2 Workflow`);
    // The section should end before the next ## heading or Strategy 3 Workflow
    const s3Start = content.indexOf('Strategy 3 Workflow');
    const section = s3Start !== -1
      ? content.slice(s2Start, s3Start)
      : content.slice(s2Start, s2Start + 2000);
    assert.ok(
      /worktree/i.test(section),
      `${relative} Strategy 2 Workflow must describe creating a shared worktree`
    );
  });

  it(`${relative} Strategy 2 Workflow states coding agents do not commit`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const s2Start = content.indexOf('Strategy 2 Workflow');
    assert.ok(s2Start !== -1, `${relative} must contain Strategy 2 Workflow`);
    const s3Start = content.indexOf('Strategy 3 Workflow');
    const section = s3Start !== -1
      ? content.slice(s2Start, s3Start)
      : content.slice(s2Start, s2Start + 2000);
    assert.ok(
      /no commit|without commit|no.*commit|uncommitted|never commit/i.test(section),
      `${relative} Strategy 2 Workflow must state that coding agents work without committing`
    );
  });

  it(`${relative} Strategy 2 Workflow states branch-manager commits after gates pass`, () => {
    assert.ok(fs.existsSync(filePath), `${relative} not found`);
    const content = fs.readFileSync(filePath, 'utf8');
    const s2Start = content.indexOf('Strategy 2 Workflow');
    assert.ok(s2Start !== -1, `${relative} must contain Strategy 2 Workflow`);
    const s3Start = content.indexOf('Strategy 3 Workflow');
    const section = s3Start !== -1
      ? content.slice(s2Start, s3Start)
      : content.slice(s2Start, s2Start + 2000);
    assert.ok(
      /branch-manager.*commit|commit.*branch-manager/i.test(section),
      `${relative} Strategy 2 Workflow must state that branch-manager commits after quality gates pass`
    );
  });
});

// ---------------------------------------------------------------------------
// Contract: workflow-planner Strategy 2 mentions shared worktree
// ---------------------------------------------------------------------------

describe('Contract: workflow-planner medium_single_branch mentions shared worktree', () => {
  const filePath = agentFilePath('workflow-planner');
  const relative = 'agents/workflow-planner.md';

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
// Contract: workflow-planner dirty-root safety check
// ---------------------------------------------------------------------------

describe('Contract: workflow-planner dirty-root safety check', () => {
  const filePath = agentFilePath('workflow-planner');
  const relative = 'agents/workflow-planner.md';

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
