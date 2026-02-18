#!/usr/bin/env bash
set -euo pipefail

# List sub-issues of a parent issue via GitHub's GraphQL API.
# Outputs JSON array of {number, title, state} objects.
#
# Usage:
#   gh-list-sub-issues.sh <parent-number>
#
# Examples:
#   gh-list-sub-issues.sh 10              # List sub-issues of #10
#   gh-list-sub-issues.sh 10 | jq '.'     # Pretty-print output

if [[ $# -lt 1 ]]; then
  echo "Usage: gh-list-sub-issues.sh <parent-number>" >&2
  exit 1
fi

PARENT_NUMBER="$1"

PARENT_ID=$(gh issue view "$PARENT_NUMBER" --json id -q .id)
if [[ -z "$PARENT_ID" ]]; then
  echo "Error: Could not resolve node ID for issue #${PARENT_NUMBER}" >&2
  exit 1
fi

# Note: Returns up to 50 sub-issues. Increase `first` if needed.
gh api graphql -f query='
  query {
    node(id: "'"$PARENT_ID"'") {
      ... on Issue {
        subIssues(first: 50) {
          nodes { number title state }
        }
      }
    }
  }
' --jq '.data.node.subIssues.nodes'
