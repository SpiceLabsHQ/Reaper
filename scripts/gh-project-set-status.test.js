'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// ─── Constants ──────────────────────────────────────────────────────────────

const SCRIPT_PATH = path.join(
  __dirname,
  '..',
  'src',
  'skills',
  'issue-tracker-github',
  'scripts',
  'gh-project-set-status.sh'
);

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Create a temporary directory with a mock `gh` script that returns
 * canned responses for `gh api graphql` and `gh issue view` calls.
 *
 * @param {Object} opts
 * @param {Object[]} opts.responses - Array of { match, stdout, stderr, exitCode }
 *   Each response is consumed in order when `gh` is called. `match` is an
 *   optional regex string to validate the arguments passed to the mock gh.
 * @returns {{ dir: string, ghLog: string }} Temp dir and path to the gh call log
 */
function createMockEnv(opts = {}) {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'reaper-gh-project-test-')
  );
  const binDir = path.join(dir, 'bin');
  fs.mkdirSync(binDir);

  const ghLog = path.join(dir, 'gh-calls.log');
  const responsesFile = path.join(dir, 'responses.json');
  const counterFile = path.join(dir, 'call-counter');

  fs.writeFileSync(responsesFile, JSON.stringify(opts.responses || []));
  fs.writeFileSync(counterFile, '0');

  // Create a node-based mock `gh` that reads from the responses array.
  // Uses node directly to avoid bash set -e issues with exit codes.
  const mockGh = `#!/usr/bin/env node
const fs = require('fs');
const responsesFile = '${responsesFile}';
const counterFile = '${counterFile}';
const logFile = '${ghLog}';

// Log the call
fs.appendFileSync(logFile, process.argv.slice(2).join(' ') + '\\n');

// Read state
const responses = JSON.parse(fs.readFileSync(responsesFile, 'utf8'));
const i = parseInt(fs.readFileSync(counterFile, 'utf8'));

// Increment counter immediately
fs.writeFileSync(counterFile, String(i + 1));

if (i >= responses.length) {
  process.stderr.write('Mock gh: no response configured for call index ' + i + '\\n');
  process.exit(1);
}

const r = responses[i];
if (r.stdout) process.stdout.write(r.stdout);
if (r.stderr) process.stderr.write(r.stderr);
process.exit(r.exitCode || 0);
`;

  const ghPath = path.join(binDir, 'gh');
  fs.writeFileSync(ghPath, mockGh, { mode: 0o755 });

  return { dir, binDir, ghLog };
}

/**
 * Run the gh-project-set-status.sh script with mock gh on PATH.
 *
 * @param {string[]} args - Script arguments
 * @param {string} binDir - Path to directory containing mock gh
 * @returns {import('child_process').SpawnSyncReturns<Buffer>}
 */
function runScript(args, binDir) {
  const env = {
    ...process.env,
    PATH: `${binDir}:${process.env.PATH}`,
  };

  return spawnSync('bash', [SCRIPT_PATH, ...args], {
    env,
    timeout: 10000,
    encoding: 'utf8',
  });
}

/**
 * Clean up temporary directory.
 */
function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ─── Mock response builders ────────────────────────────────────────────────

/**
 * Build a mock response for `gh issue view` that returns a repo + issue node ID.
 */
function issueViewResponse(nodeId, repoOwner = 'testowner', repoName = 'testrepo') {
  return {
    stdout: JSON.stringify({
      id: nodeId,
      url: `https://github.com/${repoOwner}/${repoName}/issues/1`,
      repository: { owner: { login: repoOwner }, name: repoName },
    }),
    exitCode: 0,
  };
}

/**
 * Build a mock response for the project items query.
 * Returns project items linked to the issue's repository.
 */
function projectItemsResponse(items = []) {
  return {
    stdout: JSON.stringify({
      data: {
        node: {
          projectItems: {
            nodes: items,
          },
        },
      },
    }),
    exitCode: 0,
  };
}

/**
 * Build a project item with a status field.
 */
function projectItem({
  itemId = 'PVTI_item1',
  projectId = 'PVT_proj1',
  projectNumber = 1,
  fieldId = 'PVTSSF_field1',
  fieldName = 'Status',
  options = [
    { id: 'opt_todo', name: 'Todo' },
    { id: 'opt_in_progress', name: 'In Progress' },
    { id: 'opt_done', name: 'Done' },
  ],
} = {}) {
  return {
    id: itemId,
    project: {
      id: projectId,
      number: projectNumber,
      fields: {
        nodes: [
          {
            id: fieldId,
            name: fieldName,
            options,
          },
        ],
      },
    },
  };
}

/**
 * Build a mock response for the updateProjectV2ItemFieldValue mutation.
 */
function updateMutationResponse(itemId = 'PVTI_item1') {
  return {
    stdout: JSON.stringify({
      data: {
        updateProjectV2ItemFieldValue: {
          projectV2Item: { id: itemId },
        },
      },
    }),
    exitCode: 0,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('gh-project-set-status.sh', () => {
  describe('argument validation', () => {
    it('prints usage and exits 1 when no arguments given', () => {
      const { dir, binDir } = createMockEnv();
      const result = runScript([], binDir);

      assert.strictEqual(result.status, 1, 'should exit 1');
      assert.match(result.stderr, /usage/i, 'should print usage');
      cleanup(dir);
    });

    it('prints usage and exits 1 when only one argument given', () => {
      const { dir, binDir } = createMockEnv();
      const result = runScript(['42'], binDir);

      assert.strictEqual(result.status, 1, 'should exit 1');
      assert.match(result.stderr, /usage/i, 'should print usage');
      cleanup(dir);
    });
  });

  describe('issue number input', () => {
    it('accepts a plain issue number', () => {
      const { dir, binDir } = createMockEnv({
        responses: [
          // gh issue view 42
          issueViewResponse('NODE_42'),
          // gh api graphql (project items query)
          projectItemsResponse([projectItem()]),
          // gh api graphql (update mutation)
          updateMutationResponse(),
        ],
      });

      const result = runScript(['42', 'In Progress'], binDir);

      assert.strictEqual(result.status, 0, `should exit 0, stderr: ${result.stderr}`);
      cleanup(dir);
    });

    it('accepts a full GitHub issue URL', () => {
      const { dir, binDir } = createMockEnv({
        responses: [
          // gh issue view <url>
          issueViewResponse('NODE_URL'),
          // project items query
          projectItemsResponse([projectItem()]),
          // update mutation
          updateMutationResponse(),
        ],
      });

      const result = runScript(
        ['https://github.com/owner/repo/issues/42', 'Done'],
        binDir
      );

      assert.strictEqual(result.status, 0, `should exit 0, stderr: ${result.stderr}`);
      cleanup(dir);
    });
  });

  describe('issue not linked to any project', () => {
    it('warns and exits 0 when issue has no project items', () => {
      const { dir, binDir } = createMockEnv({
        responses: [
          issueViewResponse('NODE_ORPHAN'),
          projectItemsResponse([]), // no project items
        ],
      });

      const result = runScript(['42', 'In Progress'], binDir);

      assert.strictEqual(result.status, 0, 'should exit 0 (warning, not error)');
      assert.match(
        result.stderr,
        /not linked|no project/i,
        'should warn about missing project'
      );
      cleanup(dir);
    });
  });

  describe('invalid status value', () => {
    it('exits 1 when status value does not match any field option', () => {
      const { dir, binDir } = createMockEnv({
        responses: [
          issueViewResponse('NODE_BAD_STATUS'),
          projectItemsResponse([
            projectItem({
              options: [
                { id: 'opt_todo', name: 'Todo' },
                { id: 'opt_done', name: 'Done' },
              ],
            }),
          ]),
        ],
      });

      const result = runScript(['42', 'NonexistentStatus'], binDir);

      assert.strictEqual(result.status, 1, 'should exit 1');
      assert.match(
        result.stderr,
        /invalid status|not found|available/i,
        'should report invalid status'
      );
      cleanup(dir);
    });
  });

  describe('--field option', () => {
    it('uses custom field name when --field is specified', () => {
      const { dir, binDir } = createMockEnv({
        responses: [
          issueViewResponse('NODE_CUSTOM_FIELD'),
          projectItemsResponse([
            projectItem({
              fieldName: 'Priority',
              fieldId: 'PVTSSF_priority',
              options: [
                { id: 'opt_high', name: 'High' },
                { id: 'opt_low', name: 'Low' },
              ],
            }),
          ]),
          updateMutationResponse(),
        ],
      });

      const result = runScript(
        ['42', 'High', '--field', 'Priority'],
        binDir
      );

      assert.strictEqual(result.status, 0, `should exit 0, stderr: ${result.stderr}`);
      cleanup(dir);
    });

    it('defaults field name to Status when --field not provided', () => {
      const { dir, binDir } = createMockEnv({
        responses: [
          issueViewResponse('NODE_DEFAULT_FIELD'),
          projectItemsResponse([
            projectItem({ fieldName: 'Status' }),
          ]),
          updateMutationResponse(),
        ],
      });

      const result = runScript(['42', 'Todo'], binDir);

      assert.strictEqual(result.status, 0, `should exit 0, stderr: ${result.stderr}`);
      cleanup(dir);
    });
  });

  describe('--project option', () => {
    it('filters to the specified project number', () => {
      const { dir, binDir } = createMockEnv({
        responses: [
          issueViewResponse('NODE_MULTI_PROJ'),
          projectItemsResponse([
            projectItem({ projectNumber: 1, projectId: 'PVT_1', itemId: 'PVTI_1' }),
            projectItem({ projectNumber: 5, projectId: 'PVT_5', itemId: 'PVTI_5' }),
          ]),
          updateMutationResponse('PVTI_5'),
        ],
      });

      const result = runScript(
        ['42', 'In Progress', '--project', '5'],
        binDir
      );

      assert.strictEqual(result.status, 0, `should exit 0, stderr: ${result.stderr}`);
      cleanup(dir);
    });

    it('exits 0 with warning when specified project number not found', () => {
      const { dir, binDir } = createMockEnv({
        responses: [
          issueViewResponse('NODE_NO_MATCH'),
          projectItemsResponse([
            projectItem({ projectNumber: 1 }),
          ]),
        ],
      });

      const result = runScript(
        ['42', 'In Progress', '--project', '99'],
        binDir
      );

      assert.strictEqual(result.status, 0, 'should exit 0 (warning)');
      assert.match(
        result.stderr,
        /not linked|not found|project.*99/i,
        'should warn about project not found'
      );
      cleanup(dir);
    });
  });

  describe('field not found on project', () => {
    it('exits 1 when the target field does not exist on the project', () => {
      const { dir, binDir } = createMockEnv({
        responses: [
          issueViewResponse('NODE_NO_FIELD'),
          projectItemsResponse([
            projectItem({
              fieldName: 'Status',
              options: [{ id: 'opt_1', name: 'Todo' }],
            }),
          ]),
        ],
      });

      const result = runScript(
        ['42', 'Todo', '--field', 'NonexistentField'],
        binDir
      );

      assert.strictEqual(result.status, 1, 'should exit 1');
      assert.match(
        result.stderr,
        /field.*not found|no field/i,
        'should report field not found'
      );
      cleanup(dir);
    });
  });

  describe('successful update', () => {
    it('prints success message with project and status details', () => {
      const { dir, binDir } = createMockEnv({
        responses: [
          issueViewResponse('NODE_SUCCESS'),
          projectItemsResponse([
            projectItem({ projectNumber: 3 }),
          ]),
          updateMutationResponse(),
        ],
      });

      const result = runScript(['42', 'In Progress'], binDir);

      assert.strictEqual(result.status, 0, `should exit 0, stderr: ${result.stderr}`);
      assert.match(
        result.stdout,
        /updated|set|status/i,
        'should print success message'
      );
      cleanup(dir);
    });
  });

  describe('injection safety', () => {
    it('handles status values containing single quotes without breaking', () => {
      const statusWithQuote = "Team's Status";
      const { dir, binDir } = createMockEnv({
        responses: [
          issueViewResponse('NODE_INJECT'),
          projectItemsResponse([
            projectItem({
              options: [
                { id: 'opt_team', name: statusWithQuote },
                { id: 'opt_done', name: 'Done' },
              ],
            }),
          ]),
          updateMutationResponse(),
        ],
      });

      const result = runScript(['42', statusWithQuote], binDir);

      assert.strictEqual(result.status, 0, `should exit 0, stderr: ${result.stderr}`);
      assert.match(
        result.stdout,
        /updated|set|status/i,
        'should print success message'
      );
      cleanup(dir);
    });

    it('handles field names containing single quotes without breaking', () => {
      const fieldWithQuote = "Team's Field";
      const { dir, binDir } = createMockEnv({
        responses: [
          issueViewResponse('NODE_INJECT_FIELD'),
          projectItemsResponse([
            projectItem({
              fieldName: fieldWithQuote,
              options: [
                { id: 'opt_todo', name: 'Todo' },
              ],
            }),
          ]),
          updateMutationResponse(),
        ],
      });

      const result = runScript(
        ['42', 'Todo', '--field', fieldWithQuote],
        binDir
      );

      assert.strictEqual(result.status, 0, `should exit 0, stderr: ${result.stderr}`);
      cleanup(dir);
    });
  });

  describe('gh api failure handling', () => {
    it('exits 1 when gh issue view fails', () => {
      const { dir, binDir } = createMockEnv({
        responses: [
          { stdout: '', stderr: 'issue not found', exitCode: 1 },
        ],
      });

      const result = runScript(['999', 'Todo'], binDir);

      assert.strictEqual(result.status, 1, 'should exit 1');
      cleanup(dir);
    });

    it('exits 1 when graphql project items query fails', () => {
      const { dir, binDir } = createMockEnv({
        responses: [
          issueViewResponse('NODE_GQL_FAIL'),
          { stdout: '', stderr: 'graphql error', exitCode: 1 },
        ],
      });

      const result = runScript(['42', 'Todo'], binDir);

      assert.strictEqual(result.status, 1, 'should exit 1');
      cleanup(dir);
    });

    it('exits 1 when update mutation fails', () => {
      const { dir, binDir } = createMockEnv({
        responses: [
          issueViewResponse('NODE_MUT_FAIL'),
          projectItemsResponse([projectItem()]),
          { stdout: '', stderr: 'mutation failed', exitCode: 1 },
        ],
      });

      const result = runScript(['42', 'In Progress'], binDir);

      assert.strictEqual(result.status, 1, 'should exit 1');
      cleanup(dir);
    });
  });
});
