---
name: worktree-manager
description: Full lifecycle worktree management with safe cleanup that prevents CWD errors. Use when creating, listing, checking, or removing git worktrees.
allowed-tools: Bash, Read, Grep
---

# Worktree Manager

Safe git worktree operations that prevent the CWD deletion error that breaks Claude's shell.

## Instructions

**CRITICAL**: Never use `git worktree remove` directly. Always use the cleanup script with proper CWD handling.

## ⚠️ CWD Safety (MANDATORY)

**ALWAYS `cd` to project root BEFORE running the cleanup script.**

The cleanup script runs in a subshell, so its internal `cd` does NOT affect your shell session.
If you're inside the worktree when it's deleted, your shell breaks permanently for the session.

```bash
# ✅ CORRECT: Use git rev-parse to reliably get project root, then chain with cleanup
cd "$(git rev-parse --show-toplevel)" && ${CLAUDE_PLUGIN_ROOT}/skills/worktree-manager/scripts/worktree-cleanup.sh ./trees/PROJ-123 --delete-branch

# ❌ WRONG: Running directly while inside the worktree breaks the shell
${CLAUDE_PLUGIN_ROOT}/skills/worktree-manager/scripts/worktree-cleanup.sh ./trees/PROJ-123 --delete-branch
```

### Available Scripts

All scripts are located in `${CLAUDE_PLUGIN_ROOT}/skills/worktree-manager/scripts/`:

| Script | Usage |
|--------|-------|
| `worktree-create.sh` | `<task-id> <description> [--base-branch <branch>]` |
| `worktree-list.sh` | `[--json] [--verbose]` |
| `worktree-status.sh` | `<worktree-path>` |
| `worktree-cleanup.sh` | `<worktree-path> --keep-branch\|--delete-branch [--force] [--dry-run]` |

### Safe Worktree Removal

**Remember**: Always `cd` to project root first (see CWD Safety above).

**IMPORTANT:** You must specify branch disposition for non-protected branches:
- `--keep-branch` - Keep the branch for future work
- `--delete-branch` - Delete the branch (after merge)

Protected branches (`develop`, `main`, `master`) are never deleted.

```bash
# After merge: delete the branch (always cd to project root first!)
cd "$(git rev-parse --show-toplevel)" && ${CLAUDE_PLUGIN_ROOT}/skills/worktree-manager/scripts/worktree-cleanup.sh ./trees/PROJ-123-description --delete-branch

# Keep branch for later
cd "$(git rev-parse --show-toplevel)" && ${CLAUDE_PLUGIN_ROOT}/skills/worktree-manager/scripts/worktree-cleanup.sh ./trees/PROJ-123-description --keep-branch
```

### Why This Matters

When Claude removes a worktree while the shell's CWD is inside that worktree:
1. `git worktree remove` fails with "directory in use"
2. If forced, the directory is deleted but the shell's CWD becomes invalid
3. All subsequent Bash commands fail for the remainder of the session

**Important**: The cleanup script's internal `cd` runs in a subshell and does NOT change Claude's shell CWD. You MUST `cd` to project root in your own command BEFORE running the script.

## Examples

### Create a new worktree
```bash
${CLAUDE_PLUGIN_ROOT}/skills/worktree-manager/scripts/worktree-create.sh PROJ-123 auth-feature
# Creates: ./trees/PROJ-123-auth-feature with branch feature/PROJ-123-auth-feature
```

### List all worktrees with status
```bash
${CLAUDE_PLUGIN_ROOT}/skills/worktree-manager/scripts/worktree-list.sh --verbose
```

### Check worktree health
```bash
${CLAUDE_PLUGIN_ROOT}/skills/worktree-manager/scripts/worktree-status.sh ./trees/PROJ-123-auth-feature
```

### Safely remove a worktree (delete branch after merge)
```bash
# ALWAYS cd to project root first!
cd "$(git rev-parse --show-toplevel)" && ${CLAUDE_PLUGIN_ROOT}/skills/worktree-manager/scripts/worktree-cleanup.sh ./trees/PROJ-123-auth-feature --delete-branch
```

### Safely remove a worktree (keep branch for later)
```bash
cd "$(git rev-parse --show-toplevel)" && ${CLAUDE_PLUGIN_ROOT}/skills/worktree-manager/scripts/worktree-cleanup.sh ./trees/PROJ-123-auth-feature --keep-branch
```

### Preview what would happen
```bash
cd "$(git rev-parse --show-toplevel)" && ${CLAUDE_PLUGIN_ROOT}/skills/worktree-manager/scripts/worktree-cleanup.sh ./trees/PROJ-123-auth-feature --delete-branch --dry-run
```

### Force remove (emergency, with uncommitted changes)
```bash
cd "$(git rev-parse --show-toplevel)" && ${CLAUDE_PLUGIN_ROOT}/skills/worktree-manager/scripts/worktree-cleanup.sh ./trees/PROJ-123-auth-feature --delete-branch --force
```
