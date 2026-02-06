/**
 * @fileoverview Test helpers for Reaper build system tests.
 *
 * Provides utilities for resetting module-level mutable state in build.js
 * and stubbing process.exit to prevent test runner termination.
 *
 * @example
 * const { resetBuildState, stubProcessExit } = require('./test-helpers');
 * const { beforeEach, afterEach } = require('node:test');
 *
 * beforeEach(() => {
 *   resetBuildState();
 * });
 *
 * // In a test that exercises code calling process.exit:
 * it('should exit on invalid type', () => {
 *   const restore = stubProcessExit();
 *   try {
 *     parseArgs(['--type=bogus']);
 *     assert.fail('Expected process.exit to be called');
 *   } catch (err) {
 *     assert.strictEqual(err.code, 1);
 *   } finally {
 *     restore();
 *   }
 * });
 */

const path = require('path');
const { config, stats } = require('./build');

/**
 * Resets the mutable `config` and `stats` singletons in build.js
 * to their initial default values.
 *
 * Call this in a `beforeEach` hook to prevent state leaking between tests.
 * Does not modify the `config.rootDir` or `config.srcDir` paths since those
 * are derived from `__dirname` of build.js and should remain stable.
 */
function resetBuildState() {
  // Reset config to defaults (preserve path-based values that depend on build.js location)
  config.watch = false;
  config.type = null;
  config.verbose = false;
  config.rootDir = path.resolve(__dirname, '..');
  config.srcDir = path.resolve(__dirname, '..', 'src');

  // Reset stats to defaults
  stats.success = 0;
  stats.errors = 0;
  stats.skipped = 0;
  stats.errorMessages = [];
}

/**
 * Replaces `process.exit` with a function that throws a `ProcessExitError`
 * instead of terminating the process. This allows tests to assert on exit
 * codes from functions like `loadEjs`, `loadChokidar`, and `parseArgs`.
 *
 * @returns {Function} A restore function that reinstates the original
 *   `process.exit`. Always call this in a `finally` block or `afterEach`.
 *
 * @example
 * const restore = stubProcessExit();
 * try {
 *   someCodeThatCallsProcessExit();
 * } catch (err) {
 *   assert.strictEqual(err.code, 1);
 *   assert.strictEqual(err.name, 'ProcessExitError');
 * } finally {
 *   restore();
 * }
 */
function stubProcessExit() {
  const originalExit = process.exit;

  process.exit = function stubbedExit(code) {
    const err = new Error(`process.exit called with code ${code}`);
    err.name = 'ProcessExitError';
    err.code = code;
    throw err;
  };

  return function restore() {
    process.exit = originalExit;
  };
}

module.exports = {
  resetBuildState,
  stubProcessExit,
};
