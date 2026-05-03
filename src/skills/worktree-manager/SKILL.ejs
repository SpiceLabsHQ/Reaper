---
name: worktree-manager
description: Full lifecycle worktree management with safe cleanup that prevents CWD errors. Use when creating, listing, checking, or removing git worktrees.
allowed-tools: Read, Grep, Bash(*scripts/config-get.sh*), Bash(*skills/worktree-manager/scripts/worktree-create.sh *), Bash(*skills/worktree-manager/scripts/worktree-list.sh *), Bash(*skills/worktree-manager/scripts/worktree-status.sh *), Bash(*skills/worktree-manager/scripts/worktree-cleanup.sh *), Bash(*skills/worktree-manager/scripts/integration-merge.sh *)
---

# Worktree Manager

Safe git worktree operations that prevent the CWD deletion error that breaks Claude's shell.

## Resolved Configuration

These values are read from `.reaper.yml` at skill-load time. Pass them as arguments (or environment variables when invoking the wrapped scripts) so the scripts themselves remain config-unaware:

- **WORKTREE_BASE_PATH**: !`${CLAUDE_PLUGIN_ROOT}/scripts/config-get.sh worktrees.base_path`
- **BASE_BRANCH**: !`${CLAUDE_PLUGIN_ROOT}/scripts/config-get.sh git.default_base_branch`

When the resolved values differ from the legacy defaults (`.claude/worktrees`, `develop`), substitute them into the example commands below. The skill caller — never the wrapped script — owns config resolution; pass `--base-branch ${BASE_BRANCH}` to `worktree-create.sh` and use `${WORKTREE_BASE_PATH}/...` paths in worktree-cleanup, worktree-list, and worktree-status invocations.

## Instructions

**CRITICAL**: Never use `git worktree remove` directly. Always use the cleanup script with proper CWD handling.

## ⚠️ CWD Safety (MANDATORY)

**ALWAYS `cd` to project root BEFORE running the cleanup script.**

The cleanup script runs in a subshell, so its internal `cd` does NOT affect your shell session.
If you're inside the worktree when it's deleted, your shell breaks permanently for the session.

```bash
# ✅ CORRECT: Use git rev-parse to reliably get project root, then chain with cleanup
cd "$(git rev-parse --show-toplevel)" && ${CLAUDE_PLUGIN_ROOT}/skills/worktree-manager/scripts/worktree-cleanup.sh ./.claude/worktrees/PROJ-123 --delete-branch

# ❌ WRONG: Running directly while inside the worktree breaks the shell
${CLAUDE_PLUGIN_ROOT}/skills/worktree-manager/scripts/worktree-cleanup.sh ./.claude/worktrees/PROJ-123 --delete-branch
```

### Available Scripts

All scripts are located in `${CLAUDE_PLUGIN_ROOT}/skills/worktree-manager/scripts/`:

| Script | Usage |
|--------|-------|
| `worktree-create.sh` | `<task-id> <description> [--base-branch <branch>]` |
| `worktree-list.sh` | `[--json] [--verbose]` |
| `worktree-status.sh` | `<worktree-path>` |
| `worktree-cleanup.sh` | `<worktree-path> --keep-branch\|--delete-branch [--force] [--dry-run] [--timeout <sec>] [--network-timeout <sec>] [--skip-lock-check]` |
| `integration-merge.sh` | `--task-id <id> --component <suffix> --strategy <merge\|rebase-ff\|squash> [--review-branch <name>] [--squash-message <text>] [--worktree-base <path>]` |

### Safe Worktree Removal

**Remember**: Always `cd` to project root first (see CWD Safety above).

**IMPORTANT:** You must specify branch disposition for non-protected branches:
- `--keep-branch` - Keep the branch for future work
- `--delete-branch` - Delete the branch (after merge)

Protected branches (`develop`, `main`, `master`) are never deleted.

```bash
# After merge: delete the branch (always cd to project root first!)
cd "$(git rev-parse --show-toplevel)" && ${CLAUDE_PLUGIN_ROOT}/skills/worktree-manager/scripts/worktree-cleanup.sh ./.claude/worktrees/PROJ-123-description --delete-branch

# Keep branch for later
cd "$(git rev-parse --show-toplevel)" && ${CLAUDE_PLUGIN_ROOT}/skills/worktree-manager/scripts/worktree-cleanup.sh ./.claude/worktrees/PROJ-123-description --keep-branch
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
# Creates: ./.claude/worktrees/PROJ-123-auth-feature with branch feature/PROJ-123-auth-feature
```

### List all worktrees with status
```bash
${CLAUDE_PLUGIN_ROOT}/skills/worktree-manager/scripts/worktree-list.sh --verbose
```

### Check worktree health
```bash
${CLAUDE_PLUGIN_ROOT}/skills/worktree-manager/scripts/worktree-status.sh ./.claude/worktrees/PROJ-123-auth-feature
```

### Safely remove a worktree (delete branch after merge)
```bash
# ALWAYS cd to project root first!
cd "$(git rev-parse --show-toplevel)" && ${CLAUDE_PLUGIN_ROOT}/skills/worktree-manager/scripts/worktree-cleanup.sh ./.claude/worktrees/PROJ-123-auth-feature --delete-branch
```

### Safely remove a worktree (keep branch for later)
```bash
cd "$(git rev-parse --show-toplevel)" && ${CLAUDE_PLUGIN_ROOT}/skills/worktree-manager/scripts/worktree-cleanup.sh ./.claude/worktrees/PROJ-123-auth-feature --keep-branch
```

### Preview what would happen
```bash
cd "$(git rev-parse --show-toplevel)" && ${CLAUDE_PLUGIN_ROOT}/skills/worktree-manager/scripts/worktree-cleanup.sh ./.claude/worktrees/PROJ-123-auth-feature --delete-branch --dry-run
```

### Force remove (emergency, with uncommitted changes)
```bash
cd "$(git rev-parse --show-toplevel)" && ${CLAUDE_PLUGIN_ROOT}/skills/worktree-manager/scripts/worktree-cleanup.sh ./.claude/worktrees/PROJ-123-auth-feature --delete-branch --force
```

### Custom timeout for large worktrees (monorepos, heavy node_modules)
```bash
cd "$(git rev-parse --show-toplevel)" && ${CLAUDE_PLUGIN_ROOT}/skills/worktree-manager/scripts/worktree-cleanup.sh ./.claude/worktrees/PROJ-123-auth-feature --delete-branch --timeout 300
```

### Skip lock detection for CI/headless environments
```bash
cd "$(git rev-parse --show-toplevel)" && ${CLAUDE_PLUGIN_ROOT}/skills/worktree-manager/scripts/worktree-cleanup.sh ./.claude/worktrees/PROJ-123-auth-feature --delete-branch --skip-lock-check
```

### Custom network timeout for slow remotes
```bash
cd "$(git rev-parse --show-toplevel)" && ${CLAUDE_PLUGIN_ROOT}/skills/worktree-manager/scripts/worktree-cleanup.sh ./.claude/worktrees/PROJ-123-auth-feature --delete-branch --network-timeout 60
```

### Merge a component branch into the review branch (ADR-0014 + ADR-0019 + ADR-0020)
```bash
${CLAUDE_PLUGIN_ROOT}/skills/worktree-manager/scripts/integration-merge.sh \
  --task-id PROJ-123 --component auth-api --strategy rebase-ff
# Creates ./.claude/worktrees/PROJ-123-integration, rebases feature/PROJ-123-auth-api
# onto feature/PROJ-123-review, fast-forwards the review branch, then cleans up.
# Emits a single JSON summary line on stdout. Exit 3 retains the worktree on conflict.
```
