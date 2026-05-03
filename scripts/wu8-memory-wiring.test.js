/**
 * @fileoverview WU8 wiring tests for subagent memory in executor agents.
 *
 * Validates that the two executor agents in this batch carry the
 * `memory: project` frontmatter field and render the executor-flavored
 * memory-guidance partial after the EJS build runs.
 *
 * Role assignments for this batch:
 *   - test-runner    -> executor
 *   - branch-manager -> executor
 *
 * The executor role's memory guidance is intentionally restrictive: these
 * agents are mechanical executors of orchestrator instructions and the
 * partial tells them they usually do not write to memory. The wiring test
 * still confirms `memory: project` is enabled and the executor-only marker
 * phrases render — the SDK auto-enables Read/Write/Edit when the field is
 * present, but the prompt-level guidance constrains usage.
 *
 * These assertions consume the generated agent markdown on disk. Run after
 * `npm run build`. The test does not invoke the build itself — it asserts
 * against the post-build artifact, which is also what Claude Code consumes.
 *
 * @example
 * npm run build && node --test scripts/wu8-memory-wiring.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const AGENTS_DIR = path.join(ROOT, 'agents');

// Executor-role agents in this batch.
const EXECUTOR_AGENTS = ['test-runner', 'branch-manager'];

const ALL_AGENTS = [...EXECUTOR_AGENTS];

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

// Role-specific phrases that appear verbatim in
// src/partials/memory-guidance.ejs for the executor branch. They prove the
// partial was rendered with the correct `role` parameter. Other roles emit
// different phrases.
const EXECUTOR_MARKERS = [
  'You usually do not write to memory',
  'orchestrator owns the workflow knowledge',
  'recurring orchestrator misuse pattern',
];

// Markers from OTHER roles — these must NOT appear in renders for the
// targeted role. Catches accidentally passing the wrong role string.
const IMPLEMENTER_MARKERS = [
  'recurring root-cause class',
  'non-obvious debugging trap',
  'validated fix shape',
];

const ARCHITECT_MARKERS = [
  'trade-off decision',
  'convention you established',
  'non-obvious coupling',
];

const PLANNER_MARKERS = [
  'decomposition heuristic',
  'parallelization signal',
  'scope-creep trap',
];

const REVIEWER_MARKERS = [
  'codebase-specific false positive',
  'accepted code smell',
  'security pattern this codebase already mitigates',
];

const CRAFT_MARKERS = [
  'prompt anti-pattern this repo',
  'doc style decision',
  'token-waste pattern',
];

const OPS_MARKERS = [
  'recurring incident root cause',
  'production quirk',
  'deployment failure mode',
];

describe('WU8 — executor agents carry memory: project frontmatter', () => {
  for (const name of ALL_AGENTS) {
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

describe('WU8 — executor agents render Subagent Memory section', () => {
  const HEADER = '## Subagent Memory';

  for (const name of ALL_AGENTS) {
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

describe('WU8 — executor agents render executor-role memory guidance', () => {
  for (const name of EXECUTOR_AGENTS) {
    it(`agents/${name}.md renders executor-specific bullets`, () => {
      const contents = readAgent(name);
      const { body } = splitFrontmatter(contents);
      for (const marker of EXECUTOR_MARKERS) {
        assert.ok(
          body.includes(marker),
          `Expected executor marker "${marker}" in body of ${name}.md — wrong role passed to memory-guidance partial?`
        );
      }
    });

    it(`agents/${name}.md does NOT render markers from other roles`, () => {
      const contents = readAgent(name);
      const { body } = splitFrontmatter(contents);
      const wrongMarkers = [
        ...IMPLEMENTER_MARKERS,
        ...ARCHITECT_MARKERS,
        ...PLANNER_MARKERS,
        ...REVIEWER_MARKERS,
        ...CRAFT_MARKERS,
        ...OPS_MARKERS,
      ];
      for (const marker of wrongMarkers) {
        assert.ok(
          !body.includes(marker),
          `Unexpected non-executor marker "${marker}" found in body of ${name}.md`
        );
      }
    });
  }
});
