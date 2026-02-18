#!/bin/bash
# visual-helpers.test.sh - Tests for the shared visual helpers library
#
# Tests verify:
# 1. Card rendering: header with title + heavy rule, footer with heavy rule
# 2. Gauge state rendering: all 6 states with correct block patterns
# 3. Logging functions: clean prefixes, no emoji, no [BRACKET] tags
# 4. Terminal capability detection: color vs no-color modes
# 5. Sourceable: file can be sourced without side effects
#
# Usage: bash visual-helpers.test.sh

set -euo pipefail

# --- Test infrastructure ---

TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
FAILURES=""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HELPERS_SCRIPT="$SCRIPT_DIR/visual-helpers.sh"

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

run_test() {
    local test_name="$1"
    local test_func="$2"
    TESTS_RUN=$((TESTS_RUN + 1))
    echo -n "  $test_name ... "

    local result=0
    local output
    output=$($test_func 2>&1) || result=$?

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
# Test Suite: File is sourceable
# ==========================================================================

test_file_exists() {
    if [[ ! -f "$HELPERS_SCRIPT" ]]; then
        echo "  FAIL: visual-helpers.sh does not exist at $HELPERS_SCRIPT"
        return 1
    fi
}

test_file_is_executable() {
    if [[ ! -x "$HELPERS_SCRIPT" ]]; then
        echo "  FAIL: visual-helpers.sh is not executable"
        return 1
    fi
}

test_source_without_side_effects() {
    # Sourcing the file should not produce any output
    local output
    output=$(. "$HELPERS_SCRIPT" 2>&1)
    assert_equals "" "$output" "Sourcing visual-helpers.sh should produce no output"
}

test_source_exports_functions() {
    # After sourcing, the expected functions should be available
    (
        . "$HELPERS_SCRIPT"
        type render_card_header >/dev/null 2>&1 || { echo "  FAIL: render_card_header not defined"; exit 1; }
        type render_card_footer >/dev/null 2>&1 || { echo "  FAIL: render_card_footer not defined"; exit 1; }
        type render_gauge >/dev/null 2>&1 || { echo "  FAIL: render_gauge not defined"; exit 1; }
        type log_step >/dev/null 2>&1 || { echo "  FAIL: log_step not defined"; exit 1; }
        type log_ok >/dev/null 2>&1 || { echo "  FAIL: log_ok not defined"; exit 1; }
        type log_warn >/dev/null 2>&1 || { echo "  FAIL: log_warn not defined"; exit 1; }
        type log_fail >/dev/null 2>&1 || { echo "  FAIL: log_fail not defined"; exit 1; }
    )
}


# ==========================================================================
# Test Suite: Card rendering
# ==========================================================================

test_card_header_prints_title() {
    local output
    output=$(. "$HELPERS_SCRIPT" && render_card_header "PREFLIGHT")
    assert_contains "$output" "PREFLIGHT" \
        "Card header should contain the title"
}

test_card_header_prints_heavy_rule() {
    local output
    output=$(. "$HELPERS_SCRIPT" && render_card_header "TEST")
    assert_contains "$output" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" \
        "Card header should contain a heavy rule line of ~38 chars"
}

test_card_header_title_before_rule() {
    local output
    output=$(. "$HELPERS_SCRIPT" && render_card_header "DEPARTURE")
    # Title should appear on a line before the rule
    local title_line
    title_line=$(echo "$output" | grep -n "DEPARTURE" | head -1 | cut -d: -f1)
    local rule_line
    rule_line=$(echo "$output" | grep -n "━━━" | head -1 | cut -d: -f1)
    if [[ "$title_line" -ge "$rule_line" ]]; then
        echo "  FAIL: Title should appear before the heavy rule"
        echo "  Title line: $title_line, Rule line: $rule_line"
        return 1
    fi
}

test_card_header_has_indent() {
    local output
    output=$(. "$HELPERS_SCRIPT" && render_card_header "TEST")
    # Title and rule should have 2-space indent
    local title_line
    title_line=$(echo "$output" | grep "TEST")
    assert_contains "$title_line" "  TEST" \
        "Card header title should have 2-space indent"
}

test_card_footer_prints_heavy_rule() {
    local output
    output=$(. "$HELPERS_SCRIPT" && render_card_footer)
    assert_contains "$output" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" \
        "Card footer should contain a heavy rule line"
}

test_card_header_no_emoji() {
    local output
    output=$(. "$HELPERS_SCRIPT" && render_card_header "TEST")
    # Check for common emoji ranges - simplified check
    assert_not_contains "$output" "📁" "Card header should not contain emoji" || return 1
    assert_not_contains "$output" "🌿" "Card header should not contain emoji" || return 1
    assert_not_contains "$output" "🎯" "Card header should not contain emoji" || return 1
    assert_not_contains "$output" "ℹ" "Card header should not contain info emoji" || return 1
}

test_card_header_no_box_drawing_double() {
    local output
    output=$(. "$HELPERS_SCRIPT" && render_card_header "TEST")
    assert_not_contains "$output" "╔" "Card should not use double-line box drawing" || return 1
    assert_not_contains "$output" "╗" "Card should not use double-line box drawing" || return 1
    assert_not_contains "$output" "═" "Card should not use double-line box drawing" || return 1
}


# ==========================================================================
# Test Suite: Gauge rendering
# ==========================================================================

test_gauge_landed() {
    local output
    output=$(. "$HELPERS_SCRIPT" && render_gauge "LANDED")
    assert_contains "$output" "██████████" \
        "LANDED gauge should have 10 filled blocks" || return 1
    assert_contains "$output" "LANDED" \
        "LANDED gauge should include label" || return 1
}

test_gauge_on_approach() {
    local output
    output=$(. "$HELPERS_SCRIPT" && render_gauge "ON_APPROACH")
    assert_contains "$output" "████████░░" \
        "ON_APPROACH gauge should have 8 filled + 2 unfilled" || return 1
    assert_contains "$output" "ON APPROACH" \
        "ON_APPROACH gauge should include label with space" || return 1
}

test_gauge_in_flight() {
    local output
    output=$(. "$HELPERS_SCRIPT" && render_gauge "IN_FLIGHT")
    assert_contains "$output" "██████░░░░" \
        "IN_FLIGHT gauge should have 6 filled + 4 unfilled" || return 1
    assert_contains "$output" "IN FLIGHT" \
        "IN_FLIGHT gauge should include label with space" || return 1
}

test_gauge_taking_off() {
    local output
    output=$(. "$HELPERS_SCRIPT" && render_gauge "TAKING_OFF")
    assert_contains "$output" "███░░░░░░░" \
        "TAKING_OFF gauge should have 3 filled + 7 unfilled" || return 1
    assert_contains "$output" "TAKING OFF" \
        "TAKING_OFF gauge should include label with space" || return 1
}

test_gauge_taxiing() {
    local output
    output=$(. "$HELPERS_SCRIPT" && render_gauge "TAXIING")
    assert_contains "$output" "░░░░░░░░░░" \
        "TAXIING gauge should have 10 unfilled blocks" || return 1
    assert_contains "$output" "TAXIING" \
        "TAXIING gauge should include label" || return 1
}

test_gauge_fault() {
    local output
    output=$(. "$HELPERS_SCRIPT" && render_gauge "FAULT")
    assert_contains "$output" "░░░░!!░░░░" \
        "FAULT gauge should have unfilled blocks with !! in center" || return 1
    assert_contains "$output" "FAULT" \
        "FAULT gauge should include label" || return 1
}

test_gauge_unknown_state_returns_error() {
    local exit_code=0
    (. "$HELPERS_SCRIPT" && render_gauge "INVALID_STATE") >/dev/null 2>&1 || exit_code=$?
    if [[ "$exit_code" -eq 0 ]]; then
        echo "  FAIL: Unknown gauge state should return non-zero exit code"
        return 1
    fi
}

test_gauge_has_two_space_indent() {
    local output
    output=$(. "$HELPERS_SCRIPT" && render_gauge "LANDED")
    # The gauge should start with 2-space indent
    local first_char
    first_char=$(echo "$output" | head -1 | cut -c1-2)
    assert_equals "  " "$first_char" \
        "Gauge should have 2-space indent"
}

test_gauge_no_emoji() {
    local output
    output=$(. "$HELPERS_SCRIPT" && render_gauge "LANDED")
    assert_not_contains "$output" "✓" "Gauge should not contain emoji" || return 1
    assert_not_contains "$output" "✗" "Gauge should not contain emoji" || return 1
}


# ==========================================================================
# Test Suite: Logging functions
# ==========================================================================

test_log_step_outputs_message() {
    local output
    output=$(. "$HELPERS_SCRIPT" && log_step "Creating worktree")
    assert_contains "$output" "Creating worktree" \
        "log_step should include the message"
}

test_log_step_has_clean_prefix() {
    local output
    output=$(. "$HELPERS_SCRIPT" && log_step "test message")
    # Should have a minimal prefix indicator (e.g., "  ▸ ")
    assert_contains "$output" "▸" \
        "log_step should use ▸ as prefix"
}

test_log_ok_outputs_message() {
    local output
    output=$(. "$HELPERS_SCRIPT" && log_ok "Dependencies installed")
    assert_contains "$output" "Dependencies installed" \
        "log_ok should include the message"
}

test_log_warn_outputs_message() {
    local output
    output=$(. "$HELPERS_SCRIPT" && log_warn "Something might be wrong" 2>&1)
    assert_contains "$output" "Something might be wrong" \
        "log_warn should include the message"
}

test_log_fail_outputs_message() {
    local output
    output=$(. "$HELPERS_SCRIPT" && log_fail "Something went wrong" 2>&1)
    assert_contains "$output" "Something went wrong" \
        "log_fail should include the message"
}

test_log_functions_no_emoji() {
    local output
    output=$(. "$HELPERS_SCRIPT" && log_step "a" && log_ok "b" && { log_warn "c" 2>&1; } && { log_fail "d" 2>&1; })
    assert_not_contains "$output" "ℹ" "Log functions should not use info emoji" || return 1
    assert_not_contains "$output" "✓" "Log functions should not use check emoji" || return 1
    assert_not_contains "$output" "⚠" "Log functions should not use warning emoji" || return 1
    assert_not_contains "$output" "✗" "Log functions should not use cross emoji" || return 1
    assert_not_contains "$output" "📁" "Log functions should not use folder emoji" || return 1
}

test_log_functions_no_bracket_tags() {
    local output
    output=$(. "$HELPERS_SCRIPT" && log_step "a" && log_ok "b" && { log_warn "c" 2>&1; } && { log_fail "d" 2>&1; })
    assert_not_contains "$output" "[INFO]" "Log functions should not use [INFO] bracket tag" || return 1
    assert_not_contains "$output" "[SUCCESS]" "Log functions should not use [SUCCESS] bracket tag" || return 1
    assert_not_contains "$output" "[WARN]" "Log functions should not use [WARN] bracket tag" || return 1
    assert_not_contains "$output" "[ERROR]" "Log functions should not use [ERROR] bracket tag" || return 1
}

test_log_step_has_indent() {
    local output
    output=$(. "$HELPERS_SCRIPT" && log_step "test")
    # Should have 2-space indent
    local line
    line=$(echo "$output" | head -1)
    assert_contains "$line" "  " \
        "log_step should have indentation"
}

test_log_ok_has_distinct_prefix() {
    local output
    output=$(. "$HELPERS_SCRIPT" && TERM=dumb log_ok "test")
    # log_ok should have a different visual indicator than log_step
    # We do not prescribe the exact character but it must not be ▸
    # In non-color mode, we can check that the prefix differs
    assert_not_contains "$output" "▸" \
        "log_ok should use a different prefix than log_step"
}


# ==========================================================================
# Test Suite: Color detection
# ==========================================================================

test_no_color_when_term_dumb() {
    # When TERM=dumb, output should not contain ANSI escape codes
    local output
    output=$(TERM=dumb . "$HELPERS_SCRIPT" && log_step "test")
    # ANSI escape starts with \033[ or \x1b[
    if echo "$output" | grep -qP '\x1b\[' 2>/dev/null || echo "$output" | grep -q $'\033\[' 2>/dev/null; then
        echo "  FAIL: Output contains ANSI escape codes when TERM=dumb"
        return 1
    fi
}

test_no_color_env_respected() {
    # NO_COLOR=1 should suppress color output
    local output
    output=$(NO_COLOR=1 . "$HELPERS_SCRIPT" && log_step "test")
    if echo "$output" | grep -qP '\x1b\[' 2>/dev/null || echo "$output" | grep -q $'\033\[' 2>/dev/null; then
        echo "  FAIL: Output contains ANSI escape codes when NO_COLOR=1"
        return 1
    fi
}


# ==========================================================================
# Run all tests
# ==========================================================================

echo ""
echo "=== visual-helpers.sh: Shared visual library tests ==="
echo ""

echo "--- File setup ---"
run_test "file exists" test_file_exists
run_test "file is executable" test_file_is_executable
run_test "source without side effects" test_source_without_side_effects
run_test "source exports all functions" test_source_exports_functions

echo ""
echo "--- Card rendering ---"
run_test "card header prints title" test_card_header_prints_title
run_test "card header prints heavy rule" test_card_header_prints_heavy_rule
run_test "card header title before rule" test_card_header_title_before_rule
run_test "card header has indent" test_card_header_has_indent
run_test "card footer prints heavy rule" test_card_footer_prints_heavy_rule
run_test "card header no emoji" test_card_header_no_emoji
run_test "card header no double-line box drawing" test_card_header_no_box_drawing_double

echo ""
echo "--- Gauge rendering ---"
run_test "gauge LANDED" test_gauge_landed
run_test "gauge ON_APPROACH" test_gauge_on_approach
run_test "gauge IN_FLIGHT" test_gauge_in_flight
run_test "gauge TAKING_OFF" test_gauge_taking_off
run_test "gauge TAXIING" test_gauge_taxiing
run_test "gauge FAULT" test_gauge_fault
run_test "gauge unknown state returns error" test_gauge_unknown_state_returns_error
run_test "gauge has 2-space indent" test_gauge_has_two_space_indent
run_test "gauge no emoji" test_gauge_no_emoji

echo ""
echo "--- Logging functions ---"
run_test "log_step outputs message" test_log_step_outputs_message
run_test "log_step has clean prefix" test_log_step_has_clean_prefix
run_test "log_ok outputs message" test_log_ok_outputs_message
run_test "log_warn outputs message" test_log_warn_outputs_message
run_test "log_fail outputs message" test_log_fail_outputs_message
run_test "log functions no emoji" test_log_functions_no_emoji
run_test "log functions no bracket tags" test_log_functions_no_bracket_tags
run_test "log_step has indent" test_log_step_has_indent
run_test "log_ok has distinct prefix" test_log_ok_has_distinct_prefix

echo ""
echo "--- Color detection ---"
run_test "no color when TERM=dumb" test_no_color_when_term_dumb
run_test "NO_COLOR env respected" test_no_color_env_respected

echo ""
echo "=== Results: $TESTS_PASSED/$TESTS_RUN passed, $TESTS_FAILED failed ==="

if [[ $TESTS_FAILED -gt 0 ]]; then
    echo ""
    echo "Failures:"
    echo -e "$FAILURES"
    exit 1
fi

exit 0
