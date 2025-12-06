---
name: worktree-manager
description: Full lifecycle worktree management with safe cleanup that prevents CWD errors. Use when creating, listing, checking, or removing git worktrees.
allowed-tools: Bash, Read, Grep
---

# Worktree Manager

Safe git worktree operations that prevent the CWD deletion error that breaks Claude's shell.

## Instructions

**CRITICAL**: Never use `git worktree remove` directly. Always use the cleanup script to prevent breaking the shell when the current working directory is inside the worktree being removed.

### Available Scripts

All scripts are located in `~/.claude/skills/worktree-manager/scripts/`:

| Script | Usage |
|--------|-------|
| `worktree-create.sh` | `<task-id> <description> [--base-branch <branch>]` |
| `worktree-list.sh` | `[--json] [--verbose]` |
| `worktree-status.sh` | `<worktree-path>` |
| `worktree-cleanup.sh` | `<worktree-path> [--force] [--dry-run] [--keep-branch]` |

### Safe Worktree Removal

The cleanup script changes to project root BEFORE attempting removal, preventing shell breakage:

```bash
~/.claude/skills/worktree-manager/scripts/worktree-cleanup.sh ./trees/PROJ-123-description
```

### Why This Matters

When Claude removes a worktree while the shell's CWD is inside that worktree:
1. `git worktree remove` fails with "directory in use"
2. If forced, the directory is deleted but the shell's CWD becomes invalid
3. All subsequent Bash commands fail for the remainder of the session

The cleanup script solves this by changing to project root first.

## Examples

### Create a new worktree
```bash
~/.claude/skills/worktree-manager/scripts/worktree-create.sh PROJ-123 auth-feature
# Creates: ./trees/PROJ-123-auth-feature with branch feature/PROJ-123-auth-feature
```

### List all worktrees with status
```bash
~/.claude/skills/worktree-manager/scripts/worktree-list.sh --verbose
```

### Check worktree health
```bash
~/.claude/skills/worktree-manager/scripts/worktree-status.sh ./trees/PROJ-123-auth-feature
```

### Safely remove a worktree
```bash
~/.claude/skills/worktree-manager/scripts/worktree-cleanup.sh ./trees/PROJ-123-auth-feature
```

### Force remove (emergency)
```bash
~/.claude/skills/worktree-manager/scripts/worktree-cleanup.sh ./trees/PROJ-123-auth-feature --force
```

## Error Recovery

If Claude's shell is already broken (CWD deleted):
```bash
cd ~ && cd /path/to/project  # Reset shell CWD
git worktree prune           # Clean stale entries
```
