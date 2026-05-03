#!/usr/bin/env bash
# Shared probing helpers for detect-test-cmd.sh and detect-lint-cmd.sh.
#
# These functions inspect the current working directory ($PWD) — they do
# NOT take a directory argument. Callers should `cd` (or be invoked with
# the desired cwd) before sourcing.
#
# Bash 3.x compatible: no `[[ -v ]]`, no `mapfile`, no associative arrays.

# ----------------------------------------------------------------------
# has_node_script <script-name>
#   Returns 0 if package.json contains a top-level "scripts.<name>" entry.
#   Uses a grep-based probe; tolerates absent or malformed package.json.
# ----------------------------------------------------------------------
has_node_script() {
  local name="$1"
  [ -f "package.json" ] || return 1
  # Match "<name>": "..." anywhere in the scripts block. Reaper's own
  # package.json shows this is sufficient for real-world layouts.
  grep -qE "\"${name}\"[[:space:]]*:[[:space:]]*\"" package.json
}

# ----------------------------------------------------------------------
# has_makefile_target <target>
#   Returns 0 if Makefile defines a top-level target named <target>.
#   Matches lines like "test:" or "test :" (optionally with deps).
# ----------------------------------------------------------------------
has_makefile_target() {
  local target="$1"
  [ -f "Makefile" ] || return 1
  grep -qE "^${target}[[:space:]]*:" Makefile
}

# ----------------------------------------------------------------------
# has_pyproject_section <section>
#   Returns 0 if pyproject.toml contains a [<section>] header.
#   <section> is matched literally (caller passes e.g. "tool.ruff").
# ----------------------------------------------------------------------
has_pyproject_section() {
  local section="$1"
  [ -f "pyproject.toml" ] || return 1
  # Escape dots for grep — section names may contain them.
  local escaped
  escaped=$(printf '%s' "$section" | sed 's/\./\\./g')
  grep -qE "^\[${escaped}\]" pyproject.toml
}

# ----------------------------------------------------------------------
# is_python_project
#   Returns 0 if any standard Python project marker is present.
# ----------------------------------------------------------------------
is_python_project() {
  [ -f "pyproject.toml" ] || [ -f "setup.cfg" ] || [ -f "pytest.ini" ]
}

# ----------------------------------------------------------------------
# has_pytest_config
#   Returns 0 if any pytest configuration is present.
# ----------------------------------------------------------------------
has_pytest_config() {
  [ -f "pytest.ini" ] && return 0
  has_pyproject_section "tool.pytest.ini_options" && return 0
  if [ -f "setup.cfg" ] && grep -qE "^\[tool:pytest\]" setup.cfg; then
    return 0
  fi
  return 1
}
