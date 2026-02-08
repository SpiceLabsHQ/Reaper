---
description: Fast-path from worktree to PR — commit, push, open.
---

# Ship: Worktree to Pull Request

**Task**: [ARGUMENTS]

## Visual Vocabulary

> **Opt-out**: If the project's CLAUDE.md contains the line `Reaper: disable ASCII art`, emit plain text status labels only. No gauge bars, no box-drawing, no card templates. Use the `functional` context behavior regardless of the `context` parameter.

> **Rendering constraint**: One line, one direction, no column alignment. Every visual element must be renderable in a single horizontal pass. No multi-line box-drawing that requires vertical alignment across columns.

### Gauge States

Five semantic states expressed as fixed-width 10-block bars. Use these consistently across all commands to communicate work status.

```
  ██████████  LANDED       complete, healthy
  ████████░░  ON APPROACH  coding done, quality gates running
  ██████░░░░  IN FLIGHT    work in progress
  ░░░░░░░░░░  TAXIING     waiting, not started
  ░░░░!!░░░░  FAULT        failed, needs attention
```

Gauge usage rules:
- Always use exactly 10 blocks per bar (full-width = 10 filled, empty = 10 unfilled).
- The exclamation marks in the FAULT bar replace two blocks at the center to signal breakage.
- Pair each bar with its label and a short gloss on the same line.

### Quality Gate Statuses

Five inspection verdicts for quality gate results. Gate statuses are inspection verdicts, not work lifecycle states. Use gauge states for work unit progress, gate statuses for quality inspection results.

| Status | Meaning |
|--------|---------|
| **PASS** | gate passed all checks |
| **FAIL** | gate found blocking issues |
| **RUNNING** | gate currently executing |
| **PENDING** | gate not yet started |
| **SKIP** | gate not applicable to this work type |

### Departure Card

Render when the ship command begins. Shows what is being shipped.

```
  DEPARTURE
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Worktree:   [worktree-path]
  Branch:     [branch-name]
  Commits:    [N commits to ship]
  Target:     [target branch or PR]
  ██████░░░░  IN FLIGHT
```

### Landing Card

Render when the ship command completes. Shows the result of the PR or merge.

```
  LANDING
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PR:         [PR-URL or merge result]
  Status:     [merged / opened / failed]
  ██████████  LANDED
```


## 1. Determine Worktree Context

Resolve the worktree using this priority order:

1. **Session context**: If you are already operating inside a worktree (e.g., dispatched by `takeoff`, or the user has been working in a `./trees/` directory this session), use that worktree. Check your current working context and recent file operations.
2. **CWD**: Run `pwd` — if the current directory is inside a `./trees/` path, use it.
3. **Explicit path from arguments**: If [ARGUMENTS] contains a path (e.g., `./trees/PROJ-123-work`), use it.
4. **Auto-detect**: List worktrees under `./trees/`. If exactly one exists, use it. If multiple exist, list them and ask which one to ship.

```bash
# Check CWD first
CURRENT_DIR=$(pwd)
if echo "$CURRENT_DIR" | grep -q "/trees/"; then
    WORKTREE_PATH="$CURRENT_DIR"
fi

# Or use argument if provided
# WORKTREE_PATH="[from ARGUMENTS if path given]"

# Or auto-detect
if [ -z "$WORKTREE_PATH" ]; then
    WORKTREES=$(git worktree list --porcelain | grep "^worktree.*trees/" | sed 's/^worktree //')
    WORKTREE_COUNT=$(echo "$WORKTREES" | grep -c .)
    if [ "$WORKTREE_COUNT" -eq 1 ]; then
        WORKTREE_PATH="$WORKTREES"
    elif [ "$WORKTREE_COUNT" -gt 1 ]; then
        echo "Multiple worktrees found — which one should I ship?"
        echo "$WORKTREES"
        # Stop and ask user
    else
        echo "SHIP ABORTED: No worktrees found under ./trees/"
    fi
fi
```

Extract **TARGET_BRANCH** from [ARGUMENTS] if provided (default: `develop`).

## 2. Pre-Ship Validation

```bash
# Verify worktree exists and is valid
git -C "$WORKTREE_PATH" rev-parse --is-inside-work-tree 2>/dev/null || {
    echo "SHIP ABORTED: $WORKTREE_PATH is not a valid git worktree"
    exit 1
}

BRANCH=$(git -C "$WORKTREE_PATH" branch --show-current)
CHANGES=$(git -C "$WORKTREE_PATH" status --porcelain)

# Detect repo host from remote URL
REMOTE_URL=$(git -C "$WORKTREE_PATH" remote get-url origin 2>/dev/null)
```

**Validation checks:**
- Worktree is a valid git directory
- Branch is not `main`, `master`, or `develop` (refuse to ship from protected branches)
- There are either uncommitted changes to commit OR existing unpushed commits to push

If nothing to commit and nothing to push, report "Already shipped" and stop.

### Departure Card

After validation passes, render a **Departure Card** using the template from the Visual Vocabulary. Populate it with values gathered so far:

```
  DEPARTURE
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Worktree:   $WORKTREE_PATH
  Branch:     $BRANCH
  Commits:    [uncommitted changes + unpushed commits count]
  Target:     $TARGET_BRANCH
  ██████░░░░  IN FLIGHT
```

This card is compact and factual. No narration, no flair -- just flight data.

## 3. Identify Task and Repo Host

**Task ID and repo host are independent concerns.** The worktree may reference a Beads, Jira, or other task tracker ID, but the PR is created on whatever platform hosts the git remote.

### 3a. Extract Task ID (for commit references)

Extract task ID from the worktree directory name or branch name:

```bash
# Extract from worktree path: ./trees/PROJ-123-work → PROJ-123
# Or: ./trees/reaper-a3f-oauth → reaper-a3f
# Or: ./trees/issue-456-ratelimit → #456
WORKTREE_NAME=$(basename "$WORKTREE_PATH")

# Try Jira pattern: PROJ-123
TASK_ID=$(echo "$WORKTREE_NAME" | grep -oE '^[A-Z]+-[0-9]+')

# Try Beads pattern: repo-hexid
if [ -z "$TASK_ID" ]; then
    TASK_ID=$(echo "$WORKTREE_NAME" | grep -oE '^[a-z]+-[a-f0-9]+')
fi

# Try GitHub issue pattern: issue-456
if [ -z "$TASK_ID" ]; then
    ISSUE_NUM=$(echo "$WORKTREE_NAME" | grep -oE 'issue-([0-9]+)' | grep -oE '[0-9]+')
    if [ -n "$ISSUE_NUM" ]; then
        TASK_ID="#$ISSUE_NUM"
    fi
fi
```

The task ID goes into commit footers (`Ref: TASK_ID`) and PR body, regardless of where the PR is hosted.

### 3b. Detect Repo Host (for PR creation)

```bash
REMOTE_URL=$(git -C "$WORKTREE_PATH" remote get-url origin 2>/dev/null)

# Detect host from remote URL
if echo "$REMOTE_URL" | grep -qiE 'github\.com|github\.'; then
    REPO_HOST="github"
elif echo "$REMOTE_URL" | grep -qiE 'bitbucket\.org|bitbucket\.'; then
    REPO_HOST="bitbucket"
elif echo "$REMOTE_URL" | grep -qiE 'gitlab\.com|gitlab\.'; then
    REPO_HOST="gitlab"
else
    REPO_HOST="unknown"
fi
```

## 4. Stage and Commit Uncommitted Work

If uncommitted changes exist:

1. **Analyze the diff** to understand what changed
2. **Pre-stage safety scan**: Before staging, check for sensitive files in the working tree:
   ```bash
   # Scan for sensitive file patterns
   SENSITIVE_PATTERNS='.env* *.pem *.key *.p12 *.pfx *.jks id_rsa* *.credentials *.secret *.token node_modules/ *.sqlite *.db'
   SENSITIVE_FOUND=$(git -C "$WORKTREE_PATH" status --porcelain | awk '{print $2}' | grep -E '(\.env|\.pem$|\.key$|\.p12$|\.pfx$|\.jks$|id_rsa|\.credentials$|\.secret$|\.token$|node_modules/|\.sqlite$|\.db$)' || true)

   if [ -n "$SENSITIVE_FOUND" ]; then
       echo "WARNING: Sensitive files detected in working tree:"
       echo "$SENSITIVE_FOUND"
       echo "This is a common-pattern check, not a comprehensive security scan — review staged files manually."
   fi
   ```
   If sensitive files are found, warn the user and exclude them from staging:
   ```bash
   # Stage everything, then unstage sensitive matches
   git -C "$WORKTREE_PATH" add -A
   echo "$SENSITIVE_FOUND" | while read -r FILE; do
       git -C "$WORKTREE_PATH" reset HEAD -- "$FILE" 2>/dev/null || true
   done
   ```
   If no sensitive files are found, stage normally: `git -C "$WORKTREE_PATH" add -A`
3. **Generate conventional commit message** from the diff:
   - Determine type: `feat`, `fix`, `refactor`, `test`, `docs`, `style`, `chore`
   - Extract scope from affected files
   - Write concise subject (max 72 chars)
4. **Commit** with task reference if task ID was found:
   ```bash
   git -C "$WORKTREE_PATH" commit -m "<type>(<scope>): <subject>

   Ref: <TASK_ID>"
   ```

If multiple logical changes exist (e.g., both a feature and its tests), create separate commits for each.

## 5. Push Branch

```bash
BRANCH=$(git -C "$WORKTREE_PATH" branch --show-current)
git -C "$WORKTREE_PATH" push -u origin "$BRANCH"
```

On push failure, retry up to 3 times with exponential backoff (2s, 4s, 8s).

## 6. Create Pull Request

### Gather Context

```bash
COMMITS=$(git -C "$WORKTREE_PATH" log "$TARGET_BRANCH".."$BRANCH" --oneline)
FILES_CHANGED=$(git -C "$WORKTREE_PATH" diff --stat "$TARGET_BRANCH".."$BRANCH")

# Generate PR title from commits
# Single commit: use commit subject
# Multiple commits: summarize the work
```

### PR Body Template

```markdown
## Summary
<bullet points summarizing the changes>

## Changes
$FILES_CHANGED

## Test Plan
- [ ] Tests passing (verify in CI)
- [ ] Code reviewed

Ref: <TASK_ID>
```

### Create PR by Host

**GitHub** (via `gh` CLI):
```bash
gh pr create \
  --base "$TARGET_BRANCH" \
  --head "$BRANCH" \
  --title "<conventional title>" \
  --body "$PR_BODY"
```

**Bitbucket** (via `acli` — preferred, consistent with Jira workflow):
```bash
# acli handles auth, repo detection, and API calls
acli bitbucket pullrequest create \
  --source "$BRANCH" \
  --destination "$TARGET_BRANCH" \
  --title "<conventional title>" \
  --description "$PR_BODY"
```

If `acli` is not available, fall back to the Bitbucket REST API:
```bash
REPO_SLUG=$(echo "$REMOTE_URL" | sed -E 's#.*bitbucket\.org[:/]([^/]+/[^/]+?)(\.git)?$#\1#')

curl -s -X POST \
  "https://api.bitbucket.org/2.0/repositories/$REPO_SLUG/pullrequests" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BITBUCKET_TOKEN" \
  -d '{
    "title": "<conventional title>",
    "description": "'"$PR_BODY"'",
    "source": { "branch": { "name": "'"$BRANCH"'" } },
    "destination": { "branch": { "name": "'"$TARGET_BRANCH"'" } },
    "close_source_branch": false
  }'
```

**Bitbucket auth fallback order** (when acli unavailable):
1. `BITBUCKET_TOKEN` environment variable
2. `BITBUCKET_APP_PASSWORD` environment variable
3. Git credential helper (`git credential fill`)
4. Fall back to push-only with manual PR URL

**GitLab** (via `glab` CLI or API):
```bash
# If glab is available
glab mr create \
  --target-branch "$TARGET_BRANCH" \
  --source-branch "$BRANCH" \
  --title "<conventional title>" \
  --description "$PR_BODY"

# Otherwise fall back to API or manual URL
```

**Unknown/Unsupported host**: Push succeeds, output the remote URL and suggest creating the PR manually.

## 7. Output — Landing Card

When all steps complete, render a **Landing Card** using the template from the Visual Vocabulary. Populate it with the actual PR URL and outcome status:

```
  LANDING
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PR:         [PR-URL or merge result]
  Status:     [merged / opened / failed]
  ██████████  LANDED
```

Landing card rules:
- **PR** shows the PR URL returned by the host CLI, or the push URL if PR creation was skipped.
- **Status** shows `opened` when a PR was created, `merged` if auto-merged, or `failed` if PR creation failed.
- Use the FAULT gauge state (`░░░░!!░░░░  FAULT`) instead of LANDED if any step failed.
- If PR creation was skipped (unknown host), set Status to `manual` and PR to the remote push URL.

After the card, append two actionable follow-up lines:

```
Review the PR → [URL]
Check fleet   → /reaper:status-worktrees
```

This output is compact and transactional. No narration, no headings, no filler text.

## Scope Boundary

This command does NOT:
- Run quality gates (use `/reaper:takeoff` for that)
- Merge to target branch (PR review required)
- Clean up the worktree (cleanup happens post-merge)
- Modify code (commit what exists as-is)

This is a fast-path shipping command. For full orchestration with quality gates, use `/reaper:takeoff`.

## Error Handling

- **No CLI tool for host**: Try `acli` (Bitbucket), `gh` (GitHub), `glab` (GitLab), then REST API, then push-only with manual PR URL
- **Auth failure**: Report which auth methods were tried, suggest setting the appropriate token env var
- **Push rejected**: Check if branch exists on remote, suggest force-push only if user confirms
- **No changes**: Report "nothing to ship" and stop
- **Protected branch**: Refuse and suggest creating a feature branch first
