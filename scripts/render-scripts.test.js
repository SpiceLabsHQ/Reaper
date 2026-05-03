'use strict';

/**
 * @fileoverview Tests for render-*.sh scripts under
 * src/skills/code-review/scripts/. These scripts implement the conditional
 * prompt-section convention documented in docs/skills.md: each script reads
 * a workflow.* toggle from .reaper.yml via scripts/config-get.sh and emits
 * either the section's content or nothing.
 *
 * Each render script is exercised with three scenarios:
 *   1. Toggle ON  -> expected section text present in stdout
 *   2. Toggle OFF -> empty stdout, exit 0
 *   3. Toggle malformed/unreadable -> safe-default behavior + stderr warning
 *
 * Test harness:
 *   - mkdtempSync per scenario for an isolated cwd
 *   - the project's real config-get.sh (it walks up from SCRIPT_DIR, so the
 *     render script picks up the repo's scripts/config-get.sh regardless of
 *     where we cwd to). REAPER_DEFAULTS_PATH points at a fixture defaults.yml
 *     so the test does not depend on the repo-root defaults.yml.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const REPO_ROOT = path.resolve(__dirname, '..');
const SECURITY_SCRIPT = path.join(
  REPO_ROOT,
  'src',
  'skills',
  'code-review',
  'scripts',
  'render-security-gate-section.sh'
);
const TDD_SCRIPT = path.join(
  REPO_ROOT,
  'src',
  'skills',
  'code-review',
  'scripts',
  'render-tdd-mandate.sh'
);

/**
 * Run a render script from the given cwd with extra env.
 *
 * @param {string} script - absolute path to render script
 * @param {object} opts
 * @param {string} opts.cwd
 * @param {object} [opts.env]
 * @returns {{status:number, stdout:string, stderr:string}}
 */
function run(script, { cwd, env = {} }) {
  const result = spawnSync(script, [], {
    encoding: 'utf8',
    cwd,
    env: { ...process.env, ...env },
  });
  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

/**
 * Write a .reaper.yml in `dir` with the given workflow.<key> value.
 *
 * @param {string} dir
 * @param {string} key
 * @param {string} value - raw YAML scalar (e.g. "true", "false", '"banana"')
 */
function writeReaperYml(dir, key, value) {
  fs.writeFileSync(
    path.join(dir, '.reaper.yml'),
    ['version: 1', 'workflow:', `  ${key}: ${value}`, ''].join('\n')
  );
}

/**
 * Write a fixture defaults.yml that mirrors the repo's real defaults for
 * the workflow.* keys we exercise. The render scripts call config-get.sh,
 * which honors REAPER_DEFAULTS_PATH for tests.
 */
function writeDefaultsYml(dir) {
  const p = path.join(dir, 'defaults.yml');
  fs.writeFileSync(
    p,
    [
      'version: 1',
      'workflow:',
      '  require_security_gate: true',
      '  require_tdd: true',
      '',
    ].join('\n')
  );
  return p;
}

describe('render-security-gate-section.sh', () => {
  let scratch;
  let defaultsPath;

  before(() => {
    scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'reaper-render-sec-'));
    defaultsPath = writeDefaultsYml(scratch);
  });

  after(() => {
    fs.rmSync(scratch, { recursive: true, force: true });
  });

  it('toggle ON: emits the security-gate section', () => {
    const dir = fs.mkdtempSync(path.join(scratch, 'on-'));
    writeReaperYml(dir, 'require_security_gate', 'true');
    const r = run(SECURITY_SCRIPT, {
      cwd: dir,
      env: { REAPER_DEFAULTS_PATH: defaultsPath },
    });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /## Security Gate Enforcement/);
    assert.match(r.stdout, /security-auditor/);
    // Editorial "To disable this section project-wide" footer must NOT
    // appear in the rendered prompt -- documentation-register guidance
    // belongs in docs, not in clinical reviewer prose.
    assert.doesNotMatch(r.stdout, /To disable this section/);
    assert.equal(r.stderr, '');
  });

  it('toggle OFF: emits nothing on stdout and exits 0', () => {
    const dir = fs.mkdtempSync(path.join(scratch, 'off-'));
    writeReaperYml(dir, 'require_security_gate', 'false');
    const r = run(SECURITY_SCRIPT, {
      cwd: dir,
      env: { REAPER_DEFAULTS_PATH: defaultsPath },
    });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, '');
  });

  it('default (no .reaper.yml): defaults.yml says true -> emits the section', () => {
    const dir = fs.mkdtempSync(path.join(scratch, 'default-'));
    // No .reaper.yml in dir; defaults.yml provides require_security_gate: true.
    const r = run(SECURITY_SCRIPT, {
      cwd: dir,
      env: { REAPER_DEFAULTS_PATH: defaultsPath },
    });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /## Security Gate Enforcement/);
  });

  it('malformed value (unparsable scalar): warns on stderr and emits the section', () => {
    const dir = fs.mkdtempSync(path.join(scratch, 'bad-'));
    writeReaperYml(dir, 'require_security_gate', '"banana"');
    const r = run(SECURITY_SCRIPT, {
      cwd: dir,
      env: { REAPER_DEFAULTS_PATH: defaultsPath },
    });
    assert.equal(r.status, 0, r.stderr);
    // safe-default: section IS rendered
    assert.match(r.stdout, /## Security Gate Enforcement/);
    // stderr surfaces the warning so the build log isn't silent
    assert.match(r.stderr, /WARN: workflow\.require_security_gate/);
  });

  it('config-get unreadable (defaults points at non-existent file): warns and emits', () => {
    const dir = fs.mkdtempSync(path.join(scratch, 'nodefault-'));
    // Force config-get.sh to find no key anywhere in the chain.
    const r = run(SECURITY_SCRIPT, {
      cwd: dir,
      env: {
        REAPER_DEFAULTS_PATH: path.join(scratch, 'does-not-exist.yml'),
      },
    });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /## Security Gate Enforcement/);
    assert.match(r.stderr, /WARN: workflow\.require_security_gate/);
  });
});

describe('render-tdd-mandate.sh', () => {
  let scratch;
  let defaultsPath;

  before(() => {
    scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'reaper-render-tdd-'));
    defaultsPath = writeDefaultsYml(scratch);
  });

  after(() => {
    fs.rmSync(scratch, { recursive: true, force: true });
  });

  it('toggle ON: emits the TDD section with cycle, philosophy, and grounding', () => {
    const dir = fs.mkdtempSync(path.join(scratch, 'on-'));
    writeReaperYml(dir, 'require_tdd', 'true');
    const r = run(TDD_SCRIPT, {
      cwd: dir,
      env: { REAPER_DEFAULTS_PATH: defaultsPath },
    });
    assert.equal(r.status, 0, r.stderr);
    // Cycle subsection -- the ### heading is owned by the script (the .ejs
    // intentionally has no TDD heading around the renderScript invocation).
    assert.match(r.stdout, /### 2\. TDD Cycle \(Red-Green-Blue\)/);
    assert.match(r.stdout, /\bRED\b/);
    assert.match(r.stdout, /\bGREEN\b/);
    assert.match(r.stdout, /\bBLUE\b/);
    // Testing Philosophy bullets restored from the original
    // tdd-testing-protocol partial.
    assert.match(r.stdout, /### Testing Philosophy/);
    assert.match(r.stdout, /Favor integration tests over unit tests/);
    assert.match(r.stdout, /Test public interfaces, not private internals/);
    // Targeted-execution + avoid-full-suite warning examples.
    assert.match(r.stdout, /### Targeted Testing Scope/);
    assert.match(r.stdout, /Avoid full suite runs/);
    // test-runner grounding statement that prevents role drift.
    assert.match(r.stdout, /test-runner agent handles full suite validation/);
    // Editorial "Disable for this project" footer must NOT be in the
    // rendered prompt -- that guidance belongs in docs, not in agent prose.
    assert.doesNotMatch(r.stdout, /Disable for this project/);
    assert.equal(r.stderr, '');
  });

  it('toggle OFF: emits nothing on stdout and exits 0', () => {
    const dir = fs.mkdtempSync(path.join(scratch, 'off-'));
    writeReaperYml(dir, 'require_tdd', 'false');
    const r = run(TDD_SCRIPT, {
      cwd: dir,
      env: { REAPER_DEFAULTS_PATH: defaultsPath },
    });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, '');
  });

  it('default (no .reaper.yml): defaults.yml says true -> emits the section', () => {
    const dir = fs.mkdtempSync(path.join(scratch, 'default-'));
    const r = run(TDD_SCRIPT, {
      cwd: dir,
      env: { REAPER_DEFAULTS_PATH: defaultsPath },
    });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /### 2\. TDD Cycle \(Red-Green-Blue\)/);
  });

  it('malformed value: warns on stderr and emits the section', () => {
    const dir = fs.mkdtempSync(path.join(scratch, 'bad-'));
    writeReaperYml(dir, 'require_tdd', '"sometimes"');
    const r = run(TDD_SCRIPT, {
      cwd: dir,
      env: { REAPER_DEFAULTS_PATH: defaultsPath },
    });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /### 2\. TDD Cycle \(Red-Green-Blue\)/);
    assert.match(r.stderr, /WARN: workflow\.require_tdd/);
  });

  it('config-get unreadable: warns and emits the section', () => {
    const dir = fs.mkdtempSync(path.join(scratch, 'nodefault-'));
    const r = run(TDD_SCRIPT, {
      cwd: dir,
      env: {
        REAPER_DEFAULTS_PATH: path.join(scratch, 'does-not-exist.yml'),
      },
    });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /### 2\. TDD Cycle \(Red-Green-Blue\)/);
    assert.match(r.stderr, /WARN: workflow\.require_tdd/);
  });
});

describe('render-scripts: built-artifact location parity', () => {
  // The build copies render-*.sh from src/skills/code-review/scripts/ to
  // skills/code-review/scripts/. Both copies must work because templates
  // can be invoked from either tree. This test runs the BUILT script if it
  // exists. It will skip on a clean checkout that has not yet been built.

  const builtSecurity = path.join(
    REPO_ROOT,
    'skills',
    'code-review',
    'scripts',
    'render-security-gate-section.sh'
  );
  const builtTdd = path.join(
    REPO_ROOT,
    'skills',
    'code-review',
    'scripts',
    'render-tdd-mandate.sh'
  );

  it('built render-security-gate-section.sh emits the section when enabled', (t) => {
    if (!fs.existsSync(builtSecurity)) {
      t.skip('build artifact not present; run `npm run build` first');
      return;
    }
    const dir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'reaper-render-built-sec-')
    );
    try {
      writeReaperYml(dir, 'require_security_gate', 'true');
      const defaultsPath = writeDefaultsYml(dir);
      const r = run(builtSecurity, {
        cwd: dir,
        env: { REAPER_DEFAULTS_PATH: defaultsPath },
      });
      assert.equal(r.status, 0, r.stderr);
      assert.match(r.stdout, /## Security Gate Enforcement/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('built render-tdd-mandate.sh emits the section when enabled', (t) => {
    if (!fs.existsSync(builtTdd)) {
      t.skip('build artifact not present; run `npm run build` first');
      return;
    }
    const dir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'reaper-render-built-tdd-')
    );
    try {
      writeReaperYml(dir, 'require_tdd', 'true');
      const defaultsPath = writeDefaultsYml(dir);
      const r = run(builtTdd, {
        cwd: dir,
        env: { REAPER_DEFAULTS_PATH: defaultsPath },
      });
      assert.equal(r.status, 0, r.stderr);
      assert.match(r.stdout, /### 2\. TDD Cycle \(Red-Green-Blue\)/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
