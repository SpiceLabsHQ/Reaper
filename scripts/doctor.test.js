'use strict';

/**
 * @fileoverview Tests for scripts/doctor.mjs.
 *
 * Doctor is the script-driven validator behind /reaper:doctor. It:
 *
 *   1. Validates `.reaper.yml` against reaper.schema.json (delegates to
 *      validateConfigFile).
 *   2. Resolves each top-level config key to surface where the value came
 *      from (user / defaults / unset).
 *   3. Runs each `detect-*.sh` and compares the configured value against
 *      the detected value (drift report).
 *   4. Verifies that `test.cmd` and `lint.cmd` resolve to a real script
 *      or binary.
 *   5. Prints a human-readable report. Exit 0 if no errors (warnings ok),
 *      exit 1 if any error.
 *
 * Tests target the exported `runDoctor` function — calling the .mjs as a
 * library avoids subshell flakiness and keeps coverage attributable.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const FIXTURES = path.resolve(__dirname, 'fixtures/doctor');
const SCHEMA = path.resolve(__dirname, '..', 'reaper.schema.json');
const DEFAULTS = path.resolve(__dirname, '..', 'defaults.yml');

/**
 * Load the doctor module via dynamic import (it's an ES module).
 *
 * @returns {Promise<object>} The doctor module exports.
 */
async function loadDoctor() {
  return import('./doctor.mjs');
}

/**
 * Run doctor against a fixture directory. Each fixture directory contains
 * a .reaper.yml and any sentinel files needed to make detection
 * deterministic.
 *
 * @param {string} fixtureName - Subdirectory under fixtures/doctor/.
 * @param {object} [extra] - Override fields passed to runDoctor.
 * @returns {Promise<object>} { exitCode, report, errors, warnings, sections }
 */
async function runFixture(fixtureName, extra = {}) {
  const { runDoctor } = await loadDoctor();
  const fixtureDir = path.join(FIXTURES, fixtureName);
  return runDoctor({
    cwd: fixtureDir,
    configPath: path.join(fixtureDir, '.reaper.yml'),
    schemaPath: SCHEMA,
    defaultsPath: DEFAULTS,
    ...extra,
  });
}

describe('doctor.mjs', () => {
  describe('clean fixture', () => {
    it('exits 0', async () => {
      const r = await runFixture('clean');
      assert.equal(r.exitCode, 0, `expected exit 0; report:\n${r.report}`);
    });

    it('reports zero errors', async () => {
      const r = await runFixture('clean');
      assert.equal(r.errors, 0);
    });

    it('emits a report containing schema validation status', async () => {
      const r = await runFixture('clean');
      assert.match(r.report, /schema/i);
      assert.match(r.report, /valid/i);
    });

    it('emits a section listing top-level keys with sources', async () => {
      const r = await runFixture('clean');
      // The report should reference at least the major keys.
      assert.match(r.report, /test/i);
      assert.match(r.report, /lint/i);
      assert.match(r.report, /tracker/i);
    });

    it('includes a status summary line with error and warning counts', async () => {
      const r = await runFixture('clean');
      // Expect a "Status:" line of some form summarizing counts.
      assert.match(r.report, /Status:/i);
      assert.match(r.report, /error/i);
    });
  });

  describe('schema-violation fixture (version: 2)', () => {
    it('exits 1', async () => {
      const r = await runFixture('schema-violation');
      assert.equal(r.exitCode, 1);
    });

    it('reports the version error in the report', async () => {
      const r = await runFixture('schema-violation');
      assert.match(r.report, /version/i);
    });

    it('counts at least one error', async () => {
      const r = await runFixture('schema-violation');
      assert.ok(r.errors >= 1, `expected >=1 error, got ${r.errors}`);
    });
  });

  describe('missing-required fixture (no tracker.system)', () => {
    it('exits 1', async () => {
      const r = await runFixture('missing-required');
      assert.equal(r.exitCode, 1);
    });

    it('mentions tracker in the report', async () => {
      const r = await runFixture('missing-required');
      assert.match(r.report, /tracker/i);
    });
  });

  describe('drift fixture', () => {
    it('flags drift between configured tracker and detected tracker', async () => {
      const r = await runFixture('drift');
      // The fixture configures tracker.system: linear but its commit history
      // (or sentinel marker) should make detect-task-system.sh prefer github.
      // The drift section must surface the mismatch.
      assert.match(r.report, /drift/i);
    });

    it('exits 0 when only drift warnings present (no errors)', async () => {
      const r = await runFixture('drift');
      // Drift is informational — should not block.
      assert.equal(
        r.exitCode,
        0,
        `expected exit 0 (drift = warning only); report:\n${r.report}`
      );
    });
  });

  describe('unreachable-cmd fixture', () => {
    it('flags an unreachable test command as an error', async () => {
      const r = await runFixture('unreachable-cmd');
      // Fixture configures `npm run nonexistent-script` as test.cmd.
      // Reachability check should fail because package.json has no such script.
      assert.equal(
        r.exitCode,
        1,
        `expected exit 1 (unreachable cmd is an error); report:\n${r.report}`
      );
      assert.match(r.report, /test\.cmd|test command/i);
    });
  });

  describe('config file missing', () => {
    it('exits 1 and reports the missing file', async () => {
      const r = await runFixture('clean', {
        configPath: path.join(FIXTURES, 'does-not-exist', '.reaper.yml'),
      });
      assert.equal(r.exitCode, 1);
      assert.match(r.report, /not found|missing|cannot/i);
    });
  });

  describe('reachability helpers', () => {
    it('isCommandReachable returns true for `npm run X` when X is a script in package.json', async () => {
      const { isCommandReachable } = await loadDoctor();
      const fixtureDir = path.join(FIXTURES, 'clean');
      assert.equal(
        isCommandReachable('npm run test', fixtureDir),
        true,
        'expected npm run test to be reachable in clean fixture'
      );
    });

    it('isCommandReachable returns false for `npm run X` when X is not in package.json', async () => {
      const { isCommandReachable } = await loadDoctor();
      const fixtureDir = path.join(FIXTURES, 'unreachable-cmd');
      assert.equal(
        isCommandReachable('npm run nonexistent-script', fixtureDir),
        false
      );
    });

    it('isCommandReachable returns true for a binary on PATH', async () => {
      const { isCommandReachable } = await loadDoctor();
      // `node` is guaranteed to be on PATH since these tests are run by node.
      assert.equal(isCommandReachable('node --version', process.cwd()), true);
    });

    it('isCommandReachable returns false for a binary not on PATH', async () => {
      const { isCommandReachable } = await loadDoctor();
      assert.equal(
        isCommandReachable(
          'definitely-not-a-real-binary-xyz123 foo',
          process.cwd()
        ),
        false
      );
    });
  });
});
