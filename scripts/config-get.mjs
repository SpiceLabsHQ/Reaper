#!/usr/bin/env node
/**
 * @fileoverview Reaper configuration reader.
 *
 * Resolves a single dot-path key against, in order:
 *
 *   1. The user's .reaper.yml in cwd
 *   2. The bundled defaults.yml (overridable via REAPER_DEFAULTS_PATH)
 *   3. --fallback-script <path>  — executed; its stdout becomes the value
 *   4. --default <value>          — caller-supplied literal fallback
 *   5. Hard error: "Run /reaper:init to configure missing key 'X'" + exit 1
 *
 * --default is preferred over --fallback-script when both are supplied:
 * a literal default is cheaper than spawning a script and is the more
 * predictable choice when both are available.
 *
 * `null` in either YAML file is treated as "not set" so defaults.yml can
 * declare required-without-default keys explicitly (and the reader still
 * falls through to --fallback-script / --default / hard error).
 *
 * Output:
 *   - Default: scalar values printed verbatim; arrays printed
 *     space-separated.
 *   - --format json: any value emitted as JSON.
 *
 * Usage:
 *   node config-get.mjs <dot.path.key> [--default VAL] [--fallback-script PATH] [--format json]
 *
 * Exit codes:
 *   0 — value resolved
 *   1 — key not found anywhere in the chain
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolves a dot path against a parsed YAML object.
 *
 * Treats `null` and `undefined` identically — both mean "not set" — so the
 * reader keeps falling through the resolution chain.
 *
 * @param {object|null} data
 * @param {string} dotPath
 * @returns {*} value, or undefined if not found / null
 */
export function resolveDotPath(data, dotPath) {
  if (data === null || data === undefined) {
    return undefined;
  }
  let cur = data;
  for (const seg of dotPath.split('.')) {
    if (cur === null || cur === undefined || typeof cur !== 'object') {
      return undefined;
    }
    cur = cur[seg];
  }
  return cur === null ? undefined : cur;
}

/**
 * Load a YAML file, returning {} if missing and the parsed object otherwise.
 * If the file exists but parses to null (empty), returns {}.
 */
function loadYamlOrEmpty(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = YAML.parse(raw);
  if (parsed === null || parsed === undefined) {
    return {};
  }
  return parsed;
}

/**
 * Format a resolved value for stdout.
 *
 * @param {*} value
 * @param {'human'|'json'} format
 */
export function formatValue(value, format) {
  if (format === 'json') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).join(' ');
  }
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    // Objects in human mode -> JSON for readability
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Resolve a key against user config, bundled defaults, and optional
 * fallback hooks. Pure function — no I/O on top of the YAML loads.
 *
 * @param {object} opts
 * @param {string} opts.key                 - dot path key
 * @param {string} opts.userConfigPath      - path to user's .reaper.yml
 * @param {string} opts.defaultsPath        - path to bundled defaults.yml
 * @param {string} [opts.literalDefault]    - --default <value>
 * @param {string} [opts.fallbackScriptPath]- --fallback-script <path>
 * @returns {{found:boolean, value:*, source:string}}
 */
export function resolveKey({
  key,
  userConfigPath,
  defaultsPath,
  literalDefault,
  fallbackScriptPath,
}) {
  // Layer 1: user .reaper.yml
  const userData = loadYamlOrEmpty(userConfigPath);
  const userValue = resolveDotPath(userData, key);
  if (userValue !== undefined) {
    return { found: true, value: userValue, source: 'user' };
  }

  // Layer 2: bundled defaults
  const defaultsData = loadYamlOrEmpty(defaultsPath);
  const defaultValue = resolveDotPath(defaultsData, key);
  if (defaultValue !== undefined) {
    return { found: true, value: defaultValue, source: 'defaults' };
  }

  // Layer 3: --default literal (preferred over fallback-script — predictable)
  if (literalDefault !== undefined) {
    return { found: true, value: literalDefault, source: 'literal-default' };
  }

  // Layer 4: --fallback-script
  if (fallbackScriptPath) {
    const result = spawnSync(fallbackScriptPath, [], { encoding: 'utf8' });
    if (result.status === 0) {
      return {
        found: true,
        value: result.stdout.replace(/\n+$/, ''),
        source: 'fallback-script',
      };
    }
  }

  return { found: false, value: undefined, source: 'unresolved' };
}

/* node:coverage disable */
function parseArgs(argv) {
  const args = {
    key: null,
    format: 'human',
    literalDefault: undefined,
    fallbackScriptPath: undefined,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--format') {
      args.format = argv[++i];
    } else if (a === '--default') {
      args.literalDefault = argv[++i];
    } else if (a === '--fallback-script') {
      args.fallbackScriptPath = argv[++i];
    } else if (!args.key) {
      args.key = a;
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.key) {
    process.stderr.write(
      'usage: config-get.sh <dot.path.key> [--default VAL] [--fallback-script PATH] [--format json]\n'
    );
    process.exit(2);
  }

  const userConfigPath = path.resolve(process.cwd(), '.reaper.yml');
  const defaultsPath = process.env.REAPER_DEFAULTS_PATH
    ? path.resolve(process.env.REAPER_DEFAULTS_PATH)
    : path.resolve(__dirname, '..', 'defaults.yml');

  const result = resolveKey({
    key: args.key,
    userConfigPath,
    defaultsPath,
    literalDefault: args.literalDefault,
    fallbackScriptPath: args.fallbackScriptPath,
  });

  if (!result.found) {
    process.stderr.write(
      `Run /reaper:init to configure missing key '${args.key}'\n`
    );
    process.exit(1);
  }

  process.stdout.write(formatValue(result.value, args.format) + '\n');
  process.exit(0);
}

if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1] === __filename
) {
  main();
}
/* node:coverage enable */
