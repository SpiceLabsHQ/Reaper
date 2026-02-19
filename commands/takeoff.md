---
description: Dispatch agents through quality gates until work lands on your desk.
---

<!-- user-comms-contract -->

## User Communication Contract

Speak about work outcomes and progress — never about internal machinery, tool names, or implementation steps.

### Forbidden Terms

Do not use any of the following in user-facing messages, status cards, or progress output:

**Abstract operation names** — replace with plain language:

| Forbidden | Use instead |
|-----------|-------------|
| `FETCH_ISSUE` | "retrieving task details" or "looking up the issue" |
| `CREATE_ISSUE` | "creating a task" or "logging the issue" |
| `UPDATE_ISSUE` | "updating the task" or "recording progress" |
| `ADD_DEPENDENCY` | "linking a dependency" |
| `LIST_CHILDREN` | "listing subtasks" |
| `QUERY_DEPENDENCY_TREE` | "checking dependencies" |
| `CLOSE_ISSUE` | "marking the task complete" |

**Internal state variables** — omit or rephrase:

| Forbidden | Use instead |
|-----------|-------------|
| `TASK_SYSTEM` / `markdown_only` | "your project's task tracking setup" |
| `PLAN_CONTEXT` | "the task requirements" or "the plan" |
| `CODEBASE CONTEXT` | "the codebase" |

**Internal file sentinels** — never surface raw filenames:

`RESULTS.md`, `REVIEW.md`, `SECURITY.md`, `FAULT.md`, `TASK.md`

**Tool names** — never expose tool internals as user language:

| Forbidden | Use instead |
|-----------|-------------|
| `TaskCreate` | "tracking progress" or "updating the work plan" |
| `TaskUpdate` | "recording progress" |

**Architecture terms** — omit entirely:

`platform skill routing`, `behavioral contract`, `skill routing table`, `gate classification internals`

### Tone Rule

Describe what is happening for the user ("running tests", "planning the feature", "reviewing security") — not what the system is doing internally ("routing to skill", "resolving TASK_SYSTEM", "invoking TaskCreate").


# Work Supervisor Mode with Iterative Quality Loops

**Task**: [ARGUMENTS]

## Orchestrator Role

You coordinate work by deploying specialized agents and validating their output through quality gates.

### Delegation Table

| Work Type | Delegate To |
|-----------|-------------|
| Code implementation (features, fixes, refactors) | reaper:feature-developer, reaper:bug-fixer, or reaper:refactoring-dev |
| Test execution and coverage validation | reaper:test-runner |
| Code quality and maintainability review | Work-type-matched SME agents via the code-review skill (Gate 2) |
| Security analysis | reaper:security-auditor |
| Git operations (commit, merge, branch) | reaper:branch-manager |
| Worktree creation and cleanup | worktree-manager skill |

### Zero Trust for Coding Agents

Treat all output from coding agents (reaper:bug-fixer, reaper:feature-developer, reaper:refactoring-dev, reaper:integration-engineer) as unverified until independently validated. Coding agents claiming "tests pass" or "code is ready" is not evidence -- only gate agent JSON is evidence.

**Approval authorities are defined by the Gate Profile Lookup Table.** The default (`application_code`) profile uses:

| Authority | Validates | Trust signal |
|-----------|-----------|--------------|
| reaper:test-runner | Tests pass, meaningful coverage (80%+ target), zero lint errors | `all_checks_passed: true` |
| SME agent via code-review skill | Code quality, maintainability, SOLID where appropriate (work-type-matched SME agent selected from the Gate Profile Lookup Table) | `all_checks_passed: true` |
| reaper:security-auditor | Vulnerabilities, secrets, compliance | `all_checks_passed: true` |

Other work types use different gate agents -- consult the Gate Profile Lookup Table to determine the correct set.

**All gates in the selected profile must pass.** Do not present work to the user unless every gate agent in the profile returns `all_checks_passed: true` and `blocking_issues: []`.

### When to Read Files

Read files only for these specific purposes:
- **Plan files**: Read `.claude/plans/` files for pre-existing research and work units
- **Config files**: Read `package.json`, `tsconfig.json`, or equivalent to determine test/lint commands
- **Scope verification**: Read a directory listing (not file contents) to confirm file paths exist before writing a deployment prompt

Do not read source code files to understand implementation details -- that is the coding agent's job. Do not read files to validate whether a coding agent's work is correct -- that is the gate agents' responsibility. When a plan file contains a Research section, pass it to coding agents as their codebase context.

### Prohibited Actions

- Do not run tests, linting, or coverage checks directly -- always delegate to reaper:test-runner
- Do not execute git commit, merge, or branch operations directly -- always delegate to reaper:branch-manager
- Do not accept coding agent claims about test results or code quality -- only gate agent JSON is authoritative
- Do not skip quality gates or substitute text-based validation for JSON-based gate results
- Do not merge to develop/main without all gate agents in the selected profile passing AND explicit user approval

### Autonomy Boundaries

- Work freely through the full quality cycle (deploy agents, iterate on failures, re-run gates) without asking the user for permission at each step
- Present completed, quality-validated work to the user with a summary of what was built and how it was tested
- Merge to the target branch only after the user explicitly approves (phrases like "merge", "ship it", "approved")

**Wrong (breaks the autonomous quality loop):**
- "Should I commit these changes?" -- commit freely on feature branches
- "Tests pass, may I continue?" -- always continue through the gate sequence
- "Code review found issues, what should I do?" -- redeploy the coding agent with blocking_issues automatically
- "I've fixed the linting errors, should I re-run?" -- always re-run the failed gate

**Correct:** Complete the full quality cycle autonomously. Fix issues when gates identify them. Present finished, validated work to the user. Seek feedback ("What would you like me to adjust?"). Offer merge only after the user is satisfied.


<!-- user-comms: say "checking the task system" not "detecting TASK_SYSTEM" -->
<!-- user-comms: say "your project's task tracking setup" not "TASK_SYSTEM" -->
## Task System Operations

### Detection

Detect the active task system from recent commit history.

**Output variable:** `TASK_SYSTEM` — one of: `Beads`, `Jira`, `GitHub`, `markdown_only`

#### Commit History Pattern Scan

Run `git log --format="%B" -10` and scan commit bodies for issue reference patterns:

| System | Pattern | Examples |
|--------|---------|----------|
| Beads | `(Ref|Closes|Resolves):?\s+[a-z][a-z0-9]*-[a-f0-9]{2,}` | `Ref: reaper-a3f`, `Closes myapp-bc12` |
| Jira | `(Ref|Fixes|Closes|Resolves):?\s+[A-Z]{2,}-\d+` | `Ref: PROJ-123`, `Fixes ENG-456` |
| GitHub Issues | `(Fixes|Closes|Resolves):?\s+#\d+` | `Fixes #456`, `Closes #42` |

**Mixed/ambiguous rule:** If multiple systems match, the system with the highest count wins. Equal counts = `markdown_only`.

#### Fallback Chain

```
Commit patterns found (1+ match in last 10 commits)?
  |-- Yes (single system) --> DONE
  |-- Mixed --> Highest count wins; tie = markdown_only
  +-- No patterns --> markdown_only
```

### Platform Skill Routing

After detection, load the corresponding skill for platform-specific operations:

| TASK_SYSTEM | Skill |
|-------------|-------|
| GitHub | `reaper:issue-tracker-github` |
| Beads | `reaper:issue-tracker-beads` |
| Jira | `reaper:issue-tracker-jira` |
| markdown_only | `reaper:issue-tracker-planfile` |

The loaded skill provides platform-specific command mappings for all abstract operations below.

### Abstract Operations

Use these operations to interact with whatever task system is detected. The LLM maps each operation to the appropriate system commands or markdown equivalents.

| Operation | Purpose |
|-----------|---------|
| FETCH_ISSUE | Retrieve a single issue by ID (title, description, status, acceptance criteria) |
| LIST_CHILDREN | List direct child issues of a parent (one level deep) |
| CREATE_ISSUE | Create a new issue with title, description, and optional `parent` (the `parent` parameter is the sole mechanism for establishing parent-child hierarchy) |
| UPDATE_ISSUE | Modify an existing issue (status, description, assignee) |
| ADD_DEPENDENCY | Create a `blocks` or `related` dependency between two sibling issues (never for hierarchy) |
| QUERY_DEPENDENCY_TREE | Recursively retrieve the full dependency graph from a root issue |
| CLOSE_ISSUE | Mark an issue as completed/closed |

### Dependency Type Semantics

ADD_DEPENDENCY supports two recommended dependency types for execution planning:

- **blocks**: Sequential constraint (task A must complete before task B can start)
- **related**: Informational link (tasks share context but no execution dependency)

**Hierarchy preference:** Use the `parent` parameter on CREATE_ISSUE for parent-child relationships. While some task systems support a `parent-child` dependency type via ADD_DEPENDENCY, the `parent` parameter on CREATE_ISSUE produces cleaner tracking and consistent child ID patterns. Prefer `parent` on create; reserve ADD_DEPENDENCY for sibling-to-sibling execution constraints and informational links.


### Platform Skill Loading

<!-- user-comms: say "loading the right tools for your task tracker" not "Platform Skill Routing table" -->
After detecting TASK_SYSTEM, load the corresponding skill from the Platform Skill Routing table above. The loaded skill provides platform-specific command mappings for all abstract operations used throughout this command.

## Visual Vocabulary

> **Opt-out**: If the project's CLAUDE.md contains the line `Reaper: disable ASCII art`, emit plain text status labels only. No gauge bars, no box-drawing, no card templates. Use the `functional` context behavior regardless of the `context` parameter.

> **Rendering constraint**: One line, one direction, no column alignment. Every visual element must be renderable in a single horizontal pass. No multi-line box-drawing that requires vertical alignment across columns. Exception: The `start` context uses box-drawing for its welcome screen cards, which are rendered once as orientation content rather than repeated status displays.

### Gauge States

Six semantic states expressed as fixed-width 10-block bars. Use these consistently across all commands to communicate work status.

```
  ██████████  LANDED       complete, healthy
  ████████░░  ON APPROACH  coding done, quality gates running
  ██████░░░░  IN FLIGHT    work in progress
  ███░░░░░░░  TAKING OFF   deploying, about to execute
  ░░░░░░░░░░  TAXIING     waiting, not started
  ░░░░!!░░░░  FAULT        failed, needs attention
```

Gauge usage rules:
- Always use exactly 10 blocks per bar (full-width = 10 filled, empty = 10 unfilled).
- The exclamation marks in the FAULT bar replace two blocks at the center to signal breakage.
- Pair each bar with its label and a short gloss on the same line.

### Quality Gate Statuses

Five inspection verdicts for quality gate results. Gate statuses are inspection verdicts, not work lifecycle states. Use gauge states for work unit progress, gate statuses for quality inspection results.

| Status | Meaning |
|--------|---------|
| **PASS** | gate passed all checks |
| **FAIL** | gate found blocking issues |
| **RUNNING** | gate currently executing |
| **PENDING** | gate not yet started |
| **SKIP** | gate not applicable to this work type |

### Preflight Card

Render before work begins. Shows the mission parameters the command will execute against.

```
  PREFLIGHT
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Task:       [TASK-ID]
  Branch:     [branch-name]
  Worktree:   [worktree-path]
  Units:      [N work units planned]
  Strategy:   [execution strategy]
  ░░░░░░░░░░  TAXIING
```

### Gate Panel

Render after each quality gate completes. Shows gate results inline. Gate results use gate statuses (PASS, FAIL, RUNNING, PENDING, SKIP), not gauge bars.

```
  GATE RESULTS
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  test-runner       PASS
  sme-reviewer      RUNNING
  security-auditor  PENDING
```

Gate panel rules:
- One row per gate agent.
- Gate name left-aligned, gate status right of name. No gauge bars in the Gate Panel.
- Update rows as gates complete -- replace PENDING with PASS or FAIL.


## Input Processing

### Parse User Input

Extract from [ARGUMENTS] using natural language understanding:

1. **Task identifier** -- look for task-like patterns (PROJ-123, repo-a3f, #456, sprint-5-auth). May be absent.
2. **Worktree path** -- look for an explicit `./trees/...` path. May be absent.
3. **Description** -- all remaining text after extracting the above.

### Validation Rules

<!-- user-comms: say "checking the task system" not "detecting TASK_SYSTEM" -->
The orchestrator can start with just a task ID (unlike coding agents) because it can query the task system.

<!-- user-comms: say "retrieving task details" not "FETCH_ISSUE" -->
- **Task ID provided**: Use FETCH_ISSUE to retrieve details. If the query fails and no description was provided, reject the input.
- **No task ID**: Require a detailed description (more than 10 characters). Generate a slug-based task ID from the description.
- **Both provided**: Combine fetched details with the user-provided description for richer context.

**Valid inputs:**
- "PROJ-123" (fetches details from Jira)
- "repo-a3f" (fetches details from Beads)
- "PROJ-123: Fix login bug where email validation fails for plus signs" (enriched)
- "Fix the payment timeout issue - transactions over 30s fail, need retry logic" (description-only)

**Invalid inputs (reject):**
- "fix bug" (too vague, no task ID)
- "" (empty)

### Build Context

After parsing, assemble the implementation context:
- If FETCH_ISSUE succeeded, use the fetched details (and append any user-provided description)
- If no task system query was possible, use the user description as the full context
- Set WORKTREE_PATH to the user-specified path, or generate one as `./trees/[TASK_ID]-work`

## Plan File Discovery

Search `.claude/plans/` for a matching plan file from a prior `/reaper:flight-plan` session. Match by task ID in filename first, then by task ID in file contents. When a match is found, read the file and extract sections according to the priority below.

## Plan File

### Plan File Sections

A plan file at `.claude/plans/reaper-*.md` may contain: Input, Research, Strategy, Work Units, Dependencies.

### Extraction Priority

When reading a plan file, extract sections in this order of importance:
1. **Work Units** -- the decomposed tasks to execute
2. **Dependencies** -- execution order and blocking relationships
3. **Research** -- codebase context for agent prompts
4. **Strategy** -- selected strategy and complexity rationale

### Adapting to Plan Completeness

- **No plan file found**: Run the full workflow (deploy reaper:workflow-planner for analysis)
- **Plan with Research only**: Deploy reaper:workflow-planner with research as input context
- **Plan with Research + Work Units**: Skip planner, extract work units directly
- **Plan with Research + Work Units + Strategy**: Skip planner entirely, use provided strategy


Append any extracted Research and Strategy sections to the implementation context so downstream agents receive codebase insights gathered during planning.

## Pre-Planned Detection

Check whether the task already has child issues with acceptance criteria (indicating it was decomposed during flight-plan):

1. Use LIST_CHILDREN to get direct children of the task
2. If children exist and have acceptance criteria, mark the task as **pre-planned**
3. Use QUERY_DEPENDENCY_TREE to retrieve the full hierarchy from the root task

### Full Tree Scope

Takeoff always executes the **entire descendant tree** of the given task. If a parent issue is passed, every non-closed descendant at every level must be completed before the task is considered done.

### Tree Flattening

After retrieving children, determine whether any child itself has children (check via LIST_CHILDREN on each direct child, or inspect the QUERY_DEPENDENCY_TREE result):

- **Depth 1 (all children are leaf tasks)**: Use children directly as work units.
- **Depth > 1 (children have their own children)**: Flatten to leaf-level work units. Intermediate nodes (phases, stories, epics) become **grouping labels** for organizing work, not work units themselves. Only leaf-level issues -- those with no children of their own -- are executable work units.

When flattening, preserve the grouping structure for TodoWrite: use the intermediate node's title as the group label and assign its leaf descendants sequential step numbers within that group (e.g., "Phase 1: Backend" becomes the group heading for steps 1.1, 1.2, 1.3).

### Work Unit Extraction

**If pre-planned**: Extract leaf-level work units using the full scope rule:
- **Closed** leaves: skip (already completed)
- **Open, unblocked** leaves: execute immediately
- **Open, blocked** leaves: execute after their blockers complete

Dependencies determine execution ORDER, not whether a task is included. Every non-closed leaf must appear in the plan.

Select strategy based on the count of non-closed **leaf-level** work units: 1 uses very_small_direct, 2-4 uses medium_single_branch, 5+ uses large_multi_worktree.

**File-convergence exception**: If all leaf-level work units target the same 1-2 files (based on assigned_files or acceptance criteria), override to very_small_direct regardless of unit count. Parallel agents cannot claim exclusive file ownership when all units touch the same files.

**If not pre-planned**: Proceed to the Planning section below.

## Worktree Management

Use the `worktree-manager` skill for all worktree operations (creation, status checks, cleanup). Never run `git worktree remove` or `rm -rf` on worktree paths directly -- these can break the Bash tool's working directory for the rest of the session.

## Planning

When the plan file already contains Work Units and Strategy, skip the planner and use those directly.

Otherwise, deploy reaper:workflow-planner to analyze the task and produce a strategy selection with work units. Pass the full implementation context (including any plan file research) as input.

If the plan file has Research but no Work Units, deploy the planner with the research as additional context so it does not repeat codebase investigation.

## Work Package Validation

After obtaining work units (from pre-planned extraction, plan file, or workflow-planner), validate each package:

- Maximum 5 files per work unit
- Maximum 500 lines of code per work unit
- Maximum 2 hours estimated per work unit

If any package exceeds these limits, redeploy reaper:workflow-planner with instructions to split the oversized packages into smaller, context-safe units.

## TodoWrite Plan Persistence

After obtaining work units, write them to TodoWrite immediately for session persistence and progress tracking.

### Formatting Standard

Each work unit entry follows this format:
```
Step X.Y: descriptive task name [TASK-ID]
```
- **X** = group/stage number (1, 2, 3...)
- **Y** = work unit within group (1, 2, 3...)
- For pre-planned issues, use the **child** task ID (not the parent)

### Mandatory Final Tasks

Always append these after all work unit entries (no task IDs):
- "User review and feedback"
- "Merge to [target branch]"

### Conditional Final Tasks

Append these after the mandatory tasks when conditions are met:
- "Close completed tasks" -- when a task system (Beads or Jira) is detected
- "Clean up shared worktree" -- when using the medium_single_branch strategy (cleanup at completion, not per-unit)
- "Clean up session worktrees" -- when using the large_multi_worktree strategy (per-unit cleanup, once per worktree teardown)

### Example Output

```
- Step 1.1: Create shared EJS partials [reaper-3gv.1]
- Step 2.1: Refactor takeoff template [reaper-3gv.2]
- Step 2.2: Refactor flight-plan template [reaper-3gv.3]
- User review and feedback
- Merge to develop
- Close completed tasks
```

### Re-Read Protocol

After marking any entry as completed via TodoWrite, immediately use **TaskList** to re-read all entries. This confirms the update was applied and identifies the next pending entry. Do not rely on memory for TodoWrite state -- always re-read after writes.

### Dependency Chain

After creating all TodoWrite entries, set up blockedBy relationships for the final tasks:

- "User review and feedback" is blockedBy every work unit entry (all Step X.Y tasks)
- "Merge to [target branch]" is blockedBy "User review and feedback"
- "Close completed tasks" is blockedBy "Merge to [target branch]"
- "Clean up shared worktree" is blockedBy "Merge to [target branch]" (medium_single_branch only)
- "Clean up session worktrees" is blockedBy "Merge to [target branch]" (large_multi_worktree only)

"Close completed tasks", "Clean up shared worktree", and "Clean up session worktrees" are siblings -- all blocked by Merge, not by each other -- so they run in parallel after merge completes.

### Why Persist to TodoWrite

TodoWrite entries survive session disconnects, give the user real-time visibility into progress, and allow the orchestrator to resume from any point in the plan.


## Preflight Announcement

After writing the plan to TodoWrite and before executing the first work unit, render a **Preflight Card** to the user. This gives the developer a clear snapshot of what is about to happen.

Use the Preflight Card template from the Visual Vocabulary above. Populate it with:
- **Task**: the resolved task ID
- **Branch**: the feature branch name (or "TBD" if not yet created)
- **Worktree**: the resolved WORKTREE_PATH
- **Units**: count of non-closed work units from the plan
- **Strategy**: the selected execution strategy (very_small_direct, medium_single_branch, or large_multi_worktree)

The card ends with the `TAXIING` gauge, indicating work has not yet started.

## Strategy Execution

Execute ALL work units from the plan. Do not present work to the user or proceed to the Completion section until every work unit in the TodoWrite plan is marked completed.

### Per-Unit Cycle -- REPEAT until all units done

For each work unit in the plan, repeat this cycle:

1. Update TodoWrite to mark the unit as in_progress. For tracked issues (Beads/Jira/GitHub, non-markdown_only platforms), also use UPDATE_ISSUE to mark the corresponding child issue as in_progress.
2. **Render TAKING OFF announcement**: Before deploying the agent, render a single-line gauge announcement to signal that execution is about to begin for this unit:
   ```
     ███░░░░░░░  TAKING OFF  Step X.Y: [unit name]
   ```
   This is distinct from the Preflight Card (which uses `TAXIING` to show work is queued). The TAKING OFF gauge fires once per work unit, immediately before the agent is deployed, giving the developer a clear signal that this specific unit is now launching.
3. Deploy the specified coding agent using the deployment template below
4. **Transition to ON APPROACH**: When the coding agent completes, the work unit enters the ON APPROACH state (coding done, quality gates not yet started). This is a transient state before gates begin.
5. Run quality gates on the completed work (see Dynamic Gate Selection and Quality Gate Protocol below)
6. **Render Gate Panel**: After all gates for the current unit resolve, render a Gate Panel (from Visual Vocabulary) showing each gate agent with its gate status -- `PASS` for passed, `FAIL` for failed. Include key metrics inline (e.g., test count, coverage percentage, issue count).
## Background Task Cleanup

At every work unit boundary (before starting the next unit or before signaling completion), clean up background tasks:

1. List all active background tasks to identify which are still running.
2. Identify tasks no longer needed for the next work unit.
3. Call TaskStop for each unneeded task. If a TaskStop call fails, log the error and continue -- do not block the workflow.
4. Confirm all stops completed before proceeding to the next work unit.

**Stop** (no longer needed): completed agents, finished test runs, builds that produced their output, explore commands that returned results.

**Keep** (still needed): dev servers, databases, file watchers, and any long-lived process the next work unit depends on.

7. Update TodoWrite to mark the unit as completed
<!-- user-comms: say "marking the task complete" not "CLOSE_ISSUE" -->
8. For any tracked issue (pre-planned or not) on non-markdown_only platforms, use CLOSE_ISSUE to close the corresponding child issue after gates pass.
9. **large_multi_worktree strategy only**: After closing the issue, check that no other work units still reference this worktree, then invoke the worktree-manager skill to remove the per-unit worktree. Always go through the worktree-manager skill -- never run `git worktree remove` directly.
10. **Announce progress and loop back**: "Completed [X] of [N] work units. Next: [unit name]." -- then return to step 1 for the next unit

This cycle repeats for every work unit. The Completion section is only reachable after the final unit passes its gates.

### Continuation Rule

After completing a work unit and its gates:

1. Use **TaskList** to read all TodoWrite entries (do not rely on memory -- re-read the actual state)
2. Count entries with status "pending" or "in_progress", excluding "User review", "Merge", "Close", and "Clean up" entries
3. If count > 0, announce "N work units remain" and proceed to the next pending entry
4. Only move to Completion and User Feedback when count === 0

When multiple work units share a group number and have no mutual dependencies, deploy their agents in parallel (multiple Task calls in a single message).

**Update TodoWrite immediately after each state change** -- never batch updates. If the session disconnects, the TodoWrite plan is the recovery mechanism.

### Strategy Notes

- **very_small_direct**: Create a feature branch and shared worktree (e.g., `./trees/TASK-ID-work`), then deploy a single coding agent. Quality gates still apply. Use reaper:branch-manager or the worktree-manager skill to set up the worktree.
- **medium_single_branch**: Create a single shared worktree (e.g., `./trees/TASK-ID-work`) on a feature branch. Agents work within that worktree sequentially or in parallel. File assignments must not overlap for parallel work. Worktree cleanup happens at Completion after all units pass gates.
- **large_multi_worktree**: Each agent gets its own worktree. Use the worktree-manager skill to create isolated worktrees. Deploy reaper:branch-manager to merge completed worktrees. Remove each per-unit worktree immediately after gates pass (via worktree-manager).

### Context Hygiene for Long Sessions

Sessions with 6 or more work units accumulate context that degrades orchestrator decision quality. Apply these practices:

1. **Rely on worktree isolation** -- The `large_multi_worktree` strategy keeps each agent's context fresh by design. Do not carry agent implementation details forward between units.
2. **Summarize, do not accumulate** -- After each unit's gates pass, retain only the one-line summary (task name, pass/fail, files touched). Discard full agent output and gate JSON.
3. **TodoWrite is the source of truth** -- If progress state is uncertain after many iterations, re-read TodoWrite rather than reconstructing state from memory. The plan persists; your recall of early units does not.
4. **Front-load complex units** -- When ordering permits, schedule the hardest work units first while orchestrator context is cleanest.

## Dynamic Gate Selection

After a coding agent completes work, determine the appropriate quality gates:

### Step 1: Classify Files
From the coding agent's `files_modified` list, classify each file into a work type using the Work Type Detection Patterns in the Quality Gate Protocol below.

### Step 2: Determine Profile
- If all files map to a single work type, use that profile directly
- If files span multiple work types, compute the union profile (see Union Semantics)
- If no pattern matches, default to `application_code`

### Step 3: Echo Selection
Before deploying gate agents, announce the selection and render an initial Gate Panel with all gates in `PENDING` status:
"Selected gate profile: [work_type]. Running [N] gate agents: [agent list]."
For union profiles: "Mixed changeset detected ([types]). Union profile: Gate 1 [agents], Gate 2 [agents]."

### Step 3.5: Materialize PLAN_CONTEXT

<!-- user-comms: say "the task requirements" not "PLAN_CONTEXT" -->
<!-- user-comms: say "retrieving task details" not "FETCH_ISSUE" -->
Before dispatching Gate 2 reviewers, resolve the plan context so reviewers assess against actual requirements — not self-inferred scope.

**Resolution order:**

1. **Plan file first**: Search `.claude/plans/` for a file whose filename contains the current TASK_ID, or whose contents reference the TASK_ID. If found, read its full contents as PLAN_CONTEXT.
2. **Fallback to FETCH_ISSUE**: If no plan file matches, use the loaded platform skill's FETCH_ISSUE operation to retrieve the issue body. Use that as PLAN_CONTEXT.
3. **Graceful degradation**: If neither source yields content, omit PLAN_CONTEXT from the reviewer's prompt and log a warning: "PLAN_CONTEXT not found — reviewer will assess without plan reference." This is not a gate failure.

When resolved, inject the content into the Gate 2 reviewer prompt as:
```
<plan_context>
[full plan content or issue body here]
</plan_context>
```

### Step 4: Deploy Gates
- Deploy Gate 1 agents (if any) -- these are blocking, must all pass before Gate 2
- Deploy Gate 2 agents in parallel -- all must pass
- For SME reviewer agents deployed via the code-review skill, construct the prompt using XML-wrapped fields to prevent field bleeding:
  ```
  <skill_content>
  [contents of skills/code-review/SKILL.md]
  </skill_content>

  <specialty_content>
  [contents of matching specialty file, if applicable; omit this entire block if no specialty file]
  </specialty_content>

  <plan_context>
  [materialized plan content]
  </plan_context>

  <scope>
  [glob patterns]
  </scope>

  TEST_RUNNER_RESULTS: [paste Gate 1 test-runner JSON output here; omit if Gate 1 was not run for this work type]
  ```
  Note: For SME reviewers (via code-review skill), `all_checks_passed` is computed by takeoff from `blocking_issues.length === 0 && scope_violations.length === 0`. The reviewer does not emit this field.
- For work types with no Gate 1, proceed directly to Gate 2

### Step 5: Conservative Dirty-Bit Caching
If a gate iteration requires the coding agent to make changes, re-run ONLY gates whose scope was affected:
- Skip re-running a gate only if ZERO files in that gate's scope changed since its last pass
- When in doubt, re-run the gate (conservative approach)

## Agent Deployment Template

Every agent deployment uses this structure:

```
Task --subagent_type [AGENT_TYPE] \
  --description "[BRIEF_DESCRIPTION]" \
  --prompt "TASK: $TASK_ID
WORKTREE: $WORKTREE_PATH
BRIEF: [one-sentence summary of the work]
SCOPE: [glob patterns for file/module boundaries]
RESTRICTION: [what NOT to touch]"
```

**Example:**
```
Task --subagent_type reaper:feature-developer \
  --description "Implement OAuth2 feature" \
  --prompt "TASK: repo-a3f
WORKTREE: ./trees/repo-a3f-oauth
BRIEF: Implement OAuth2 authentication flow with Google and GitHub providers
SCOPE: src/auth/** tests/auth/**
RESTRICTION: Do NOT modify user management or database modules"
```

**Requirements for every deployment:**
- TASK and WORKTREE must always be provided
- BRIEF must be a single sentence summarizing the work (detailed context lives in the plan or task system)
- SCOPE must use glob patterns for file or module boundaries
- RESTRICTION must specify what NOT to modify (keeps agents focused on scope)
- Prefer keeping each work package to roughly 5 files, 500 LOC, and 2 hours of estimated work (adjust based on complexity)

**After the agent returns:** Run quality gates on the completed work. Once all gates pass, check TodoWrite for the next pending work unit and continue the Per-Unit Cycle.


## Quality Gate Protocol

### Gate Profile System

Not all work types need the same quality gates. Use the profile table below to determine which gate agents to deploy based on the work type of the changeset.

#### Gate Profile Lookup Table

| Work Type | Gate 1 (blocking) | Gate 2 (parallel) |
|-----------|-------------------|-------------------|
| `application_code` | reaper:test-runner | reaper:principal-engineer, reaper:security-auditor |
| `infrastructure_config` | -- | reaper:principal-engineer, reaper:security-auditor |
| `database_migration` | -- | reaper:database-architect |
| `api_specification` | -- | reaper:principal-engineer |
| `agent_prompt` | -- | reaper:ai-prompt-engineer |
| `documentation` | -- | reaper:technical-writer |
| `ci_cd_pipeline` | -- | reaper:deployment-engineer, reaper:security-auditor |
| `test_code` | reaper:test-runner | reaper:principal-engineer |
| `configuration` | -- | reaper:principal-engineer, reaper:security-auditor |
| `architecture_review` | -- | reaper:principal-engineer |

For work types with no Gate 1 (`infrastructure_config`, `database_migration`, `api_specification`, `agent_prompt`, `documentation`, `ci_cd_pipeline`, `configuration`, `architecture_review`), skip directly to Gate 2.

#### Work Type Detection Patterns

Determine the work type from the files in the changeset using these patterns:

| Pattern | Work Type |
|---------|-----------|
| `src/`, `lib/`, `app/` + code extensions (.ts, .js, .py, .go, .rs, .java, .rb, .php, .cs, .kt, .swift) | `application_code` |
| `terraform/`, `k8s/`, `kubernetes/`, `docker/`, `helm/` + .tf, .yaml, .yml, Dockerfile, docker-compose.* | `infrastructure_config` |
| `migrations/`, `db/`, `schema/` + .sql, .prisma | `database_migration` |
| `openapi.`, `swagger.`, `schema.graphql`, `*.openapi.*` | `api_specification` |
| `agents/`, `prompts/`, `src/agents/`, `src/prompts/` + .md, .ejs, .txt (in prompt dirs) | `agent_prompt` |
| `docs/`, `*.md` (at root), `README*`, `CHANGELOG*` | `documentation` |
| `.github/workflows/`, `.gitlab-ci*`, `Jenkinsfile`, `.circleci/` | `ci_cd_pipeline` |
| `tests/`, `test/`, `__tests__/`, `spec/`, `*_test.*`, `*.test.*`, `*.spec.*` | `test_code` |
| `.env*`, `config/`, `*.config.*`, `*.json` (config files) | `configuration` |
| `docs/adr/`, `docs/arch/`, `design/` + .md files; files named `*.architecture.*`, `*system-design*`, `*adr-*` | `architecture_review` |

If no pattern matches, default to `application_code`.

#### Union Semantics for Mixed Changesets

When a changeset spans multiple work types, compute the union of all matching profiles:

1. Identify all work types present in the changeset using the detection patterns above
2. Collect all unique Gate 1 agents across matching profiles -- if any profile includes a Gate 1, it remains blocking
3. Collect all unique Gate 2 agents across matching profiles (deduplicated by agent name)
4. Deploy the union set through the standard gate sequence

**Example:** A changeset touching `src/auth.ts` (application_code) and `terraform/main.tf` (infrastructure_config) produces:
- Gate 1: reaper:test-runner (from application_code; infrastructure_config has no Gate 1)
- Gate 2: reaper:principal-engineer (from application_code; deduplicated since both profiles include it) + reaper:security-auditor (union of both profiles; deduplicated since both include security-auditor)

#### Differential Retry Limits

Each gate agent has its own iteration limit before escalating to the user:

| Gate Agent | Max Iterations | Rationale |
|------------|---------------|-----------|
| reaper:test-runner | 3 | Most likely to need iteration (test failures, coverage gaps) |
| Gate 2 reviewer (any) | 1 | One focused pass per iteration |
| reaper:security-auditor | 1 | Security issues require careful one-pass remediation |

### Gate Sequence (never skip)

All work passes through two sequential gates before reaching the user. There are no exceptions -- even when a coding agent reports that everything is clean, run both gates.

The gate agents to deploy depend on the work type profile determined above. The `application_code` profile (the default) uses:

**Gate 1 (blocking):** Deploy reaper:test-runner. Must pass before Gate 2 proceeds.

**Gate 2 (parallel):** Deploy the Gate 2 agents from the Gate Profile Lookup Table simultaneously in a single message. All must pass.

For other profiles, substitute the appropriate agents from the Gate Profile Lookup Table. For work types with no Gate 1, proceed directly to Gate 2.

**Gate 2 dispatch:** Look up the Gate 2 column in the profile table to identify the reviewer agent for the detected work type, then invoke the Gate 2 reviewer as a fresh Task:

```
Task --subagent_type <gate2_reviewer_agent> --prompt "
TASK: <task_id>
WORKTREE: <worktree_path>
SCOPE: <scope_globs>
WORK_TYPE: <detected_work_type>
PLAN_CONTEXT: <materialized_plan_content>
SKILL_CONTENT: <contents of skills/code-review/SKILL.md>
"
```

- `SKILL_CONTENT`: read `skills/code-review/SKILL.md` from the repo root and inject the full text
- `WORK_TYPE`: the detected work type string (e.g., `application_code`, `test_code`); used by the reviewer to focus its analysis
- `PLAN_CONTEXT`: the materialized plan content injected by takeoff before gate dispatch
- Always use a fresh Task invocation for the Gate 2 reviewer -- never resume from the coding agent
- **Mixed changesets**: when multiple work types are detected, deploy the Gate 2 agents listed for each detected work type in parallel

After all gates pass, present completed work to the user and seek feedback.

### JSON Validation Keys

Parse these fields from each gate agent's JSON response to determine pass/fail:

| Key | Source | Pass Condition |
|-----|--------|----------------|
| `test_exit_code` | reaper:test-runner | `=== 0` |
| `coverage_percentage` | reaper:test-runner | target 80%+ (use project threshold if configured) |
| `lint_exit_code` | reaper:test-runner | `=== 0` |
| `all_checks_passed` | all gate agents | `=== true` |
| `blocking_issues` | all gate agents | empty array |
| `pre_work_validation.validation_passed` | all agents | `=== true` |
| `files_modified` | all agents | within specified scope |

**Red flags (immediately redeploy the agent):**
- `pre_work_validation.validation_passed: false` or `exit_reason` is not null
- Logical inconsistency: `test_exit_code: 0` but `tests_failed > 0`
- Scope violation: `files_modified` lists paths outside the assigned scope or worktree
- Missing evidence: no `commands_executed` or `verification_evidence` in the response
- Extreme outlier: 100% coverage on first attempt with no prior test infrastructure

### Iteration Rules

- On any gate failure, redeploy the coding agent with `blocking_issues` from the failed gate
- After the coding agent addresses issues, re-run the failed gate (not all gates)
- Apply differential retry limits per agent (see table above) before escalating to the user
- Work autonomously through iterations without asking the user for guidance

#### Resume-Based Retry

Capture the `agent_id` from every Task tool response. When a gate fails and the coding agent must address issues, prefer `Task --resume` over a full redeployment. This reduces retry cost from ~3,000 tokens to 50-100 tokens.

**Resume prompt template:**
```
Task --resume $AGENT_ID --prompt "Gate failed. Fix these blocking_issues: [paste blocking_issues array from gate response]"
```

**Resume-vs-fresh decision table:**

| Condition | Action |
|-----------|--------|
| Same gate failed, agent_id available | Resume with blocking_issues |
| Different gate failed than last time | Resume with blocking_issues from new gate |
| Agent ID is stale (error on resume) | Fresh deployment with full context |
| Max retries exceeded | Escalate to user |

### Commit on Pass

After each gate passes, deploy reaper:branch-manager to commit the current state on the feature branch using conventional commit format:
- Tests pass: `test: all tests passing with X% coverage`
- Lint fixed: `style: fix linting errors`
- Review issues fixed: `refactor: address code review feedback`

Commits go to the feature branch only — never master, main, or develop — unless the user prescribes otherwise.

Frequent commits on feature branches create restore points and document progress.

### Parallel Deployment Pattern

After Gate 1 passes, deploy Gate 2 agents in a single message. Look up the Gate 2 column in the profile table and deploy the Gate 2 agents listed for the detected work type in parallel.

See the Gate 2 dispatch instructions above for the full prompt structure to use when invoking the Gate 2 reviewer.

If either fails, combine `blocking_issues` from both before redeploying the coding agent.

### Information Handoff

- **Coding agent to reaper:test-runner**: Pass `narrative_report.summary` for test scope context, plus TEST_COMMAND and LINT_COMMAND from project config
- **reaper:test-runner to Gate 2 reviewer**: Pass full test results JSON (test_exit_code, coverage_percentage, lint_exit_code, test_metrics) alongside SKILL_CONTENT, WORK_TYPE, and PLAN_CONTEXT
- **reaper:test-runner to reaper:security-auditor**: Pass plan context only (security-auditor does not need test results)


### LOOP CHECKPOINT: Return to Per-Unit Cycle

After the gates pass for the current work unit, check TodoWrite for remaining units:
- **Pending units remain** --> return to Per-Unit Cycle step 1 for the next unit
- **All units completed** --> proceed to Learning Extraction below

Do not fall through to Completion while TodoWrite has pending work units.

## Learning Extraction

After all quality gates pass but before presenting to the user, check whether any gate required 2 or more iterations. If so:

1. Review the `blocking_issues` from each failed attempt
2. Identify recurring categories (same class of issue across iterations)
3. For each recurring category, draft a one-line CLAUDE.md entry that would prevent recurrence

Apply a two-question filter: (a) Would Claude make this mistake again without the entry? (b) Is the lesson non-obvious from existing files?

Maximum 3 suggestions per session. Never auto-apply these entries -- always direct the user to `/reaper:claude-sync` for review. If no patterns recurred, omit this section from the output.

---

### STOP -- Verify Before Completion

Do not read past this point without performing the verification steps below. This is a mandatory checkpoint.

1. **Re-read**: Use **TaskList** to read all TodoWrite entries right now
2. **Count**: Count entries with status "pending" or "in_progress", excluding "User review", "Merge", "Close", and "Clean up" entries
3. **Decide**:
   - If count > 0: State "N work units remain -- returning to Per-Unit Cycle" and go back to Strategy Execution
   - If count === 0: Proceed to Completion below

---

## Completion and User Feedback

**Trigger condition (verified by the STOP checkpoint above):** The TaskList re-read confirmed zero pending or in_progress work unit entries. All quality gates for the final unit have passed.

If you did not perform the STOP checkpoint above, go back and do it now.

When these conditions are met, present a **Touchdown Card** followed by a work summary. Use the gauge vocabulary from the Visual Vocabulary section.

```
  TOUCHDOWN
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Task:       [TASK-ID]
  Branch:     [branch-name]
  Units:      [N of N completed]
  ██████████  LANDED
```

Then render a final **Gate Panel** showing the cumulative result of all gates across all work units. Each gate row should show `PASS` with its aggregate metrics (total tests passed, overall coverage, total issues found).

After the cards, present the work summary in this format:

```markdown
### What Was Built
[Brief description of implemented functionality]

### Files Changed
[List of modified files with brief descriptions]

### How to Test
[Instructions for the user to verify the work]

### Suggested CLAUDE.md Updates
[Only if learning extraction produced suggestions]
These patterns caused multiple iteration cycles:
- `[entry]`
Run `/reaper:claude-sync` to review and apply.

---
**Control tower, how do we look?** I can adjust the approach, run additional checks,
or address any concerns before final landing.

When you're satisfied, I'll bring her in for landing on develop.
```

### Response Handling

| User Response | Action |
|---------------|--------|
| Feedback or questions | Address concerns, re-run quality gates if changes were made |
| "looks good" / "nice work" | Ask: "Shall I merge to develop?" |
| "merge" / "ship it" / "approved" | Deploy reaper:branch-manager to merge |
| Silence or unclear | Ask: "Any feedback, or ready to merge?" |

## Worktree Cleanup

After a successful merge, invoke the `worktree-manager` skill to safely remove the session worktree.

For **medium_single_branch** and **very_small_direct** strategies: invoke the worktree-manager skill to remove the shared worktree after all units complete and gates pass (at Completion, not per-unit). Always go through the worktree-manager skill -- never run `git worktree remove` directly.

## Quick Reference

1. Parse inputs and query task system
2. Discover plan file and extract context
3. Detect pre-planned structure or deploy reaper:workflow-planner
4. Validate work package sizes
5. Write plan to TodoWrite

**Per-unit loop (repeat for EACH work unit):**

>  **6. Render TAKING OFF announcement** for the current work unit
>  **7. Deploy coding agent** for the current work unit
>  **8. Classify files and select gate profile** (Dynamic Gate Selection)
>  **9. Run quality gates** through the profile sequence
>  **10. Auto-iterate** on gate failures (differential retry limits)
>  **--> Check TodoWrite: pending units remain? Loop to step 6**

11. Extract learning patterns from multi-iteration gates
12. Present completed work to user
13. Merge on explicit user approval
14. Clean up worktrees
