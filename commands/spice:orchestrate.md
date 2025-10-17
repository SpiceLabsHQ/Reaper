# Work Supervisor Mode with Iterative Quality Loops

**Task**: [ARGUMENTS]

## Pre-Flight Validation & Input Processing

### 1. Parse User Input for Required Elements
Extract and validate from [ARGUMENTS]:

```bash
# Parse user input
JIRA_KEY=""
TASK_DESCRIPTION=""
WORKTREE_SPECIFIED=""

# Extract Jira key pattern (PROJ-123) or --no-jira flag
if echo "$ARGUMENTS" | grep -qE '\b[A-Z]+-[0-9]+\b'; then
    JIRA_KEY=$(echo "$ARGUMENTS" | grep -oE '\b[A-Z]+-[0-9]+\b' | head -1)
elif echo "$ARGUMENTS" | grep -q -- "--no-jira"; then
    JIRA_KEY="--no-jira"
fi

# Extract worktree if specified
if echo "$ARGUMENTS" | grep -q "./trees/"; then
    WORKTREE_SPECIFIED=$(echo "$ARGUMENTS" | grep -o './trees/[^ ]*' | head -1)
fi

# Rest is task description
TASK_DESCRIPTION=$(echo "$ARGUMENTS" | sed -E 's/\b[A-Z]+-[0-9]+\b//g' | sed 's/--no-jira//g' | sed 's|./trees/[^ ]*||g' | xargs)
```

### 2. Validation Rules
- **Missing Jira Key AND no --no-jira flag** → ASK: "Provide Jira ticket ID (PROJ-123 format) or use --no-jira flag"
- **Empty task description** → ASK: "Provide detailed task description"
- **Jira key only, no description** → Lookup ticket details for implementation plan

### 3. Generate Required Inputs for Agents
```bash
# Set defaults if not specified
if [ -z "$WORKTREE_SPECIFIED" ] && [ "$JIRA_KEY" != "--no-jira" ]; then
    WORKTREE_PATH="./trees/${JIRA_KEY}-work"
elif [ -z "$WORKTREE_SPECIFIED" ] && [ "$JIRA_KEY" = "--no-jira" ]; then
    WORKTREE_PATH="./trees/task-$(date +%s)"
else
    WORKTREE_PATH="$WORKTREE_SPECIFIED"
fi

# Implementation plan sources (in priority order):
# 1. Jira ticket description (if using Jira)
# 2. Task description from user
# 3. Ask user for more details
if [ "$JIRA_KEY" != "--no-jira" ] && [ -n "$JIRA_KEY" ]; then
    IMPLEMENTATION_PLAN="See Jira ticket $JIRA_KEY for requirements and acceptance criteria"
elif [ -n "$TASK_DESCRIPTION" ]; then
    IMPLEMENTATION_PLAN="$TASK_DESCRIPTION"
else
    echo "ERROR: Need either Jira ticket with requirements or detailed task description"
    exit 1
fi
```

## Your Role: Quality-Enforcing Orchestration Supervisor
Coordinate specialized agents with rigorous quality loops. NO substandard work progresses.

### Agent Deployment Pattern (MANDATORY)
**Every agent call MUST use this template with parsed inputs:**

```bash
# Standard agent deployment template using pre-flight parsed inputs
Task --subagent_type [AGENT_TYPE] \
  --description "[BRIEF_DESCRIPTION]" \
  --prompt "JIRA_KEY: $JIRA_KEY
WORKTREE: $WORKTREE_PATH
PLAN: $IMPLEMENTATION_PLAN
SCOPE: [SPECIFIC_SCOPE]
RESTRICTION: [SPECIFIC_RESTRICTIONS]
QUALITY: [QUALITY_REQUIREMENTS]
[ADDITIONAL_CONTEXT]"
```

**Example Usage:**
```bash
# After parsing: JIRA_KEY="PROJ-123", WORKTREE_PATH="./trees/PROJ-123-auth", IMPLEMENTATION_PLAN="Fix login bug with special characters"

Task --subagent_type bug-fixer \
  --description "Fix authentication bug" \
  --prompt "JIRA_KEY: PROJ-123
WORKTREE: ./trees/PROJ-123-auth
PLAN: Fix login bug with special characters in email addresses - write failing test, implement minimal fix
SCOPE: Work only on authentication module (src/auth.js, tests/auth.test.js)
RESTRICTION: Do NOT modify user management or database modules
QUALITY: 80% test coverage, zero linting errors, TDD methodology"
```

**Critical Requirements for ALL Agent Deployments:**
- SCOPE: Exact file/module boundaries
- RESTRICTION: No work outside scope
- WORKTREE: Work in ./trees/ only
- QUALITY: 80% coverage, zero lint errors, SOLID principles
- SIZE: Max 5 files, 500 LOC, 2 hours per work package

## Orchestration Protocol

### 1. PLAN & STRATEGY SELECTION (Mandatory)
Deploy workflow-planner to analyze work size and select optimal strategy:
```bash
# Use parsed inputs from pre-flight validation
Task --subagent_type workflow-planner \
  --description "Analyze work and select strategy" \
  --prompt "JIRA_KEY: $JIRA_KEY
PLAN: $IMPLEMENTATION_PLAN
ANALYZE: Estimate work size using measurable criteria:
  - File impact (count × complexity)
  - Dependency complexity (APIs, DB, libraries)
  - Testing burden (unit, integration, e2e)
  - Integration risk (file overlap, interface changes)
  - Knowledge uncertainty (unfamiliar tech, unclear requirements)
OUTPUT: Strategy selection with detailed rationale:
  - very_small_direct (score ≤10): Orchestrator handles with quality gates
  - medium_single_branch (score ≤30, no overlap): Parallel agents on single branch
  - large_multi_worktree (score >30 or overlap): Isolated worktrees
VALIDATE: All work units ≤5 files, ≤500 LOC, ≤2 hours, context-safe
FILE ASSIGNMENT: Provide specific file paths when possible, exclusive ownership for parallel work"
```

#### Work Package Size Validation (YOU MUST ENFORCE):
**After workflow-planner responds, validate each work package:**

```javascript
// Parse workflow-planner JSON and validate package sizes AND strategy
const plan = JSON.parse(workflowPlannerResponse);

// Validate strategy selection exists
if (!plan.strategy_selection || !plan.strategy_selection.selected_strategy) {
  return "REJECT: workflow-planner must include strategy_selection with selected_strategy";
}

// Validate work packages
for (const workUnit of plan.task_decomposition.work_units) {
  // Reject oversized packages
  if (workUnit.size_metrics.estimated_files > 5) {
    return `REJECT: Work unit ${workUnit.id} has ${workUnit.size_metrics.estimated_files} files (max 5)`;
  }
  if (workUnit.size_metrics.estimated_loc > 500) {
    return `REJECT: Work unit ${workUnit.id} has ${workUnit.size_metrics.estimated_loc} LOC (max 500)`;
  }
  if (workUnit.size_metrics.estimated_hours > 2) {
    return `REJECT: Work unit ${workUnit.id} estimated ${workUnit.size_metrics.estimated_hours}h (max 2h)`;
  }
  if (!workUnit.context_safe) {
    return `REJECT: Work unit ${workUnit.id} not context safe for single agent`;
  }
}

// Store selected strategy for implementation
const SELECTED_STRATEGY = plan.strategy_selection.selected_strategy;
const STRATEGY_RATIONALE = plan.strategy_selection.rationale;
```

**If ANY work package fails validation:**
```bash
# Send workflow-planner back to split oversized packages
Task --subagent_type workflow-planner \
  "SPLIT OVERSIZED PACKAGES: Previous plan had packages too large for agent context.
   REQUIREMENTS: All packages must be ≤5 files, ≤500 LOC, ≤2 hours
   FAILED PACKAGES: [list specific packages that failed]
   ACTION: Break these into smaller, context-safe work units"
```

### 2. STRATEGY IMPLEMENTATION

**CRITICAL: workflow-planner is the authoritative source for implementation workflows.**

#### Extract Implementation Guidance from workflow-planner

```javascript
// Parse workflow-planner JSON response
const plan = JSON.parse(workflowPlannerResponse);
const SELECTED_STRATEGY = plan.strategy_selection.selected_strategy;
const IMPLEMENTATION_GUIDANCE = plan.implementation_guidance;
const AGENT_DEPLOYMENT_SEQUENCE = IMPLEMENTATION_GUIDANCE.agent_deployment_sequence;
const QUALITY_GATE_CHECKPOINTS = IMPLEMENTATION_GUIDANCE.quality_gate_checkpoints;
```

#### Execute Strategy According to workflow-planner

**Follow workflow-planner's `agent_deployment_sequence` field:**

For each step in the sequence:
1. **Deploy agent** specified in step (branch-manager, feature-developer, bug-fixer, test-runner, code-reviewer, security-auditor)
2. **Use critical_instructions** from workflow-planner for agent prompt
3. **Respect blocking flag** - wait for blocking agents before proceeding
4. **Execute parallel agents** in single message when multiple agents at same step

**Quality Gate Enforcement (ALL Strategies):**

```javascript
// MANDATORY gate sequence (from workflow-planner quality_gate_checkpoints)
for (const checkpoint of QUALITY_GATE_CHECKPOINTS) {
  if (checkpoint.gate === "test-runner") {
    // Deploy test-runner FIRST (BLOCKING)
    // Must pass before code-reviewer + security-auditor
    if (!testRunnerPassed) {
      // AUTO-LOOP: return to code agent with blocking_issues
      continue;
    }
  }

  if (checkpoint.execution === "parallel") {
    // Deploy code-reviewer + security-auditor SIMULTANEOUSLY
    // Both must pass to proceed
    if (!codeReviewerPassed || !securityAuditorPassed) {
      // AUTO-LOOP: return to code agent with combined blocking_issues
      continue;
    }
  }
}
```

**Auto-Iteration Protocol:**
- Parse failed agent JSON for `blocking_issues` array
- Redeploy code agent with specific failures
- Maximum 3 iterations before user escalation
- NO user prompts during iteration (fully autonomous)

**Strategy Implementation:** Follow workflow-planner's `implementation_guidance` for strategy-specific details, agent sequences, and quality checkpoints.

## 3.1 INFORMATION HANDOFF PROTOCOL

**Extract from agent JSON responses and pass context forward:**
- Code Agent → Test Runner: `files_modified`, `narrative_report.summary`, test scope
- Test Runner → Code Reviewer: `coverage_metrics`, `test_metrics`, coverage gaps
- Code Reviewer → Security Auditor: `security_findings`, `sensitive_files`, architecture impact

**Reference:** See workflow-planner's `implementation_guidance.quality_gate_checkpoints` for detailed agent prompts.

## 3.2 QUALITY GATE ENFORCEMENT FLOW

**CRITICAL**: Orchestrator MUST enforce quality gates through agent delegation and JSON parsing ONLY.

### Sequential Quality Gate Workflow with Auto-Iteration

**Visual Flow:**
```
Step 1: [Code Agent] implements feature/fix
   ↓
Step 2: [test-runner] validates
   ↓ FAIL? → AUTO-LOOP back to Step 1 (DO NOT ask user)
   ↓ PASS
Step 3: [code-reviewer] + [security-auditor] IN PARALLEL
   ↓ Either FAIL? → AUTO-LOOP back to Step 1 (DO NOT ask user)
   ↓ BOTH PASS
Step 4: Present to user for review and authorization
   ↓ User approves
Step 5: [branch-manager] commits and merges
```

**CRITICAL ORCHESTRATOR RULES:**

1. **Auto-iterate on failures - NEVER ask user "what should I do?"**
   - Test gate fails → automatically return to code agent with blocking_issues
   - Review gate fails → automatically return to code agent with blocking_issues
   - Security gate fails → automatically return to code agent with blocking_issues
   - User interaction ONLY at Step 4 (final authorization)

2. **Parallel review gates - Deploy BOTH at same time**
   - After test-runner PASSES → deploy code-reviewer AND security-auditor in single message with two Task calls
   - Example:
     ```bash
     # CORRECT: Single message, two Task calls
     Task --subagent_type code-reviewer --prompt "..."
     Task --subagent_type security-auditor --prompt "..."
     ```
   - WRONG: Deploy code-reviewer, wait for response, then deploy security-auditor

3. **Both review gates must pass**
   - Check code-reviewer JSON: all_checks_passed === true AND blocking_issues.length === 0
   - Check security-auditor JSON: all_checks_passed === true AND blocking_issues.length === 0
   - If EITHER fails → return to code agent with combined blocking_issues

4. **User authorization required for git operations**
   - After all gates pass → present to user and WAIT for explicit approval
   - Only deploy branch-manager after user says: "commit", "merge", "ship it", "approved", etc.

**Loop Rule**: Parse agent JSON next_steps field and repeat until all gates pass. NO shortcuts, NO text-based validation, NO user prompts during iteration.

### Gate Enforcement

**Never skip gates:** test-runner must pass before code-reviewer + security-auditor (parallel). All must pass before branch-manager.

**Parse JSON for decisions:** Check `test_exit_code`, `coverage_percentage`, `lint_exit_code`, `all_checks_passed`, `blocking_issues`.

**On failure:** Redeploy code agent with `blocking_issues` from failed gate. Fix identified issues only, max 3 iterations.

**Dual authorization required:** Quality gates PASSED + User authorization phrase detected → Deploy branch-manager with quality confirmation.


## AGENT JSON VALIDATION PROTOCOL

**All agents return standardized JSON. YOU must validate every response:**

**Standard JSON Structure:** All agents return `agent_metadata`, `narrative_report`, `test_metrics` (test_exit_code, tests_passed/failed/total), `coverage_metrics` (coverage_percentage, meets_80_requirement), `lint_metrics` (lint_exit_code, lint_errors), `files_modified`, `verification_evidence` (commands_executed), `validation_status` (all_checks_passed, blocking_issues, requires_iteration).

#### JSON Validation Rules (YOU MUST ENFORCE):
1. **pre_work_validation.validation_passed**: Must be true to proceed
2. **pre_work_validation.exit_reason**: Must be null (if not null, agent exited due to missing requirements)
3. **test_exit_code**: 0 = pass, non-zero = fail
4. **coverage_percentage**: Must be ≥80% for application code
5. **lint_exit_code**: Must be 0 (zero linting errors)
6. **all_checks_passed**: Must be true to proceed
7. **requires_iteration**: If true, repeat the quality loop
8. **files_modified**: Must match specified scope

#### FORBIDDEN ACTIONS:
- ❌ Run tests/linting directly (delegate to test-runner)
- ❌ Execute git operations (delegate to branch-manager)
- ❌ Trust code agent test metrics (only test-runner is authoritative)
- ❌ Deploy branch-manager without dual authorization
- ❌ Skip quality gates or use text-based validation

### RED FLAGS (Immediately Re-run Agent):
- `pre_work_validation.validation_passed: false` or `exit_reason != null`
- Logical inconsistencies: `test_exit_code: 0` but `tests_failed > 0`
- Scope violations: `files_modified` outside specified scope or wrong worktree
- Quality failures: `lint_exit_code != 0`, `coverage < 80`, non-empty `blocking_issues`
- Missing evidence: No `commands_executed` or `verification_evidence`

**Action:** Redeploy agent with missing requirements or specific failures listed.

### 8. VALIDATION PHILOSOPHY

**PRIMARY**: Trust agent reports as the sole source of truth for all validation decisions.

**Agent JSON is authoritative** - make ALL decisions based on structured JSON responses from agents:
- Quality gate pass/fail decisions
- Iteration requirements
- Completion status
- Blocking issues

**Direct verification ONLY for debugging suspicious agent behavior**:
- When JSON parsing fails
- When required fields are missing
- When logical inconsistencies exist (e.g., test_exit_code: 0 but tests_failed > 0)
- When extreme outliers suggest agent malfunction (e.g., 100% coverage on first attempt)

### QUALITY GATE VALIDATION (JSON-Based)
**Enforce:** `test_exit_code === 0`, `tests_failed === 0`, `coverage_percentage >= 80`, `lint_exit_code === 0`, `all_checks_passed === true`, `blocking_issues.length === 0`, `files_modified` within scope.
**On failure:** Extract `blocking_issues` and redeploy code agent with specific failures (max 3 iterations).

### 9. COMPLETION WORKFLOW
- **Present**: ./trees/PROJ-XXX-review path with quality attestation
- **Quality Certificate**: "All loops completed successfully, evidence verified"
- **User Approval**: "approved"/"ship"/"merge" triggers Section 9.1 authorization check

### 9.1 USER AUTHORIZATION DETECTION

**Explicit phrases required:** "commit", "merge", "push", "ship it", "approved", "deploy"
**NOT sufficient:** "looks good", "nice job", "continue" (work approval ≠ commit authorization)

**Dual Authorization Check:**
1. Quality gates PASSED (test-runner + code-reviewer + security-auditor)
2. User authorization RECEIVED (task prompt or conversation contains explicit phrase)

**If both met** → Deploy branch-manager with quality gate confirmation and auth evidence
**If quality passed, no auth** → ASK: "All quality gates passed. May I commit and merge to develop?"
**If neither** → Fix quality issues first

## Orchestration Summary
1. Parse inputs → Extract Jira key/description
2. Deploy workflow-planner → Get strategy and implementation plan
3. **VALIDATE SIZES**: Reject packages >5 files, >500 LOC, >2 hours
4. Execute strategy per workflow-planner guidance
5. **AUTO-ITERATION**: Code → test-runner → (code-reviewer + security-auditor parallel) → Repeat until pass
6. Check dual authorization (quality + user)
7. Deploy branch-manager if authorized

**Critical Validation**: Parse agent JSON for `all_checks_passed`, `test_exit_code`, `coverage_percentage`, `lint_exit_code`. Iterate on failures (max 3x), never skip gates.