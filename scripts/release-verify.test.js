/**
 * @fileoverview Tests for scripts/release-verify.js
 *
 * Validates that the release-verify script correctly reads version strings
 * from package.json, .claude-plugin/plugin.json, and the README.md badge,
 * and exits non-zero with clear output when any file diverges.
 *
 * @example
 * node --test scripts/release-verify.test.js
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  readPackageVersion,
  readPluginVersion,
  readReadmeVersion,
  readGitTag,
  collectVersions,
  formatMismatchReport,
  verifyVersionConsistency,
} = require('./release-verify');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a temporary directory with the fixture files needed for a test.
 *
 * @param {object} opts
 * @param {string|null} opts.packageVersion   - version string for package.json, or null to omit file
 * @param {string|null} opts.pluginVersion    - version string for plugin.json, or null to omit file
 * @param {string|null} opts.readmeVersion    - version string for README badge, or null to omit file
 * @returns {{ dir: string, cleanup: () => void }}
 */
function makeTmpProject({
  packageVersion = '1.2.3',
  pluginVersion = '1.2.3',
  readmeVersion = '1.2.3',
} = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-verify-test-'));

  if (packageVersion !== null) {
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'test', version: packageVersion })
    );
  }

  if (pluginVersion !== null) {
    const pluginDir = path.join(dir, '.claude-plugin');
    fs.mkdirSync(pluginDir, { recursive: true });
    fs.writeFileSync(
      path.join(pluginDir, 'plugin.json'),
      JSON.stringify({ name: 'test', version: pluginVersion })
    );
  }

  if (readmeVersion !== null) {
    fs.writeFileSync(
      path.join(dir, 'README.md'),
      `# My Project\n\n<img src="https://img.shields.io/badge/version-${readmeVersion}-orange.svg" alt="Version">\n`
    );
  }

  return {
    dir,
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}

// ---------------------------------------------------------------------------
// readPackageVersion
// ---------------------------------------------------------------------------

describe('readPackageVersion', () => {
  it('returns version string when package.json exists', () => {
    const { dir, cleanup } = makeTmpProject({ packageVersion: '2.0.1' });
    try {
      const result = readPackageVersion(dir);
      assert.strictEqual(result, '2.0.1');
    } finally {
      cleanup();
    }
  });

  it('throws with clear message when package.json is missing', () => {
    const { dir, cleanup } = makeTmpProject({ packageVersion: null });
    try {
      assert.throws(
        () => readPackageVersion(dir),
        (err) => {
          assert.ok(
            err.message.includes('package.json'),
            `Expected 'package.json' in error: ${err.message}`
          );
          return true;
        }
      );
    } finally {
      cleanup();
    }
  });

  it('throws with clear message when version field is absent', () => {
    const { dir, cleanup } = makeTmpProject({ packageVersion: null });
    try {
      fs.writeFileSync(
        path.join(dir, 'package.json'),
        JSON.stringify({ name: 'no-version' })
      );
      assert.throws(
        () => readPackageVersion(dir),
        (err) => {
          assert.ok(
            err.message.includes('version'),
            `Expected 'version' in error: ${err.message}`
          );
          return true;
        }
      );
    } finally {
      cleanup();
    }
  });
});

// ---------------------------------------------------------------------------
// readPluginVersion
// ---------------------------------------------------------------------------

describe('readPluginVersion', () => {
  it('returns version string when plugin.json exists', () => {
    const { dir, cleanup } = makeTmpProject({ pluginVersion: '3.4.5' });
    try {
      const result = readPluginVersion(dir);
      assert.strictEqual(result, '3.4.5');
    } finally {
      cleanup();
    }
  });

  it('throws with clear message when plugin.json is missing', () => {
    const { dir, cleanup } = makeTmpProject({ pluginVersion: null });
    try {
      assert.throws(
        () => readPluginVersion(dir),
        (err) => {
          assert.ok(
            err.message.includes('plugin.json'),
            `Expected 'plugin.json' in error: ${err.message}`
          );
          return true;
        }
      );
    } finally {
      cleanup();
    }
  });

  it('throws with clear message when version field is absent', () => {
    const { dir, cleanup } = makeTmpProject({ pluginVersion: null });
    try {
      const pluginDir = path.join(dir, '.claude-plugin');
      fs.mkdirSync(pluginDir, { recursive: true });
      fs.writeFileSync(
        path.join(pluginDir, 'plugin.json'),
        JSON.stringify({ name: 'no-version' })
      );
      assert.throws(
        () => readPluginVersion(dir),
        (err) => {
          assert.ok(
            err.message.includes('version'),
            `Expected 'version' in error: ${err.message}`
          );
          return true;
        }
      );
    } finally {
      cleanup();
    }
  });
});

// ---------------------------------------------------------------------------
// readReadmeVersion
// ---------------------------------------------------------------------------

describe('readReadmeVersion', () => {
  it('returns version string when badge pattern matches', () => {
    const { dir, cleanup } = makeTmpProject({ readmeVersion: '5.6.7' });
    try {
      const result = readReadmeVersion(dir);
      assert.strictEqual(result, '5.6.7');
    } finally {
      cleanup();
    }
  });

  it('throws with clear message when README.md is missing', () => {
    const { dir, cleanup } = makeTmpProject({ readmeVersion: null });
    try {
      assert.throws(
        () => readReadmeVersion(dir),
        (err) => {
          assert.ok(
            err.message.includes('README.md'),
            `Expected 'README.md' in error: ${err.message}`
          );
          return true;
        }
      );
    } finally {
      cleanup();
    }
  });

  it('throws with clear message when badge pattern is absent from README', () => {
    const { dir, cleanup } = makeTmpProject({ readmeVersion: null });
    try {
      fs.writeFileSync(
        path.join(dir, 'README.md'),
        '# Project\n\nNo badge here.\n'
      );
      assert.throws(
        () => readReadmeVersion(dir),
        (err) => {
          assert.ok(
            err.message.includes('README.md'),
            `Expected 'README.md' in error: ${err.message}`
          );
          return true;
        }
      );
    } finally {
      cleanup();
    }
  });
});

// ---------------------------------------------------------------------------
// collectVersions
// ---------------------------------------------------------------------------

describe('collectVersions', () => {
  it('returns all three versions when all files agree', () => {
    const { dir, cleanup } = makeTmpProject({
      packageVersion: '1.0.0',
      pluginVersion: '1.0.0',
      readmeVersion: '1.0.0',
    });
    try {
      const versions = collectVersions(dir);
      assert.strictEqual(versions['package.json'], '1.0.0');
      assert.strictEqual(versions['.claude-plugin/plugin.json'], '1.0.0');
      assert.strictEqual(versions['README.md'], '1.0.0');
    } finally {
      cleanup();
    }
  });

  it('returns all three versions even when they differ', () => {
    const { dir, cleanup } = makeTmpProject({
      packageVersion: '2.0.0',
      pluginVersion: '1.9.9',
      readmeVersion: '1.8.0',
    });
    try {
      const versions = collectVersions(dir);
      assert.strictEqual(versions['package.json'], '2.0.0');
      assert.strictEqual(versions['.claude-plugin/plugin.json'], '1.9.9');
      assert.strictEqual(versions['README.md'], '1.8.0');
    } finally {
      cleanup();
    }
  });
});

// ---------------------------------------------------------------------------
// formatMismatchReport
// ---------------------------------------------------------------------------

describe('formatMismatchReport', () => {
  it('returns empty string when all versions match', () => {
    const versions = {
      'package.json': '1.0.0',
      '.claude-plugin/plugin.json': '1.0.0',
      'README.md': '1.0.0',
    };
    const report = formatMismatchReport(versions);
    assert.strictEqual(report, '');
  });

  it('includes each filename and its version in the report', () => {
    const versions = {
      'package.json': '2.0.0',
      '.claude-plugin/plugin.json': '1.9.9',
      'README.md': '2.0.0',
    };
    const report = formatMismatchReport(versions);
    assert.ok(report.includes('package.json'), 'report should name package.json');
    assert.ok(
      report.includes('.claude-plugin/plugin.json'),
      'report should name plugin.json'
    );
    assert.ok(report.includes('README.md'), 'report should name README.md');
    assert.ok(report.includes('1.9.9'), 'report should include diverging version');
    assert.ok(report.includes('2.0.0'), 'report should include majority version');
  });

  it('is non-empty when any version diverges', () => {
    const versions = {
      'package.json': '3.0.0',
      '.claude-plugin/plugin.json': '3.0.0',
      'README.md': '2.9.9',
    };
    const report = formatMismatchReport(versions);
    assert.notStrictEqual(report, '');
  });
});

// ---------------------------------------------------------------------------
// readGitTag
// ---------------------------------------------------------------------------

describe('readGitTag', () => {
  it('returns the version string stripped from a semver git tag', () => {
    const fakeExec = () => 'v1.2.3\n';
    const result = readGitTag(fakeExec);
    assert.strictEqual(result, '1.2.3');
  });

  it('returns the version string from a tag without a v-prefix', () => {
    const fakeExec = () => '1.2.3\n';
    const result = readGitTag(fakeExec);
    assert.strictEqual(result, '1.2.3');
  });

  it('throws a clear error when git describe returns no tag', () => {
    const fakeExec = () => {
      throw new Error('fatal: No names found, cannot describe anything.');
    };
    assert.throws(
      () => readGitTag(fakeExec),
      (err) => {
        assert.ok(
          err.message.includes('git tag') || err.message.includes('No git tag'),
          `Expected git-tag mention in error: ${err.message}`
        );
        return true;
      }
    );
  });
});

// ---------------------------------------------------------------------------
// verifyVersionConsistency — integration (uses real process.exit stub)
// ---------------------------------------------------------------------------

describe('verifyVersionConsistency', () => {
  let exitCode;
  let originalExit;
  let capturedOutput;
  let originalLog;
  let originalError;

  beforeEach(() => {
    exitCode = undefined;
    capturedOutput = [];

    originalExit = process.exit;
    process.exit = (code) => {
      exitCode = code;
    };

    originalLog = console.log;
    originalError = console.error;
    console.log = (...args) => capturedOutput.push(args.join(' '));
    console.error = (...args) => capturedOutput.push(args.join(' '));
  });

  afterEach(() => {
    process.exit = originalExit;
    console.log = originalLog;
    console.error = originalError;
  });

  it('exits 0 when all three versions match', () => {
    const { dir, cleanup } = makeTmpProject({
      packageVersion: '1.2.3',
      pluginVersion: '1.2.3',
      readmeVersion: '1.2.3',
    });
    const fakeExec = () => 'v1.2.3\n';
    try {
      verifyVersionConsistency(dir, fakeExec);
      assert.strictEqual(exitCode, 0);
    } finally {
      cleanup();
    }
  });

  it('exits 1 when plugin.json diverges', () => {
    const { dir, cleanup } = makeTmpProject({
      packageVersion: '1.2.3',
      pluginVersion: '1.2.2',
      readmeVersion: '1.2.3',
    });
    try {
      verifyVersionConsistency(dir);
      assert.strictEqual(exitCode, 1);
    } finally {
      cleanup();
    }
  });

  it('exits 1 when README badge diverges', () => {
    const { dir, cleanup } = makeTmpProject({
      packageVersion: '1.2.3',
      pluginVersion: '1.2.3',
      readmeVersion: '1.2.0',
    });
    try {
      verifyVersionConsistency(dir);
      assert.strictEqual(exitCode, 1);
    } finally {
      cleanup();
    }
  });

  it('exits 1 when package.json diverges', () => {
    const { dir, cleanup } = makeTmpProject({
      packageVersion: '0.9.0',
      pluginVersion: '1.2.3',
      readmeVersion: '1.2.3',
    });
    try {
      verifyVersionConsistency(dir);
      assert.strictEqual(exitCode, 1);
    } finally {
      cleanup();
    }
  });

  it('outputs the mismatch report when versions differ', () => {
    const { dir, cleanup } = makeTmpProject({
      packageVersion: '1.2.3',
      pluginVersion: '1.2.2',
      readmeVersion: '1.2.3',
    });
    try {
      verifyVersionConsistency(dir);
      const output = capturedOutput.join('\n');
      assert.ok(
        output.includes('1.2.2') || output.includes('plugin.json'),
        `Expected diverging version or filename in output: ${output}`
      );
    } finally {
      cleanup();
    }
  });

  it('exits 1 with clear output when a file is missing', () => {
    const { dir, cleanup } = makeTmpProject({ pluginVersion: null });
    try {
      verifyVersionConsistency(dir);
      assert.strictEqual(exitCode, 1);
      const output = capturedOutput.join('\n');
      assert.ok(
        output.includes('plugin.json'),
        `Expected plugin.json mention in error output: ${output}`
      );
    } finally {
      cleanup();
    }
  });

  it('prints success message when all versions match', () => {
    const { dir, cleanup } = makeTmpProject({
      packageVersion: '4.0.0',
      pluginVersion: '4.0.0',
      readmeVersion: '4.0.0',
    });
    try {
      verifyVersionConsistency(dir);
      const output = capturedOutput.join('\n');
      assert.ok(output.length > 0, 'Expected some output on success');
    } finally {
      cleanup();
    }
  });

  it('exits 0 when all three versions match and git tag agrees', () => {
    const { dir, cleanup } = makeTmpProject({
      packageVersion: '5.0.0',
      pluginVersion: '5.0.0',
      readmeVersion: '5.0.0',
    });
    const fakeExec = () => 'v5.0.0\n';
    try {
      verifyVersionConsistency(dir, fakeExec);
      assert.strictEqual(exitCode, 0);
    } finally {
      cleanup();
    }
  });

  it('exits 1 with a clear error when git tag does not match package.json version', () => {
    const { dir, cleanup } = makeTmpProject({
      packageVersion: '5.0.0',
      pluginVersion: '5.0.0',
      readmeVersion: '5.0.0',
    });
    // Simulate a stale package.json — tag says 5.0.1 but package.json says 5.0.0
    const fakeExec = () => 'v5.0.1\n';
    try {
      verifyVersionConsistency(dir, fakeExec);
      assert.strictEqual(exitCode, 1);
      const output = capturedOutput.join('\n');
      assert.ok(
        output.includes('5.0.1') || output.includes('git tag') || output.includes('tag'),
        `Expected git tag version in error output: ${output}`
      );
    } finally {
      cleanup();
    }
  });

  it('exits 1 with a clear error when package.json is ahead of the git tag', () => {
    const { dir, cleanup } = makeTmpProject({
      packageVersion: '6.0.0',
      pluginVersion: '6.0.0',
      readmeVersion: '6.0.0',
    });
    // package.json bumped to 6.0.0 but git tag is still at 5.9.0
    const fakeExec = () => 'v5.9.0\n';
    try {
      verifyVersionConsistency(dir, fakeExec);
      assert.strictEqual(exitCode, 1);
      const output = capturedOutput.join('\n');
      assert.ok(
        output.includes('5.9.0') || output.includes('git tag') || output.includes('tag'),
        `Expected git tag mismatch info in error output: ${output}`
      );
    } finally {
      cleanup();
    }
  });

  it('skips git tag check and exits 0 when no execFn provided and files agree', () => {
    // Without an execFn injection the sentinel cannot call real git in a unit test;
    // the existing file-only verification path must still pass.
    const { dir, cleanup } = makeTmpProject({
      packageVersion: '7.0.0',
      pluginVersion: '7.0.0',
      readmeVersion: '7.0.0',
    });
    // Pass an execFn that throws "not in a git repo" to exercise the graceful fallback
    const fakeExec = () => {
      throw new Error('not a git repository');
    };
    try {
      verifyVersionConsistency(dir, fakeExec);
      // When git is unavailable the sentinel should still exit 0 (files agree)
      // but emit a warning — the sentinel must NOT hard-fail on missing git.
      assert.strictEqual(exitCode, 0);
    } finally {
      cleanup();
    }
  });
});
