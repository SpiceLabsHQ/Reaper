'use strict';

/**
 * @fileoverview Tests for scripts/detect-task-system.sh
 *
 * Uses two test seams built into the script:
 *   DETECT_FIXTURE   - path to a fixture file that replaces git log output
 *   DETECT_PLANS_DIR - path to a directory that replaces .claude/plans/
 *
 * Fixture files live in scripts/fixtures/detect-task-system/ and contain
 * commit bodies separated by ===COMMIT=== markers, newest first.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const SCRIPT = path.resolve(__dirname, 'detect-task-system.sh');
const FIXTURES_DIR = path.resolve(__dirname, 'fixtures/detect-task-system');

/**
 * Run the detection script with the given fixture file and plans directory.
 *
 * @param {string} fixtureFile - Filename within fixtures/detect-task-system/
 * @param {string} plansDir    - Path to use as DETECT_PLANS_DIR
 * @returns {string} The script's stdout, trimmed
 */
function detect(fixtureFile, plansDir) {
  const result = spawnSync(SCRIPT, [], {
    encoding: 'utf8',
    env: {
      ...process.env,
      DETECT_FIXTURE: path.join(FIXTURES_DIR, fixtureFile),
      DETECT_PLANS_DIR: plansDir,
    },
  });
  return result.stdout.trim();
}

describe('detect-task-system.sh', () => {
  let plansWithFiles;
  let emptyPlansDir;

  before(() => {
    plansWithFiles = fs.mkdtempSync(path.join(os.tmpdir(), 'reaper-plans-'));
    fs.writeFileSync(path.join(plansWithFiles, 'my-feature.md'), '# Plan');

    emptyPlansDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'reaper-plans-empty-')
    );
  });

  after(() => {
    fs.rmSync(plansWithFiles, { recursive: true });
    fs.rmSync(emptyPlansDir, { recursive: true });
  });

  describe('commit history detection', () => {
    it('detects GitHub when recent commits reference GitHub issues', () => {
      assert.equal(detect('github-majority.txt', emptyPlansDir), 'GitHub');
    });

    it('detects Beads when recent commits reference Beads issues', () => {
      assert.equal(detect('beads-majority.txt', emptyPlansDir), 'Beads');
    });

    it('detects Jira when recent commits reference Jira tickets', () => {
      assert.equal(detect('jira-majority.txt', emptyPlansDir), 'Jira');
    });

    it('recency weighting: 3 recent GitHub commits beat 4 older Beads commits', () => {
      // GitHub: positions 1-3, weights 10+9+8=27
      // Beads:  positions 4-7, weights 7+6+5+4=22
      // By raw count Beads would win (4 > 3); recency weighting gives GitHub the win
      assert.equal(detect('recency-beats-volume.txt', emptyPlansDir), 'GitHub');
    });

    it('falls through when commit scores are tied', () => {
      // GitHub: positions 1,4 → weights 10+7=17
      // Beads:  positions 2,3 → weights 9+8=17
      // Tie → no commit winner → falls through to plan file check
      assert.equal(detect('tied-scores.txt', emptyPlansDir), 'unknown');
    });
  });

  describe('plan file fallback', () => {
    it('returns markdown_only when no commit patterns but plan files exist', () => {
      assert.equal(detect('no-patterns.txt', plansWithFiles), 'markdown_only');
    });

    it('returns markdown_only when commit scores are tied but plan files exist', () => {
      assert.equal(detect('tied-scores.txt', plansWithFiles), 'markdown_only');
    });
  });

  describe('unknown fallback', () => {
    it('returns unknown when no commit patterns and no plan files', () => {
      assert.equal(detect('no-patterns.txt', emptyPlansDir), 'unknown');
    });
  });
});
