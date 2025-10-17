---
name: worktree-cleanup
description: Safe worktree removal with verification, merge validation, and Jira integration. Automatically activates when cleaning up worktrees, after merging features, completing tasks, or when worktree removal is needed. Prevents lost work through comprehensive safety checks.
allowed-tools: [Bash, Read]
---

# SPICE Worktree Cleanup Skill

Automates safe removal of git worktrees with comprehensive validation, merge verification, and integration cleanup following SPICE standards.

## Activation Triggers

This skill automatically activates when:
- Completing work and cleaning up worktrees
- After merging features to develop
- Need to remove worktrees safely
- User requests worktree cleanup or removal

## Pre-Cleanup Validation Protocol

**CRITICAL: Never remove a worktree without these safety checks**

### 1. Verify Running from Root Directory

```bash
# MUST be in root directory, not in the worktree being cleaned up
pwd | grep -q "/trees/" && {
    echo "ERROR: Currently inside a worktree directory"
    echo "Navigate to root directory first"
    exit 1
}
```

### 2. Check for Uncommitted Changes

```bash
WORKTREE_PATH="./trees/PROJ-123-description"

# Verify worktree exists
if [ ! -d "$WORKTREE_PATH" ]; then
    echo "ERROR: Worktree not found at $WORKTREE_PATH"
    git worktree list
    exit 1
fi

# Check for uncommitted changes
if [ -n "$(git -C "$WORKTREE_PATH" status --porcelain)" ]; then
    echo "ERROR: Uncommitted changes detected in worktree!"
    echo ""
    git -C "$WORKTREE_PATH" status
    echo ""
    echo "Options:"
    echo "  1. Commit changes: git -C $WORKTREE_PATH commit -m 'message'"
    echo "  2. Stash changes: git -C $WORKTREE_PATH stash"
    echo "  3. Discard changes: git -C $WORKTREE_PATH reset --hard"
    exit 1
fi

echo "✅ No uncommitted changes detected"
```

### 3. Check for Unmerged Commits

```bash
BRANCH_NAME="feature/PROJ-123-description"

# Check if branch has commits not in develop
UNMERGED=$(git log develop.."$BRANCH_NAME" --oneline 2>/dev/null)

if [ -n "$UNMERGED" ]; then
    echo "⚠️  WARNING: Branch has unmerged commits:"
    echo ""
    echo "$UNMERGED"
    echo ""
    echo "These commits will be lost if you proceed without merging!"
    echo ""
    echo "Options:"
    echo "  1. Merge to develop first (see merge section below)"
    echo "  2. Cancel cleanup and review commits"
    exit 1
fi

echo "✅ All commits are merged to develop"
```

## Merge to Develop Protocol

**IMPORTANT: LLMs can ONLY merge to develop, NOT main**

### Pre-Merge Validation

```bash
BRANCH_NAME="feature/PROJ-123-description"
WORKTREE_PATH="./trees/PROJ-123-description"

echo "=== Pre-Merge Validation ==="

# 1. Verify no uncommitted changes
if [ -n "$(git -C "$WORKTREE_PATH" status --porcelain)" ]; then
    echo "ERROR: Cannot merge with uncommitted changes"
    exit 1
fi

# 2. Check for commits to merge
COMMITS_TO_MERGE=$(git log develop.."$BRANCH_NAME" --oneline)
if [ -z "$COMMITS_TO_MERGE" ]; then
    echo "⚠️  No commits to merge from $BRANCH_NAME"
    exit 1
fi

echo "📝 Commits to be merged:"
echo "$COMMITS_TO_MERGE"
echo ""

# 3. Check for merge conflicts
git checkout develop --quiet
if ! git merge "$BRANCH_NAME" --no-commit --no-ff &>/dev/null; then
    echo "ERROR: Merge conflicts detected with develop!"
    git merge --abort
    echo ""
    echo "Resolve conflicts:"
    echo "  1. git checkout develop"
    echo "  2. git merge $BRANCH_NAME"
    echo "  3. Resolve conflicts manually"
    echo "  4. git commit"
    exit 1
fi
git merge --abort  # Abort the test merge

echo "✅ Pre-merge validation passed"
```

### Execute Merge to Develop

```bash
BRANCH_NAME="feature/PROJ-123-description"
JIRA_KEY="PROJ-123"  # Extract from branch name

echo "=== Merging to Develop ==="

# Checkout develop
git checkout develop || {
    echo "ERROR: Failed to checkout develop"
    exit 1
}

# Pull latest changes
git pull origin develop || {
    echo "WARNING: Could not pull latest develop changes"
}

# Merge feature branch (no fast-forward)
git merge "$BRANCH_NAME" --no-ff -m "feat: merge $BRANCH_NAME

Ref: $JIRA_KEY" || {
    echo "ERROR: Merge failed!"
    echo "Resolve conflicts and retry"
    exit 1
}

echo "✅ Successfully merged $BRANCH_NAME to develop"

# Push to remote develop (LLMs can ONLY push to develop)
git push origin develop || {
    echo "WARNING: Could not push to origin develop"
    echo "You may need to push manually"
}

echo "✅ Pushed develop to remote"
```

### Main Branch Protection

**CRITICAL: LLMs MUST NOT merge to main without explicit user permission**

```bash
# ❌ FORBIDDEN for LLMs without explicit permission:
# git checkout main
# git merge develop
# git push origin main

# ✅ PERMITTED: Notify user that develop is ready
echo ""
echo "╔════════════════════════════════════════════╗"
echo "║  Develop Branch Updated                    ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "✅ Feature merged to develop and pushed"
echo ""
echo "⚠️  Main branch merge requires explicit user permission"
echo "To merge to main (production):"
echo "  1. User reviews develop branch"
echo "  2. User explicitly approves: 'merge to main'"
echo "  3. Then run: git checkout main && git merge develop --no-ff"
echo ""
```

## Branch Cleanup Protocol

After successful merge, clean up local and remote branches:

```bash
BRANCH_NAME="feature/PROJ-123-description"
WORKTREE_PATH="./trees/PROJ-123-description"

echo "=== Cleaning Up Branches ==="

# 1. Remove remote branch (if exists)
if git show-ref --verify --quiet "refs/remotes/origin/$BRANCH_NAME"; then
    echo "🗑️  Removing remote branch..."
    git push origin --delete "$BRANCH_NAME" || {
        echo "WARNING: Could not delete remote branch"
        echo "Manual cleanup: git push origin --delete $BRANCH_NAME"
    }
    echo "✅ Removed remote branch"
else
    echo "ℹ️  No remote branch to remove"
fi

# 2. Remove worktree
echo "🗑️  Removing worktree..."
git worktree remove "$WORKTREE_PATH" || {
    echo "ERROR: Could not remove worktree"
    echo "Check for processes using the directory"
    echo "Force remove: git worktree remove $WORKTREE_PATH --force"
    exit 1
}
echo "✅ Removed worktree at $WORKTREE_PATH"

# 3. Delete local branch
echo "🗑️  Deleting local branch..."
git branch -d "$BRANCH_NAME" || {
    echo "WARNING: Could not delete local branch"
    echo "Branch may have unmerged commits"
    echo "Force delete: git branch -D $BRANCH_NAME"
    exit 1
}
echo "✅ Deleted local branch $BRANCH_NAME"
```

## Jira Integration

Update Jira ticket status after successful merge:

```bash
JIRA_KEY="PROJ-123"  # Extract from branch name or worktree path

echo "=== Updating Jira Ticket ==="

# Transition ticket to "In Review" status
acli jira workitem transition --key "$JIRA_KEY" --status "In Review" || {
    echo "⚠️  WARNING: Could not transition $JIRA_KEY to In Review"
    echo "Please manually update the ticket in Jira"
    echo "Ticket: $JIRA_KEY → In Review"
}

# Optional: Add comment with merge details
LATEST_COMMIT=$(git log -1 --format="%h - %s")
acli jira workitem comment --key "$JIRA_KEY" --body "Merged to develop: $LATEST_COMMIT" 2>/dev/null || {
    echo "Note: Could not add Jira comment (not critical)"
}

echo "✅ Jira ticket updated"
```

## Complete Cleanup Workflow

**Full automated cleanup with all safety checks:**

```bash
#!/bin/bash
# Complete safe cleanup for PROJ-123

JIRA_KEY="PROJ-123"
DESCRIPTION="auth"
WORKTREE_PATH="./trees/${JIRA_KEY}-${DESCRIPTION}"
BRANCH_NAME="feature/${JIRA_KEY}-${DESCRIPTION}"

# Step 1: Verify running from root
echo "=== Pre-Flight Validation ==="
pwd | grep -q "/trees/" && {
    echo "ERROR: Must run from root directory"
    exit 1
}

# Step 2: Verify worktree exists
if [ ! -d "$WORKTREE_PATH" ]; then
    echo "ERROR: Worktree not found at $WORKTREE_PATH"
    git worktree list
    exit 1
fi

# Step 3: Check for uncommitted changes
echo "=== Checking for Uncommitted Changes ==="
if [ -n "$(git -C "$WORKTREE_PATH" status --porcelain)" ]; then
    echo "ERROR: Uncommitted changes detected!"
    git -C "$WORKTREE_PATH" status
    exit 1
fi
echo "✅ No uncommitted changes"

# Step 4: Check for unmerged commits
echo "=== Checking for Unmerged Commits ==="
UNMERGED=$(git log develop.."$BRANCH_NAME" --oneline 2>/dev/null)
if [ -n "$UNMERGED" ]; then
    echo "⚠️  Branch has unmerged commits:"
    echo "$UNMERGED"
    echo ""
    echo "Proceeding with merge to develop..."
else
    echo "ℹ️  All commits already merged"
fi

# Step 5: Pre-merge validation
if [ -n "$UNMERGED" ]; then
    echo "=== Pre-Merge Validation ==="
    git checkout develop --quiet
    if ! git merge "$BRANCH_NAME" --no-commit --no-ff &>/dev/null; then
        echo "ERROR: Merge conflicts detected!"
        git merge --abort
        exit 1
    fi
    git merge --abort
    echo "✅ No merge conflicts detected"
fi

# Step 6: Merge to develop (if needed)
if [ -n "$UNMERGED" ]; then
    echo "=== Merging to Develop ==="
    git checkout develop
    git pull origin develop 2>/dev/null || echo "Note: Could not pull latest develop"

    git merge "$BRANCH_NAME" --no-ff -m "feat: merge $BRANCH_NAME

Ref: $JIRA_KEY" || {
        echo "ERROR: Merge failed"
        exit 1
    }

    echo "✅ Merged to develop"

    # Push to develop
    git push origin develop || {
        echo "WARNING: Could not push to remote"
    }
    echo "✅ Pushed to origin/develop"
fi

# Step 7: Remove remote branch
echo "=== Cleaning Up Remote Branch ==="
if git show-ref --verify --quiet "refs/remotes/origin/$BRANCH_NAME"; then
    git push origin --delete "$BRANCH_NAME" || {
        echo "WARNING: Could not delete remote branch"
    }
    echo "✅ Removed remote branch"
fi

# Step 8: Remove worktree
echo "=== Removing Worktree ==="
git worktree remove "$WORKTREE_PATH" || {
    echo "ERROR: Could not remove worktree"
    exit 1
}
echo "✅ Removed worktree"

# Step 9: Delete local branch
echo "=== Deleting Local Branch ==="
git branch -d "$BRANCH_NAME" || {
    echo "WARNING: Could not delete local branch"
}
echo "✅ Deleted local branch"

# Step 10: Update Jira ticket
echo "=== Updating Jira Ticket ==="
acli jira workitem transition --key "$JIRA_KEY" --status "In Review" || {
    echo "WARNING: Could not update Jira ticket"
    echo "Please manually transition $JIRA_KEY to In Review"
}
echo "✅ Jira ticket updated"

# Step 11: Display summary
echo ""
echo "╔════════════════════════════════════════╗"
echo "║  Cleanup Complete                      ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "✅ Worktree removed: $WORKTREE_PATH"
echo "✅ Branch deleted: $BRANCH_NAME"
echo "✅ Merged to develop"
echo "✅ Jira ticket updated: $JIRA_KEY → In Review"
echo ""
echo "⚠️  Main branch merge requires explicit user permission"
echo ""
```

## Cleanup-Only (No Merge)

If work is already merged or you need to remove without merging:

```bash
WORKTREE_PATH="./trees/PROJ-123-description"
BRANCH_NAME="feature/PROJ-123-description"

# Verify all commits are merged
UNMERGED=$(git log develop.."$BRANCH_NAME" --oneline 2>/dev/null)
if [ -n "$UNMERGED" ]; then
    echo "ERROR: Branch has unmerged commits:"
    echo "$UNMERGED"
    echo ""
    echo "Cannot cleanup without merging. Options:"
    echo "  1. Merge to develop first"
    echo "  2. Force delete with: git branch -D $BRANCH_NAME"
    exit 1
fi

# Safe cleanup (no merge needed)
git worktree remove "$WORKTREE_PATH"
git branch -d "$BRANCH_NAME"
git push origin --delete "$BRANCH_NAME" 2>/dev/null

echo "✅ Cleanup complete (no merge needed)"
```

## Force Cleanup (Emergency Only)

**⚠️ Use only when worktree is corrupted or inaccessible**

```bash
WORKTREE_PATH="./trees/PROJ-123-description"
BRANCH_NAME="feature/PROJ-123-description"

echo "⚠️  WARNING: Force cleanup will discard ALL uncommitted work!"
echo "This should only be used for corrupted worktrees"
echo ""
read -p "Are you sure? (type YES to confirm) " -r
if [ "$REPLY" != "YES" ]; then
    echo "Cancelled"
    exit 0
fi

# Force remove worktree
git worktree remove "$WORKTREE_PATH" --force || {
    # If worktree command fails, manually remove directory
    rm -rf "$WORKTREE_PATH"
    # Prune worktree list
    git worktree prune
}

# Force delete branch (ignores unmerged commits)
git branch -D "$BRANCH_NAME" 2>/dev/null

# Remove remote branch
git push origin --delete "$BRANCH_NAME" 2>/dev/null

echo "✅ Force cleanup complete"
```

## Common Issues and Solutions

### Issue: "Cannot remove worktree - directory in use"

**Cause:** Processes or editors are accessing files in the worktree

**Solution:**
```bash
# Find processes using the directory
lsof +D ./trees/PROJ-123-description

# Close editors/terminals accessing the worktree
# Then retry removal
git worktree remove ./trees/PROJ-123-description
```

### Issue: "Cannot delete branch - not fully merged"

**Cause:** Branch has commits not in develop

**Solution:**
```bash
# Review unmerged commits
git log develop..feature/PROJ-123-description --oneline

# Option 1: Merge to develop first
git checkout develop
git merge feature/PROJ-123-description --no-ff

# Option 2: Force delete (CAUTION: loses commits)
git branch -D feature/PROJ-123-description
```

### Issue: Jira transition fails

**Cause:** Workflow doesn't allow transition or ticket is blocked

**Solution:**
```bash
# Check current ticket status
acli jira workitem view PROJ-123 --fields status,blockedby

# View available transitions
acli jira workitem view PROJ-123

# Manually update in Jira UI if automated transition fails
```

## Validation Checklist

Before considering cleanup complete, verify:

- [ ] Running from root directory (not in a worktree)
- [ ] No uncommitted changes in worktree
- [ ] All commits merged to develop
- [ ] Tests passed before merge
- [ ] Linting passed before merge
- [ ] Worktree removed successfully
- [ ] Local branch deleted
- [ ] Remote branch deleted (if existed)
- [ ] Jira ticket transitioned to "In Review"
- [ ] No leftover files in `./trees/` directory

## Integration with SPICE Workflow

This skill is the final step in the SPICE development workflow:

1. WORKTREE_SETUP - Create isolated environment
2. Implement changes using TDD
3. PRE_COMMIT_CHECK - Validate quality
4. GIT_COMMIT - Create proper commit
5. **WORKTREE_CLEANUP** ← You are here (merge and clean up)

## References

- SPICE Worktrees: `~/.claude/docs/spice/SPICE-Worktrees.md`
- Git Flow Standards: `~/.claude/docs/spice/SPICE-Git-Flow.md`
- Main Branch Protection: `~/.claude/docs/spice/CLAUDE-IMPORT.md`
