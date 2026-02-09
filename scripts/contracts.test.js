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
    ],
  },
  takeoff: {
    label: 'takeoff command',
    commands: () => ['takeoff'],
    sections: [
      { pattern: /Orchestrator Role/i, label: 'orchestrator role section' },
      { pattern: /Quality Gate/i, label: 'quality gate section' },
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
    ],
  },
  squadron: {
    label: 'squadron command',
    commands: () => ['squadron'],
    sections: [
      { pattern: /PHASE 1/i, label: 'phase 1 section' },
      { pattern: /Error Handling/i, label: 'error handling section' },
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
