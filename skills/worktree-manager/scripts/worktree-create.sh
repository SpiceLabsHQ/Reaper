#!/usr/bin/env bash
set -euo pipefail

# Worktree Create Script
# Safe worktree creation with validation and dependency installation
#
# Usage: worktree-create.sh <task-id> <description> [--base-branch <branch>] [--no-install]

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

    info "Detecting project type..."

    # Node.js
    if [[ -f "$worktree_path/package.json" ]]; then
        info "Node.js project detected"
        if [[ -f "$worktree_path/package-lock.json" ]]; then
            info "Installing npm dependencies..."
            (cd "$worktree_path" && npm install) || {
                warn "npm install failed"
                return 1
            }
        elif [[ -f "$worktree_path/yarn.lock" ]]; then
            info "Installing yarn dependencies..."
            (cd "$worktree_path" && yarn install) || {
                warn "yarn install failed"
                return 1
            }
        elif [[ -f "$worktree_path/pnpm-lock.yaml" ]]; then
            info "Installing pnpm dependencies..."
            (cd "$worktree_path" && pnpm install) || {
                warn "pnpm install failed"
                return 1
            }
        else
            info "Installing npm dependencies (no lockfile)..."
            (cd "$worktree_path" && npm install) || {
                warn "npm install failed"
                return 1
            }
        fi
        success "Node.js dependencies installed"
        return 0
    fi

    # Python with pyproject.toml
    if [[ -f "$worktree_path/pyproject.toml" ]]; then
        info "Python project detected (pyproject.toml)"
        if command -v poetry &>/dev/null && grep -q "tool.poetry" "$worktree_path/pyproject.toml" 2>/dev/null; then
            info "Installing poetry dependencies..."
            (cd "$worktree_path" && poetry install) || {
                warn "poetry install failed"
                return 1
            }
        elif command -v uv &>/dev/null; then
            info "Installing with uv..."
            (cd "$worktree_path" && uv sync) || {
                warn "uv sync failed"
                return 1
            }
        else
            info "Installing with pip..."
            (cd "$worktree_path" && pip install -e .) || {
                warn "pip install failed"
                return 1
            }
        fi
        success "Python dependencies installed"
        return 0
    fi

    # Python with requirements.txt
    if [[ -f "$worktree_path/requirements.txt" ]]; then
        info "Python project detected (requirements.txt)"
        info "Installing pip dependencies..."
        (cd "$worktree_path" && pip install -r requirements.txt) || {
            warn "pip install failed"
            return 1
        }
        success "Python dependencies installed"
        return 0
    fi

    # Ruby
    if [[ -f "$worktree_path/Gemfile" ]]; then
        info "Ruby project detected"
        info "Installing bundler dependencies..."
        (cd "$worktree_path" && bundle install) || {
            warn "bundle install failed"
            return 1
        }
        success "Ruby dependencies installed"
        return 0
    fi

    # PHP
    if [[ -f "$worktree_path/composer.json" ]]; then
        info "PHP project detected"
        info "Installing composer dependencies..."
        (cd "$worktree_path" && composer install) || {
            warn "composer install failed"
            return 1
        }
        success "PHP dependencies installed"
        return 0
    fi

    # Go
    if [[ -f "$worktree_path/go.mod" ]]; then
        info "Go project detected"
        info "Downloading Go modules..."
        (cd "$worktree_path" && go mod download) || {
            warn "go mod download failed"
            return 1
        }
        success "Go dependencies installed"
        return 0
    fi

    # Rust
    if [[ -f "$worktree_path/Cargo.toml" ]]; then
        info "Rust project detected"
        info "Fetching Cargo dependencies..."
        (cd "$worktree_path" && cargo fetch) || {
            warn "cargo fetch failed"
            return 1
        }
        success "Rust dependencies installed"
        return 0
    fi

    info "No dependency file detected - skipping installation"
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
                error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
            *)
                if [[ -z "$task_id" ]]; then
                    task_id="$1"
                elif [[ -z "$description" ]]; then
                    description="$1"
                else
                    error "Too many arguments"
                    exit 1
                fi
                shift
                ;;
        esac
    done

    # Validate input
    if [[ -z "$task_id" ]]; then
        error "Task ID is required"
        echo "Use --help for usage information"
        exit 1
    fi

    if [[ -z "$description" ]]; then
        error "Description is required"
        echo "Use --help for usage information"
        exit 1
    fi

    # Normalize description (lowercase, replace spaces with hyphens)
    description=$(echo "$description" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-')

    # --- Pre-flight Checks ---

    # Check if we're in a git repository
    if ! git rev-parse --is-inside-work-tree &>/dev/null; then
        error "Not in a git repository"
        exit 1
    fi

    # Check if we're already in a worktree (under ./trees/)
    if [[ "$(pwd)" == *"/trees/"* ]]; then
        error "Already inside a worktree directory"
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
            error "Cannot find base branch (tried: develop, main, master)"
            exit 1
        fi
    fi

    info "Base branch: $base_branch"

    # Define paths
    local worktree_name="${task_id}-${description}"
    local worktree_path="./trees/${worktree_name}"
    local branch_name="feature/${worktree_name}"

    info "Worktree path: $worktree_path"
    info "Branch name: $branch_name"

    # Check if worktree already exists
    if [[ -d "$worktree_path" ]]; then
        error "Worktree already exists: $worktree_path"
        echo ""
        echo "Current worktrees:"
        git worktree list
        exit 1
    fi

    # Check if branch already exists
    if git show-ref --verify --quiet "refs/heads/$branch_name"; then
        error "Branch already exists: $branch_name"
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
        warn "Commits for $task_id may already exist in $base_branch:"
        echo "$existing_commits"
        echo ""
        echo "Continue anyway? (Ctrl+C to abort)"
        sleep 2
    fi

    # --- Create Worktree ---

    # Ensure trees directory exists
    mkdir -p trees

    info "Creating worktree..."
    if ! git worktree add "$worktree_path" -b "$branch_name" "$base_branch"; then
        error "Failed to create worktree"
        exit 1
    fi
    success "Created worktree: $worktree_path"
    success "Created branch: $branch_name"

    # --- Install Dependencies ---

    if [[ "$no_install" != true ]]; then
        echo ""
        install_dependencies "$worktree_path" || {
            warn "Dependency installation failed - continuing anyway"
        }
    else
        info "Skipping dependency installation (--no-install)"
    fi

    # --- Validate Environment ---

    echo ""
    info "Validating environment..."

    # Verify on correct branch
    local current_branch
    current_branch=$(git -C "$worktree_path" branch --show-current)
    if [[ "$current_branch" != "$branch_name" ]]; then
        warn "Expected branch $branch_name, got $current_branch"
    else
        success "On correct branch: $branch_name"
    fi

    # Verify clean state
    if [[ -z "$(git -C "$worktree_path" status --porcelain)" ]]; then
        success "Worktree is clean"
    else
        warn "Worktree has uncommitted changes after setup"
    fi

    # --- Summary ---

    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║  Worktree Created Successfully                             ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "  📁 Path:   $worktree_path"
    echo "  🌿 Branch: $branch_name"
    echo "  🎯 Task:   $task_id"
    echo ""
    echo "Next steps:"
    echo "  • Work in worktree: (cd $worktree_path && npm test)"
    echo "  • Git commands:     git -C $worktree_path status"
    echo "  • Cleanup when done: ~/.claude/skills/worktree-manager/scripts/worktree-cleanup.sh $worktree_path"
    echo ""
}

main "$@"
