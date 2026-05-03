/**
 * @fileoverview WU3 wiring tests for subagent memory in coding agents.
 *
 * Validates that the three coding agents (bug-fixer, feature-developer,
 * refactoring-dev) carry the `memory: project` frontmatter field and render
 * the implementer-flavored memory-guidance partial after the EJS build runs.
 *
 * These assertions consume the generated agent markdown on disk. Run after
 * `npm run build`. The test does not invoke the build itself — it asserts
 * against the post-build artifact, which is also what Claude Code consumes.
 *
 * @example
 * npm run build && node --test scripts/wu3-memory-wiring.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const AGENTS_DIR = path.join(ROOT, 'agents');

// Coding agents that must carry implementer-role memory guidance.
const TARGET_AGENTS = ['bug-fixer', 'feature-developer', 'refactoring-dev'];

/**
 * Reads a generated agent markdown file from the agents/ directory.
 * @param {string} name - Agent base name (no extension)
 * @returns {string} File contents
 */
function readAgent(name) {
  const filePath = path.join(AGENTS_DIR, `${name}.md`);
  assert.ok(
    fs.existsSync(filePath),
    `Expected generated agent file at ${filePath} — run \`npm run build\` first`
  );
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Splits a generated agent file into [frontmatter, body] using the YAML
 * delimiter. Throws if the file does not start with `---`.
 * @param {string} contents - Full file contents
 * @returns {{frontmatter: string, body: string}}
 */
function splitFrontmatter(contents) {
  assert.ok(
    contents.startsWith('---\n'),
    'Generated agent must begin with YAML frontmatter delimiter'
  );
  const closing = contents.indexOf('\n---', 4);
  assert.ok(
    closing > 0,
    'Generated agent must have a closing YAML frontmatter delimiter'
  );
  return {
    frontmatter: contents.slice(4, closing),
    body: contents.slice(closing + 4),
  };
}

describe('WU3 — coding agents carry memory: project frontmatter', () => {
  for (const name of TARGET_AGENTS) {
    it(`agents/${name}.md frontmatter contains \`memory: project\``, () => {
      const contents = readAgent(name);
      const { frontmatter } = splitFrontmatter(contents);
      // Match the field on its own line in the YAML block. Anchor to a line
      // boundary so we never accidentally match prose in the body.
      assert.ok(
        /^memory:\s*project\s*$/m.test(frontmatter),
        `Expected \`memory: project\` line in frontmatter of ${name}.md`
      );
    });
  }
});

describe('WU3 — coding agents render implementer memory-guidance partial', () => {
  // Section header from memory-guidance.ejs — present in every valid render.
  const HEADER = '## Subagent Memory';

  // Implementer-only bullet phrases that appear verbatim in the partial.
  // These prove the partial was rendered with `role: 'implementer'` and not
  // some other role (architect/planner/reviewer/etc emit different bullets).
  const IMPLEMENTER_MARKERS = [
    'recurring root-cause class',
    'non-obvious debugging trap',
    'validated fix shape',
  ];

  for (const name of TARGET_AGENTS) {
    it(`agents/${name}.md renders the Subagent Memory section`, () => {
      const contents = readAgent(name);
      const { body } = splitFrontmatter(contents);
      assert.ok(
        body.includes(HEADER),
        `Expected "${HEADER}" heading in body of ${name}.md`
      );
    });

    it(`agents/${name}.md renders implementer-specific bullets`, () => {
      const contents = readAgent(name);
      const { body } = splitFrontmatter(contents);
      for (const marker of IMPLEMENTER_MARKERS) {
        assert.ok(
          body.includes(marker),
          `Expected implementer marker "${marker}" in body of ${name}.md — wrong role passed to memory-guidance partial?`
        );
      }
    });

    it(`agents/${name}.md does not contain the loud-failure error directive`, () => {
      const contents = readAgent(name);
      assert.ok(
        !/invalid memory-guidance include/i.test(contents),
        `${name}.md contains the memory-guidance error directive — the partial was included without a valid role`
      );
    });
  }
});
