/**
 * @fileoverview WU5 wiring tests for subagent memory in architect agents (batch B).
 *
 * Validates that the five remaining architect agents
 * (observability-architect, frontend-architect, data-engineer,
 * test-strategist, compliance-architect) carry the `memory: project`
 * frontmatter field and render the architect-flavored memory-guidance partial
 * after the EJS build runs.
 *
 * These assertions consume the generated agent markdown on disk. Run after
 * `npm run build`. The test does not invoke the build itself — it asserts
 * against the post-build artifact, which is also what Claude Code consumes.
 *
 * @example
 * npm run build && node --test scripts/wu5-memory-wiring.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const AGENTS_DIR = path.join(ROOT, 'agents');

// Architect agents (batch B) — must carry architect-role memory guidance.
const ARCHITECT_AGENTS = [
  'observability-architect',
  'frontend-architect',
  'data-engineer',
  'test-strategist',
  'compliance-architect',
];

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

// Role-specific bullet phrases that appear verbatim in
// src/partials/memory-guidance.ejs. They prove the partial was rendered with
// the correct `role` parameter. Other roles emit different phrases.
const ARCHITECT_MARKERS = [
  'trade-off decision',
  'convention you established',
  'non-obvious coupling',
];

// Markers from OTHER roles — these must NOT appear in architect renders.
// Catches accidentally passing the wrong role string.
const PLANNER_MARKERS = [
  'decomposition heuristic',
  'parallelization signal',
  'scope-creep trap',
];

const IMPLEMENTER_MARKERS = [
  'recurring root-cause class',
  'non-obvious debugging trap',
  'validated fix shape',
];

const REVIEWER_MARKERS = [
  'codebase-specific false positive',
  'accepted code smell',
];

const CRAFT_MARKERS = ['prompt anti-pattern this repo', 'token-waste pattern'];

const OPS_MARKERS = ['recurring incident root cause', 'production quirk'];

const EXECUTOR_MARKERS = [
  'You usually do not write to memory',
  'orchestrator owns the workflow knowledge',
];

describe('WU5 — architect agents (batch B) carry memory: project frontmatter', () => {
  for (const name of ARCHITECT_AGENTS) {
    it(`agents/${name}.md frontmatter contains \`memory: project\``, () => {
      const contents = readAgent(name);
      const { frontmatter } = splitFrontmatter(contents);
      assert.ok(
        /^memory:\s*project\s*$/m.test(frontmatter),
        `Expected \`memory: project\` line in frontmatter of ${name}.md`
      );
    });
  }
});

describe('WU5 — architect agents (batch B) render Subagent Memory section', () => {
  const HEADER = '## Subagent Memory';

  for (const name of ARCHITECT_AGENTS) {
    it(`agents/${name}.md renders the Subagent Memory section`, () => {
      const contents = readAgent(name);
      const { body } = splitFrontmatter(contents);
      assert.ok(
        body.includes(HEADER),
        `Expected "${HEADER}" heading in body of ${name}.md`
      );
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

describe('WU5 — architect agents (batch B) render architect-role memory guidance', () => {
  for (const name of ARCHITECT_AGENTS) {
    it(`agents/${name}.md renders architect-specific bullets`, () => {
      const contents = readAgent(name);
      const { body } = splitFrontmatter(contents);
      for (const marker of ARCHITECT_MARKERS) {
        assert.ok(
          body.includes(marker),
          `Expected architect marker "${marker}" in body of ${name}.md — wrong role passed to memory-guidance partial?`
        );
      }
    });

    it(`agents/${name}.md does NOT render markers from other roles`, () => {
      const contents = readAgent(name);
      const { body } = splitFrontmatter(contents);
      const wrongMarkers = [
        ...IMPLEMENTER_MARKERS,
        ...PLANNER_MARKERS,
        ...REVIEWER_MARKERS,
        ...CRAFT_MARKERS,
        ...OPS_MARKERS,
        ...EXECUTOR_MARKERS,
      ];
      for (const marker of wrongMarkers) {
        assert.ok(
          !body.includes(marker),
          `Unexpected non-architect marker "${marker}" found in body of ${name}.md`
        );
      }
    });
  }
});
