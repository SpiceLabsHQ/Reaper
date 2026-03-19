#!/usr/bin/env bash
# Detect the active task system from recent commit history and project files.
# Outputs one of: GitHub, Beads, Jira, markdown_only, unknown
#
# Detection strategy:
#   1. Recency-weighted commit scan (newest commit = highest weight)
#   2. Existing plan files in .claude/plans/
#   3. Unknown — LLM should ask the user

GITHUB_SCORE=0
BEADS_SCORE=0
JIRA_SCORE=0

HASHES=$(git log --format="%H" -10 2>/dev/null) || HASHES=""

if [ -n "$HASHES" ]; then
  WEIGHT=10
  while IFS= read -r hash; do
    [ -z "$hash" ] && continue
    BODY=$(git log --format="%B" -n 1 "$hash" 2>/dev/null) || continue

    if echo "$BODY" | grep -qE '(Fixes|Closes|Resolves):?\s+#[0-9]+'; then
      GITHUB_SCORE=$((GITHUB_SCORE + WEIGHT))
    fi
    if echo "$BODY" | grep -qE '(Ref|Closes|Resolves):?\s+[a-z][a-z0-9]*-[a-f0-9]{2,}'; then
      BEADS_SCORE=$((BEADS_SCORE + WEIGHT))
    fi
    if echo "$BODY" | grep -qE '(Ref|Fixes|Closes|Resolves):?\s+[A-Z]{2,}-[0-9]+'; then
      JIRA_SCORE=$((JIRA_SCORE + WEIGHT))
    fi

    WEIGHT=$((WEIGHT - 1))
  done <<< "$HASHES"
fi

# Find the maximum score
MAX_SCORE=0
[ $GITHUB_SCORE -gt $MAX_SCORE ] && MAX_SCORE=$GITHUB_SCORE
[ $BEADS_SCORE -gt $MAX_SCORE ] && MAX_SCORE=$BEADS_SCORE
[ $JIRA_SCORE -gt $MAX_SCORE ] && MAX_SCORE=$JIRA_SCORE

if [ $MAX_SCORE -gt 0 ]; then
  WINNER_COUNT=0
  [ $GITHUB_SCORE -eq $MAX_SCORE ] && WINNER_COUNT=$((WINNER_COUNT + 1))
  [ $BEADS_SCORE -eq $MAX_SCORE ] && WINNER_COUNT=$((WINNER_COUNT + 1))
  [ $JIRA_SCORE -eq $MAX_SCORE ] && WINNER_COUNT=$((WINNER_COUNT + 1))

  if [ $WINNER_COUNT -eq 1 ]; then
    if [ $GITHUB_SCORE -eq $MAX_SCORE ]; then echo "GitHub"; exit 0; fi
    if [ $BEADS_SCORE -eq $MAX_SCORE ]; then echo "Beads"; exit 0; fi
    if [ $JIRA_SCORE -eq $MAX_SCORE ]; then echo "Jira"; exit 0; fi
  fi
  # Tied scores — fall through to plan file check
fi

# Fallback: check for existing plan files
if compgen -G ".claude/plans/*.md" > /dev/null 2>&1; then
  echo "markdown_only"
  exit 0
fi

# Nothing detected
echo "unknown"
