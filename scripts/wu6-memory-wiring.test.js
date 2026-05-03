/**
 * @fileoverview WU6 wiring tests for subagent memory in specialty agents.
 *
 * Validates that the five specialty agents in this batch carry the
 * `memory: project` frontmatter field and render the role-flavored
 * memory-guidance partial after the EJS build runs.
 *
 * Role assignments for this batch:
 *   - principal-engineer    -> reviewer
 *   - security-auditor      -> reviewer
 *   - performance-engineer  -> reviewer
 *   - ai-prompt-engineer    -> craft
 *   - claude-agent-architect -> craft
 *
 * These assertions consume the generated agent markdown on disk. Run after
 * `npm run build`. The test does not invoke the build itself — it asserts
 * against the post-build artifact, which is also what Claude Code consumes.
 *
 * @example
 * npm run build && node --test scripts/wu6-memory-wiring.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const AGENTS_DIR = path.join(ROOT, 'agents');

// Reviewer-role specialty agents in this batch.
const REVIEWER_AGENTS = [
  'principal-engineer',
  'security-auditor',
  'performance-engineer',
];

// Craft-role specialty agents in this batch.
const CRAFT_AGENTS = ['ai-prompt-engineer', 'claude-agent-architect'];

const ALL_AGENTS = [...REVIEWER_AGENTS, ...CRAFT_AGENTS];

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

const OPS_MARKERS = ['recurring incident root cause', 'production quirk'];

const EXECUTOR_MARKERS = [
  'You usually do not write to memory',
  'orchestrator owns the workflow knowledge',
];

describe('WU6 — specialty agents carry memory: project frontmatter', () => {
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

describe('WU6 — specialty agents render Subagent Memory section', () => {
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

describe('WU6 — reviewer agents render reviewer-role memory guidance', () => {
  for (const name of REVIEWER_AGENTS) {
    it(`agents/${name}.md renders reviewer-specific bullets`, () => {
      const contents = readAgent(name);
      const { body } = splitFrontmatter(contents);
      for (const marker of REVIEWER_MARKERS) {
        assert.ok(
          body.includes(marker),
          `Expected reviewer marker "${marker}" in body of ${name}.md — wrong role passed to memory-guidance partial?`
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
        ...CRAFT_MARKERS,
        ...OPS_MARKERS,
        ...EXECUTOR_MARKERS,
      ];
      for (const marker of wrongMarkers) {
        assert.ok(
          !body.includes(marker),
          `Unexpected non-reviewer marker "${marker}" found in body of ${name}.md`
        );
      }
    });
  }
});

describe('WU6 — craft agents render craft-role memory guidance', () => {
  for (const name of CRAFT_AGENTS) {
    it(`agents/${name}.md renders craft-specific bullets`, () => {
      const contents = readAgent(name);
      const { body } = splitFrontmatter(contents);
      for (const marker of CRAFT_MARKERS) {
        assert.ok(
          body.includes(marker),
          `Expected craft marker "${marker}" in body of ${name}.md — wrong role passed to memory-guidance partial?`
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
        ...OPS_MARKERS,
        ...EXECUTOR_MARKERS,
      ];
      for (const marker of wrongMarkers) {
        assert.ok(
          !body.includes(marker),
          `Unexpected non-craft marker "${marker}" found in body of ${name}.md`
        );
      }
    });
  }
});
