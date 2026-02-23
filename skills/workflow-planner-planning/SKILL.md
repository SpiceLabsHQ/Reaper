---
name: workflow-planner-planning
description: Planning process skill for workflow-planner. Handles grounding, input validation, strategy selection, and work package decomposition. Always executes within reaper:workflow-planner.
allowed-tools: Read, Glob, Grep, WebFetch, WebSearch, Bash(bd show:*), Bash(bd dep tree:*), Bash(bd dep:*), Bash(bd list:*), Bash(bd update:*), Bash(bd create:*), Bash(bd close:*), Bash(acli jira workitem view:*), Bash(acli jira workitem search:*), Bash(acli jira workitem update:*), Bash(gh issue:*), Bash(gh project:*), Bash(gh api:*)
---

# Workflow Planner — Planning Process

This skill prescribes the full planning process for `reaper:workflow-planner`. It covers grounding, input validation, strategy selection, work package decomposition, and JSON output schema.

## Grounding Instruction

Before creating any implementation plan, read the project's existing codebase to understand:
- Current architecture and tech stack (frameworks, languages, build tools)
- Existing file structure and module organization
- Testing patterns and conventions (test framework, coverage setup)
- Deployment configuration and CI/CD pipeline
- Existing code patterns and abstractions that new work should follow

Ground all decomposition, file assignments, and strategy selection in the project's actual structure. Do not assign files to work packages speculatively — verify file paths exist and understand their current content before including them in a plan.

## Cross-Domain Specialist Routing

When decomposing complex tasks, invoke specialist agents for domain expertise:
- Infrastructure changes → consult cloud-architect for deployment implications
- Database schema changes → consult database-architect for migration sequencing
- Event system changes → consult event-architect for saga boundaries and contract impacts
- Testing strategy questions → consult test-strategist for test pyramid recommendations
- API changes → consult api-designer for contract versioning implications

## Input Validation

Before planning, validate that input contains complete work scope. Do not guess about work scope.

1. If a queryable Task ID is provided, use FETCH_ISSUE to retrieve its details (title, description, acceptance criteria, blockers). Use QUERY_DEPENDENCY_TREE to discover children and dependencies.
2. Validate scope completeness (from query result OR provided description): work objective, identifiable files/components, known blockers/dependencies, and success criteria.
3. If incomplete: exit with specific missing items using the template below.

**Valid inputs**: Task ID that returns sufficient detail via FETCH_ISSUE, or detailed description with files, deps, and criteria.

**Invalid inputs (exit)**: ID without description where FETCH_ISSUE returns insufficient detail, vague descriptions ("fix the bug"), custom IDs with no queryable system.

### Exit Protocol

```
Workflow-planner validation failed. Missing: [list items]
Received: [echo input]
Provide: task ID with complete details OR description with objective, files, dependencies, success criteria.
```

## Strategy Selection Framework

Analyze work complexity using these scoring dimensions, then select strategy from the decision table.

### Complexity Scoring Dimensions

| Dimension | Scoring Rules |
|-----------|--------------|
| **File Impact** | New file: +1, Modify small (<100 LOC): +1, medium (100-500): +2, large (>500): +3, high-complexity (auth/payment/core logic): +2 bonus |
| **Dependencies** | External API integrations: x3, DB schema changes: x2, third-party library changes: x2, cross-module deps: x1 |
| **Testing** | Unit test files: x1, integration scenarios: x2, mocking required: +2, E2E tests: x3 |
| **Integration Risk** | File overlap between work units: x3, shared interface changes: x2, cross-cutting concerns: x2 |
| **Uncertainty** | Unfamiliar tech: +4, unclear requirements: +3, missing docs: +2, research needed: +3 |

**Single-document override:** If all work units' assigned files converge on the same 1-2 files, override to very_small_direct regardless of score or unit count. A single agent editing one file sequentially is faster and cheaper than parallel agents that cannot claim exclusive ownership. This override takes precedence over all other overrides below.

**Content override:** If the task involves 5+ repetitive similar items (e.g., creating multiple similar files, writing parallel documentation), override to medium_single_branch regardless of score. This catches content-heavy work that benefits from parallelism without inflating complexity scores.

### Decision Table

| Total Score | Conditions | Strategy |
|-------------|------------|----------|
| any | All work units target ≤2 unique files | **very_small_direct** (single-document override) |
| 0-10 | No file overlap, 1-2 files | **very_small_direct** |
| 11-35 | No file overlap, <=5 work units | **medium_single_branch** |
| >35 | - | **large_multi_worktree** |
| any | File overlap between work units | **large_multi_worktree** (required) |
| any | Any work unit >5 files or >500 LOC | **large_multi_worktree** (required) |

### Dirty-Root Safety Check (Post-Selection)

After all overrides above have determined the final strategy, apply this universal safety check unconditionally:

1. Run `git status --porcelain` on the repo root
2. If the output is non-empty (uncommitted changes exist in the root) AND the final strategy is `very_small_direct`, escalate to `medium_single_branch`

Uncommitted changes in the root risk contaminating the shared environment when Strategy 1 works directly on the feature branch without worktree isolation. `medium_single_branch` creates an isolated `./trees/` worktree that prevents root state from leaking into the agent's working environment. This check applies to the result of all strategy selection — including the single-document override — with no exemptions. If the final strategy is already `medium_single_branch` or `large_multi_worktree`, no escalation is needed.

### Strategy Selection Output

The planner uses the scoring framework internally for strategy selection but returns only the strategy name in the JSON output (the `strategy` field).

## Strategy Workflows

### Strategy 1: Very Small Direct

**When**: Score <=10, 1-2 files, no file overlap. Also selected by single-document override when all work units converge on ≤2 files. Content override applies if 5+ repetitive items detected.

**Workflow**:
1. Work directly on feature branch (no worktree isolation)
2. Deploy single coding agent (reaper:bug-fixer or reaper:feature-developer)
3. Run quality gate sequence
4. Present to user with quality attestation; user commits manually

### Strategy 2: Medium Single Branch

**When**: Score 11-35 (or lower with 5+ repetitive items), no file overlap, 2-5 work units.

**Workflow**:
1. Deploy reaper:branch-manager to create a single shared worktree: `./trees/TASK-ID-work` on `feature/TASK-ID-description`
2. Deploy multiple coding agents IN PARALLEL with exclusive file assignments, all working inside the shared worktree
3. Each agent: exclusive files, conflict detection (exit if files unexpectedly modified), focused testing, no commit authority — work stays uncommitted
4. After ALL agents complete: run quality gate sequence on full suite in the shared worktree
5. On failure: identify responsible agent by file analysis, return with blocking_issues
6. On all gates passing: deploy reaper:branch-manager to commit the shared worktree and tear it down
7. Feature branch contains all consolidated work; user merges to develop

**Parallel deployment example**:
```
Task --subagent_type reaper:feature-developer "TASK_ID: PROJ-123, WORKTREE: ./trees/PROJ-123-work, FILES: src/auth.js tests/auth.test.js, EXCLUSIVE ownership"
Task --subagent_type reaper:feature-developer "TASK_ID: PROJ-123, WORKTREE: ./trees/PROJ-123-work, FILES: src/config.js tests/config.test.js, EXCLUSIVE ownership"
```

### Strategy 3: Large Multi-Worktree

**When**: Score >35, file overlap, >5 work units, high integration complexity.

**Workflow**:
1. Create review branch: `feature/TASK-ID-review` (consolidation target)
2. Create worktrees per work stream (use the worktree-manager skill rather than raw `git worktree remove`)
3. For EACH worktree sequentially:
   a. Deploy code agent (max 5 files, 500 LOC per package)
   b. Run quality gate sequence in worktree
   c. On all gates pass: reaper:branch-manager commits and merges to review branch
   d. Invoke `worktree-manager` skill for safe cleanup
4. Final gate: reaper:test-runner on review branch (integration validation)
5. Present review branch to user; user merges to develop

### Agent Selection by Work Type

| Work Type | Agent | Notes |
|-----------|-------|-------|
| Bug fixes | reaper:bug-fixer | TDD Red-Green-Refactor, minimal fix |
| New features | reaper:feature-developer | TDD + SOLID from inception |
| Code improvements | reaper:refactoring-dev | Preserve behavior, improve structure |
| Branch/worktree ops | reaper:branch-manager | Safe merge, conflict detection |
| Worktree cleanup | `worktree-manager` skill | Prevents Bash CWD errors; never use raw `git worktree remove` |

## Strategy Escalation Protocol

When runtime conditions exceed the current strategy's assumptions, escalate:

| From | To | Trigger |
|------|----|---------|
| Strategy 1 | Strategy 2 | Work expands beyond 1-2 files; parallel opportunities discovered |
| Strategy 2 | Strategy 3 | File overlap discovered; agents report conflicts; work units exceed limits; >3 quality gate failures |
| Any | Re-plan | Context windows routinely exhausted; requirements fundamentally change; approach infeasible |

**Escalation workflow:**
1. Consolidate partial work (commit/merge what is complete)
2. Re-score remaining work using actual discovered metrics
3. Select new strategy for remaining work (upgrade if file overlap detected)
4. Provide updated guidance with new agent sequence, modified gates, and integration plan for partial + remaining work

The `risks` array in the JSON planning report should surface escalation-relevant conditions. The orchestrator triggers re-planning by redeploying reaper:workflow-planner with discovered context.

**De-escalation** is rare. Only de-escalate when significant efficiency gains are clear and switching cost is low.

## Work Package Size Constraints

### Limits
- **Files**: 3-5 max per package
- **LOC**: ~500 lines per work unit
- **Scope**: Single responsibility, explainable in <3 lines
- **Dependencies**: Max 2-3 direct

### Decomposition Rules
1. Break large features into micro-features (e.g., "Add user auth" becomes "login form" + "auth validation" + "session management")
2. Split by layer (frontend/backend/database) or responsibility (auth/data/UI)
3. Prefer thin vertical slices over horizontal layers
4. Each package must have clear test boundaries and be completable in a single agent invocation
5. Every work unit must leave all tests green upon completion — TDD Red-Green-Blue is an internal workflow within a work unit, not a decomposition boundary between work units

### Red Flags (Too Large)
Any work unit that touches >5 files, needs >3 lines to describe, has multiple unrelated responsibilities, or estimates >500 LOC.

## Issue Hierarchy and Dependencies

When given a task ID, use QUERY_DEPENDENCY_TREE to retrieve the full dependency graph before planning. Use LIST_CHILDREN to discover direct subtasks.

### Dependency Type Planning Impact

| Type | Planning Impact |
|------|-----------------|
| `blocks` | Blocked issue waits until blocker closes; plan blocker resolution first |
| `discovered-from` | Incorporate into plan |
| `related` | Consider together, no execution dependency |

### Planning by Scenario
- **Epic with correctly-sized children** (each <=5 files, <=500 LOC, has acceptance criteria): Plan execution order of existing children, do not re-decompose
- **Epic with oversized/incomplete children** (any child >5 files or missing acceptance criteria): Decompose the oversized children further into context-safe work units
- **Standalone issue**: Decompose into work units if complex, or plan direct execution
- **Issue with blockers**: Include blocker resolution first

### Creating Work Units

Use CREATE_ISSUE with `parent=PARENT_ID` to create subtasks with hierarchy in a single step. Do not use ADD_DEPENDENCY for hierarchy -- ADD_DEPENDENCY is only for `blocks` (execution order) and `related` (informational links).

### Work Type Classification

For each work unit, classify its `work_type` based on the `assigned_files`. The `work_type` must be one of: `application_code`, `infrastructure_config`, `database_migration`, `api_specification`, `agent_prompt`, `documentation`, `ci_cd_pipeline`, `test_code`, `configuration`. If files span multiple work types, use the dominant type (the one with the most files). If uncertain, default to `application_code`.

## File Assignment Protocol

Assign exclusive files per work unit when paths are known. Include them in `assigned_files`. All file assignments are implicitly exclusive — the orchestrator enforces ownership boundaries.

When exact paths are uncertain, describe the target area in the `brief` field so the executing agent can discover files.

File overlap between work units is a risk. Surface it in the `risks` array (e.g., "File overlap in src/auth/ between WORK-001 and WORK-002") and consider escalating to Strategy 3.

## Parallel Safety

- Assign exclusive files per agent; agents exit if assigned files are modified by others
- Conflict detection: check file timestamps before write
- Any file overlap detected at runtime: escalate to Strategy 3

## Anti-Patterns

Planning anti-patterns to avoid:
- **Premature parallelization** — Recommending parallel work streams before verifying low file overlap and clear interfaces
- **Over-decomposition** — Creating too many tiny work packages that increase coordination overhead without reducing complexity
- **Under-decomposition** — Leaving monolithic work packages that risk context exhaustion or unclear acceptance criteria
- **Speculative file assignments** — Including files in work packages without reading them first to verify they exist and are relevant
- **Architecture-blind planning** — Creating plans without understanding the existing codebase structure, leading to misaligned decomposition
- **Dependency cycles** — Creating circular dependencies between work packages that prevent sequential execution
- **Scope creep in work units** — Allowing individual packages to expand beyond their original intent during decomposition
- **Ignoring existing patterns** — Planning work that introduces conventions inconsistent with the project's established patterns
- **TDD phase splitting** — Planning "write failing tests" as one work unit and "implement code to pass tests" as a separate unit. TDD is an internal methodology within each work unit — all three phases (RED, GREEN, BLUE) must complete within the same unit, leaving all tests green at the work unit boundary

## JSON Planning Report

All planning responses must return this compressed structure. The planner still performs full internal analysis (complexity scoring, parallel safety checks, risk assessment) but returns only the deployment-ready fields the orchestrator needs.

```json
{
  "strategy": "medium_single_branch",
  "units": [
    {
      "id": "WORK-001",
      "title": "Implement login form",
      "work_type": "application_code",
      "group": 1,
      "prerequisites": [],
      "assigned_files": ["src/auth/LoginForm.js", "tests/auth/LoginForm.test.js"],
      "brief": "Create the login form component with email/password validation",
      "acceptance_criteria": ["Form renders with email and password fields", "Validation rejects empty fields", "Submit dispatches auth action"]
    }
  ],
  "risks": ["File overlap in src/auth/ between WORK-001 and WORK-002", "External OAuth API may require sandbox credentials"]
}
```

**Field reference:**
- `strategy`: One of `very_small_direct`, `medium_single_branch`, `large_multi_worktree`
- `units[].id`: Unique identifier for the work unit
- `units[].title`: Short descriptive title
- `units[].work_type`: One of `application_code`, `infrastructure_config`, `database_migration`, `api_specification`, `agent_prompt`, `documentation`, `ci_cd_pipeline`, `test_code`, `configuration`
- `units[].group`: Execution group number (units in the same group can run in parallel)
- `units[].prerequisites`: Array of unit IDs that must complete before this unit starts
- `units[].assigned_files`: Array of file paths this unit owns exclusively
- `units[].brief`: One-sentence description of the work
- `units[].acceptance_criteria`: Array of testable success conditions
- `risks`: Flat array of risk strings (file overlaps, external dependencies, escalation-relevant conditions)
