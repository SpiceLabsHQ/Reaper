#!/usr/bin/env bash
set -euo pipefail

# Worktree Cleanup Script
# Safe worktree removal that handles CWD issues
#
# CRITICAL: This script changes to project root BEFORE removing the worktree
# to prevent breaking the shell when CWD is inside the worktree.
#
# Usage: worktree-cleanup.sh <worktree-path> [--force] [--dry-run] [--keep-branch]

# --- Color Output ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# --- Helper Functions ---
info() { echo -e "${BLUE}ℹ${NC} $*"; }
success() { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*" >&2; }
error() { echo -e "${RED}✗${NC} $*" >&2; }

usage() {
    cat << EOF
Usage: $(basename "$0") <worktree-path> [options]

Safe worktree removal that prevents CWD errors.

Options:
    --force         Skip safety checks (uncommitted changes, unmerged commits)
    --dry-run       Show what would happen without making changes
    --keep-branch   Remove worktree but keep the git branch
    --help          Show this help message

Examples:
    $(basename "$0") ./trees/PROJ-123-auth
    $(basename "$0") ./trees/PROJ-123-auth --force
    $(basename "$0") ./trees/PROJ-123-auth --dry-run
    $(basename "$0") ./trees/PROJ-123-auth --keep-branch

Exit codes:
    0   Success
    1   Error (invalid input, git failure)
    2   Safety check failed (uncommitted changes, unmerged commits)
EOF
    exit 0
}

# Find project root from worktree path
find_project_root() {
    local worktree_path="$1"
    local abs_path

    # Resolve to absolute path
    abs_path=$(cd "$(dirname "$worktree_path")" 2>/dev/null && pwd)/$(basename "$worktree_path")

    # If path contains /trees/, project root is parent of trees/
    if [[ "$abs_path" == *"/trees/"* ]]; then
        echo "${abs_path%%/trees/*}"
        return 0
    fi

    # Fallback: use git to find toplevel from parent directory
    local parent_dir
    parent_dir=$(dirname "$abs_path")
    if [[ -d "$parent_dir" ]]; then
        git -C "$parent_dir" rev-parse --show-toplevel 2>/dev/null && return 0
    fi

    # Last resort: try current directory's git root
    git rev-parse --show-toplevel 2>/dev/null && return 0

    return 1
}

# Get branch name from worktree
get_worktree_branch() {
    local worktree_path="$1"
    git -C "$worktree_path" branch --show-current 2>/dev/null || \
    git -C "$worktree_path" rev-parse --abbrev-ref HEAD 2>/dev/null || \
    echo ""
}

# Check for uncommitted changes
has_uncommitted_changes() {
    local worktree_path="$1"
    [[ -n "$(git -C "$worktree_path" status --porcelain 2>/dev/null)" ]]
}

# Check for unmerged commits (commits not in develop or main)
get_unmerged_commits() {
    local worktree_path="$1"
    local branch="$2"
    local base_branch="develop"

    # Try develop first, then main
    if ! git show-ref --verify --quiet "refs/heads/develop" 2>/dev/null; then
        base_branch="main"
    fi

    git log "${base_branch}..${branch}" --oneline 2>/dev/null || echo ""
}

# --- Main ---
main() {
    local worktree_path=""
    local force=false
    local dry_run=false
    local keep_branch=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --force)
                force=true
                shift
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            --keep-branch)
                keep_branch=true
                shift
                ;;
            --help|-h)
                usage
                ;;
            -*)
                error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
            *)
                if [[ -z "$worktree_path" ]]; then
                    worktree_path="$1"
                else
                    error "Too many arguments"
                    exit 1
                fi
                shift
                ;;
        esac
    done

    # Validate input
    if [[ -z "$worktree_path" ]]; then
        error "Worktree path is required"
        echo "Use --help for usage information"
        exit 1
    fi

    # Resolve to absolute path for consistent handling
    if [[ ! "$worktree_path" = /* ]]; then
        worktree_path="$(pwd)/$worktree_path"
    fi

    # Normalize path (remove trailing slash, resolve ..)
    worktree_path=$(cd "$(dirname "$worktree_path")" 2>/dev/null && pwd)/$(basename "$worktree_path") || {
        # If cd fails, the directory might not exist - try parent
        local parent_dir
        parent_dir=$(dirname "$worktree_path")
        if [[ -d "$parent_dir" ]]; then
            worktree_path="$(cd "$parent_dir" && pwd)/$(basename "$worktree_path")"
        fi
    }

    info "Worktree path: $worktree_path"

    # Find project root
    local project_root
    project_root=$(find_project_root "$worktree_path") || {
        error "Cannot determine project root from: $worktree_path"
        exit 1
    }

    info "Project root: $project_root"

    # CRITICAL: Change to project root BEFORE any worktree operations
    # This prevents the shell from breaking when CWD is inside the worktree
    info "Changing to project root (critical CWD fix)..."
    cd "$project_root" || {
        error "Cannot change to project root: $project_root"
        exit 1
    }
    success "Changed to: $(pwd)"

    # Check if worktree exists
    if [[ ! -d "$worktree_path" ]]; then
        warn "Worktree directory does not exist: $worktree_path"
        info "Pruning stale worktree entries..."
        if [[ "$dry_run" == true ]]; then
            info "[DRY RUN] Would run: git worktree prune"
        else
            git worktree prune
            success "Pruned stale entries"
        fi
        exit 0
    fi

    # Get branch name
    local branch
    branch=$(get_worktree_branch "$worktree_path")
    if [[ -n "$branch" ]]; then
        info "Branch: $branch"
    fi

    # Safety checks (unless --force)
    if [[ "$force" != true ]]; then
        # Check for uncommitted changes
        if has_uncommitted_changes "$worktree_path"; then
            error "Uncommitted changes detected in worktree!"
            echo ""
            git -C "$worktree_path" status --short
            echo ""
            echo "Options:"
            echo "  1. Commit changes: git -C $worktree_path commit -am 'message'"
            echo "  2. Stash changes:  git -C $worktree_path stash"
            echo "  3. Discard:        git -C $worktree_path reset --hard"
            echo "  4. Force cleanup:  $(basename "$0") $worktree_path --force"
            exit 2
        fi
        success "No uncommitted changes"

        # Check for unmerged commits
        if [[ -n "$branch" ]]; then
            local unmerged
            unmerged=$(get_unmerged_commits "$worktree_path" "$branch")
            if [[ -n "$unmerged" ]]; then
                warn "Branch has unmerged commits:"
                echo "$unmerged"
                echo ""
                echo "These commits may be lost! Options:"
                echo "  1. Merge first:   git checkout develop && git merge $branch"
                echo "  2. Force cleanup: $(basename "$0") $worktree_path --force"
                exit 2
            fi
            success "All commits are merged"
        fi
    else
        warn "Skipping safety checks (--force)"
    fi

    # --- Execute Cleanup ---

    if [[ "$dry_run" == true ]]; then
        echo ""
        info "[DRY RUN] Would execute:"
        echo "  git worktree remove $worktree_path"
        if [[ "$keep_branch" != true && -n "$branch" ]]; then
            echo "  git branch -d $branch"
        fi
        echo "  git worktree prune"
        exit 0
    fi

    # Remove worktree
    info "Removing worktree..."
    if git worktree remove "$worktree_path" 2>/dev/null; then
        success "Removed worktree: $worktree_path"
    else
        # Try force removal
        warn "Standard removal failed, trying force removal..."
        if git worktree remove "$worktree_path" --force 2>/dev/null; then
            success "Force removed worktree: $worktree_path"
        else
            # Manual cleanup as last resort
            warn "Git worktree remove failed, cleaning up manually..."
            rm -rf "$worktree_path"
            git worktree prune
            success "Manually cleaned up: $worktree_path"
        fi
    fi

    # Delete branch (unless --keep-branch)
    if [[ "$keep_branch" != true && -n "$branch" && "$branch" != "develop" && "$branch" != "main" && "$branch" != "master" ]]; then
        info "Deleting branch: $branch"
        if git branch -d "$branch" 2>/dev/null; then
            success "Deleted branch: $branch"
        elif git branch -D "$branch" 2>/dev/null; then
            warn "Force deleted branch: $branch (had unmerged commits)"
        else
            warn "Could not delete branch: $branch"
        fi

        # Try to delete remote branch
        if git show-ref --verify --quiet "refs/remotes/origin/$branch" 2>/dev/null; then
            info "Deleting remote branch: origin/$branch"
            if git push origin --delete "$branch" 2>/dev/null; then
                success "Deleted remote branch"
            else
                warn "Could not delete remote branch (may require permissions)"
            fi
        fi
    elif [[ "$keep_branch" == true ]]; then
        info "Keeping branch: $branch (--keep-branch)"
    fi

    # Prune stale worktree entries
    git worktree prune 2>/dev/null || true

    echo ""
    success "Cleanup complete!"
    echo ""
    echo "Remaining worktrees:"
    git worktree list
}

main "$@"
