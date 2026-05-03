#!/usr/bin/env bash
# integration-merge.sh - Wrap the ADR-0014/0019/0020 isolated-merge-worktree sequence
#
# Pure executor for the integration-worktree merge protocol used by the Reaper
# branch-manager agent when consolidating a component branch into a review branch.
# The script does NOT decide between merge/rebase-ff/squash - the caller passes
# the strategy via --strategy. It does enforce the ADR invariants:
#
#   ADR-0014: All git mutations happen inside an isolated integration worktree
#             (.claude/worktrees/<task-id>-<component>-integration). Never
#             `git checkout` in root.
#
#   ADR-0019: After merge + cleanup, root tree must be clean. Conditional ref
#             advance:
#               - if root is checked out to the review branch, use
#                 `git -C ROOT merge --ff-only <integration-branch>` so HEAD,
#                 index, and working tree advance atomically;
#               - otherwise, advance the review branch with
#                 `git branch -f <review-branch> <integration-commit>`.
#
#   ADR-0020: Strategy is selected by the caller (branch-manager) based on
#             commit count and the FLAT_TREE/COMPLEX_TREE flag. This script
#             accepts the decision and executes it; it does not infer.
#
# The script wraps roughly the inline 76-line block from
# src/agents/branch-manager.ejs (around lines 195-270) behind a single
# allowlistable invocation, eliminating per-git-command auto-classifier
# permission prompts in downstream Reaper-using projects.
#
# Exit codes:
#   0 - ok
#   1 - usage error (missing/bad args)
#   2 - precondition fail (root dirty, squash without --squash-message, etc.)
#   3 - merge conflict (integration worktree RETAINED for inspection)
#   4 - post-cleanup root-dirty assertion fail (ADR-0019)

set -euo pipefail

# --- Visual helpers ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/visual-helpers.sh"

# --- Defaults / globals ---
TASK_ID=""
COMPONENT=""
STRATEGY=""
REVIEW_BRANCH=""
SQUASH_MESSAGE=""
WORKTREE_BASE=""

# Internal state
ROOT=""
COMPONENT_BRANCH=""
INTEGRATION_BRANCH=""
INTEGRATION_WORKTREE=""
INTEGRATION_WORKTREE_ABS=""
ROOT_BRANCH=""
declare -a OPS_EXECUTED=()

usage() {
    cat << EOF
Usage: $(basename "$0") --task-id <id> --component <suffix> --strategy <merge|rebase-ff|squash> [options]

Pure executor for the ADR-0014/0019/0020 isolated-integration-worktree merge
sequence. Merges feature/<task-id>-<component> into a review branch using a
caller-selected strategy, with all git mutations confined to an isolated
integration worktree.

Required arguments:
  --task-id <id>                 Task identifier (e.g. PROJ-123, repo-a3f, SPC-29)
  --component <suffix>           Component suffix (e.g. auth, api, worktree-mgmt)
  --strategy <merge|rebase-ff|squash>
                                 Merge strategy. The script does NOT decide
                                 this; the caller picks based on commit count
                                 and FLAT_TREE/COMPLEX_TREE.

Optional arguments:
  --review-branch <name>         Review branch to advance.
                                 Default: feature/<task-id>-review
  --squash-message <text>        REQUIRED when --strategy=squash.
                                 Must be a commitlint-compliant conventional
                                 commit message (the husky pre-commit hook in
                                 the integration worktree will validate it).
  --worktree-base <path>         Base directory for worktrees.
                                 Default: \${WORKTREE_BASE_PATH:-.claude/worktrees}
  --help, -h                     Show this help text.

Strategy semantics:
  --strategy=merge      git merge --no-ff (creates a merge commit; preserves
                        sub-parent grouping for COMPLEX_TREE)
  --strategy=rebase-ff  git rebase + git merge --ff-only (linear single commit)
  --strategy=squash     git reset --soft + git commit -m "<--squash-message>"
                        (collapses N commits into one conventional commit)

Exit codes:
  0  ok
  1  usage error (missing/bad args)
  2  precondition fail (root dirty, squash without --squash-message, etc.)
  3  merge conflict - integration worktree is RETAINED for inspection;
                     caller must resolve and re-run, or clean up manually.
  4  post-cleanup root-dirty assertion fail (ADR-0019)

On success, prints a single JSON line on stdout with operation summary:
  {"task_id":"...","component":"...","strategy":"...","review_branch":"...",
   "integration_worktree":"...","exit_status":0,"ops_executed":[...]}

On exit 3 or 4, prints an "=== AI REMEDIATION GUIDE ===" block on stderr.

Examples:
  $(basename "$0") --task-id SPC-29 --component auth --strategy merge
  $(basename "$0") --task-id PROJ-123 --component api --strategy rebase-ff
  $(basename "$0") --task-id PROJ-123 --component api --strategy squash \\
      --squash-message "feat(api): add user profile endpoint

Squashes work across N commits.

Ref: PROJ-123"
EOF
}

# --- Argument parsing ---
parse_args() {
    if [[ $# -eq 0 ]]; then
        log_fail "Missing required arguments"
        echo ""
        usage >&2
        exit 1
    fi

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --help|-h)
                usage
                exit 0
                ;;
            --task-id)
                if [[ $# -lt 2 ]]; then
                    log_fail "--task-id requires a value"
                    exit 1
                fi
                TASK_ID="$2"
                shift 2
                ;;
            --component)
                if [[ $# -lt 2 ]]; then
                    log_fail "--component requires a value"
                    exit 1
                fi
                COMPONENT="$2"
                shift 2
                ;;
            --strategy)
                if [[ $# -lt 2 ]]; then
                    log_fail "--strategy requires a value (merge|rebase-ff|squash)"
                    exit 1
                fi
                STRATEGY="$2"
                shift 2
                ;;
            --review-branch)
                if [[ $# -lt 2 ]]; then
                    log_fail "--review-branch requires a value"
                    exit 1
                fi
                REVIEW_BRANCH="$2"
                shift 2
                ;;
            --squash-message)
                if [[ $# -lt 2 ]]; then
                    log_fail "--squash-message requires a value"
                    exit 1
                fi
                SQUASH_MESSAGE="$2"
                shift 2
                ;;
            --worktree-base)
                if [[ $# -lt 2 ]]; then
                    log_fail "--worktree-base requires a value"
                    exit 1
                fi
                WORKTREE_BASE="$2"
                shift 2
                ;;
            -*)
                log_fail "Unknown option: $1"
                echo ""
                usage >&2
                exit 1
                ;;
            *)
                log_fail "Unexpected positional argument: $1"
                echo ""
                usage >&2
                exit 1
                ;;
        esac
    done

    # Required argument validation
    if [[ -z "$TASK_ID" ]]; then
        log_fail "Missing required argument: --task-id"
        exit 1
    fi
    if [[ -z "$COMPONENT" ]]; then
        log_fail "Missing required argument: --component"
        exit 1
    fi
    if [[ -z "$STRATEGY" ]]; then
        log_fail "Missing required argument: --strategy"
        exit 1
    fi

    # Strategy enum validation
    case "$STRATEGY" in
        merge|rebase-ff|squash) ;;
        *)
            log_fail "Invalid --strategy: '$STRATEGY' (must be merge|rebase-ff|squash)"
            exit 1
            ;;
    esac

    # Defaults
    if [[ -z "$REVIEW_BRANCH" ]]; then
        REVIEW_BRANCH="feature/${TASK_ID}-review"
    fi
    if [[ -z "$WORKTREE_BASE" ]]; then
        WORKTREE_BASE="${WORKTREE_BASE_PATH:-.claude/worktrees}"
    fi
}

# --- AI remediation guides (stderr blocks for exit 3 / 4) ---

output_conflict_remediation() {
    local integration_worktree="$1"
    local component_branch="$2"
    local review_branch="$3"

    cat >&2 << EOF

=== AI REMEDIATION GUIDE ===
ERROR_CODE: 3
ERROR_TYPE: MERGE_CONFLICT
TASK_ID: ${TASK_ID}
COMPONENT: ${COMPONENT}
STRATEGY: ${STRATEGY}
INTEGRATION_WORKTREE: ${integration_worktree}
COMPONENT_BRANCH: ${component_branch}
REVIEW_BRANCH: ${review_branch}

STATE: Integration worktree has been RETAINED for inspection. Conflict markers
       are present in the integration worktree's working tree. Root is
       untouched.

REMEDIATION_STEPS:
1. INSPECT_CONFLICTS:
   git -C ${integration_worktree} status
   git -C ${integration_worktree} diff --name-only --diff-filter=U

2. RESOLVE_MANUALLY (interactive - requires human/orchestrator decision):
   # Edit conflicted files in ${integration_worktree}
   git -C ${integration_worktree} add <resolved-files>
   git -C ${integration_worktree} commit            # if --strategy=merge
   # OR
   git -C ${integration_worktree} rebase --continue  # if rebase mid-flight

3. ABORT_AND_CLEAN_UP (discard the merge attempt):
   git -C ${integration_worktree} merge --abort 2>/dev/null || \\
     git -C ${integration_worktree} rebase --abort 2>/dev/null || true
   cd "\$(git rev-parse --show-toplevel)" && \\
     git worktree remove --force ${integration_worktree} && \\
     git branch -D \$(basename ${integration_worktree})

4. RETRY_WITH_DIFFERENT_STRATEGY:
   # If --strategy=rebase-ff produced conflicts, --strategy=merge may succeed.
   $(basename "$0") --task-id ${TASK_ID} --component ${COMPONENT} --strategy merge
=== END AI REMEDIATION GUIDE ===
EOF
}

output_post_cleanup_dirty_remediation() {
    local root="$1"
    local post_status="$2"

    cat >&2 << EOF

=== AI REMEDIATION GUIDE ===
ERROR_CODE: 4
ERROR_TYPE: POST_CLEANUP_ROOT_DIRTY
TASK_ID: ${TASK_ID}
COMPONENT: ${COMPONENT}
ROOT: ${root}

STATE: Root working tree is dirty after merge cleanup. This violates the
       ADR-0019 post-cleanup cleanliness invariant - the integration sequence
       should not have touched root's working tree.

ROOT_STATUS:
${post_status}

REMEDIATION_STEPS:
1. INSPECT_ROOT:
   git -C ${root} status
   git -C ${root} diff

2. INVESTIGATE_CAUSE (most likely candidates):
   - A pre-existing dirty file was missed by the precondition check
   - The integration worktree shared inode-level state with root (rare)
   - A concurrent process modified files in root during the merge

3. STOP_AND_REPORT (Protocol #11):
   Do NOT self-remediate. Return status:error to the orchestrator with the
   ROOT_STATUS block above. The orchestrator decides how to recover.
=== END AI REMEDIATION GUIDE ===
EOF
}

# --- Pre-merge checks ---

check_root_clean() {
    local root_status
    root_status=$(git -C "$ROOT" status --porcelain)
    if [[ -n "$root_status" ]]; then
        log_fail "Root has uncommitted changes - aborting merge to prevent index pollution"
        echo "" >&2
        echo "Root status:" >&2
        echo "$root_status" >&2
        exit 2
    fi
}

# --- Integration worktree lifecycle ---

setup_integration_worktree() {
    log_step "Creating integration branch: $INTEGRATION_BRANCH from $REVIEW_BRANCH"
    git -C "$ROOT" branch -- "$INTEGRATION_BRANCH" "$REVIEW_BRANCH"
    OPS_EXECUTED+=("git branch $INTEGRATION_BRANCH $REVIEW_BRANCH")

    log_step "Creating integration worktree: $INTEGRATION_WORKTREE"
    git -C "$ROOT" worktree add -- "$INTEGRATION_WORKTREE" "$INTEGRATION_BRANCH"
    OPS_EXECUTED+=("git worktree add $INTEGRATION_WORKTREE $INTEGRATION_BRANCH")

    INTEGRATION_WORKTREE_ABS=$(cd "$ROOT/$INTEGRATION_WORKTREE" && pwd)
}

cleanup_integration_worktree() {
    log_step "Removing integration worktree: $INTEGRATION_WORKTREE"
    git -C "$ROOT" worktree remove -- "$INTEGRATION_WORKTREE"
    OPS_EXECUTED+=("git worktree remove $INTEGRATION_WORKTREE")

    log_step "Deleting integration branch: $INTEGRATION_BRANCH"
    # Use -D (force delete). The branch's tip commit IS preserved (we either
    # ff-merged from root or did `branch -f` to point the review branch at the
    # same commit), but `git branch -d` checks ancestry against HEAD's branch
    # (which may be on develop or any other branch in root), not against the
    # review branch. -D is safe here because the commit is reachable from the
    # review branch we just advanced.
    git -C "$ROOT" branch -D -- "$INTEGRATION_BRANCH"
    OPS_EXECUTED+=("git branch -D $INTEGRATION_BRANCH")
}

# Detect a merge/rebase conflict by checking for conflict markers in the
# integration worktree. This runs after a `git merge` / `git rebase` call
# returned non-zero. Returns 0 if conflicts present, 1 if not.
has_merge_conflict() {
    # MERGE_HEAD, REBASE_HEAD, or rebase-merge directory indicate in-progress merge state
    local git_dir
    git_dir=$(git -C "$INTEGRATION_WORKTREE_ABS" rev-parse --git-dir 2>/dev/null) || return 1
    if [[ -f "$git_dir/MERGE_HEAD" ]]; then
        return 0
    fi
    if [[ -d "$git_dir/rebase-merge" ]] || [[ -d "$git_dir/rebase-apply" ]]; then
        return 0
    fi
    # Check porcelain for unmerged paths
    if git -C "$INTEGRATION_WORKTREE_ABS" status --porcelain 2>/dev/null \
        | grep -qE '^(UU|AA|DD|AU|UA|DU|UD) '; then
        return 0
    fi
    return 1
}

handle_conflict_and_exit() {
    log_fail "Merge conflict detected in integration worktree"
    log_warn "Integration worktree RETAINED for inspection: $INTEGRATION_WORKTREE_ABS"
    output_conflict_remediation \
        "$INTEGRATION_WORKTREE_ABS" \
        "$COMPONENT_BRANCH" \
        "$REVIEW_BRANCH"
    exit 3
}

# --- Strategy executors ---

execute_merge_strategy() {
    log_step "Executing strategy: merge (--no-ff)"
    OPS_EXECUTED+=("git -C $INTEGRATION_WORKTREE merge --no-ff $COMPONENT_BRANCH")
    if ! git -C "$INTEGRATION_WORKTREE_ABS" merge --no-ff "$COMPONENT_BRANCH"; then
        if has_merge_conflict; then
            handle_conflict_and_exit
        fi
        log_fail "git merge --no-ff failed (no conflict markers found)"
        exit 1
    fi
}

execute_rebase_ff_strategy() {
    log_step "Executing strategy: rebase-ff"
    OPS_EXECUTED+=("git -C $INTEGRATION_WORKTREE rebase $REVIEW_BRANCH $COMPONENT_BRANCH")
    if ! git -C "$INTEGRATION_WORKTREE_ABS" rebase "$REVIEW_BRANCH" "$COMPONENT_BRANCH"; then
        if has_merge_conflict; then
            handle_conflict_and_exit
        fi
        log_fail "git rebase failed (no conflict markers found)"
        exit 1
    fi
    OPS_EXECUTED+=("git -C $INTEGRATION_WORKTREE merge --ff-only $COMPONENT_BRANCH")
    if ! git -C "$INTEGRATION_WORKTREE_ABS" merge --ff-only "$COMPONENT_BRANCH"; then
        log_fail "git merge --ff-only failed after rebase"
        exit 1
    fi
}

execute_squash_strategy() {
    log_step "Executing strategy: squash"

    # Determine commit count BEFORE any rebase, so HEAD~N collapses correctly.
    local commit_count
    commit_count=$(git -C "$INTEGRATION_WORKTREE_ABS" rev-list --count "$REVIEW_BRANCH..$COMPONENT_BRANCH" 2>/dev/null || echo "0")
    if [[ "$commit_count" -eq 0 ]]; then
        log_fail "No commits to squash between $REVIEW_BRANCH and $COMPONENT_BRANCH"
        exit 2
    fi

    OPS_EXECUTED+=("git -C $INTEGRATION_WORKTREE rebase $REVIEW_BRANCH $COMPONENT_BRANCH")
    if ! git -C "$INTEGRATION_WORKTREE_ABS" rebase "$REVIEW_BRANCH" "$COMPONENT_BRANCH"; then
        if has_merge_conflict; then
            handle_conflict_and_exit
        fi
        log_fail "git rebase failed during squash (no conflict markers found)"
        exit 1
    fi

    OPS_EXECUTED+=("git -C $INTEGRATION_WORKTREE reset --soft HEAD~${commit_count}")
    if ! git -C "$INTEGRATION_WORKTREE_ABS" reset --soft "HEAD~${commit_count}"; then
        log_fail "git reset --soft HEAD~${commit_count} failed"
        exit 1
    fi

    # The husky pre-commit hook (if installed) will validate the message.
    OPS_EXECUTED+=("git -C $INTEGRATION_WORKTREE commit -m <squash-message>")
    if ! git -C "$INTEGRATION_WORKTREE_ABS" commit -m "$SQUASH_MESSAGE"; then
        log_fail "git commit -m <squash-message> failed (commitlint or hook rejection?)"
        exit 1
    fi

    OPS_EXECUTED+=("git -C $INTEGRATION_WORKTREE merge --ff-only $COMPONENT_BRANCH")
    # After reset+commit, the integration branch now holds the squashed commit;
    # we still need to advance HEAD to this commit. The original branch-manager
    # block emits `merge --ff-only $COMPONENT_BRANCH` here; in the squash case
    # this is a no-op fast-forward (the branch already points where we are),
    # but we keep it for parity with the documented sequence.
    if ! git -C "$INTEGRATION_WORKTREE_ABS" merge --ff-only "$COMPONENT_BRANCH" 2>/dev/null; then
        # Squashed commit is not an ancestor of the component branch tip - that's
        # expected and benign in the squash flow. The integration branch points
        # at the squashed commit, which is what we want.
        true
    fi
}

# --- Ref advance (ADR-0019 conditional) ---
#
# The integration worktree's HEAD is the source of truth for what we want
# review to point at. For --strategy=merge, HEAD == INTEGRATION_BRANCH
# (the merge commit advanced both). For --strategy=rebase-ff/squash, HEAD
# may diverge from INTEGRATION_BRANCH because `git rebase upstream branch`
# checks out `branch` and operates on it, leaving the original integration
# branch ref unchanged. In both cases, the integration worktree's HEAD is
# the integration commit we want to promote.
#
# We must first re-anchor INTEGRATION_BRANCH to that HEAD so that:
#   1. The ff-only-from-root path (root on review branch) can fast-forward
#      to a known ref.
#   2. The branch-f path advances review to the integration commit, not
#      to a stale ref that points at the old review tip.

advance_review_branch() {
    local integration_commit="$1"

    # Re-anchor INTEGRATION_BRANCH to the integration worktree's HEAD.
    # `git update-ref` works regardless of whether the branch is checked out
    # in the integration worktree (which it still is at this point).
    log_step "Re-anchoring $INTEGRATION_BRANCH to integration commit $integration_commit"
    OPS_EXECUTED+=("git -C $ROOT update-ref refs/heads/$INTEGRATION_BRANCH $integration_commit")
    if ! git -C "$ROOT" update-ref "refs/heads/$INTEGRATION_BRANCH" "$integration_commit"; then
        log_fail "Failed to re-anchor integration branch to integration commit"
        exit 1
    fi

    if [[ "$ROOT_BRANCH" == "$REVIEW_BRANCH" ]]; then
        log_step "Root is on review branch - using ff-only merge from root to advance HEAD/index/working tree atomically"
        OPS_EXECUTED+=("git -C $ROOT merge --ff-only $INTEGRATION_BRANCH")
        if ! git -C "$ROOT" merge --ff-only -- "$INTEGRATION_BRANCH"; then
            log_fail "Failed to advance review branch via ff-only merge from root"
            exit 1
        fi
    else
        log_step "Root is on a different branch - advancing review branch ref via git branch -f"
        OPS_EXECUTED+=("git -C $ROOT branch -f $REVIEW_BRANCH $INTEGRATION_BRANCH")
        if ! git -C "$ROOT" branch -f -- "$REVIEW_BRANCH" "$INTEGRATION_BRANCH"; then
            log_fail "Failed to advance review branch ref"
            exit 1
        fi
    fi
}

# --- Post-cleanup assertion (ADR-0019) ---

assert_root_clean_post_cleanup() {
    local post_status
    post_status=$(git -C "$ROOT" status --porcelain)
    if [[ -n "$post_status" ]]; then
        log_fail "Root is dirty after merge cleanup (ADR-0019 violation)"
        output_post_cleanup_dirty_remediation "$ROOT" "$post_status"
        exit 4
    fi
}

# --- JSON summary line ---

emit_json_summary() {
    local exit_status="$1"
    local integration_worktree_field="$INTEGRATION_WORKTREE_ABS"

    # Build JSON ops_executed array
    local ops_json="["
    local first=true
    local op
    for op in "${OPS_EXECUTED[@]}"; do
        # Escape backslashes and double-quotes for JSON
        local escaped="${op//\\/\\\\}"
        escaped="${escaped//\"/\\\"}"
        if $first; then
            ops_json+="\"$escaped\""
            first=false
        else
            ops_json+=",\"$escaped\""
        fi
    done
    ops_json+="]"

    printf '{"task_id":"%s","component":"%s","strategy":"%s","review_branch":"%s","integration_worktree":"%s","exit_status":%s,"ops_executed":%s}\n' \
        "$TASK_ID" \
        "$COMPONENT" \
        "$STRATEGY" \
        "$REVIEW_BRANCH" \
        "$integration_worktree_field" \
        "$exit_status" \
        "$ops_json"
}

# --- Main ---

main() {
    parse_args "$@"

    # Resolve root and derived paths
    if ! ROOT=$(git rev-parse --show-toplevel 2>/dev/null); then
        log_fail "Not in a git repository"
        exit 1
    fi

    COMPONENT_BRANCH="feature/${TASK_ID}-${COMPONENT}"
    INTEGRATION_BRANCH="${TASK_ID}-${COMPONENT}-integration-temp"
    INTEGRATION_WORKTREE="${WORKTREE_BASE}/${TASK_ID}-${COMPONENT}-integration"

    # Pre-merge sanity: review branch and component branch must exist
    if ! git -C "$ROOT" show-ref --verify --quiet "refs/heads/$REVIEW_BRANCH"; then
        log_fail "Review branch does not exist: $REVIEW_BRANCH"
        exit 2
    fi
    if ! git -C "$ROOT" show-ref --verify --quiet "refs/heads/$COMPONENT_BRANCH"; then
        log_fail "Component branch does not exist: $COMPONENT_BRANCH"
        exit 2
    fi

    # Squash requires --squash-message
    if [[ "$STRATEGY" == "squash" && -z "$SQUASH_MESSAGE" ]]; then
        log_fail "--strategy=squash requires --squash-message"
        exit 2
    fi

    # Capture root branch (informational; affects ADR-0019 ref-advance path)
    ROOT_BRANCH=$(git -C "$ROOT" branch --show-current)
    log_step "Root branch: $ROOT_BRANCH"
    log_step "Review branch: $REVIEW_BRANCH"
    log_step "Component branch: $COMPONENT_BRANCH"
    log_step "Integration worktree: $INTEGRATION_WORKTREE"
    log_step "Strategy: $STRATEGY"

    # ADR-0014 Step 0: pre-merge precondition check on root
    check_root_clean

    # Informational note (matches branch-manager.ejs source)
    if [[ "$ROOT_BRANCH" == "$REVIEW_BRANCH" ]]; then
        log_step "INFO: root is checked out to the review branch - will use --ff-only from root after merge"
    fi

    # ADR-0014: create isolated integration worktree
    setup_integration_worktree

    # Execute caller-selected strategy
    case "$STRATEGY" in
        merge)
            execute_merge_strategy
            ;;
        rebase-ff)
            execute_rebase_ff_strategy
            ;;
        squash)
            execute_squash_strategy
            ;;
    esac

    # Capture the integration commit (post-strategy HEAD)
    local integration_commit
    integration_commit=$(git -C "$INTEGRATION_WORKTREE_ABS" rev-parse HEAD)
    log_ok "Integration commit: $integration_commit"

    # ADR-0019: advance review branch (conditional path)
    advance_review_branch "$integration_commit"

    # Cleanup integration worktree + temp branch
    cleanup_integration_worktree

    # ADR-0019: post-cleanup root cleanliness assertion
    assert_root_clean_post_cleanup

    # Success summary
    echo ""
    render_card_header "INTEGRATION MERGE"
    echo "  Task        $TASK_ID"
    echo "  Component   $COMPONENT"
    echo "  Strategy    $STRATEGY"
    echo "  Review      $REVIEW_BRANCH"
    echo "  Status      complete"
    echo ""
    render_gauge LANDED
    render_card_footer
    echo ""

    emit_json_summary 0
    exit 0
}

main "$@"
