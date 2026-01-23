---
description: Release workflow - merges develop to beads-sync and pushes
---

# Release Workflow

This command safely promotes code from `develop` to `beads-sync` (main release branch).

## Step 1: Pre-flight Checks

First, capture the current state and validate the environment:

```bash
# Store original branch for restoration
ORIGINAL_BRANCH=$(git branch --show-current)
echo "Original branch: $ORIGINAL_BRANCH"

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  echo "ERROR: Working directory has uncommitted changes"
  echo "Please commit or stash your changes before releasing."
  git status --short
  exit 1
fi

# Check if required branches exist
if ! git rev-parse --verify develop >/dev/null 2>&1; then
  echo "ERROR: 'develop' branch not found"
  exit 1
fi

if ! git rev-parse --verify beads-sync >/dev/null 2>&1; then
  echo "ERROR: 'beads-sync' branch not found"
  exit 1
fi

echo "✓ Pre-flight checks passed"
```

## Step 2: Fetch Latest and Compare Branches

Fetch the latest from remote and compare the branches:

```bash
# Fetch latest from origin
git fetch origin

# Show commits on develop that are not on beads-sync
echo ""
echo "=== Commits on develop not yet on beads-sync ==="
COMMITS=$(git log beads-sync..develop --oneline)
if [ -z "$COMMITS" ]; then
  echo "No new commits to release. develop and beads-sync are in sync."
  echo ""
  echo "Nothing to do. Staying on current branch."
  exit 0
fi
echo "$COMMITS"
echo ""

# Count commits
COMMIT_COUNT=$(git rev-list beads-sync..develop --count)
echo "Total: $COMMIT_COUNT commit(s) to release"
echo ""

# Show file statistics
echo "=== Files Changed ==="
git diff beads-sync..develop --stat
```

## Step 3: User Confirmation

If there are unmerged commits on develop, ask the user:

**Question:** There are commits on `develop` that haven't been merged to `beads-sync`. Do you want to proceed with the release and merge these changes?

Wait for user confirmation before proceeding. If the user says no, restore the original branch and exit.

## Step 4: Execute Release

If the user confirms, perform the merge:

```bash
# Checkout beads-sync
git checkout beads-sync

# Pull latest beads-sync from remote
git pull origin beads-sync

# Merge develop into beads-sync (fast-forward if possible)
echo ""
echo "Merging develop into beads-sync..."
if git merge develop --ff-only 2>/dev/null; then
  echo "✓ Fast-forward merge successful"
else
  echo "Fast-forward not possible, performing merge commit..."
  git merge develop -m "Merge develop into beads-sync for release"
  echo "✓ Merge commit created"
fi

# Push to remote
echo ""
echo "Pushing beads-sync to origin..."
git push origin beads-sync
echo "✓ Pushed to origin/beads-sync"
```

## Step 5: Restore Working Branch

Always restore the working branch to `develop`:

```bash
echo ""
echo "Restoring working branch to develop..."
git checkout develop
echo "✓ Now on branch: $(git branch --show-current)"
echo ""
echo "=== Release Complete ==="
```

## Error Handling

If any step fails:
1. Report the error clearly
2. Attempt to restore the original branch
3. Suggest manual resolution steps

## Safety Notes

- This command will NOT proceed without explicit user confirmation
- Fast-forward merge is preferred to keep history clean
- If fast-forward isn't possible, a merge commit is created
- The working branch is always restored to `develop` at the end
- No force pushes are used
