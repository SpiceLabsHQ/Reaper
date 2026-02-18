---
name: issue-tracker-jira
description: Jira issue tracking integration for Reaper's abstract task operations. Maps FETCH_ISSUE, CREATE_ISSUE, and other operations to acli jira CLI commands.
allowed-tools: Bash, Read, Grep
---

# Jira Issue Tracker

Maps abstract task operations to `acli jira` CLI commands. See `acli jira --help` and `acli jira workitem --help` for full flag details.

## Quick Reference

| Operation | Command Pattern |
|-----------|----------------|
| FETCH_ISSUE | `acli jira workitem view <key>` |
| LIST_CHILDREN | `acli jira workitem search --jql "parent=<key>"` |
| CREATE_ISSUE | `acli jira workitem create --project=<key> --type=Task --title="..." --description="..."` |
| UPDATE_ISSUE | `acli jira workitem update <key> --status="..." --assignee="..."` |
| ADD_DEPENDENCY | `acli jira workitem link <source> <target> --type=Blocks` |
| QUERY_DEPENDENCY_TREE | `acli jira workitem search --jql "issuekey in linkedIssuesOf(<key>)"` recursively |
| CLOSE_ISSUE | `acli jira workitem update <key> --status="Done"` |

## Hierarchy -- Epic Pattern

Jira uses a native parent-child hierarchy: **Epic > Story/Task > Sub-task**.

**CREATE_ISSUE with `parent`:**

Determine the parent's issue type to choose the right creation pattern:

```bash
# Parent is an Epic -- create Story/Task under it
acli jira workitem create --project=PROJ --type=Story --epic=PROJ-10 \
  --title="Implement login" --description="Details..."

# Parent is a Story/Task -- create Sub-task under it
acli jira workitem create --project=PROJ --type=Sub-task --parent=PROJ-42 \
  --title="Add password validation" --description="Details..."
```

**Creating an Epic:**

```bash
acli jira workitem create --project=PROJ --type=Epic \
  --title="Authentication overhaul" --description="Epic description..."
```

**LIST_CHILDREN:**

```bash
# Direct children of any issue
acli jira workitem search --jql "parent=PROJ-10"

# Stories/Tasks under an Epic
acli jira workitem search --jql "\"Epic Link\"=PROJ-10"
```

## Dependency -- Link Types

Jira has native issue linking. ADD_DEPENDENCY maps to link creation:

- **`blocks`** maps to Jira's **Blocks** link type
- **`related`** maps to Jira's **Relates** link type

```bash
# blocks: PROJ-101 blocks PROJ-102
acli jira workitem link PROJ-101 PROJ-102 --type=Blocks

# related: informational link between siblings
acli jira workitem link PROJ-101 PROJ-103 --type=Relates
```

**QUERY_DEPENDENCY_TREE:**

```bash
# Direct links from a single issue
acli jira workitem search --jql "issuekey in linkedIssuesOf(PROJ-100)"
# Recursive: repeat for each linked issue until no new keys appear.
```

## Status Transitions

Jira enforces workflow transitions. If a transition fails, inspect available statuses with `acli jira workitem view <key>` and use the exact status name.

```bash
acli jira workitem update PROJ-123 --status="In Progress"
acli jira workitem update PROJ-123 --status="Done"
```

## CLI Reference

Run `acli jira --help` for the full flag reference. This skill documents recommended patterns for Reaper's abstract operations, not the complete CLI surface. Agents may discover and use additional flags beyond what is documented here.
