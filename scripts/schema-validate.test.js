'use strict';

/**
 * @fileoverview Direct schema-conformance tests for reaper.schema.json.
 *
 * Where config-validate.test.js exercises the validator CLI end-to-end, this
 * file exercises the schema document itself with ajv. Catches schema-author
 * mistakes early and serves as the canonical record of which fixtures
 * represent which schema-level outcomes.
 *
 * Note on "unknown key" semantics:
 *   The JSON Schema document permits additional properties (the validator
 *   layer is the one that emits warnings for unknown keys). This test
 *   confirms the schema does NOT reject unknown keys outright — keeping
 *   warning logic out of the schema.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Ajv = require('ajv');
const YAML = require('yaml');

const SCHEMA_PATH = path.resolve(__dirname, '..', 'reaper.schema.json');
const FIXTURES = path.resolve(__dirname, 'fixtures/configs');

const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));

function loadFixture(name) {
  return YAML.parse(fs.readFileSync(path.join(FIXTURES, name), 'utf8'));
}

function makeValidator() {
  const ajv = new Ajv({ allErrors: true, strict: false });
  return ajv.compile(schema);
}

describe('reaper.schema.json', () => {
  it('is a valid JSON Schema draft-07 document', () => {
    assert.equal(schema.$schema, 'http://json-schema.org/draft-07/schema#');
    assert.equal(schema.type, 'object');
    assert.ok(Array.isArray(schema.required));
    assert.ok(schema.required.includes('version'));
    assert.ok(schema.required.includes('test'));
    assert.ok(schema.required.includes('lint'));
    assert.ok(schema.required.includes('tracker'));
  });

  it('pins version to const: 1', () => {
    assert.equal(schema.properties.version.const, 1);
  });

  it('declares descriptions for every top-level property', () => {
    for (const [key, def] of Object.entries(schema.properties)) {
      assert.ok(
        typeof def.description === 'string' && def.description.length > 0,
        `property ${key} is missing a description`
      );
    }
  });

  it('compiles without errors', () => {
    const ajv = new Ajv({ allErrors: true, strict: false });
    assert.doesNotThrow(() => ajv.compile(schema));
  });

  describe('fixture conformance', () => {
    it('accepts a minimal valid config', () => {
      const validate = makeValidator();
      const data = loadFixture('valid-minimal.yml');
      const ok = validate(data);
      assert.equal(ok, true, JSON.stringify(validate.errors));
    });

    it('accepts a fully populated valid config', () => {
      const validate = makeValidator();
      const data = loadFixture('valid-full.yml');
      const ok = validate(data);
      assert.equal(ok, true, JSON.stringify(validate.errors));
    });

    it('rejects a type mismatch', () => {
      const validate = makeValidator();
      const data = loadFixture('invalid-type.yml');
      const ok = validate(data);
      assert.equal(ok, false);
      const found = (validate.errors || []).find((e) =>
        String(e.instancePath || '').includes('/coverage/threshold')
      );
      assert.ok(
        found,
        `expected coverage.threshold error; got ${JSON.stringify(validate.errors)}`
      );
    });

    it('rejects a missing required key', () => {
      const validate = makeValidator();
      const data = loadFixture('missing-required.yml');
      const ok = validate(data);
      assert.equal(ok, false);
      const requiredErrors = (validate.errors || []).filter(
        (e) => e.keyword === 'required'
      );
      assert.ok(requiredErrors.length >= 1);
    });

    it('rejects an invalid version (const constraint)', () => {
      const validate = makeValidator();
      const data = loadFixture('wrong-version.yml');
      const ok = validate(data);
      assert.equal(ok, false);
      const versionError = (validate.errors || []).find(
        (e) =>
          String(e.instancePath || '').includes('/version') ||
          String(e.schemaPath || '').includes('/version/')
      );
      assert.ok(versionError);
    });

    it('rejects an invalid tracker.system enum value', () => {
      const validate = makeValidator();
      const data = loadFixture('invalid-tracker-enum.yml');
      const ok = validate(data);
      assert.equal(ok, false);
    });

    it('does NOT reject configs that contain unknown top-level keys', () => {
      // The schema permits additional properties; the validator layer is
      // responsible for warning about them. This keeps schema vs validator
      // responsibilities clean.
      const validate = makeValidator();
      const data = loadFixture('unknown-key.yml');
      const ok = validate(data);
      assert.equal(
        ok,
        true,
        `expected schema to accept unknown keys (validator layer warns); got errors ${JSON.stringify(validate.errors)}`
      );
    });
  });
});
