# Worktree Manager Reference

Detailed documentation for the worktree-manager skill.

## The CWD Problem

### What Happens

When Claude removes a worktree while the shell's current working directory (CWD) is inside that worktree:

1. **Direct removal fails**: `git worktree remove` returns "fatal: cannot remove the current working directory"
2. **Force removal breaks shell**: If you use `--force`, the directory is deleted but the shell's CWD becomes invalid
3. **Session breaks**: All subsequent Bash commands fail with "No such file or directory"

### The Fix

The `worktree-cleanup.sh` script solves this by:

1. Resolving the worktree path to absolute
2. Finding the project root (parent of `./trees/`)
3. **Changing to project root BEFORE any removal operations**
4. Then safely removing the worktree

```bash
# The critical fix in worktree-cleanup.sh
PROJECT_ROOT=$(find_project_root "$WORKTREE_PATH")
cd "$PROJECT_ROOT" || exit 1  # ← This is the key
git worktree remove "$WORKTREE_PATH"
```

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

Safely removes a worktree, handling the CWD issue.

```bash
~/.claude/skills/worktree-manager/scripts/worktree-cleanup.sh <worktree-path> [options]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--force` | Skip safety checks |
| `--dry-run` | Show what would happen |
| `--keep-branch` | Remove worktree but keep branch |

**Exit codes:**
| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error (invalid input, git failure) |
| 2 | Safety check failed (uncommitted changes) |

**Safety checks (unless --force):**
1. No uncommitted changes
2. No unmerged commits (warns only)

**Cleanup actions:**
1. Change to project root (CWD fix)
2. Remove worktree directory
3. Delete local branch (unless --keep-branch)
4. Delete remote branch (if exists)
5. Prune stale worktree entries

## Error Recovery

### Shell Already Broken

If Claude's shell is already in a broken state (CWD was deleted):

```bash
# Reset to home directory first
cd ~

# Then navigate to project
cd /path/to/project

# Clean up stale entries
git worktree prune

# List remaining worktrees
git worktree list
```

### Worktree Won't Remove

If standard removal fails:

```bash
# Try force removal
git worktree remove ./trees/PROJ-123-auth --force

# If that fails, manual cleanup
rm -rf ./trees/PROJ-123-auth
git worktree prune
```

### Branch Won't Delete

If branch deletion fails:

```bash
# Check if fully merged
git log develop..feature/PROJ-123-auth --oneline

# Force delete if you're sure
git branch -D feature/PROJ-123-auth
```

## Best Practices

### For Claude/LLMs

1. **Always use the cleanup script** - Never use `git worktree remove` directly
2. **Check status before cleanup** - Run `worktree-status.sh` first
3. **Use --dry-run** - Preview actions before executing
4. **Commit before cleanup** - Avoid losing work

### For Humans

1. **Use scripts for consistency** - Same workflow as Claude
2. **Review unmerged commits** - Don't lose work
3. **Keep branches if unsure** - Use `--keep-branch`

## Integration with SPICE

This skill complements the SPICE workflow:

1. **WORKTREE_SETUP** (spice skill) - Initial documentation
2. **worktree-create.sh** (this skill) - Script-based creation
3. Implementation work
4. Quality validation
5. **worktree-cleanup.sh** (this skill) - Safe removal

The key difference: This skill provides **scripts** that handle edge cases programmatically, while the SPICE skills provide **documentation** for manual workflows.

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
