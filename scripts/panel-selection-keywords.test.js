/**
 * @fileoverview Contract tests for Panel Selection Keywords headers.
 *
 * Validates that all planning-category agent EJS templates use the
 * normalized "## Panel Selection Keywords" header format with the
 * required HTML comment above it, and that no legacy "huddle"
 * references remain in agent source templates.
 *
 * @example
 * node --test scripts/panel-selection-keywords.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '..');
const AGENTS_SRC_DIR = path.join(ROOT, 'src', 'agents');

// ---------------------------------------------------------------------------
// The 11 agent templates that must have Panel Selection Keywords
// ---------------------------------------------------------------------------

const PANEL_KEYWORD_AGENTS = [
  'api-designer.ejs',
  'cloud-architect.ejs',
  'compliance-architect.ejs',
  'data-engineer.ejs',
  'database-architect.ejs',
  'event-architect.ejs',
  'frontend-architect.ejs',
  'observability-architect.ejs',
  'technical-writer.ejs',
  'test-strategist.ejs',
  'workflow-planner.ejs',
];

const EXPECTED_COMMENT =
  '<!-- Used by /reaper:squadron to auto-select experts -->';
const EXPECTED_HEADER = '## Panel Selection Keywords';

// ---------------------------------------------------------------------------
// Contract: Panel Selection Keywords header format
// ---------------------------------------------------------------------------

describe('Contract: Panel Selection Keywords headers in agent templates', () => {
  for (const filename of PANEL_KEYWORD_AGENTS) {
    const filePath = path.join(AGENTS_SRC_DIR, filename);

    it(`${filename} exists`, () => {
      assert.ok(
        fs.existsSync(filePath),
        `Expected agent template ${filename} to exist at ${filePath}`
      );
    });

    it(`${filename} contains the normalized "## Panel Selection Keywords" header`, () => {
      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(
        content.includes(EXPECTED_HEADER),
        `${filename} is missing the normalized header: "${EXPECTED_HEADER}"`
      );
    });

    it(`${filename} has the HTML comment above the header`, () => {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const headerIndex = lines.findIndex(
        (line) => line.trim() === EXPECTED_HEADER
      );
      assert.ok(
        headerIndex > 0,
        `${filename} is missing the header "${EXPECTED_HEADER}"`
      );

      // The HTML comment should be on the line immediately before the header
      const commentLine = lines[headerIndex - 1].trim();
      assert.strictEqual(
        commentLine,
        EXPECTED_COMMENT,
        `${filename} line ${headerIndex} (above header) should be the HTML comment.\n` +
          `  Expected: "${EXPECTED_COMMENT}"\n` +
          `  Actual:   "${commentLine}"`
      );
    });

    it(`${filename} has no legacy "huddle" references`, () => {
      const content = fs.readFileSync(filePath, 'utf8');
      const huddleMatch = content.match(/huddle/i);
      assert.ok(
        huddleMatch === null,
        `${filename} still contains legacy "huddle" reference: "${huddleMatch?.[0]}"`
      );
    });
  }
});

// ---------------------------------------------------------------------------
// Contract: No "huddle" references anywhere in agent source templates
// ---------------------------------------------------------------------------

describe('Contract: zero "huddle" references across all agent templates', () => {
  it('no agent template in src/agents/ contains "huddle" (case-insensitive)', () => {
    const allAgentFiles = fs
      .readdirSync(AGENTS_SRC_DIR)
      .filter((f) => f.endsWith('.ejs'));
    const violations = [];

    for (const filename of allAgentFiles) {
      const content = fs.readFileSync(
        path.join(AGENTS_SRC_DIR, filename),
        'utf8'
      );
      if (/huddle/i.test(content)) {
        violations.push(filename);
      }
    }

    assert.strictEqual(
      violations.length,
      0,
      `Found "huddle" references in: ${violations.join(', ')}`
    );
  });
});
