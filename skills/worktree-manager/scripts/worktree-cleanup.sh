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

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

usage() {
    cat << EOF
Usage: $(basename "$0") <worktree-path> [options]

Safely remove a git worktree with explicit branch disposition.

Arguments:
  worktree-path    Path to the worktree to remove (e.g., ./trees/PROJ-123-auth)

Options:
  --keep-branch    Remove worktree but keep the associated branch
  --delete-branch  Remove worktree AND delete the associated branch (local and remote)
  --force          Skip safety checks (uncommitted changes warning)
  --dry-run        Show what would happen without making changes

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
EOF
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
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
   WORKTREE_REMOVE_TIMEOUT=300 worktree-cleanup.sh ${worktree_path} --delete-branch

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
        log_error "Cannot resolve worktree path: $worktree_path"
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
        log_error "Missing required argument: worktree-path"
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
            -*)
                log_error "Unknown option: $1"
                echo ""
                usage
                exit 1
                ;;
            *)
                if [[ -z "$WORKTREE_PATH" ]]; then
                    WORKTREE_PATH="$1"
                else
                    log_error "Unexpected argument: $1"
                    exit 1
                fi
                shift
                ;;
        esac
    done

    # Validate worktree path provided
    if [[ -z "$WORKTREE_PATH" ]]; then
        log_error "Missing required argument: worktree-path"
        echo ""
        usage
        exit 1
    fi

    # Check for mutually exclusive flags
    if [[ "$KEEP_BRANCH" == true && "$DELETE_BRANCH" == true ]]; then
        log_error "Cannot specify both --keep-branch and --delete-branch"
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
        log_error "Worktree directory does not exist: $WORKTREE_PATH"
        exit 1
    fi

    # Get absolute path
    local abs_worktree_path
    abs_worktree_path=$(cd "$WORKTREE_PATH" && pwd)

    # Find project root
    local project_root
    project_root=$(find_project_root "$WORKTREE_PATH")

    if [[ -z "$project_root" || ! -d "$project_root" ]]; then
        log_error "Cannot determine project root from worktree path"
        exit 1
    fi

    # Get the branch associated with this worktree
    local branch
    branch=$(get_worktree_branch "$abs_worktree_path")

    log_info "Worktree: $abs_worktree_path"
    log_info "Project root: $project_root"
    [[ -n "$branch" ]] && log_info "Associated branch: $branch"

    # Check if branch is protected
    local is_protected=false
    if [[ -n "$branch" ]] && is_protected_branch "$branch"; then
        is_protected=true
        log_info "Branch '$branch' is a protected branch (will not be deleted)"
    fi

    # BRANCH DISPOSITION CHECK
    # If worktree has an associated branch that is NOT protected, require explicit disposition
    if [[ -n "$branch" && "$is_protected" == false ]]; then
        if [[ "$KEEP_BRANCH" == false && "$DELETE_BRANCH" == false ]]; then
            log_error "Branch disposition required for non-protected branch '$branch'"
            echo ""
            echo -e "${YELLOW}You must specify what to do with the branch:${NC}"
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
            log_error "Worktree has uncommitted changes"
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

    # DRY RUN: Show what would happen
    if [[ "$DRY_RUN" == true ]]; then
        echo ""
        echo -e "${BLUE}=== DRY RUN - No changes will be made ===${NC}"
        echo ""
        echo "Would perform the following actions:"
        echo ""
        local step=1
        echo "  $step. Change to project root: $project_root"
        ((step++))
        echo "  $step. Remove worktree: $abs_worktree_path"
        ((step++))

        if [[ -n "$branch" ]]; then
            if [[ "$is_protected" == true ]]; then
                echo "  $step. Branch disposition: SKIP (protected branch '$branch')"
                ((step++))
            elif [[ "$KEEP_BRANCH" == true ]]; then
                echo "  $step. Branch disposition: KEEP branch '$branch'"
                ((step++))
            elif [[ "$DELETE_BRANCH" == true ]]; then
                echo "  $step. Branch disposition: DELETE branch '$branch' (local)"
                ((step++))
                if remote_branch_exists "$branch" "$project_root"; then
                    echo "  $step. Branch disposition: DELETE branch '$branch' (remote)"
                    ((step++))
                fi
            fi
        else
            echo "  $step. Branch disposition: N/A (no associated branch)"
            ((step++))
        fi

        echo "  $step. Prune stale worktree entries"
        echo ""
        echo -e "${BLUE}=== End dry run ===${NC}"
        exit 0
    fi

    # ACTUAL CLEANUP
    echo ""
    log_info "Starting worktree cleanup..."

    # Step 1: Change to project root (THE CRITICAL FIX)
    log_info "Changing to project root..."
    cd "$project_root" || {
        log_error "Failed to change to project root: $project_root"
        exit 1
    }

    # Step 2: Remove the worktree (with timeout protection)
    log_info "Removing worktree (timeout: ${WORKTREE_REMOVE_TIMEOUT}s)..."
    local remove_exit_code
    if [[ "$FORCE" == true ]]; then
        run_with_timeout "$WORKTREE_REMOVE_TIMEOUT" git worktree remove "$abs_worktree_path" --force
        remove_exit_code=$?
    else
        run_with_timeout "$WORKTREE_REMOVE_TIMEOUT" git worktree remove "$abs_worktree_path"
        remove_exit_code=$?
    fi

    if [[ $remove_exit_code -eq 124 ]]; then
        log_error "Worktree removal timed out after ${WORKTREE_REMOVE_TIMEOUT} seconds"
        output_timeout_remediation "$abs_worktree_path" "$WORKTREE_REMOVE_TIMEOUT" "git worktree remove"
        exit 4
    elif [[ $remove_exit_code -ne 0 ]]; then
        log_error "Failed to remove worktree"
        exit 1
    fi
    log_success "Worktree removed: $abs_worktree_path"

    # Step 3: Handle branch disposition
    if [[ -n "$branch" ]]; then
        if [[ "$is_protected" == true ]]; then
            log_info "Skipping branch deletion (protected branch: $branch)"
        elif [[ "$KEEP_BRANCH" == true ]]; then
            log_info "Keeping branch: $branch"
        elif [[ "$DELETE_BRANCH" == true ]]; then
            # Delete local branch
            log_info "Deleting local branch: $branch"
            if git branch -d "$branch" 2>/dev/null; then
                log_success "Local branch deleted: $branch"
            elif git branch -D "$branch" 2>/dev/null; then
                log_warn "Local branch force-deleted (was not fully merged): $branch"
            else
                log_warn "Could not delete local branch: $branch (may already be deleted)"
            fi

            # Delete remote branch if exists (with timeout protection)
            if remote_branch_exists "$branch" "$project_root"; then
                log_info "Deleting remote branch: origin/$branch (timeout: ${NETWORK_TIMEOUT}s)..."
                local push_exit_code
                run_with_timeout "$NETWORK_TIMEOUT" git push origin --delete "$branch" 2>/dev/null
                push_exit_code=$?

                if [[ $push_exit_code -eq 124 ]]; then
                    log_error "Remote branch deletion timed out after ${NETWORK_TIMEOUT} seconds"
                    output_timeout_remediation "$abs_worktree_path" "$NETWORK_TIMEOUT" "git push origin --delete"
                    exit 4
                elif [[ $push_exit_code -eq 0 ]]; then
                    log_success "Remote branch deleted: origin/$branch"
                else
                    log_warn "Could not delete remote branch: origin/$branch"
                fi
            else
                log_info "No remote branch to delete"
            fi
        fi
    fi

    # Step 4: Prune stale worktree entries
    log_info "Pruning stale worktree entries..."
    git worktree prune

    echo ""
    log_success "Worktree cleanup complete!"

    # Summary
    echo ""
    echo "Summary:"
    echo "  Worktree removed: $abs_worktree_path"
    if [[ -n "$branch" ]]; then
        if [[ "$is_protected" == true ]]; then
            echo "  Branch: $branch (protected, not deleted)"
        elif [[ "$KEEP_BRANCH" == true ]]; then
            echo "  Branch: $branch (kept)"
        elif [[ "$DELETE_BRANCH" == true ]]; then
            echo "  Branch: $branch (deleted)"
        fi
    fi
}

main "$@"
