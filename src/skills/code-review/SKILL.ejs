---
name: code-review
description: Universal Gate 2 code review protocol for Reaper's quality gate pipeline. Guides a reviewer through plan verification, scope creep detection, completeness checks, and structured JSON output.
allowed-tools: Read, Grep, Bash
---

# Code Review Skill

You are performing a Gate 2 code review for Reaper's quality gate pipeline.

## Purpose

This skill defines the **review process**, not domain knowledge. Follow the universal steps below for every review regardless of work type. If a specialty file was provided via `SPECIALTY_CONTENT`, apply its additional process steps after completing the universal steps.

## Task Prompt Fields

The orchestrator passes the following fields when invoking this skill:

| Field | Description |
|-------|-------------|
| `TASK` | Task ID being reviewed |
| `WORKTREE` | Path to the worktree under review |
| `SCOPE` | Glob patterns for the files in scope |
| `PLAN_CONTEXT` | Materialized plan content (may be absent) |
| `SKILL_CONTENT` | The contents of this file (already loaded by caller) |
| `SPECIALTY_CONTENT` | Specialty file content for this work type (may be absent) |

## Universal Review Process

Work through these steps in order for every review.

### Step 1: Plan Completion Check

If `PLAN_CONTEXT` was provided:
- Read the acceptance criteria and work unit description from the plan.
- Verify that the implementation addresses every acceptance criterion.
- Flag any criterion that is missing, incomplete, or incorrectly implemented as a blocking issue.

If `PLAN_CONTEXT` is absent, skip this step and set `plan_coverage` to `not_checked` in your output.

### Step 2: Scope Creep Check

- Inspect every file modified in the worktree (use `git diff --name-only` relative to the base branch).
- Compare the modified file list against the `SCOPE` glob patterns provided.
- Any modification outside the declared scope is a scope violation. List each one in `scope_violations`.
- Scope violations are blocking issues unless the caller explicitly documented them in the plan.

### Step 3: Completeness Check

- Verify that nothing in the work unit was left half-done: no TODO stubs where functional code is required, no placeholder implementations, no missing test coverage for declared functionality.
- Partial implementations that leave a feature unusable are blocking issues.

### Step 4: Apply Specialty Steps (if provided)

If `SPECIALTY_CONTENT` is present, read it and apply any additional domain-specific checks it defines. Specialty steps extend — they do not replace — the universal steps above.

## Blocking vs. Non-Blocking Issues

**Blocking issues** (`blocking_issues`) prevent approval. Include only:
- Bugs or logic errors in the implementation
- Missing required functionality from the acceptance criteria
- Broken contracts (API shape, JSON schema, function signatures)
- Security vulnerabilities
- Files modified outside declared scope (unless pre-authorized)

**Non-blocking notes** (`non_blocking_notes`) are observations that do not prevent approval:
- Style suggestions or readability improvements
- Optional refactors
- Minor nitpicks that do not affect correctness or contract
- Future improvement ideas

## JSON Output Contract

Emit exactly this structure as your final output. No prose after the JSON block.

```json
{
  "all_checks_passed": true,
  "blocking_issues": [],
  "non_blocking_notes": ["Optional improvement: ..."],
  "plan_coverage": "full|partial|not_checked",
  "scope_violations": [],
  "summary": "Brief description of what was reviewed and the verdict"
}
```

Field definitions:

| Field | Type | Values |
|-------|------|--------|
| `all_checks_passed` | boolean | `true` only when `blocking_issues` and `scope_violations` are both empty |
| `blocking_issues` | string[] | One entry per blocking issue found; empty array if none |
| `non_blocking_notes` | string[] | Observations that do not block approval; empty array if none |
| `plan_coverage` | string | `"full"` all criteria met, `"partial"` some missing, `"not_checked"` no plan provided |
| `scope_violations` | string[] | File paths modified outside declared scope; empty array if none |
| `summary` | string | One or two sentences: what was reviewed and whether it passed |
