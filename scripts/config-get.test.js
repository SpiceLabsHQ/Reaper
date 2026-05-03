'use strict';

/**
 * @fileoverview Tests for scripts/config-get.sh and config-get.mjs.
 *
 * Resolution chain:
 *   1. user .reaper.yml in cwd
 *   2. bundled defaults.yml (alongside the script)
 *   3. --fallback-script <path>  (executed if both above miss)
 *   4. --default <value>          (caller-supplied fallback)
 *   5. stderr "Run /reaper:init to configure missing key 'X'" + exit 1
 *
 * Test seam: REAPER_DEFAULTS_PATH overrides the bundled defaults.yml lookup
 * so tests don't depend on the real repo-root defaults.yml.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const SCRIPT = path.resolve(__dirname, 'config-get.sh');

/**
 * Run config-get.sh from the given cwd with the given args and env overrides.
 *
 * @param {object} opts
 * @param {string[]} opts.args
 * @param {string} opts.cwd
 * @param {object} [opts.env]
 * @returns {{status:number, stdout:string, stderr:string}}
 */
function run({ args, cwd, env = {} }) {
  const result = spawnSync(SCRIPT, args, {
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

describe('config-get.sh', () => {
  let tmpUserDir;
  let tmpDefaultsDir;
  let userConfigPath;
  let defaultsPath;

  before(() => {
    tmpUserDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reaper-config-user-'));
    tmpDefaultsDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'reaper-config-defaults-')
    );

    userConfigPath = path.join(tmpUserDir, '.reaper.yml');
    defaultsPath = path.join(tmpDefaultsDir, 'defaults.yml');

    fs.writeFileSync(
      userConfigPath,
      [
        'version: 1',
        'test:',
        '  cmd: npm test',
        '  cmd_e2e: npm run test:e2e',
        'lint:',
        '  cmd: npm run lint',
        'tracker:',
        '  system: github',
        '  default_labels:',
        '    - reaper',
        '    - automated',
        '    - "feature flag"',
        '',
      ].join('\n')
    );

    fs.writeFileSync(
      defaultsPath,
      [
        'version: 1',
        'test:',
        '  cmd: null',
        'lint:',
        '  cmd: null',
        'coverage:',
        '  threshold: 80',
        'tracker:',
        '  system: null',
        '  default_labels: []',
        'worktrees:',
        '  base_path: .claude/worktrees',
        'git:',
        '  default_base_branch: develop',
        'workflow:',
        '  require_security_gate: true',
        '',
      ].join('\n')
    );
  });

  after(() => {
    fs.rmSync(tmpUserDir, { recursive: true, force: true });
    fs.rmSync(tmpDefaultsDir, { recursive: true, force: true });
  });

  describe('value resolution', () => {
    it('reads a top-level value from the user .reaper.yml', () => {
      const r = run({
        args: ['version'],
        cwd: tmpUserDir,
        env: { REAPER_DEFAULTS_PATH: defaultsPath },
      });
      assert.equal(r.status, 0, r.stderr);
      assert.equal(r.stdout.trim(), '1');
    });

    it('reads a dot-path value from the user .reaper.yml', () => {
      const r = run({
        args: ['test.cmd'],
        cwd: tmpUserDir,
        env: { REAPER_DEFAULTS_PATH: defaultsPath },
      });
      assert.equal(r.status, 0, r.stderr);
      assert.equal(r.stdout.trim(), 'npm test');
    });

    it('reads a nested dot-path with multiple segments', () => {
      const r = run({
        args: ['test.cmd_e2e'],
        cwd: tmpUserDir,
        env: { REAPER_DEFAULTS_PATH: defaultsPath },
      });
      assert.equal(r.status, 0, r.stderr);
      assert.equal(r.stdout.trim(), 'npm run test:e2e');
    });

    it('falls back to defaults.yml when the user file is missing the key', () => {
      const r = run({
        args: ['coverage.threshold'],
        cwd: tmpUserDir,
        env: { REAPER_DEFAULTS_PATH: defaultsPath },
      });
      assert.equal(r.status, 0, r.stderr);
      assert.equal(r.stdout.trim(), '80');
    });

    it('falls back to defaults.yml when no user .reaper.yml exists', () => {
      const emptyDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'reaper-config-empty-')
      );
      try {
        const r = run({
          args: ['git.default_base_branch'],
          cwd: emptyDir,
          env: { REAPER_DEFAULTS_PATH: defaultsPath },
        });
        assert.equal(r.status, 0, r.stderr);
        assert.equal(r.stdout.trim(), 'develop');
      } finally {
        fs.rmSync(emptyDir, { recursive: true, force: true });
      }
    });

    it('treats null in defaults.yml as not-set and continues falling through', () => {
      // tracker.repo is not set in user config and not even present in defaults
      const r = run({
        args: ['tracker.repo', '--default', 'fallback-value'],
        cwd: tmpUserDir,
        env: { REAPER_DEFAULTS_PATH: defaultsPath },
      });
      assert.equal(r.status, 0, r.stderr);
      assert.equal(r.stdout.trim(), 'fallback-value');
    });
  });

  describe('arrays', () => {
    it('prints array values space-separated by default', () => {
      const r = run({
        args: ['tracker.default_labels'],
        cwd: tmpUserDir,
        env: { REAPER_DEFAULTS_PATH: defaultsPath },
      });
      assert.equal(r.status, 0, r.stderr);
      assert.equal(r.stdout.trim(), 'reaper automated feature flag');
    });

    it('prints arrays as JSON with --format json', () => {
      const r = run({
        args: ['tracker.default_labels', '--format', 'json'],
        cwd: tmpUserDir,
        env: { REAPER_DEFAULTS_PATH: defaultsPath },
      });
      assert.equal(r.status, 0, r.stderr);
      assert.deepEqual(JSON.parse(r.stdout), [
        'reaper',
        'automated',
        'feature flag',
      ]);
    });
  });

  describe('--default flag', () => {
    it('uses --default value when key is missing everywhere', () => {
      const r = run({
        args: ['workflow.require_tdd', '--default', 'true'],
        cwd: tmpUserDir,
        env: { REAPER_DEFAULTS_PATH: defaultsPath },
      });
      // workflow.require_tdd is not set in either user or defaults fixture
      assert.equal(r.status, 0, r.stderr);
      assert.equal(r.stdout.trim(), 'true');
    });
  });

  describe('--fallback-script', () => {
    it('runs the fallback script when key is missing', () => {
      const fallback = path.join(tmpUserDir, 'fallback.sh');
      fs.writeFileSync(
        fallback,
        '#!/usr/bin/env bash\necho "from-fallback-script"\n'
      );
      fs.chmodSync(fallback, 0o755);

      const r = run({
        args: ['workflow.require_tdd', '--fallback-script', fallback],
        cwd: tmpUserDir,
        env: { REAPER_DEFAULTS_PATH: defaultsPath },
      });
      assert.equal(r.status, 0, r.stderr);
      assert.equal(r.stdout.trim(), 'from-fallback-script');
    });

    it('--default takes precedence over --fallback-script', () => {
      const fallback = path.join(tmpUserDir, 'fallback2.sh');
      fs.writeFileSync(
        fallback,
        '#!/usr/bin/env bash\necho "from-fallback-script"\n'
      );
      fs.chmodSync(fallback, 0o755);

      const r = run({
        args: [
          'workflow.require_tdd',
          '--default',
          'literal-default',
          '--fallback-script',
          fallback,
        ],
        cwd: tmpUserDir,
        env: { REAPER_DEFAULTS_PATH: defaultsPath },
      });
      assert.equal(r.status, 0, r.stderr);
      assert.equal(r.stdout.trim(), 'literal-default');
    });
  });

  describe('missing key (hard error)', () => {
    it('prints init guidance to stderr and exits 1 when key is unresolved', () => {
      const r = run({
        args: ['workflow.require_tdd'],
        cwd: tmpUserDir,
        env: { REAPER_DEFAULTS_PATH: defaultsPath },
      });
      assert.equal(r.status, 1);
      assert.match(r.stderr, /\/reaper:init/);
      assert.match(r.stderr, /workflow\.require_tdd/);
    });

    it('exits 1 with init guidance for a top-level missing key with no user file', () => {
      const emptyDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'reaper-config-empty-2-')
      );
      try {
        const r = run({
          args: ['nonexistent.key'],
          cwd: emptyDir,
          env: { REAPER_DEFAULTS_PATH: defaultsPath },
        });
        assert.equal(r.status, 1);
        assert.match(r.stderr, /\/reaper:init/);
      } finally {
        fs.rmSync(emptyDir, { recursive: true, force: true });
      }
    });
  });
});
