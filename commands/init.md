---
description: Detect runners, trackers, and conventions and write a validated .reaper.yml at the repo root.
---
## Mission Header

> **Opt-out**: If the target project's CLAUDE.md contains the line `Reaper: disable ASCII art`, output nothing — skip the header entirely.

> **Render-once directive**: Render this header immediately as the first user-visible output of the command, before any tool calls or information gathering. Do not re-render it at any later point in the same session.

```
  REAPER // INIT
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  configuring .reaper.yml
```


<!-- user-comms-contract -->

## User Communication Contract

Speak about work outcomes and progress — never about internal machinery, tool names, or implementation steps.

### Forbidden Terms

Do not use any of the following in user-facing messages, status cards, or progress output:

**Abstract operation names** — replace with plain language:

| Forbidden | Use instead |
|-----------|-------------|
| `FETCH_ISSUE` | "retrieving task details" or "looking up the issue" |
| `CREATE_ISSUE` | "creating a task" or "logging the issue" |
| `UPDATE_ISSUE` | "updating the task" or "recording progress" |
| `ADD_DEPENDENCY` | "linking a dependency" |
| `LIST_CHILDREN` | "listing subtasks" |
| `QUERY_DEPENDENCY_TREE` | "checking dependencies" |
| `CLOSE_ISSUE` | "marking the task complete" |

**Internal state variables** — omit or rephrase:

| Forbidden | Use instead |
|-----------|-------------|
| `TASK_SYSTEM` / `markdown_only` | "your project's task tracking setup" |
| `PLAN_CONTEXT` | "the task requirements" or "the plan" |
| `CODEBASE CONTEXT` | "the codebase" |

**Internal file sentinels** — never surface raw filenames:

`RESULTS.md`, `REVIEW.md`, `SECURITY.md`, `FAULT.md`, `TASK.md`

**Tool names** — never expose tool internals as user language:

| Forbidden | Use instead |
|-----------|-------------|
| `TaskCreate` | "tracking progress" or "updating the work plan" |
| `TaskUpdate` | "recording progress" |

**Architecture terms** — omit entirely:

`platform skill routing`, `behavioral contract`, `skill routing table`, `gate classification internals`

### Tone Rule

Describe what is happening for the user ("running tests", "planning the feature", "reviewing security") — not what the system is doing internally ("routing to skill", "resolving TASK_SYSTEM", "invoking TaskCreate").


## Visual Vocabulary

> **Opt-out**: If the project's CLAUDE.md contains the line `Reaper: disable ASCII art`, emit plain text status labels only. No gauge bars, no box-drawing, no card templates. Use the `functional` context behavior regardless of the `context` parameter.

> **Rendering constraint**: One line, one direction, no column alignment. Every visual element must be renderable in a single horizontal pass. No multi-line box-drawing that requires vertical alignment across columns. Exception: The `start` context uses box-drawing for its welcome screen cards, which are rendered once as orientation content rather than repeated status displays.

### Gauge States

Six semantic states expressed as fixed-width 10-block bars. Use these consistently across all commands to communicate work status.

Status labels (plain text, no visual ornament):

- **LANDED** -- complete, healthy
- **ON APPROACH** -- coding done, quality gates running
- **IN FLIGHT** -- work in progress
- **TAKING OFF** -- deploying, about to execute
- **TAXIING** -- waiting, not started
- **FAULT** -- failed, needs attention

### Quality Gate Statuses

Gate status labels (plain text, no visual ornament):

- **PASS** -- gate passed all checks
- **FAIL** -- gate found blocking issues
- **RUNNING** -- gate currently executing
- **PENDING** -- gate not yet started
- **SKIP** -- gate not applicable to this work type

Gate statuses are inspection verdicts, not work lifecycle states. Use gauge states for work unit progress, gate statuses for quality inspection results.


# Init: Configure `.reaper.yml`

Walk the user through configuring `.reaper.yml` at the repo root. Detect plausible values from the project, ask the user to confirm each one, then write a schema-valid file. If a `.reaper.yml` already exists, treat the run as a re-edit and surface current values alongside detection.

The file produced by this command is a target-project artifact: plain YAML with neutral comments. Reaper's themed voice belongs to the user-facing card output of this command — not the file written to disk.

---

## Detection

Before prompting, run the existing detection scripts and capture their output. These scripts are bundled with Reaper; no fallback inference required.

```bash
# Detect test command (e.g., "npm run test:coverage", "pytest", "go test ./...")
DETECTED_TEST="$(bash "${CLAUDE_PLUGIN_ROOT}/scripts/detect-test-cmd.sh" 2>/dev/null || true)"

# Detect lint command (e.g., "npm run lint", "ruff check .")
DETECTED_LINT="$(bash "${CLAUDE_PLUGIN_ROOT}/scripts/detect-lint-cmd.sh" 2>/dev/null || true)"

# Detect tracker system (one of: GitHub, Beads, Jira, markdown_only, unknown)
DETECTED_TRACKER="$(bash "${CLAUDE_PLUGIN_ROOT}/scripts/detect-task-system.sh" 2>/dev/null || true)"
```

Additionally, when the GitHub CLI is available, capture the repo slug as a tracker.repo candidate:

```bash
DETECTED_REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)"
```

Translate `DETECTED_TRACKER` to the schema's enum:

| Detection output | Schema enum value |
| ---------------- | ----------------- |
| `GitHub`         | `github`          |
| `Beads`          | `beads`           |
| `Jira`           | `jira`            |
| `markdown_only`  | `markdown_only`   |
| `unknown`        | (no default — ask the user; `linear` is also a valid choice) |

Hold these detected values in working memory. They pre-fill the prompts below.

---

## CLAUDE.md Migration

Read the project's `CLAUDE.md` if it exists. Look for a `## Quality Gates` section of the form:

```markdown
## Quality Gates

The following commands are used during automated quality gates:

**Test command**: `npm run test:coverage`
**Lint command**: `npm run lint`
```

If found, extract the `Test command` and `Lint command` values. Use them to override the detected `test.cmd` and `lint.cmd` for the prompts below — the existing CLAUDE.md is a stronger signal than fresh detection because the user has already curated those values.

After writing `.reaper.yml`, ask whether to clean up CLAUDE.md (see Post-Write Cleanup below).

---

## Re-run Behavior

If `.reaper.yml` already exists, parse it before prompting. For each key the user is about to be asked about:

- Show the current value alongside the detected value.
- Replace the standard "keep / edit / skip" options with "keep current / edit / remove".
- "remove" deletes the key from the rewritten file (only valid for optional keys).

If the existing file fails to parse as YAML, surface the parse error to the user and ask whether to start from a fresh template instead. Do not silently overwrite an unparseable file.

---

## Approval Flow

Walk the user through each key in this order. Use AskUserQuestion for each prompt. Skip prompts whose value is fixed (e.g., `version: 1`).

For each prompt: present the detected value (or current value, on re-run) as the recommended option labeled **"Use detected"** or **"Keep current"**, an **"Enter custom"** option, and a **"Skip"** option for keys that are optional. Skipping a required key marks it for retry — `.reaper.yml` will not be written until every required key is set.

### Required keys

1. **`test.cmd`** — primary test command. Required by schema.
2. **`lint.cmd`** — primary lint command. Required by schema. Accept `skip` literal to suppress lint enforcement.
3. **`tracker.system`** — one of `github`, `beads`, `jira`, `linear`, `markdown_only`. Required by schema.

### Optional keys

4. **`test.cmd_e2e`** — separate end-to-end test command, when present.
5. **`format.cmd`** — auto-format command (e.g. `npm run format`, `black .`).
6. **`coverage.threshold`** — minimum coverage percentage (default `80`). Allow override.
7. **`tracker.repo`** — repository slug (e.g. `owner/repo` for GitHub).
8. **`tracker.project_id`** — project board or workspace identifier.
9. **`tracker.default_labels`** — list of labels Reaper applies to issues it creates.
10. **`worktrees.base_path`** — defaults to `.claude/worktrees`.
11. **`worktrees.naming_pattern`** — defaults to `{task_id}-{slug}`.
12. **`git.default_base_branch`** — defaults to `develop`.
13. **`workflow.require_security_gate`** — defaults to `true`.
14. **`workflow.require_tdd`** — defaults to `true`.
15. **`workflow.skip_gates_for`** — list of glob patterns that bypass quality gates.

For boolean keys, present "true / false" as the option labels. For list keys, accept comma-separated input and split on commas. For numeric keys, validate that the input parses as a number in range (coverage: 0–100).

### Prompt template

Use this AskUserQuestion shape per key:

```json
{
  "questions": [{
    "question": "Configure <key>?",
    "header": "<friendly key name>",
    "options": [
      {
        "label": "Use detected",
        "description": "<detected value>"
      },
      {
        "label": "Enter custom",
        "description": "Type your own value."
      },
      {
        "label": "Skip",
        "description": "Leave unset. <required-or-optional>"
      }
    ],
    "multiSelect": false
  }]
}
```

When the user picks **"Enter custom"**, follow up with a free-text question asking for the value.

---

## Write & Validate

Build the YAML document in memory using the values collected above. Match the structure declared in `defaults.yml` and `reaper.schema.json`:

```yaml
version: 1

test:
  cmd: <test.cmd>
  # cmd_e2e: <test.cmd_e2e>     # only if set

lint:
  cmd: <lint.cmd>

# format:
#   cmd: <format.cmd>            # only if set

coverage:
  threshold: <coverage.threshold>

tracker:
  system: <tracker.system>
  # repo, project_id, default_labels: only if set

worktrees:
  base_path: <worktrees.base_path>
  naming_pattern: '<worktrees.naming_pattern>'

git:
  default_base_branch: <git.default_base_branch>

workflow:
  require_security_gate: <workflow.require_security_gate>
  require_tdd: <workflow.require_tdd>
  # skip_gates_for: only if set
```

Write the file to `.reaper.yml` at the repo root. Then validate it:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/config-validate.sh" .reaper.yml
```

If validation reports errors:

1. Surface every error to the user with field path and message.
2. Re-prompt only for the offending keys (do not restart the whole flow).
3. Re-write and re-validate. Repeat until clean.

If validation reports warnings (e.g., unknown keys), show them to the user and confirm whether to keep them. Warnings do not block writing.

Do not commit. Print the suggested commit message instead so the user can run `git add .reaper.yml && git commit` themselves:

```
chore(config): initialize .reaper.yml with Reaper config

Closes SPC-14
```

---

## Post-Write Cleanup

If a `## Quality Gates` block was found in CLAUDE.md during migration, ask whether to clean it up:

```json
{
  "questions": [{
    "question": "What would you like to do with the existing Quality Gates block in CLAUDE.md?",
    "header": "CLAUDE.md Quality Gates",
    "options": [
      {
        "label": "Remove the block",
        "description": "Delete the section entirely. Reaper will read from .reaper.yml going forward."
      },
      {
        "label": "Replace with a pointer",
        "description": "Replace the block with a one-line pointer: \"Quality gate commands are configured in `.reaper.yml`. Run `/reaper:doctor` to validate.\""
      },
      {
        "label": "Leave it alone",
        "description": "Keep the existing block. .reaper.yml is the canonical source — the CLAUDE.md block becomes documentation only."
      }
    ],
    "multiSelect": false
  }]
}
```

Apply the user's choice with a single edit to CLAUDE.md. Do not modify any other section of the file.

---

## Completion Card

Render a completion card summarizing what was configured. Use the visual vocabulary partial's functional context — the opt-out (`Reaper: disable ASCII art`) is honored automatically.

```
  CONFIGURED
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Test:       [final-test-cmd]
  Lint:       [final-lint-cmd]
  Tracker:    [tracker.system] ([tracker.repo or "—"])
  Coverage:   [coverage.threshold]%
  Worktrees:  [worktrees.base_path]
  Branch:     [git.default_base_branch]
  ██████████  LANDED
```

Below the card, print the suggested commit command verbatim so the user can copy-paste it.

---

## Scope Boundary

This command:

- Writes only `.reaper.yml`. Optional cleanup of `CLAUDE.md`'s Quality Gates block is a single targeted edit, never a broader rewrite.
- Does not run the configured commands. Use `/reaper:doctor` to verify reachability.
- Does not commit. The user commits manually using the suggested message.
- Does not configure CI or any external system.

---

## Error Handling

- **No test or lint runner detected** — show "Not detected" in the option description; require manual entry.
- **No tracker detected** — present all five enum values (`github`, `beads`, `jira`, `linear`, `markdown_only`) and ask the user to choose.
- **Existing `.reaper.yml` is unparseable** — surface the parse error and offer to start from a fresh template (require explicit confirmation before overwriting).
- **Validation fails after write** — re-prompt only for offending keys; do not restart the whole flow.
- **CLAUDE.md not present** — skip the migration step entirely; do not create CLAUDE.md.
