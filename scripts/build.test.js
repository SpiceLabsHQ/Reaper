const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const {
  parseArgs,
  GATE_CAPABLE_AGENTS,
  buildTemplateVars,
  AGENT_TYPES,
  config,
} = require('./build');
const { resetBuildState, stubProcessExit } = require('./test-helpers');

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
