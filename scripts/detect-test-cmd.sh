#!/usr/bin/env bash
# Detect the project's test command by inspecting the current working
# directory for ecosystem markers.
#
# Usage:   detect-test-cmd.sh
# Output:  best-guess test command on stdout, exit 0
#          empty stdout, exit 1 if nothing detected
#
# Detection precedence (most specific wins):
#   1. Node       — package.json with scripts.test (prefer test:coverage)
#   2. Python     — pyproject.toml / setup.cfg / pytest.ini → "pytest"
#   3. Go         — go.mod → "go test ./..."
#   4. Rust       — Cargo.toml → "cargo test"
#   5. Makefile   — `test:` target → "make test"
#
# Bash 3.x compatible. set -euo pipefail. All expansions quoted.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=./detect-helpers.sh
. "${SCRIPT_DIR}/detect-helpers.sh"

# 1. Node — prefer test:coverage when present, else fall back to npm test.
if [ -f "package.json" ]; then
  if has_node_script "test:coverage"; then
    echo "npm run test:coverage"
    exit 0
  fi
  if has_node_script "test"; then
    echo "npm test"
    exit 0
  fi
  # package.json present but no test script — keep probing other ecosystems.
fi

# 2. Python
if is_python_project && has_pytest_config; then
  echo "pytest"
  exit 0
fi
# Python project marker present without explicit pytest config still
# implies pytest in modern projects, but we stay conservative: require
# an explicit pytest config to recommend it.

# 3. Go
if [ -f "go.mod" ]; then
  echo "go test ./..."
  exit 0
fi

# 4. Rust
if [ -f "Cargo.toml" ]; then
  echo "cargo test"
  exit 0
fi

# 5. Makefile fallback
if has_makefile_target "test"; then
  echo "make test"
  exit 0
fi

# Nothing detected.
exit 1
