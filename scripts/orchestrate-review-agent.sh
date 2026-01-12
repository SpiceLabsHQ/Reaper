#!/bin/bash
# Orchestration hook for review agents (code-reviewer, security-auditor)
# Outputs instructions for the orchestrator based on review results

cat << 'EOF'
REVIEW AGENT COMPLETED. Check the gate_status in JSON output:

- If gate_status = "PASS": Check if the other review agent also passed (may be running in parallel)
- If gate_status = "FAIL": Return to coding agent with blocking_issues

Both code-reviewer AND security-auditor must PASS before presenting to user for authorization.
After user authorization, deploy branch-manager for git operations.
EOF
