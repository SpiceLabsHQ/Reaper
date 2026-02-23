'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Extract the hook command live so tests always reflect the current hook. */
const HOOK_CMD = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../hooks/hooks.json'), 'utf8')
).hooks.PostToolUse[0].hooks[0].command;

/**
 * Write the hook command to a temp script and execute it as bash.
 *
 * @param {string|null} filePath - Value for CLAUDE_FILE_PATH.
 *   Pass '' to set it to an empty string.
 *   Pass null to leave it fully unset in the environment.
 * @param {string} cwd - Working directory for the hook process.
 */
function runHook(filePath, cwd) {
  const script = path.join(
    os.tmpdir(),
    `reaper-hook-${process.pid}-${Date.now()}.sh`
  );
  fs.writeFileSync(script, HOOK_CMD);

  const env = { ...process.env };
  if (filePath === null) {
    delete env.CLAUDE_FILE_PATH;
  } else {
    env.CLAUDE_FILE_PATH = filePath;
  }

  const result = spawnSync('bash', [script], { env, cwd });
  fs.unlinkSync(script);
  return result;
}

/**
 * Create a temporary "project" directory that looks like a JS project:
 * - .prettierrc  — so the hook's prettier branch fires
 * - app.js       — the "target" file (badly formatted)
 * - sentinel.js  — a second file that must NEVER be touched
 *
 * Returns paths so tests can read/assert on them.
 */
function makeFakeProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reaper-hook-'));
  fs.writeFileSync(path.join(dir, '.prettierrc'), '{}');

  const jsFile = path.join(dir, 'app.js');
  fs.writeFileSync(jsFile, 'const   x=1;\n');

  const sentinelFile = path.join(dir, 'sentinel.js');
  fs.writeFileSync(sentinelFile, 'const   y=2;\n');

  return { dir, jsFile, sentinelFile };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('PostToolUse formatter hook', () => {
  describe('empty CLAUDE_FILE_PATH guard', () => {
    it('exits 0 and does not modify any files when CLAUDE_FILE_PATH is empty string', () => {
      const { dir, jsFile, sentinelFile } = makeFakeProject();

      const jsBefore = fs.readFileSync(jsFile, 'utf8');
      const sentinelBefore = fs.readFileSync(sentinelFile, 'utf8');

      const result = runHook('', dir);

      assert.strictEqual(result.status, 0, 'hook must exit 0');
      assert.strictEqual(
        fs.readFileSync(jsFile, 'utf8'),
        jsBefore,
        'app.js must not be modified when CLAUDE_FILE_PATH is empty'
      );
      assert.strictEqual(
        fs.readFileSync(sentinelFile, 'utf8'),
        sentinelBefore,
        'sentinel.js must not be modified when CLAUDE_FILE_PATH is empty'
      );

      fs.rmSync(dir, { recursive: true });
    });

    it('exits 0 and does not modify any files when CLAUDE_FILE_PATH is unset', () => {
      const { dir, jsFile, sentinelFile } = makeFakeProject();

      const jsBefore = fs.readFileSync(jsFile, 'utf8');
      const sentinelBefore = fs.readFileSync(sentinelFile, 'utf8');

      const result = runHook(null, dir); // null = leave env var unset

      assert.strictEqual(result.status, 0, 'hook must exit 0');
      assert.strictEqual(
        fs.readFileSync(jsFile, 'utf8'),
        jsBefore,
        'app.js must not be modified when CLAUDE_FILE_PATH is unset'
      );
      assert.strictEqual(
        fs.readFileSync(sentinelFile, 'utf8'),
        sentinelBefore,
        'sentinel.js must not be modified when CLAUDE_FILE_PATH is unset'
      );

      fs.rmSync(dir, { recursive: true });
    });
  });

  describe('scoped formatting (valid CLAUDE_FILE_PATH)', () => {
    it('does not touch sentinel file when CLAUDE_FILE_PATH points to a specific file', () => {
      const { dir, jsFile, sentinelFile } = makeFakeProject();

      const sentinelBefore = fs.readFileSync(sentinelFile, 'utf8');

      runHook(jsFile, dir);

      assert.strictEqual(
        fs.readFileSync(sentinelFile, 'utf8'),
        sentinelBefore,
        'sentinel.js must never be modified even when a different file is targeted'
      );

      fs.rmSync(dir, { recursive: true });
    });

    it('exits 0 when no formatter config is present in CWD', () => {
      const dir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'reaper-hook-noconfig-')
      );
      const tmpFile = path.join(dir, 'some.md');
      fs.writeFileSync(tmpFile, '# content\n');
      // No .prettierrc, biome.json, or .eslintrc — the hook should fall through cleanly

      const result = runHook(tmpFile, dir);

      assert.strictEqual(
        result.status,
        0,
        'hook must exit 0 when no formatter is configured'
      );

      fs.rmSync(dir, { recursive: true });
    });
  });
});
