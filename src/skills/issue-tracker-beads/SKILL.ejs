---
name: issue-tracker-beads
description: Beads issue tracking integration for Reaper's abstract task operations. Maps FETCH_ISSUE, CREATE_ISSUE, and other operations to bd CLI commands.
allowed-tools: Bash, Read, Grep
---

# Beads Issue Tracker

Platform skill for Reaper's task-system-operations. Maps abstract operations to `bd` CLI commands.

## Quick Reference

| Operation | Command |
|-----------|---------|
| FETCH_ISSUE | `bd show <id>` |
| LIST_CHILDREN | `bd show <parent-id>` (children listed in output) |
| CREATE_ISSUE | `bd create --title="..." --type=task [--parent=<id>]` |
| UPDATE_ISSUE | `bd update <id> --status=in_progress` |
| ADD_DEPENDENCY | `bd dep add <issue> <depends-on>` |
| QUERY_DEPENDENCY_TREE | `bd show <id>` recursively (follow children + deps) |
| CLOSE_ISSUE | `bd close <id>` or `bd close <id1> <id2> ...` |

## Operations

### FETCH_ISSUE / LIST_CHILDREN

```bash
bd show <issue-id>
```

Returns title, description, status, priority, children, and dependencies. Children are embedded in the output -- no separate command needed.

### CREATE_ISSUE

```bash
bd create --title="Add OAuth support" --type=task --priority=2
bd create --title="Implement Google provider" --type=task --parent=<parent-id>
# Types: task, bug, feature
```

The `--parent` flag is the sole mechanism for hierarchy. Child IDs follow the pattern `<issue-id>.1`, `<issue-id>.2`, etc.

### UPDATE_ISSUE

```bash
bd update <issue-id> --status=in_progress
bd update <issue-id> --priority=1
bd update <issue-id> --assignee=<assignee>
bd update <issue-id> --parent=<new-parent-id>          # Reparent an issue
```

### ADD_DEPENDENCY

```bash
bd dep add <issue-id> <dependency-id>                  # blocks (default)
bd dep add <issue-id> <related-id> --type related      # informational link
```

Direction: first argument **depends on** second argument. The default type is `blocks`. Use `--type related` for informational links that do not imply execution order.

### QUERY_DEPENDENCY_TREE

No single command. Walk the tree via repeated `bd show`, following children and dependencies.

### CLOSE_ISSUE

```bash
bd close <issue-id>                        # Single
bd close <issue-id>.1 <issue-id>.2         # Batch
```

## Priority Scale

Numeric 0-4 (or P0-P4). Do not use string labels.

| Value | Meaning |
|-------|---------|
| 0 | Critical |
| 1 | High |
| 2 | Medium (default) |
| 3 | Low |
| 4 | Backlog |

## Useful Commands

```bash
bd ready                  # Issues with no blockers (ready to work)
bd blocked                # Issues blocked by dependencies
bd list --status=open     # All open issues
bd stats                  # Project statistics
bd sync                   # Sync with git remote
```

## CLI Reference

Run `bd --help` for the full flag reference. This skill documents recommended patterns for Reaper's abstract operations, not the complete CLI surface. Agents may discover and use additional flags beyond what is documented here.
