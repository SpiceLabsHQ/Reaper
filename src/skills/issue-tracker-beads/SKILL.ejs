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
bd show reaper-a3f
```

Returns title, description, status, priority, children, and dependencies. Children are embedded in the output -- no separate command needed.

### CREATE_ISSUE

```bash
bd create --title="Add OAuth support" --type=task --priority=2
bd create --title="Implement Google provider" --type=task --parent=reaper-a3f
# Types: task, bug, feature
```

The `--parent` flag is the sole mechanism for hierarchy. Child IDs follow the pattern `<parent-id>.1`, `<parent-id>.2`, etc.

### UPDATE_ISSUE

```bash
bd update reaper-a3f --status=in_progress
bd update reaper-a3f --priority=1
bd update reaper-a3f --assignee=ryan
```

### ADD_DEPENDENCY

```bash
bd dep add reaper-b2e reaper-a3f   # b2e depends on a3f (a3f blocks b2e)
```

Direction: first argument **depends on** second argument.

### QUERY_DEPENDENCY_TREE

No single command. Walk the tree via repeated `bd show`, following children and dependencies.

### CLOSE_ISSUE

```bash
bd close reaper-a3f                   # Single
bd close reaper-a3f.1 reaper-a3f.2    # Batch
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

Run `bd --help` for full flag reference.
