#!/usr/bin/env bash
set -euo pipefail

# Worktree List Script
# List worktrees with enhanced status information
#
# Usage: worktree-list.sh [--json] [--verbose]

# --- Visual Helpers ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/visual-helpers.sh"

usage() {
    cat << EOF
Usage: $(basename "$0") [options]

List all worktrees with status information.

Options:
    --json      Output in JSON format
    --verbose   Show detailed information for each worktree
    --help      Show this help message

Examples:
    $(basename "$0")
    $(basename "$0") --verbose
    $(basename "$0") --json
EOF
    exit 0
}

# Check for uncommitted changes
has_changes() {
    local path="$1"
    [[ -n "$(git -C "$path" status --porcelain 2>/dev/null)" ]]
}

# Count unmerged commits
count_unmerged() {
    local path="$1"
    local branch="$2"
    local base="develop"

    # Try develop first, then main
    if ! git show-ref --verify --quiet "refs/heads/develop" 2>/dev/null; then
        base="main"
    fi

    git log "${base}..${branch}" --oneline 2>/dev/null | wc -l | tr -d ' '
}

# Get last commit info
get_last_commit() {
    local path="$1"
    git -C "$path" log -1 --format="%h %s" 2>/dev/null | head -c 60
}

# Get last commit date
get_last_commit_date() {
    local path="$1"
    git -C "$path" log -1 --format="%cr" 2>/dev/null
}

# --- Main ---
main() {
    local json_output=false
    local verbose=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --json)
                json_output=true
                shift
                ;;
            --verbose)
                verbose=true
                shift
                ;;
            --help|-h)
                usage
                ;;
            *)
                log_warn "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    # Check if we're in a git repository
    if ! git rev-parse --is-inside-work-tree &>/dev/null; then
        echo "Not in a git repository" >&2
        exit 1
    fi

    # Get worktree list
    local worktrees
    worktrees=$(git worktree list --porcelain)

    if [[ -z "$worktrees" ]]; then
        if [[ "$json_output" == true ]]; then
            echo "[]"
        else
            echo "No worktrees found"
        fi
        exit 0
    fi

    # Parse worktrees
    local current_path=""
    local current_head=""
    local current_branch=""
    local worktree_data=()

    while IFS= read -r line; do
        if [[ "$line" =~ ^worktree\ (.+)$ ]]; then
            # Save previous worktree if exists
            if [[ -n "$current_path" ]]; then
                worktree_data+=("$current_path|$current_head|$current_branch")
            fi
            current_path="${BASH_REMATCH[1]}"
            current_head=""
            current_branch=""
        elif [[ "$line" =~ ^HEAD\ (.+)$ ]]; then
            current_head="${BASH_REMATCH[1]}"
        elif [[ "$line" =~ ^branch\ refs/heads/(.+)$ ]]; then
            current_branch="${BASH_REMATCH[1]}"
        elif [[ "$line" == "detached" ]]; then
            current_branch="(detached)"
        fi
    done <<< "$worktrees"

    # Don't forget the last one
    if [[ -n "$current_path" ]]; then
        worktree_data+=("$current_path|$current_head|$current_branch")
    fi

    # JSON output
    if [[ "$json_output" == true ]]; then
        echo "["
        local first=true
        for entry in "${worktree_data[@]}"; do
            IFS='|' read -r path head branch <<< "$entry"

            local changes="false"
            local unmerged=0
            local last_commit=""
            local last_date=""

            if [[ -d "$path" ]]; then
                if has_changes "$path"; then
                    changes="true"
                fi
                if [[ -n "$branch" && "$branch" != "(detached)" ]]; then
                    unmerged=$(count_unmerged "$path" "$branch")
                fi
                last_commit=$(get_last_commit "$path" | sed 's/"/\\"/g')
                last_date=$(get_last_commit_date "$path")
            fi

            if [[ "$first" != true ]]; then
                echo ","
            fi
            first=false

            cat << EOF
  {
    "path": "$path",
    "branch": "$branch",
    "head": "$head",
    "has_changes": $changes,
    "unmerged_commits": $unmerged,
    "last_commit": "$last_commit",
    "last_commit_date": "$last_date"
  }
EOF
        done
        echo ""
        echo "]"
        exit 0
    fi

    # Table output
    if [[ "$verbose" != true ]]; then
        # Simple table header
        printf "%-50s %-30s %-8s %-8s\n" "PATH" "BRANCH" "CHANGES" "UNMERGED"
        printf "%-50s %-30s %-8s %-8s\n" "----" "------" "-------" "--------"

        for entry in "${worktree_data[@]}"; do
            IFS='|' read -r path head branch <<< "$entry"

            local changes="N"
            local unmerged="-"

            if [[ -d "$path" ]]; then
                if has_changes "$path"; then
                    changes="${__VH_YELLOW}Y${__VH_NC}"
                fi
                if [[ -n "$branch" && "$branch" != "(detached)" ]]; then
                    local count
                    count=$(count_unmerged "$path" "$branch")
                    if [[ "$count" -gt 0 ]]; then
                        unmerged="${__VH_BLUE}$count${__VH_NC}"
                    else
                        unmerged="0"
                    fi
                fi
            else
                changes="${__VH_RED}?${__VH_NC}"
                unmerged="${__VH_RED}?${__VH_NC}"
            fi

            # Truncate path for display
            local display_path="$path"
            if [[ ${#path} -gt 48 ]]; then
                display_path="...${path: -45}"
            fi

            printf "%-50s %-30s %-8b %-8b\n" "$display_path" "$branch" "$changes" "$unmerged"
        done
    else
        # Verbose output
        for entry in "${worktree_data[@]}"; do
            IFS='|' read -r path head branch <<< "$entry"

            echo ""
            render_card_header "$branch"

            echo "  Path:   $path"
            echo "  HEAD:   ${head:0:12}"

            if [[ -d "$path" ]]; then
                # Changes
                if has_changes "$path"; then
                    echo -e "  Changes: ${__VH_YELLOW}Yes${__VH_NC}"
                    git -C "$path" status --short | head -5 | sed 's/^/    /'
                    local change_count
                    change_count=$(git -C "$path" status --short | wc -l | tr -d ' ')
                    if [[ "$change_count" -gt 5 ]]; then
                        echo "    ... and $((change_count - 5)) more"
                    fi
                else
                    echo -e "  Changes: ${__VH_GREEN}No${__VH_NC}"
                fi

                # Unmerged commits
                if [[ -n "$branch" && "$branch" != "(detached)" ]]; then
                    local unmerged
                    unmerged=$(count_unmerged "$path" "$branch")
                    if [[ "$unmerged" -gt 0 ]]; then
                        echo -e "  Unmerged: ${__VH_YELLOW}$unmerged commits${__VH_NC}"
                    else
                        echo -e "  Unmerged: ${__VH_GREEN}0${__VH_NC} (all merged)"
                    fi
                fi

                # Last commit
                echo "  Last commit: $(get_last_commit "$path")"
                echo "  Commit date: $(get_last_commit_date "$path")"
            else
                log_fail "Directory not found"
            fi

            render_card_footer
        done

        echo ""
        log_step "${#worktree_data[@]} worktrees"
    fi
}

main "$@"
