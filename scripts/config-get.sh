#!/usr/bin/env bash
# Read a Reaper configuration value with a layered resolution chain.
#
# Usage:
#   config-get.sh <dot.path.key> [--default VAL] [--fallback-script PATH] [--format json]
#
# Resolution chain:
#   1. ./.reaper.yml             (user config in cwd)
#   2. defaults.yml              (alongside this script's parent directory)
#   3. --fallback-script PATH    (executed; stdout becomes the value)
#   4. --default VAL             (literal fallback)
#   5. stderr "Run /reaper:init …" + exit 1
#
# --default takes precedence over --fallback-script when both are supplied.
#
# This script is a thin wrapper around config-get.mjs (Node, yaml). Bash 3.x
# compatible: no `[[ -v ]]`, no `mapfile`, no associative arrays.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec node "${SCRIPT_DIR}/config-get.mjs" "$@"
