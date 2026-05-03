#!/usr/bin/env bash
# Render the "Security Gate Enforcement" prompt section conditionally.
#
# Reads `workflow.require_security_gate` from the project's .reaper.yml via
# scripts/config-get.sh. Default (per defaults.yml) is `true`.
#
# Behavior:
#   * value == "true"  -> print the security-gate prompt section to stdout
#   * value == "false" -> print nothing to stdout (no enforcement language)
#   * config-get error -> warn on stderr and emit the section anyway (safe default)
#
# This script is invoked at template build time (via inline EJS exec) by
# src/skills/code-review/SKILL.ejs and may also be invoked by Claude at
# runtime if the template embeds a runtime hook. The output must therefore
# be valid Markdown and self-contained.
#
# Locations: this file lives at src/skills/code-review/scripts/ in the source
# tree and is copied verbatim by the build to skills/code-review/scripts/.
# Both invocation sites work because we resolve config-get.sh by walking up
# from this script to find a checkout root that contains it.
#
# Bash 3.x compatible: no associative arrays, no `[[ -v ]]`, no `mapfile`.

set -uo pipefail
# Note: intentionally NOT using `set -e`. We want to handle config-get
# failures explicitly with a fall-through to the safe default.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Locate scripts/config-get.sh. The script may be invoked from either
#   src/skills/code-review/scripts/  (source tree)
# or
#   skills/code-review/scripts/      (built artifact)
# In both cases we walk up to find a sibling top-level scripts/ dir.
find_config_get() {
    local cur="$SCRIPT_DIR"
    local i=0
    # Walk up at most 6 levels, looking for scripts/config-get.sh.
    while [ $i -lt 6 ]; do
        if [ -x "$cur/scripts/config-get.sh" ]; then
            echo "$cur/scripts/config-get.sh"
            return 0
        fi
        local parent
        parent="$(dirname "$cur")"
        if [ "$parent" = "$cur" ]; then
            break
        fi
        cur="$parent"
        i=$((i + 1))
    done
    return 1
}

CONFIG_GET="$(find_config_get || true)"

# Resolve workflow.require_security_gate. On any error, warn to stderr and
# fall through to the safe default (treat as enabled).
ENABLED="true"
if [ -n "${CONFIG_GET}" ] && [ -x "${CONFIG_GET}" ]; then
    if VAL="$("${CONFIG_GET}" workflow.require_security_gate 2>/dev/null)"; then
        # Trim whitespace
        VAL="$(echo "$VAL" | tr -d '[:space:]')"
        if [ "$VAL" = "false" ]; then
            ENABLED="false"
        elif [ "$VAL" = "true" ]; then
            ENABLED="true"
        else
            echo "WARN: workflow.require_security_gate config unreadable -- assuming true" >&2
            ENABLED="true"
        fi
    else
        echo "WARN: workflow.require_security_gate config unreadable -- assuming true" >&2
        ENABLED="true"
    fi
else
    echo "WARN: workflow.require_security_gate config unreadable -- assuming true" >&2
    ENABLED="true"
fi

if [ "$ENABLED" = "false" ]; then
    # Configurable opt-out: print nothing. Reviewers who disable the security
    # gate via .reaper.yml accept full responsibility for any security review.
    exit 0
fi

# Enabled: emit the security-gate enforcement section.
cat <<'EOF'
## Security Gate Enforcement

This review feeds Reaper's quality-gate pipeline alongside the dedicated
`reaper:security-auditor` agent (Gate 3). Treat the following as authoritative
during your review:

- **Security vulnerabilities are blocking issues.** Any finding that exposes
  user data, weakens authentication, leaks secrets, or introduces injection
  risk MUST be added to `blocking_issues` -- never `non_blocking_notes`.
- **Do not defer to the security auditor for clear-cut violations.** If a
  vulnerability is obvious from the diff (hard-coded credentials, missing
  input validation on a privileged endpoint, broken authorization checks),
  block the work unit even though Gate 3 will run separately.
- **Trust but verify.** When `TEST_RUNNER_RESULTS` shows passing tests, you
  still must inspect security-sensitive code paths -- tests prove behavior,
  not absence of vulnerabilities.
EOF
