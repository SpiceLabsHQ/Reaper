#!/bin/bash
# Orchestration hook for branch-manager agent
# Branch-manager is TERMINAL in the pipeline — no quality gate re-entry

cat << 'EOF'
BRANCH-MANAGER COMPLETED. This agent is TERMINAL in the pipeline.

Do NOT re-enter quality gates. The branch-manager runs AFTER all gates have passed.

Post-merge checklist:
1. If worktree was used: clean up with `git worktree remove ./trees/[TASK_ID]` (from project root)
2. If ticket tracking is active: close the ticket (bd close [TASK_ID] or acli jira workitem transition [TASK_ID] "Done")
3. Notify the user of completion with a summary of what was committed/merged
4. If Strategy 3 and more work units remain: proceed to next work unit in the plan

Do NOT deploy any further agents. Present results to the user.
EOF
