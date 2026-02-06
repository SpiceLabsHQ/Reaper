# Worktree Manager Reference

Detailed documentation for the worktree-manager skill.

## The CWD Problem

### What Happens

When Claude removes a worktree while the shell's current working directory (CWD) is inside that worktree:

1. **Direct removal fails**: `git worktree remove` returns "fatal: cannot remove the current working directory"
2. **Force removal breaks shell**: If you use `--force`, the directory is deleted but the shell's CWD becomes invalid
3. **Session breaks**: All subsequent Bash commands fail with "No such file or directory"

### The Fix

**CRITICAL**: The `worktree-cleanup.sh` script runs in a **subshell**. Its internal `cd` does NOT affect Claude's shell session. You MUST `cd` to project root yourself BEFORE calling the script.

```bash
# ✅ CORRECT: Use git rev-parse to reliably get project root, then chain with cleanup
cd "$(git rev-parse --show-toplevel)" && ${CLAUDE_PLUGIN_ROOT}/skills/worktree-manager/scripts/worktree-cleanup.sh ./trees/PROJ-123 --delete-branch

# ❌ WRONG: Script's internal cd only affects the subshell, not your session
${CLAUDE_PLUGIN_ROOT}/skills/worktree-manager/scripts/worktree-cleanup.sh ./trees/PROJ-123 --delete-branch
```

**Why this matters**: When you run a bash script, it executes in its own process. Any `cd` commands inside the script only affect that process. When the script exits, your shell session is still in the original (now deleted) directory.

## Script Reference

### worktree-create.sh

Creates a new worktree with validation and dependency installation.

```bash
~/.claude/skills/worktree-manager/scripts/worktree-create.sh <task-id> <description> [options]
```

**Arguments:**
| Argument | Description |
|----------|-------------|
| `task-id` | Task identifier (PROJ-123, repo-a3f, #456) |
| `description` | Brief description (auth, bugfix, refactor) |

**Options:**
| Option | Description |
|--------|-------------|
| `--base-branch <branch>` | Branch to create from (default: develop) |
| `--no-install` | Skip dependency installation |

**Output:**
- Worktree at: `./trees/<task-id>-<description>`
- Branch: `feature/<task-id>-<description>`

**Validation performed:**
- Not already in a worktree
- Worktree path doesn't exist
- Branch doesn't already exist
- Warns if task already in develop

---

### worktree-list.sh

Lists all worktrees with status information.

```bash
~/.claude/skills/worktree-manager/scripts/worktree-list.sh [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--json` | Output in JSON format |
| `--verbose` | Show detailed information |

**Default output columns:**
| Column | Description |
|--------|-------------|
| PATH | Worktree location |
| BRANCH | Current branch |
| CHANGES | Y/N for uncommitted changes |
| UNMERGED | Count of unmerged commits |

**JSON output fields:**
```json
{
  "path": "/path/to/worktree",
  "branch": "feature/PROJ-123-auth",
  "head": "abc1234",
  "has_changes": false,
  "unmerged_commits": 3,
  "last_commit": "abc1234 Add auth module",
  "last_commit_date": "2 hours ago"
}
```

---

### worktree-status.sh

Checks detailed health of a specific worktree.

```bash
~/.claude/skills/worktree-manager/scripts/worktree-status.sh <worktree-path> [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--json` | Output in JSON format |

**Checks performed:**
- Directory exists
- Valid git worktree
- Uncommitted changes
- Unmerged commits count
- Ahead/behind remote
- Dependency installation status

**JSON output:**
```json
{
  "path": "/path/to/worktree",
  "exists": true,
  "is_valid_worktree": true,
  "branch": "feature/PROJ-123-auth",
  "head": "abc1234",
  "base_branch": "develop",
  "has_changes": false,
  "change_count": 0,
  "unmerged_commits": 3,
  "ahead": 3,
  "behind": 0,
  "last_commit": "Add auth module",
  "last_commit_date": "2 hours ago",
  "last_commit_author": "Developer",
  "dependencies": {
    "type": "nodejs",
    "installed": "true"
  }
}
```

---

### worktree-cleanup.sh

Safely removes a worktree, handling the CWD issue. **Requires explicit branch disposition.**

```bash
~/.claude/skills/worktree-manager/scripts/worktree-cleanup.sh <worktree-path> [options]
```

**Branch Disposition (REQUIRED):**

When removing a worktree with an associated feature branch, you MUST specify one of:

| Option | Description |
|--------|-------------|
| `--keep-branch` | Remove worktree but keep branch for future work |
| `--delete-branch` | Remove worktree AND delete branch (local and remote) |

**Note:** Protected branches (`develop`, `main`, `master`) are never deleted and don't require disposition flags.

**Other Options:**
| Option | Description |
|--------|-------------|
| `--force` | Skip safety checks (uncommitted changes warning, lock check) |
| `--dry-run` | Show what would happen without making changes |
| `--timeout <sec>` | Worktree removal timeout (default: 120s, min: 10s). Large worktrees with `node_modules` or `.venv` can take minutes to remove. Overrides `WORKTREE_REMOVE_TIMEOUT` env var. |
| `--network-timeout <sec>` | Network operation timeout for `git push`/`fetch` during remote branch deletion (default: 30s, min: 10s). Overrides `NETWORK_TIMEOUT` env var. |
| `--skip-lock-check` | Skip pre-removal lock and open file handle detection. Useful for CI/headless environments where `lsof` may be unavailable or locks are managed externally. |

**Environment Variables:**
| Variable | Description |
|----------|-------------|
| `WORKTREE_REMOVE_TIMEOUT` | Seconds to wait for worktree removal (default: 120). Overridden by `--timeout`. |
| `NETWORK_TIMEOUT` | Seconds to wait for network operations (default: 30). Overridden by `--network-timeout`. |

**Exit codes:**
| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error (invalid input, git failure) |
| 2 | Safety check failed (uncommitted changes without --force) |
| 3 | Branch disposition required (missing --keep-branch or --delete-branch) |
| 4 | Timeout (operation exceeded time limit) |

**Safety checks (unless --force):**
1. No uncommitted changes
2. No unmerged commits (warns only, non-blocking)
3. Worktree lock detection (unless `--skip-lock-check` or `--force`)
4. Open file handle detection via `lsof` (warns only, non-blocking; unless `--skip-lock-check`)

**Cleanup actions:**
1. Change to project root (CWD fix)
2. Pre-removal checks: lock detection and open file handle scan (unless `--skip-lock-check`)
3. Remove worktree directory (with timeout protection, default 120s)
4. Handle branch disposition:
   - `--keep-branch`: Branch is preserved
   - `--delete-branch`: Delete local branch, then remote if exists (network timeout, default 30s)
   - Protected branch: Skip deletion (informational note only)
5. Prune stale worktree entries

**Examples:**
```bash
# IMPORTANT: Always cd to project root first to avoid breaking the shell!
# Use git rev-parse --show-toplevel to reliably get the repo root

# After merging: delete the branch
cd "$(git rev-parse --show-toplevel)" && worktree-cleanup.sh ./trees/PROJ-123-auth --delete-branch

# Keep branch for later work
cd "$(git rev-parse --show-toplevel)" && worktree-cleanup.sh ./trees/PROJ-123-auth --keep-branch

# Preview what would happen
cd "$(git rev-parse --show-toplevel)" && worktree-cleanup.sh ./trees/PROJ-123-auth --delete-branch --dry-run

# Force removal with uncommitted changes
cd "$(git rev-parse --show-toplevel)" && worktree-cleanup.sh ./trees/PROJ-123-auth --delete-branch --force

# Custom timeout for large worktrees (monorepos, heavy node_modules)
cd "$(git rev-parse --show-toplevel)" && worktree-cleanup.sh ./trees/PROJ-123-auth --delete-branch --timeout 300

# Skip lock detection in CI/headless environments
cd "$(git rev-parse --show-toplevel)" && worktree-cleanup.sh ./trees/PROJ-123-auth --delete-branch --skip-lock-check

# Custom network timeout for slow remotes
cd "$(git rev-parse --show-toplevel)" && worktree-cleanup.sh ./trees/PROJ-123-auth --delete-branch --network-timeout 60

# Use environment variables instead of flags
WORKTREE_REMOVE_TIMEOUT=300 NETWORK_TIMEOUT=60 worktree-cleanup.sh ./trees/PROJ-123-auth --delete-branch
```

## AI Remediation Guides

When errors occur, `worktree-cleanup.sh` outputs structured `=== AI REMEDIATION GUIDE ===` blocks that AI agents can parse to self-recover. Each block contains an error/warning code, context fields, and ordered remediation steps.

### Timeout Remediation (Exit Code 4)

Triggered when worktree removal or network operations exceed their time limit.

**Output format:**
```
=== AI REMEDIATION GUIDE ===
ERROR_CODE: 4
ERROR_TYPE: TIMEOUT
WORKTREE_PATH: ./trees/PROJ-123-auth
TIMEOUT_SECONDS: 120
OPERATION: git worktree remove

REMEDIATION_STEPS:
1. RETRY_WITH_LONGER_TIMEOUT:
   worktree-cleanup.sh ./trees/PROJ-123-auth --delete-branch --timeout 300

2. PRE_DELETE_LARGE_DIRECTORIES:
   rm -rf ./trees/PROJ-123-auth/node_modules
   rm -rf ./trees/PROJ-123-auth/.venv
   worktree-cleanup.sh ./trees/PROJ-123-auth --delete-branch

3. FORCE_PRUNE_WORKTREE:
   rm -rf ./trees/PROJ-123-auth
   git worktree prune
=== END AI REMEDIATION GUIDE ===
```

**Fields:**
| Field | Description |
|-------|-------------|
| `ERROR_CODE` | `4` (matches exit code) |
| `ERROR_TYPE` | `TIMEOUT` |
| `WORKTREE_PATH` | Absolute path to the worktree |
| `TIMEOUT_SECONDS` | The timeout that was exceeded |
| `OPERATION` | The command that timed out (`git worktree remove` or `git push origin --delete`) |

### Lock Remediation (WORKTREE_LOCKED)

Triggered when a worktree has a git lock file preventing removal.

**Output format:**
```
=== AI REMEDIATION GUIDE ===
ERROR_CODE: WORKTREE_LOCKED
WORKTREE_PATH: ./trees/PROJ-123-auth
LOCK_FILE: .git/worktrees/PROJ-123-auth/locked
LOCK_REASON: (reason from lock file, or "(no reason provided)")

REMEDIATION:
1. UNLOCK_WORKTREE:
   git worktree unlock PROJ-123-auth

2. FORCE_REMOVAL:
   worktree-cleanup.sh ./trees/PROJ-123-auth --delete-branch --force

3. SKIP_LOCK_CHECK:
   worktree-cleanup.sh ./trees/PROJ-123-auth --delete-branch --skip-lock-check
=== END AI REMEDIATION GUIDE ===
```

**Fields:**
| Field | Description |
|-------|-------------|
| `ERROR_CODE` | `WORKTREE_LOCKED` |
| `WORKTREE_PATH` | Absolute path to the locked worktree |
| `LOCK_FILE` | Path to the lock file in `.git/worktrees/` |
| `LOCK_REASON` | Contents of the lock file, or `(no reason provided)` if empty |

### Open File Handles Warning (OPEN_FILE_HANDLES)

Emitted as a non-blocking warning when processes have open file handles in the worktree directory. Does not prevent removal, but may cause it to hang or fail.

**Output format:**
```
WARNING_CODE: OPEN_FILE_HANDLES
WORKTREE_PATH: ./trees/PROJ-123-auth
PROCESSES:
node (PID: 12345)
code (PID: 67890)
```

**Fields:**
| Field | Description |
|-------|-------------|
| `WARNING_CODE` | `OPEN_FILE_HANDLES` |
| `WORKTREE_PATH` | Absolute path to the worktree |
| `PROCESSES` | List of `<process-name> (PID: <pid>)` entries, one per line |

**Note:** This check uses `lsof` and is skipped if `lsof` is not available or `--skip-lock-check` is set.

---

## Troubleshooting

### Removal hangs indefinitely

Large worktrees (monorepos with `node_modules`, `.venv`, or build artifacts) can take minutes to remove.

```bash
# Option 1: Increase the timeout
cd "$(git rev-parse --show-toplevel)" && worktree-cleanup.sh ./trees/PROJ-123 --delete-branch --timeout 300

# Option 2: Pre-delete large directories, then remove
rm -rf ./trees/PROJ-123/node_modules ./trees/PROJ-123/.venv ./trees/PROJ-123/dist
cd "$(git rev-parse --show-toplevel)" && worktree-cleanup.sh ./trees/PROJ-123 --delete-branch
```

### Worktree is locked

Git worktrees can be locked to prevent accidental removal. The script detects this and provides remediation.

```bash
# Option 1: Unlock the worktree
git worktree unlock PROJ-123-auth

# Option 2: Force removal (bypasses lock check)
cd "$(git rev-parse --show-toplevel)" && worktree-cleanup.sh ./trees/PROJ-123-auth --delete-branch --force

# Option 3: Skip lock detection entirely
cd "$(git rev-parse --show-toplevel)" && worktree-cleanup.sh ./trees/PROJ-123-auth --delete-branch --skip-lock-check
```

### Network timeout on remote branch deletion

Remote branch deletion requires a network round-trip to the git host. Slow connections or large repos can exceed the default 30s timeout.

```bash
# Increase network timeout
cd "$(git rev-parse --show-toplevel)" && worktree-cleanup.sh ./trees/PROJ-123 --delete-branch --network-timeout 60

# Or use environment variable
NETWORK_TIMEOUT=60 worktree-cleanup.sh ./trees/PROJ-123 --delete-branch
```

### Open file handles warning

Editors, language servers, or other processes may have open file handles in the worktree. This is a non-blocking warning, but open handles can cause removal to hang.

```bash
# Close editors and processes using the worktree, then retry
# The warning lists process names and PIDs for identification

# If you cannot close the processes, use a longer timeout
cd "$(git rev-parse --show-toplevel)" && worktree-cleanup.sh ./trees/PROJ-123 --delete-branch --timeout 300
```

---

## Best Practices

### For Claude/LLMs

1. **ALWAYS `cd` to project root first** - The cleanup script runs in a subshell; you must `cd` in your own session before calling it
2. **Always use the cleanup script** - Never use `git worktree remove` directly
3. **Check status before cleanup** - Run `worktree-status.sh` first
4. **Use --dry-run** - Preview actions before executing
5. **Commit before cleanup** - Avoid losing work

### For Humans

1. **Use scripts for consistency** - Same workflow as Claude
2. **Review unmerged commits** - Don't lose work
3. **Keep branches if unsure** - Use `--keep-branch`

## Supported Project Types

Dependency installation is auto-detected for:

| Type | Detection | Install Command |
|------|-----------|-----------------|
| Node.js | package.json | npm install / yarn / pnpm |
| Python | pyproject.toml, requirements.txt | poetry / uv / pip |
| Ruby | Gemfile | bundle install |
| PHP | composer.json | composer install |
| Go | go.mod | go mod download |
| Rust | Cargo.toml | cargo fetch |
