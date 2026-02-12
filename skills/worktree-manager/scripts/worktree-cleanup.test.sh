#!/bin/bash
# worktree-cleanup.test.sh - Tests for worktree cleanup: lock detection, timeout flags, AI diagnostics
#
# These tests verify:
# 1. Lock file detection blocks removal with WORKTREE_LOCKED error
# 2. Lock file reason is included in output
# 3. --skip-lock-check bypasses lock detection
# 4. --force bypasses lock detection with warning
# 5. Open file handle detection emits WARNING_CODE
# 6. AI remediation guide format for lock errors
# 7. parse_args accepts --skip-lock-check flag
# 8. --timeout flag parsing, validation, and env var override
# 9. --network-timeout flag parsing, validation, and env var override
# 10. Timeout validation rejects non-numeric, negative, and sub-minimum values
#
# Usage: bash worktree-cleanup.test.sh

set -euo pipefail

# --- Test infrastructure ---

TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
FAILURES=""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLEANUP_SCRIPT="$SCRIPT_DIR/worktree-cleanup.sh"

# Temporary directory for test fixtures
TEST_TMP=""

setup() {
    TEST_TMP=$(mktemp -d)

    # Create a fake git repo structure for testing
    mkdir -p "$TEST_TMP/project/.git/worktrees/test-worktree"
    mkdir -p "$TEST_TMP/project/trees/test-worktree/.git"

    # Initialize a real git repo for commands that need it
    git -C "$TEST_TMP/project" init --quiet 2>/dev/null || true
    git -C "$TEST_TMP/project" checkout -b develop --quiet 2>/dev/null || true

    # Create a minimal commit so HEAD is valid
    touch "$TEST_TMP/project/dummy.txt"
    git -C "$TEST_TMP/project" add dummy.txt
    git -C "$TEST_TMP/project" commit -m "init" --quiet 2>/dev/null || true
}

teardown() {
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


# ==========================================================================
# Test: source the script functions for unit-level testing
# We source only the functions we need by extracting them
# ==========================================================================

# Helper: create a real worktree for integration-level tests
create_real_worktree() {
    local project_dir="$1"
    local worktree_name="$2"
    local worktree_path="$project_dir/trees/$worktree_name"

    git -C "$project_dir" worktree add "$worktree_path" -b "feature/$worktree_name" >/dev/null 2>&1
    echo "$worktree_path"
}

# Helper: run the cleanup script with args, capturing output and exit code
run_cleanup() {
    local exit_code=0
    local output
    output=$(bash "$CLEANUP_SCRIPT" "$@" 2>&1) || exit_code=$?
    echo "EXIT_CODE=$exit_code"
    echo "$output"
}


# ==========================================================================
# Test Suite: --skip-lock-check flag parsing
# ==========================================================================

test_parse_args_accepts_skip_lock_check() {
    # The script should accept --skip-lock-check without error
    # We test by running with --help-like approach or checking it doesn't fail on unknown flag
    local output
    local exit_code=0
    output=$(bash "$CLEANUP_SCRIPT" ./some/path --skip-lock-check --keep-branch 2>&1) || exit_code=$?

    # It should NOT fail with "Unknown option: --skip-lock-check"
    assert_not_contains "$output" "Unknown option: --skip-lock-check" \
        "parse_args should accept --skip-lock-check flag"
}

test_usage_documents_skip_lock_check() {
    local output
    output=$(bash "$CLEANUP_SCRIPT" --help 2>&1) || true

    assert_contains "$output" "--skip-lock-check" \
        "usage() should document --skip-lock-check flag"
}

test_usage_documents_skip_lock_check_description() {
    local output
    output=$(bash "$CLEANUP_SCRIPT" --help 2>&1) || true

    assert_contains "$output" "lock" \
        "usage() should mention lock detection in --skip-lock-check description"
}


# ==========================================================================
# Test Suite: Lock file detection
# ==========================================================================

test_locked_worktree_exits_with_code_1() {
    # Create a real worktree, then lock it
    local worktree_path
    worktree_path=$(create_real_worktree "$TEST_TMP/project" "locked-test")

    # Determine the worktree metadata name (basename of path)
    local wt_name
    wt_name=$(basename "$worktree_path")

    # Create lock file in git metadata
    echo "locked by CI process" > "$TEST_TMP/project/.git/worktrees/$wt_name/locked"

    # Run cleanup
    local output exit_code=0
    output=$(bash "$CLEANUP_SCRIPT" "$worktree_path" --delete-branch 2>&1) || exit_code=$?

    assert_exit_code "1" "$exit_code" \
        "Locked worktree should exit with code 1"
}

test_locked_worktree_outputs_error_code() {
    local worktree_path
    worktree_path=$(create_real_worktree "$TEST_TMP/project" "locked-err")

    local wt_name
    wt_name=$(basename "$worktree_path")
    echo "locked by test" > "$TEST_TMP/project/.git/worktrees/$wt_name/locked"

    local output exit_code=0
    output=$(bash "$CLEANUP_SCRIPT" "$worktree_path" --delete-branch 2>&1) || exit_code=$?

    assert_contains "$output" "ERROR_CODE: WORKTREE_LOCKED" \
        "Output should contain ERROR_CODE: WORKTREE_LOCKED"
}

test_locked_worktree_outputs_lock_file_path() {
    local worktree_path
    worktree_path=$(create_real_worktree "$TEST_TMP/project" "locked-path")

    local wt_name
    wt_name=$(basename "$worktree_path")
    local lock_file="$TEST_TMP/project/.git/worktrees/$wt_name/locked"
    echo "" > "$lock_file"

    local output exit_code=0
    output=$(bash "$CLEANUP_SCRIPT" "$worktree_path" --delete-branch 2>&1) || exit_code=$?

    assert_contains "$output" "LOCK_FILE:" \
        "Output should contain LOCK_FILE: with path"
}

test_locked_worktree_outputs_lock_reason() {
    local worktree_path
    worktree_path=$(create_real_worktree "$TEST_TMP/project" "locked-reason")

    local wt_name
    wt_name=$(basename "$worktree_path")
    echo "deployment in progress" > "$TEST_TMP/project/.git/worktrees/$wt_name/locked"

    local output exit_code=0
    output=$(bash "$CLEANUP_SCRIPT" "$worktree_path" --delete-branch 2>&1) || exit_code=$?

    assert_contains "$output" "LOCK_REASON: deployment in progress" \
        "Output should contain LOCK_REASON with lock file contents"
}

test_locked_worktree_outputs_remediation() {
    local worktree_path
    worktree_path=$(create_real_worktree "$TEST_TMP/project" "locked-remed")

    local wt_name
    wt_name=$(basename "$worktree_path")
    echo "" > "$TEST_TMP/project/.git/worktrees/$wt_name/locked"

    local output exit_code=0
    output=$(bash "$CLEANUP_SCRIPT" "$worktree_path" --delete-branch 2>&1) || exit_code=$?

    assert_contains "$output" "REMEDIATION:" \
        "Output should contain REMEDIATION section"
    assert_contains "$output" "git worktree unlock" \
        "Remediation should suggest git worktree unlock"
}

test_locked_worktree_outputs_ai_remediation_block() {
    local worktree_path
    worktree_path=$(create_real_worktree "$TEST_TMP/project" "locked-ai")

    local wt_name
    wt_name=$(basename "$worktree_path")
    echo "" > "$TEST_TMP/project/.git/worktrees/$wt_name/locked"

    local output exit_code=0
    output=$(bash "$CLEANUP_SCRIPT" "$worktree_path" --delete-branch 2>&1) || exit_code=$?

    assert_contains "$output" "=== AI REMEDIATION GUIDE ===" \
        "Output should contain AI REMEDIATION GUIDE block"
    assert_contains "$output" "=== END AI REMEDIATION GUIDE ===" \
        "Output should contain END AI REMEDIATION GUIDE block"
}

test_empty_lock_file_still_detected() {
    local worktree_path
    worktree_path=$(create_real_worktree "$TEST_TMP/project" "locked-empty")

    local wt_name
    wt_name=$(basename "$worktree_path")
    # Create an empty lock file (git worktree lock without reason)
    touch "$TEST_TMP/project/.git/worktrees/$wt_name/locked"

    local output exit_code=0
    output=$(bash "$CLEANUP_SCRIPT" "$worktree_path" --delete-branch 2>&1) || exit_code=$?

    assert_exit_code "1" "$exit_code" \
        "Empty lock file should still block removal"
    assert_contains "$output" "WORKTREE_LOCKED" \
        "Empty lock file should emit WORKTREE_LOCKED"
}

test_unlocked_worktree_proceeds_normally() {
    local worktree_path
    worktree_path=$(create_real_worktree "$TEST_TMP/project" "unlocked-test")

    # No lock file -- should proceed to removal
    local output exit_code=0
    output=$(bash "$CLEANUP_SCRIPT" "$worktree_path" --delete-branch 2>&1) || exit_code=$?

    assert_not_contains "$output" "WORKTREE_LOCKED" \
        "Unlocked worktree should not emit WORKTREE_LOCKED"
    # Should succeed or at least not exit with code 1 due to lock
    # (it may fail for other reasons in test env, but not lock-related)
}


# ==========================================================================
# Test Suite: --skip-lock-check bypass
# ==========================================================================

test_skip_lock_check_bypasses_lock_detection() {
    local worktree_path
    worktree_path=$(create_real_worktree "$TEST_TMP/project" "skip-lock")

    local wt_name
    wt_name=$(basename "$worktree_path")
    echo "locked by CI" > "$TEST_TMP/project/.git/worktrees/$wt_name/locked"

    local output exit_code=0
    output=$(bash "$CLEANUP_SCRIPT" "$worktree_path" --delete-branch --skip-lock-check 2>&1) || exit_code=$?

    assert_not_contains "$output" "WORKTREE_LOCKED" \
        "--skip-lock-check should bypass lock detection"
    # Should not exit with code 1 due to lock
    if [[ "$exit_code" -eq 1 ]]; then
        # Check if it was lock-related
        if [[ "$output" == *"WORKTREE_LOCKED"* ]]; then
            echo "  FAIL: --skip-lock-check did not bypass lock detection"
            return 1
        fi
    fi
}


# ==========================================================================
# Test Suite: --force bypasses lock check
# ==========================================================================

test_force_bypasses_lock_check() {
    local worktree_path
    worktree_path=$(create_real_worktree "$TEST_TMP/project" "force-lock")

    local wt_name
    wt_name=$(basename "$worktree_path")
    echo "locked for maintenance" > "$TEST_TMP/project/.git/worktrees/$wt_name/locked"

    local output exit_code=0
    output=$(bash "$CLEANUP_SCRIPT" "$worktree_path" --delete-branch --force 2>&1) || exit_code=$?

    assert_not_contains "$output" "ERROR_CODE: WORKTREE_LOCKED" \
        "--force should bypass lock detection without error"
}

test_force_emits_warning_for_locked_worktree() {
    local worktree_path
    worktree_path=$(create_real_worktree "$TEST_TMP/project" "force-warn")

    local wt_name
    wt_name=$(basename "$worktree_path")
    echo "locked for maintenance" > "$TEST_TMP/project/.git/worktrees/$wt_name/locked"

    local output exit_code=0
    output=$(bash "$CLEANUP_SCRIPT" "$worktree_path" --delete-branch --force 2>&1) || exit_code=$?

    assert_contains "$output" "Worktree is locked (bypassing" \
        "--force on locked worktree should emit a warning"
}


# ==========================================================================
# Test Suite: Open file handle detection
# ==========================================================================

test_open_handles_emits_warning_code() {
    # This test is conditional on lsof being available
    if ! command -v lsof >/dev/null 2>&1; then
        echo "  SKIP (lsof not available)"
        return 0
    fi

    local worktree_path
    worktree_path=$(create_real_worktree "$TEST_TMP/project" "handles-test")

    # Create a file and open a persistent handle via tail -f in background
    touch "$worktree_path/open-file.tmp"
    tail -f "$worktree_path/open-file.tmp" >/dev/null 2>&1 &
    local bg_pid=$!

    # Give tail a moment to open the file handle
    sleep 0.2

    local output exit_code=0
    output=$(bash "$CLEANUP_SCRIPT" "$worktree_path" --delete-branch --force 2>&1) || exit_code=$?

    # Clean up background process
    kill "$bg_pid" 2>/dev/null || true
    wait "$bg_pid" 2>/dev/null || true

    assert_contains "$output" "WARNING_CODE: OPEN_FILE_HANDLES" \
        "Open file handles should emit WARNING_CODE: OPEN_FILE_HANDLES"
}

test_open_handles_does_not_block_removal() {
    if ! command -v lsof >/dev/null 2>&1; then
        echo "  SKIP (lsof not available)"
        return 0
    fi

    local worktree_path
    worktree_path=$(create_real_worktree "$TEST_TMP/project" "handles-noblock")

    # Create a file and open a persistent handle via tail -f
    touch "$worktree_path/open-file.tmp"
    tail -f "$worktree_path/open-file.tmp" >/dev/null 2>&1 &
    local bg_pid=$!
    sleep 0.2

    local output exit_code=0
    output=$(bash "$CLEANUP_SCRIPT" "$worktree_path" --delete-branch --force 2>&1) || exit_code=$?

    # Clean up
    kill "$bg_pid" 2>/dev/null || true
    wait "$bg_pid" 2>/dev/null || true

    # Open handles should be a WARNING, not an error exit
    assert_not_contains "$output" "ERROR_CODE: OPEN_FILE_HANDLES" \
        "Open handles should be WARNING, not ERROR"
}

test_no_open_handles_no_warning() {
    local worktree_path
    worktree_path=$(create_real_worktree "$TEST_TMP/project" "no-handles")

    local output exit_code=0
    output=$(bash "$CLEANUP_SCRIPT" "$worktree_path" --delete-branch --force 2>&1) || exit_code=$?

    assert_not_contains "$output" "OPEN_FILE_HANDLES" \
        "No open handles should not emit OPEN_FILE_HANDLES warning"
}

test_lsof_unavailable_skips_gracefully() {
    local worktree_path
    worktree_path=$(create_real_worktree "$TEST_TMP/project" "no-lsof")

    # Create a shim directory that shadows lsof with a non-existent command
    local shim_dir="$TEST_TMP/shim"
    mkdir -p "$shim_dir"

    # Create a fake lsof that exits with 127 (command not found behavior)
    # We use __WORKTREE_CLEANUP_TEST_NO_LSOF env var instead for cleaner testing
    local output exit_code=0
    output=$(__WORKTREE_CLEANUP_TEST_NO_LSOF=1 bash "$CLEANUP_SCRIPT" "$worktree_path" --delete-branch --force 2>&1) || exit_code=$?

    # Should not fail due to missing lsof
    assert_not_contains "$output" "lsof: command not found" \
        "Missing lsof should be handled gracefully"
    assert_not_contains "$output" "OPEN_FILE_HANDLES" \
        "Missing lsof should skip handle detection"
}


# ==========================================================================
# Test Suite: Dry run with lock detection
# ==========================================================================

test_dry_run_still_checks_lock() {
    local worktree_path
    worktree_path=$(create_real_worktree "$TEST_TMP/project" "dry-lock")

    local wt_name
    wt_name=$(basename "$worktree_path")
    echo "locked" > "$TEST_TMP/project/.git/worktrees/$wt_name/locked"

    local output exit_code=0
    output=$(bash "$CLEANUP_SCRIPT" "$worktree_path" --delete-branch --dry-run 2>&1) || exit_code=$?

    # Lock check happens before dry run display, so it should still block
    assert_exit_code "1" "$exit_code" \
        "Dry run should still check for locks"
    assert_contains "$output" "WORKTREE_LOCKED" \
        "Dry run should report lock error"
}


# ==========================================================================
# Test Suite: --timeout flag parsing and validation
# ==========================================================================

test_parse_args_accepts_timeout_flag() {
    # The script should accept --timeout with a value without error
    local output exit_code=0
    output=$(bash "$CLEANUP_SCRIPT" ./some/path --timeout 60 --keep-branch 2>&1) || exit_code=$?

    # It should NOT fail with "Unknown option: --timeout"
    assert_not_contains "$output" "Unknown option: --timeout" \
        "parse_args should accept --timeout flag" || return 1
}

test_parse_args_accepts_network_timeout_flag() {
    # The script should accept --network-timeout with a value without error
    local output exit_code=0
    output=$(bash "$CLEANUP_SCRIPT" ./some/path --network-timeout 45 --keep-branch 2>&1) || exit_code=$?

    # It should NOT fail with "Unknown option: --network-timeout"
    assert_not_contains "$output" "Unknown option: --network-timeout" \
        "parse_args should accept --network-timeout flag" || return 1
}

test_timeout_flag_overrides_env_var() {
    # When --timeout is provided, it should override WORKTREE_REMOVE_TIMEOUT env var
    local worktree_path
    worktree_path=$(create_real_worktree "$TEST_TMP/project" "timeout-override")

    local output exit_code=0
    output=$(WORKTREE_REMOVE_TIMEOUT=999 bash "$CLEANUP_SCRIPT" "$worktree_path" --timeout 60 --delete-branch --dry-run 2>&1) || exit_code=$?

    # The dry-run output should show timeout: 60s, not 999s
    assert_exit_code "0" "$exit_code" \
        "Dry run with --timeout should succeed" || return 1
    assert_contains "$output" "timeout: 60s" \
        "--timeout should override WORKTREE_REMOVE_TIMEOUT env var in output" || return 1
    assert_not_contains "$output" "timeout: 999s" \
        "env var value should not appear when --timeout is used" || return 1
}

test_network_timeout_flag_overrides_env_var() {
    # When --network-timeout is provided, it should override NETWORK_TIMEOUT env var
    local worktree_path
    worktree_path=$(create_real_worktree "$TEST_TMP/project" "net-timeout-override")

    local output exit_code=0
    output=$(NETWORK_TIMEOUT=999 bash "$CLEANUP_SCRIPT" "$worktree_path" --network-timeout 45 --delete-branch --dry-run 2>&1) || exit_code=$?

    # The dry-run output should not reference 999s
    assert_exit_code "0" "$exit_code" \
        "Dry run with --network-timeout should succeed" || return 1
    assert_not_contains "$output" "timeout: 999s" \
        "env var value should not appear when --network-timeout is used" || return 1
}

test_timeout_env_var_still_works_as_fallback() {
    # When --timeout is NOT provided, WORKTREE_REMOVE_TIMEOUT env var should be used
    local worktree_path
    worktree_path=$(create_real_worktree "$TEST_TMP/project" "env-fallback")

    local output exit_code=0
    output=$(WORKTREE_REMOVE_TIMEOUT=200 bash "$CLEANUP_SCRIPT" "$worktree_path" --delete-branch --dry-run 2>&1) || exit_code=$?

    # Dry-run output should reference 200s timeout
    assert_exit_code "0" "$exit_code" \
        "Dry run with env var timeout should succeed" || return 1
    assert_contains "$output" "timeout: 200s" \
        "WORKTREE_REMOVE_TIMEOUT env var should work as fallback" || return 1
}

test_timeout_rejects_non_numeric_value() {
    local output exit_code=0
    output=$(bash "$CLEANUP_SCRIPT" ./some/path --timeout abc --keep-branch 2>&1) || exit_code=$?

    assert_exit_code "1" "$exit_code" \
        "Non-numeric --timeout should exit with code 1" || return 1
    # Must fail with a timeout-specific validation error, not just "Unknown option"
    assert_contains "$output" "Invalid timeout" \
        "Non-numeric --timeout should produce an error with 'Invalid timeout'" || return 1
    assert_not_contains "$output" "Unknown option" \
        "Non-numeric --timeout should not fail as 'Unknown option'" || return 1
}

test_timeout_rejects_value_below_minimum() {
    local output exit_code=0
    output=$(bash "$CLEANUP_SCRIPT" ./some/path --timeout 5 --keep-branch 2>&1) || exit_code=$?

    assert_exit_code "1" "$exit_code" \
        "--timeout below 10 should exit with code 1" || return 1
    assert_contains "$output" "Invalid timeout" \
        "--timeout below minimum should produce 'Invalid timeout' error" || return 1
    assert_contains "$output" "must be" \
        "--timeout below minimum should explain the requirement" || return 1
}

test_network_timeout_rejects_non_numeric_value() {
    local output exit_code=0
    output=$(bash "$CLEANUP_SCRIPT" ./some/path --network-timeout xyz --keep-branch 2>&1) || exit_code=$?

    assert_exit_code "1" "$exit_code" \
        "Non-numeric --network-timeout should exit with code 1" || return 1
    # Must fail with a timeout-specific validation error, not just "Unknown option"
    assert_contains "$output" "Invalid timeout" \
        "Non-numeric --network-timeout should produce an error with 'Invalid timeout'" || return 1
    assert_not_contains "$output" "Unknown option" \
        "Non-numeric --network-timeout should not fail as 'Unknown option'" || return 1
}

test_network_timeout_rejects_value_below_minimum() {
    local output exit_code=0
    output=$(bash "$CLEANUP_SCRIPT" ./some/path --network-timeout 3 --keep-branch 2>&1) || exit_code=$?

    assert_exit_code "1" "$exit_code" \
        "--network-timeout below 10 should exit with code 1" || return 1
    assert_contains "$output" "Invalid timeout" \
        "--network-timeout below minimum should produce 'Invalid timeout' error" || return 1
    assert_contains "$output" "must be" \
        "--network-timeout below minimum should explain the requirement" || return 1
}

test_timeout_rejects_negative_value() {
    local output exit_code=0
    output=$(bash "$CLEANUP_SCRIPT" ./some/path --timeout -5 --keep-branch 2>&1) || exit_code=$?

    assert_exit_code "1" "$exit_code" \
        "Negative --timeout should exit with code 1" || return 1
    # Must be rejected by timeout validation, not the unknown flag handler
    assert_contains "$output" "Invalid timeout" \
        "Negative --timeout should produce a validation error with 'Invalid timeout'" || return 1
}

test_timeout_rejects_zero() {
    local output exit_code=0
    output=$(bash "$CLEANUP_SCRIPT" ./some/path --timeout 0 --keep-branch 2>&1) || exit_code=$?

    assert_exit_code "1" "$exit_code" \
        "Zero --timeout should exit with code 1" || return 1
    assert_contains "$output" "Invalid timeout" \
        "Zero --timeout should produce a validation error with 'Invalid timeout'" || return 1
}

test_timeout_missing_value_produces_error() {
    # --timeout at end of args with no value should fail
    local output exit_code=0
    output=$(bash "$CLEANUP_SCRIPT" ./some/path --keep-branch --timeout 2>&1) || exit_code=$?

    assert_exit_code "1" "$exit_code" \
        "--timeout with no value should exit with code 1" || return 1
    assert_contains "$output" "--timeout requires" \
        "--timeout with no value should mention '--timeout requires'" || return 1
}

test_network_timeout_missing_value_produces_error() {
    # --network-timeout at end of args with no value should fail
    local output exit_code=0
    output=$(bash "$CLEANUP_SCRIPT" ./some/path --keep-branch --network-timeout 2>&1) || exit_code=$?

    assert_exit_code "1" "$exit_code" \
        "--network-timeout with no value should exit with code 1" || return 1
    assert_contains "$output" "--network-timeout requires" \
        "--network-timeout with no value should mention '--network-timeout requires'" || return 1
}

test_usage_documents_timeout_flag() {
    local output
    output=$(bash "$CLEANUP_SCRIPT" --help 2>&1) || true

    assert_contains "$output" "--timeout" \
        "usage() should document --timeout flag" || return 1
}

test_usage_documents_network_timeout_flag() {
    local output
    output=$(bash "$CLEANUP_SCRIPT" --help 2>&1) || true

    assert_contains "$output" "--network-timeout" \
        "usage() should document --network-timeout flag" || return 1
}

test_usage_explains_default_timeout_rationale() {
    local output
    output=$(bash "$CLEANUP_SCRIPT" --help 2>&1) || true

    assert_contains "$output" "120" \
        "usage() should mention the default timeout of 120" || return 1
    assert_contains "$output" "node_modules" \
        "usage() should explain WHY 120s default (large node_modules)" || return 1
}

test_timeout_accepts_boundary_value_10() {
    # The minimum valid value (10) should be accepted
    local output exit_code=0
    output=$(bash "$CLEANUP_SCRIPT" ./some/path --timeout 10 --keep-branch 2>&1) || exit_code=$?

    # Should not fail with "Unknown option" (flag must be recognized)
    assert_not_contains "$output" "Unknown option" \
        "--timeout 10 should be recognized as a valid flag" || return 1
    # Should not fail with validation error
    assert_not_contains "$output" "Invalid timeout" \
        "--timeout 10 should be accepted as the minimum valid value" || return 1
}

test_both_timeout_flags_together() {
    # Both --timeout and --network-timeout should work together
    local worktree_path
    worktree_path=$(create_real_worktree "$TEST_TMP/project" "both-timeouts")

    local output exit_code=0
    output=$(bash "$CLEANUP_SCRIPT" "$worktree_path" --timeout 60 --network-timeout 15 --delete-branch --dry-run 2>&1) || exit_code=$?

    assert_exit_code "0" "$exit_code" \
        "Both timeout flags together should succeed in dry-run" || return 1
}

test_remediation_shows_timeout_flag() {
    # The timeout remediation guide should show --timeout flag usage
    local output
    output=$(bash "$CLEANUP_SCRIPT" --help 2>&1) || true

    assert_contains "$output" "--timeout" \
        "Help/usage should reference --timeout flag" || return 1
}


# ==========================================================================
# Run all tests
# ==========================================================================

echo ""
echo "=== worktree-cleanup.sh: Pre-removal lock detection tests ==="
echo ""

echo "--- Flag parsing ---"
run_test "parse_args accepts --skip-lock-check" test_parse_args_accepts_skip_lock_check
run_test "usage documents --skip-lock-check" test_usage_documents_skip_lock_check
run_test "usage mentions lock in description" test_usage_documents_skip_lock_check_description

echo ""
echo "--- Lock file detection ---"
run_test "locked worktree exits with code 1" test_locked_worktree_exits_with_code_1
run_test "locked worktree outputs ERROR_CODE: WORKTREE_LOCKED" test_locked_worktree_outputs_error_code
run_test "locked worktree outputs LOCK_FILE path" test_locked_worktree_outputs_lock_file_path
run_test "locked worktree outputs LOCK_REASON" test_locked_worktree_outputs_lock_reason
run_test "locked worktree outputs REMEDIATION" test_locked_worktree_outputs_remediation
run_test "locked worktree outputs AI remediation block" test_locked_worktree_outputs_ai_remediation_block
run_test "empty lock file still detected" test_empty_lock_file_still_detected
run_test "unlocked worktree proceeds normally" test_unlocked_worktree_proceeds_normally

echo ""
echo "--- --skip-lock-check bypass ---"
run_test "--skip-lock-check bypasses lock detection" test_skip_lock_check_bypasses_lock_detection

echo ""
echo "--- --force bypasses lock ---"
run_test "--force bypasses lock check" test_force_bypasses_lock_check
run_test "--force emits warning for locked worktree" test_force_emits_warning_for_locked_worktree

echo ""
echo "--- Open file handle detection ---"
run_test "open handles emits WARNING_CODE" test_open_handles_emits_warning_code
run_test "open handles does not block removal" test_open_handles_does_not_block_removal
run_test "no open handles emits no warning" test_no_open_handles_no_warning
run_test "lsof unavailable skips gracefully" test_lsof_unavailable_skips_gracefully

echo ""
echo "--- Dry run with lock detection ---"
run_test "dry run still checks lock" test_dry_run_still_checks_lock

echo ""
echo "--- --timeout flag parsing ---"
run_test "parse_args accepts --timeout" test_parse_args_accepts_timeout_flag
run_test "parse_args accepts --network-timeout" test_parse_args_accepts_network_timeout_flag
run_test "--timeout overrides env var" test_timeout_flag_overrides_env_var
run_test "--network-timeout overrides env var" test_network_timeout_flag_overrides_env_var
run_test "env var works as fallback" test_timeout_env_var_still_works_as_fallback

echo ""
echo "--- --timeout validation ---"
run_test "--timeout rejects non-numeric" test_timeout_rejects_non_numeric_value
run_test "--timeout rejects below minimum" test_timeout_rejects_value_below_minimum
run_test "--network-timeout rejects non-numeric" test_network_timeout_rejects_non_numeric_value
run_test "--network-timeout rejects below minimum" test_network_timeout_rejects_value_below_minimum
run_test "--timeout rejects negative" test_timeout_rejects_negative_value
run_test "--timeout rejects zero" test_timeout_rejects_zero
run_test "--timeout missing value errors" test_timeout_missing_value_produces_error
run_test "--network-timeout missing value errors" test_network_timeout_missing_value_produces_error

echo ""
echo "--- --timeout usage documentation ---"
run_test "usage documents --timeout" test_usage_documents_timeout_flag
run_test "usage documents --network-timeout" test_usage_documents_network_timeout_flag
run_test "usage explains default timeout rationale" test_usage_explains_default_timeout_rationale

echo ""
echo "--- --timeout boundary and combo ---"
run_test "--timeout accepts boundary value 10" test_timeout_accepts_boundary_value_10
run_test "both timeout flags together" test_both_timeout_flags_together
run_test "remediation shows --timeout flag" test_remediation_shows_timeout_flag

echo ""
echo "=== Results: $TESTS_PASSED/$TESTS_RUN passed, $TESTS_FAILED failed ==="

if [[ $TESTS_FAILED -gt 0 ]]; then
    echo ""
    echo "Failures:"
    echo -e "$FAILURES"
    exit 1
fi

exit 0
