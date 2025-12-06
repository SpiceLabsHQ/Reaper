#!/usr/bin/env bash
set -euo pipefail

# Claude Code Attention Notification Script
# Sends Pushover notification when Claude needs attention
# Designed to work locally and in devcontainers

# --- Sound Notification (local ding) ---
play_notification_sound() {
    if [[ "$OSTYPE" == "darwin"* ]] && [[ -x /usr/bin/afplay ]]; then
        # macOS: Use system sound (run in background so it doesn't block)
        /usr/bin/afplay /System/Library/Sounds/Tink.aiff 2>/dev/null &
    else
        # Fallback: Terminal bell (works in most terminals including devcontainers)
        printf '\a'
    fi
}

# --- Project Context Detection ---
get_project_context() {
    local context=""

    # Try 1: Git branch + remote origin
    if command -v git &>/dev/null && git rev-parse --is-inside-work-tree &>/dev/null 2>&1; then
        local branch remote_url project_name=""
        branch=$(git symbolic-ref --short HEAD 2>/dev/null || git rev-parse --short HEAD 2>/dev/null || echo "")
        remote_url=$(git remote get-url origin 2>/dev/null || echo "")

        # Extract project name from remote URL
        if [[ -n "$remote_url" ]]; then
            project_name=$(basename -s .git "$remote_url" 2>/dev/null || echo "")
        fi

        if [[ -n "$project_name" && -n "$branch" ]]; then
            context="$project_name ($branch)"
        elif [[ -n "$project_name" ]]; then
            context="$project_name"
        elif [[ -n "$branch" ]]; then
            context="branch: $branch"
        fi
    fi

    # Try 2: PROJECT_NAME environment variable
    if [[ -z "$context" && -n "${PROJECT_NAME:-}" ]]; then
        context="$PROJECT_NAME"
    fi

    # Try 3: CLAUDE_PROJECT_DIR (set by Claude Code hooks)
    if [[ -z "$context" && -n "${CLAUDE_PROJECT_DIR:-}" ]]; then
        context=$(basename "$CLAUDE_PROJECT_DIR")
        # Avoid generic names like "workspace"
        if [[ "$context" == "workspace" || "$context" == "app" || "$context" == "src" ]]; then
            context=""
        fi
    fi

    # Fallback
    if [[ -z "$context" ]]; then
        context="Claude Code"
    fi

    echo "$context"
}

# --- Main ---
main() {
    local context message custom_message="${1:-}"

    # Build context first (useful for error messages too)
    context=$(get_project_context)

    # Build message with context on its own line (when available)
    if [[ "$context" == "Claude Code" ]]; then
        # No useful context available - just use message
        if [[ -n "$custom_message" ]]; then
            message="$custom_message"
        else
            message="Claude requires your attention"
        fi
    else
        # Context available - put on first line
        if [[ -n "$custom_message" ]]; then
            message="$context
$custom_message"
        else
            message="$context
Ready for your input"
        fi
    fi

    # Check for required Pushover credentials
    if [[ -z "${PUSHOVER_APP_TOKEN:-}" ]]; then
        echo "ERROR: PUSHOVER_APP_TOKEN environment variable is not set." >&2
        echo "Claude failed to notify user - missing Pushover app token." >&2
        echo "Set PUSHOVER_APP_TOKEN in your shell profile or devcontainer environment." >&2
        play_notification_sound
        exit 2  # Exit code 2 = blocking error shown to Claude
    fi

    if [[ -z "${PUSHOVER_USER_KEY:-}" ]]; then
        echo "ERROR: PUSHOVER_USER_KEY environment variable is not set." >&2
        echo "Claude failed to notify user - missing Pushover user key." >&2
        echo "Set PUSHOVER_USER_KEY in your shell profile or devcontainer environment." >&2
        play_notification_sound
        exit 2  # Exit code 2 = blocking error shown to Claude
    fi

    # Play local sound
    play_notification_sound

    # Send Pushover notification with error capture
    local http_code
    http_code=$(curl --silent \
        --write-out "%{http_code}" \
        --output /dev/null \
        --form-string "token=$PUSHOVER_APP_TOKEN" \
        --form-string "user=$PUSHOVER_USER_KEY" \
        --form-string "message=$message" \
        https://api.pushover.net/1/messages.json) || {
            echo "ERROR: curl command failed - network error or Pushover API unreachable." >&2
            echo "Claude failed to notify user via Pushover." >&2
            exit 2
        }

    if [[ "$http_code" != "200" ]]; then
        echo "ERROR: Pushover API returned HTTP $http_code." >&2
        echo "Claude failed to notify user - check PUSHOVER_APP_TOKEN and PUSHOVER_USER_KEY validity." >&2
        exit 2
    fi

    echo "Notification sent successfully: $message"
    exit 0
}

main "$@"
