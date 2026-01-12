#!/bin/bash
# Orchestration hook for test-runner agent
# Outputs instructions for the orchestrator based on test results

cat << 'EOF'
TEST-RUNNER COMPLETED. Check the gate_status in JSON output:

- If gate_status = "PASS": Deploy code-reviewer AND security-auditor IN PARALLEL (single message, two Task calls)
- If gate_status = "FAIL": Return to the original coding agent with blocking_issues from test output

Do NOT ask user during quality gate iteration. Auto-iterate up to 3 times.
EOF
