#!/usr/bin/env bash
set -euo pipefail

# Link one or more existing issues as sub-issues of a parent.
# Resolves node IDs internally — callers only need issue numbers.
#
# Usage:
#   gh-link-sub-issues.sh <parent-number> <child-number> [<child-number>...]
#
# Examples:
#   gh-link-sub-issues.sh 10 11          # Link #11 as sub-issue of #10
#   gh-link-sub-issues.sh 10 11 12 13    # Bulk link #11, #12, #13 under #10

if [[ $# -lt 2 ]]; then
  echo "Usage: gh-link-sub-issues.sh <parent-number> <child-number> [<child-number>...]" >&2
  exit 1
fi

PARENT_NUMBER="$1"
shift
CHILD_NUMBERS=("$@")

# Resolve parent node ID once
PARENT_ID=$(gh issue view "$PARENT_NUMBER" --json id -q .id)
if [[ -z "$PARENT_ID" ]]; then
  echo "Error: Could not resolve node ID for issue #${PARENT_NUMBER}" >&2
  exit 1
fi

FAILED=0
LINKED=0

for CHILD_NUMBER in "${CHILD_NUMBERS[@]}"; do
  CHILD_ID=$(gh issue view "$CHILD_NUMBER" --json id -q .id 2>/dev/null || true)
  if [[ -z "$CHILD_ID" ]]; then
    echo "Warning: Could not resolve node ID for issue #${CHILD_NUMBER}, skipping" >&2
    FAILED=$((FAILED + 1))
    continue
  fi

  RESULT=$(gh api graphql -f query='
    mutation {
      addSubIssue(input: {issueId: "'"$PARENT_ID"'", subIssueId: "'"$CHILD_ID"'"}) {
        issue { id }
      }
    }
  ' 2>&1) || {
    echo "Warning: Failed to link #${CHILD_NUMBER} as sub-issue of #${PARENT_NUMBER}: ${RESULT}" >&2
    FAILED=$((FAILED + 1))
    continue
  }

  echo "Linked #${CHILD_NUMBER} as sub-issue of #${PARENT_NUMBER}"
  LINKED=$((LINKED + 1))
done

echo "Done: ${LINKED} linked, ${FAILED} failed"
[[ $FAILED -eq 0 ]] || exit 1
