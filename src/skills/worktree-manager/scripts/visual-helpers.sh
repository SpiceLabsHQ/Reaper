#!/usr/bin/env bash
# visual-helpers.sh - Shared visual vocabulary library for worktree-manager scripts
#
# Implements the Reaper visual vocabulary: card rendering, gauge states, and
# clean logging functions. Source this file to use its functions.
#
# Usage:
#   SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
#   . "$SCRIPT_DIR/visual-helpers.sh"
#
# Functions:
#   render_card_header <TITLE>  - Print title + heavy rule card header
#   render_card_footer          - Print closing heavy rule
#   render_gauge <STATE>        - Print 10-block gauge bar for a state
#   log_step <message>          - Step indicator (neutral)
#   log_ok <message>            - Success indicator
#   log_warn <message>          - Warning indicator
#   log_fail <message>          - Error indicator
#
# Color support:
#   Colors are auto-detected via TERM and NO_COLOR. Set NO_COLOR=1 or
#   TERM=dumb to disable color output.

# --- Color detection ---
# Respect NO_COLOR (https://no-color.org/) and TERM=dumb
__vh_setup_colors() {
    if [[ "${NO_COLOR:-}" == "1" ]] || [[ "${TERM:-}" == "dumb" ]]; then
        __VH_RED=""
        __VH_GREEN=""
        __VH_YELLOW=""
        __VH_BLUE=""
        __VH_NC=""
    elif command -v tput >/dev/null 2>&1 && tput colors >/dev/null 2>&1; then
        __VH_RED=$(tput setaf 1)
        __VH_GREEN=$(tput setaf 2)
        __VH_YELLOW=$(tput setaf 3)
        __VH_BLUE=$(tput setaf 4)
        __VH_NC=$(tput sgr0)
    else
        __VH_RED='\033[0;31m'
        __VH_GREEN='\033[0;32m'
        __VH_YELLOW='\033[1;33m'
        __VH_BLUE='\033[0;34m'
        __VH_NC='\033[0m'
    fi
}

__vh_setup_colors

# --- Constants ---
__VH_HEAVY_RULE="━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# --- Card rendering ---

# Print a card header with title and heavy rule line
# Usage: render_card_header <TITLE>
render_card_header() {
    local title="${1:?render_card_header requires a TITLE argument}"
    echo "  ${title}"
    echo "  ${__VH_HEAVY_RULE}"
}

# Print a card footer (closing heavy rule line)
# Usage: render_card_footer
render_card_footer() {
    echo "  ${__VH_HEAVY_RULE}"
}

# --- Gauge rendering ---

# Print a 10-block gauge bar for a given state
# Usage: render_gauge <STATE>
# States: LANDED, ON_APPROACH, IN_FLIGHT, TAKING_OFF, TAXIING, FAULT
render_gauge() {
    local state="${1:?render_gauge requires a STATE argument}"
    local bar=""
    local label=""

    case "$state" in
        LANDED)
            bar="██████████"
            label="LANDED"
            ;;
        ON_APPROACH)
            bar="████████░░"
            label="ON APPROACH"
            ;;
        IN_FLIGHT)
            bar="██████░░░░"
            label="IN FLIGHT"
            ;;
        TAKING_OFF)
            bar="███░░░░░░░"
            label="TAKING OFF"
            ;;
        TAXIING)
            bar="░░░░░░░░░░"
            label="TAXIING"
            ;;
        FAULT)
            bar="░░░░!!░░░░"
            label="FAULT"
            ;;
        *)
            echo "render_gauge: unknown state '$state'" >&2
            return 1
            ;;
    esac

    echo "  ${bar}  ${label}"
}

# --- Logging functions ---
# Clean prefix convention: no emoji, no [BRACKET] tags
# All output uses 2-space indent with a minimal visual indicator

# Step indicator (neutral progress)
# Usage: log_step <message>
log_step() {
    echo -e "  ${__VH_BLUE}▸${__VH_NC} $*"
}

# Success indicator
# Usage: log_ok <message>
log_ok() {
    echo -e "  ${__VH_GREEN}+${__VH_NC} $*"
}

# Warning indicator
# Usage: log_warn <message>
log_warn() {
    echo -e "  ${__VH_YELLOW}~${__VH_NC} $*" >&2
}

# Error indicator
# Usage: log_fail <message>
log_fail() {
    echo -e "  ${__VH_RED}x${__VH_NC} $*" >&2
}
