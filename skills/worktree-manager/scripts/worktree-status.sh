#!/usr/bin/env bash
set -euo pipefail

# Worktree Status Script
# Check detailed health and status of a specific worktree
#
# Usage: worktree-status.sh <worktree-path>

# --- Color Output ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# --- Helper Functions ---
info() { echo -e "${BLUE}ℹ${NC} $*"; }
success() { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }
error() { echo -e "${RED}✗${NC} $*"; }

usage() {
    cat << EOF
Usage: $(basename "$0") <worktree-path> [--json]

Check detailed status of a specific worktree.

Arguments:
    worktree-path   Path to the worktree (e.g., ./trees/PROJ-123-auth)

Options:
    --json          Output in JSON format
    --help          Show this help message

Examples:
    $(basename "$0") ./trees/PROJ-123-auth
    $(basename "$0") ./trees/PROJ-123-auth --json

Checks performed:
    • Worktree existence and validity
    • Git status (uncommitted changes)
    • Branch status (ahead/behind base)
    • Unmerged commits count
    • Dependency status (node_modules, etc.)
    • Last commit information
EOF
    exit 0
}

# --- Main ---
main() {
    local worktree_path=""
    local json_output=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --json)
                json_output=true
                shift
                ;;
            --help|-h)
                usage
                ;;
            -*)
                error "Unknown option: $1"
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

    if [[ -z "$worktree_path" ]]; then
        error "Worktree path is required"
        echo "Use --help for usage information"
        exit 1
    fi

    # Resolve to absolute path
    if [[ ! "$worktree_path" = /* ]]; then
        worktree_path="$(pwd)/$worktree_path"
    fi

    # Normalize path
    if [[ -d "$worktree_path" ]]; then
        worktree_path=$(cd "$worktree_path" && pwd)
    fi

    # Initialize status variables
    local exists="false"
    local is_valid_worktree="false"
    local branch=""
    local head=""
    local has_changes="false"
    local change_count=0
    local unmerged_count=0
    local ahead_count=0
    local behind_count=0
    local last_commit=""
    local last_commit_date=""
    local last_commit_author=""
    local deps_installed="unknown"
    local deps_type="none"
    local base_branch="develop"

    # Check existence
    if [[ -d "$worktree_path" ]]; then
        exists="true"

        # Check if it's a valid worktree
        if git -C "$worktree_path" rev-parse --is-inside-work-tree &>/dev/null; then
            is_valid_worktree="true"

            # Get branch info
            branch=$(git -C "$worktree_path" branch --show-current 2>/dev/null || echo "")
            head=$(git -C "$worktree_path" rev-parse --short HEAD 2>/dev/null || echo "")

            # Determine base branch
            if git show-ref --verify --quiet "refs/heads/develop" 2>/dev/null; then
                base_branch="develop"
            elif git show-ref --verify --quiet "refs/heads/main" 2>/dev/null; then
                base_branch="main"
            fi

            # Check for changes
            local changes
            changes=$(git -C "$worktree_path" status --porcelain 2>/dev/null || echo "")
            if [[ -n "$changes" ]]; then
                has_changes="true"
                change_count=$(echo "$changes" | wc -l | tr -d ' ')
            fi

            # Check ahead/behind
            if [[ -n "$branch" ]]; then
                local tracking
                tracking=$(git -C "$worktree_path" rev-parse --abbrev-ref "${branch}@{upstream}" 2>/dev/null || echo "")

                if [[ -n "$tracking" ]]; then
                    ahead_count=$(git -C "$worktree_path" rev-list "${tracking}..${branch}" --count 2>/dev/null || echo "0")
                    behind_count=$(git -C "$worktree_path" rev-list "${branch}..${tracking}" --count 2>/dev/null || echo "0")
                fi

                # Count unmerged commits (vs base branch)
                unmerged_count=$(git log "${base_branch}..${branch}" --oneline 2>/dev/null | wc -l | tr -d ' ')
            fi

            # Last commit info
            last_commit=$(git -C "$worktree_path" log -1 --format="%s" 2>/dev/null || echo "")
            last_commit_date=$(git -C "$worktree_path" log -1 --format="%cr" 2>/dev/null || echo "")
            last_commit_author=$(git -C "$worktree_path" log -1 --format="%an" 2>/dev/null || echo "")

            # Check dependencies
            if [[ -f "$worktree_path/package.json" ]]; then
                deps_type="nodejs"
                if [[ -d "$worktree_path/node_modules" ]]; then
                    deps_installed="true"
                else
                    deps_installed="false"
                fi
            elif [[ -f "$worktree_path/pyproject.toml" || -f "$worktree_path/requirements.txt" ]]; then
                deps_type="python"
                # Check for venv or site-packages
                if [[ -d "$worktree_path/.venv" || -d "$worktree_path/venv" ]]; then
                    deps_installed="true"
                else
                    deps_installed="unknown"
                fi
            elif [[ -f "$worktree_path/Gemfile" ]]; then
                deps_type="ruby"
                if [[ -d "$worktree_path/vendor/bundle" || -f "$worktree_path/Gemfile.lock" ]]; then
                    deps_installed="true"
                else
                    deps_installed="unknown"
                fi
            elif [[ -f "$worktree_path/composer.json" ]]; then
                deps_type="php"
                if [[ -d "$worktree_path/vendor" ]]; then
                    deps_installed="true"
                else
                    deps_installed="false"
                fi
            elif [[ -f "$worktree_path/go.mod" ]]; then
                deps_type="go"
                deps_installed="true"  # Go modules are usually always available
            elif [[ -f "$worktree_path/Cargo.toml" ]]; then
                deps_type="rust"
                if [[ -d "$worktree_path/target" ]]; then
                    deps_installed="true"
                else
                    deps_installed="false"
                fi
            fi
        fi
    fi

    # JSON output
    if [[ "$json_output" == true ]]; then
        cat << EOF
{
  "path": "$worktree_path",
  "exists": $exists,
  "is_valid_worktree": $is_valid_worktree,
  "branch": "$branch",
  "head": "$head",
  "base_branch": "$base_branch",
  "has_changes": $has_changes,
  "change_count": $change_count,
  "unmerged_commits": $unmerged_count,
  "ahead": $ahead_count,
  "behind": $behind_count,
  "last_commit": "$(echo "$last_commit" | sed 's/"/\\"/g')",
  "last_commit_date": "$last_commit_date",
  "last_commit_author": "$last_commit_author",
  "dependencies": {
    "type": "$deps_type",
    "installed": "$deps_installed"
  }
}
EOF
        exit 0
    fi

    # Human-readable output
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}Worktree Status${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""

    echo "  Path: $worktree_path"
    echo ""

    # Existence check
    if [[ "$exists" != "true" ]]; then
        error "Worktree directory does not exist"
        exit 1
    fi
    success "Directory exists"

    # Valid worktree check
    if [[ "$is_valid_worktree" != "true" ]]; then
        error "Not a valid git worktree"
        exit 1
    fi
    success "Valid git worktree"

    echo ""
    echo -e "${BLUE}Git Status:${NC}"
    echo "  Branch: $branch"
    echo "  HEAD:   $head"
    echo "  Base:   $base_branch"

    # Changes
    if [[ "$has_changes" == "true" ]]; then
        warn "Uncommitted changes: $change_count file(s)"
        git -C "$worktree_path" status --short | head -5 | sed 's/^/    /'
        if [[ "$change_count" -gt 5 ]]; then
            echo "    ... and $((change_count - 5)) more"
        fi
    else
        success "No uncommitted changes"
    fi

    # Ahead/behind
    if [[ "$ahead_count" -gt 0 || "$behind_count" -gt 0 ]]; then
        if [[ "$ahead_count" -gt 0 ]]; then
            info "Ahead of remote: $ahead_count commit(s)"
        fi
        if [[ "$behind_count" -gt 0 ]]; then
            warn "Behind remote: $behind_count commit(s)"
        fi
    else
        success "Up to date with remote"
    fi

    # Unmerged commits
    echo ""
    if [[ "$unmerged_count" -gt 0 ]]; then
        warn "Unmerged commits: $unmerged_count (vs $base_branch)"
        echo "  Recent unmerged:"
        git log "${base_branch}..${branch}" --oneline 2>/dev/null | head -3 | sed 's/^/    /'
    else
        success "All commits merged to $base_branch"
    fi

    # Last commit
    echo ""
    echo -e "${BLUE}Last Commit:${NC}"
    echo "  Message: $last_commit"
    echo "  Date:    $last_commit_date"
    echo "  Author:  $last_commit_author"

    # Dependencies
    echo ""
    echo -e "${BLUE}Dependencies:${NC}"
    if [[ "$deps_type" != "none" ]]; then
        echo "  Type: $deps_type"
        if [[ "$deps_installed" == "true" ]]; then
            success "Dependencies installed"
        elif [[ "$deps_installed" == "false" ]]; then
            warn "Dependencies not installed"
            echo "  Run: (cd $worktree_path && npm install)"
        else
            info "Dependency status unknown"
        fi
    else
        info "No dependency file detected"
    fi

    # Summary
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"

    local issues=0
    [[ "$has_changes" == "true" ]] && ((issues++))
    [[ "$behind_count" -gt 0 ]] && ((issues++))
    [[ "$deps_installed" == "false" ]] && ((issues++))

    if [[ "$issues" -eq 0 ]]; then
        echo -e "${GREEN}Worktree is healthy${NC}"
    else
        echo -e "${YELLOW}$issues issue(s) found${NC}"
    fi
    echo ""

    # Cleanup hint if ready
    if [[ "$has_changes" != "true" && "$unmerged_count" -eq 0 ]]; then
        echo "Ready for cleanup:"
        echo "  ~/.claude/skills/worktree-manager/scripts/worktree-cleanup.sh $worktree_path"
        echo ""
    fi
}

main "$@"
