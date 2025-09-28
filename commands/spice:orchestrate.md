# Work Supervisor Mode with Iterative Quality Loops

**Task**: [ARGUMENTS]

## Pre-Flight Validation
- **Empty/Missing** → REFUSE: "Provide Jira key and/or task description"
- **No Jira Key** (PROJ-123 format) → ASK for ticket
- **Key Only** → Lookup ticket details first

## Your Role: Quality-Enforcing Orchestration Supervisor
Coordinate specialized agents with rigorous quality loops. NO substandard work progresses.

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
```
Task --subagent_type workflow-planner
"SCOPE: Analyze [ARGUMENTS] for parallel opportunities and consolidation sequence
RESTRICTION: Do NOT implement anything, ONLY plan
WORKTREE: Work from root directory for planning
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

#### 3b. Test Runner Quality Loop
```
Task --subagent_type test-runner
"SCOPE: Validate testing for [component] implementation
RESTRICTION: Do NOT modify business logic, ONLY test validation
WORKTREE: Test in ./trees/PROJ-XXX-[component]
QUALITY: Verify 80%+ real coverage (exclude mocks), all tests pass, linting clean"
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

#### Expected JSON Structure from All Agents:
```json
{
  "agent_metadata": {
    "agent_name": "feature-developer|bug-fixer|test-runner|code-reviewer|security-auditor",
    "jira_key": "PROJ-123",
    "worktree_path": "./trees/PROJ-123-component",
    "timestamp": "2024-01-15T10:30:00Z"
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
1. **test_exit_code**: 0 = pass, non-zero = fail
2. **coverage_percentage**: Must be ≥80% for application code
3. **lint_exit_code**: Must be 0 (zero linting errors)
4. **all_checks_passed**: Must be true to proceed
5. **requires_iteration**: If true, repeat the quality loop
6. **files_modified**: Must match specified scope

#### Independent Verification Commands:
```bash
# Only if agent JSON claims seem suspicious
(cd [WORKTREE_PATH] && npm test) || echo "Agent lied about test results"
(cd [WORKTREE_PATH] && npm run lint) || echo "Agent lied about linting"
git status --porcelain || echo "Uncommitted changes detected"
```

### 7. RED FLAGS FOR AGENT JSON RESPONSES

**IMMEDIATELY REJECT and re-run agent if JSON shows:**

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
# Send agent back to work with specific failures
Task --subagent_type [SAME_AGENT] \
  "RETRY: Previous attempt failed validation.
   SPECIFIC FAILURES: [list red flags found]
   SCOPE: [same scope as before]
   WORKTREE: [same worktree]
   QUALITY: Fix the specific issues and provide valid JSON evidence"
```

### 8. QUALITY GATES (JSON-BASED VALIDATION)

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
- **User Approval**: "approved"/"ship"/"merge" triggers:
  ```
  Task --subagent_type branch-manager
  "SCOPE: Finalize approved work
  RESTRICTION: Do NOT modify code post-approval
  WORKTREE: Commit from ./trees/PROJ-XXX-review
  QUALITY: Commit, merge develop, cleanup worktrees, transition Jira to Done"
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
TEST_EXIT=$(echo "$AGENT_JSON" | jq '.test_metrics.test_exit_code')
COVERAGE=$(echo "$AGENT_JSON" | jq '.coverage_metrics.coverage_percentage')
LINT_EXIT=$(echo "$AGENT_JSON" | jq '.lint_metrics.lint_exit_code')
ALL_PASSED=$(echo "$AGENT_JSON" | jq '.validation_status.all_checks_passed')

# Validate each metric
[ "$TEST_EXIT" != "0" ] && echo "FAIL: Tests failed with exit code $TEST_EXIT" && exit 1
[ "$(echo "$COVERAGE < 80" | bc)" = "1" ] && echo "FAIL: Coverage $COVERAGE% below 80%" && exit 1
[ "$LINT_EXIT" != "0" ] && echo "FAIL: Linting failed with exit code $LINT_EXIT" && exit 1
[ "$ALL_PASSED" != "true" ] && echo "FAIL: Agent validation failed" && exit 1

echo "PASS: Agent work validated successfully"
```