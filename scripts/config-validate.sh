#!/usr/bin/env bash
# Validate a Reaper configuration file against reaper.schema.json.
#
# Usage:
#   config-validate.sh [path/to/.reaper.yml] [--schema PATH] [--format json]
#
# Exit codes:
#   0 — clean (no errors)
#   1 — at least one error, or file/schema cannot be loaded
#
# Errors and warnings are printed to stderr by default. Use --format json to
# get a machine-readable {"errors": [...], "warnings": [...]} document on
# stdout.
#
# This script is a thin wrapper that hands the actual validation work to
# config-validate.mjs (Node, ajv, yaml). Keeping the bash layer minimal makes
# the validator portable: callers invoke it the same way regardless of how
# the JSON Schema validator is implemented underneath.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec node "${SCRIPT_DIR}/config-validate.mjs" "$@"
