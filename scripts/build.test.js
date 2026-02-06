const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  GATE_CAPABLE_AGENTS,
  buildTemplateVars,
  AGENT_TYPES,
  compileTemplate,
  processFile,
  config,
  stats,
} = require('./build');
const { resetBuildState } = require('./test-helpers');

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

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

// ---------------------------------------------------------------------------
// compileTemplate integration tests
// ---------------------------------------------------------------------------
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
    // Point config.srcDir at fixtures so include('partials/test-partial') resolves
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

// ---------------------------------------------------------------------------
// processFile integration tests
// ---------------------------------------------------------------------------
describe('processFile', () => {
  const TMP_OUTPUT_DIR = path.join(FIXTURES_DIR, '_test_output');

  beforeEach(() => {
    // Ensure clean output directory for each test
    fs.rmSync(TMP_OUTPUT_DIR, { recursive: true, force: true });
  });

  afterEach(() => {
    // Clean up output directory after each test
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
    // Verify the body is also compiled
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
