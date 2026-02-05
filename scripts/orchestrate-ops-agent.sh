#!/bin/bash
# Orchestration hook for ops agents (performance-engineer, deployment-engineer, incident-responder)
# Ops agents do operational work, not code changes — no quality gate re-entry

cat << 'EOF'
OPS AGENT COMPLETED. Review the agent's JSON output.

Do NOT re-enter quality gates. Ops agents perform operational work (profiling, deployment config,
incident remediation) that follows a different validation path than coding agents.

Next steps based on output:
1. If the agent produced code changes (hotfix, optimization, pipeline config):
   - Ask the user whether to run quality gates on the changes
   - Only deploy test-runner if the user confirms
2. If the agent produced analysis/recommendations only (no file changes):
   - Present findings to the user
   - No further agents needed
3. If unfinished items exist:
   - Present blockers to the user for guidance
   - Do NOT auto-iterate without user input

Present the agent's results to the user and await further instructions.
EOF
