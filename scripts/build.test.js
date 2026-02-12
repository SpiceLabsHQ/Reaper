const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  parseArgs,
  GATE_CAPABLE_AGENTS,
  buildTemplateVars,
  getAgentType,
  parseFrontmatter,
  formatError,
  compileTemplate,
  processFile,
  copyFile,
  findFiles,
  buildType,
  build,
  main,
  AGENT_TYPES,
  TDD_AGENTS,
  config,
  stats,
} = require('./build');
const { resetBuildState, stubProcessExit } = require('./test-helpers');

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

beforeEach(() => {
  resetBuildState();
});

// ===========================================================================
// GATE_CAPABLE_AGENTS constant validation
// ===========================================================================

describe('GATE_CAPABLE_AGENTS', () => {
  it('should be exported as an array', () => {
    assert.ok(
      Array.isArray(GATE_CAPABLE_AGENTS),
      'GATE_CAPABLE_AGENTS should be an array'
    );
  });

  it('should contain the expected gate-capable agents', () => {
    const expected = [
      'ai-prompt-engineer',
      'code-reviewer',
      'security-auditor',
      'deployment-engineer',
    ];
    assert.deepStrictEqual(
      GATE_CAPABLE_AGENTS.slice().sort(),
      expected.slice().sort(),
      'GATE_CAPABLE_AGENTS should contain exactly the four gate-capable agents'
    );
  });

  it('should only contain agents that exist in AGENT_TYPES', () => {
    const allAgents = Object.values(AGENT_TYPES).flat();
    for (const agent of GATE_CAPABLE_AGENTS) {
      assert.ok(
        allAgents.includes(agent),
        `Gate-capable agent "${agent}" should exist in AGENT_TYPES`
      );
    }
  });
});

// ===========================================================================
// buildTemplateVars — gateCapable flag
// ===========================================================================

describe('buildTemplateVars gateCapable', () => {
  it('should set gateCapable to true for gate-capable agents', () => {
    const gateAgents = [
      'ai-prompt-engineer',
      'code-reviewer',
      'security-auditor',
      'deployment-engineer',
    ];

    for (const agent of gateAgents) {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(
        vars.gateCapable,
        true,
        `Agent "${agent}" should have gateCapable: true`
      );
    }
  });

  it('should set gateCapable to false for non-gate-capable agents', () => {
    const nonGateAgents = [
      'bug-fixer',
      'feature-developer',
      'refactoring-dev',
      'workflow-planner',
      'test-runner',
      'branch-manager',
    ];

    for (const agent of nonGateAgents) {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(
        vars.gateCapable,
        false,
        `Agent "${agent}" should have gateCapable: false`
      );
    }
  });

  it('should not set gateCapable for non-agent source types', () => {
    const vars = buildTemplateVars('skills', 'some-skill', 'skills/some-skill.ejs');
    assert.strictEqual(
      vars.gateCapable,
      undefined,
      'Skills should not have gateCapable property'
    );
  });

  it('should not set gateCapable for hooks source type', () => {
    const vars = buildTemplateVars('hooks', 'some-hook', 'hooks/some-hook.ejs');
    assert.strictEqual(
      vars.gateCapable,
      undefined,
      'Hooks should not have gateCapable property'
    );
  });
});

// ===========================================================================
// buildTemplateVars — common base variables
// ===========================================================================

describe('buildTemplateVars base variables', () => {
  it('should always return FILENAME matching input filename', () => {
    const vars = buildTemplateVars('agents', 'bug-fixer', 'agents/bug-fixer.ejs');
    assert.strictEqual(vars.FILENAME, 'bug-fixer');
  });

  it('should always return SOURCE_TYPE matching input sourceType', () => {
    const vars = buildTemplateVars('skills', 'my-skill', 'skills/my-skill.ejs');
    assert.strictEqual(vars.SOURCE_TYPE, 'skills');
  });

  it('should always return RELATIVE_PATH matching input relativePath', () => {
    const relPath = 'agents/bug-fixer.ejs';
    const vars = buildTemplateVars('agents', 'bug-fixer', relPath);
    assert.strictEqual(vars.RELATIVE_PATH, relPath);
  });

  it('should return BUILD_TIMESTAMP in ISO 8601 format', () => {
    const before = new Date().toISOString();
    const vars = buildTemplateVars('agents', 'bug-fixer', 'agents/bug-fixer.ejs');
    const after = new Date().toISOString();

    assert.match(
      vars.BUILD_TIMESTAMP,
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      'BUILD_TIMESTAMP should be in ISO 8601 format'
    );

    assert.ok(
      vars.BUILD_TIMESTAMP >= before && vars.BUILD_TIMESTAMP <= after,
      'BUILD_TIMESTAMP should be between before and after call timestamps'
    );
  });

  it('should include base variables for all source types', () => {
    const sourceTypes = ['agents', 'skills', 'hooks', 'commands'];
    for (const st of sourceTypes) {
      const vars = buildTemplateVars(st, 'test-name', `${st}/test-name.ejs`);
      assert.ok('FILENAME' in vars, `${st} should have FILENAME`);
      assert.ok('SOURCE_TYPE' in vars, `${st} should have SOURCE_TYPE`);
      assert.ok('RELATIVE_PATH' in vars, `${st} should have RELATIVE_PATH`);
      assert.ok('BUILD_TIMESTAMP' in vars, `${st} should have BUILD_TIMESTAMP`);
    }
  });
});

// ===========================================================================
// buildTemplateVars — coding agents
// ===========================================================================

describe('buildTemplateVars coding agents', () => {
  const codingAgents = ['bug-fixer', 'feature-developer', 'refactoring-dev', 'integration-engineer'];

  for (const agent of codingAgents) {
    it(`should classify "${agent}" as IS_CODING_AGENT=true`, () => {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(vars.IS_CODING_AGENT, true, `${agent} should be a coding agent`);
    });

    it(`should set AGENT_TYPE="coding" for "${agent}"`, () => {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(vars.AGENT_TYPE, 'coding', `${agent} AGENT_TYPE should be "coding"`);
    });

    it(`should set HAS_GIT_PROHIBITIONS=true for "${agent}"`, () => {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(vars.HAS_GIT_PROHIBITIONS, true, `${agent} should have git prohibitions`);
    });

    it(`should set IS_REVIEW_AGENT=false for "${agent}"`, () => {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(vars.IS_REVIEW_AGENT, false);
    });

    it(`should set IS_PLANNING_AGENT=false for "${agent}"`, () => {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(vars.IS_PLANNING_AGENT, false);
    });
  }
});

// ===========================================================================
// buildTemplateVars — TDD agents (subset of coding)
// ===========================================================================

describe('buildTemplateVars TDD agents', () => {
  const tddAgents = ['bug-fixer', 'feature-developer', 'refactoring-dev'];

  for (const agent of tddAgents) {
    it(`should set HAS_TDD=true for "${agent}"`, () => {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(vars.HAS_TDD, true, `${agent} should have TDD`);
    });
  }

  it('should set HAS_TDD=false for integration-engineer (coding but not TDD)', () => {
    const vars = buildTemplateVars('agents', 'integration-engineer', 'agents/integration-engineer.ejs');
    assert.strictEqual(vars.HAS_TDD, false, 'integration-engineer is coding but not TDD');
    assert.strictEqual(vars.IS_CODING_AGENT, true, 'integration-engineer should still be coding agent');
  });

  it('should set HAS_TDD=false for non-coding agents', () => {
    const nonCoding = ['workflow-planner', 'test-runner', 'branch-manager', 'technical-writer', 'performance-engineer'];
    for (const agent of nonCoding) {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(vars.HAS_TDD, false, `${agent} should not have TDD`);
    }
  });
});

// ===========================================================================
// buildTemplateVars — review agents
// ===========================================================================

describe('buildTemplateVars review agents', () => {
  const reviewAgents = ['code-reviewer', 'security-auditor', 'test-runner'];

  for (const agent of reviewAgents) {
    it(`should classify "${agent}" as IS_REVIEW_AGENT=true`, () => {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(vars.IS_REVIEW_AGENT, true, `${agent} should be a review agent`);
    });

    it(`should set AGENT_TYPE="review" for "${agent}"`, () => {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(vars.AGENT_TYPE, 'review');
    });

    it(`should set IS_CODING_AGENT=false for "${agent}"`, () => {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(vars.IS_CODING_AGENT, false);
    });

    it(`should set HAS_TDD=false for "${agent}"`, () => {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(vars.HAS_TDD, false);
    });

    it(`should set HAS_GIT_PROHIBITIONS=false for "${agent}"`, () => {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(vars.HAS_GIT_PROHIBITIONS, false);
    });
  }
});

// ===========================================================================
// buildTemplateVars — planning agents
// ===========================================================================

describe('buildTemplateVars planning agents', () => {
  const planningAgents = [
    'workflow-planner',
    'api-designer',
    'database-architect',
    'cloud-architect',
    'event-architect',
    'observability-architect',
    'frontend-architect',
    'data-engineer',
    'test-strategist',
    'compliance-architect',
  ];

  for (const agent of planningAgents) {
    it(`should classify "${agent}" as IS_PLANNING_AGENT=true`, () => {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(vars.IS_PLANNING_AGENT, true, `${agent} should be a planning agent`);
    });

    it(`should set AGENT_TYPE="planning" for "${agent}"`, () => {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(vars.AGENT_TYPE, 'planning');
    });

    it(`should set IS_CODING_AGENT=false for "${agent}"`, () => {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(vars.IS_CODING_AGENT, false);
    });

    it(`should set HAS_TDD=false for "${agent}"`, () => {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(vars.HAS_TDD, false);
    });

    it(`should set HAS_GIT_PROHIBITIONS=false for "${agent}"`, () => {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(vars.HAS_GIT_PROHIBITIONS, false);
    });
  }
});

// ===========================================================================
// buildTemplateVars — operations agents
// ===========================================================================

describe('buildTemplateVars operations agents', () => {
  const opsAgents = ['branch-manager', 'deployment-engineer', 'incident-responder'];

  for (const agent of opsAgents) {
    it(`should classify "${agent}" as IS_OPERATIONS_AGENT=true`, () => {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(vars.IS_OPERATIONS_AGENT, true, `${agent} should be an operations agent`);
    });

    it(`should set AGENT_TYPE="operations" for "${agent}"`, () => {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(vars.AGENT_TYPE, 'operations');
    });

    it(`should set IS_CODING_AGENT=false for "${agent}"`, () => {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(vars.IS_CODING_AGENT, false);
    });

    it(`should set IS_REVIEW_AGENT=false for "${agent}"`, () => {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(vars.IS_REVIEW_AGENT, false);
    });

    it(`should set HAS_TDD=false for "${agent}"`, () => {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(vars.HAS_TDD, false);
    });
  }
});

// ===========================================================================
// buildTemplateVars — documentation agents
// ===========================================================================

describe('buildTemplateVars documentation agents', () => {
  const docAgents = ['technical-writer', 'claude-agent-architect', 'ai-prompt-engineer'];

  for (const agent of docAgents) {
    it(`should classify "${agent}" as IS_DOCUMENTATION_AGENT=true`, () => {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(vars.IS_DOCUMENTATION_AGENT, true, `${agent} should be a documentation agent`);
    });

    it(`should set AGENT_TYPE="documentation" for "${agent}"`, () => {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(vars.AGENT_TYPE, 'documentation');
    });

    it(`should set IS_CODING_AGENT=false for "${agent}"`, () => {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(vars.IS_CODING_AGENT, false);
    });

    it(`should set HAS_TDD=false for "${agent}"`, () => {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(vars.HAS_TDD, false);
    });
  }
});

// ===========================================================================
// buildTemplateVars — performance agents
// ===========================================================================

describe('buildTemplateVars performance agents', () => {
  it('should classify "performance-engineer" as IS_PERFORMANCE_AGENT=true', () => {
    const vars = buildTemplateVars('agents', 'performance-engineer', 'agents/performance-engineer.ejs');
    assert.strictEqual(vars.IS_PERFORMANCE_AGENT, true);
  });

  it('should set AGENT_TYPE="performance" for performance-engineer', () => {
    const vars = buildTemplateVars('agents', 'performance-engineer', 'agents/performance-engineer.ejs');
    assert.strictEqual(vars.AGENT_TYPE, 'performance');
  });

  it('should set all other category flags to false for performance-engineer', () => {
    const vars = buildTemplateVars('agents', 'performance-engineer', 'agents/performance-engineer.ejs');
    assert.strictEqual(vars.IS_CODING_AGENT, false);
    assert.strictEqual(vars.IS_REVIEW_AGENT, false);
    assert.strictEqual(vars.IS_PLANNING_AGENT, false);
    assert.strictEqual(vars.IS_OPERATIONS_AGENT, false);
    assert.strictEqual(vars.IS_DOCUMENTATION_AGENT, false);
    assert.strictEqual(vars.HAS_TDD, false);
    assert.strictEqual(vars.HAS_GIT_PROHIBITIONS, false);
  });
});

// ===========================================================================
// buildTemplateVars — mutual exclusivity of category flags
// ===========================================================================

describe('buildTemplateVars category mutual exclusivity', () => {
  const allAgents = Object.values(AGENT_TYPES).flat();
  const categoryFlags = [
    'IS_CODING_AGENT',
    'IS_REVIEW_AGENT',
    'IS_PLANNING_AGENT',
    'IS_OPERATIONS_AGENT',
    'IS_DOCUMENTATION_AGENT',
    'IS_PERFORMANCE_AGENT',
  ];

  for (const agent of allAgents) {
    it(`should have exactly one category flag true for "${agent}"`, () => {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      const trueFlags = categoryFlags.filter((flag) => vars[flag] === true);
      assert.strictEqual(
        trueFlags.length,
        1,
        `Agent "${agent}" should have exactly one true category flag, got: ${trueFlags.join(', ') || 'none'}`
      );
    });
  }
});

// ===========================================================================
// buildTemplateVars — unknown/edge-case agent names
// ===========================================================================

describe('buildTemplateVars unknown agent names', () => {
  it('should set AGENT_TYPE to "unknown" for unrecognized agent name', () => {
    const vars = buildTemplateVars('agents', 'nonexistent-agent', 'agents/nonexistent-agent.ejs');
    assert.strictEqual(vars.AGENT_TYPE, 'unknown');
  });

  it('should set all category flags to false for unknown agent', () => {
    const vars = buildTemplateVars('agents', 'nonexistent-agent', 'agents/nonexistent-agent.ejs');
    assert.strictEqual(vars.IS_CODING_AGENT, false);
    assert.strictEqual(vars.IS_REVIEW_AGENT, false);
    assert.strictEqual(vars.IS_PLANNING_AGENT, false);
    assert.strictEqual(vars.IS_OPERATIONS_AGENT, false);
    assert.strictEqual(vars.IS_DOCUMENTATION_AGENT, false);
    assert.strictEqual(vars.IS_PERFORMANCE_AGENT, false);
  });

  it('should set HAS_TDD=false for unknown agent', () => {
    const vars = buildTemplateVars('agents', 'nonexistent-agent', 'agents/nonexistent-agent.ejs');
    assert.strictEqual(vars.HAS_TDD, false);
  });

  it('should set HAS_GIT_PROHIBITIONS=false for unknown agent', () => {
    const vars = buildTemplateVars('agents', 'nonexistent-agent', 'agents/nonexistent-agent.ejs');
    assert.strictEqual(vars.HAS_GIT_PROHIBITIONS, false);
  });

  it('should set gateCapable=false for unknown agent', () => {
    const vars = buildTemplateVars('agents', 'nonexistent-agent', 'agents/nonexistent-agent.ejs');
    assert.strictEqual(vars.gateCapable, false);
  });

  it('should still include AGENT_NAME for unknown agent', () => {
    const vars = buildTemplateVars('agents', 'nonexistent-agent', 'agents/nonexistent-agent.ejs');
    assert.strictEqual(vars.AGENT_NAME, 'nonexistent-agent');
  });
});

// ===========================================================================
// buildTemplateVars — empty filename edge case
// ===========================================================================

describe('buildTemplateVars empty filename', () => {
  it('should handle empty string filename for agents source type', () => {
    const vars = buildTemplateVars('agents', '', 'agents/.ejs');
    assert.strictEqual(vars.FILENAME, '');
    assert.strictEqual(vars.AGENT_NAME, '');
    assert.strictEqual(vars.AGENT_TYPE, 'unknown');
    assert.strictEqual(vars.HAS_TDD, false);
    assert.strictEqual(vars.IS_CODING_AGENT, false);
  });

  it('should handle empty string filename for skills source type', () => {
    const vars = buildTemplateVars('skills', '', 'skills/.ejs');
    assert.strictEqual(vars.FILENAME, '');
    assert.strictEqual(vars.SKILL_NAME, '');
  });
});

// ===========================================================================
// buildTemplateVars — non-agent source types
// ===========================================================================

describe('buildTemplateVars non-agent source types', () => {
  const agentOnlyKeys = [
    'AGENT_NAME',
    'AGENT_TYPE',
    'HAS_TDD',
    'HAS_GIT_PROHIBITIONS',
    'IS_CODING_AGENT',
    'IS_REVIEW_AGENT',
    'IS_PLANNING_AGENT',
    'IS_OPERATIONS_AGENT',
    'IS_DOCUMENTATION_AGENT',
    'IS_PERFORMANCE_AGENT',
    'gateCapable',
  ];

  it('should NOT include agent-specific keys for skills source type', () => {
    const vars = buildTemplateVars('skills', 'my-skill', 'skills/my-skill.ejs');
    for (const key of agentOnlyKeys) {
      assert.strictEqual(
        key in vars,
        false,
        `Skills should not have "${key}" property`
      );
    }
  });

  it('should NOT include agent-specific keys for hooks source type', () => {
    const vars = buildTemplateVars('hooks', 'my-hook', 'hooks/my-hook.ejs');
    for (const key of agentOnlyKeys) {
      assert.strictEqual(
        key in vars,
        false,
        `Hooks should not have "${key}" property`
      );
    }
  });

  it('should NOT include agent-specific keys for commands source type', () => {
    const vars = buildTemplateVars('commands', 'my-command', 'commands/my-command.ejs');
    for (const key of agentOnlyKeys) {
      assert.strictEqual(
        key in vars,
        false,
        `Commands should not have "${key}" property`
      );
    }
  });
});

// ===========================================================================
// buildTemplateVars — skills source type
// ===========================================================================

describe('buildTemplateVars skills', () => {
  it('should set SKILL_NAME to the filename', () => {
    const vars = buildTemplateVars('skills', 'code-formatter', 'skills/code-formatter.ejs');
    assert.strictEqual(vars.SKILL_NAME, 'code-formatter');
  });

  it('should set PARENT_SKILL to null for top-level skills', () => {
    const vars = buildTemplateVars('skills', 'code-formatter', 'skills/code-formatter.ejs');
    assert.strictEqual(vars.PARENT_SKILL, null);
  });

  it('should set PARENT_SKILL for nested skill paths (3+ path segments)', () => {
    const vars = buildTemplateVars('skills', 'takeoff', 'skills/orchestration/takeoff.ejs');
    assert.strictEqual(vars.PARENT_SKILL, 'orchestration');
  });

  it('should set PARENT_SKILL to first subdirectory for deeply nested skills', () => {
    const vars = buildTemplateVars('skills', 'deep', 'skills/spice/sub/deep.ejs');
    assert.strictEqual(vars.PARENT_SKILL, 'spice');
  });

  it('should NOT include hook-specific keys', () => {
    const vars = buildTemplateVars('skills', 'my-skill', 'skills/my-skill.ejs');
    assert.strictEqual('HOOK_NAME' in vars, false, 'Skills should not have HOOK_NAME');
  });
});

// ===========================================================================
// buildTemplateVars — hooks source type
// ===========================================================================

describe('buildTemplateVars hooks', () => {
  it('should set HOOK_NAME to the filename', () => {
    const vars = buildTemplateVars('hooks', 'pre-commit', 'hooks/pre-commit.ejs');
    assert.strictEqual(vars.HOOK_NAME, 'pre-commit');
  });

  it('should NOT include skill-specific keys', () => {
    const vars = buildTemplateVars('hooks', 'pre-commit', 'hooks/pre-commit.ejs');
    assert.strictEqual('SKILL_NAME' in vars, false, 'Hooks should not have SKILL_NAME');
    assert.strictEqual('PARENT_SKILL' in vars, false, 'Hooks should not have PARENT_SKILL');
  });
});

// ===========================================================================
// buildTemplateVars — commands source type
// ===========================================================================

describe('buildTemplateVars commands', () => {
  it('should only include base variables for commands', () => {
    const vars = buildTemplateVars('commands', 'my-command', 'commands/my-command.ejs');
    const keys = Object.keys(vars);
    assert.deepStrictEqual(
      keys.sort(),
      ['BUILD_TIMESTAMP', 'FILENAME', 'RELATIVE_PATH', 'SOURCE_TYPE'].sort(),
      'Commands should only have base variables'
    );
  });
});

// ===========================================================================
// TDD_AGENTS constant validation
// ===========================================================================

describe('TDD_AGENTS constant', () => {
  it('should contain only agents that are in AGENT_TYPES.coding', () => {
    for (const agent of TDD_AGENTS) {
      assert.ok(
        AGENT_TYPES.coding.includes(agent),
        `TDD agent "${agent}" should be a coding agent`
      );
    }
  });

  it('should be a strict subset of coding agents', () => {
    assert.ok(
      TDD_AGENTS.length <= AGENT_TYPES.coding.length,
      'TDD_AGENTS should not exceed coding agents count'
    );
  });

  it('should contain exactly bug-fixer, feature-developer, refactoring-dev', () => {
    assert.deepStrictEqual(
      TDD_AGENTS.slice().sort(),
      ['bug-fixer', 'feature-developer', 'refactoring-dev'].sort()
    );
  });
});

// ===========================================================================
// parseFrontmatter
// ===========================================================================

describe('parseFrontmatter', () => {
  describe('standard frontmatter', () => {
    it('should parse basic frontmatter with key-value pairs', () => {
      const content = '---\ntitle: Hello\ndescription: World\n---\nBody content here';
      const result = parseFrontmatter(content);

      assert.strictEqual(
        result.frontmatter,
        '---\ntitle: Hello\ndescription: World\n---\n',
        'frontmatter should include delimiters and trailing newline'
      );
      assert.strictEqual(
        result.body,
        'Body content here',
        'body should contain everything after the frontmatter block'
      );
    });

    it('should preserve the full frontmatter block including delimiters', () => {
      const content = '---\nkey: value\n---\n';
      const result = parseFrontmatter(content);

      assert.ok(
        result.frontmatter.startsWith('---'),
        'frontmatter should start with opening ---'
      );
      assert.ok(
        result.frontmatter.includes('key: value'),
        'frontmatter should contain the YAML content'
      );
      assert.ok(
        result.frontmatter.endsWith('---\n'),
        'frontmatter should end with closing --- and newline'
      );
    });

    it('should handle YAML with multiple lines', () => {
      const yaml = 'name: test-agent\ndescription: A test fixture\nuser-invocable: true';
      const content = `---\n${yaml}\n---\nBody`;
      const result = parseFrontmatter(content);

      assert.strictEqual(
        result.frontmatter,
        `---\n${yaml}\n---\n`,
        'frontmatter should preserve multi-line YAML'
      );
    });

    it('should handle special characters in YAML values', () => {
      const content = '---\ntitle: "Hello: World"\n---\nBody';
      const result = parseFrontmatter(content);

      assert.ok(
        result.frontmatter.includes('Hello: World'),
        'frontmatter should preserve special characters'
      );
    });
  });

  describe('edge cases', () => {
    it('should return null frontmatter if no frontmatter delimiter found', () => {
      const content = 'Just a body with no frontmatter';
      const result = parseFrontmatter(content);

      assert.strictEqual(
        result.frontmatter,
        null,
        'frontmatter should be null when no --- found'
      );
      assert.strictEqual(
        result.body,
        'Just a body with no frontmatter',
        'body should be the entire content'
      );
    });

    it('should handle content with only frontmatter (no body)', () => {
      const content = '---\ntitle: OnlyFrontmatter\n---\n';
      const result = parseFrontmatter(content);

      assert.strictEqual(
        result.frontmatter,
        content,
        'frontmatter should be the entire content'
      );
      assert.strictEqual(
        result.body,
        '',
        'body should be an empty string'
      );
    });

    it('should handle regex special characters in body', () => {
      const body = 'Match [any] (text) with $special. (regex) {characters}?';
      const content = `---\ntitle: Test\n---\n${body}`;
      const result = parseFrontmatter(content);

      assert.strictEqual(
        result.body,
        body,
        'body with regex special characters should be preserved'
      );
    });

    it('should handle empty body after frontmatter with trailing newline', () => {
      const content = '---\ntitle: Test\n---\n';
      const result = parseFrontmatter(content);

      assert.notStrictEqual(result.frontmatter, null);
      assert.strictEqual(
        result.body,
        '',
        'body should be empty when nothing follows frontmatter'
      );
    });
  });
});

// ===========================================================================
// getAgentType
// ===========================================================================

describe('getAgentType', () => {
  describe('coding agents', () => {
    it('should return "coding" for bug-fixer', () => {
      assert.strictEqual(getAgentType('bug-fixer'), 'coding');
    });

    it('should return "coding" for feature-developer', () => {
      assert.strictEqual(getAgentType('feature-developer'), 'coding');
    });

    it('should return "coding" for refactoring-dev', () => {
      assert.strictEqual(getAgentType('refactoring-dev'), 'coding');
    });

    it('should return "coding" for integration-engineer', () => {
      assert.strictEqual(getAgentType('integration-engineer'), 'coding');
    });
  });

  describe('review agents', () => {
    it('should return "review" for code-reviewer', () => {
      assert.strictEqual(getAgentType('code-reviewer'), 'review');
    });

    it('should return "review" for security-auditor', () => {
      assert.strictEqual(getAgentType('security-auditor'), 'review');
    });

    it('should return "review" for test-runner', () => {
      assert.strictEqual(getAgentType('test-runner'), 'review');
    });

  });

  describe('planning agents', () => {
    it('should return "planning" for workflow-planner', () => {
      assert.strictEqual(getAgentType('workflow-planner'), 'planning');
    });

    it('should return "planning" for api-designer', () => {
      assert.strictEqual(getAgentType('api-designer'), 'planning');
    });

    it('should return "planning" for database-architect', () => {
      assert.strictEqual(getAgentType('database-architect'), 'planning');
    });

    it('should return "planning" for cloud-architect', () => {
      assert.strictEqual(getAgentType('cloud-architect'), 'planning');
    });

    it('should return "planning" for event-architect', () => {
      assert.strictEqual(getAgentType('event-architect'), 'planning');
    });

    it('should return "planning" for observability-architect', () => {
      assert.strictEqual(getAgentType('observability-architect'), 'planning');
    });

    it('should return "planning" for frontend-architect', () => {
      assert.strictEqual(getAgentType('frontend-architect'), 'planning');
    });

    it('should return "planning" for data-engineer', () => {
      assert.strictEqual(getAgentType('data-engineer'), 'planning');
    });

    it('should return "planning" for test-strategist', () => {
      assert.strictEqual(getAgentType('test-strategist'), 'planning');
    });

    it('should return "planning" for compliance-architect', () => {
      assert.strictEqual(getAgentType('compliance-architect'), 'planning');
    });
  });

  describe('operations agents', () => {
    it('should return "operations" for branch-manager', () => {
      assert.strictEqual(getAgentType('branch-manager'), 'operations');
    });

    it('should return "operations" for deployment-engineer', () => {
      assert.strictEqual(getAgentType('deployment-engineer'), 'operations');
    });

    it('should return "operations" for incident-responder', () => {
      assert.strictEqual(getAgentType('incident-responder'), 'operations');
    });
  });

  describe('documentation agents', () => {
    it('should return "documentation" for technical-writer', () => {
      assert.strictEqual(getAgentType('technical-writer'), 'documentation');
    });

    it('should return "documentation" for claude-agent-architect', () => {
      assert.strictEqual(getAgentType('claude-agent-architect'), 'documentation');
    });

    it('should return "documentation" for ai-prompt-engineer', () => {
      assert.strictEqual(getAgentType('ai-prompt-engineer'), 'documentation');
    });
  });

  describe('performance agents', () => {
    it('should return "performance" for performance-engineer', () => {
      assert.strictEqual(getAgentType('performance-engineer'), 'performance');
    });
  });

  describe('unknown and edge cases', () => {
    it('should return "unknown" for an unrecognized agent name', () => {
      assert.strictEqual(getAgentType('nonexistent-agent'), 'unknown');
    });

    it('should return "unknown" for an empty string', () => {
      assert.strictEqual(getAgentType(''), 'unknown');
    });

    it('should return "unknown" for undefined', () => {
      assert.strictEqual(getAgentType(undefined), 'unknown');
    });

    it('should return "unknown" for null', () => {
      assert.strictEqual(getAgentType(null), 'unknown');
    });
  });

  describe('exhaustive coverage', () => {
    it('should map every agent in AGENT_TYPES to the correct type', () => {
      for (const [expectedType, agents] of Object.entries(AGENT_TYPES)) {
        for (const agent of agents) {
          assert.strictEqual(
            getAgentType(agent),
            expectedType,
            `Expected getAgentType("${agent}") to return "${expectedType}"`
          );
        }
      }
    });
  });
});

// ===========================================================================
// formatError
// ===========================================================================

describe('formatError', () => {
  it('should format a generic Error with message and stack', () => {
    const err = new Error('Something went wrong');
    err.stack = 'Error: Something went wrong\n    at Object.<anonymous> (/tmp/test.js:10:5)';
    const result = formatError(err, '/tmp/src/agents/test.ejs');
    assert.strictEqual(result, 'Something went wrong');
  });

  it('should handle an Error with no stack trace', () => {
    const err = new Error('No stack here');
    err.stack = undefined;
    const result = formatError(err, '/tmp/src/agents/test.ejs');
    assert.strictEqual(result, 'No stack here');
  });

  it('should format an error with a line property', () => {
    const err = new Error('Unexpected token');
    err.line = 42;
    const result = formatError(err, '/tmp/src/agents/test.ejs');
    assert.strictEqual(result, 'Line 42: Unexpected token');
  });

  it('should handle a non-Error input (plain string)', () => {
    const result = formatError('plain string error', '/tmp/src/agents/test.ejs');
    assert.strictEqual(result, 'plain string error');
  });

  it('should return the full message for EJS-specific errors', () => {
    const err = new Error(
      'ejs:14\n >> 14| <%- include("missing-partial") %>\n\nCould not find matching close tag'
    );
    const result = formatError(err, '/tmp/src/agents/test.ejs');
    assert.strictEqual(result, err.message);
  });
});

// ===========================================================================
// compileTemplate integration tests
// ===========================================================================

describe('compileTemplate', () => {
  it('should substitute template variables into EJS', () => {
    const template = fs.readFileSync(
      path.join(FIXTURES_DIR, 'simple.ejs'),
      'utf8'
    );
    const vars = { FILENAME: 'my-agent', SOURCE_TYPE: 'agents' };
    const templatePath = path.join(FIXTURES_DIR, 'simple.ejs');

    const result = compileTemplate(template, vars, templatePath);

    assert.ok(
      result.includes('Hello, my-agent!'),
      'Should substitute FILENAME variable'
    );
    assert.ok(
      result.includes('Type is agents.'),
      'Should substitute SOURCE_TYPE variable'
    );
  });

  it('should resolve EJS includes (partial files)', () => {
    config.srcDir = FIXTURES_DIR;

    const template = fs.readFileSync(
      path.join(FIXTURES_DIR, 'with-partial.ejs'),
      'utf8'
    );
    const templatePath = path.join(FIXTURES_DIR, 'with-partial.ejs');

    const result = compileTemplate(template, {}, templatePath);

    assert.ok(
      result.includes('Before partial.'),
      'Content before include should be present'
    );
    assert.ok(
      result.includes('Partial content for testing.'),
      'Partial should be rendered with passed variable'
    );
    assert.ok(
      result.includes('After partial.'),
      'Content after include should be present'
    );
  });

  it('should evaluate conditional logic', () => {
    const template = fs.readFileSync(
      path.join(FIXTURES_DIR, 'conditional.ejs'),
      'utf8'
    );
    const templatePath = path.join(FIXTURES_DIR, 'conditional.ejs');

    const trueBranch = compileTemplate(
      template,
      { IS_CODING_AGENT: true },
      templatePath
    );
    assert.ok(
      trueBranch.includes('This agent writes code.'),
      'True branch should render when IS_CODING_AGENT is true'
    );
    assert.ok(
      !trueBranch.includes('does not write code'),
      'False branch should not render when IS_CODING_AGENT is true'
    );

    const falseBranch = compileTemplate(
      template,
      { IS_CODING_AGENT: false },
      templatePath
    );
    assert.ok(
      falseBranch.includes('This agent does not write code.'),
      'False branch should render when IS_CODING_AGENT is false'
    );
    assert.ok(
      !falseBranch.includes('writes code.'),
      'True branch should not render when IS_CODING_AGENT is false'
    );
  });

  it('should throw on invalid EJS syntax', () => {
    const template = fs.readFileSync(
      path.join(FIXTURES_DIR, 'invalid.ejs'),
      'utf8'
    );
    const templatePath = path.join(FIXTURES_DIR, 'invalid.ejs');

    assert.throws(
      () => compileTemplate(template, {}, templatePath),
      'Should throw when EJS template has syntax errors'
    );
  });

  it('should return an empty string for an empty template', () => {
    const template = fs.readFileSync(
      path.join(FIXTURES_DIR, 'empty.ejs'),
      'utf8'
    );
    const templatePath = path.join(FIXTURES_DIR, 'empty.ejs');

    const result = compileTemplate(template, {}, templatePath);

    assert.strictEqual(result, '', 'Empty template should produce empty output');
  });
});

// ===========================================================================
// processFile integration tests
// ===========================================================================

describe('processFile', () => {
  const TMP_OUTPUT_DIR = path.join(FIXTURES_DIR, '_test_output');

  beforeEach(() => {
    fs.rmSync(TMP_OUTPUT_DIR, { recursive: true, force: true });
  });

  afterEach(() => {
    fs.rmSync(TMP_OUTPUT_DIR, { recursive: true, force: true });
  });

  it('should compile an EJS fixture to an output file end-to-end', () => {
    const sourcePath = path.join(FIXTURES_DIR, 'simple.ejs');
    const outputPath = path.join(TMP_OUTPUT_DIR, 'simple.md');

    const result = processFile(
      sourcePath,
      outputPath,
      'agents',
      'agents/simple.ejs'
    );

    assert.strictEqual(result, true, 'processFile should return true on success');
    assert.ok(
      fs.existsSync(outputPath),
      'Output file should be created on disk'
    );

    const content = fs.readFileSync(outputPath, 'utf8');
    assert.ok(
      content.includes('Hello, simple!'),
      'Output should contain compiled template with FILENAME=simple'
    );
    assert.ok(
      content.includes('Type is agents.'),
      'Output should contain compiled template with SOURCE_TYPE=agents'
    );
  });

  it('should preserve frontmatter in the output', () => {
    const sourcePath = path.join(FIXTURES_DIR, 'with-frontmatter.ejs');
    const outputPath = path.join(TMP_OUTPUT_DIR, 'with-frontmatter.md');

    const result = processFile(
      sourcePath,
      outputPath,
      'agents',
      'agents/with-frontmatter.ejs'
    );

    assert.strictEqual(result, true, 'processFile should return true');

    const content = fs.readFileSync(outputPath, 'utf8');
    assert.ok(
      content.startsWith('---\n'),
      'Output should start with frontmatter delimiter'
    );
    assert.ok(
      content.includes('name: test-agent'),
      'Output should preserve frontmatter fields'
    );
    assert.ok(
      content.includes('description: A test fixture'),
      'Output should preserve frontmatter description'
    );
    assert.ok(
      content.includes('# Agent: with-frontmatter'),
      'Body should be compiled with FILENAME variable'
    );
  });

  it('should inject template variables from buildTemplateVars', () => {
    const sourcePath = path.join(FIXTURES_DIR, 'simple.ejs');
    const outputPath = path.join(TMP_OUTPUT_DIR, 'injected.md');

    processFile(sourcePath, outputPath, 'skills', 'skills/simple.ejs');

    const content = fs.readFileSync(outputPath, 'utf8');
    assert.ok(
      content.includes('Type is skills.'),
      'SOURCE_TYPE variable should be injected based on sourceType argument'
    );
  });

  it('should return false and increment stats.errors for a nonexistent source file', () => {
    const sourcePath = path.join(FIXTURES_DIR, 'does-not-exist.ejs');
    const outputPath = path.join(TMP_OUTPUT_DIR, 'does-not-exist.md');

    const result = processFile(
      sourcePath,
      outputPath,
      'agents',
      'agents/does-not-exist.ejs'
    );

    assert.strictEqual(
      result,
      false,
      'processFile should return false for nonexistent file'
    );
    assert.strictEqual(
      stats.errors,
      1,
      'stats.errors should be incremented to 1'
    );
    assert.strictEqual(
      stats.errorMessages.length,
      1,
      'stats.errorMessages should contain one error'
    );
  });

  it('should increment stats.success on successful compilation', () => {
    const sourcePath = path.join(FIXTURES_DIR, 'simple.ejs');
    const outputPath = path.join(TMP_OUTPUT_DIR, 'stats-success.md');

    assert.strictEqual(stats.success, 0, 'stats.success should start at 0');

    processFile(sourcePath, outputPath, 'agents', 'agents/simple.ejs');

    assert.strictEqual(
      stats.success,
      1,
      'stats.success should be incremented to 1 after successful processing'
    );
  });

  it('should increment stats.errors on compilation failure', () => {
    const sourcePath = path.join(FIXTURES_DIR, 'invalid.ejs');
    const outputPath = path.join(TMP_OUTPUT_DIR, 'invalid.md');

    assert.strictEqual(stats.errors, 0, 'stats.errors should start at 0');

    const result = processFile(
      sourcePath,
      outputPath,
      'agents',
      'agents/invalid.ejs'
    );

    assert.strictEqual(result, false, 'processFile should return false');
    assert.strictEqual(
      stats.errors,
      1,
      'stats.errors should be incremented to 1 after compilation failure'
    );
    assert.ok(
      stats.errorMessages.length > 0,
      'stats.errorMessages should record the error'
    );
  });

  it('should create the output directory if it does not exist', () => {
    const nestedOutputDir = path.join(TMP_OUTPUT_DIR, 'nested', 'deep');
    const sourcePath = path.join(FIXTURES_DIR, 'simple.ejs');
    const outputPath = path.join(nestedOutputDir, 'simple.md');

    assert.ok(
      !fs.existsSync(nestedOutputDir),
      'Nested output directory should not exist before test'
    );

    processFile(sourcePath, outputPath, 'agents', 'agents/simple.ejs');

    assert.ok(
      fs.existsSync(nestedOutputDir),
      'Nested output directory should be created by processFile'
    );
    assert.ok(
      fs.existsSync(outputPath),
      'Output file should exist in the newly created directory'
    );
  });
});

// ===========================================================================
// parseArgs
// ===========================================================================

describe('parseArgs', () => {
  it('should set config.type to agents for --type=agents', () => {
    parseArgs(['--type=agents']);
    assert.strictEqual(config.type, 'agents');
  });

  it('should set config.type to skills for --type=skills', () => {
    parseArgs(['--type=skills']);
    assert.strictEqual(config.type, 'skills');
  });

  it('should set config.type to hooks for --type=hooks', () => {
    parseArgs(['--type=hooks']);
    assert.strictEqual(config.type, 'hooks');
  });

  it('should set config.type to commands for --type=commands', () => {
    parseArgs(['--type=commands']);
    assert.strictEqual(config.type, 'commands');
  });

  it('should call process.exit(1) for an invalid --type value', () => {
    const restore = stubProcessExit();
    try {
      parseArgs(['--type=bogus']);
      assert.fail('Expected process.exit to be called');
    } catch (err) {
      assert.strictEqual(err.name, 'ProcessExitError');
      assert.strictEqual(err.code, 1);
    } finally {
      restore();
    }
  });

  it('should call process.exit(0) for --help', () => {
    const restore = stubProcessExit();
    try {
      parseArgs(['--help']);
      assert.fail('Expected process.exit to be called');
    } catch (err) {
      assert.strictEqual(err.name, 'ProcessExitError');
      assert.strictEqual(err.code, 0);
    } finally {
      restore();
    }
  });

  it('should call process.exit(0) for -h shorthand', () => {
    const restore = stubProcessExit();
    try {
      parseArgs(['-h']);
      assert.fail('Expected process.exit to be called');
    } catch (err) {
      assert.strictEqual(err.name, 'ProcessExitError');
      assert.strictEqual(err.code, 0);
    } finally {
      restore();
    }
  });

  it('should set config.verbose to true for --verbose', () => {
    parseArgs(['--verbose']);
    assert.strictEqual(config.verbose, true);
  });

  it('should set config.verbose to true for -v shorthand', () => {
    parseArgs(['-v']);
    assert.strictEqual(config.verbose, true);
  });

  it('should set config.watch to true for --watch', () => {
    parseArgs(['--watch']);
    assert.strictEqual(config.watch, true);
  });

  it('should set config.watch to true for -w shorthand', () => {
    parseArgs(['-w']);
    assert.strictEqual(config.watch, true);
  });

  it('should handle multiple arguments combined', () => {
    parseArgs(['--verbose', '--type=agents', '--watch']);
    assert.strictEqual(config.verbose, true);
    assert.strictEqual(config.type, 'agents');
    assert.strictEqual(config.watch, true);
  });

  it('should leave config at defaults when no args are provided', () => {
    parseArgs([]);
    assert.strictEqual(config.watch, false);
    assert.strictEqual(config.type, null);
    assert.strictEqual(config.verbose, false);
  });
});

// ===========================================================================
// findFiles — error handling and edge cases
// ===========================================================================

describe('findFiles', () => {
  it('should return an empty array for a nonexistent directory', () => {
    const result = findFiles('/tmp/reaper-test-nonexistent-dir-12345');
    assert.deepStrictEqual(result, []);
  });

  it('should find files in an existing directory', () => {
    const result = findFiles(FIXTURES_DIR);
    assert.ok(Array.isArray(result), 'Should return an array');
    assert.ok(result.length > 0, 'Should find files in fixtures directory');
    assert.ok(
      result.some((f) => f.endsWith('.ejs')),
      'Should find .ejs files in fixtures'
    );
  });

  it('should recursively find files in subdirectories', () => {
    const result = findFiles(FIXTURES_DIR);
    assert.ok(
      result.some((f) => f.includes('partials')),
      'Should find files in partials subdirectory'
    );
  });

  it('should accumulate into a provided array', () => {
    const existing = ['/fake/path/existing.txt'];
    const result = findFiles(FIXTURES_DIR, existing);
    assert.strictEqual(result, existing, 'Should return the same array reference');
    assert.ok(result.length > 1, 'Should have added files to the existing array');
    assert.strictEqual(result[0], '/fake/path/existing.txt', 'Should preserve existing entries');
  });

  it('should handle readdirSync errors gracefully by returning accumulated files', () => {
    // Mock readdirSync to throw a permission error
    const originalReaddirSync = fs.readdirSync;
    fs.readdirSync = () => {
      const err = new Error('EACCES: permission denied');
      err.code = 'EACCES';
      throw err;
    };

    try {
      // existsSync returns true for FIXTURES_DIR, so readdirSync will be called and throw
      const result = findFiles(FIXTURES_DIR);
      // After fix: should return empty array (accumulated so far) instead of throwing
      assert.deepStrictEqual(result, []);
    } finally {
      fs.readdirSync = originalReaddirSync;
    }
  });

  it('should log an error message when readdirSync fails', () => {
    const originalReaddirSync = fs.readdirSync;
    const originalConsoleError = console.error;
    const errors = [];

    fs.readdirSync = () => {
      const err = new Error('EACCES: permission denied');
      err.code = 'EACCES';
      throw err;
    };
    console.error = (...args) => errors.push(args.join(' '));

    try {
      findFiles(FIXTURES_DIR);
      assert.ok(
        errors.some((msg) => msg.includes('EACCES')),
        'Should log the permission error'
      );
    } finally {
      fs.readdirSync = originalReaddirSync;
      console.error = originalConsoleError;
    }
  });
});

// ===========================================================================
// copyFile — error handling (catch block)
// ===========================================================================

describe('copyFile', () => {
  const TMP_OUTPUT_DIR = path.join(FIXTURES_DIR, '_test_copy_output');

  beforeEach(() => {
    fs.rmSync(TMP_OUTPUT_DIR, { recursive: true, force: true });
  });

  afterEach(() => {
    fs.rmSync(TMP_OUTPUT_DIR, { recursive: true, force: true });
  });

  it('should successfully copy a file to the output directory', () => {
    const sourcePath = path.join(FIXTURES_DIR, 'simple.ejs');
    const outputPath = path.join(TMP_OUTPUT_DIR, 'simple.ejs');

    const result = copyFile(sourcePath, outputPath, 'agents/simple.ejs');

    assert.strictEqual(result, true, 'copyFile should return true on success');
    assert.ok(fs.existsSync(outputPath), 'Output file should exist');
    assert.strictEqual(stats.success, 1, 'stats.success should be incremented');
  });

  it('should return false and increment errors when copyFileSync throws', () => {
    // Use a source path that does not exist to force copyFileSync to fail
    const sourcePath = path.join(FIXTURES_DIR, 'absolutely-does-not-exist.xyz');
    const outputPath = path.join(TMP_OUTPUT_DIR, 'output.xyz');

    const result = copyFile(sourcePath, outputPath, 'test/nonexistent.xyz');

    assert.strictEqual(result, false, 'copyFile should return false on error');
    assert.strictEqual(stats.errors, 1, 'stats.errors should be incremented');
    assert.strictEqual(stats.errorMessages.length, 1, 'Should have one error message');
    assert.ok(
      stats.errorMessages[0].includes('nonexistent.xyz'),
      'Error message should include the relative path'
    );
  });

  it('should log the error to console.error when copyFileSync fails', () => {
    const originalConsoleError = console.error;
    const errors = [];
    console.error = (...args) => errors.push(args.join(' '));

    const sourcePath = path.join(FIXTURES_DIR, 'absolutely-does-not-exist.xyz');
    const outputPath = path.join(TMP_OUTPUT_DIR, 'output.xyz');

    try {
      copyFile(sourcePath, outputPath, 'test/nonexistent.xyz');
      assert.ok(
        errors.some((msg) => msg.includes('[ERROR]')),
        'Should log [ERROR] to console.error'
      );
    } finally {
      console.error = originalConsoleError;
    }
  });

  it('should create the output directory if it does not exist', () => {
    const sourcePath = path.join(FIXTURES_DIR, 'simple.ejs');
    const nestedOutput = path.join(TMP_OUTPUT_DIR, 'deep', 'nested', 'simple.ejs');

    const result = copyFile(sourcePath, nestedOutput, 'test/simple.ejs');

    assert.strictEqual(result, true, 'copyFile should succeed');
    assert.ok(fs.existsSync(nestedOutput), 'Nested output file should exist');
  });
});

// ===========================================================================
// buildType — integration tests
// ===========================================================================

describe('buildType', () => {
  const TMP_OUTPUT_DIR = path.join(FIXTURES_DIR, '_test_buildtype_output');
  let originalSrcDir;
  let originalRootDir;

  beforeEach(() => {
    resetBuildState();
    fs.rmSync(TMP_OUTPUT_DIR, { recursive: true, force: true });
    fs.mkdirSync(TMP_OUTPUT_DIR, { recursive: true });

    // Save originals
    originalSrcDir = config.srcDir;
    originalRootDir = config.rootDir;
  });

  afterEach(() => {
    fs.rmSync(TMP_OUTPUT_DIR, { recursive: true, force: true });
    config.srcDir = originalSrcDir;
    config.rootDir = originalRootDir;
  });

  it('should silently skip when source directory does not exist', () => {
    config.srcDir = '/tmp/reaper-test-nonexistent-src-dir';
    config.rootDir = TMP_OUTPUT_DIR;

    // Should not throw
    buildType('agents');

    assert.strictEqual(stats.success, 0, 'No files should be processed');
    assert.strictEqual(stats.errors, 0, 'No errors should occur');
  });

  it('should process EJS files and produce output', () => {
    // Create a minimal src structure
    const srcAgentsDir = path.join(TMP_OUTPUT_DIR, 'src', 'agents');
    const outputAgentsDir = path.join(TMP_OUTPUT_DIR, 'out', 'agents');
    fs.mkdirSync(srcAgentsDir, { recursive: true });
    fs.writeFileSync(
      path.join(srcAgentsDir, 'test-agent.ejs'),
      'Hello <%= FILENAME %>'
    );

    config.srcDir = path.join(TMP_OUTPUT_DIR, 'src');
    config.rootDir = path.join(TMP_OUTPUT_DIR, 'out');

    buildType('agents');

    assert.strictEqual(stats.success, 1, 'One file should be processed successfully');
    assert.ok(
      fs.existsSync(path.join(outputAgentsDir, 'test-agent.md')),
      'Output .md file should be created'
    );
  });

  it('should copy non-EJS files without compiling', () => {
    const srcAgentsDir = path.join(TMP_OUTPUT_DIR, 'src', 'agents');
    const outputAgentsDir = path.join(TMP_OUTPUT_DIR, 'out', 'agents');
    fs.mkdirSync(srcAgentsDir, { recursive: true });
    fs.writeFileSync(
      path.join(srcAgentsDir, 'readme.txt'),
      'Plain text file'
    );

    config.srcDir = path.join(TMP_OUTPUT_DIR, 'src');
    config.rootDir = path.join(TMP_OUTPUT_DIR, 'out');

    buildType('agents');

    assert.strictEqual(stats.success, 1, 'One file should be copied successfully');
    assert.ok(
      fs.existsSync(path.join(outputAgentsDir, 'readme.txt')),
      'Non-EJS file should be copied'
    );
    const content = fs.readFileSync(path.join(outputAgentsDir, 'readme.txt'), 'utf8');
    assert.strictEqual(content, 'Plain text file', 'Content should be identical');
  });
});

// ===========================================================================
// build — integration tests
// ===========================================================================

describe('build', () => {
  const TMP_OUTPUT_DIR = path.join(FIXTURES_DIR, '_test_build_output');
  let originalSrcDir;
  let originalRootDir;

  beforeEach(() => {
    resetBuildState();
    fs.rmSync(TMP_OUTPUT_DIR, { recursive: true, force: true });
    fs.mkdirSync(TMP_OUTPUT_DIR, { recursive: true });

    originalSrcDir = config.srcDir;
    originalRootDir = config.rootDir;
  });

  afterEach(() => {
    fs.rmSync(TMP_OUTPUT_DIR, { recursive: true, force: true });
    config.srcDir = originalSrcDir;
    config.rootDir = originalRootDir;
  });

  it('should reset stats before building', () => {
    stats.success = 99;
    stats.errors = 42;
    stats.errorMessages = ['old error'];

    config.srcDir = '/tmp/reaper-test-nonexistent-src';

    build();

    assert.strictEqual(stats.success, 0, 'stats.success should be reset');
    assert.strictEqual(stats.errors, 0, 'stats.errors should be reset');
    assert.deepStrictEqual(stats.errorMessages, [], 'errorMessages should be reset');
  });

  it('should handle missing src directory gracefully', () => {
    config.srcDir = '/tmp/reaper-test-nonexistent-src-dir';

    // Should not throw
    build();

    assert.strictEqual(stats.success, 0);
    assert.strictEqual(stats.errors, 0);
  });

  it('should build only the specified type when config.type is set', () => {
    const srcAgentsDir = path.join(TMP_OUTPUT_DIR, 'src', 'agents');
    const srcSkillsDir = path.join(TMP_OUTPUT_DIR, 'src', 'skills');
    fs.mkdirSync(srcAgentsDir, { recursive: true });
    fs.mkdirSync(srcSkillsDir, { recursive: true });
    fs.writeFileSync(path.join(srcAgentsDir, 'a.ejs'), 'Agent: <%= FILENAME %>');
    fs.writeFileSync(path.join(srcSkillsDir, 's.ejs'), 'Skill: <%= FILENAME %>');

    config.srcDir = path.join(TMP_OUTPUT_DIR, 'src');
    config.rootDir = path.join(TMP_OUTPUT_DIR, 'out');
    config.type = 'agents';

    build();

    assert.strictEqual(stats.success, 1, 'Only one type should be built');
    assert.ok(
      fs.existsSync(path.join(TMP_OUTPUT_DIR, 'out', 'agents', 'a.md')),
      'Agent file should be built'
    );
    assert.ok(
      !fs.existsSync(path.join(TMP_OUTPUT_DIR, 'out', 'skills', 's.md')),
      'Skills file should NOT be built when config.type=agents'
    );
  });

  it('should build all types when config.type is null', () => {
    const srcAgentsDir = path.join(TMP_OUTPUT_DIR, 'src', 'agents');
    const srcSkillsDir = path.join(TMP_OUTPUT_DIR, 'src', 'skills');
    fs.mkdirSync(srcAgentsDir, { recursive: true });
    fs.mkdirSync(srcSkillsDir, { recursive: true });
    fs.writeFileSync(path.join(srcAgentsDir, 'a.ejs'), 'Agent: <%= FILENAME %>');
    fs.writeFileSync(path.join(srcSkillsDir, 's.ejs'), 'Skill: <%= FILENAME %>');

    config.srcDir = path.join(TMP_OUTPUT_DIR, 'src');
    config.rootDir = path.join(TMP_OUTPUT_DIR, 'out');
    config.type = null;

    build();

    assert.strictEqual(stats.success, 2, 'Both types should be built');
  });

  it('should track errors in stats when template compilation fails', () => {
    const srcAgentsDir = path.join(TMP_OUTPUT_DIR, 'src', 'agents');
    fs.mkdirSync(srcAgentsDir, { recursive: true });
    fs.writeFileSync(path.join(srcAgentsDir, 'bad.ejs'), '<%= UNDEFINED_FUNC() %>');

    config.srcDir = path.join(TMP_OUTPUT_DIR, 'src');
    config.rootDir = path.join(TMP_OUTPUT_DIR, 'out');
    config.type = 'agents';

    build();

    assert.strictEqual(stats.errors, 1, 'Should record the compilation error');
    assert.ok(stats.errorMessages.length > 0, 'Should have error messages');
  });
});

// ===========================================================================
// main — error handling
// ===========================================================================

describe('main', () => {
  let originalSrcDir;
  let originalRootDir;
  let originalArgv;
  const TMP_OUTPUT_DIR = path.join(FIXTURES_DIR, '_test_main_output');

  beforeEach(() => {
    resetBuildState();
    fs.rmSync(TMP_OUTPUT_DIR, { recursive: true, force: true });
    originalSrcDir = config.srcDir;
    originalRootDir = config.rootDir;
    originalArgv = process.argv;
  });

  afterEach(() => {
    fs.rmSync(TMP_OUTPUT_DIR, { recursive: true, force: true });
    config.srcDir = originalSrcDir;
    config.rootDir = originalRootDir;
    process.argv = originalArgv;
  });

  it('should call process.exit(0) when build succeeds with no errors', () => {
    config.srcDir = '/tmp/reaper-test-nonexistent-src';
    process.argv = ['node', 'build.js'];

    const restore = stubProcessExit();
    try {
      main();
      assert.fail('Expected process.exit to be called');
    } catch (err) {
      assert.strictEqual(err.name, 'ProcessExitError');
      assert.strictEqual(err.code, 0, 'Should exit with code 0 on success');
    } finally {
      restore();
    }
  });

  it('should call process.exit(1) when build has errors', () => {
    const srcAgentsDir = path.join(TMP_OUTPUT_DIR, 'src', 'agents');
    fs.mkdirSync(srcAgentsDir, { recursive: true });
    fs.writeFileSync(path.join(srcAgentsDir, 'bad.ejs'), '<%= UNDEFINED_FUNC() %>');

    config.srcDir = path.join(TMP_OUTPUT_DIR, 'src');
    config.rootDir = path.join(TMP_OUTPUT_DIR, 'out');
    process.argv = ['node', 'build.js'];

    const restore = stubProcessExit();
    try {
      main();
      assert.fail('Expected process.exit to be called');
    } catch (err) {
      assert.strictEqual(err.name, 'ProcessExitError');
      assert.strictEqual(err.code, 1, 'Should exit with code 1 on build errors');
    } finally {
      restore();
    }
  });

  it('should handle unexpected errors in build gracefully', () => {
    // Mock fs.existsSync to throw an unexpected error during build
    const originalExistsSync = fs.existsSync;
    let callCount = 0;
    fs.existsSync = (p) => {
      callCount++;
      // Let the first call through (config.srcDir check in build()),
      // then throw on second call
      if (callCount === 1) {
        return true; // src dir "exists"
      }
      throw new Error('Unexpected filesystem failure');
    };

    process.argv = ['node', 'build.js'];

    const restore = stubProcessExit();
    try {
      main();
      assert.fail('Expected an error');
    } catch (err) {
      // After fix: main() should catch and exit(1) instead of propagating
      // Before fix: this will be the raw Error, not a ProcessExitError
      assert.strictEqual(
        err.name,
        'ProcessExitError',
        'main() should catch unexpected errors and call process.exit(1)'
      );
      assert.strictEqual(err.code, 1);
    } finally {
      fs.existsSync = originalExistsSync;
      restore();
    }
  });

  it('should log the unexpected error message before exiting', () => {
    const originalExistsSync = fs.existsSync;
    const originalConsoleError = console.error;
    const errors = [];

    let callCount = 0;
    fs.existsSync = (p) => {
      callCount++;
      if (callCount === 1) return true;
      throw new Error('Catastrophic filesystem failure');
    };
    console.error = (...args) => errors.push(args.join(' '));

    process.argv = ['node', 'build.js'];

    const restore = stubProcessExit();
    try {
      main();
    } catch (_err) {
      // Expected
    } finally {
      fs.existsSync = originalExistsSync;
      console.error = originalConsoleError;
      restore();
    }

    assert.ok(
      errors.some((msg) => msg.includes('Catastrophic filesystem failure')),
      'Should log the unexpected error message'
    );
  });
});

// ===========================================================================
// output-requirements partial: isOrchestrator extraction rules
// ===========================================================================

describe('output-requirements partial: orchestrator extraction rules', () => {
  const SRC_DIR = path.join(__dirname, '..', 'src');
  const PARTIAL_PATH = path.join(SRC_DIR, 'partials', 'output-requirements.ejs');

  /**
   * Renders the output-requirements partial with given parameters by wrapping
   * it in an include call from a synthetic template.
   * @param {Object} params - Parameters to pass to the partial
   * @returns {string} Rendered output
   */
  function renderPartial(params) {
    config.srcDir = SRC_DIR;
    const paramStr = JSON.stringify(params);
    const wrapper = `<%- include('partials/output-requirements', ${paramStr}) %>`;
    return compileTemplate(wrapper, {}, PARTIAL_PATH);
  }

  it('should render orchestrator extraction rules when isOrchestrator is true', () => {
    const result = renderPartial({ isOrchestrator: true });
    assert.ok(
      result.includes('Orchestrator Extraction Rules'),
      'Should contain "Orchestrator Extraction Rules" heading'
    );
  });

  it('should NOT render orchestrator extraction rules when isOrchestrator is false', () => {
    const result = renderPartial({ isOrchestrator: false });
    assert.ok(
      !result.includes('Orchestrator Extraction Rules'),
      'Should not contain extraction rules when isOrchestrator is false'
    );
  });

  it('should NOT render orchestrator extraction rules when isOrchestrator is undefined', () => {
    const result = renderPartial({});
    assert.ok(
      !result.includes('Orchestrator Extraction Rules'),
      'Should not contain extraction rules when isOrchestrator is not provided'
    );
  });

  it('should list coding agent extraction fields: files_modified and work_completed', () => {
    const result = renderPartial({ isOrchestrator: true });
    assert.ok(
      result.includes('files_modified') && result.includes('work_completed'),
      'Coding agents row must list files_modified and work_completed'
    );
  });

  it('should list gate agent extraction fields: all_checks_passed and blocking_issues', () => {
    const result = renderPartial({ isOrchestrator: true });
    assert.ok(
      result.includes('all_checks_passed') && result.includes('blocking_issues'),
      'Gate agents row must list all_checks_passed and blocking_issues'
    );
  });

  it('should instruct to discard all other fields after extraction', () => {
    const result = renderPartial({ isOrchestrator: true });
    assert.ok(
      result.includes('Discard all other fields immediately after extraction'),
      'Must contain explicit discard instruction'
    );
  });

  it('should mention planner uses compressed response directly', () => {
    const result = renderPartial({ isOrchestrator: true });
    assert.ok(
      result.includes('workflow-planner') || result.includes('Planner'),
      'Must reference planner/workflow-planner'
    );
  });

  it('should include parallel gate handling guidance', () => {
    const result = renderPartial({ isOrchestrator: true });
    assert.ok(
      result.includes('blocking_issues') && result.includes('failed'),
      'Must include parallel gate handling with blocking_issues retention on failure'
    );
  });

  it('should preserve existing isReviewAgent=false behavior alongside isOrchestrator', () => {
    const result = renderPartial({ isReviewAgent: false, isOrchestrator: true });
    assert.ok(
      result.includes('You may write code files'),
      'isReviewAgent=false branch should still render'
    );
    assert.ok(
      result.includes('Orchestrator Extraction Rules'),
      'isOrchestrator section should also render'
    );
  });

  it('should preserve existing isReviewAgent=true behavior alongside isOrchestrator', () => {
    const result = renderPartial({ isReviewAgent: true, isOrchestrator: true });
    assert.ok(
      result.includes('Do not write files to disk'),
      'isReviewAgent=true branch should still render'
    );
    assert.ok(
      result.includes('Orchestrator Extraction Rules'),
      'isOrchestrator section should also render'
    );
  });
});
