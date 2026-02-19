---
description: Radar sweep your parallel worktrees for progress and drift.
---

# Status of Worktrees for Tasks

<!-- user-comms-contract -->

## User Communication Contract

Speak about work outcomes and progress — never about internal machinery, tool names, or implementation steps.

### Forbidden Terms

Do not use any of the following in user-facing messages, status cards, or progress output:

**Abstract operation names** — replace with plain language:

| Forbidden | Use instead |
|-----------|-------------|
| `FETCH_ISSUE` | "retrieving task details" or "looking up the issue" |
| `CREATE_ISSUE` | "creating a task" or "logging the issue" |
| `UPDATE_ISSUE` | "updating the task" or "recording progress" |
| `ADD_DEPENDENCY` | "linking a dependency" |
| `LIST_CHILDREN` | "listing subtasks" |
| `QUERY_DEPENDENCY_TREE` | "checking dependencies" |
| `CLOSE_ISSUE` | "marking the task complete" |

**Internal state variables** — omit or rephrase:

| Forbidden | Use instead |
|-----------|-------------|
| `TASK_SYSTEM` / `markdown_only` | "your project's task tracking setup" |
| `PLAN_CONTEXT` | "the task requirements" or "the plan" |
| `CODEBASE CONTEXT` | "the codebase" |

**Internal file sentinels** — never surface raw filenames:

`RESULTS.md`, `REVIEW.md`, `SECURITY.md`, `FAULT.md`, `TASK.md`

**Tool names** — never expose tool internals as user language:

| Forbidden | Use instead |
|-----------|-------------|
| `TaskCreate` | "tracking progress" or "updating the work plan" |
| `TaskUpdate` | "recording progress" |

**Architecture terms** — omit entirely:

`platform skill routing`, `behavioral contract`, `skill routing table`, `gate classification internals`

### Tone Rule

Describe what is happening for the user ("running tests", "planning the feature", "reviewing security") — not what the system is doing internally ("routing to skill", "resolving TASK_SYSTEM", "invoking TaskCreate").


Check the status of git worktrees and parallel development progress

## Variables

- `TASK_ID`: Filter by task ID (optional, e.g., PROJ-123, reaper-a3f)
- `VERBOSE`: Show detailed status including uncommitted changes (true/false, default: false)

## Visual Vocabulary

> **Opt-out**: If the project's CLAUDE.md contains the line `Reaper: disable ASCII art`, emit plain text status labels only. No gauge bars, no box-drawing, no card templates. Use the `functional` context behavior regardless of the `context` parameter.

> **Rendering constraint**: One line, one direction, no column alignment. Every visual element must be renderable in a single horizontal pass. No multi-line box-drawing that requires vertical alignment across columns. Exception: The `start` context uses box-drawing for its welcome screen cards, which are rendered once as orientation content rather than repeated status displays.

### Gauge States

Six semantic states expressed as fixed-width 10-block bars. Use these consistently across all commands to communicate work status.

```
  ██████████  LANDED       complete, healthy
  ████████░░  ON APPROACH  coding done, quality gates running
  ██████░░░░  IN FLIGHT    work in progress
  ███░░░░░░░  TAKING OFF   deploying, about to execute
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

### Fleet Dashboard

Render as a multi-row status overview. One row per worktree.

```
  FLEET STATUS
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  trees/TASK-004-search     ░░░░!!░░░░  FAULT
  trees/TASK-002-billing    ██████░░░░  IN FLIGHT
  trees/TASK-006-deploy     ███░░░░░░░  TAKING OFF
  trees/TASK-005-payments   ████████░░  ON APPROACH
  trees/TASK-003-notifs     ░░░░░░░░░░  TAXIING
  trees/TASK-001-auth       ██████████  LANDED
```

Fleet dashboard rules:
- One row per worktree. Path left-aligned, gauge bar and state right.
- Sort: FAULT first, then IN FLIGHT, then TAKING OFF, then ON APPROACH, then TAXIING, then LANDED.
- If no worktrees exist, show a single line: `No active worktrees.`


## Instructions

Display comprehensive status information about worktrees using the fleet dashboard format defined in the Visual Vocabulary above. Output a scannable instrument panel first, then per-worktree detail underneath.

### Pre-status Validation:
```bash
# If TASK_ID provided, validate format (JIRA: PROJ-123, Beads: reaper-a3f)
if [ -n "${TASK_ID}" ]; then
  if [[ ! "${TASK_ID}" =~ ^[A-Za-z]+-[a-z0-9]+$ ]]; then
    echo "ERROR: Invalid TASK_ID format. Expected: PROJ-123 or reaper-a3f"
    exit 1
  fi
fi

# Ensure we're in the main repository
if [[ "$PWD" == *"/trees/"* ]]; then
  echo "Error: Run this command from the main repository, not from within a worktree"
  exit 1
fi
```

### Status Collection and Fleet Dashboard:

Collect status for every worktree first, then render the fleet dashboard, then render per-worktree detail.

```bash
# ── Status state determination ────────────────────────
# For each worktree, determine its fleet state:
#
# State labels map to user-visible status names on the dashboard — use these labels as-is.
# When describing states to the user, say "all gates passed" not "RESULTS.md exists".
#   LANDED      — All quality gates passed (RESULTS.md exists, gates_passed >= total_gates, no faults)
#   ON APPROACH — Coding complete, quality gates running or partially passed (RESULTS.md exists, gates_passed < total_gates, no faults)
#   IN FLIGHT   — Work has started (has commits beyond branch point, or uncommitted changes)
<!-- user-comms: say "assigned, not yet started" not "TASK.md exists but no commits" -->
#   TAKING OFF  — TASK.md exists but no commits beyond branch point and no uncommitted changes (assigned, not started)
#   TAXIING    — Worktree exists but no work started (clean, no TASK.md, no commits beyond branch point)
<!-- user-comms: say "a gate failed" not "FAULT.md detected" -->
#   FAULT       — A quality gate failed (test-runner, SME reviewer, or security-auditor logged a failure)
#
# Gate progress is tracked by counting completed quality gates:
<!-- user-comms: say "tests passed" not "RESULTS.md exists without failure markers" -->
#   - test-runner:       check for passing test results (last test run exit code 0)
<!-- user-comms: say "code review complete" not "REVIEW.md exists" -->
#   - sme-reviewer:      check for REVIEW.md or code review results
<!-- user-comms: say "security audit complete" not "SECURITY.md exists" -->
#   - security-auditor:  check for SECURITY.md or security audit results
# Gate count format: "N/3 gates" where N is the number of gates passed.

# Initialize fleet tracking arrays
declare -a FLEET_NAMES=()
declare -a FLEET_STATES=()
declare -a FLEET_GATES=()
declare -a FLEET_DETAILS=()

# ── Determine fleet state for a worktree ──────────────
determine_fleet_state() {
  local worktree_path="$1"
  local worktree_name=$(basename "$worktree_path")
  local state="TAXIING"
  local gates_passed=0
  local total_gates=3

  if [ ! -d "$worktree_path" ]; then
    echo "TAXIING|0/${total_gates} gates"
    return
  fi

  cd "$worktree_path"

  # Check for quality gate failures (FAULT state)
  local has_fault=false
  if [ -f "FAULT.md" ] || [ -f "TEST_FAILURE.md" ]; then
    has_fault=true
  fi
  # Check last test-runner result for failure markers
  if [ -f "RESULTS.md" ] && grep -qi "fail\|error\|FAULT" "RESULTS.md" 2>/dev/null; then
    # RESULTS.md exists but contains failure markers — check more carefully
    if grep -qi "status.*fail\|gate.*fail\|test.*fail" "RESULTS.md" 2>/dev/null; then
      has_fault=true
    fi
  fi

  # Count passed gates
  # Gate 1: test-runner — RESULTS.md exists without failure markers
  if [ -f "RESULTS.md" ] && ! grep -qi "status.*fail\|gate.*fail\|test.*fail" "RESULTS.md" 2>/dev/null; then
    gates_passed=$((gates_passed + 1))
  fi
  # Gate 2: sme-reviewer — REVIEW.md exists
  if [ -f "REVIEW.md" ]; then
    gates_passed=$((gates_passed + 1))
  fi
  # Gate 3: security-auditor — SECURITY.md exists
  if [ -f "SECURITY.md" ]; then
    gates_passed=$((gates_passed + 1))
  fi

  # Determine state
  if [ "$has_fault" = true ]; then
    state="FAULT"
  elif [ -f "RESULTS.md" ] && [ "$gates_passed" -ge "$total_gates" ]; then
    state="LANDED"
  elif [ -f "RESULTS.md" ] && [ "$gates_passed" -lt "$total_gates" ]; then
    state="ON APPROACH"
  else
    # Check if work has started
    local staged=$(git diff --cached --numstat 2>/dev/null | wc -l)
    local unstaged=$(git diff --numstat 2>/dev/null | wc -l)
    local untracked=$(git ls-files --others --exclude-standard 2>/dev/null | wc -l)
    local has_task=false
    [ -f "TASK.md" ] && has_task=true

    # Check if there are commits beyond the branch point
    local branch=$(git branch --show-current 2>/dev/null)
    local commit_count=0
    if [ -n "$branch" ]; then
      commit_count=$(git rev-list --count develop.."$branch" 2>/dev/null || echo "0")
    fi

    if [ $staged -gt 0 ] || [ $unstaged -gt 0 ] || [ $untracked -gt 0 ] || [ "$commit_count" -gt 0 ]; then
      state="IN FLIGHT"
    elif [ "$has_task" = true ]; then
      # TASK.md exists but no commits and no changes — assigned, not started
      state="TAKING OFF"
    else
      state="TAXIING"
    fi
  fi

  cd - > /dev/null
  echo "${state}|${gates_passed}/${total_gates} gates"
}

# ── Render gauge bar for a state ──────────────────────
render_gauge() {
  local state="$1"
  case "$state" in
    "LANDED")      echo "██████████" ;;
    "ON APPROACH") echo "████████░░" ;;
    "IN FLIGHT")   echo "██████░░░░" ;;
    "TAKING OFF")  echo "███░░░░░░░" ;;
    "TAXIING")    echo "░░░░░░░░░░" ;;
    "FAULT")       echo "░░░░!!░░░░" ;;
    *)             echo "░░░░░░░░░░" ;;
  esac
}

# ── Collect worktree list ─────────────────────────────
WORKTREE_LIST=()
if [ -n "${TASK_ID}" ]; then
  if [ -d "trees" ] && ls trees/${TASK_ID}-* >/dev/null 2>&1; then
    for worktree in trees/${TASK_ID}-*; do
      WORKTREE_LIST+=("$worktree")
    done
  fi
else
  if [ -d "trees" ]; then
    for worktree in trees/*; do
      [ -d "$worktree" ] && WORKTREE_LIST+=("$worktree")
    done
  fi
fi

# Handle empty fleet
if [ ${#WORKTREE_LIST[@]} -eq 0 ]; then
  if [ -n "${TASK_ID}" ]; then
    echo "No worktrees found for ${TASK_ID}"
  else
    echo "No active worktrees."
  fi
  exit 0
fi

# ── Collect fleet state for each worktree ─────────────
declare -a SORTED_FAULT=()
declare -a SORTED_INFLIGHT=()
declare -a SORTED_TAKINGOFF=()
declare -a SORTED_ONAPPROACH=()
declare -a SORTED_TAXIING=()
declare -a SORTED_LANDED=()

for worktree in "${WORKTREE_LIST[@]}"; do
  wt_name=$(basename "$worktree")
  result=$(determine_fleet_state "$worktree")
  state=$(echo "$result" | cut -d'|' -f1)
  gate_info=$(echo "$result" | cut -d'|' -f2)

  entry="${wt_name}|${state}|${gate_info}|${worktree}"

  case "$state" in
    "FAULT")       SORTED_FAULT+=("$entry") ;;
    "IN FLIGHT")   SORTED_INFLIGHT+=("$entry") ;;
    "TAKING OFF")  SORTED_TAKINGOFF+=("$entry") ;;
    "ON APPROACH") SORTED_ONAPPROACH+=("$entry") ;;
    "TAXIING")    SORTED_TAXIING+=("$entry") ;;
    "LANDED")      SORTED_LANDED+=("$entry") ;;
  esac
done

# Merge sorted arrays: FAULT first, then IN FLIGHT, TAKING OFF, ON APPROACH, TAXIING, LANDED
SORTED_FLEET=("${SORTED_FAULT[@]}" "${SORTED_INFLIGHT[@]}" "${SORTED_TAKINGOFF[@]}" "${SORTED_ONAPPROACH[@]}" "${SORTED_TAXIING[@]}" "${SORTED_LANDED[@]}")

# ── Render Fleet Dashboard ────────────────────────────
echo ""
echo "  WORKTREE FLEET"
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for entry in "${SORTED_FLEET[@]}"; do
  wt_name=$(echo "$entry" | cut -d'|' -f1)
  state=$(echo "$entry" | cut -d'|' -f2)
  gate_info=$(echo "$entry" | cut -d'|' -f3)
  gauge=$(render_gauge "$state")

  # Pad worktree name to 25 chars for alignment
  printf "  %-25s %s  %-12s %s\n" "$wt_name" "$gauge" "$state" "$gate_info"
done

# ── Fleet Summary Footer ─────────────────────────────
count_landed=${#SORTED_LANDED[@]}
count_inflight=${#SORTED_INFLIGHT[@]}
count_takingoff=${#SORTED_TAKINGOFF[@]}
count_onapproach=${#SORTED_ONAPPROACH[@]}
count_taxiing=${#SORTED_TAXIING[@]}
count_fault=${#SORTED_FAULT[@]}
count_total=${#SORTED_FLEET[@]}

echo ""
printf "  Fleet: %d worktrees" "$count_total"
[ "$count_landed" -gt 0 ]     && printf "   %d landed" "$count_landed"
[ "$count_inflight" -gt 0 ]   && printf "   %d in flight" "$count_inflight"
[ "$count_takingoff" -gt 0 ]  && printf "   %d taking off" "$count_takingoff"
[ "$count_onapproach" -gt 0 ] && printf "   %d on approach" "$count_onapproach"
[ "$count_taxiing" -gt 0 ]   && printf "   %d taxiing" "$count_taxiing"
[ "$count_fault" -gt 0 ]      && printf "   %d fault" "$count_fault"
echo ""

# Get task details if ID provided (supports JIRA via acli or Beads via bd)
if [ -n "${TASK_ID}" ]; then
  echo ""
  echo "  Task: ${TASK_ID}"
  echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  if [[ "${TASK_ID}" =~ ^[a-z]+-[a-z0-9]+$ ]] && command -v bd >/dev/null; then
    bd show "${TASK_ID}" || echo "Could not fetch Beads details"
  elif command -v acli >/dev/null; then
    acli jira workitem view "${TASK_ID}" --fields summary,status,assignee --format table || {
      echo "Could not fetch Jira details"
    }
  fi
fi

# ── Per-Worktree Detail ───────────────────────────────
echo ""
echo "  WORKTREE DETAILS"
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Function to display detailed worktree status
check_worktree_status() {
  local worktree_path="$1"
  local worktree_name=$(basename "$worktree_path")

  # Extract task ID from worktree name (JIRA: PROJ-123, Beads: reaper-a3f)
  local task_id=$(echo "$worktree_name" | grep -oE '^[A-Za-z]+-[a-z0-9]+')

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
    # <!-- user-comms: say "Implementation complete" not "has RESULTS.md" -->
    if [ -f "$worktree_path/RESULTS.md" ]; then
      echo "Implementation: COMPLETED (has RESULTS.md)"
      # Show first few lines of results
      if [ "${VERBOSE}" = "true" ]; then
        echo "Results preview:"
        head -5 "$worktree_path/RESULTS.md" | sed 's/^/  /'
        echo "  ..."
      fi
    else
      echo "Implementation: IN PROGRESS"
    fi

    # Check for TASK.md
    # <!-- user-comms: say "Task: Assigned" not "has TASK.md" -->
    if [ -f "$worktree_path/TASK.md" ]; then
      echo "Task: Assigned (has TASK.md)"
    fi

    # Git status summary
    cd "$worktree_path"

    # Count changes
    staged=$(git diff --cached --numstat | wc -l)
    unstaged=$(git diff --numstat | wc -l)
    untracked=$(git ls-files --others --exclude-standard | wc -l)

    if [ $staged -gt 0 ] || [ $unstaged -gt 0 ] || [ $untracked -gt 0 ]; then
      echo "Changes: $staged staged, $unstaged unstaged, $untracked untracked"
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
        echo "Commit compliance: References $task_id"
      else
        echo "Commit compliance: Missing Ref: $task_id"
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

# Render detail for each worktree in sorted order
for entry in "${SORTED_FLEET[@]}"; do
  worktree_path=$(echo "$entry" | cut -d'|' -f4)
  check_worktree_status "$worktree_path"
done

# ── Branch Status ─────────────────────────────────────
echo ""
echo "  BRANCH STATUS"
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
for entry in "${SORTED_FLEET[@]}"; do
  worktree_path=$(echo "$entry" | cut -d'|' -f4)
  if [ -d "$worktree_path" ]; then
    branch=$(cd "$worktree_path" && git branch --show-current)
    # Check if branch exists on remote
    if git show-ref --verify --quiet "refs/remotes/origin/$branch"; then
      behind=$(cd "$worktree_path" && git rev-list --count HEAD..origin/$branch 2>/dev/null || echo "0")
      ahead=$(cd "$worktree_path" && git rev-list --count origin/$branch..HEAD 2>/dev/null || echo "0")

      if [ "$behind" -gt 0 ] || [ "$ahead" -gt 0 ]; then
        echo "  $branch: $ahead ahead, $behind behind origin"
      fi
    else
      echo "  $branch: Not pushed to origin yet"
    fi
  fi
done

# Disk usage
if [ -d "trees" ] && [ "${VERBOSE}" = "true" ]; then
  echo ""
  echo "  DISK USAGE"
  echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  du -sh trees/* 2>/dev/null | sort -h
fi
```

## Example Usage

```bash
# Check all worktrees
/status-worktrees

# Check specific task with details
/status-worktrees PROJ-123 true

# Quick status check for task
/status-worktrees reaper-a3f false
```

## Example Output

The fleet dashboard renders a scannable overview before detailed information:

```
  WORKTREE FLEET
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  reaper-44-cache           ░░░░!!░░░░  FAULT        0/3 gates
  reaper-42-auth            ██████░░░░  IN FLIGHT    1/3 gates
  reaper-46-deploy          ███░░░░░░░  TAKING OFF   0/3 gates
  reaper-45-payments        ████████░░  ON APPROACH  2/3 gates
  reaper-43-migration       ░░░░░░░░░░  TAXIING     0/3 gates
  reaper-41-billing         ██████████  LANDED       3/3 gates

  Fleet: 6 worktrees   1 landed   1 in flight   1 taking off   1 on approach   1 taxiing   1 fault
```

Detailed per-worktree information follows the dashboard, preserving branch, commit, and change data.

## Status States

States map to the Visual Vocabulary gauge bars:

- `LANDED` -- Complete, all gates passed. Gauge: `██████████`
- `ON APPROACH` -- Coding complete, quality gates running or partially passed. Gauge: `████████░░`
- `IN FLIGHT` -- Work in progress (has commits beyond branch point or uncommitted changes). Gauge: `██████░░░░`
- `TAKING OFF` -- Assigned but not started (TASK.md exists, no commits, no changes). Gauge: `███░░░░░░░`
- `TAXIING` -- Worktree exists but no work started, no assignment. Gauge: `░░░░░░░░░░`
- `FAULT` -- A quality gate failed or failure markers detected. Gauge: `░░░░!!░░░░`
