#!/bin/bash
# Orchestration hook for coding agents (feature-developer, bug-fixer, refactoring-dev, integration-engineer)
# Outputs instructions for the orchestrator to follow after a coding agent completes

cat << 'EOF'
CODING AGENT COMPLETED. Execute quality gate protocol:

1. MANDATORY: Deploy test-runner agent with the worktree path from the agent output
2. Wait for test-runner results (BLOCKING)
3. If tests FAIL: Return to this coding agent with blocking_issues - DO NOT ask user
4. If tests PASS: Deploy code-reviewer AND security-auditor IN PARALLEL (single message, two Task calls)
5. If review/security FAIL: Return to coding agent with blocking_issues
6. If ALL gates PASS: Present to user for authorization, then deploy branch-manager

Max 3 iterations before user escalation. Do NOT prompt user during iteration loops.
EOF
