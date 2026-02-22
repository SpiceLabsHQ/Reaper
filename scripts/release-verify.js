/**
 * @fileoverview Release version consistency verifier.
 *
 * Reads the version string from three canonical sources:
 *   - package.json          (version field)
 *   - .claude-plugin/plugin.json  (version field)
 *   - README.md             (shields.io badge: version-X.Y.Z-orange)
 *
 * Exits 0 when all three agree. Exits 1 with a clear diff report when any
 * file diverges, or when a required file is missing.
 *
 * @example
 * node scripts/release-verify.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/** Pattern matching the shields.io version badge used in README.md */
const BADGE_PATTERN = /version-(\d+\.\d+\.\d+(?:-[\w.]+)?)-orange/;

// ---------------------------------------------------------------------------
// Reader functions — each returns a version string or throws with a clear
// message identifying the file that caused the error.
// ---------------------------------------------------------------------------

/**
 * Reads the version field from package.json in the given root directory.
 *
 * @param {string} rootDir - Absolute path to the project root.
 * @returns {string} The semver string (e.g. "1.11.0").
 * @throws {Error} If the file is missing or has no version field.
 */
function readPackageVersion(rootDir) {
  const filePath = path.join(rootDir, 'package.json');

  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: package.json (looked in ${rootDir})`);
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (!data.version) {
    throw new Error(`No version field found in package.json`);
  }

  return data.version;
}

/**
 * Reads the version field from .claude-plugin/plugin.json in the given root
 * directory.
 *
 * @param {string} rootDir - Absolute path to the project root.
 * @returns {string} The semver string.
 * @throws {Error} If the file is missing or has no version field.
 */
function readPluginVersion(rootDir) {
  const filePath = path.join(rootDir, '.claude-plugin', 'plugin.json');

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Missing required file: .claude-plugin/plugin.json (looked in ${rootDir})`
    );
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (!data.version) {
    throw new Error(`No version field found in .claude-plugin/plugin.json`);
  }

  return data.version;
}

/**
 * Reads the version from the shields.io badge pattern in README.md.
 *
 * Expects a line matching: version-X.Y.Z-orange
 *
 * @param {string} rootDir - Absolute path to the project root.
 * @returns {string} The semver string extracted from the badge URL.
 * @throws {Error} If the file is missing or the badge pattern is not found.
 */
function readReadmeVersion(rootDir) {
  const filePath = path.join(rootDir, 'README.md');

  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: README.md (looked in ${rootDir})`);
  }

  const contents = fs.readFileSync(filePath, 'utf8');
  const match = contents.match(BADGE_PATTERN);

  if (!match) {
    throw new Error(
      `Version badge not found in README.md. Expected pattern: version-X.Y.Z-orange`
    );
  }

  return match[1];
}

/**
 * Reads the most recent git tag from the repository and returns the version
 * string (stripping a leading "v" if present).
 *
 * Accepts an optional executor function so tests can inject a fake without
 * spawning a real git process.
 *
 * @param {(cmd: string, opts: object) => Buffer} [execFn] - Command executor.
 *   Defaults to child_process.execSync.
 * @returns {string} The version string, e.g. "1.11.0".
 * @throws {Error} If git describe fails or no tags are found.
 */
function readGitTag(execFn) {
  const exec = execFn || execSync;

  let raw;
  try {
    raw = exec('git describe --tags --abbrev=0', { stdio: 'pipe' })
      .toString()
      .trim();
  } catch (err) {
    throw new Error(
      `No git tag found — run "git tag v<version>" before releasing. ` +
        `(git describe error: ${err.message})`,
      { cause: err }
    );
  }

  // Strip optional leading "v"
  return raw.replace(/^v/, '');
}

// ---------------------------------------------------------------------------
// Aggregation and reporting
// ---------------------------------------------------------------------------

/**
 * Collects versions from all three canonical sources.
 *
 * Returns a plain object keyed by logical file name. Propagates any error
 * thrown by the individual reader functions.
 *
 * @param {string} rootDir - Absolute path to the project root.
 * @returns {{ 'package.json': string, '.claude-plugin/plugin.json': string, 'README.md': string }}
 */
function collectVersions(rootDir) {
  return {
    'package.json': readPackageVersion(rootDir),
    '.claude-plugin/plugin.json': readPluginVersion(rootDir),
    'README.md': readReadmeVersion(rootDir),
  };
}

/**
 * Formats a human-readable mismatch report given a versions map.
 *
 * Returns an empty string when all versions are identical. Otherwise returns
 * a multi-line string listing each file and its version, clearly marking
 * which ones diverge from the majority.
 *
 * @param {{ [file: string]: string }} versions - Map of filename -> version.
 * @returns {string} Empty string on match, formatted diff report on mismatch.
 */
function formatMismatchReport(versions) {
  const entries = Object.entries(versions);
  const versionValues = entries.map(([, v]) => v);

  // Find the majority version (most common value)
  const counts = {};
  for (const v of versionValues) {
    counts[v] = (counts[v] || 0) + 1;
  }
  const majorityVersion = Object.keys(counts).sort(
    (a, b) => counts[b] - counts[a]
  )[0];

  const allMatch = versionValues.every((v) => v === majorityVersion);
  if (allMatch) {
    return '';
  }

  const lines = ['Version mismatch detected:\n'];
  for (const [file, version] of entries) {
    const marker = version !== majorityVersion ? '  [MISMATCH]' : '  [OK]     ';
    lines.push(`${marker}  ${file}: ${version}`);
  }
  lines.push('');
  lines.push(`Expected all files to report version: ${majorityVersion}`);

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Verifies that all three version sources agree, and that the agreed-upon
 * version matches the current git tag.
 *
 * Calls process.exit(0) on success and process.exit(1) with a clear report
 * on failure.
 *
 * @param {string} [rootDir] - Project root to check. Defaults to the repo
 *   root (two levels up from this script in scripts/).
 * @param {(cmd: string, opts: object) => Buffer} [execFn] - Optional executor
 *   injected for testing. Defaults to child_process.execSync.
 */
function verifyVersionConsistency(rootDir, execFn) {
  const root = rootDir || path.resolve(__dirname, '..');

  let versions;
  try {
    versions = collectVersions(root);
  } catch (err) {
    console.error(`release:verify failed — ${err.message}`);
    process.exit(1);
    return;
  }

  const report = formatMismatchReport(versions);

  if (report !== '') {
    console.error(report);
    process.exit(1);
    return;
  }

  const packageVersion = versions['package.json'];

  // Check git tag agreement. A missing or inaccessible git repo emits a
  // warning but does not fail — the caller may be running outside a git
  // context (e.g. a CI artifact check). A mismatched tag, however, is a
  // hard failure: it indicates the tag was not moved to match the release.
  let gitTag;
  try {
    gitTag = readGitTag(execFn);
  } catch (err) {
    console.warn(`release:verify warning — ${err.message}`);
    console.log(
      `release:verify passed — all files agree on version ${packageVersion} (git tag unavailable)`
    );
    process.exit(0);
    return;
  }

  if (gitTag !== packageVersion) {
    console.error(
      `release:verify failed — git tag mismatch:\n` +
        `  [MISMATCH]  git tag:      ${gitTag}\n` +
        `  [OK]        package.json: ${packageVersion}\n\n` +
        `Expected git tag v${packageVersion} to match package.json version.`
    );
    process.exit(1);
    return;
  }

  console.log(`release:verify passed — all files agree on version ${packageVersion}`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Exports (for testing) and CLI entry point
// ---------------------------------------------------------------------------

module.exports = {
  readPackageVersion,
  readPluginVersion,
  readReadmeVersion,
  readGitTag,
  collectVersions,
  formatMismatchReport,
  verifyVersionConsistency,
};

/* node:coverage disable */
if (require.main === module) {
  verifyVersionConsistency();
}
/* node:coverage enable */
