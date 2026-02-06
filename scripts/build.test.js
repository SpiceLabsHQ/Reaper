const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const {
  GATE_CAPABLE_AGENTS,
  buildTemplateVars,
  getAgentType,
  parseFrontmatter,
  formatError,
  AGENT_TYPES,
} = require('./build');
const { resetBuildState } = require('./test-helpers');

beforeEach(() => {
  resetBuildState();
});

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

describe('buildTemplateVars', () => {
  it('should have a parseFrontmatter function', () => {
    assert.ok(
      typeof parseFrontmatter === 'function',
      'buildTemplateVars should export parseFrontmatter'
    );
  });
});

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

    it('should return "review" for validation-runner', () => {
      assert.strictEqual(getAgentType('validation-runner'), 'review');
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
