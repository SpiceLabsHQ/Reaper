#!/bin/bash
# integration-merge.test.sh - Tests for integration-merge.sh
#
# Verifies the ADR-0014/0019/0020 integration-worktree merge sequence:
#   - All three strategies (merge, rebase-ff, squash) happy paths
#   - Usage error: missing required arg -> exit 1
#   - Precondition fail: root dirty -> exit 2
#   - Precondition fail: squash without --squash-message -> exit 2
#   - Merge conflict path: simulated conflict -> exit 3, integration worktree retained
#   - ADR-0019 conditional ref-advance: root-on-review-branch ff-only variant
#   - ADR-0019 post-cleanup assertion: simulated dirty root after cleanup -> exit 4
#   - Usage / --help text rendering
#
# Usage: bash integration-merge.test.sh

set -euo pipefail

# --- Test infrastructure ---

TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
FAILURES=""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INTEGRATION_MERGE_SCRIPT="$SCRIPT_DIR/integration-merge.sh"

TEST_TMP=""
ORIG_PWD=""

setup() {
    TEST_TMP=$(mktemp -d)
    ORIG_PWD=$(pwd)

    # Build a fake target repo with develop, a review branch, and a component branch
    local repo="$TEST_TMP/project"
    mkdir -p "$repo"
    git -C "$repo" init --quiet --initial-branch=develop 2>/dev/null || {
        git -C "$repo" init --quiet
        git -C "$repo" checkout -b develop --quiet 2>/dev/null || true
    }
    git -C "$repo" config user.email "test@example.com"
    git -C "$repo" config user.name "Test User"
    git -C "$repo" config commit.gpgsign false

    # Initial commit on develop
    echo "base" > "$repo/base.txt"
    git -C "$repo" add base.txt
    git -C "$repo" commit -m "init" --quiet

    # Create review branch from develop
    git -C "$repo" branch feature/TEST-1-review

    # Create component branch from review with one commit
    git -C "$repo" checkout -b feature/TEST-1-comp --quiet
    echo "comp-change-1" > "$repo/comp1.txt"
    git -C "$repo" add comp1.txt
    git -C "$repo" commit -m "feat: comp change 1" --quiet

    # Add a second commit so squash has multiple commits to collapse
    echo "comp-change-2" > "$repo/comp2.txt"
    git -C "$repo" add comp2.txt
    git -C "$repo" commit -m "feat: comp change 2" --quiet

    # Return to develop so root is on a non-review branch by default
    git -C "$repo" checkout develop --quiet
}

teardown() {
    cd "$ORIG_PWD" 2>/dev/null || cd /tmp
    if [[ -n "$TEST_TMP" && -d "$TEST_TMP" ]]; then
        rm -rf "$TEST_TMP"
    fi
}

assert_equals() {
    local expected="$1"
    local actual="$2"
    local msg="${3:-"Expected '$expected' but got '$actual'"}"
    if [[ "$expected" != "$actual" ]]; then
        echo "  FAIL: $msg"
        return 1
    fi
    return 0
}

assert_contains() {
    local haystack="$1"
    local needle="$2"
    local msg="${3:-"Expected output to contain '$needle'"}"
    if [[ "$haystack" != *"$needle"* ]]; then
        echo "  FAIL: $msg"
        echo "  Output was: $haystack"
        return 1
    fi
    return 0
}

assert_not_contains() {
    local haystack="$1"
    local needle="$2"
    local msg="${3:-"Expected output NOT to contain '$needle'"}"
    if [[ "$haystack" == *"$needle"* ]]; then
        echo "  FAIL: $msg"
        echo "  Output was: $haystack"
        return 1
    fi
    return 0
}

assert_exit_code() {
    local expected="$1"
    local actual="$2"
    local msg="${3:-"Expected exit code $expected but got $actual"}"
    if [[ "$expected" != "$actual" ]]; then
        echo "  FAIL: $msg"
        return 1
    fi
    return 0
}

run_test() {
    local test_name="$1"
    local test_func="$2"
    TESTS_RUN=$((TESTS_RUN + 1))
    echo -n "  $test_name ... "

    setup

    local result=0
    local output
    output=$($test_func 2>&1) || result=$?

    teardown

    if [[ $result -eq 0 ]]; then
        echo "PASS"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo "FAIL"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        FAILURES="$FAILURES\n  FAILED: $test_name\n$output\n"
    fi
}

# Helper: run integration-merge.sh from inside the test repo, capturing
# stdout, stderr, and exit code separately.
run_merge() {
    local repo="$1"
    shift

    local stdout_file="$TEST_TMP/stdout.$$"
    local stderr_file="$TEST_TMP/stderr.$$"
    local exit_code=0

    (cd "$repo" && bash "$INTEGRATION_MERGE_SCRIPT" "$@") \
        >"$stdout_file" 2>"$stderr_file" || exit_code=$?

    # Emit in a parseable form: EXIT=N, STDOUT=..., STDERR=...
    echo "EXIT_CODE=$exit_code"
    echo "---STDOUT---"
    cat "$stdout_file"
    echo "---STDERR---"
    cat "$stderr_file"
    echo "---END---"

    rm -f "$stdout_file" "$stderr_file"
}

# Helper: extract a section from run_merge output
extract_section() {
    local output="$1"
    local section="$2"
    # Use awk to print lines between section markers
    echo "$output" | awk -v sec="---${section}---" '
        $0 == sec { in_section=1; next }
        /^---/    { in_section=0 }
        in_section { print }
    '
}

extract_exit_code() {
    local output="$1"
    echo "$output" | grep '^EXIT_CODE=' | head -1 | cut -d= -f2
}


# ==========================================================================
# Test Suite: Usage / --help / argument parsing
# ==========================================================================

test_help_renders_usage() {
    local output exit_code=0
    output=$(bash "$INTEGRATION_MERGE_SCRIPT" --help 2>&1) || exit_code=$?
    assert_exit_code "0" "$exit_code" "--help should exit 0" || return 1
    assert_contains "$output" "Usage:" "--help should print Usage:" || return 1
    assert_contains "$output" "--task-id" "--help should document --task-id" || return 1
    assert_contains "$output" "--component" "--help should document --component" || return 1
    assert_contains "$output" "--strategy" "--help should document --strategy" || return 1
    assert_contains "$output" "merge|rebase-ff|squash" "--help should list strategies" || return 1
    assert_contains "$output" "Exit codes:" "--help should document exit codes" || return 1
}

test_no_args_exits_with_usage_error() {
    local output exit_code=0
    output=$(bash "$INTEGRATION_MERGE_SCRIPT" 2>&1) || exit_code=$?
    assert_exit_code "1" "$exit_code" "no args should exit 1" || return 1
    assert_contains "$output" "Missing required arguments" \
        "no args should produce 'Missing required arguments'" || return 1
}

test_missing_task_id_exits_1() {
    local output exit_code=0
    output=$(bash "$INTEGRATION_MERGE_SCRIPT" --component foo --strategy merge 2>&1) || exit_code=$?
    assert_exit_code "1" "$exit_code" "missing --task-id should exit 1" || return 1
    assert_contains "$output" "--task-id" \
        "error should mention --task-id" || return 1
}

test_missing_component_exits_1() {
    local output exit_code=0
    output=$(bash "$INTEGRATION_MERGE_SCRIPT" --task-id TEST-1 --strategy merge 2>&1) || exit_code=$?
    assert_exit_code "1" "$exit_code" "missing --component should exit 1" || return 1
    assert_contains "$output" "--component" \
        "error should mention --component" || return 1
}

test_missing_strategy_exits_1() {
    local output exit_code=0
    output=$(bash "$INTEGRATION_MERGE_SCRIPT" --task-id TEST-1 --component foo 2>&1) || exit_code=$?
    assert_exit_code "1" "$exit_code" "missing --strategy should exit 1" || return 1
    assert_contains "$output" "--strategy" \
        "error should mention --strategy" || return 1
}

test_invalid_strategy_exits_1() {
    local output exit_code=0
    output=$(bash "$INTEGRATION_MERGE_SCRIPT" --task-id TEST-1 --component foo --strategy bogus 2>&1) || exit_code=$?
    assert_exit_code "1" "$exit_code" "invalid --strategy should exit 1" || return 1
    assert_contains "$output" "Invalid --strategy" \
        "error should mention 'Invalid --strategy'" || return 1
}

test_unknown_option_exits_1() {
    local output exit_code=0
    output=$(bash "$INTEGRATION_MERGE_SCRIPT" --task-id TEST-1 --component foo --strategy merge --bogus-flag 2>&1) || exit_code=$?
    assert_exit_code "1" "$exit_code" "unknown option should exit 1" || return 1
    assert_contains "$output" "Unknown option" \
        "error should mention 'Unknown option'" || return 1
}


# ==========================================================================
# Test Suite: Strategy happy paths
# ==========================================================================

test_strategy_merge_happy_path() {
    local repo="$TEST_TMP/project"
    local output
    output=$(run_merge "$repo" --task-id TEST-1 --component comp --strategy merge)

    local exit_code
    exit_code=$(extract_exit_code "$output")
    assert_exit_code "0" "$exit_code" "merge happy path should exit 0" || return 1

    # Review branch should now contain the component changes
    if ! git -C "$repo" merge-base --is-ancestor feature/TEST-1-comp feature/TEST-1-review; then
        echo "  FAIL: feature/TEST-1-comp is not reachable from feature/TEST-1-review after merge"
        return 1
    fi

    # Should have a merge commit (--no-ff)
    local last_commit_subject
    last_commit_subject=$(git -C "$repo" log -1 --pretty=%s feature/TEST-1-review)
    if [[ "$last_commit_subject" != Merge* ]]; then
        echo "  FAIL: expected a merge commit on review branch, got: $last_commit_subject"
        return 1
    fi

    # JSON summary line on stdout
    local stdout
    stdout=$(extract_section "$output" "STDOUT")
    assert_contains "$stdout" '"strategy":"merge"' "stdout JSON should record strategy" || return 1
    assert_contains "$stdout" '"exit_status":0' "stdout JSON should record exit_status:0" || return 1
    assert_contains "$stdout" '"task_id":"TEST-1"' "stdout JSON should record task_id" || return 1

    # Integration worktree must be cleaned up
    if [[ -d "$repo/.claude/worktrees/TEST-1-comp-integration" ]]; then
        echo "  FAIL: integration worktree was not cleaned up"
        return 1
    fi

    # Integration branch must be deleted
    if git -C "$repo" show-ref --verify --quiet "refs/heads/TEST-1-comp-integration-temp"; then
        echo "  FAIL: integration temp branch was not deleted"
        return 1
    fi
}

test_strategy_rebase_ff_happy_path() {
    local repo="$TEST_TMP/project"
    local output
    output=$(run_merge "$repo" --task-id TEST-1 --component comp --strategy rebase-ff)

    local exit_code
    exit_code=$(extract_exit_code "$output")
    assert_exit_code "0" "$exit_code" "rebase-ff happy path should exit 0" || return 1

    # History should be linear (no merge commit)
    local last_commit_subject
    last_commit_subject=$(git -C "$repo" log -1 --pretty=%s feature/TEST-1-review)
    if [[ "$last_commit_subject" == Merge* ]]; then
        echo "  FAIL: rebase-ff should NOT produce a merge commit, got: $last_commit_subject"
        return 1
    fi

    # The component changes should be on review branch
    if ! git -C "$repo" cat-file -e "feature/TEST-1-review:comp1.txt" 2>/dev/null; then
        echo "  FAIL: comp1.txt missing on review branch after rebase-ff"
        return 1
    fi
    if ! git -C "$repo" cat-file -e "feature/TEST-1-review:comp2.txt" 2>/dev/null; then
        echo "  FAIL: comp2.txt missing on review branch after rebase-ff"
        return 1
    fi

    local stdout
    stdout=$(extract_section "$output" "STDOUT")
    assert_contains "$stdout" '"strategy":"rebase-ff"' \
        "stdout JSON should record strategy:rebase-ff" || return 1
}

test_strategy_squash_happy_path() {
    local repo="$TEST_TMP/project"
    local output
    output=$(run_merge "$repo" \
        --task-id TEST-1 --component comp --strategy squash \
        --squash-message "feat(comp): squashed work

Squashes 2 commits across the comp component.

Ref: TEST-1")

    local exit_code
    exit_code=$(extract_exit_code "$output")
    assert_exit_code "0" "$exit_code" "squash happy path should exit 0" || return 1

    # Review branch should advance by exactly one commit (the squash commit)
    local commits_added
    commits_added=$(git -C "$repo" rev-list --count develop..feature/TEST-1-review)
    if [[ "$commits_added" != "1" ]]; then
        echo "  FAIL: squash should produce exactly 1 commit on review branch, got: $commits_added"
        git -C "$repo" log --oneline develop..feature/TEST-1-review
        return 1
    fi

    # Both files should be present
    if ! git -C "$repo" cat-file -e "feature/TEST-1-review:comp1.txt" 2>/dev/null; then
        echo "  FAIL: comp1.txt missing on review branch after squash"
        return 1
    fi
    if ! git -C "$repo" cat-file -e "feature/TEST-1-review:comp2.txt" 2>/dev/null; then
        echo "  FAIL: comp2.txt missing on review branch after squash"
        return 1
    fi

    # Commit message should be the squash message
    local subject
    subject=$(git -C "$repo" log -1 --pretty=%s feature/TEST-1-review)
    assert_equals "feat(comp): squashed work" "$subject" \
        "review branch tip should carry the squash subject" || return 1

    local stdout
    stdout=$(extract_section "$output" "STDOUT")
    assert_contains "$stdout" '"strategy":"squash"' \
        "stdout JSON should record strategy:squash" || return 1
}


# ==========================================================================
# Test Suite: Precondition failures
# ==========================================================================

test_precondition_root_dirty_exits_2() {
    local repo="$TEST_TMP/project"
    # Dirty the root working tree
    echo "dirty" >> "$repo/base.txt"

    local output
    output=$(run_merge "$repo" --task-id TEST-1 --component comp --strategy merge)
    local exit_code
    exit_code=$(extract_exit_code "$output")

    assert_exit_code "2" "$exit_code" "root dirty should exit 2" || return 1

    local stderr
    stderr=$(extract_section "$output" "STDERR")
    assert_contains "$stderr" "uncommitted changes" \
        "stderr should mention uncommitted changes" || return 1
}

test_precondition_squash_without_message_exits_2() {
    local repo="$TEST_TMP/project"
    local output
    output=$(run_merge "$repo" --task-id TEST-1 --component comp --strategy squash)
    local exit_code
    exit_code=$(extract_exit_code "$output")

    assert_exit_code "2" "$exit_code" \
        "squash without --squash-message should exit 2" || return 1

    local stderr
    stderr=$(extract_section "$output" "STDERR")
    assert_contains "$stderr" "--squash-message" \
        "stderr should mention --squash-message requirement" || return 1
}

test_precondition_missing_review_branch_exits_2() {
    local repo="$TEST_TMP/project"
    git -C "$repo" branch -D feature/TEST-1-review

    local output
    output=$(run_merge "$repo" --task-id TEST-1 --component comp --strategy merge)
    local exit_code
    exit_code=$(extract_exit_code "$output")

    assert_exit_code "2" "$exit_code" \
        "missing review branch should exit 2" || return 1

    local stderr
    stderr=$(extract_section "$output" "STDERR")
    assert_contains "$stderr" "Review branch does not exist" \
        "stderr should mention missing review branch" || return 1
}

test_precondition_missing_component_branch_exits_2() {
    local repo="$TEST_TMP/project"
    git -C "$repo" branch -D feature/TEST-1-comp

    local output
    output=$(run_merge "$repo" --task-id TEST-1 --component comp --strategy merge)
    local exit_code
    exit_code=$(extract_exit_code "$output")

    assert_exit_code "2" "$exit_code" \
        "missing component branch should exit 2" || return 1

    local stderr
    stderr=$(extract_section "$output" "STDERR")
    assert_contains "$stderr" "Component branch does not exist" \
        "stderr should mention missing component branch" || return 1
}


# ==========================================================================
# Test Suite: Merge conflict path (exit 3, integration worktree retained)
# ==========================================================================

test_conflict_exits_3_and_retains_worktree() {
    local repo="$TEST_TMP/project"

    # Create a conflicting change on the review branch:
    # The component branch added comp1.txt with content "comp-change-1".
    # We add comp1.txt on the review branch with DIFFERENT content so that a
    # rebase produces a conflict.
    git -C "$repo" checkout feature/TEST-1-review --quiet
    echo "review-side-change" > "$repo/comp1.txt"
    git -C "$repo" add comp1.txt
    git -C "$repo" commit -m "feat: review side change to comp1" --quiet
    git -C "$repo" checkout develop --quiet

    local output
    output=$(run_merge "$repo" --task-id TEST-1 --component comp --strategy rebase-ff)
    local exit_code
    exit_code=$(extract_exit_code "$output")

    assert_exit_code "3" "$exit_code" "conflict should exit 3" || return 1

    local stderr
    stderr=$(extract_section "$output" "STDERR")
    assert_contains "$stderr" "=== AI REMEDIATION GUIDE ===" \
        "stderr should contain AI REMEDIATION GUIDE block" || return 1
    assert_contains "$stderr" "ERROR_CODE: 3" \
        "stderr should contain ERROR_CODE: 3" || return 1
    assert_contains "$stderr" "MERGE_CONFLICT" \
        "stderr should contain MERGE_CONFLICT type" || return 1
    assert_contains "$stderr" "RETAINED" \
        "stderr should mention RETAINED worktree" || return 1

    # Integration worktree must still exist
    if [[ ! -d "$repo/.claude/worktrees/TEST-1-comp-integration" ]]; then
        echo "  FAIL: integration worktree was cleaned up despite conflict (must be retained)"
        return 1
    fi
}


# ==========================================================================
# Test Suite: ADR-0019 root-on-review-branch ff-only variant
# ==========================================================================

test_root_on_review_branch_uses_ff_only_from_root() {
    local repo="$TEST_TMP/project"
    # Check root out to the review branch
    git -C "$repo" checkout feature/TEST-1-review --quiet

    local output
    output=$(run_merge "$repo" --task-id TEST-1 --component comp --strategy rebase-ff)
    local exit_code
    exit_code=$(extract_exit_code "$output")

    assert_exit_code "0" "$exit_code" \
        "root-on-review-branch happy path should exit 0" || return 1

    # ops_executed should mention `merge --ff-only` from root, not `branch -f`
    local stdout
    stdout=$(extract_section "$output" "STDOUT")
    assert_contains "$stdout" "merge --ff-only TEST-1-comp-integration-temp" \
        "should use ff-only merge from root when root is on review branch" || return 1
    assert_not_contains "$stdout" "branch -f feature/TEST-1-review" \
        "should NOT use branch -f when root is on review branch" || return 1

    # Root must still be on the review branch and clean
    local current_branch
    current_branch=$(git -C "$repo" branch --show-current)
    assert_equals "feature/TEST-1-review" "$current_branch" \
        "root should remain on review branch after ff-only" || return 1

    local root_status
    root_status=$(git -C "$repo" status --porcelain)
    if [[ -n "$root_status" ]]; then
        echo "  FAIL: root is dirty after merge (status: $root_status)"
        return 1
    fi
}

test_root_on_other_branch_uses_branch_force() {
    local repo="$TEST_TMP/project"
    # Root is on develop (default from setup)
    local output
    output=$(run_merge "$repo" --task-id TEST-1 --component comp --strategy merge)
    local exit_code
    exit_code=$(extract_exit_code "$output")

    assert_exit_code "0" "$exit_code" \
        "root-on-other-branch happy path should exit 0" || return 1

    local stdout
    stdout=$(extract_section "$output" "STDOUT")
    assert_contains "$stdout" "branch -f feature/TEST-1-review" \
        "should use branch -f when root is on a different branch" || return 1
}


# ==========================================================================
# Test Suite: ADR-0019 post-cleanup root-dirty assertion (exit 4)
# ==========================================================================

# To exercise exit 4 we need the post-cleanup assertion to fail. The most
# reliable simulation is to set up a hook on the integration worktree that
# dirties root *after* cleanup. But cleanup happens via the script itself, so
# we instead inject dirt into root at a moment that survives until the
# assertion runs. We use a post-checkout hook (in the integration worktree's
# git dir) that creates an untracked file in root. This file remains after
# integration worktree removal, triggering the ADR-0019 assertion.
test_post_cleanup_dirty_root_exits_4() {
    local repo="$TEST_TMP/project"

    # Pre-create a file in root that the script doesn't know about. We will
    # add it AFTER the precondition check passes by using a wrapper. Simplest
    # approach: hook into git's integration worktree creation with a
    # post-checkout hook that drops a file into root.
    #
    # Trick: configure core.hooksPath at the repo level to a directory we
    # control, with a post-checkout hook that creates an untracked file in
    # root. The integration worktree shares the parent repo's hooks
    # configuration, so when `git worktree add` checks out the integration
    # branch, the hook fires and dirties root.

    local hooks_dir="$TEST_TMP/hooks"
    mkdir -p "$hooks_dir"
    cat > "$hooks_dir/post-checkout" << EOF
#!/bin/bash
# Drop an untracked file in root to simulate post-cleanup dirty state
echo "injected-dirt" > "$repo/injected-dirt.tmp"
exit 0
EOF
    chmod +x "$hooks_dir/post-checkout"
    git -C "$repo" config core.hooksPath "$hooks_dir"

    local output
    output=$(run_merge "$repo" --task-id TEST-1 --component comp --strategy merge)
    local exit_code
    exit_code=$(extract_exit_code "$output")

    # If hook didn't fire (e.g. on a git version where post-checkout doesn't
    # run for worktree add) we may not get exit 4. In that case skip rather
    # than fail spuriously.
    if [[ ! -f "$repo/injected-dirt.tmp" ]]; then
        echo "  SKIP (post-checkout hook did not fire on this git version)"
        return 0
    fi

    assert_exit_code "4" "$exit_code" \
        "post-cleanup dirty root should exit 4" || return 1

    local stderr
    stderr=$(extract_section "$output" "STDERR")
    assert_contains "$stderr" "=== AI REMEDIATION GUIDE ===" \
        "stderr should include AI REMEDIATION GUIDE for exit 4" || return 1
    assert_contains "$stderr" "ERROR_CODE: 4" \
        "stderr should include ERROR_CODE: 4" || return 1
    assert_contains "$stderr" "POST_CLEANUP_ROOT_DIRTY" \
        "stderr should include POST_CLEANUP_ROOT_DIRTY" || return 1
}


# ==========================================================================
# Test Suite: Worktree-base override
# ==========================================================================

test_worktree_base_flag_overrides_default() {
    local repo="$TEST_TMP/project"
    local output
    output=$(run_merge "$repo" --task-id TEST-1 --component comp --strategy merge \
        --worktree-base "custom-worktrees")
    local exit_code
    exit_code=$(extract_exit_code "$output")

    assert_exit_code "0" "$exit_code" "custom worktree-base should still succeed" || return 1

    local stdout
    stdout=$(extract_section "$output" "STDOUT")
    assert_contains "$stdout" "custom-worktrees/TEST-1-comp-integration" \
        "integration worktree path should reflect --worktree-base override" || return 1
}

test_review_branch_flag_overrides_default() {
    local repo="$TEST_TMP/project"
    # Create a custom-named review branch
    git -C "$repo" branch custom/review feature/TEST-1-review

    local output
    output=$(run_merge "$repo" --task-id TEST-1 --component comp --strategy merge \
        --review-branch "custom/review")
    local exit_code
    exit_code=$(extract_exit_code "$output")

    assert_exit_code "0" "$exit_code" "custom --review-branch should succeed" || return 1

    # custom/review should now contain the component changes
    if ! git -C "$repo" merge-base --is-ancestor feature/TEST-1-comp custom/review; then
        echo "  FAIL: custom/review does not reach component branch after merge"
        return 1
    fi
}


# ==========================================================================
# Run all tests
# ==========================================================================

echo ""
echo "=== integration-merge.sh: ADR-0014/0019/0020 executor tests ==="
echo ""

echo "--- Usage / argument parsing ---"
run_test "--help renders usage" test_help_renders_usage
run_test "no args exits with usage error" test_no_args_exits_with_usage_error
run_test "missing --task-id exits 1" test_missing_task_id_exits_1
run_test "missing --component exits 1" test_missing_component_exits_1
run_test "missing --strategy exits 1" test_missing_strategy_exits_1
run_test "invalid --strategy exits 1" test_invalid_strategy_exits_1
run_test "unknown option exits 1" test_unknown_option_exits_1

echo ""
echo "--- Strategy happy paths ---"
run_test "strategy: merge happy path" test_strategy_merge_happy_path
run_test "strategy: rebase-ff happy path" test_strategy_rebase_ff_happy_path
run_test "strategy: squash happy path" test_strategy_squash_happy_path

echo ""
echo "--- Precondition failures ---"
run_test "root dirty exits 2" test_precondition_root_dirty_exits_2
run_test "squash without --squash-message exits 2" test_precondition_squash_without_message_exits_2
run_test "missing review branch exits 2" test_precondition_missing_review_branch_exits_2
run_test "missing component branch exits 2" test_precondition_missing_component_branch_exits_2

echo ""
echo "--- Merge conflict path ---"
run_test "conflict exits 3 and retains worktree" test_conflict_exits_3_and_retains_worktree

echo ""
echo "--- ADR-0019 conditional ref-advance ---"
run_test "root on review branch uses ff-only from root" test_root_on_review_branch_uses_ff_only_from_root
run_test "root on other branch uses branch -f" test_root_on_other_branch_uses_branch_force

echo ""
echo "--- ADR-0019 post-cleanup assertion ---"
run_test "post-cleanup dirty root exits 4" test_post_cleanup_dirty_root_exits_4

echo ""
echo "--- Override flags ---"
run_test "--worktree-base overrides default" test_worktree_base_flag_overrides_default
run_test "--review-branch overrides default" test_review_branch_flag_overrides_default

echo ""
echo "=== Results: $TESTS_PASSED/$TESTS_RUN passed, $TESTS_FAILED failed ==="

if [[ $TESTS_FAILED -gt 0 ]]; then
    echo ""
    echo "Failures:"
    echo -e "$FAILURES"
    exit 1
fi

exit 0
