#!/bin/bash
# worktree-cleanup.sh - Safely remove a git worktree with explicit branch disposition
#
# This script solves the CWD problem: when Claude removes a worktree while the shell's
# current working directory is inside that worktree, all subsequent commands fail.
# We change to project root BEFORE removal to prevent this.
#
# Exit codes:
#   0 - Success
#   1 - Error (invalid input, git failure)
#   2 - Safety check failed (uncommitted changes)
#   3 - Branch disposition required (no --keep-branch or --delete-branch specified)
#   4 - Timeout (operation exceeded time limit)

set -euo pipefail

# Source visual-helpers for card rendering, gauge, and logging
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/visual-helpers.sh"

# Protected branches that should never be deleted
PROTECTED_BRANCHES="develop main master"

# Timeout configuration (can be overridden via environment variables)
# WORKTREE_REMOVE_TIMEOUT: Time limit for git worktree remove (large node_modules take time)
# NETWORK_TIMEOUT: Time limit for network operations (git push)
WORKTREE_REMOVE_TIMEOUT="${WORKTREE_REMOVE_TIMEOUT:-120}"
NETWORK_TIMEOUT="${NETWORK_TIMEOUT:-30}"

# Script options
WORKTREE_PATH=""
FORCE=false
DRY_RUN=false
KEEP_BRANCH=false
DELETE_BRANCH=false
SKIP_LOCK_CHECK=false

usage() {
    cat << EOF
Usage: $(basename "$0") <worktree-path> [options]

Safely remove a git worktree with explicit branch disposition.

Arguments:
  worktree-path    Path to the worktree to remove (e.g., ./trees/PROJ-123-auth)

Options:
  --keep-branch      Remove worktree but keep the associated branch
  --delete-branch    Remove worktree AND delete the associated branch (local and remote)
  --force            Skip safety checks (uncommitted changes warning, lock check)
  --dry-run          Show what would happen without making changes
  --skip-lock-check  Skip pre-removal lock and open file handle detection
                     (useful for CI/headless environments)
  --timeout <sec>    Worktree removal timeout in seconds (default: 120, minimum: 10)
                     Large worktrees with node_modules or .venv can take minutes to
                     remove. The 120s default accommodates typical JS/Python projects.
                     Overrides WORKTREE_REMOVE_TIMEOUT environment variable.
  --network-timeout <sec>
                     Network operation timeout in seconds (default: 30, minimum: 10)
                     Used for git push/fetch during remote branch deletion. The 30s
                     default handles typical GitHub/GitLab round-trips.
                     Overrides NETWORK_TIMEOUT environment variable.

Branch Disposition (REQUIRED for non-protected branches):
  You MUST specify either --keep-branch or --delete-branch when removing a worktree
  that has an associated feature branch. This prevents accidental branch deletion.

  Protected branches (${PROTECTED_BRANCHES}) are never deleted and don't require
  disposition flags.

Exit codes:
  0  Success
  1  Error (invalid input, git failure)
  2  Safety check failed (uncommitted changes without --force)
  3  Branch disposition required (no --keep-branch or --delete-branch specified)
  4  Timeout (operation exceeded time limit)

Environment variables:
  WORKTREE_REMOVE_TIMEOUT  Seconds to wait for worktree removal (default: 120)
  NETWORK_TIMEOUT          Seconds to wait for network operations (default: 30)

Examples:
  # Keep the branch for later work
  $(basename "$0") ./trees/PROJ-123-auth --keep-branch

  # Delete the branch after merge
  $(basename "$0") ./trees/PROJ-123-auth --delete-branch

  # Preview what would happen
  $(basename "$0") ./trees/PROJ-123-auth --delete-branch --dry-run

  # Force removal even with uncommitted changes
  $(basename "$0") ./trees/PROJ-123-auth --delete-branch --force

  # Skip lock detection (CI/headless environments)
  $(basename "$0") ./trees/PROJ-123-auth --delete-branch --skip-lock-check

  # Custom timeout for large worktrees (e.g., monorepos with heavy node_modules)
  $(basename "$0") ./trees/PROJ-123-auth --delete-branch --timeout 300

  # Custom network timeout for slow remotes
  $(basename "$0") ./trees/PROJ-123-auth --delete-branch --network-timeout 60
EOF
}

# Validate a timeout value is a positive integer >= 10
# Usage: validate_timeout <flag_name> <value>
# Returns: 0 if valid, exits with code 1 if invalid
validate_timeout() {
    local flag_name="$1"
    local value="$2"

    # Must be a positive integer (digits only) and at least 10
    if ! [[ "$value" =~ ^[0-9]+$ ]] || [[ "$value" -lt 10 ]]; then
        log_fail "Invalid timeout value for $flag_name: '$value' (must be a positive integer >= 10)"
        exit 1
    fi
}

# Portable timeout function
# Works on Linux (timeout), macOS with coreutils (gtimeout), or falls back to background process
# Returns exit code 124 on timeout (matches GNU timeout behavior)
# Usage: run_with_timeout <seconds> <command> [args...]
run_with_timeout() {
    local timeout_seconds="$1"
    shift
    local cmd=("$@")

    # Try GNU timeout (Linux)
    if command -v timeout >/dev/null 2>&1; then
        timeout "$timeout_seconds" "${cmd[@]}"
        return $?
    fi

    # Try gtimeout (macOS with coreutils installed via brew)
    if command -v gtimeout >/dev/null 2>&1; then
        gtimeout "$timeout_seconds" "${cmd[@]}"
        return $?
    fi

    # Fallback: background process + sleep + kill pattern
    local pid
    local exit_code

    # Run command in background
    "${cmd[@]}" &
    pid=$!

    # Wait for command or timeout
    local count=0
    while kill -0 "$pid" 2>/dev/null; do
        if [[ $count -ge $timeout_seconds ]]; then
            # Timeout reached - kill the process
            kill -TERM "$pid" 2>/dev/null
            sleep 1
            kill -KILL "$pid" 2>/dev/null
            wait "$pid" 2>/dev/null
            return 124  # GNU timeout exit code for timeout
        fi
        sleep 1
        ((count++))
    done

    # Command completed before timeout
    wait "$pid"
    return $?
}

# Output AI Remediation Guide for timeout errors
# Usage: output_timeout_remediation <worktree_path> <timeout_seconds> <operation>
output_timeout_remediation() {
    local worktree_path="$1"
    local timeout_seconds="$2"
    local operation="$3"

    cat << EOF

=== AI REMEDIATION GUIDE ===
ERROR_CODE: 4
ERROR_TYPE: TIMEOUT
WORKTREE_PATH: ${worktree_path}
TIMEOUT_SECONDS: ${timeout_seconds}
OPERATION: ${operation}

REMEDIATION_STEPS:
1. RETRY_WITH_LONGER_TIMEOUT:
   worktree-cleanup.sh ${worktree_path} --delete-branch --timeout 300

2. PRE_DELETE_LARGE_DIRECTORIES:
   rm -rf ${worktree_path}/node_modules
   rm -rf ${worktree_path}/.venv
   worktree-cleanup.sh ${worktree_path} --delete-branch

3. FORCE_PRUNE_WORKTREE:
   rm -rf ${worktree_path}
   git worktree prune
=== END AI REMEDIATION GUIDE ===
EOF
}

# Output AI Remediation Guide for worktree lock errors
# Usage: output_lock_remediation <worktree_path> <lock_file> <lock_reason> <worktree_name>
output_lock_remediation() {
    local worktree_path="$1"
    local lock_file="$2"
    local lock_reason="$3"
    local worktree_name="$4"

    cat << EOF

=== AI REMEDIATION GUIDE ===
ERROR_CODE: WORKTREE_LOCKED
WORKTREE_PATH: ${worktree_path}
LOCK_FILE: ${lock_file}
LOCK_REASON: ${lock_reason}

REMEDIATION:
1. UNLOCK_WORKTREE:
   git worktree unlock ${worktree_name}

2. FORCE_REMOVAL:
   $(basename "$0") ${worktree_path} --delete-branch --force

3. SKIP_LOCK_CHECK:
   $(basename "$0") ${worktree_path} --delete-branch --skip-lock-check
=== END AI REMEDIATION GUIDE ===
EOF
}

# Check for worktree lock file before removal
# Usage: check_worktree_lock <abs_worktree_path> <project_root>
# Returns: 0 if not locked or lock check skipped, 1 if locked (exits script)
check_worktree_lock() {
    local abs_worktree_path="$1"
    local project_root="$2"

    # Extract worktree name from path (last path component)
    local worktree_name
    worktree_name=$(basename "$abs_worktree_path")

    # Determine the git dir that contains worktree metadata
    local git_dir
    git_dir=$(git -C "$project_root" rev-parse --git-dir 2>/dev/null)
    if [[ -z "$git_dir" ]]; then
        # Cannot determine git dir, skip lock check
        return 0
    fi

    # Resolve git_dir to absolute path if relative
    if [[ "$git_dir" != /* ]]; then
        git_dir="$project_root/$git_dir"
    fi

    local lock_file="$git_dir/worktrees/$worktree_name/locked"

    if [[ -f "$lock_file" ]]; then
        local lock_reason
        lock_reason=$(tr -d '\n' < "$lock_file" 2>/dev/null)
        if [[ -z "$lock_reason" ]]; then
            lock_reason="(no reason provided)"
        fi

        if [[ "$FORCE" == true ]]; then
            log_warn "Worktree is locked (bypassing due to --force): $lock_reason"
            return 0
        fi

        log_fail "Worktree is locked and cannot be removed"
        output_lock_remediation "$abs_worktree_path" "$lock_file" "$lock_reason" "$worktree_name"
        exit 1
    fi

    return 0
}

# Check for open file handles in the worktree directory
# Usage: check_open_file_handles <abs_worktree_path>
# Returns: 0 always (warnings only, never blocks removal)
check_open_file_handles() {
    local abs_worktree_path="$1"

    # Support test override to simulate missing lsof
    if [[ "${__WORKTREE_CLEANUP_TEST_NO_LSOF:-}" == "1" ]]; then
        return 0
    fi

    # Check if lsof is available
    if ! command -v lsof >/dev/null 2>&1; then
        return 0
    fi

    # Run lsof to detect open file handles in the worktree directory
    local lsof_output
    lsof_output=$(lsof +D "$abs_worktree_path" 2>/dev/null) || true

    if [[ -n "$lsof_output" ]]; then
        # Extract process info (PID and command name)
        local process_list
        process_list=$(echo "$lsof_output" | tail -n +2 | awk '{print $1 " (PID: " $2 ")"}' | sort -u)

        log_warn "Open file handles detected in worktree directory"
        echo ""
        echo "WARNING_CODE: OPEN_FILE_HANDLES"
        echo "WORKTREE_PATH: $abs_worktree_path"
        echo "PROCESSES:"
        echo "$process_list"
        echo ""
        log_warn "Open file handles may cause removal to fail or hang"
        log_warn "Consider closing the above processes before proceeding"
    fi

    return 0
}

# Check if a branch is protected
is_protected_branch() {
    local branch="$1"
    for protected in $PROTECTED_BRANCHES; do
        if [[ "$branch" == "$protected" ]]; then
            return 0
        fi
    done
    return 1
}

# Find the project root (parent of ./trees/)
find_project_root() {
    local worktree_path="$1"
    local abs_path

    # Resolve to absolute path
    abs_path=$(cd "$worktree_path" 2>/dev/null && pwd) || {
        log_fail "Cannot resolve worktree path: $worktree_path"
        exit 1
    }

    # Look for ./trees/ in the path and get parent
    if [[ "$abs_path" == *"/trees/"* ]]; then
        echo "${abs_path%%/trees/*}"
    else
        # Fallback: use git worktree list to find main worktree
        local main_worktree
        main_worktree=$(git -C "$abs_path" worktree list --porcelain | grep "^worktree " | head -1 | cut -d' ' -f2)
        echo "$main_worktree"
    fi
}

# Get the branch associated with a worktree
get_worktree_branch() {
    local worktree_path="$1"
    local abs_path

    abs_path=$(cd "$worktree_path" 2>/dev/null && pwd) || return 1

    # Get branch from worktree list
    git worktree list --porcelain | awk -v path="$abs_path" '
        $1 == "worktree" { current_path = $2 }
        $1 == "branch" && current_path == path {
            # Strip refs/heads/ prefix
            sub(/^refs\/heads\//, "", $2)
            print $2
            exit
        }
    '
}

# Check for uncommitted changes in worktree
has_uncommitted_changes() {
    local worktree_path="$1"
    local status

    status=$(git -C "$worktree_path" status --porcelain 2>/dev/null)
    [[ -n "$status" ]]
}

# Get count of unmerged commits
get_unmerged_count() {
    local worktree_path="$1"
    local branch="$2"
    local base_branch="${3:-develop}"

    # Count commits not in base branch
    git -C "$worktree_path" rev-list --count "$base_branch..$branch" 2>/dev/null || echo "0"
}

# Check if remote branch exists
remote_branch_exists() {
    local branch="$1"
    local project_root="$2"

    git -C "$project_root" ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1
}

# Parse command line arguments
parse_args() {
    if [[ $# -lt 1 ]]; then
        log_fail "Missing required argument: worktree-path"
        echo ""
        usage
        exit 1
    fi

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --help|-h)
                usage
                exit 0
                ;;
            --force)
                FORCE=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --keep-branch)
                KEEP_BRANCH=true
                shift
                ;;
            --delete-branch)
                DELETE_BRANCH=true
                shift
                ;;
            --skip-lock-check)
                SKIP_LOCK_CHECK=true
                shift
                ;;
            --timeout)
                if [[ $# -lt 2 ]]; then
                    log_fail "--timeout requires a value (e.g., --timeout 120)"
                    exit 1
                fi
                validate_timeout "--timeout" "$2"
                WORKTREE_REMOVE_TIMEOUT="$2"
                shift 2
                ;;
            --network-timeout)
                if [[ $# -lt 2 ]]; then
                    log_fail "--network-timeout requires a value (e.g., --network-timeout 30)"
                    exit 1
                fi
                validate_timeout "--network-timeout" "$2"
                NETWORK_TIMEOUT="$2"
                shift 2
                ;;
            -*)
                log_fail "Unknown option: $1"
                echo ""
                usage
                exit 1
                ;;
            *)
                if [[ -z "$WORKTREE_PATH" ]]; then
                    WORKTREE_PATH="$1"
                else
                    log_fail "Unexpected argument: $1"
                    exit 1
                fi
                shift
                ;;
        esac
    done

    # Validate worktree path provided
    if [[ -z "$WORKTREE_PATH" ]]; then
        log_fail "Missing required argument: worktree-path"
        echo ""
        usage
        exit 1
    fi

    # Check for mutually exclusive flags
    if [[ "$KEEP_BRANCH" == true && "$DELETE_BRANCH" == true ]]; then
        log_fail "Cannot specify both --keep-branch and --delete-branch"
        echo ""
        echo "Choose one:"
        echo "  --keep-branch    Keep the branch for future work"
        echo "  --delete-branch  Delete the branch (after merge)"
        exit 1
    fi
}

# Main cleanup logic
main() {
    parse_args "$@"

    # Validate worktree exists
    if [[ ! -d "$WORKTREE_PATH" ]]; then
        log_fail "Worktree directory does not exist: $WORKTREE_PATH"
        exit 1
    fi

    # Get absolute path
    local abs_worktree_path
    abs_worktree_path=$(cd "$WORKTREE_PATH" && pwd)

    # Find project root
    local project_root
    project_root=$(find_project_root "$WORKTREE_PATH")

    if [[ -z "$project_root" || ! -d "$project_root" ]]; then
        log_fail "Cannot determine project root from worktree path"
        exit 1
    fi

    # Get the branch associated with this worktree
    local branch
    branch=$(get_worktree_branch "$abs_worktree_path")

    log_step "Worktree: $abs_worktree_path"
    log_step "Project root: $project_root"
    [[ -n "$branch" ]] && log_step "Associated branch: $branch"

    # Check if branch is protected
    local is_protected=false
    if [[ -n "$branch" ]] && is_protected_branch "$branch"; then
        is_protected=true
        log_step "Branch '$branch' is a protected branch (will not be deleted)"
    fi

    # BRANCH DISPOSITION CHECK
    # If worktree has an associated branch that is NOT protected, require explicit disposition
    if [[ -n "$branch" && "$is_protected" == false ]]; then
        if [[ "$KEEP_BRANCH" == false && "$DELETE_BRANCH" == false ]]; then
            log_fail "Branch disposition required for non-protected branch '$branch'"
            echo ""
            log_warn "You must specify what to do with the branch:"
            echo ""
            echo "  --keep-branch    Keep the branch for future work or review"
            echo "                   Use this if the branch hasn't been merged yet,"
            echo "                   or you want to preserve it for reference."
            echo ""
            echo "  --delete-branch  Delete the branch (local and remote)"
            echo "                   Use this after the branch has been merged,"
            echo "                   or if you want to discard the work."
            echo ""
            echo "Example:"
            echo "  $(basename "$0") $WORKTREE_PATH --delete-branch"
            echo "  $(basename "$0") $WORKTREE_PATH --keep-branch"
            echo ""
            exit 3
        fi
    fi

    # Safety checks (unless --force)
    if [[ "$FORCE" == false ]]; then
        if has_uncommitted_changes "$abs_worktree_path"; then
            log_fail "Worktree has uncommitted changes"
            echo ""
            echo "Options:"
            echo "  1. Commit or stash your changes first"
            echo "  2. Use --force to remove anyway (changes will be lost)"
            exit 2
        fi

        # Warn about unmerged commits (non-blocking)
        if [[ -n "$branch" ]]; then
            local unmerged_count
            unmerged_count=$(get_unmerged_count "$abs_worktree_path" "$branch")
            if [[ "$unmerged_count" -gt 0 ]]; then
                log_warn "Branch has $unmerged_count unmerged commit(s)"
                if [[ "$DELETE_BRANCH" == true ]]; then
                    log_warn "These commits will be lost if you delete the branch"
                fi
            fi
        fi
    fi

    # PRE-REMOVAL LOCK DETECTION
    # Check for conditions that commonly cause worktree removal hangs
    if [[ "$SKIP_LOCK_CHECK" == false ]]; then
        check_worktree_lock "$abs_worktree_path" "$project_root"
        check_open_file_handles "$abs_worktree_path"
    fi

    # DRY RUN: Show what would happen
    if [[ "$DRY_RUN" == true ]]; then
        echo ""
        render_card_header "DRY RUN"
        echo "  Mode          dry-run (no changes)"
        echo "  Worktree      $abs_worktree_path"
        echo "  Project root  $project_root"
        echo ""
        echo "  Planned steps:"
        local step=1
        echo "    $step. Change to project root: $project_root"
        ((step++))
        echo "    $step. Remove worktree: $abs_worktree_path (timeout: ${WORKTREE_REMOVE_TIMEOUT}s)"
        ((step++))

        if [[ -n "$branch" ]]; then
            if [[ "$is_protected" == true ]]; then
                echo "    $step. Branch disposition: SKIP (protected branch '$branch')"
                ((step++))
            elif [[ "$KEEP_BRANCH" == true ]]; then
                echo "    $step. Branch disposition: KEEP branch '$branch'"
                ((step++))
            elif [[ "$DELETE_BRANCH" == true ]]; then
                echo "    $step. Branch disposition: DELETE branch '$branch' (local)"
                ((step++))
                if remote_branch_exists "$branch" "$project_root"; then
                    echo "    $step. Branch disposition: DELETE branch '$branch' (remote)"
                    ((step++))
                fi
            fi
        else
            echo "    $step. Branch disposition: N/A (no associated branch)"
            ((step++))
        fi

        echo "    $step. Prune stale worktree entries"
        echo ""
        render_gauge TAXIING
        render_card_footer
        exit 0
    fi

    # ACTUAL CLEANUP
    echo ""
    log_step "Starting worktree cleanup..."

    # Step 1: Change to project root (THE CRITICAL FIX)
    log_step "Changing to project root..."
    cd "$project_root" || {
        log_fail "Failed to change to project root: $project_root"
        exit 1
    }

    # Step 2: Remove the worktree (with timeout protection)
    log_step "Removing worktree (timeout: ${WORKTREE_REMOVE_TIMEOUT}s)..."
    local remove_exit_code
    if [[ "$FORCE" == true ]]; then
        run_with_timeout "$WORKTREE_REMOVE_TIMEOUT" git worktree remove "$abs_worktree_path" --force
        remove_exit_code=$?
    else
        run_with_timeout "$WORKTREE_REMOVE_TIMEOUT" git worktree remove "$abs_worktree_path"
        remove_exit_code=$?
    fi

    if [[ $remove_exit_code -eq 124 ]]; then
        log_fail "Worktree removal timed out after ${WORKTREE_REMOVE_TIMEOUT} seconds"
        output_timeout_remediation "$abs_worktree_path" "$WORKTREE_REMOVE_TIMEOUT" "git worktree remove"
        exit 4
    elif [[ $remove_exit_code -ne 0 ]]; then
        log_fail "Failed to remove worktree"
        exit 1
    fi
    log_ok "Worktree removed: $abs_worktree_path"

    # Step 3: Handle branch disposition
    if [[ -n "$branch" ]]; then
        if [[ "$is_protected" == true ]]; then
            log_step "Skipping branch deletion (protected branch: $branch)"
        elif [[ "$KEEP_BRANCH" == true ]]; then
            log_step "Keeping branch: $branch"
        elif [[ "$DELETE_BRANCH" == true ]]; then
            # Delete local branch
            log_step "Deleting local branch: $branch"
            if git branch -d "$branch" 2>/dev/null; then
                log_ok "Local branch deleted: $branch"
            elif git branch -D "$branch" 2>/dev/null; then
                log_warn "Local branch force-deleted (was not fully merged): $branch"
            else
                log_warn "Could not delete local branch: $branch (may already be deleted)"
            fi

            # Delete remote branch if exists (with timeout protection)
            if remote_branch_exists "$branch" "$project_root"; then
                log_step "Deleting remote branch: origin/$branch (timeout: ${NETWORK_TIMEOUT}s)..."
                local push_exit_code
                run_with_timeout "$NETWORK_TIMEOUT" git push origin --delete "$branch" 2>/dev/null
                push_exit_code=$?

                if [[ $push_exit_code -eq 124 ]]; then
                    log_fail "Remote branch deletion timed out after ${NETWORK_TIMEOUT} seconds"
                    output_timeout_remediation "$abs_worktree_path" "$NETWORK_TIMEOUT" "git push origin --delete"
                    exit 4
                elif [[ $push_exit_code -eq 0 ]]; then
                    log_ok "Remote branch deleted: origin/$branch"
                else
                    log_warn "Could not delete remote branch: origin/$branch"
                fi
            else
                log_step "No remote branch to delete"
            fi
        fi
    fi

    # Step 4: Prune stale worktree entries
    log_step "Pruning stale worktree entries..."
    git worktree prune

    # CLEANUP summary card
    echo ""
    render_card_header "CLEANUP"
    echo "  Worktree  $abs_worktree_path"
    if [[ -n "$branch" ]]; then
        if [[ "$is_protected" == true ]]; then
            echo "  Branch    $branch (protected, not deleted)"
        elif [[ "$KEEP_BRANCH" == true ]]; then
            echo "  Branch    $branch (kept)"
        elif [[ "$DELETE_BRANCH" == true ]]; then
            echo "  Branch    $branch (deleted)"
        fi
    fi
    echo "  Status    complete"
    echo ""
    render_gauge LANDED
    render_card_footer
}

main "$@"
