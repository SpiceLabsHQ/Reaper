#!/usr/bin/env bash
# Render the "TDD Mandate" prompt section conditionally.
#
# Reads `workflow.require_tdd` from the project's .reaper.yml via
# scripts/config-get.sh. Default (per defaults.yml) is `true`.
#
# Behavior:
#   * value == "true"  -> print the TDD Red-Green-Blue mandate to stdout
#   * value == "false" -> print nothing to stdout
#   * config-get error -> warn on stderr and emit the section anyway (safe default)
#
# This script is invoked at template build time (via inline EJS exec) by
# src/agents/feature-developer.ejs to embed TDD instructions only when the
# project opts into TDD enforcement. Templates stay free of inline EJS
# conditionals; the policy lives here, where it can be tested.
#
# Output contract:
#   When emitted, this script owns the ENTIRE TDD section that
#   feature-developer.ejs needs -- the cycle subsection, the targeted-testing
#   guidance, the testing philosophy, and the test-runner grounding. The
#   .ejs deliberately has nothing about TDD around the renderScript call so
#   that the OFF state leaves no orphans (no dangling forward references, no
#   bare headings).
#
# Locations: this file lives at src/skills/code-review/scripts/ in the source
# tree and is copied verbatim by the build to skills/code-review/scripts/.
# The lookup walks upward to find a checkout root that contains
# scripts/config-get.sh, so both invocation sites work.
#
# Bash 3.x compatible: no associative arrays, no `[[ -v ]]`, no `mapfile`.

set -uo pipefail
# Note: intentionally NOT using `set -e`. We want to handle config-get
# failures explicitly with a fall-through to the safe default.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Locate scripts/config-get.sh by walking up. See render-security-gate-section.sh
# for the full rationale.
find_config_get() {
    local cur="$SCRIPT_DIR"
    local i=0
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

ENABLED="true"
if [ -n "${CONFIG_GET}" ] && [ -x "${CONFIG_GET}" ]; then
    if VAL="$("${CONFIG_GET}" workflow.require_tdd 2>/dev/null)"; then
        VAL="$(echo "$VAL" | tr -d '[:space:]')"
        if [ "$VAL" = "false" ]; then
            ENABLED="false"
        elif [ "$VAL" = "true" ]; then
            ENABLED="true"
        else
            echo "WARN: workflow.require_tdd config unreadable -- assuming true" >&2
            ENABLED="true"
        fi
    else
        echo "WARN: workflow.require_tdd config unreadable -- assuming true" >&2
        ENABLED="true"
    fi
else
    echo "WARN: workflow.require_tdd config unreadable -- assuming true" >&2
    ENABLED="true"
fi

if [ "$ENABLED" = "false" ]; then
    # Configurable opt-out: print nothing. Projects that disable TDD via
    # .reaper.yml accept that the implementation agent will not be required
    # to follow the Red-Green-Blue cycle for this run. The .ejs MUST NOT
    # add any TDD-related text around the renderScript invocation, or the
    # OFF state will leave orphan headings/references.
    exit 0
fi

# Enabled: emit the full TDD section. This output replaces what
# feature-developer.ejs previously inherited from the tdd-testing-protocol
# partial: the cycle, the testing philosophy, the targeted-execution
# examples, and the test-runner grounding statement that prevents role drift.
cat <<'EOF'
## TDD Protocol

### 2. TDD Cycle (Red-Green-Blue)

You MUST follow the Red-Green-Blue cycle for every behaviour change. This is
not negotiable when `workflow.require_tdd` is `true` (the default).

1. **RED** -- Write a failing test that captures the expected behaviour. The
   test must fail for the right reason (missing implementation), not a typo
   or import error. Run only the test you just authored to confirm RED.
2. **GREEN** -- Write the minimum production code required to make the test
   pass. Resist the urge to add un-tested behaviour during GREEN.
3. **BLUE** -- Refactor for clarity and SOLID compliance with the test still
   passing. No new behaviour, no new tests during BLUE.

When test-first is not practical (exploratory work, UI prototyping, spike
investigations), write tests immediately after implementation instead.

### Testing Philosophy

**Favor integration tests over unit tests.** Reserve unit tests for:
- Pure functions with complex logic
- Edge cases hard to trigger through integration tests

**Avoid brittle tests:**
- No string/snapshot matching for dynamic content
- No over-mocking -- test real behavior where feasible
- Test public interfaces, not private internals

### Targeted Testing Scope

**Test YOUR feature only -- not the full suite:**

```bash
# RED -- expected to FAIL
(cd ".claude/worktrees/[TASK_ID]-implementation" && npm test -- path/to/feature.test.js)

# GREEN -- expected to PASS
(cd ".claude/worktrees/[TASK_ID]-implementation" && npm test -- path/to/feature.test.js)

# BLUE -- still PASS after refactor
(cd ".claude/worktrees/[TASK_ID]-implementation" && npm test -- path/to/feature.test.js)
```

**Avoid full suite runs:**

```bash
(cd ".claude/worktrees/[TASK_ID]-implementation" && npm test)  # Runs full suite -- don't
(cd ".claude/worktrees/[TASK_ID]-implementation" && pytest)    # Runs full suite -- don't
```

**The test-runner agent handles full suite validation** -- focus on your
changes only. Do not pre-empt Gate 1 by running the project-wide suite
yourself; that is test-runner's role.
EOF
