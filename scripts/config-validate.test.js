'use strict';

/**
 * @fileoverview Tests for scripts/config-validate.sh and the underlying
 * config-validate.mjs implementation.
 *
 * The validator reads a YAML config file, validates it against
 * reaper.schema.json (JSON Schema draft-07), and reports errors and warnings.
 *
 *   - Errors: type mismatches, missing required keys, unknown enum values,
 *     wrong schema version. Cause exit 1.
 *   - Warnings: unknown keys (not declared in the schema). Do NOT cause exit 1
 *     on their own.
 *
 * Output:
 *   - Default: human-readable, errors on stderr, warnings on stderr prefixed
 *     "WARN".
 *   - --format json: { "errors": [...], "warnings": [...] } on stdout.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const SCRIPT = path.resolve(__dirname, 'config-validate.sh');
const FIXTURES = path.resolve(__dirname, 'fixtures/configs');
const SCHEMA = path.resolve(__dirname, '..', 'reaper.schema.json');

/**
 * Run config-validate.sh with the given fixture and optional flags.
 *
 * @param {string} fixture - filename inside scripts/fixtures/configs/
 * @param {string[]} [extra] - extra CLI args (e.g. ['--format', 'json'])
 * @returns {{status:number, stdout:string, stderr:string}}
 */
function run(fixture, extra = []) {
  const args = [path.join(FIXTURES, fixture), '--schema', SCHEMA, ...extra];
  const result = spawnSync(SCRIPT, args, { encoding: 'utf8' });
  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

describe('config-validate.sh', () => {
  describe('valid configs', () => {
    it('exits 0 on a minimal valid config', () => {
      const r = run('valid-minimal.yml');
      assert.equal(
        r.status,
        0,
        `expected exit 0, got ${r.status}; stderr: ${r.stderr}`
      );
    });

    it('exits 0 on a fully populated valid config', () => {
      const r = run('valid-full.yml');
      assert.equal(
        r.status,
        0,
        `expected exit 0, got ${r.status}; stderr: ${r.stderr}`
      );
    });
  });

  describe('errors', () => {
    it('reports a type mismatch and exits 1', () => {
      const r = run('invalid-type.yml');
      assert.equal(r.status, 1);
      assert.match(r.stderr, /coverage\.threshold/);
      assert.match(r.stderr, /(number|string|type)/i);
    });

    it('reports a missing required key and exits 1', () => {
      const r = run('missing-required.yml');
      assert.equal(r.status, 1);
      assert.match(r.stderr, /lint/);
      assert.match(r.stderr, /(required|missing)/i);
    });

    it('reports a wrong schema version with migration guidance and exits 1', () => {
      const r = run('wrong-version.yml');
      assert.equal(r.status, 1);
      assert.match(r.stderr, /version/i);
      // Migration guidance should mention upgrade/migrate or the expected version
      assert.match(r.stderr, /(migrat|upgrade|version 1|expected 1)/i);
    });

    it('reports an invalid enum value and exits 1', () => {
      const r = run('invalid-tracker-enum.yml');
      assert.equal(r.status, 1);
      assert.match(r.stderr, /tracker\.system/);
    });
  });

  describe('warnings', () => {
    it('warns on unknown keys but exits 0', () => {
      const r = run('unknown-key.yml');
      assert.equal(
        r.status,
        0,
        `expected exit 0 (warnings don't fail); got ${r.status}; stderr: ${r.stderr}`
      );
      assert.match(r.stderr, /WARN/);
      assert.match(r.stderr, /mystery_setting/);
    });
  });

  describe('--format json', () => {
    it('emits structured JSON for a valid config', () => {
      const r = run('valid-minimal.yml', ['--format', 'json']);
      assert.equal(r.status, 0);
      const parsed = JSON.parse(r.stdout);
      assert.deepEqual(parsed.errors, []);
      assert.deepEqual(parsed.warnings, []);
    });

    it('emits structured JSON for an invalid config', () => {
      const r = run('invalid-type.yml', ['--format', 'json']);
      assert.equal(r.status, 1);
      const parsed = JSON.parse(r.stdout);
      assert.ok(Array.isArray(parsed.errors));
      assert.ok(parsed.errors.length >= 1);
      const found = parsed.errors.find((e) =>
        String(e.field || '').includes('coverage.threshold')
      );
      assert.ok(
        found,
        `expected an error for coverage.threshold; got ${JSON.stringify(parsed.errors)}`
      );
    });

    it('emits warnings array when unknown keys present', () => {
      const r = run('unknown-key.yml', ['--format', 'json']);
      assert.equal(r.status, 0);
      const parsed = JSON.parse(r.stdout);
      assert.deepEqual(parsed.errors, []);
      assert.ok(parsed.warnings.length >= 1);
      const found = parsed.warnings.find((w) =>
        String(w.field || '').includes('mystery_setting')
      );
      assert.ok(
        found,
        `expected a warning for mystery_setting; got ${JSON.stringify(parsed.warnings)}`
      );
    });
  });

  describe('file resolution', () => {
    it('exits non-zero when the config file does not exist', () => {
      const r = run('does-not-exist.yml');
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /(not found|No such|missing|cannot)/i);
    });
  });
});
