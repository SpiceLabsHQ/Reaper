#!/usr/bin/env bash
# List GitHub Projects v2 linked to the current repo.
# Outputs a human-readable summary for prompt injection.

OWNER=$(gh repo view --json owner -q .owner.login 2>/dev/null)
NAME=$(gh repo view --json name -q .name 2>/dev/null)

if [[ -z "$OWNER" || -z "$NAME" ]]; then
  echo "unavailable (could not determine repo)"
  exit 0
fi

RESULT=$(gh api graphql \
  -f query='query($owner:String!,$name:String!){repository(owner:$owner,name:$name){projectsV2(first:10){nodes{number title}}}}' \
  -f owner="$OWNER" \
  -f name="$NAME" 2>&1)

if echo "$RESULT" | grep -q "INSUFFICIENT_SCOPES"; then
  echo "unknown (token missing read:project scope — run: gh auth refresh -s read:project)"
  exit 0
fi

echo "$RESULT" | jq -r '
  .data.repository.projectsV2.nodes
  | if length > 0
    then "Configured — " + ([.[] | "#\(.number) \(.title)"] | join(", "))
    else "None — use tracking issues for workflow management"
    end
' 2>/dev/null || echo "unavailable"
