#!/usr/bin/env bash
set -euo pipefail

# Worktree Create Script
# Safe worktree creation with validation and dependency installation
#
# Usage: worktree-create.sh <task-id> <description> [--base-branch <branch>] [--no-install]

# --- Visual helpers ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/visual-helpers.sh"

usage() {
    cat << EOF
Usage: $(basename "$0") <task-id> <description> [options]

Create a new worktree with proper naming and setup.

Arguments:
    task-id         Task identifier (e.g., PROJ-123, repo-a3f, #456)
    description     Brief description (e.g., auth, bugfix, refactor)

Options:
    --base-branch <branch>  Branch to create from (default: develop, fallback: main)
    --no-install            Skip dependency installation
    --help                  Show this help message

Examples:
    $(basename "$0") PROJ-123 auth-feature
    $(basename "$0") repo-a3f oauth-integration
    $(basename "$0") BUG-456 security-fix --base-branch main
    $(basename "$0") FEAT-789 api-refactor --no-install

Creates:
    - Worktree at: ./trees/<task-id>-<description>
    - Branch: feature/<task-id>-<description>
EOF
    exit 0
}

# Detect and install dependencies
install_dependencies() {
    local worktree_path="$1"

    log_step "Detecting project type..."

    # Node.js
    if [[ -f "$worktree_path/package.json" ]]; then
        log_step "Node.js project detected"
        if [[ -f "$worktree_path/package-lock.json" ]]; then
            log_step "Installing npm dependencies..."
            (cd "$worktree_path" && npm install) || {
                log_warn "npm install failed"
                return 1
            }
        elif [[ -f "$worktree_path/yarn.lock" ]]; then
            log_step "Installing yarn dependencies..."
            (cd "$worktree_path" && yarn install) || {
                log_warn "yarn install failed"
                return 1
            }
        elif [[ -f "$worktree_path/pnpm-lock.yaml" ]]; then
            log_step "Installing pnpm dependencies..."
            (cd "$worktree_path" && pnpm install) || {
                log_warn "pnpm install failed"
                return 1
            }
        else
            log_step "Installing npm dependencies (no lockfile)..."
            (cd "$worktree_path" && npm install) || {
                log_warn "npm install failed"
                return 1
            }
        fi
        log_ok "Node.js dependencies installed"
        return 0
    fi

    # Python with pyproject.toml
    if [[ -f "$worktree_path/pyproject.toml" ]]; then
        log_step "Python project detected (pyproject.toml)"
        if command -v poetry &>/dev/null && grep -q "tool.poetry" "$worktree_path/pyproject.toml" 2>/dev/null; then
            log_step "Installing poetry dependencies..."
            (cd "$worktree_path" && poetry install) || {
                log_warn "poetry install failed"
                return 1
            }
        elif command -v uv &>/dev/null; then
            log_step "Installing with uv..."
            (cd "$worktree_path" && uv sync) || {
                log_warn "uv sync failed"
                return 1
            }
        else
            log_step "Installing with pip..."
            (cd "$worktree_path" && pip install -e .) || {
                log_warn "pip install failed"
                return 1
            }
        fi
        log_ok "Python dependencies installed"
        return 0
    fi

    # Python with requirements.txt
    if [[ -f "$worktree_path/requirements.txt" ]]; then
        log_step "Python project detected (requirements.txt)"
        log_step "Installing pip dependencies..."
        (cd "$worktree_path" && pip install -r requirements.txt) || {
            log_warn "pip install failed"
            return 1
        }
        log_ok "Python dependencies installed"
        return 0
    fi

    # Ruby
    if [[ -f "$worktree_path/Gemfile" ]]; then
        log_step "Ruby project detected"
        log_step "Installing bundler dependencies..."
        (cd "$worktree_path" && bundle install) || {
            log_warn "bundle install failed"
            return 1
        }
        log_ok "Ruby dependencies installed"
        return 0
    fi

    # PHP
    if [[ -f "$worktree_path/composer.json" ]]; then
        log_step "PHP project detected"
        log_step "Installing composer dependencies..."
        (cd "$worktree_path" && composer install) || {
            log_warn "composer install failed"
            return 1
        }
        log_ok "PHP dependencies installed"
        return 0
    fi

    # Go
    if [[ -f "$worktree_path/go.mod" ]]; then
        log_step "Go project detected"
        log_step "Downloading Go modules..."
        (cd "$worktree_path" && go mod download) || {
            log_warn "go mod download failed"
            return 1
        }
        log_ok "Go dependencies installed"
        return 0
    fi

    # Rust
    if [[ -f "$worktree_path/Cargo.toml" ]]; then
        log_step "Rust project detected"
        log_step "Fetching Cargo dependencies..."
        (cd "$worktree_path" && cargo fetch) || {
            log_warn "cargo fetch failed"
            return 1
        }
        log_ok "Rust dependencies installed"
        return 0
    fi

    log_step "No dependency file detected - skipping installation"
    return 0
}

# --- Main ---
main() {
    local task_id=""
    local description=""
    local base_branch=""
    local no_install=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --base-branch)
                base_branch="$2"
                shift 2
                ;;
            --no-install)
                no_install=true
                shift
                ;;
            --help|-h)
                usage
                ;;
            -*)
                log_fail "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
            *)
                if [[ -z "$task_id" ]]; then
                    task_id="$1"
                elif [[ -z "$description" ]]; then
                    description="$1"
                else
                    log_fail "Too many arguments"
                    exit 1
                fi
                shift
                ;;
        esac
    done

    # Validate input
    if [[ -z "$task_id" ]]; then
        log_fail "Task ID is required"
        echo "Use --help for usage information"
        exit 1
    fi

    if [[ -z "$description" ]]; then
        log_fail "Description is required"
        echo "Use --help for usage information"
        exit 1
    fi

    # Normalize description (lowercase, replace spaces with hyphens)
    description=$(echo "$description" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-')

    # --- Pre-flight Checks ---

    # Check if we're in a git repository
    if ! git rev-parse --is-inside-work-tree &>/dev/null; then
        log_fail "Not in a git repository"
        exit 1
    fi

    # Check if we're already in a worktree (under ./trees/)
    if [[ "$(pwd)" == *"/trees/"* ]]; then
        log_fail "Already inside a worktree directory"
        echo "Navigate to project root first"
        exit 1
    fi

    # Determine base branch
    if [[ -z "$base_branch" ]]; then
        if git show-ref --verify --quiet refs/heads/develop; then
            base_branch="develop"
        elif git show-ref --verify --quiet refs/heads/main; then
            base_branch="main"
        elif git show-ref --verify --quiet refs/heads/master; then
            base_branch="master"
        else
            log_fail "Cannot find base branch (tried: develop, main, master)"
            exit 1
        fi
    fi

    log_step "Base branch: $base_branch"

    # Define paths
    local worktree_name="${task_id}-${description}"
    local worktree_path="./trees/${worktree_name}"
    local branch_name="feature/${worktree_name}"

    log_step "Worktree path: $worktree_path"
    log_step "Branch name: $branch_name"

    # Check if worktree already exists
    if [[ -d "$worktree_path" ]]; then
        log_fail "Worktree already exists: $worktree_path"
        echo ""
        echo "Current worktrees:"
        git worktree list
        exit 1
    fi

    # Check if branch already exists
    if git show-ref --verify --quiet "refs/heads/$branch_name"; then
        log_fail "Branch already exists: $branch_name"
        echo ""
        echo "Options:"
        echo "  1. Use existing branch: git worktree add $worktree_path $branch_name"
        echo "  2. Delete old branch:   git branch -d $branch_name"
        exit 1
    fi

    # Check if work already exists for this task
    local existing_commits
    existing_commits=$(git log --oneline "$base_branch" --grep="$task_id" 2>/dev/null | head -5)
    if [[ -n "$existing_commits" ]]; then
        log_warn "Commits for $task_id may already exist in $base_branch:"
        echo "$existing_commits"
        echo ""
        echo "Continue anyway? (Ctrl+C to abort)"
        sleep 2
    fi

    # --- Create Worktree ---

    # Ensure trees directory exists
    mkdir -p trees

    log_step "Creating worktree..."
    if ! git worktree add "$worktree_path" -b "$branch_name" "$base_branch"; then
        log_fail "Failed to create worktree"
        exit 1
    fi
    log_ok "Created worktree: $worktree_path"
    log_ok "Created branch: $branch_name"

    # --- Install Dependencies ---

    if [[ "$no_install" != true ]]; then
        echo ""
        install_dependencies "$worktree_path" || {
            log_warn "Dependency installation failed - continuing anyway"
        }
    else
        log_step "Skipping dependency installation (--no-install)"
    fi

    # --- Validate Environment ---

    echo ""
    log_step "Validating environment..."

    # Verify on correct branch
    local current_branch
    current_branch=$(git -C "$worktree_path" branch --show-current)
    if [[ "$current_branch" != "$branch_name" ]]; then
        log_warn "Expected branch $branch_name, got $current_branch"
    else
        log_ok "On correct branch: $branch_name"
    fi

    # Verify clean state
    if [[ -z "$(git -C "$worktree_path" status --porcelain)" ]]; then
        log_ok "Worktree is clean"
    else
        log_warn "Worktree has uncommitted changes after setup"
    fi

    # --- Summary ---

    echo ""
    render_card_header "CREATED"
    echo "  Path:    $worktree_path"
    echo "  Branch:  $branch_name"
    echo "  Task:    $task_id"
    echo ""
    render_gauge "TAKING_OFF"
    echo ""
    echo "  Next steps:"
    echo "    Work in worktree:  (cd $worktree_path && npm test)"
    echo "    Git commands:      git -C $worktree_path status"
    echo "    Cleanup when done: ~/.claude/skills/worktree-manager/scripts/worktree-cleanup.sh $worktree_path"
    render_card_footer
    echo ""
}

main "$@"
