#!/usr/bin/env bash
# Detect the active task system from recent commit history and project files.
# Outputs one of: GitHub, Beads, Jira, markdown_only, unknown
#
# Detection strategy:
#   1. Recency-weighted commit scan (newest commit = highest weight)
#   2. Existing plan files in .claude/plans/
#   3. Unknown — LLM should ask the user
#
# Test seams:
#   DETECT_FIXTURE    Path to fixture file replacing git log output
#   DETECT_PLANS_DIR  Override plans directory (default: .claude/plans)

GITHUB_SCORE=0
BEADS_SCORE=0
JIRA_SCORE=0

get_log_data() {
  if [ -n "${DETECT_FIXTURE:-}" ]; then
    cat "$DETECT_FIXTURE"
  else
    git log --format="===COMMIT===%n%B" -10 2>/dev/null || true
  fi
}

PLANS_DIR="${DETECT_PLANS_DIR:-.claude/plans}"

# Body-buffering loop: accumulate each commit body, score on separator
COMMIT_NUM=0
WEIGHT=10
CURRENT_BODY=""

score_commit() {
  [ -z "$CURRENT_BODY" ] && return
  if echo "$CURRENT_BODY" | grep -qE '(Fixes|Closes|Resolves):?\s+#[0-9]+'; then
    GITHUB_SCORE=$((GITHUB_SCORE + WEIGHT))
  fi
  if echo "$CURRENT_BODY" | grep -qE '(Ref|Closes|Resolves):?\s+[a-z][a-z0-9]*-[a-f0-9]{2,}'; then
    BEADS_SCORE=$((BEADS_SCORE + WEIGHT))
  fi
  if echo "$CURRENT_BODY" | grep -qE '(Ref|Fixes|Closes|Resolves):?\s+[A-Z]{2,}-[0-9]+'; then
    JIRA_SCORE=$((JIRA_SCORE + WEIGHT))
  fi
}

while IFS= read -r line; do
  if [ "$line" = "===COMMIT===" ]; then
    if [ $COMMIT_NUM -gt 0 ]; then
      score_commit
      WEIGHT=$((WEIGHT - 1))
    fi
    COMMIT_NUM=$((COMMIT_NUM + 1))
    CURRENT_BODY=""
  else
    if [ -n "$CURRENT_BODY" ]; then
      CURRENT_BODY="${CURRENT_BODY}
${line}"
    else
      CURRENT_BODY="$line"
    fi
  fi
done < <(get_log_data)

# Score the final commit
score_commit

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
if compgen -G "${PLANS_DIR}/*.md" > /dev/null 2>&1; then
  echo "markdown_only"
  exit 0
fi

# Nothing detected
echo "unknown"
