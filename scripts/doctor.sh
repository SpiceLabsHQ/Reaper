#!/usr/bin/env bash
# Validate .reaper.yml and report drift between configured and detected
# values.
#
# Usage:
#   doctor.sh [path/to/.reaper.yml]
#
# Exit codes:
#   0 — clean, or warnings only
#   1 — at least one error (schema invalid, missing required key,
#       unreachable test/lint command, file missing)
#
# Like config-validate.sh, this is a thin wrapper around the .mjs
# implementation. Keeping the bash layer minimal lets the command surface
# (commands/doctor.md) stay agent-tool-call-free: the EJS template
# inline-invokes this script and the script does all the work.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec node "${SCRIPT_DIR}/doctor.mjs" "$@"
