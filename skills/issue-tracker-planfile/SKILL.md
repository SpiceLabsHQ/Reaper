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
| CREATE_ISSUE | Append a new row to Work Units table (next sequential `#`, status `pending`) |
| UPDATE_ISSUE | Edit the matching Work Unit row (status, description) |
| ADD_DEPENDENCY | Update Dependencies section with blocking relationship |
| QUERY_DEPENDENCY_TREE | Parse Dependencies section for full execution graph |
| CLOSE_ISSUE | Set Work Unit row status to `done` |

## Plan File Schema

```markdown
# Plan: [Title]

## Input
[Original task description -- IMMUTABLE after creation]

## Research
[Codebase analysis findings -- APPEND only]

## Strategy
[Selected approach and complexity rationale -- EDIT allowed]

## Work Units
| # | Title | Type | Status | Blocked By |
|---|-------|------|--------|------------|
| 1 | Example unit | task | pending | -- |

## Dependencies
[Mermaid flowchart or table showing execution order]

## Assumptions
[Constraints and decisions -- APPEND only]

## Feedback Log
[User feedback entries with timestamps -- APPEND only]
```

### Section Update Rules

| Section | Rule | Meaning |
|---------|------|---------|
| Input | IMMUTABLE | Never modify after initial creation |
| Research | APPEND | Add new findings below existing content |
| Strategy | EDIT | Rewrite when approach changes |
| Work Units | EDIT | Add, remove, or update rows as work progresses |
| Dependencies | EDIT | Rewrite when work unit structure changes |
| Assumptions | APPEND | Add new entries; never delete previous ones |
| Feedback Log | APPEND | Timestamped entries; never delete previous ones |

**Definitions:** IMMUTABLE = write once, never change. APPEND = add below existing, never delete. EDIT = modify in place freely.

## Operations Detail

**FETCH_ISSUE**: Read the plan file. The `## Input` section is the issue description. The `## Work Units` table contains child tasks.

**LIST_CHILDREN**: Each row in the Work Units table is a child. The `#` column is its identifier.

**CREATE_ISSUE**: Use the Edit tool to append a row to Work Units. Assign the next sequential `#`. Set status to `pending`.

**UPDATE_ISSUE**: Edit the matching row in Work Units. Modify Status, Title, or other columns.

**ADD_DEPENDENCY**: Update the Dependencies section. Express blocking relationships as a mermaid flowchart (`graph LR; 1 --> 2; 2 --> 3`) or a table.

**QUERY_DEPENDENCY_TREE**: Parse Dependencies for the full graph. Return as an ordered execution sequence.

**CLOSE_ISSUE**: Edit the matching Work Unit row. Set Status to `done`.

## How Takeoff Consumes Plan Files

1. Searches `.claude/plans/` for a file matching the task slug
2. If Work Units are populated, extracts them directly -- no planner needed
3. Passes the Research section to coding agents as codebase context
4. Uses Dependencies to determine work unit execution order
5. If only Research exists (no Work Units), deploys the planner with research as input

## Manual Execution Guide Template

When flight-plan hands off to the user, paste this into the Feedback Log:

```markdown
### Manual Execution Guide
1. Review Work Units above for task breakdown
2. Execute units in dependency order
3. For each unit: write failing tests -> implement -> verify
4. Update status in Work Units table as you complete each
5. Log any deviations in the Feedback Log section
```
