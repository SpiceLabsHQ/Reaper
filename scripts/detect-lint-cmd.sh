#!/usr/bin/env bash
# Detect the project's lint command by inspecting the current working
# directory for ecosystem markers.
#
# Usage:   detect-lint-cmd.sh
# Output:  best-guess lint command on stdout, exit 0
#          empty stdout, exit 1 if nothing detected
#
# Detection precedence (most specific wins):
#   1. Node       — package.json scripts.lint, else eslint config → "npx eslint ."
#   2. Python     — pyproject.toml [tool.ruff] / ruff.toml → "ruff check ."
#                   else [tool.pylint] / .pylintrc       → "pylint ."
#                   else flake8 config                    → "flake8"
#   3. Go         — golangci config → "golangci-lint run", else "go vet ./..."
#   4. Rust       — Cargo.toml → "cargo clippy"
#   5. Makefile   — `lint:` target → "make lint"
#
# Bash 3.x compatible. set -euo pipefail. All expansions quoted.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=./detect-helpers.sh
. "${SCRIPT_DIR}/detect-helpers.sh"

# 1. Node
if [ -f "package.json" ]; then
  if has_node_script "lint"; then
    echo "npm run lint"
    exit 0
  fi
  # No script entry — check for an eslint config file.
  for cfg in eslint.config.js eslint.config.mjs eslint.config.cjs \
             .eslintrc .eslintrc.js .eslintrc.cjs .eslintrc.json .eslintrc.yml .eslintrc.yaml; do
    if [ -f "$cfg" ]; then
      echo "npx eslint ."
      exit 0
    fi
  done
  # package.json present but no lint hint — keep probing.
fi

# 2. Python
if [ -f "ruff.toml" ] || has_pyproject_section "tool.ruff"; then
  echo "ruff check ."
  exit 0
fi
if [ -f ".pylintrc" ] || has_pyproject_section "tool.pylint"; then
  echo "pylint ."
  exit 0
fi
if [ -f ".flake8" ] || has_pyproject_section "tool.flake8"; then
  echo "flake8"
  exit 0
fi

# 3. Go
if [ -f ".golangci.yml" ] || [ -f ".golangci.yaml" ] || [ -f ".golangci.toml" ]; then
  echo "golangci-lint run"
  exit 0
fi
if [ -f "go.mod" ]; then
  echo "go vet ./..."
  exit 0
fi

# 4. Rust
if [ -f "Cargo.toml" ]; then
  echo "cargo clippy"
  exit 0
fi

# 5. Makefile fallback
if has_makefile_target "lint"; then
  echo "make lint"
  exit 0
fi

# Nothing detected.
exit 1
