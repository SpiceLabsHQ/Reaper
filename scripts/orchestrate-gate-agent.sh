#!/bin/bash
# Unified orchestration hook for all quality gate agents
# (test-runner, code-reviewer, security-auditor)
# Outputs instructions for the orchestrator based on gate results

cat << 'EOF'
GATE AGENT COMPLETED. Consult the quality gate protocol for next steps.

Check gate_status in the JSON output:
- If gate_status = "PASS": Proceed to the next gate in the profile sequence
- If gate_status = "FAIL": Return to the coding agent with blocking_issues

Apply differential retry limits per agent type. See the Gate Profile Lookup Table for the complete gate sequence.
EOF
