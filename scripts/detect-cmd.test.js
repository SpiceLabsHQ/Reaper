'use strict';

/**
 * @fileoverview Tests for scripts/detect-test-cmd.sh and scripts/detect-lint-cmd.sh
 *
 * Both scripts inspect the current working directory for ecosystem markers
 * (package.json, pyproject.toml, go.mod, Cargo.toml, Makefile) and emit a
 * best-guess command on stdout. No marker → empty stdout, exit 1.
 *
 * Each test runs the script with `cwd` set to a fixture directory under
 * scripts/fixtures/detect/<ecosystem>/ so the scripts probe a known layout.
 *
 * Per-test isolated fixtures use mkdtempSync when we need to mutate state
 * (e.g., a package.json without a test script).
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const TEST_SCRIPT = path.resolve(__dirname, 'detect-test-cmd.sh');
const LINT_SCRIPT = path.resolve(__dirname, 'detect-lint-cmd.sh');
const FIXTURES_DIR = path.resolve(__dirname, 'fixtures/detect');

/**
 * Run a detect script with the given cwd.
 *
 * @param {string} script - Absolute path to the .sh file
 * @param {string} cwd    - Directory to run the script from
 * @returns {{stdout: string, stderr: string, status: number}}
 */
function runDetect(script, cwd) {
  const result = spawnSync(script, [], {
    encoding: 'utf8',
    cwd,
  });
  return {
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
    status: result.status,
  };
}

/**
 * Create a temporary directory and return its path. Caller is responsible
 * for cleanup.
 */
function mkTmp(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

describe('detect-test-cmd.sh', () => {
  describe('ecosystem detection', () => {
    it('detects Node test command from package.json scripts.test', () => {
      const res = runDetect(TEST_SCRIPT, path.join(FIXTURES_DIR, 'node'));
      assert.equal(res.status, 0);
      // Either npm test or npm run test:coverage is acceptable; we expect
      // the script to prefer test:coverage when present.
      assert.match(res.stdout, /^npm (test|run test:coverage)$/);
    });

    it('detects Python test command (pytest) from pyproject.toml', () => {
      const res = runDetect(TEST_SCRIPT, path.join(FIXTURES_DIR, 'python'));
      assert.equal(res.status, 0);
      assert.equal(res.stdout, 'pytest');
    });

    it('detects Go test command from go.mod', () => {
      const res = runDetect(TEST_SCRIPT, path.join(FIXTURES_DIR, 'go'));
      assert.equal(res.status, 0);
      assert.equal(res.stdout, 'go test ./...');
    });

    it('detects Rust test command from Cargo.toml', () => {
      const res = runDetect(TEST_SCRIPT, path.join(FIXTURES_DIR, 'rust'));
      assert.equal(res.status, 0);
      assert.equal(res.stdout, 'cargo test');
    });

    it('detects Makefile test target → make test', () => {
      const res = runDetect(TEST_SCRIPT, path.join(FIXTURES_DIR, 'makefile'));
      assert.equal(res.status, 0);
      assert.equal(res.stdout, 'make test');
    });
  });

  describe('negative cases', () => {
    it('exits 1 with empty stdout for an empty directory', () => {
      const res = runDetect(TEST_SCRIPT, path.join(FIXTURES_DIR, 'empty'));
      assert.equal(res.status, 1);
      assert.equal(res.stdout, '');
    });

    it('exits 1 when package.json has no test script', () => {
      const tmp = mkTmp('detect-no-test-');
      try {
        fs.writeFileSync(
          path.join(tmp, 'package.json'),
          JSON.stringify({ name: 'no-tests', scripts: { build: 'tsc' } })
        );
        const res = runDetect(TEST_SCRIPT, tmp);
        assert.equal(res.status, 1);
        assert.equal(res.stdout, '');
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    });

    it('exits 1 when Makefile has only non-test targets', () => {
      const tmp = mkTmp('detect-mk-no-test-');
      try {
        fs.writeFileSync(
          path.join(tmp, 'Makefile'),
          'build:\n\techo build\n\nclean:\n\techo clean\n'
        );
        const res = runDetect(TEST_SCRIPT, tmp);
        assert.equal(res.status, 1);
        assert.equal(res.stdout, '');
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    });
  });

  describe('precedence', () => {
    it('prefers Node over Makefile when both present', () => {
      const tmp = mkTmp('detect-node-mk-');
      try {
        fs.writeFileSync(
          path.join(tmp, 'package.json'),
          JSON.stringify({ name: 'mixed', scripts: { test: 'jest' } })
        );
        fs.writeFileSync(path.join(tmp, 'Makefile'), 'test:\n\techo legacy\n');
        const res = runDetect(TEST_SCRIPT, tmp);
        assert.equal(res.status, 0);
        assert.match(res.stdout, /^npm /);
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    });
  });
});

describe('detect-lint-cmd.sh', () => {
  describe('ecosystem detection', () => {
    it('detects Node lint command from package.json scripts.lint', () => {
      const res = runDetect(LINT_SCRIPT, path.join(FIXTURES_DIR, 'node'));
      assert.equal(res.status, 0);
      assert.equal(res.stdout, 'npm run lint');
    });

    it('detects Python lint command (ruff) from pyproject.toml [tool.ruff]', () => {
      const res = runDetect(LINT_SCRIPT, path.join(FIXTURES_DIR, 'python'));
      assert.equal(res.status, 0);
      assert.equal(res.stdout, 'ruff check .');
    });

    it('detects Go lint command (go vet) from go.mod when no golangci config', () => {
      const res = runDetect(LINT_SCRIPT, path.join(FIXTURES_DIR, 'go'));
      assert.equal(res.status, 0);
      assert.equal(res.stdout, 'go vet ./...');
    });

    it('detects Rust lint command from Cargo.toml', () => {
      const res = runDetect(LINT_SCRIPT, path.join(FIXTURES_DIR, 'rust'));
      assert.equal(res.status, 0);
      assert.equal(res.stdout, 'cargo clippy');
    });

    it('detects Makefile lint target → make lint', () => {
      const res = runDetect(LINT_SCRIPT, path.join(FIXTURES_DIR, 'makefile'));
      assert.equal(res.status, 0);
      assert.equal(res.stdout, 'make lint');
    });
  });

  describe('negative cases', () => {
    it('exits 1 with empty stdout for an empty directory', () => {
      const res = runDetect(LINT_SCRIPT, path.join(FIXTURES_DIR, 'empty'));
      assert.equal(res.status, 1);
      assert.equal(res.stdout, '');
    });

    it('exits 1 when package.json has no lint script and no eslint config', () => {
      const tmp = mkTmp('detect-no-lint-');
      try {
        fs.writeFileSync(
          path.join(tmp, 'package.json'),
          JSON.stringify({ name: 'no-lint', scripts: { test: 'jest' } })
        );
        const res = runDetect(LINT_SCRIPT, tmp);
        assert.equal(res.status, 1);
        assert.equal(res.stdout, '');
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    });
  });

  describe('Node lint variants', () => {
    it('prefers npm run lint when scripts.lint exists', () => {
      const tmp = mkTmp('detect-node-lint-script-');
      try {
        fs.writeFileSync(
          path.join(tmp, 'package.json'),
          JSON.stringify({ name: 'p', scripts: { lint: 'eslint .' } })
        );
        const res = runDetect(LINT_SCRIPT, tmp);
        assert.equal(res.status, 0);
        assert.equal(res.stdout, 'npm run lint');
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    });

    it('falls back to npx eslint when only eslint config is present', () => {
      const tmp = mkTmp('detect-node-eslint-cfg-');
      try {
        fs.writeFileSync(
          path.join(tmp, 'package.json'),
          JSON.stringify({ name: 'p', scripts: { test: 'jest' } })
        );
        fs.writeFileSync(
          path.join(tmp, 'eslint.config.js'),
          'module.exports = [];\n'
        );
        const res = runDetect(LINT_SCRIPT, tmp);
        assert.equal(res.status, 0);
        assert.equal(res.stdout, 'npx eslint .');
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    });
  });
});
