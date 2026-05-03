#!/usr/bin/env node
/**
 * @fileoverview Reaper configuration doctor.
 *
 * Validates `.reaper.yml` against reaper.schema.json and probes for drift
 * between the configured values and what the per-ecosystem detection
 * scripts would propose for the project today. Also verifies that
 * configured `test.cmd` and `lint.cmd` resolve to a real package.json
 * script or binary on PATH.
 *
 * The command surface (/reaper:doctor) is intentionally a thin wrapper:
 * the EJS template inline-invokes scripts/doctor.sh, which delegates here.
 * All report formatting lives in this module so the agent does no
 * additional reasoning — output is deterministic and fast.
 *
 * Library shape:
 *   runDoctor(opts) — pure function (apart from filesystem and child_process
 *   reads). Returns { exitCode, errors, warnings, report }. Tests target
 *   this entry point so they don't depend on a subshell.
 *
 * CLI usage:
 *   node doctor.mjs [path/to/.reaper.yml]
 *
 * Exit codes:
 *   0 — clean, or warnings only
 *   1 — at least one error (schema invalid, missing required key,
 *       unreachable test/lint command, file missing)
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import YAML from 'yaml';

import { validateConfigFile } from './config-validate.mjs';
import { resolveKey } from './config-get.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ICON_OK = '✓';
const ICON_WARN = '⚠';
const ICON_ERR = '✗';

/**
 * Status object emitted for each check row. Doctor builds an array of
 * these and renders them into the final text report.
 *
 * @typedef {object} CheckRow
 * @property {string} label    Short label for the row (e.g. "test.cmd").
 * @property {string} value    The value being reported (e.g. "npm run test").
 * @property {'ok'|'warn'|'err'} status  Severity for this row.
 * @property {string} [note]   Optional inline note appended after the value.
 */

/**
 * Resolve the absolute path to a sibling detect script. Doctor delegates
 * to the existing detect-*.sh wrappers rather than re-implementing
 * detection — staying consistent with how every other Reaper command
 * uses these scripts at takeoff time.
 *
 * @param {string} name - Script base name (without .sh).
 * @returns {string} Absolute path.
 */
function detectScriptPath(name) {
  return path.resolve(__dirname, `${name}.sh`);
}

/**
 * Run a detection script in a target cwd, with an optional fixture file
 * overriding the data source. Returns trimmed stdout, or null if the
 * script failed.
 *
 * @param {string} scriptName - e.g. "detect-test-cmd"
 * @param {string} cwd - Working directory for the spawn.
 * @param {object} [opts]
 * @param {string} [opts.fixture] - DETECT_FIXTURE override (test seam).
 * @returns {string|null}
 */
function runDetectScript(scriptName, cwd, opts = {}) {
  const scriptPath = detectScriptPath(scriptName);
  if (!fs.existsSync(scriptPath)) {
    return null;
  }
  const env = { ...process.env };
  if (opts.fixture) {
    env.DETECT_FIXTURE = opts.fixture;
  }
  try {
    const out = execFileSync(scriptPath, [], {
      cwd,
      env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out.trim();
  } catch {
    return null;
  }
}

/**
 * Check whether a configured command can plausibly run.
 *
 * Two patterns are recognized:
 *
 *   1. `npm run X`, `pnpm run X`, `yarn run X`, `npm X` (where X is a
 *      script in package.json) — verified by reading the cwd's
 *      package.json and looking for the named script.
 *   2. Any other command — the first whitespace-delimited token is
 *      treated as a binary name and looked up via `command -v`.
 *
 * Returning `true` is a soft guarantee: it means "doctor found something
 * matching the expected shape." It does NOT execute the command.
 *
 * @param {string} cmd - The configured command string.
 * @param {string} cwd - Project directory (where package.json lives).
 * @returns {boolean}
 */
export function isCommandReachable(cmd, cwd) {
  if (!cmd || typeof cmd !== 'string') {
    return false;
  }
  const trimmed = cmd.trim();
  if (!trimmed) {
    return false;
  }
  const tokens = trimmed.split(/\s+/);
  const head = tokens[0];

  // npm / pnpm / yarn — try to find the script in package.json.
  if (head === 'npm' || head === 'pnpm' || head === 'yarn') {
    let scriptName;
    if (tokens[1] === 'run' && tokens[2]) {
      scriptName = tokens[2];
    } else if (tokens[1] && tokens[1] !== 'run') {
      // `npm test` is shorthand for `npm run test`.
      scriptName = tokens[1];
    }
    if (!scriptName) {
      return false;
    }
    const pkgPath = path.join(cwd, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      return false;
    }
    let pkg;
    try {
      pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    } catch {
      return false;
    }
    return Boolean(pkg.scripts && pkg.scripts[scriptName]);
  }

  // make targets — accept without further probing. Verifying the target
  // exists in a Makefile is brittle (multi-line rules, includes), and
  // doctor's job is to flag obvious misconfiguration, not to lint
  // arbitrary build systems.
  if (head === 'make') {
    return true;
  }

  // Plain binary — probe PATH.
  return isOnPath(head);
}

/**
 * `command -v <name>` style lookup. Returns true if the binary resolves.
 * Uses a child process rather than parsing PATH manually so PATHEXT and
 * Windows-style resolution work correctly.
 *
 * @param {string} bin
 * @returns {boolean}
 */
function isOnPath(bin) {
  if (!bin) {
    return false;
  }
  try {
    // `command -v` is a POSIX builtin — invoke through sh -c to use it.
    // Suppress all output; we only care about exit code.
    execFileSync(
      'sh',
      ['-c', `command -v ${shellQuote(bin)} >/dev/null 2>&1`],
      {
        stdio: 'ignore',
      }
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Minimal POSIX-shell quoter for a single token. Doctor only feeds
 * binary names to this helper, but be conservative anyway.
 *
 * @param {string} s
 * @returns {string}
 */
function shellQuote(s) {
  if (/^[A-Za-z0-9_@%+:,./=-]+$/.test(s)) {
    return s;
  }
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

/**
 * Map a detection-script output to the schema's tracker enum value.
 * detect-task-system.sh emits Title-cased strings ("GitHub", "Jira",
 * etc.) plus `markdown_only` and `unknown`.
 *
 * @param {string} raw
 * @returns {string|null}
 */
function normalizeTrackerOutput(raw) {
  if (!raw) {
    return null;
  }
  const lower = raw.trim().toLowerCase();
  if (lower === 'unknown') {
    return null;
  }
  // Schema enum values: github, beads, jira, linear, markdown_only.
  return lower;
}

/**
 * Append a row to the report buffer. Aligns label/value/icon visually
 * but stays single-line per row to match Reaper's visual vocabulary.
 *
 * @param {string[]} buf - Report buffer being built.
 * @param {CheckRow} row
 */
function pushRow(buf, row) {
  const icon =
    row.status === 'ok'
      ? ICON_OK
      : row.status === 'warn'
        ? ICON_WARN
        : ICON_ERR;
  const label = padRight(`${row.label}:`, 14);
  const value = padRight(row.value, 28);
  const note = row.note ? `  ${row.note}` : '';
  buf.push(`${label} ${value} ${icon}${note}`);
}

/**
 * Right-pad a string to a fixed width. Avoids depending on
 * String.prototype.padEnd for clarity at small widths.
 *
 * @param {string} s
 * @param {number} width
 * @returns {string}
 */
function padRight(s, width) {
  const str = String(s);
  if (str.length >= width) {
    return str;
  }
  return str + ' '.repeat(width - str.length);
}

/**
 * Run all doctor checks and produce a report.
 *
 * @param {object} opts
 * @param {string} opts.cwd            - Project directory.
 * @param {string} opts.configPath     - Path to .reaper.yml.
 * @param {string} opts.schemaPath     - Path to reaper.schema.json.
 * @param {string} opts.defaultsPath   - Path to defaults.yml.
 * @returns {{exitCode:number, errors:number, warnings:number, report:string}}
 */
export function runDoctor({ cwd, configPath, schemaPath, defaultsPath }) {
  const buf = [];
  let errors = 0;
  let warnings = 0;

  buf.push('REAPER // DOCTOR');
  buf.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // --------------------------------------------------------------------
  // Config file existence
  // --------------------------------------------------------------------
  if (!fs.existsSync(configPath)) {
    buf.push(`Config:        not found at ${configPath}        ${ICON_ERR}`);
    buf.push('');
    buf.push(
      'Status: 1 error, 0 warnings. Run /reaper:init to create .reaper.yml.'
    );
    return {
      exitCode: 1,
      errors: 1,
      warnings: 0,
      report: buf.join('\n') + '\n',
    };
  }

  // --------------------------------------------------------------------
  // Schema validation
  // --------------------------------------------------------------------
  let validation;
  let configData = {};
  try {
    validation = validateConfigFile(configPath, schemaPath);
  } catch (err) {
    buf.push(`Config:        ${configPath}        ${ICON_ERR}`);
    buf.push(
      `Schema:        cannot validate (${err.message})        ${ICON_ERR}`
    );
    buf.push('');
    buf.push('Status: 1 error, 0 warnings.');
    return {
      exitCode: 1,
      errors: 1,
      warnings: 0,
      report: buf.join('\n') + '\n',
    };
  }

  // Re-parse for our own field reads. validateConfigFile returns
  // findings only; it doesn't expose the parsed document.
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = YAML.parse(raw);
    if (parsed && typeof parsed === 'object') {
      configData = parsed;
    }
  } catch {
    // Already accounted for in validation errors.
  }

  const version = configData.version;
  pushRow(buf, {
    label: 'Config',
    value: `.reaper.yml${version ? ` (v${version})` : ''}`,
    status: 'ok',
  });

  if (validation.errors.length > 0) {
    errors += validation.errors.length;
    pushRow(buf, {
      label: 'Schema',
      value: `${validation.errors.length} error${validation.errors.length === 1 ? '' : 's'}`,
      status: 'err',
    });
    for (const e of validation.errors) {
      buf.push(`  - ${e.field}: ${e.message}`);
    }
  } else {
    pushRow(buf, {
      label: 'Schema',
      value: 'valid',
      status: 'ok',
    });
  }

  if (validation.warnings.length > 0) {
    warnings += validation.warnings.length;
    pushRow(buf, {
      label: 'Schema warn',
      value: `${validation.warnings.length} unknown key${validation.warnings.length === 1 ? '' : 's'}`,
      status: 'warn',
    });
    for (const w of validation.warnings) {
      buf.push(`  - ${w.field}: ${w.message}`);
    }
  }

  // --------------------------------------------------------------------
  // Resolution sources for top-level keys
  // --------------------------------------------------------------------
  const trackerSystem = configData.tracker && configData.tracker.system;
  if (trackerSystem) {
    pushRow(buf, {
      label: 'Tracker',
      value: `${trackerSystem} (configured)`,
      status: 'ok',
    });
  } else {
    pushRow(buf, {
      label: 'Tracker',
      value: '(not configured)',
      status: 'err',
      note: 'tracker.system is required',
    });
    // Counted under schema errors already if missing. Don't double-count.
  }

  // --------------------------------------------------------------------
  // Reachability of test.cmd / lint.cmd
  // --------------------------------------------------------------------
  const testCmd = configData.test && configData.test.cmd;
  if (testCmd) {
    if (isCommandReachable(testCmd, cwd)) {
      pushRow(buf, {
        label: 'Test command',
        value: testCmd,
        status: 'ok',
        note: 'resolves',
      });
    } else {
      errors += 1;
      pushRow(buf, {
        label: 'Test command',
        value: testCmd,
        status: 'err',
        note: 'does not resolve — script or binary missing',
      });
    }
  } else if (validation.errors.length === 0) {
    // Only flag this if the schema didn't already catch it (it should).
    warnings += 1;
    pushRow(buf, {
      label: 'Test command',
      value: '(not configured)',
      status: 'warn',
    });
  }

  const lintCmd = configData.lint && configData.lint.cmd;
  if (lintCmd) {
    if (isCommandReachable(lintCmd, cwd)) {
      pushRow(buf, {
        label: 'Lint command',
        value: lintCmd,
        status: 'ok',
        note: 'resolves',
      });
    } else {
      errors += 1;
      pushRow(buf, {
        label: 'Lint command',
        value: lintCmd,
        status: 'err',
        note: 'does not resolve — script or binary missing',
      });
    }
  } else if (validation.errors.length === 0) {
    warnings += 1;
    pushRow(buf, {
      label: 'Lint command',
      value: '(not configured)',
      status: 'warn',
    });
  }

  // --------------------------------------------------------------------
  // Coverage threshold — surface whether it's user-set or default.
  // --------------------------------------------------------------------
  const coverageResolution = resolveKey({
    key: 'coverage.threshold',
    userConfigPath: configPath,
    defaultsPath,
  });
  if (coverageResolution.found) {
    const fromUser = coverageResolution.source === 'user';
    pushRow(buf, {
      label: 'Coverage',
      value: `${coverageResolution.value}%${fromUser ? '' : ' (default)'}`,
      status: fromUser ? 'ok' : 'warn',
      note: fromUser
        ? undefined
        : 'using bundled default — set in .reaper.yml to override',
    });
    if (!fromUser) {
      warnings += 1;
    }
  }

  // --------------------------------------------------------------------
  // Optional E2E test command
  // --------------------------------------------------------------------
  const e2eCmd = configData.test && configData.test.cmd_e2e;
  if (e2eCmd) {
    if (isCommandReachable(e2eCmd, cwd)) {
      pushRow(buf, {
        label: 'E2E command',
        value: e2eCmd,
        status: 'ok',
        note: 'resolves',
      });
    } else {
      warnings += 1;
      pushRow(buf, {
        label: 'E2E command',
        value: e2eCmd,
        status: 'warn',
        note: 'does not resolve — script or binary missing',
      });
    }
  } else {
    pushRow(buf, {
      label: 'E2E command',
      value: '(not configured)',
      status: 'warn',
      note: 'optional — run /reaper:init to set',
    });
    warnings += 1;
  }

  // --------------------------------------------------------------------
  // Drift detection — what would detection scripts propose today?
  // --------------------------------------------------------------------
  buf.push('Detection drift:');

  const fixtureCommits = path.join(cwd, 'commits.txt');
  const fixture = fs.existsSync(fixtureCommits) ? fixtureCommits : undefined;

  // test.cmd drift
  if (testCmd) {
    const detected = runDetectScript('detect-test-cmd', cwd);
    if (detected && detected !== testCmd) {
      warnings += 1;
      buf.push(
        `  test.cmd:    configured "${testCmd}" but detection suggests "${detected}"  ${ICON_WARN}`
      );
    } else if (detected) {
      buf.push(`  test.cmd:    configured matches detected   ${ICON_OK}`);
    }
  }

  // lint.cmd drift
  if (lintCmd) {
    const detected = runDetectScript('detect-lint-cmd', cwd);
    if (detected && detected !== lintCmd) {
      warnings += 1;
      buf.push(
        `  lint.cmd:    configured "${lintCmd}" but detection suggests "${detected}"  ${ICON_WARN}`
      );
    } else if (detected) {
      buf.push(`  lint.cmd:    configured matches detected   ${ICON_OK}`);
    }
  }

  // tracker drift
  if (trackerSystem) {
    const detectedRaw = runDetectScript('detect-task-system', cwd, { fixture });
    const detected = normalizeTrackerOutput(detectedRaw);
    if (detected && detected !== trackerSystem) {
      warnings += 1;
      buf.push(
        `  tracker:     configured "${trackerSystem}" but commit history suggests ${detected}  ${ICON_WARN}`
      );
    } else if (detected) {
      buf.push(`  tracker:     configured matches detected   ${ICON_OK}`);
    }
  }

  // --------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------
  buf.push('');
  const errorWord = errors === 1 ? 'error' : 'errors';
  const warningWord = warnings === 1 ? 'warning' : 'warnings';
  const tail =
    errors > 0
      ? ' Fix errors before relying on Reaper for this project.'
      : warnings > 0
        ? ' Run /reaper:init to address warnings.'
        : ' All checks passed.';
  buf.push(
    `Status: ${warnings} ${warningWord}, ${errors} ${errorWord}.${tail}`
  );

  return {
    exitCode: errors > 0 ? 1 : 0,
    errors,
    warnings,
    report: buf.join('\n') + '\n',
  };
}

/* node:coverage disable */
function main() {
  const argv = process.argv.slice(2);
  const positional = argv.filter((a) => !a.startsWith('--'));
  const configPath = positional[0]
    ? path.resolve(positional[0])
    : path.resolve(process.cwd(), '.reaper.yml');
  // When a config path is given, anchor cwd to its directory so that
  // detection scripts probe alongside the config — not against
  // process.cwd(), which may be unrelated when doctor.sh is invoked
  // from inside the Reaper plugin tree.
  const cwd = positional[0] ? path.dirname(configPath) : process.cwd();
  const schemaPath = path.resolve(__dirname, '..', 'reaper.schema.json');
  const defaultsPath = process.env.REAPER_DEFAULTS_PATH
    ? path.resolve(process.env.REAPER_DEFAULTS_PATH)
    : path.resolve(__dirname, '..', 'defaults.yml');

  const result = runDoctor({ cwd, configPath, schemaPath, defaultsPath });
  process.stdout.write(result.report);
  process.exit(result.exitCode);
}

if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1] === __filename
) {
  main();
}
/* node:coverage enable */
