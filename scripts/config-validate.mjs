#!/usr/bin/env node
/**
 * @fileoverview Reaper configuration validator.
 *
 * Validates a YAML config file against reaper.schema.json (JSON Schema
 * draft-07). Reports two categories of findings:
 *
 *   - errors:   schema violations that fail validation (type mismatch,
 *               missing required key, wrong enum, wrong version). Exit 1.
 *   - warnings: unknown top-level or nested keys that aren't declared in
 *               the schema. Printed prefixed with "WARN" but do NOT fail
 *               validation (exit stays 0 if no errors).
 *
 * Output:
 *   - Default: human-readable, "<field>: <message>" per line on stderr.
 *   - --format json: { "errors": [...], "warnings": [...] } on stdout.
 *
 * Usage:
 *   node config-validate.mjs [path/to/.reaper.yml] [--schema PATH] [--format json]
 *
 * Exit codes:
 *   0 — clean (errors empty)
 *   1 — at least one error, OR file/schema cannot be loaded
 *
 * Library shape:
 *   When imported as a module, exports validateConfigFile(filePath, schemaPath)
 *   which returns { errors, warnings } without calling process.exit.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import Ajv from 'ajv';
import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_SCHEMA_PATH = path.resolve(__dirname, '..', 'reaper.schema.json');

/**
 * Walks an object and collects every dot-path that exists in `data` but is
 * NOT declared in the corresponding schema branch. Used for warnings about
 * unknown keys, which the schema itself permits (additionalProperties is
 * not set to false in the schema).
 *
 * @param {object} data - Parsed YAML data.
 * @param {object} schema - The compiled-from JSON schema document.
 * @returns {Array<{field:string, message:string}>}
 */
function collectUnknownKeyWarnings(data, schema) {
  const warnings = [];

  function walk(node, schemaNode, prefix) {
    if (
      node === null ||
      typeof node !== 'object' ||
      Array.isArray(node) ||
      !schemaNode ||
      schemaNode.type !== 'object' ||
      !schemaNode.properties
    ) {
      return;
    }
    const declared = new Set(Object.keys(schemaNode.properties));
    for (const key of Object.keys(node)) {
      const fieldPath = prefix ? `${prefix}.${key}` : key;
      if (!declared.has(key)) {
        warnings.push({
          field: fieldPath,
          message: `unknown key (not declared in schema)`,
        });
        continue;
      }
      walk(node[key], schemaNode.properties[key], fieldPath);
    }
  }

  walk(data, schema, '');
  return warnings;
}

/**
 * Translates an ajv error object into Reaper's flat
 * `{ field, message }` shape with a human-friendly field path.
 *
 * @param {object} err - ajv error
 * @param {object} data - parsed config (for context)
 * @returns {{field:string, message:string}}
 */
function formatAjvError(err, _data) {
  const instance = err.instancePath || '';
  const field = instance.replace(/^\//, '').replace(/\//g, '.');

  // Required key — instancePath points at the parent; missingProperty names the child.
  if (err.keyword === 'required') {
    const missing = err.params && err.params.missingProperty;
    const target = field ? `${field}.${missing}` : missing;
    return { field: target, message: `required key is missing` };
  }

  if (err.keyword === 'type') {
    const expected = err.params && err.params.type;
    return {
      field: field || '<root>',
      message: `expected ${expected}, got ${typeof getAtPath(_data, field)}`,
    };
  }

  if (err.keyword === 'enum') {
    const allowed = (err.params && err.params.allowedValues) || [];
    return {
      field: field || '<root>',
      message: `must be one of [${allowed.join(', ')}], got ${JSON.stringify(getAtPath(_data, field))}`,
    };
  }

  if (err.keyword === 'const' && field === 'version') {
    const expected = err.params && err.params.allowedValue;
    const actual = getAtPath(_data, field);
    return {
      field: 'version',
      message: `expected version ${expected}, got ${JSON.stringify(actual)} — see migration guidance in docs/configuration.md to upgrade`,
    };
  }

  if (err.keyword === 'const') {
    const expected = err.params && err.params.allowedValue;
    return {
      field: field || '<root>',
      message: `must equal ${JSON.stringify(expected)}`,
    };
  }

  return {
    field: field || '<root>',
    message: err.message || 'invalid value',
  };
}

/**
 * Get a value from a nested object by dot path. Returns undefined for
 * missing paths.
 */
function getAtPath(obj, dotPath) {
  if (!dotPath) {
    return obj;
  }
  let cur = obj;
  for (const seg of dotPath.split('.')) {
    if (cur === null || cur === undefined || typeof cur !== 'object') {
      return undefined;
    }
    cur = cur[seg];
  }
  return cur;
}

/**
 * Validate a parsed config object against a schema document.
 *
 * @param {object} data - Parsed YAML.
 * @param {object} schema - Loaded schema document.
 * @returns {{errors:Array, warnings:Array}}
 */
export function validateConfig(data, schema) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const ok = validate(data);

  const errors = ok
    ? []
    : (validate.errors || []).map((e) => formatAjvError(e, data));

  const warnings = collectUnknownKeyWarnings(data, schema);

  return { errors, warnings };
}

/**
 * Load and validate a config file.
 *
 * @param {string} filePath - Path to the YAML config.
 * @param {string} schemaPath - Path to the JSON schema document.
 * @returns {{errors:Array, warnings:Array}}
 */
export function validateConfigFile(filePath, schemaPath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`config file not found: ${filePath}`);
  }
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`schema file not found: ${schemaPath}`);
  }

  const rawConfig = fs.readFileSync(filePath, 'utf8');
  const data = YAML.parse(rawConfig);
  if (data === null || typeof data !== 'object') {
    return {
      errors: [
        {
          field: '<root>',
          message: 'config must be a YAML mapping (got null or scalar)',
        },
      ],
      warnings: [],
    };
  }

  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  return validateConfig(data, schema);
}

/* node:coverage disable */
function parseArgs(argv) {
  const args = { positional: [], format: 'human', schemaPath: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--format') {
      args.format = argv[++i];
    } else if (a === '--schema') {
      args.schemaPath = argv[++i];
    } else {
      args.positional.push(a);
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const filePath = args.positional[0]
    ? path.resolve(args.positional[0])
    : path.resolve(process.cwd(), '.reaper.yml');
  const schemaPath = args.schemaPath
    ? path.resolve(args.schemaPath)
    : DEFAULT_SCHEMA_PATH;

  let result;
  try {
    result = validateConfigFile(filePath, schemaPath);
  } catch (err) {
    if (args.format === 'json') {
      process.stdout.write(
        JSON.stringify({
          errors: [{ field: '<file>', message: err.message }],
          warnings: [],
        }) + '\n'
      );
    } else {
      process.stderr.write(`error: ${err.message}\n`);
    }
    process.exit(1);
  }

  if (args.format === 'json') {
    process.stdout.write(JSON.stringify(result) + '\n');
  } else {
    for (const w of result.warnings) {
      process.stderr.write(`WARN ${w.field}: ${w.message}\n`);
    }
    for (const e of result.errors) {
      process.stderr.write(`${e.field}: ${e.message}\n`);
    }
  }

  process.exit(result.errors.length > 0 ? 1 : 0);
}

if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1] === __filename
) {
  main();
}
/* node:coverage enable */
