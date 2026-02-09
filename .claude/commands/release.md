---
description: Release workflow - merges develop to main, bumps version, and pushes
---

# Release Workflow

This project uses `commit-and-tag-version` for releases following git-flow. The release process:
1. Merges `develop` → `main`
2. Runs `npm run release` (bumps version in package.json and plugin.json, updates CHANGELOG.md, commits, tags)
3. Pushes main and tags to origin (uses `VERSION_BUMP=0` to satisfy pre-push hook)
4. Back-merges `main` → `develop` (so develop has the version bump)
5. Pushes develop and returns to `develop`

## Step 1: Pre-flight Checks

Run these checks in a single command:

```bash
echo "=== Pre-flight Checks ===" && \
[ -z "$(git status --porcelain)" ] || { echo "ERROR: Uncommitted changes"; git status --short; exit 1; } && \
git fetch origin && \
COMMITS=$(git log main..develop --oneline) && \
if [ -z "$COMMITS" ]; then echo "No new commits. develop and main are in sync."; exit 0; fi && \
echo "Commits to release:" && echo "$COMMITS" && \
echo "" && echo "Files changed:" && git diff main..develop --stat
```

## Step 2: User Confirmation

Use `AskUserQuestion` to ask the user if they want to proceed with the release.

If declined, exit without changes.

## Step 3: Execute Release

Run the full release in a single command chain:

```bash
git checkout main && \
git merge develop --ff-only && \
npm run release && \
VERSION_BUMP=0 git push origin main --follow-tags && \
git checkout develop && \
git merge main && \
VERSION_BUMP=0 git push origin develop && \
echo "=== Release Complete ==="
```

If the fast-forward merge fails, ask the user how to proceed (merge commit or abort).
