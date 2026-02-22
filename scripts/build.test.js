const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  parseArgs,
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
  estimateTokenCount,
  printTokenSummary,
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
// buildTemplateVars — common base variables
// ===========================================================================

describe('buildTemplateVars base variables', () => {
  it('should always return FILENAME matching input filename', () => {
    const vars = buildTemplateVars(
      'agents',
      'bug-fixer',
      'agents/bug-fixer.ejs'
    );
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
    const vars = buildTemplateVars(
      'agents',
      'bug-fixer',
      'agents/bug-fixer.ejs'
    );
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
    // Use a classified agent name for the agents type; other types accept any name
    const cases = [
      { st: 'agents', name: 'bug-fixer' },
      { st: 'skills', name: 'test-name' },
      { st: 'hooks', name: 'test-name' },
      { st: 'commands', name: 'test-name' },
    ];
    for (const { st, name } of cases) {
      const vars = buildTemplateVars(st, name, `${st}/${name}.ejs`);
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
  const codingAgents = [
    'bug-fixer',
    'feature-developer',
    'refactoring-dev',
    'integration-engineer',
  ];

  for (const agent of codingAgents) {
    it(`should classify "${agent}" as IS_CODING_AGENT=true`, () => {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(
        vars.IS_CODING_AGENT,
        true,
        `${agent} should be a coding agent`
      );
    });

    it(`should set AGENT_TYPE="coding" for "${agent}"`, () => {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(
        vars.AGENT_TYPE,
        'coding',
        `${agent} AGENT_TYPE should be "coding"`
      );
    });

    it(`should set HAS_GIT_PROHIBITIONS=true for "${agent}"`, () => {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(
        vars.HAS_GIT_PROHIBITIONS,
        true,
        `${agent} should have git prohibitions`
      );
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
    const vars = buildTemplateVars(
      'agents',
      'integration-engineer',
      'agents/integration-engineer.ejs'
    );
    assert.strictEqual(
      vars.HAS_TDD,
      false,
      'integration-engineer is coding but not TDD'
    );
    assert.strictEqual(
      vars.IS_CODING_AGENT,
      true,
      'integration-engineer should still be coding agent'
    );
  });

  it('should set HAS_TDD=false for non-coding agents', () => {
    const nonCoding = [
      'workflow-planner',
      'test-runner',
      'branch-manager',
      'technical-writer',
      'performance-engineer',
    ];
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
  const reviewAgents = ['security-auditor', 'test-runner'];

  for (const agent of reviewAgents) {
    it(`should classify "${agent}" as IS_REVIEW_AGENT=true`, () => {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(
        vars.IS_REVIEW_AGENT,
        true,
        `${agent} should be a review agent`
      );
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
      assert.strictEqual(
        vars.IS_PLANNING_AGENT,
        true,
        `${agent} should be a planning agent`
      );
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
  const opsAgents = [
    'branch-manager',
    'deployment-engineer',
    'incident-responder',
  ];

  for (const agent of opsAgents) {
    it(`should classify "${agent}" as IS_OPERATIONS_AGENT=true`, () => {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(
        vars.IS_OPERATIONS_AGENT,
        true,
        `${agent} should be an operations agent`
      );
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
  const docAgents = [
    'technical-writer',
    'claude-agent-architect',
    'ai-prompt-engineer',
  ];

  for (const agent of docAgents) {
    it(`should classify "${agent}" as IS_DOCUMENTATION_AGENT=true`, () => {
      const vars = buildTemplateVars('agents', agent, `agents/${agent}.ejs`);
      assert.strictEqual(
        vars.IS_DOCUMENTATION_AGENT,
        true,
        `${agent} should be a documentation agent`
      );
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
    const vars = buildTemplateVars(
      'agents',
      'performance-engineer',
      'agents/performance-engineer.ejs'
    );
    assert.strictEqual(vars.IS_PERFORMANCE_AGENT, true);
  });

  it('should set AGENT_TYPE="performance" for performance-engineer', () => {
    const vars = buildTemplateVars(
      'agents',
      'performance-engineer',
      'agents/performance-engineer.ejs'
    );
    assert.strictEqual(vars.AGENT_TYPE, 'performance');
  });

  it('should set all other category flags to false for performance-engineer', () => {
    const vars = buildTemplateVars(
      'agents',
      'performance-engineer',
      'agents/performance-engineer.ejs'
    );
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
  it('should throw when agent filename has no AGENT_TYPES classification', () => {
    assert.throws(
      () =>
        buildTemplateVars(
          'agents',
          'nonexistent-agent',
          'agents/nonexistent-agent.ejs'
        ),
      (err) => {
        assert.ok(
          err.message.includes('nonexistent-agent'),
          'Error should name the unclassified file'
        );
        assert.ok(
          err.message.includes('AGENT_TYPES'),
          'Error should point to AGENT_TYPES as the fix location'
        );
        return true;
      },
      'buildTemplateVars should throw for unclassified agent filenames'
    );
  });

  it('should throw for empty string agent filename', () => {
    assert.throws(
      () => buildTemplateVars('agents', '', 'agents/.ejs'),
      (err) => {
        assert.ok(
          err.message.includes('AGENT_TYPES'),
          'Error should point to AGENT_TYPES as the fix location'
        );
        return true;
      },
      'buildTemplateVars should throw for empty agent filename'
    );
  });

  it('should NOT throw for unclassified names when sourceType is not agents', () => {
    // Non-agent source types are not validated against AGENT_TYPES
    assert.doesNotThrow(() =>
      buildTemplateVars('skills', 'nonexistent-agent', 'skills/nonexistent-agent.ejs')
    );
    assert.doesNotThrow(() =>
      buildTemplateVars('hooks', 'nonexistent-agent', 'hooks/nonexistent-agent.ejs')
    );
    assert.doesNotThrow(() =>
      buildTemplateVars('commands', 'nonexistent-agent', 'commands/nonexistent-agent.ejs')
    );
  });
});

// ===========================================================================
// buildTemplateVars — empty filename edge case
// ===========================================================================

describe('buildTemplateVars empty filename', () => {
  it('should throw for empty string filename for agents source type (no AGENT_TYPES classification)', () => {
    assert.throws(
      () => buildTemplateVars('agents', '', 'agents/.ejs'),
      (err) => {
        assert.ok(
          err.message.includes('AGENT_TYPES'),
          'Error should point to AGENT_TYPES as the fix location'
        );
        return true;
      }
    );
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
    const vars = buildTemplateVars(
      'commands',
      'my-command',
      'commands/my-command.ejs'
    );
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
    const vars = buildTemplateVars(
      'skills',
      'code-formatter',
      'skills/code-formatter.ejs'
    );
    assert.strictEqual(vars.SKILL_NAME, 'code-formatter');
  });

  it('should set PARENT_SKILL to null for top-level skills', () => {
    const vars = buildTemplateVars(
      'skills',
      'code-formatter',
      'skills/code-formatter.ejs'
    );
    assert.strictEqual(vars.PARENT_SKILL, null);
  });

  it('should set PARENT_SKILL for nested skill paths (3+ path segments)', () => {
    const vars = buildTemplateVars(
      'skills',
      'takeoff',
      'skills/orchestration/takeoff.ejs'
    );
    assert.strictEqual(vars.PARENT_SKILL, 'orchestration');
  });

  it('should set PARENT_SKILL to first subdirectory for deeply nested skills', () => {
    const vars = buildTemplateVars(
      'skills',
      'deep',
      'skills/spice/sub/deep.ejs'
    );
    assert.strictEqual(vars.PARENT_SKILL, 'spice');
  });

  it('should NOT include hook-specific keys', () => {
    const vars = buildTemplateVars('skills', 'my-skill', 'skills/my-skill.ejs');
    assert.strictEqual(
      'HOOK_NAME' in vars,
      false,
      'Skills should not have HOOK_NAME'
    );
  });
});

// ===========================================================================
// buildTemplateVars — hooks source type
// ===========================================================================

describe('buildTemplateVars hooks', () => {
  it('should set HOOK_NAME to the filename', () => {
    const vars = buildTemplateVars(
      'hooks',
      'pre-commit',
      'hooks/pre-commit.ejs'
    );
    assert.strictEqual(vars.HOOK_NAME, 'pre-commit');
  });

  it('should NOT include skill-specific keys', () => {
    const vars = buildTemplateVars(
      'hooks',
      'pre-commit',
      'hooks/pre-commit.ejs'
    );
    assert.strictEqual(
      'SKILL_NAME' in vars,
      false,
      'Hooks should not have SKILL_NAME'
    );
    assert.strictEqual(
      'PARENT_SKILL' in vars,
      false,
      'Hooks should not have PARENT_SKILL'
    );
  });
});

// ===========================================================================
// buildTemplateVars — commands source type
// ===========================================================================

describe('buildTemplateVars commands', () => {
  it('should only include base variables for commands', () => {
    const vars = buildTemplateVars(
      'commands',
      'my-command',
      'commands/my-command.ejs'
    );
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
      const content =
        '---\ntitle: Hello\ndescription: World\n---\nBody content here';
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
      const yaml =
        'name: test-agent\ndescription: A test fixture\nuser-invocable: true';
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
      assert.strictEqual(result.body, '', 'body should be an empty string');
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
      assert.strictEqual(
        getAgentType('claude-agent-architect'),
        'documentation'
      );
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
    err.stack =
      'Error: Something went wrong\n    at Object.<anonymous> (/tmp/test.js:10:5)';
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
    const result = formatError(
      'plain string error',
      '/tmp/src/agents/test.ejs'
    );
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

    assert.strictEqual(
      result,
      '',
      'Empty template should produce empty output'
    );
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
      'skills',
      'skills/simple.ejs'
    );

    assert.strictEqual(
      result,
      true,
      'processFile should return true on success'
    );
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
      content.includes('Type is skills.'),
      'Output should contain compiled template with SOURCE_TYPE=skills'
    );
  });

  it('should preserve frontmatter in the output', () => {
    const sourcePath = path.join(FIXTURES_DIR, 'with-frontmatter.ejs');
    const outputPath = path.join(TMP_OUTPUT_DIR, 'with-frontmatter.md');

    const result = processFile(
      sourcePath,
      outputPath,
      'skills',
      'skills/with-frontmatter.ejs'
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

    processFile(sourcePath, outputPath, 'skills', 'skills/simple.ejs');

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
      'skills',
      'skills/invalid.ejs'
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

    processFile(sourcePath, outputPath, 'skills', 'skills/simple.ejs');

    assert.ok(
      fs.existsSync(nestedOutputDir),
      'Nested output directory should be created by processFile'
    );
    assert.ok(
      fs.existsSync(outputPath),
      'Output file should exist in the newly created directory'
    );
  });

  it('should return false and record a clear error when agent filename has no AGENT_TYPES classification', () => {
    // Create a temp EJS file named after an unclassified agent
    const srcDir = path.join(TMP_OUTPUT_DIR, 'src_agents');
    fs.mkdirSync(srcDir, { recursive: true });
    const sourcePath = path.join(srcDir, 'mystery-agent.ejs');
    fs.writeFileSync(sourcePath, 'Hello <%= FILENAME %>');
    const outputPath = path.join(TMP_OUTPUT_DIR, 'mystery-agent.md');

    const result = processFile(
      sourcePath,
      outputPath,
      'agents',
      'agents/mystery-agent.ejs'
    );

    assert.strictEqual(
      result,
      false,
      'processFile should return false for unclassified agent'
    );
    assert.strictEqual(
      stats.errors,
      1,
      'stats.errors should be incremented'
    );
    assert.ok(
      stats.errorMessages.length > 0,
      'stats.errorMessages should contain an entry'
    );
    assert.ok(
      stats.errorMessages[0].includes('mystery-agent'),
      'Error message should name the unclassified file'
    );
    assert.ok(
      stats.errorMessages[0].includes('AGENT_TYPES'),
      'Error message should point to AGENT_TYPES as the fix location'
    );
    assert.ok(
      !fs.existsSync(outputPath),
      'Output file should NOT be written for unclassified agent'
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
    assert.strictEqual(
      result,
      existing,
      'Should return the same array reference'
    );
    assert.ok(
      result.length > 1,
      'Should have added files to the existing array'
    );
    assert.strictEqual(
      result[0],
      '/fake/path/existing.txt',
      'Should preserve existing entries'
    );
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
    assert.strictEqual(
      stats.errorMessages.length,
      1,
      'Should have one error message'
    );
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
    const nestedOutput = path.join(
      TMP_OUTPUT_DIR,
      'deep',
      'nested',
      'simple.ejs'
    );

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
    // Create a minimal src structure using a classified agent name
    const srcAgentsDir = path.join(TMP_OUTPUT_DIR, 'src', 'agents');
    const outputAgentsDir = path.join(TMP_OUTPUT_DIR, 'out', 'agents');
    fs.mkdirSync(srcAgentsDir, { recursive: true });
    fs.writeFileSync(
      path.join(srcAgentsDir, 'bug-fixer.ejs'),
      'Hello <%= FILENAME %>'
    );

    config.srcDir = path.join(TMP_OUTPUT_DIR, 'src');
    config.rootDir = path.join(TMP_OUTPUT_DIR, 'out');

    buildType('agents');

    assert.strictEqual(
      stats.success,
      1,
      'One file should be processed successfully'
    );
    assert.ok(
      fs.existsSync(path.join(outputAgentsDir, 'bug-fixer.md')),
      'Output .md file should be created'
    );
  });

  it('should copy non-EJS files without compiling', () => {
    const srcAgentsDir = path.join(TMP_OUTPUT_DIR, 'src', 'agents');
    const outputAgentsDir = path.join(TMP_OUTPUT_DIR, 'out', 'agents');
    fs.mkdirSync(srcAgentsDir, { recursive: true });
    fs.writeFileSync(path.join(srcAgentsDir, 'readme.txt'), 'Plain text file');

    config.srcDir = path.join(TMP_OUTPUT_DIR, 'src');
    config.rootDir = path.join(TMP_OUTPUT_DIR, 'out');

    buildType('agents');

    assert.strictEqual(
      stats.success,
      1,
      'One file should be copied successfully'
    );
    assert.ok(
      fs.existsSync(path.join(outputAgentsDir, 'readme.txt')),
      'Non-EJS file should be copied'
    );
    const content = fs.readFileSync(
      path.join(outputAgentsDir, 'readme.txt'),
      'utf8'
    );
    assert.strictEqual(
      content,
      'Plain text file',
      'Content should be identical'
    );
  });

  it('should copy nested static .sh files from skills/*/scripts/ subdirectories verbatim', () => {
    // Simulate skills source dir with nested scripts/ containing .sh files,
    // mirroring the real src/skills/worktree-manager/scripts/ layout.
    const srcSkillsDir = path.join(TMP_OUTPUT_DIR, 'src', 'skills');
    const srcScriptsDir = path.join(srcSkillsDir, 'my-skill', 'scripts');
    const outputSkillsDir = path.join(TMP_OUTPUT_DIR, 'out', 'skills');
    const outputScriptsDir = path.join(outputSkillsDir, 'my-skill', 'scripts');

    fs.mkdirSync(srcScriptsDir, { recursive: true });
    fs.writeFileSync(
      path.join(srcScriptsDir, 'helper.sh'),
      '#!/bin/bash\necho "hello from helper"'
    );
    fs.writeFileSync(
      path.join(srcScriptsDir, 'setup.sh'),
      '#!/bin/bash\necho "setup complete"'
    );

    config.srcDir = path.join(TMP_OUTPUT_DIR, 'src');
    config.rootDir = path.join(TMP_OUTPUT_DIR, 'out');

    buildType('skills');

    assert.strictEqual(
      stats.success,
      2,
      'Both .sh files should be copied successfully'
    );

    const helperPath = path.join(outputScriptsDir, 'helper.sh');
    const setupPath = path.join(outputScriptsDir, 'setup.sh');

    assert.ok(
      fs.existsSync(helperPath),
      'helper.sh should exist in output skills/my-skill/scripts/'
    );
    assert.ok(
      fs.existsSync(setupPath),
      'setup.sh should exist in output skills/my-skill/scripts/'
    );
    assert.strictEqual(
      fs.readFileSync(helperPath, 'utf8'),
      '#!/bin/bash\necho "hello from helper"',
      'helper.sh content should be preserved verbatim'
    );
    assert.strictEqual(
      fs.readFileSync(setupPath, 'utf8'),
      '#!/bin/bash\necho "setup complete"',
      'setup.sh content should be preserved verbatim'
    );
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
    assert.deepStrictEqual(
      stats.errorMessages,
      [],
      'errorMessages should be reset'
    );
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
    // Use a classified agent name so AGENT_TYPES validation passes
    fs.writeFileSync(
      path.join(srcAgentsDir, 'bug-fixer.ejs'),
      'Agent: <%= FILENAME %>'
    );
    fs.writeFileSync(
      path.join(srcSkillsDir, 's.ejs'),
      'Skill: <%= FILENAME %>'
    );

    config.srcDir = path.join(TMP_OUTPUT_DIR, 'src');
    config.rootDir = path.join(TMP_OUTPUT_DIR, 'out');
    config.type = 'agents';

    build();

    assert.strictEqual(stats.success, 1, 'Only one type should be built');
    assert.ok(
      fs.existsSync(path.join(TMP_OUTPUT_DIR, 'out', 'agents', 'bug-fixer.md')),
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
    // Use a classified agent name so AGENT_TYPES validation passes
    fs.writeFileSync(
      path.join(srcAgentsDir, 'bug-fixer.ejs'),
      'Agent: <%= FILENAME %>'
    );
    fs.writeFileSync(
      path.join(srcSkillsDir, 's.ejs'),
      'Skill: <%= FILENAME %>'
    );

    config.srcDir = path.join(TMP_OUTPUT_DIR, 'src');
    config.rootDir = path.join(TMP_OUTPUT_DIR, 'out');
    config.type = null;

    build();

    assert.strictEqual(stats.success, 2, 'Both types should be built');
  });

  it('should track errors in stats when template compilation fails', () => {
    // Use a skills source type so AGENT_TYPES validation is not involved;
    // this test focuses on EJS compilation failure tracking
    const srcSkillsDir = path.join(TMP_OUTPUT_DIR, 'src', 'skills');
    fs.mkdirSync(srcSkillsDir, { recursive: true });
    fs.writeFileSync(
      path.join(srcSkillsDir, 'bad.ejs'),
      '<%= UNDEFINED_FUNC() %>'
    );

    config.srcDir = path.join(TMP_OUTPUT_DIR, 'src');
    config.rootDir = path.join(TMP_OUTPUT_DIR, 'out');
    config.type = 'skills';

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
    fs.writeFileSync(
      path.join(srcAgentsDir, 'bad.ejs'),
      '<%= UNDEFINED_FUNC() %>'
    );

    config.srcDir = path.join(TMP_OUTPUT_DIR, 'src');
    config.rootDir = path.join(TMP_OUTPUT_DIR, 'out');
    process.argv = ['node', 'build.js'];

    const restore = stubProcessExit();
    try {
      main();
      assert.fail('Expected process.exit to be called');
    } catch (err) {
      assert.strictEqual(err.name, 'ProcessExitError');
      assert.strictEqual(
        err.code,
        1,
        'Should exit with code 1 on build errors'
      );
    } finally {
      restore();
    }
  });

  it('should handle unexpected errors in build gracefully', () => {
    // Mock fs.existsSync to throw an unexpected error during build
    const originalExistsSync = fs.existsSync;
    let callCount = 0;
    fs.existsSync = (_p) => {
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
    fs.existsSync = (_p) => {
      callCount++;
      if (callCount === 1) {
        return true;
      }
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
  const PARTIAL_PATH = path.join(
    SRC_DIR,
    'partials',
    'output-requirements.ejs'
  );

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
      result.includes('all_checks_passed') &&
        result.includes('blocking_issues'),
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
    const result = renderPartial({
      isReviewAgent: false,
      isOrchestrator: true,
    });
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

// ===========================================================================
// branch-manager.ejs: authority model and strategy naming
// ===========================================================================

describe('branch-manager.ejs: pure executor authority model', () => {
  const BRANCH_MANAGER_SRC = path.join(
    __dirname,
    '..',
    'src',
    'agents',
    'branch-manager.ejs'
  );

  function readBranchManagerSrc() {
    return fs.readFileSync(BRANCH_MANAGER_SRC, 'utf8');
  }

  it('should not contain "Dual Authorization" section', () => {
    const content = readBranchManagerSrc();
    assert.ok(
      !content.includes('Dual Authorization'),
      'branch-manager.ejs must not contain "Dual Authorization" — authorization belongs to the orchestrator'
    );
  });

  it('should not contain "allow_main_merge" references', () => {
    const content = readBranchManagerSrc();
    assert.ok(
      !content.includes('allow_main_merge'),
      'branch-manager.ejs must not reference allow_main_merge flag'
    );
  });

  it('should not contain contradictory "Feature branches merge to develop only" constraint', () => {
    const content = readBranchManagerSrc();
    assert.ok(
      !content.includes('Feature branches merge to develop only'),
      'branch-manager.ejs must not contain "Feature branches merge to develop only" — orchestrator decides merge targets'
    );
  });

  it('should contain pure executor framing', () => {
    const content = readBranchManagerSrc();
    assert.ok(
      content.includes('pure executor') || content.includes('pure-executor'),
      'branch-manager.ejs must declare itself a pure executor — authorization decisions belong to the orchestrator'
    );
  });

  it('should use "very_small_direct" strategy name in strategy table', () => {
    const content = readBranchManagerSrc();
    assert.ok(
      content.includes('very_small_direct'),
      'Strategy table must use "very_small_direct" naming to align with takeoff'
    );
  });

  it('should use "medium_single_branch" strategy name in strategy table', () => {
    const content = readBranchManagerSrc();
    assert.ok(
      content.includes('medium_single_branch'),
      'Strategy table must use "medium_single_branch" naming to align with takeoff'
    );
  });

  it('should use "large_multi_worktree" strategy name in strategy table', () => {
    const content = readBranchManagerSrc();
    assert.ok(
      content.includes('large_multi_worktree'),
      'Strategy table must use "large_multi_worktree" naming to align with takeoff'
    );
  });

  it('should retain Strategy 2 (medium_single_branch) Workflow section', () => {
    const content = readBranchManagerSrc();
    // The workflow section describes single shared worktree approach
    assert.ok(
      content.includes('shared worktree') ||
        content.includes('Shared worktree'),
      'medium_single_branch workflow section must remain intact'
    );
  });

  it('should retain Strategy 3 (large_multi_worktree) Workflow section', () => {
    const content = readBranchManagerSrc();
    // The workflow section describes review branch consolidation
    assert.ok(
      content.includes('review branch') || content.includes('Review branch'),
      'large_multi_worktree workflow section must remain intact'
    );
  });

  it('should not contain "dual_authorization_met" in JSON response format', () => {
    const content = readBranchManagerSrc();
    assert.ok(
      !content.includes('dual_authorization_met'),
      'JSON response format must not include dual_authorization_met field'
    );
  });

  it('should contain precondition check for missing authorization evidence on commit/merge operations', () => {
    const content = readBranchManagerSrc();
    // Must instruct the agent to return an error when the deployment prompt
    // lacks explicit confirmation that quality gates passed and user authorization
    // was obtained — without re-adding Dual Authorization or allow_main_merge.
    const hasMissingEvidence =
      content.includes('missing authorization evidence') ||
      content.includes('Missing authorization evidence');
    const hasErrorResponse =
      content.includes('status: error') ||
      content.includes('"status": "error"');
    assert.ok(
      hasMissingEvidence,
      'branch-manager.ejs must contain a precondition check for missing authorization evidence'
    );
    assert.ok(
      hasErrorResponse,
      'branch-manager.ejs must instruct the agent to return status: error when evidence is missing'
    );
  });
});

// ===========================================================================
// work-unit-cleanup partial: background task cleanup instructions
// ===========================================================================

describe('work-unit-cleanup partial: background task cleanup', () => {
  const SRC_DIR = path.join(__dirname, '..', 'src');
  const PARTIAL_PATH = path.join(SRC_DIR, 'partials', 'work-unit-cleanup.ejs');

  /**
   * Renders the work-unit-cleanup partial (no parameters needed).
   * @returns {string} Rendered output
   */
  function renderPartial() {
    config.srcDir = SRC_DIR;
    const wrapper = `<%- include('partials/work-unit-cleanup') %>`;
    return compileTemplate(wrapper, {}, PARTIAL_PATH);
  }

  it('should render without errors', () => {
    const result = renderPartial();
    assert.ok(result.length > 0, 'Partial should produce non-empty output');
  });

  it('should contain "## Background Task Cleanup" heading', () => {
    const result = renderPartial();
    assert.ok(
      result.includes('## Background Task Cleanup'),
      'Must contain ## Background Task Cleanup heading for hasSection() contract testability'
    );
  });

  it('should instruct enumerating active background tasks', () => {
    const result = renderPartial();
    assert.ok(
      /enumerate|list|identify.*active.*background/i.test(result) ||
        /active.*background.*task/i.test(result),
      'Must instruct enumerating active background tasks'
    );
  });

  it('should instruct calling TaskStop for unneeded tasks', () => {
    const result = renderPartial();
    assert.ok(
      result.includes('TaskStop'),
      'Must reference TaskStop for stopping unneeded background tasks'
    );
  });

  it('should instruct confirming all stops before proceeding', () => {
    const result = renderPartial();
    assert.ok(
      /confirm.*stop.*before.*proceed/i.test(result) ||
        /verify.*stop.*before.*proceed/i.test(result) ||
        /all.*stop.*before.*continu/i.test(result),
      'Must instruct confirming all stops before proceeding to the next work unit'
    );
  });

  it('should include examples of what to stop', () => {
    const result = renderPartial();
    assert.ok(
      result.includes('completed agents') ||
        result.includes('finished test runs'),
      'Must give examples of tasks to stop (completed agents, finished test runs)'
    );
    assert.ok(
      result.includes('builds') || result.includes('explore'),
      'Must give examples of tasks to stop (builds, explore commands)'
    );
  });

  it('should include examples of what to keep running', () => {
    const result = renderPartial();
    assert.ok(
      result.includes('dev server') || result.includes('database'),
      'Must give examples of tasks to keep (dev servers, databases)'
    );
    assert.ok(
      result.includes('file watcher') || result.includes('watch'),
      'Must give examples of tasks to keep (file watchers)'
    );
  });

  it('should include error tolerance for TaskStop failures', () => {
    const result = renderPartial();
    assert.ok(
      /log.*continue/i.test(result) ||
        /fail.*not.*block/i.test(result) ||
        /error.*continue/i.test(result) ||
        /fail.*continue/i.test(result),
      'Must include error tolerance: TaskStop failures should log and continue, not block'
    );
  });
});

// ===========================================================================
// quality-gate-protocol partial: Commit on Pass removal
// ===========================================================================

describe('quality-gate-protocol partial: Commit on Pass section must not exist', () => {
  const SRC_DIR = path.join(__dirname, '..', 'src');
  const PARTIAL_PATH = path.join(
    SRC_DIR,
    'partials',
    'quality-gate-protocol.ejs'
  );

  /**
   * Renders the quality-gate-protocol partial in orchestrator role mode.
   * @returns {string} Rendered output
   */
  function renderOrchestratorPartial() {
    config.srcDir = SRC_DIR;
    const wrapper = `<%- include('partials/quality-gate-protocol', { role: 'orchestrator' }) %>`;
    return compileTemplate(wrapper, {}, PARTIAL_PATH);
  }

  it('should NOT contain a "### Commit on Pass" heading', () => {
    const result = renderOrchestratorPartial();
    assert.ok(
      !result.includes('### Commit on Pass'),
      'quality-gate-protocol must not contain a "### Commit on Pass" section'
    );
  });

  it('should NOT instruct deploying branch-manager after each gate passes', () => {
    const result = renderOrchestratorPartial();
    // The old section said "After each gate passes, deploy reaper:branch-manager"
    assert.ok(
      !/after each gate passes.*deploy.*branch-manager/i.test(result),
      'quality-gate-protocol must not instruct deploying branch-manager after each gate'
    );
  });

  it('should still contain Gate Sequence section', () => {
    const result = renderOrchestratorPartial();
    assert.ok(
      result.includes('### Gate Sequence'),
      'quality-gate-protocol must still contain the Gate Sequence section'
    );
  });
});

// ===========================================================================
// takeoff command: explicit branch-manager commit step in per-unit cycle
// ===========================================================================

describe('takeoff command: per-unit cycle has explicit branch-manager commit step', () => {
  const SRC_DIR = path.join(__dirname, '..', 'src');
  const COMMAND_PATH = path.join(SRC_DIR, 'commands', 'takeoff.ejs');

  /**
   * Renders the full takeoff command template.
   * @returns {string} Rendered output
   */
  function renderTakeoff() {
    config.srcDir = SRC_DIR;
    const source = fs.readFileSync(COMMAND_PATH, 'utf8');
    const { body } = parseFrontmatter(source);
    const vars = buildTemplateVars(
      'commands',
      'takeoff',
      'commands/takeoff.ejs'
    );
    return compileTemplate(body, vars, COMMAND_PATH);
  }

  /**
   * Extracts the Per-Unit Cycle section from the rendered takeoff output.
   * Finds the text between "### Per-Unit Cycle" and the next "###" heading.
   * @param {string} rendered - The full rendered takeoff output
   * @returns {string} The per-unit cycle section text
   */
  function extractPerUnitCycle(rendered) {
    const start = rendered.indexOf('### Per-Unit Cycle');
    if (start === -1) {
      return '';
    }
    // Find the next ### heading after the per-unit cycle section
    const afterStart = rendered.indexOf('###', start + 1);
    return afterStart !== -1
      ? rendered.slice(start, afterStart)
      : rendered.slice(start);
  }

  it('should render without errors', () => {
    const result = renderTakeoff();
    assert.ok(
      result.length > 0,
      'takeoff command should produce non-empty output'
    );
  });

  it('should NOT contain "### Commit on Pass" heading', () => {
    const result = renderTakeoff();
    assert.ok(
      !result.includes('### Commit on Pass'),
      'takeoff must not contain "### Commit on Pass" section (removed from quality-gate-protocol)'
    );
  });

  it('should contain a per-unit cycle step that deploys branch-manager to commit after gates pass', () => {
    const result = renderTakeoff();
    const perUnitSection = extractPerUnitCycle(result);
    assert.ok(
      perUnitSection.length > 0,
      'takeoff must contain a "### Per-Unit Cycle" section'
    );
    assert.ok(
      /branch-manager.*commit/i.test(perUnitSection),
      'Per-Unit Cycle must instruct deploying reaper:branch-manager to commit after gates pass'
    );
  });

  it('should specify commit-only -- do not merge to develop -- in per-unit cycle step', () => {
    const result = renderTakeoff();
    const perUnitSection = extractPerUnitCycle(result);
    assert.ok(
      /commit.only|do not merge.*develop|commit.*not.*merge/i.test(
        perUnitSection
      ),
      'Per-unit commit step must explicitly say commit only, do not merge to develop'
    );
  });

  it('should specify the feature branch as commit target in per-unit cycle step', () => {
    const result = renderTakeoff();
    const perUnitSection = extractPerUnitCycle(result);
    assert.ok(
      /feature branch/i.test(perUnitSection),
      'Per-unit commit step must specify the feature branch as the commit target'
    );
  });

  it('should specify merging feature branch to develop at Completion when user approves', () => {
    const result = renderTakeoff();
    // The Completion / merge response handling section should mention develop as the merge target
    assert.ok(
      /merge.*to develop|feature branch.*develop|develop.*merge/i.test(result),
      'Completion section must specify merging to develop when user approves'
    );
  });
});

// ===========================================================================
// no-commits-policy.ejs: strategy naming and per-unit commit flow
// ===========================================================================

describe('no-commits-policy.ejs: strategy naming uses new identifiers', () => {
  const NO_COMMITS_SRC = path.join(
    __dirname,
    '..',
    'src',
    'partials',
    'no-commits-policy.ejs'
  );

  function readSrc() {
    return fs.readFileSync(NO_COMMITS_SRC, 'utf8');
  }

  it('should use "very_small_direct" strategy name', () => {
    const content = readSrc();
    assert.ok(
      content.includes('very_small_direct'),
      'no-commits-policy.ejs must use "very_small_direct" strategy name — not "Strategy 1"'
    );
  });

  it('should use "medium_single_branch" strategy name', () => {
    const content = readSrc();
    assert.ok(
      content.includes('medium_single_branch'),
      'no-commits-policy.ejs must use "medium_single_branch" strategy name — not "Strategy 2"'
    );
  });

  it('should use "large_multi_worktree" strategy name', () => {
    const content = readSrc();
    assert.ok(
      content.includes('large_multi_worktree'),
      'no-commits-policy.ejs must use "large_multi_worktree" strategy name — not "Strategy 3"'
    );
  });

  it('should not use legacy "Strategy 1" label', () => {
    const content = readSrc();
    assert.ok(
      !content.includes('Strategy 1'),
      'no-commits-policy.ejs must not use legacy "Strategy 1" label — use "very_small_direct" instead'
    );
  });

  it('should not use legacy "Strategy 2" label', () => {
    const content = readSrc();
    assert.ok(
      !content.includes('Strategy 2'),
      'no-commits-policy.ejs must not use legacy "Strategy 2" label — use "medium_single_branch" instead'
    );
  });

  it('should not use legacy "Strategy 3" label', () => {
    const content = readSrc();
    assert.ok(
      !content.includes('Strategy 3'),
      'no-commits-policy.ejs must not use legacy "Strategy 3" label — use "large_multi_worktree" instead'
    );
  });

  it('should describe per-unit commit flow: orchestrator deploys branch-manager after ALL gates pass', () => {
    const content = readSrc();
    assert.ok(
      /after all gates pass|after.*gates.*pass|all.*gates.*pass/i.test(content),
      'no-commits-policy.ejs must describe the per-unit commit flow: branch-manager is deployed after ALL gates pass for a unit'
    );
  });
});

// ===========================================================================
// orchestrator-role-boundary.ejs: 'commit freely' removed from wrong examples
// ===========================================================================

describe('orchestrator-role-boundary.ejs: commit freely example removed', () => {
  const ORCH_ROLE_SRC = path.join(
    __dirname,
    '..',
    'src',
    'partials',
    'orchestrator-role-boundary.ejs'
  );

  function readSrc() {
    return fs.readFileSync(ORCH_ROLE_SRC, 'utf8');
  }

  it('should not contain "commit freely on feature branches"', () => {
    const content = readSrc();
    assert.ok(
      !content.includes('commit freely on feature branches'),
      'orchestrator-role-boundary.ejs must not contain "commit freely on feature branches" — commits are now delegated to branch-manager'
    );
  });

  it('should still contain the Wrong examples section', () => {
    const content = readSrc();
    assert.ok(
      content.includes('Wrong') || content.includes('wrong'),
      'orchestrator-role-boundary.ejs must still contain the Wrong examples section'
    );
  });

  it('should still contain autonomy guidance for iterating through gates', () => {
    const content = readSrc();
    assert.ok(
      content.includes('gate') || content.includes('quality'),
      'orchestrator-role-boundary.ejs must still contain gate iteration guidance'
    );
  });
});

// ===========================================================================
// estimateTokenCount — unit tests for the 4-char-per-token approximation
// ===========================================================================

describe('estimateTokenCount', () => {
  it('should return 0 for an empty string', () => {
    assert.strictEqual(estimateTokenCount(''), 0);
  });

  it('should estimate 1 token for a 4-character string', () => {
    assert.strictEqual(estimateTokenCount('abcd'), 1);
  });

  it('should estimate 1 token for a string shorter than 4 characters (ceiling)', () => {
    // 3 chars / 4 = 0.75, ceil = 1
    assert.strictEqual(estimateTokenCount('abc'), 1);
  });

  it('should estimate 2 tokens for an 8-character string', () => {
    assert.strictEqual(estimateTokenCount('abcdefgh'), 2);
  });

  it('should estimate 250 tokens for a 1000-character string', () => {
    const text = 'a'.repeat(1000);
    assert.strictEqual(estimateTokenCount(text), 250);
  });

  it('should estimate 25 tokens for a 100-character string', () => {
    const text = 'x'.repeat(100);
    assert.strictEqual(estimateTokenCount(text), 25);
  });

  it('should use ceiling division — 5 chars yields 2 tokens', () => {
    // 5 chars / 4 = 1.25, ceil = 2
    assert.strictEqual(estimateTokenCount('abcde'), 2);
  });

  it('should handle a realistic markdown string', () => {
    const text = '# Hello World\n\nThis is a test.';
    // 31 chars / 4 = 7.75, ceil = 8
    const expected = Math.ceil(text.length / 4);
    assert.strictEqual(estimateTokenCount(text), expected);
  });
});

// ===========================================================================
// stats.agentTokenCounts — shape and accumulation
// ===========================================================================

describe('stats.agentTokenCounts', () => {
  it('should exist on the stats object', () => {
    assert.ok(
      'agentTokenCounts' in stats,
      'stats.agentTokenCounts should exist'
    );
  });

  it('should be an object', () => {
    assert.strictEqual(typeof stats.agentTokenCounts, 'object');
    assert.ok(
      stats.agentTokenCounts !== null,
      'agentTokenCounts should not be null'
    );
  });

  it('should be reset to an empty object by build()', () => {
    // Pre-populate so we can assert it gets cleared
    stats.agentTokenCounts = { 'bug-fixer': 999 };

    config.srcDir = '/tmp/reaper-test-nonexistent-src';
    build();

    assert.deepStrictEqual(
      stats.agentTokenCounts,
      {},
      'agentTokenCounts should be reset to empty object at start of build'
    );
  });
});

// ===========================================================================
// processFile — agent token count accumulation
// ===========================================================================

describe('processFile agent token count tracking', () => {
  const TMP_OUTPUT_DIR = path.join(FIXTURES_DIR, '_test_token_output');

  beforeEach(() => {
    resetBuildState();
    stats.agentTokenCounts = {};
    fs.rmSync(TMP_OUTPUT_DIR, { recursive: true, force: true });
  });

  afterEach(() => {
    fs.rmSync(TMP_OUTPUT_DIR, { recursive: true, force: true });
  });

  it('should record a token count for a successfully compiled agent file', () => {
    const srcDir = path.join(TMP_OUTPUT_DIR, 'src_agents');
    fs.mkdirSync(srcDir, { recursive: true });
    const sourcePath = path.join(srcDir, 'bug-fixer.ejs');
    fs.writeFileSync(sourcePath, 'Hello <%= FILENAME %>, this is your prompt.');
    const outputPath = path.join(TMP_OUTPUT_DIR, 'bug-fixer.md');

    processFile(sourcePath, outputPath, 'agents', 'agents/bug-fixer.ejs');

    assert.ok(
      'bug-fixer' in stats.agentTokenCounts,
      'stats.agentTokenCounts should have an entry for bug-fixer'
    );
    assert.strictEqual(
      typeof stats.agentTokenCounts['bug-fixer'],
      'number',
      'Token count should be a number'
    );
    assert.ok(
      stats.agentTokenCounts['bug-fixer'] > 0,
      'Token count should be greater than 0'
    );
  });

  it('should NOT record a token count for a non-agent file (skills source type)', () => {
    const sourcePath = path.join(FIXTURES_DIR, 'simple.ejs');
    const outputPath = path.join(TMP_OUTPUT_DIR, 'simple.md');

    processFile(sourcePath, outputPath, 'skills', 'skills/simple.ejs');

    assert.deepStrictEqual(
      stats.agentTokenCounts,
      {},
      'Token counts should not be tracked for non-agent files'
    );
  });

  it('should NOT record a token count when processFile fails', () => {
    const sourcePath = path.join(FIXTURES_DIR, 'does-not-exist.ejs');
    const outputPath = path.join(TMP_OUTPUT_DIR, 'out.md');

    processFile(sourcePath, outputPath, 'agents', 'agents/bug-fixer.ejs');

    assert.deepStrictEqual(
      stats.agentTokenCounts,
      {},
      'Failed compilations should not produce token count entries'
    );
  });

  it('should record accurate token count matching estimateTokenCount of the output', () => {
    const srcDir = path.join(TMP_OUTPUT_DIR, 'src_agents');
    fs.mkdirSync(srcDir, { recursive: true });
    const agentContent = 'Hello from bug-fixer agent!';
    const sourcePath = path.join(srcDir, 'bug-fixer.ejs');
    fs.writeFileSync(sourcePath, agentContent);
    const outputPath = path.join(TMP_OUTPUT_DIR, 'bug-fixer.md');

    processFile(sourcePath, outputPath, 'agents', 'agents/bug-fixer.ejs');

    const writtenContent = fs.readFileSync(outputPath, 'utf8');
    const expectedTokens = estimateTokenCount(writtenContent);
    assert.strictEqual(
      stats.agentTokenCounts['bug-fixer'],
      expectedTokens,
      'Token count should match estimateTokenCount of the written output'
    );
  });
});

// ===========================================================================
// printTokenSummary — output format and ordering
// ===========================================================================

describe('printTokenSummary', () => {
  let logLines;
  let originalConsoleLog;

  beforeEach(() => {
    resetBuildState();
    stats.agentTokenCounts = {};
    logLines = [];
    originalConsoleLog = console.log;
    console.log = (...args) => logLines.push(args.join(' '));
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    resetBuildState();
    stats.agentTokenCounts = {};
  });

  it('should print nothing when agentTokenCounts is empty', () => {
    stats.agentTokenCounts = {};
    printTokenSummary();
    assert.strictEqual(
      logLines.length,
      0,
      'No output should be produced when there are no agent token counts'
    );
  });

  it('should print a "Prompt Size Summary" heading', () => {
    stats.agentTokenCounts = { 'bug-fixer': 100 };
    printTokenSummary();
    const output = logLines.join('\n');
    assert.ok(
      output.includes('Prompt Size Summary'),
      'Output must contain "Prompt Size Summary" heading'
    );
  });

  it('should include each agent name in the output', () => {
    stats.agentTokenCounts = {
      'bug-fixer': 200,
      'feature-developer': 150,
      'workflow-planner': 300,
    };
    printTokenSummary();
    const output = logLines.join('\n');
    assert.ok(output.includes('bug-fixer'), 'Output must list bug-fixer');
    assert.ok(
      output.includes('feature-developer'),
      'Output must list feature-developer'
    );
    assert.ok(
      output.includes('workflow-planner'),
      'Output must list workflow-planner'
    );
  });

  it('should include token counts in the output', () => {
    stats.agentTokenCounts = { 'bug-fixer': 1234 };
    printTokenSummary();
    const output = logLines.join('\n');
    assert.ok(
      output.includes('1234'),
      'Output must include the token count value'
    );
  });

  it('should list agents sorted descending by token count', () => {
    stats.agentTokenCounts = {
      'feature-developer': 100,
      'workflow-planner': 500,
      'bug-fixer': 300,
    };
    printTokenSummary();
    const output = logLines.join('\n');

    const wfPos = output.indexOf('workflow-planner');
    const bfPos = output.indexOf('bug-fixer');
    const fdPos = output.indexOf('feature-developer');

    assert.ok(wfPos !== -1, 'workflow-planner should appear in output');
    assert.ok(bfPos !== -1, 'bug-fixer should appear in output');
    assert.ok(fdPos !== -1, 'feature-developer should appear in output');

    assert.ok(
      wfPos < bfPos,
      'workflow-planner (500) should appear before bug-fixer (300)'
    );
    assert.ok(
      bfPos < fdPos,
      'bug-fixer (300) should appear before feature-developer (100)'
    );
  });

  it('should handle a single agent entry', () => {
    stats.agentTokenCounts = { 'test-runner': 42 };
    printTokenSummary();
    const output = logLines.join('\n');
    assert.ok(output.includes('test-runner'), 'Single agent should be listed');
    assert.ok(output.includes('42'), 'Single agent token count should appear');
  });
});

// ===========================================================================
// build integration — prompt size summary printed after agents are built
// ===========================================================================

describe('build prompt size summary integration', () => {
  const TMP_OUTPUT_DIR = path.join(FIXTURES_DIR, '_test_build_summary_output');
  let logLines;
  let originalConsoleLog;
  let originalSrcDir;
  let originalRootDir;

  beforeEach(() => {
    resetBuildState();
    stats.agentTokenCounts = {};
    fs.rmSync(TMP_OUTPUT_DIR, { recursive: true, force: true });
    fs.mkdirSync(TMP_OUTPUT_DIR, { recursive: true });

    originalSrcDir = config.srcDir;
    originalRootDir = config.rootDir;

    logLines = [];
    originalConsoleLog = console.log;
    console.log = (...args) => logLines.push(args.join(' '));
  });

  afterEach(() => {
    fs.rmSync(TMP_OUTPUT_DIR, { recursive: true, force: true });
    config.srcDir = originalSrcDir;
    config.rootDir = originalRootDir;
    console.log = originalConsoleLog;
    stats.agentTokenCounts = {};
  });

  it('should print a prompt size summary after building agents', () => {
    const srcAgentsDir = path.join(TMP_OUTPUT_DIR, 'src', 'agents');
    fs.mkdirSync(srcAgentsDir, { recursive: true });
    fs.writeFileSync(
      path.join(srcAgentsDir, 'bug-fixer.ejs'),
      'You are the bug-fixer agent with a long description here.'
    );

    config.srcDir = path.join(TMP_OUTPUT_DIR, 'src');
    config.rootDir = path.join(TMP_OUTPUT_DIR, 'out');
    config.type = 'agents';

    build();

    const output = logLines.join('\n');
    assert.ok(
      output.includes('Prompt Size Summary'),
      'build() must print "Prompt Size Summary" after processing agents'
    );
  });

  it('should include agent name and token count in build summary output', () => {
    const srcAgentsDir = path.join(TMP_OUTPUT_DIR, 'src', 'agents');
    fs.mkdirSync(srcAgentsDir, { recursive: true });
    fs.writeFileSync(
      path.join(srcAgentsDir, 'bug-fixer.ejs'),
      'Agent content here for token estimation.'
    );

    config.srcDir = path.join(TMP_OUTPUT_DIR, 'src');
    config.rootDir = path.join(TMP_OUTPUT_DIR, 'out');
    config.type = 'agents';

    build();

    const output = logLines.join('\n');
    assert.ok(
      output.includes('bug-fixer'),
      'Summary must include the agent name'
    );
    assert.ok(
      /\d+/.test(output.split('Prompt Size Summary')[1] || ''),
      'Summary must include at least one numeric token count after the heading'
    );
  });

  it('should NOT print prompt size summary when no agent files were processed', () => {
    // Build only skills (no agents)
    const srcSkillsDir = path.join(TMP_OUTPUT_DIR, 'src', 'skills');
    fs.mkdirSync(srcSkillsDir, { recursive: true });
    fs.writeFileSync(
      path.join(srcSkillsDir, 'my-skill.ejs'),
      'Skill content here.'
    );

    config.srcDir = path.join(TMP_OUTPUT_DIR, 'src');
    config.rootDir = path.join(TMP_OUTPUT_DIR, 'out');
    config.type = 'skills';

    build();

    const output = logLines.join('\n');
    assert.ok(
      !output.includes('Prompt Size Summary'),
      'build() must NOT print token summary when no agents were processed'
    );
  });

  it('should print summary after all types are built when config.type is null', () => {
    const srcAgentsDir = path.join(TMP_OUTPUT_DIR, 'src', 'agents');
    const srcSkillsDir = path.join(TMP_OUTPUT_DIR, 'src', 'skills');
    fs.mkdirSync(srcAgentsDir, { recursive: true });
    fs.mkdirSync(srcSkillsDir, { recursive: true });
    fs.writeFileSync(
      path.join(srcAgentsDir, 'bug-fixer.ejs'),
      'Bug fixer prompt content.'
    );
    fs.writeFileSync(path.join(srcSkillsDir, 'my-skill.ejs'), 'Skill content.');

    config.srcDir = path.join(TMP_OUTPUT_DIR, 'src');
    config.rootDir = path.join(TMP_OUTPUT_DIR, 'out');
    config.type = null;

    build();

    const output = logLines.join('\n');
    assert.ok(
      output.includes('Prompt Size Summary'),
      'build() must print summary when building all types including agents'
    );
  });

  it('should print the summary AFTER the build summary separator', () => {
    const srcAgentsDir = path.join(TMP_OUTPUT_DIR, 'src', 'agents');
    fs.mkdirSync(srcAgentsDir, { recursive: true });
    fs.writeFileSync(
      path.join(srcAgentsDir, 'bug-fixer.ejs'),
      'Bug fixer agent prompt.'
    );

    config.srcDir = path.join(TMP_OUTPUT_DIR, 'src');
    config.rootDir = path.join(TMP_OUTPUT_DIR, 'out');
    config.type = 'agents';

    build();

    const output = logLines.join('\n');
    const summaryPos = output.indexOf('Prompt Size Summary');
    const buildSummaryPos = output.indexOf('Build Summary:');

    assert.ok(summaryPos !== -1, 'Prompt Size Summary must be present');
    assert.ok(buildSummaryPos !== -1, 'Build Summary must be present');
    assert.ok(
      summaryPos > buildSummaryPos,
      'Prompt Size Summary must appear AFTER Build Summary'
    );
  });
});
