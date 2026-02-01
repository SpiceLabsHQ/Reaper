---
description: Fast-path from worktree to PR — commit, push, open.
---

# Ship: Worktree to Pull Request

**Task**: [ARGUMENTS]

## 1. Parse Input

Extract from [ARGUMENTS]:
- **WORKTREE_PATH**: Path to worktree (e.g., `./trees/PROJ-123-work`)
- **TARGET_BRANCH**: Branch to PR against (default: `develop`)

If no worktree path provided, check if there's a single active worktree under `./trees/` and use it. If multiple exist, list them and ask which one to ship.

## 2. Pre-Ship Validation

```bash
# Verify worktree exists and is valid
if [ ! -d "$WORKTREE_PATH" ]; then
    echo "SHIP ABORTED: Worktree not found at $WORKTREE_PATH"
    exit 1
fi

# Verify it's a git worktree
git -C "$WORKTREE_PATH" rev-parse --is-inside-work-tree 2>/dev/null || {
    echo "SHIP ABORTED: $WORKTREE_PATH is not a git worktree"
    exit 1
}

BRANCH=$(git -C "$WORKTREE_PATH" branch --show-current)
CHANGES=$(git -C "$WORKTREE_PATH" status --porcelain)
```

**Validation checks:**
- Worktree exists and is a valid git directory
- Branch is not `main` or `develop` (refuse to ship from protected branches)
- There are either uncommitted changes to commit OR existing unpushed commits to push

If nothing to commit and nothing to push, report "Already shipped" and stop.

## 3. Stage and Commit Uncommitted Work

If uncommitted changes exist:

1. **Analyze the diff** to understand what changed
2. **Stage changes**: `git -C $WORKTREE_PATH add -A`
3. **Generate conventional commit message** from the diff:
   - Determine type: `feat`, `fix`, `refactor`, `test`, `docs`, `style`, `chore`
   - Extract scope from affected files
   - Write concise subject (max 72 chars)
4. **Extract task ID** from worktree directory name or branch name
5. **Commit** with Beads/Jira reference if task ID found:
   ```bash
   git -C "$WORKTREE_PATH" commit -m "<type>(<scope>): <subject>

   Ref: <TASK_ID>"
   ```

If multiple logical changes exist (e.g., both a feature and its tests), create separate commits for each.

## 4. Push Branch

```bash
BRANCH=$(git -C "$WORKTREE_PATH" branch --show-current)
git -C "$WORKTREE_PATH" push -u origin "$BRANCH"
```

On push failure, retry up to 3 times with exponential backoff (2s, 4s, 8s).

## 5. Create Pull Request

Use `gh` CLI to create the PR:

```bash
# Gather commit info for PR body
COMMITS=$(git -C "$WORKTREE_PATH" log "$TARGET_BRANCH".."$BRANCH" --oneline)
FILES_CHANGED=$(git -C "$WORKTREE_PATH" diff --stat "$TARGET_BRANCH".."$BRANCH")

# Generate PR title from commits
# If single commit: use commit subject
# If multiple commits: summarize the work

gh pr create \
  --repo "$(git -C "$WORKTREE_PATH" remote get-url origin | sed 's/\.git$//')" \
  --base "$TARGET_BRANCH" \
  --head "$BRANCH" \
  --title "<conventional title>" \
  --body "## Summary
<bullet points summarizing the changes>

## Changes
$FILES_CHANGED

## Test Plan
- [ ] Tests passing (verify in CI)
- [ ] Code reviewed

Ref: <TASK_ID>"
```

If `gh` is not available, output the push result and provide manual instructions.

## 6. Output

```markdown
## Shipped!

**PR**: [URL]
**Branch**: $BRANCH → $TARGET_BRANCH
**Commits**: [count] commits, [files] files changed

### What's Next
- Review the PR at [URL]
- `/reaper:status-worktrees` to check other in-flight work
- Worktree cleanup happens after merge
```

## Scope Boundary

This command does NOT:
- Run quality gates (use `/reaper:takeoff` for that)
- Merge to target branch (PR review required)
- Clean up the worktree (cleanup happens post-merge)
- Modify code (commit what exists as-is)

This is a fast-path shipping command. For full orchestration with quality gates, use `/reaper:takeoff`.

## Error Handling

- **No `gh` CLI**: Fall back to push-only, provide manual PR creation URL
- **Push rejected**: Check if branch exists on remote, suggest force-push only if user confirms
- **No changes**: Report "nothing to ship" and stop
- **Protected branch**: Refuse and suggest creating a feature branch first
