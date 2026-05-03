---
description: Validate .reaper.yml against the schema and check for drift between configured and detected values.
---
## Mission Header

> **Opt-out**: If the target project's CLAUDE.md contains the line `Reaper: disable ASCII art`, output nothing — skip the header entirely.

> **Render-once directive**: Render this header immediately as the first user-visible output of the command, before any tool calls or information gathering. Do not re-render it at any later point in the same session.

```
  REAPER // DOCTOR
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  validating .reaper.yml
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


## What This Checks

Doctor runs four checks against the project's `.reaper.yml`:

1. Schema validation — confirms the file conforms to `reaper.schema.json` and reports unknown keys as warnings.
2. Drift detection — compares each configured command against what Reaper's per-ecosystem detection scripts would propose for this repo today.
3. Command reachability — verifies `test.cmd` and `lint.cmd` resolve to a real `package.json` script or binary on `PATH`.
4. Resolution sources — reports which layer (user `.reaper.yml`, bundled `defaults.yml`, or unset) each top-level key came from.

The entire report is produced by a single shell invocation. No agent reasoning is involved — the output is deterministic and fast.

## Validation

Doctor delegates schema validation to `scripts/config-validate.sh`. Errors fail the run with exit code `1`; unknown-key warnings do not.

## Drift

Doctor compares each configured command against the per-ecosystem detection script output. A drift row prints when the configured value differs from the detected one. Drift is surfaced as a warning only — exit code stays `0` for drift alone.

## Run

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/doctor.sh"
```

The script prints its full report to stdout. Exit code `0` means clean (or warnings only); exit code `1` means at least one error — fix the surfaced issues with `/reaper:init` or by editing `.reaper.yml` directly.
