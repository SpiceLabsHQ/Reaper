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

### Input Scenario Examples
**The orchestrator handles these user input patterns:**

1. **Full specification**: `"PROJ-123 ./trees/PROJ-123-auth Fix login bug with special characters"`
   - JIRA_KEY="PROJ-123"
   - WORKTREE_PATH="./trees/PROJ-123-auth"
   - IMPLEMENTATION_PLAN="Fix login bug with special characters"

2. **Jira only**: `"PROJ-123"`
   - JIRA_KEY="PROJ-123"
   - WORKTREE_PATH="./trees/PROJ-123-work" (auto-generated)
   - IMPLEMENTATION_PLAN="See Jira ticket PROJ-123 for requirements"

3. **No Jira**: `"--no-jira Fix the auth system to handle edge cases"`
   - JIRA_KEY="--no-jira"
   - WORKTREE_PATH="./trees/task-1234567890" (timestamp)
   - IMPLEMENTATION_PLAN="Fix the auth system to handle edge cases"

4. **Missing requirements**: `"Fix something"`
   - ERROR: "Provide Jira ticket ID (PROJ-123 format) or use --no-jira flag"

## Critical Agent Instruction Template
**EVERY agent deployment MUST include these 4 critical instructions:**

1. **SCOPE**: Exact boundaries - "Work ONLY on [specific files/modules/features]"
2. **RESTRICTION**: "Do NOT modify anything outside specified scope"
3. **WORKTREE**: "Work in ./trees/PROJ-XXX-[component] directory ONLY"
4. **QUALITY STANDARDS**: "Must achieve 80% real test coverage, zero linting errors, SOLID principles"

## Iterative Quality Loop Architecture

```
[Coding Agent] → Test Runner Loop → Code Review Loop →
Consolidate → Test Runner Loop → Code Review Loop → Security Audit Loop → Final Approval
```

**Loop Rule**: Parse agent JSON and repeat until `validation_status.all_checks_passed: true` and all numeric metrics meet requirements. NO shortcuts or text-based validation.

**Size Validation Rule**: Never assign work packages >5 files, >500 LOC, or >2 hours to agents. Split oversized packages before implementation.

## Orchestration Protocol

### 1. PLAN (Mandatory)
Deploy workflow-planner to analyze and design consolidation strategy:
```bash
# Use parsed inputs from pre-flight validation
Task --subagent_type workflow-planner \
  --description "Plan implementation strategy" \
  --prompt "JIRA_KEY: $JIRA_KEY
WORKTREE: Work from root directory for planning
PLAN: $IMPLEMENTATION_PLAN
SCOPE: Analyze task for parallel opportunities and consolidation sequence
RESTRICTION: Do NOT implement anything, ONLY plan
QUALITY: Map file overlaps, identify conflict risks, design merge sequence
SIZE CONSTRAINTS: Each work package max 5 files, 500 LOC, 2 hours work
CONTEXT SAFETY: Ensure no package risks agent context exhaustion"
```

#### Work Package Size Validation (YOU MUST ENFORCE):
**After workflow-planner responds, validate each work package:**

```javascript
// Parse workflow-planner JSON and validate package sizes
const plan = JSON.parse(workflowPlannerResponse);
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

### 2. SETUP WORKTREES
Create worktree per work stream identified by planner:
```
Task --subagent_type branch-manager
"SCOPE: Create worktree for [STREAM] based on [ARGUMENTS]
RESTRICTION: Do NOT modify code, ONLY setup environment
WORKTREE: Create ./trees/PROJ-XXX-[component]
QUALITY: Install dependencies, validate environment ready"
```

### 3. IMPLEMENTATION LOOPS
Deploy coding agents with iterative quality validation:

#### 3a. Initial Implementation
```
Task --subagent_type [bug-fixer|feature-developer|refactoring-specialist]
"SCOPE: Implement [specific component/fix] for [ARGUMENTS]
RESTRICTION: Do NOT work outside [specified files/modules]
WORKTREE: Work in ./trees/PROJ-XXX-[component] ONLY
QUALITY: 80% real coverage, zero linting errors, SOLID principles, TDD methodology"
```

## 3.1 INFORMATION HANDOFF PROTOCOL

**Critical**: Orchestrator must extract and pass key information between agents for context.

### From Code Agents → Test Runner
Extract from code agent JSON and pass forward:
```
Task --subagent_type test-runner
"JIRA_KEY: [JIRA_KEY] (or --no-jira)
WORKTREE: ./trees/PROJ-XXX-[component]
PLAN: Validate [unit|integration|all] tests for [component] implementation

SCOPE: Validate testing for [component] implementation

CONTEXT FROM CODE AGENT:
- Files Modified: [response.files_modified]
- Feature Scope: [response.narrative_report.summary]
- Components Changed: [module names or areas from code agent]
- Test Strategy Needed: [unit|integration|both]
- Known Complexity Areas: [response.implementation_notes]

TEST_SCOPE: [unit only | integration only | all tests based on code changes]
INCLUDE_PATTERNS: [derive from files_modified - e.g., if src/auth/* changed, include tests/unit/auth/**]
EXCLUDE_PATTERNS: **/trees/**, **/*backup*/**, **/node_modules/** [+ standard exclusions]

EXPECTED_SCOPE:
- Test Type: [Unit | Integration | E2E | All]
- Expected File Count: Approximately [estimate based on modified files]
- Modified Components: [response.files_modified]

VALIDATION REQUIREMENTS:
- Detect nested directory test files (trees/, backup/)
- Preview test discovery before execution
- Verify scope matches modified components
- Warn about test misplacements

RESTRICTION: Do NOT modify business logic, ONLY test validation
QUALITY: Verify 80%+ real coverage (exclude dev tooling), all tests pass, linting clean"
```

### From Test Runner → Code Reviewer
Extract from test runner JSON and pass forward:
```
Task --subagent_type code-reviewer
"SCOPE: Review code quality for [component] implementation
CONTEXT FROM PREVIOUS AGENTS:
- Files Modified: [code_agent.files_modified]
- Test Coverage: [test_runner.coverage_metrics.coverage_percentage]%
- Coverage Gaps: [test_runner.coverage_gaps]
- Test Results: [test_runner.test_metrics.tests_passed]/[test_runner.test_metrics.tests_total] passed
- Areas of Concern: [test_runner.narrative_report.recommendations]
RESTRICTION: Do NOT implement features, ONLY review and recommend
WORKTREE: Review ./trees/PROJ-XXX-[component]
QUALITY: SOLID principles, security patterns, best practices, maintainability"
```

### From Code Reviewer → Security Auditor
Extract from code reviewer JSON and pass forward:
```
Task --subagent_type security-auditor
"SCOPE: Security vulnerability assessment for [component]
CONTEXT FROM PREVIOUS AGENTS:
- Files Modified: [code_agent.files_modified]
- Security Concerns Noted: [code_reviewer.security_findings]
- Sensitive Code Areas: [code_reviewer.sensitive_files]
- Architecture Changes: [code_reviewer.architecture_impact]
- Quality Issues: [code_reviewer.quality_metrics.critical_issues]
RESTRICTION: Focus on security vulnerabilities and compliance
WORKTREE: Audit ./trees/PROJ-XXX-[component]
QUALITY: Zero critical/high vulnerabilities, security best practices"
```

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

### Gate Enforcement Rules

**Rule 1: Never Skip Gates**
- ❌ NEVER proceed to code-reviewer if test-runner failed
- ❌ NEVER proceed to security-auditor if code-reviewer failed
- ❌ NEVER deploy branch-manager if any quality gate failed
- ✅ ALWAYS enforce sequential gate validation

**Rule 2: Parse Agent JSON for Gate Decisions**
```bash
# Test Gate Enforcement
TEST_GATE_PASSED=false
if [ "$TEST_EXIT_CODE" -eq 0 ] && [ "$COVERAGE" -ge 80 ] && [ "$LINT_EXIT_CODE" -eq 0 ]; then
  TEST_GATE_PASSED=true
  echo "✅ TEST GATE PASSED - proceeding to code-reviewer"
else
  echo "❌ TEST GATE FAILED - returning to code agent"
  echo "Blocking issues: test_exit_code=$TEST_EXIT_CODE, coverage=$COVERAGE%, lint_exit_code=$LINT_EXIT_CODE"
  # Deploy code agent again with blocking_issues from test-runner JSON
fi

# Code Review Gate Enforcement
REVIEW_GATE_PASSED=false
if [ "$ALL_CHECKS_PASSED" = "true" ] && [ "$BLOCKING_ISSUES_COUNT" -eq 0 ]; then
  REVIEW_GATE_PASSED=true
  echo "✅ REVIEW GATE PASSED - proceeding to security-auditor"
else
  echo "❌ REVIEW GATE FAILED - returning to code agent"
  # Deploy code agent again with blocking_issues from code-reviewer JSON
fi

# Security Gate Enforcement
SECURITY_GATE_PASSED=false
if [ "$ALL_CHECKS_PASSED" = "true" ] && [ "$CRITICAL_ISSUES_COUNT" -eq 0 ]; then
  SECURITY_GATE_PASSED=true
  echo "✅ SECURITY GATE PASSED - checking user authorization"
else
  echo "❌ SECURITY GATE FAILED - returning to code agent"
  # Deploy code agent again with blocking_issues from security-auditor JSON
fi
```

**Rule 3: Return to Code Agent on Gate Failure**
```bash
# When any gate fails, redeploy code agent with specific issues
Task --subagent_type [original-code-agent] \
  --description "Fix issues from quality gate failure" \
  --prompt "JIRA_KEY: $JIRA_KEY
WORKTREE: $WORKTREE_PATH
PLAN: Address blocking issues from [test-runner|code-reviewer|security-auditor]

BLOCKING ISSUES FROM QUALITY GATE:
[paste blocking_issues array from failed agent JSON]

SPECIFIC FAILURES:
- [list specific test failures, code quality issues, or security vulnerabilities]

SCOPE: Fix ONLY the identified issues, do not refactor unrelated code
RESTRICTION: Maintain existing functionality while addressing quality concerns
QUALITY: All quality gates must pass (tests, coverage, lint, code quality, security)"
```

**Rule 4: Dual Authorization for Git Operations**
```bash
# ONLY deploy branch-manager when BOTH conditions met:
# 1. All quality gates passed (verified above)
# 2. User authorization received (check task prompt or conversation)

QUALITY_GATES_PASSED=false
if [ "$TEST_GATE_PASSED" = "true" ] && [ "$REVIEW_GATE_PASSED" = "true" ] && [ "$SECURITY_GATE_PASSED" = "true" ]; then
  QUALITY_GATES_PASSED=true
fi

USER_AUTHORIZATION=false
if echo "$TASK_PROMPT" | grep -qiE "(commit|merge|push).*(to develop|changes)"; then
  USER_AUTHORIZATION=true
  echo "✅ User authorization found in task prompt"
elif echo "$CONVERSATION" | grep -qiE "commit|merge|push"; then
  USER_AUTHORIZATION=true
  echo "✅ User authorization found in conversation"
fi

# Deploy branch-manager ONLY if both authorizations met
if [ "$QUALITY_GATES_PASSED" = "true" ] && [ "$USER_AUTHORIZATION" = "true" ]; then
  echo "✅ DUAL AUTHORIZATION MET - deploying branch-manager"

  Task --subagent_type branch-manager \
    --description "Commit and merge to develop" \
    --prompt "JIRA_KEY: $JIRA_KEY
WORKTREE: $WORKTREE_PATH
OPERATION: Commit changes and merge feature branch to develop

QUALITY GATES CONFIRMATION:
- test-runner: PASSED (test_exit_code=0, coverage=${COVERAGE}%, lint_exit_code=0)
- code-reviewer: PASSED (all_checks_passed=true, blocking_issues=0)
- security-auditor: PASSED (all_checks_passed=true, critical_issues=0)

USER AUTHORIZATION:
- Source: [task prompt | conversation]
- Evidence: User explicitly requested commit/merge operation

DUAL AUTHORIZATION: MET - proceed with git operations
QUALITY: Create clean commit with proper message, merge to develop branch only"
else
  echo "❌ DUAL AUTHORIZATION NOT MET - cannot deploy branch-manager"
  if [ "$QUALITY_GATES_PASSED" != "true" ]; then
    echo "Missing: Quality gates passed"
  fi
  if [ "$USER_AUTHORIZATION" != "true" ]; then
    echo "Missing: User authorization to commit/merge"
    echo "ASK USER: May I commit and merge these changes to develop branch?"
  fi
fi
```

### Iteration Protocol

**When Gate Fails, Create Iteration Loop:**
1. Parse failed agent JSON for blocking_issues
2. Extract specific failures (test names, code quality violations, security issues)
3. Redeploy original code agent with:
   - Same JIRA_KEY and WORKTREE_PATH
   - Updated PLAN with "Fix blocking issues from [agent-name]"
   - Detailed BLOCKING_ISSUES list from failed agent JSON
   - Clear SCOPE limiting changes to fixing identified issues
4. After code agent completes fixes, restart quality gate sequence
5. Continue iteration until all gates pass OR user intervention required

**Maximum Iterations:**
- Allow up to 3 iteration loops before escalating to user
- After 3 failures, report: "Quality gates failing after 3 attempts. User review recommended for: [blocking_issues]"

#### 3b. Test Runner Quality Loop

**BEFORE deploying test-runner, specify test scope clearly:**

```
Task --subagent_type test-runner
"JIRA_KEY: $JIRA_KEY (or --no-jira)
WORKTREE: ./trees/PROJ-XXX-[component]
PLAN: Validate [unit|integration|all] tests for [component] implementation

TEST_SCOPE: [unit only | integration only | all tests]
INCLUDE_PATTERNS: [tests/unit/**, __tests__/unit/**, specific patterns if targeted]
EXCLUDE_PATTERNS: tests/integration/**, **/trees/**, **/*backup*/**, **/node_modules/** [+ project-specific]

EXPECTED_SCOPE:
- Test Type: [Unit | Integration | E2E | All]
- Expected File Count: Approximately [N] test files
- Modified Components: [list from code agent]

VALIDATION REQUIREMENTS:
- Detect and warn about nested directory test files (trees/, backup/)
- Preview test discovery before execution (show sample paths and count)
- Verify scope matches modified components from code agent
- Warn about potential test misplacements (e.g., integration tests in unit directories)

RESTRICTION: Do NOT modify business logic, ONLY test validation
QUALITY: Verify 80%+ real coverage (exclude dev tooling), all tests pass, linting clean"
```

**If test runner fails → Return to step 3a with specific failure details**

#### 3c. Code Review Quality Loop
```
Task --subagent_type code-reviewer
"SCOPE: Review code quality for [component] implementation
RESTRICTION: Do NOT implement features, ONLY review and recommend
WORKTREE: Review ./trees/PROJ-XXX-[component]
QUALITY: SOLID principles, security patterns, best practices, maintainability"
```

**If code review fails → Return to step 3a with specific quality issues**

### 4. CONSOLIDATION (After Individual Loops Pass)
Merge ALL parallel work into single review worktree:
```
Task --subagent_type branch-manager
"SCOPE: Create review worktree and merge all validated streams
RESTRICTION: Do NOT modify business logic during merge
WORKTREE: Create ./trees/PROJ-XXX-review
QUALITY: Resolve conflicts, maintain all quality standards, run integration tests"
```

### 5. FINAL VALIDATION LOOPS

#### 5a. Consolidated Test Runner Loop
```
Task --subagent_type test-runner
"SCOPE: Validate consolidated integration testing
RESTRICTION: Do NOT modify business logic
WORKTREE: Test in ./trees/PROJ-XXX-review
QUALITY: All tests pass, 80%+ coverage maintained, integration tests pass"
```

**If fails → Fix issues before proceeding**

#### 5b. Consolidated Code Review Loop
```
Task --subagent_type code-reviewer
"SCOPE: Final code review of consolidated work
RESTRICTION: Do NOT implement new features
WORKTREE: Review ./trees/PROJ-XXX-review
QUALITY: Architecture coherence, SOLID principles, integration quality"
```

**If fails → Fix issues before proceeding**

#### 5c. Security Audit Loop
```
Task --subagent_type security-auditor
"SCOPE: Security vulnerability assessment of consolidated work
RESTRICTION: Do NOT modify functionality during security fixes
WORKTREE: Audit ./trees/PROJ-XXX-review
QUALITY: Zero critical/high vulnerabilities, security best practices"
```

**If fails → Fix security issues, repeat from 5a**

### 6. AGENT JSON VALIDATION PROTOCOL

**All agents return standardized JSON. YOU must validate every response:**

#### STANDARDIZED JSON SCHEMA FROM ALL AGENTS:
**All agents MUST return JSON in this exact structure:**
```json
{
  "agent_metadata": {
    "agent_type": "bug-fixer|feature-developer|test-runner|code-reviewer|security-auditor",
    "agent_version": "1.0.0",
    "execution_id": "unique-identifier",
    "jira_key": "PROJ-123",
    "worktree_path": "./trees/PROJ-123-component",
    "timestamp": "2024-01-15T10:30:00Z"
  },
  "narrative_report": {
    "summary": "Brief human-readable summary of work completed",
    "details": "Detailed explanation of findings, approach, and results",
    "recommendations": "Actionable recommendations for next steps or issues found"
  },
  "test_metrics": {
    "tests_total": 147,
    "tests_passed": 145,
    "tests_failed": 2,
    "tests_skipped": 0,
    "tests_errored": 0,
    "test_exit_code": 1,
    "test_command": "npm test -- --coverage"
  },
  "coverage_metrics": {
    "coverage_percentage": 82.5,
    "lines": 82.5,
    "branches": 78.3,
    "functions": 85.1,
    "statements": 81.9,
    "meets_80_requirement": true
  },
  "lint_metrics": {
    "lint_errors": 0,
    "lint_warnings": 3,
    "lint_exit_code": 0,
    "lint_command": "npm run lint"
  },
  "files_modified": ["src/auth.js", "tests/auth.test.js"],
  "verification_evidence": {
    "test_output_file": "test-results.json",
    "coverage_report": "coverage/coverage-summary.json",
    "lint_output_file": "lint-results.json",
    "commands_executed": [
      {"command": "npm test", "exit_code": 1, "timestamp": "10:30:15"}
    ]
  },
  "validation_status": {
    "all_checks_passed": false,
    "blocking_issues": ["2 tests failed"],
    "ready_for_merge": false,
    "requires_iteration": true
  }
}
```

#### JSON Validation Rules (YOU MUST ENFORCE):
1. **pre_work_validation.validation_passed**: Must be true to proceed
2. **pre_work_validation.exit_reason**: Must be null (if not null, agent exited due to missing requirements)
3. **test_exit_code**: 0 = pass, non-zero = fail
4. **coverage_percentage**: Must be ≥80% for application code
5. **lint_exit_code**: Must be 0 (zero linting errors)
6. **all_checks_passed**: Must be true to proceed
7. **requires_iteration**: If true, repeat the quality loop
8. **files_modified**: Must match specified scope

#### CRITICAL: Validation Prohibitions (NEVER DO THESE):

**❌ FORBIDDEN ACTIONS - Orchestrator MUST NOT:**

1. **Run Tests Directly:**
   - ❌ NEVER run: `npm test`, `pytest`, `phpunit`, or any test command
   - ✅ ALWAYS delegate to test-runner agent
   - **Why**: test-runner is sole authoritative source for test metrics

2. **Run Linting Directly:**
   - ❌ NEVER run: `npm run lint`, `flake8`, `eslint`, or any linter
   - ✅ ALWAYS delegate to test-runner agent
   - **Why**: test-runner provides authoritative lint validation

3. **Execute Git Operations:**
   - ❌ NEVER run: `git add`, `git commit`, `git push`, `git merge`
   - ✅ ALWAYS delegate to branch-manager agent
   - **Why**: branch-manager has exclusive git authority and safety protocols

4. **Trust Code Agent Test Metrics:**
   - ❌ NEVER use test_metrics from feature-developer/bug-fixer/refactoring-specialist JSON
   - ✅ ALWAYS use test_metrics from test-runner JSON
   - **Why**: Code agents run tests for TDD feedback, not quality gate validation

5. **Deploy branch-manager Without Dual Authorization:**
   - ❌ NEVER deploy branch-manager unless (quality gates PASSED) AND (user authorization received)
   - ✅ ALWAYS verify both conditions before deployment
   - **Why**: Prevents premature commits and unauthorized git operations

**Trust Model:**
- **test-runner**: Sole authority for test/lint/coverage metrics
- **code-reviewer**: Sole authority for code quality verdict
- **security-auditor**: Sole authority for security assessment
- **branch-manager**: Sole authority for git operations
- **Code agents**: Write code and test during development (TDD feedback only)

### 7. RED FLAGS FOR AGENT JSON RESPONSES

**IMMEDIATELY REJECT and re-run agent if JSON shows:**

#### Pre-Work Validation Failures:
- `pre_work_validation.validation_passed: false`
- `pre_work_validation.exit_reason` is not null
- Missing `pre_work_validation` section entirely

#### Suspicious Test Claims:
- `test_exit_code: 0` but `tests_failed > 0`
- `coverage_percentage > 95` on first attempt
- `tests_total: 0` (no tests found/run)
- Missing `verification_evidence` section

#### Scope Violations:
- `files_modified` contains files outside specified scope
- `worktree_path` doesn't match assigned worktree
- Agent worked in root directory instead of worktree

#### Quality Failures:
- `lint_exit_code != 0` (linting errors present)
- `coverage_percentage < 80` for application code
- `all_checks_passed: true` but other metrics show failures
- `blocking_issues` array not empty

#### Missing Evidence:
- No `commands_executed` array
- Missing required output files
- `verification_evidence` section incomplete

**Action on Red Flags:**
```bash
# If pre-work validation failed, provide missing requirements
if [[ "$EXIT_REASON" != "null" ]]; then
  echo "Agent exited due to: $EXIT_REASON"
  echo "Providing missing requirements and retrying..."
  # Provide the missing JIRA_KEY, WORKTREE_PATH, or IMPLEMENTATION_PLAN
fi

# Send agent back to work with specific failures
Task --subagent_type [SAME_AGENT] \
  "JIRA_KEY: [JIRA_KEY] (or --no-jira)
   WORKTREE: [WORKTREE_PATH]
   PLAN: [IMPLEMENTATION_PLAN]
   RETRY: Previous attempt failed validation.
   SPECIFIC FAILURES: [list red flags found]
   SCOPE: [same scope as before]
   QUALITY: Fix the specific issues and provide valid JSON evidence"
```

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

### 8.1 QUALITY GATES (JSON-BASED VALIDATION)

**Parse agent JSON and enforce these requirements:**

#### Test Quality Gates:
```javascript
// Validate test metrics from agent JSON
if (response.test_metrics.test_exit_code !== 0) {
  return "FAIL: Tests not passing";
}
if (response.test_metrics.tests_failed > 0) {
  return "FAIL: " + response.test_metrics.tests_failed + " tests failed";
}
if (response.test_metrics.tests_total === 0) {
  return "FAIL: No tests found or executed";
}
```

#### Coverage Quality Gates:
```javascript
// Validate coverage from agent JSON
if (response.coverage_metrics.coverage_percentage < 80) {
  return "FAIL: Coverage " + response.coverage_metrics.coverage_percentage + "% below 80%";
}
if (!response.coverage_metrics.meets_80_requirement) {
  return "FAIL: Coverage requirement not met";
}
```

#### Linting Quality Gates:
```javascript
// Validate linting from agent JSON
if (response.lint_metrics.lint_exit_code !== 0) {
  return "FAIL: Linting errors present";
}
if (response.lint_metrics.lint_errors > 0) {
  return "FAIL: " + response.lint_metrics.lint_errors + " linting errors";
}
```

#### Scope Quality Gates:
```javascript
// Validate scope adherence from agent JSON
const allowedFiles = getExpectedScope(); // from your planning
const modifiedFiles = response.files_modified;
if (!modifiedFiles.every(file => allowedFiles.includes(file))) {
  return "FAIL: Work outside specified scope";
}
```

#### Overall Validation:
```javascript
// Final validation from agent JSON
if (!response.validation_status.all_checks_passed) {
  return "FAIL: Agent reports validation failures: " +
         JSON.stringify(response.validation_status.blocking_issues);
}
if (response.validation_status.requires_iteration) {
  return "ITERATION_REQUIRED: " +
         JSON.stringify(response.validation_status.blocking_issues);
}
```

### 9. COMPLETION WORKFLOW
- **Present**: ./trees/PROJ-XXX-review path with quality attestation
- **Quality Certificate**: "All loops completed successfully, evidence verified"
- **User Approval**: "approved"/"ship"/"merge" triggers Section 9.1 authorization check

### 9.1 USER AUTHORIZATION DETECTION

**CRITICAL**: Before deploying branch-manager, orchestrator MUST detect and verify user authorization to commit/merge.

#### Authorization Detection Patterns

**Check Task Definition First:**
```bash
# User authorization in initial task prompt
if echo "$ARGUMENTS" | grep -qiE "(commit|merge|push).*(to develop|changes|code)"; then
  USER_AUTHORIZATION="task_definition"
  AUTH_EVIDENCE="Task prompt contains explicit commit/merge instruction: $ARGUMENTS"
  echo "✅ Authorization Source: Task Definition"
fi
```

**Check Conversation History:**
```bash
# User authorization in conversation
if echo "$CONVERSATION_HISTORY" | grep -qiE "\b(commit|merge|push|ship|approved?|deploy)\b"; then
  USER_AUTHORIZATION="conversation"
  AUTH_EVIDENCE="User provided authorization in conversation"
  echo "✅ Authorization Source: Conversation"
fi
```

**Explicit Authorization Phrases:**
- "commit it"
- "commit the changes"
- "merge to develop"
- "push the code"
- "ship it"
- "approved"
- "deploy it"
- "go ahead and commit"
- "ready to merge"

**Implicit Authorization (NOT sufficient):**
- ❌ "looks good" (approval of work, not authorization to commit)
- ❌ "nice job" (praise, not authorization)
- ❌ "continue" (proceed with workflow, not commit authorization)
- ❌ "finish the task" (ambiguous, not explicit commit instruction)

#### Authorization Validation Flow

```bash
# Step 1: Check for authorization evidence
USER_AUTHORIZATION=false
AUTH_EVIDENCE=""

if echo "$ARGUMENTS" | grep -qiE "(commit|merge|push).*(develop|changes)"; then
  USER_AUTHORIZATION=true
  AUTH_EVIDENCE="Task definition: User requested commit/merge operation"
elif echo "$CONVERSATION" | grep -qiE "\b(commit it|merge|push|ship it|approved)\b"; then
  USER_AUTHORIZATION=true
  AUTH_EVIDENCE="Conversation: User explicitly authorized commit/merge"
fi

# Step 2: Verify quality gates passed
QUALITY_GATES_PASSED=false
if [ "$TEST_GATE" = "PASSED" ] && [ "$REVIEW_GATE" = "PASSED" ] && [ "$SECURITY_GATE" = "PASSED" ]; then
  QUALITY_GATES_PASSED=true
fi

# Step 3: Deploy branch-manager ONLY if dual authorization met
if [ "$QUALITY_GATES_PASSED" = "true" ] && [ "$USER_AUTHORIZATION" = "true" ]; then
  echo "✅ DUAL AUTHORIZATION VERIFIED"
  echo "  - Quality Gates: PASSED (test-runner, code-reviewer, security-auditor)"
  echo "  - User Authorization: RECEIVED ($AUTH_EVIDENCE)"

  Task --subagent_type branch-manager \
    --description "Commit and merge to develop" \
    --prompt "JIRA_KEY: $JIRA_KEY
WORKTREE: $WORKTREE_PATH
OPERATION: Commit changes and merge to develop branch

QUALITY GATES CONFIRMATION:
- test-runner: PASSED (exit_code=0, coverage=X%, lint=clean)
- code-reviewer: PASSED (all_checks_passed=true, blocking_issues=0)
- security-auditor: PASSED (all_checks_passed=true, critical_issues=0)

USER AUTHORIZATION EVIDENCE:
$AUTH_EVIDENCE

DUAL AUTHORIZATION: MET
RESTRICTION: Commit and merge to develop ONLY (not main)
QUALITY: Clean commit with proper message, merge with --no-ff, push to origin/develop"

elif [ "$QUALITY_GATES_PASSED" = "true" ] && [ "$USER_AUTHORIZATION" != "true" ]; then
  echo "⚠️ QUALITY GATES PASSED but USER AUTHORIZATION MISSING"
  echo "Quality: All gates passed successfully"
  echo "Authorization: No explicit commit/merge instruction detected"
  echo ""
  echo "ASK USER: All quality gates have passed. May I commit and merge these changes to the develop branch?"
  # WAIT for user response before proceeding

elif [ "$QUALITY_GATES_PASSED" != "true" ]; then
  echo "❌ QUALITY GATES NOT PASSED - cannot request authorization yet"
  echo "Fix quality issues first, then check authorization"
fi
```

#### Authorization Edge Cases

**Case 1: Quality passed, no authorization**
```
Orchestrator: "All quality gates passed! Tests: ✅ Review: ✅ Security: ✅
May I commit and merge these changes to develop branch?"
User: "yes" → Proceed with branch-manager
User: "not yet" → Wait for future authorization
```

**Case 2: Authorization early, quality not passed**
```
User: "commit it when ready"
Orchestrator: Quality gates must pass first
→ Run quality gate sequence
→ If all pass, use early authorization
→ If any fail, fix issues before using authorization
```

**Case 3: Unclear authorization**
```
User: "looks good"
Orchestrator: Interpret as approval of work quality, NOT commit authorization
→ ASK: "May I commit and merge to develop branch?"
```

#### branch-manager Deployment Template

```bash
Task --subagent_type branch-manager \
  --description "Commit and merge to develop" \
  --prompt "JIRA_KEY: $JIRA_KEY
WORKTREE: $WORKTREE_PATH
OPERATION: Commit changes and merge feature branch to develop

QUALITY GATES CONFIRMATION (from orchestrator validation):
- test-runner: PASSED
  * test_exit_code: 0
  * coverage_percentage: ${COVERAGE}% (>= 80%)
  * lint_exit_code: 0
- code-reviewer: PASSED
  * all_checks_passed: true
  * blocking_issues: 0
- security-auditor: PASSED
  * all_checks_passed: true
  * critical_issues: 0

USER AUTHORIZATION EVIDENCE:
- Source: ${AUTH_SOURCE}
- Evidence: ${AUTH_EVIDENCE}
- Timestamp: ${AUTH_TIMESTAMP}

DUAL AUTHORIZATION STATUS: MET
Both conditions satisfied:
1. Quality gates PASSED ✅
2. User authorization RECEIVED ✅

OPERATION INSTRUCTIONS:
- Create clean commit with conventional commit format
- Merge to develop branch only (NOT main)
- Push to origin/develop
- Update Jira status to 'Done' (if using Jira)
- Clean up worktree after successful merge

RESTRICTION: No code changes, git operations only
QUALITY: Professional commit message, proper merge commit, audit trail"
```

## Execution Summary
1. Parse [ARGUMENTS] → Extract Jira key and description
2. Lookup Jira details (including child tickets)
3. Plan with workflow-planner (parallel opportunities + consolidation)
4. **VALIDATE PACKAGE SIZES**: Ensure all work packages are context-safe
5. Setup worktrees per stream (only for validated packages)
6. **IMPLEMENTATION LOOPS**: Code → Test → Review → Repeat until pass
7. Consolidate only validated work
8. **FINAL VALIDATION LOOPS**: Test → Review → Security → Repeat until pass
9. Verify all evidence independently
10. Present single quality-certified worktree
11. Post-approval: commit, merge, cleanup

**CRITICAL JSON VALIDATION PRINCIPLES**:
- Parse and validate every agent JSON response
- Never trust agent self-assessment without checking metrics
- Use exit codes and numeric values, not text claims
- **Validate work package sizes before assigning to agents**
- **Reject oversized packages that risk context exhaustion**
- Enforce quality gates through JSON data validation
- Reject work with red flags and iterate until JSON shows success
- Only consolidate work with valid JSON showing all_checks_passed: true

#### Sample Validation Logic:
```bash
# Extract and validate key metrics from agent JSON
PRE_WORK_PASSED=$(echo "$AGENT_JSON" | jq '.pre_work_validation.validation_passed')
EXIT_REASON=$(echo "$AGENT_JSON" | jq -r '.pre_work_validation.exit_reason')
TEST_EXIT=$(echo "$AGENT_JSON" | jq '.test_metrics.test_exit_code')
COVERAGE=$(echo "$AGENT_JSON" | jq '.coverage_metrics.coverage_percentage')
LINT_EXIT=$(echo "$AGENT_JSON" | jq '.lint_metrics.lint_exit_code')
ALL_PASSED=$(echo "$AGENT_JSON" | jq '.validation_status.all_checks_passed')

# Validate pre-work first
[ "$PRE_WORK_PASSED" != "true" ] && echo "FAIL: Pre-work validation failed: $EXIT_REASON" && exit 1
[ "$EXIT_REASON" != "null" ] && echo "FAIL: Agent exited due to: $EXIT_REASON" && exit 1

# Validate each metric
[ "$TEST_EXIT" != "0" ] && echo "FAIL: Tests failed with exit code $TEST_EXIT" && exit 1
[ "$(echo "$COVERAGE < 80" | bc)" = "1" ] && echo "FAIL: Coverage $COVERAGE% below 80%" && exit 1
[ "$LINT_EXIT" != "0" ] && echo "FAIL: Linting failed with exit code $LINT_EXIT" && exit 1
[ "$ALL_PASSED" != "true" ] && echo "FAIL: Agent validation failed" && exit 1

echo "PASS: Agent work validated successfully"
```