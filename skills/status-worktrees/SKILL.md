---
name: status-worktrees
description: Radar sweep your parallel worktrees for progress and drift.
user-invocable: true
---

# Status of Worktrees for Tasks

Check the status of git worktrees and parallel development progress

## Variables

- `TASK_ID`: Filter by task ID (optional, e.g., PROJ-123, reaper-42)
- `VERBOSE`: Show detailed status including uncommitted changes (true/false, default: false)

## Instructions

Display comprehensive status information about worktrees, including task details and progress.

### Pre-status Validation:
```bash
# If TASK_ID provided, validate format (JIRA: PROJ-123, Beads: reaper-42)
if [ -n "${TASK_ID}" ]; then
  if [[ ! "${TASK_ID}" =~ ^[A-Za-z]+-[0-9]+$ ]]; then
    echo "ERROR: Invalid TASK_ID format. Expected: PROJ-123 or reaper-42"
    exit 1
  fi
fi

# Ensure we're in the main repository
if [[ "$PWD" == *"/trees/"* ]]; then
  echo "Error: Run this command from the main repository, not from within a worktree"
  exit 1
fi
```

### Status Commands:
```bash
# Basic worktree listing
echo "=== Git Worktrees ==="
git worktree list

# Get task details if ID provided (supports JIRA via acli or Beads via bd)
if [ -n "${TASK_ID}" ]; then
  echo ""
  echo "=== Task: ${TASK_ID} ==="
  if [[ "${TASK_ID}" =~ ^[a-z]+-[0-9]+$ ]] && command -v bd >/dev/null; then
    bd show "${TASK_ID}" || echo "Could not fetch Beads details"
  elif command -v acli >/dev/null; then
    acli jira workitem view "${TASK_ID}" --fields summary,status,assignee --format table || {
      echo "Could not fetch Jira details"
    }
  fi
fi

# Detailed status for each worktree
echo ""
echo "=== Worktree Details ==="

# Function to check worktree status
check_worktree_status() {
  local worktree_path="$1"
  local worktree_name=$(basename "$worktree_path")

  # Extract task ID from worktree name (JIRA: PROJ-123, Beads: reaper-42)
  local task_id=$(echo "$worktree_name" | grep -oE '^[A-Za-z]+-[0-9]+')

  if [ -d "$worktree_path" ]; then
    echo ""
    echo "--- $worktree_name ---"

    # Show task ID if found
    if [ -n "$task_id" ]; then
      echo "Task ID: $task_id"
    fi

    # Get branch info
    branch=$(cd "$worktree_path" && git branch --show-current)
    echo "Branch: $branch"

    # Check for RESULTS.md
    if [ -f "$worktree_path/RESULTS.md" ]; then
      echo "Implementation: COMPLETED ✓ (has RESULTS.md)"
      # Show first few lines of results
      if [ "${VERBOSE}" = "true" ]; then
        echo "Results preview:"
        head -5 "$worktree_path/RESULTS.md" | sed 's/^/  /'
        echo "  ..."
      fi
    else
      echo "Implementation: IN PROGRESS ⏳"
    fi

    # Check for TASK.md
    if [ -f "$worktree_path/TASK.md" ]; then
      echo "Task: Assigned 📋 (has TASK.md)"
    fi

    # Git status summary
    cd "$worktree_path"

    # Count changes
    staged=$(git diff --cached --numstat | wc -l)
    unstaged=$(git diff --numstat | wc -l)
    untracked=$(git ls-files --others --exclude-standard | wc -l)

    if [ $staged -gt 0 ] || [ $unstaged -gt 0 ] || [ $untracked -gt 0 ]; then
      echo "Changes: $staged staged, $unstaged unstaged, $untracked untracked 🔄"
    else
      echo "Changes: Working tree clean"
    fi

    # Test coverage if available
    if [ -f package.json ] && [ "${VERBOSE}" = "true" ]; then
      coverage=$(npm test -- --coverage 2>/dev/null | grep "All files" | awk '{print $10}' || echo "N/A")
      if [ "$coverage" != "N/A" ]; then
        echo "Test Coverage: $coverage"
      fi
    fi

    # Last commit
    last_commit=$(git log -1 --pretty=format:"%h - %s (%cr)" 2>/dev/null || echo "No commits yet")
    echo "Last commit: $last_commit"

    # Check if commit references task ID
    if [ -n "$task_id" ]; then
      if git log -1 --pretty=format:"%B" 2>/dev/null | grep -q "Ref: $task_id"; then
        echo "Commit compliance: ✓ References $task_id"
      else
        echo "Commit compliance: ⚠️  Missing Ref: $task_id"
      fi
    fi

    # Verbose mode - show actual changes
    if [ "${VERBOSE}" = "true" ] && ([ $staged -gt 0 ] || [ $unstaged -gt 0 ] || [ $untracked -gt 0 ]); then
      echo ""
      echo "File changes:"
      git status --short | head -10
      if [ $(git status --short | wc -l) -gt 10 ]; then
        echo "  ... and $(($(git status --short | wc -l) - 10)) more files"
      fi
    fi

    cd - > /dev/null
  fi
}

# Check worktrees based on filter
if [ -n "${TASK_ID}" ]; then
  # Filter by task ID
  if [ -d "trees" ] && ls trees/${TASK_ID}-* >/dev/null 2>&1; then
    for worktree in trees/${TASK_ID}-*; do
      check_worktree_status "$worktree"
    done
  else
    echo "No worktrees found for ${TASK_ID}"
  fi
else
  # Check all worktrees in trees directory
  if [ -d "trees" ]; then
    for worktree in trees/*; do
      check_worktree_status "$worktree"
    done
  else
    echo "No trees/ directory found. Run /init-parallel TASK-ID first."
  fi
fi

# Summary statistics
echo ""
echo "=== Summary ==="
total_worktrees=$(git worktree list | wc -l)
echo "Total worktrees: $((total_worktrees - 1))" # Subtract 1 for main worktree

if [ -d "trees" ]; then
  # Count by task ID
  echo ""
  echo "Worktrees by task:"
  for key in $(ls trees | grep -oE '^[A-Za-z]+-[0-9]+' | sort -u); do
    count=$(ls -d trees/${key}-* 2>/dev/null | wc -l)
    completed=$(find trees/${key}-* -name "RESULTS.md" 2>/dev/null | wc -l)
    echo "  $key: $count worktrees ($completed completed)"
  done

  total_results=$(find trees -name "RESULTS.md" | wc -l)
  total_trees=$(ls -d trees/* 2>/dev/null | wc -l)
  if [ $total_trees -gt 0 ]; then
    echo ""
    echo "Overall completion: $total_results/$total_trees ($((total_results * 100 / total_trees))%)"
  fi
fi

# Disk usage
if [ -d "trees" ] && [ "${VERBOSE}" = "true" ]; then
  echo ""
  echo "=== Disk Usage ==="
  du -sh trees/* 2>/dev/null | sort -h
fi

# Branch status
echo ""
echo "=== Branch Status ==="
for worktree in trees/*; do
  if [ -d "$worktree" ]; then
    branch=$(cd "$worktree" && git branch --show-current)
    # Check if branch exists on remote
    if git show-ref --verify --quiet "refs/remotes/origin/$branch"; then
      behind=$(cd "$worktree" && git rev-list --count HEAD..origin/$branch 2>/dev/null || echo "0")
      ahead=$(cd "$worktree" && git rev-list --count origin/$branch..HEAD 2>/dev/null || echo "0")

      if [ "$behind" -gt 0 ] || [ "$ahead" -gt 0 ]; then
        echo "$branch: $ahead ahead, $behind behind origin 📊"
      fi
    else
      echo "$branch: Not pushed to origin yet"
    fi
  fi
done
```

## Example Usage

```bash
# Check all worktrees
/status-worktrees

# Check specific task with details
/status-worktrees PROJ-123 true

# Quick status check for task
/status-worktrees reaper-42 false
```

## Status Indicators

- ✓ Task completed (RESULTS.md exists)
- ⏳ In progress (no RESULTS.md yet)
- 📋 Task assigned (TASK.md exists)
- 🔄 Uncommitted changes present
- 📊 Branch divergence from origin
- ⚠️ Missing task reference in commits
