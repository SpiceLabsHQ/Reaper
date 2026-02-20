---
name: issue-tracker-planfile
description: Markdown plan file management for projects without an issue tracker. Maps Reaper's abstract task operations to local plan file read/write operations.
allowed-tools: Read, Write, Edit, Grep, Glob
---

# Markdown Plan File Tracker

Platform skill for Reaper's task-system-operations. Maps abstract operations to local plan file reads and writes when no issue tracker is detected (`TASK_SYSTEM=markdown_only`).

## Plan File Location

Path: `.claude/plans/<task-slug>.md`

Derive `<task-slug>` from the task description (2-4 words, lowercase, hyphenated). Example: `.claude/plans/oauth-google-github.md`.

## Quick Reference

| Operation | Plan File Action |
|-----------|-----------------|
| FETCH_ISSUE | Read plan file; extract Input + Work Units sections |
| LIST_CHILDREN | Parse Work Units table rows |
| CREATE_ISSUE | If `type=epic` and file absent: create plan file. Otherwise: append a new row to Work Units table (next sequential `#`, status `pending`) |
| UPDATE_ISSUE | Edit the matching Work Unit row (status, description) |
| ADD_DEPENDENCY | Update Dependencies section with blocking relationship |
| QUERY_DEPENDENCY_TREE | Parse Dependencies section for full execution graph |
| CLOSE_ISSUE | Set Work Unit row status to `done` |

## Plan File Schema

```markdown
# Plan: [Title]

## Input
[Original task description]

## Research
[Codebase analysis findings]

## Strategy
[Selected approach and complexity rationale]

## Work Units
| # | Title | Type | Status | Blocked By |
|---|-------|------|--------|------------|
| 1 | Example unit | task | pending | -- |

## Dependencies
[Mermaid flowchart or table showing execution order]
```

## Operations Detail

**FETCH_ISSUE**: Read the plan file. The `## Input` section is the issue description. The `## Work Units` table contains child tasks.

**LIST_CHILDREN**: Each row in the Work Units table is a child. The `#` column is its identifier.

**CREATE_ISSUE**: When `type=epic` (the root/parent issue), check whether the plan file exists first (attempt Read; if file not found, proceed to create). If the file does not exist, use the Write tool to create it at `.claude/plans/<task-slug>.md` with this structure:

```markdown
# Plan: [Title]

## Input
[Task description from CREATE_ISSUE call]

## Research

## Strategy

## Work Units
| # | Title | Type | Status | Blocked By |
|---|-------|------|--------|------------|

## Dependencies
```

If the file already exists, skip creation and proceed normally. For all other `type` values (task, bug, etc.), use the Edit tool to append a row to the Work Units table. Assign the next sequential `#`. Set status to `pending`.

**UPDATE_ISSUE**: Edit the matching row in Work Units. Modify Status, Title, or other columns.

**ADD_DEPENDENCY**: Update the Dependencies section. Distinguish by type:
- **`blocks`**: Add as mermaid flowchart edges (`graph LR; 1 --> 2; 2 --> 3`) where directional arrows mean "A blocks B".
- **`related`**: Add as a note or annotation below the flowchart (e.g., "Related: Unit 2 and Unit 5 share auth module context"). Do NOT add related links as flowchart edges -- they are informational, not blocking.

**QUERY_DEPENDENCY_TREE**: Parse Dependencies for the full graph. Return as an ordered execution sequence.

**CLOSE_ISSUE**: Edit the matching Work Unit row. Set Status to `done`.

## How Takeoff Consumes Plan Files

1. Searches `.claude/plans/` for a file matching the task slug
2. If Work Units are populated, extracts them directly -- no planner needed
3. Passes the Research section to coding agents as codebase context
4. Uses Dependencies to determine work unit execution order
5. If only Research exists (no Work Units), deploys the planner with research as input

## Reference

This skill documents the plan file schema and recommended patterns for Reaper's abstract operations. The file format is flexible -- agents may add sections or annotations beyond what is documented here as long as the core schema is preserved.
