---
description: Chart work into flight-ready issues with dependencies mapped.
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


Do not use EnterPlanMode or ExitPlanMode tools. This command manages its own planning workflow and plan file output.

---

## Phase 0: Plan File Schema

## Plan File

### Path Convention

Write the plan to: `$CLAUDE_PROJECT_DIR/.claude/plans/reaper-[semantic-name].md`

Derive the semantic name from the planning request (2-4 words, lowercase, hyphenated).

### Schema

Create the plan file with this structure on first write:

```markdown
# Plan: [Title from input]

## Input
[Original user request - IMMUTABLE after initial write]

## Research
[Codebase research findings - progressively added]

## Strategy
[Selected strategy name, complexity score with breakdown, rationale for strategy choice]

## Work Units
| # | Title | Type | Status | Blocked By |
[Table of decomposed work units with details below]

## Dependencies
[Mermaid flowchart showing execution order and blocking relationships]

## Proposed ADRs
> ✦ PLANNING DECISION — Review before approving this flight plan

[Architecture decisions surfaced during planning that warrant long-term documentation.
Empty if no ADR-worthy decisions were detected.]
```



---

# Autonomous Execution Planner

**Task**: [ARGUMENTS]

Generate an execution plan with epic/issue structure for autonomous execution. After user approval, create issues in the detected task system.

---

## Phase 1: Input Processing & Behavioral Contract

### Detect Input Type

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

<!-- user-comms: say "checking the task system" not "detecting TASK_SYSTEM" -->
<!-- user-comms: say "loading the right tools for your task tracker" not "Platform Skill Routing table" -->
After detecting TASK_SYSTEM, load the corresponding skill from the Platform Skill Routing table above. The loaded skill provides platform-specific command mappings for all abstract operations used in this command (FETCH_ISSUE, CREATE_ISSUE, UPDATE_ISSUE, ADD_DEPENDENCY, LIST_CHILDREN, QUERY_DEPENDENCY_TREE).

Classify the input (ARGUMENTS) as one of:
<!-- user-comms: say "retrieving task details" not "FETCH_ISSUE" -->
- **Existing epic ID** (e.g., `PROJ-123` or `repo-a3f`): Use FETCH_ISSUE to retrieve epic details. Validate the epic has no existing children via LIST_CHILDREN -- if children exist, stop and report the conflict.
- **New description**: Detect the available task system using the detection heuristics above. Store the description as the planning request.

### Markdown-Only Mode Detection

<!-- user-comms: say "no task tracker detected, plan file will be the deliverable" not "TASK_SYSTEM is markdown_only" -->
When no task system is detected, inform the user the plan file will be the primary deliverable. Update behavioral contract todo #2 to: "Finalize plan file as deliverable (no task system)".

### Validation
- **Existing epic:** Must have no children (empty)
- **New description:** Minimum 20 characters
- **Ambiguous system:** Ask user preference if both available

### Behavioral Contract

<!-- user-comms: say "tracking progress" not "TaskCreate" -->
<!-- user-comms: say "recording progress" not "TaskUpdate" -->
<!-- user-comms: say "your project's task tracking setup" not "behavioral contract" -->
After detecting task system, create three core tasks via TaskCreate with blocking dependencies:

1. **TaskCreate**: "Show plan for user approval" → set `in_progress`
2. **TaskCreate**: "Create issues in [Beads|Jira|Markdown]" (dynamic system name)
3. **TaskCreate**: "Launch reaper:workflow-planner subagent to verify issues"

Then establish blockers via TaskUpdate:
- Task #2 `addBlockedBy: [#1]` — cannot create issues until plan is approved
- Task #3 `addBlockedBy: [#2]` — cannot verify issues until they exist

Sub-breakdowns are allowed. No task should mention worktrees, implementation, coding, testing, or deploying. These 3 tasks define your complete scope -- when all complete, STOP.

---

## Phase 1.5: Codebase Research (Parallel Exploration)

Before decomposing work, spawn parallel Explore agents to research the codebase. This research informs accurate work unit definitions in Phase 2.

### When to Research

Research is **required** when:
- Planning involves existing codebase modifications
- Feature touches multiple modules or systems
- Integration points are unclear from the request

Research is **skipped** when:
- Creating a new standalone project from scratch
- Request is purely documentation or configuration
- User explicitly provides file lists and architecture details

### Spawn Parallel Explore Agents

Launch multiple Explore agents simultaneously, each targeting a specific research aspect:

```bash
# Spawn research agents in parallel (all run concurrently)
Task --subagent_type Explore \
  --prompt "RESEARCH: Find files and patterns related to '$PLANNING_REQUEST'

  Search for:
  - Files likely affected by this feature/change
  - Existing implementations of similar functionality
  - Test files that cover related code paths

  Output: JSON with { files: [...], patterns_found: [...], notes: string }"

Task --subagent_type Explore \
  --prompt "RESEARCH: Analyze architecture for '$PLANNING_REQUEST'

  Investigate:
  - Module structure in affected areas
  - Design patterns currently in use
  - Abstraction layers and boundaries

  Output: JSON with { architecture: {...}, design_patterns: [...], boundaries: string }"

Task --subagent_type Explore \
  --prompt "RESEARCH: Identify dependencies and integration points for '$PLANNING_REQUEST'

  Discover:
  - Internal dependencies between modules
  - External API/service integrations
  - Shared utilities and helpers used
  - Database/storage touchpoints

  Output: JSON with { internal_deps: [...], external_integrations: [...], shared_utils: [...] }"
```

### Aggregate Research Findings

After all Explore agents complete, aggregate their findings into a research summary:

```markdown
### Codebase Research Summary

**Affected Files** (from file discovery):
- [list of files likely to be modified]
- [list of related test files]

**Architecture Context** (from architecture analysis):
- Current patterns: [patterns in use]
- Module boundaries: [relevant boundaries]

**Dependencies** (from integration analysis):
- Internal: [module dependencies]
- External: [API/service integrations]
- Shared: [common utilities]

**Planning Implications**:
- [key insights that affect work unit decomposition]
- [potential complexity areas identified]
- [parallel work opportunities discovered]
```

### Use Research in Phase 2

The research summary directly informs Phase 2 decomposition:
- File lists help define work unit scope
- Architecture context ensures pattern consistency
- Dependencies reveal hidden blockers and integration needs
- Parallel opportunities inform work groupings

---

## Phase 2: Quick Analysis (Minimal Questions)

### Question Philosophy

**Bias toward action, not interrogation.**

- Generate a first-pass plan immediately based on available context
- Only ask clarifying questions if input is **truly ambiguous** (rare)
- Maximum 0-2 upfront questions, asked together (never more)
- When in doubt, make reasonable assumptions and note them in the plan

### When Questions Are Appropriate

Ask upfront ONLY if:
- The request could mean two fundamentally different things (scope ambiguity)
- A critical constraint is completely unknown and uninferable
- The wrong assumption would waste significant effort

**Do NOT ask about:**
- Implementation details (resolve during planning)
- Nice-to-have clarifications (make assumptions, note them)
- Things discoverable from codebase exploration
- Preferences that can be refined later

### Question Format (When Necessary)

If you must ask (rare): briefly restate the plan, ask the question, and offer a "proceed with assumptions" escape hatch. Never present more than 2 questions.

### Work Analysis

Using research from Phase 1.5, identify:
1. **Epic Definition:** Title, goal, scope boundaries, success criteria
2. **Work Units:** Discrete issues following constraints below
3. **Parallel Opportunities:** Units with no file overlap or dependencies
4. **Dependencies:** Blocking relationships and critical path
5. **User Intervention:** Tasks requiring manual action (assign to `user`)

### Work Unit Constraints

| Constraint | Limit |
|------------|-------|
| Files per unit | ≤5 |
| LOC per unit | ~500 |
| Estimated time | 1-2 hours |
| Responsibility | Single testable outcome |
| TDD methodology | Tests BEFORE implementation |

**TDD Requirement:** Each work unit MUST follow Red-Green-Blue cycle:
1. **RED**: Write failing tests that define expected behavior
2. **GREEN**: Implement minimal code to pass tests
3. **BLUE**: Refactor while keeping tests green

**Anti-pattern warning:** Never structure work units as "implement feature" followed by "add tests". Tests and implementation belong in the SAME work unit, with tests written FIRST.

### User Intervention Markers

Mark units as `Assignee: user` when they require:
- Physical device testing
- Vendor/third-party coordination
- Approval workflows
- Production console configuration
- License/purchase acquisition

### ADR Detection

After completing work analysis, evaluate whether any decisions made during research and planning meet the ADR bar.

**ADR-worthy decisions share these characteristics — a candidate must meet at least one:**

1. **Non-obvious**: The reasoning will not be apparent from reading the code alone. A future developer would wonder "why was this done this way?"
2. **Consequential**: The decision meaningfully shapes how the feature works or constrains how future code in this area will be written.
3. **Deliberate**: A choice was made between two or more valid approaches with meaningfully different trade-offs, and the reasoning for the selection would not be obvious to a future developer.
4. **Convention-establishing**: The work creates or changes a pattern that future developers will follow across the codebase.

**Not ADR-worthy**: routine implementation choices within an established pattern, obvious bug fixes, minor refactors, decisions fully explained by the task description.

**For each ADR candidate detected:**

1. Check `docs/adr/` to determine the next sequential number (e.g., if the last is `0012-*.md`, the next is `0013`). If the directory does not exist or contains no ADRs, start at `0001`.

2. Draft a proposed ADR entry in the plan file under `## Proposed ADRs`:
   ```
   ### ADR-NNNN: [Short decision title]
   **Why this warrants an ADR**: [Name the specific characteristic — non-obvious / consequential /
   convention-establishing — and explain in 1-2 sentences how this decision meets it.]
   **Context**: [What problem or constraint forced this decision]
   **Decision**: [What was chosen]
   **Alternatives rejected**: [What was considered and why it was passed over]
   ```

3. Add a `Write ADR-NNNN` work unit to the plan (type `docs`, unblocked):
   - Title: `Write ADR-NNNN: [decision title]`
   - Description: finalize and commit the proposed ADR document to `docs/adr/`
   - No TDD required — this is a documentation task

If no ADR candidates are detected, leave `## Proposed ADRs` empty with the placeholder text and do not add any write-ADR work units.

---

## Phase 3: Write Initial Plan to File

Use the Write tool to create the plan file at the path from Phase 0, following its schema. Populate each section:

- **Input**: Original user request verbatim from ARGUMENTS
- **Research**: Findings from Phase 1.5 Explore agents (affected files, architecture context, dependencies, planning implications)
- **Strategy**: Leave as placeholder -- will be populated during execution by workflow-planner
- **Work Units**: Table from Phase 2 analysis, followed by detailed Unit sections (each with Description, Acceptance Criteria, Estimated Files)
- **Dependencies**: Mermaid flowchart showing execution order, critical path, and parallel opportunities
- **Proposed ADRs**: Drafted ADR content from Phase 2 ADR Detection; empty placeholder if no candidates were found
- **Assumptions**: Planning assumptions the user can correct in feedback
- **Feedback Log**: Empty on first write -- populated during Phase 4 refinement

### After Writing the Plan

Present a **flight briefing** to the user that summarizes the plan before asking for approval. Include:

1. **Plan file path** (link to the plan for full details)
2. **Epic title and goal** (one-liner)
3. **Work units summary** — for each unit: number, title, type, estimated hours, and whether it runs in parallel
4. **Critical path** — which units are sequential blockers
5. **Parallelization** — percentage of work that can run concurrently
6. **Key assumptions** — list assumptions the user might want to correct
7. **Proposed ADRs** — if any ADR candidates were detected, present a callout per ADR. Keep it brief — full proposal lives in the plan file:

   ```
   ✦ PROPOSED ADR — ADR-NNNN: [Title]
   ─────────────────────────────────────────────────────
   [1-2 sentence justification naming the specific criterion met]
   See full proposal in the plan file under Proposed ADRs.
   A "Write ADR-NNNN" work unit is included in this plan.
   ```

   If no ADR candidates were detected, omit this section from the briefing entirely — do not mention it.

<!-- user-comms: say "checking the task system" not "TASK_SYSTEM detected in Phase 1" -->
Then prompt for approval using AskUserQuestion. Select the variant based on `TASK_SYSTEM` detected in Phase 1:

<!-- user-comms: say "using [Beads|Jira|GitHub] for task tracking" not "TASK_SYSTEM is Beads, Jira, or GitHub" -->
**If TASK_SYSTEM is Beads, Jira, or GitHub:**

```json
{
  "questions": [{
    "question": "Flight plan filed: N work units, M% parallelizable. Ready for issue creation in [Beads|Jira|GitHub]?",
    "header": "Flight Plan",
    "options": [
      {"label": "Cleared for takeoff", "description": "Create all issues and dependencies in [Beads|Jira|GitHub] as shown in the plan above"},
      {"label": "Revise flight plan", "description": "Circle back to the hangar — request changes to work units, scope, or dependencies before creating issues"}
    ],
    "multiSelect": false
  }]
}
```

<!-- user-comms: say "no task tracker detected" not "TASK_SYSTEM is markdown_only" -->
**If TASK_SYSTEM is markdown_only:**

```json
{
  "questions": [{
    "question": "Flight plan filed: N work units, M% parallelizable. Finalize the plan file as your deliverable?",
    "header": "Flight Plan",
    "options": [
      {"label": "Cleared for takeoff", "description": "Lock in the plan file as the final deliverable — ready for manual task creation or direct /reaper:takeoff execution"},
      {"label": "Revise flight plan", "description": "Circle back to the hangar — request changes to work units, scope, or dependencies before finalizing"}
    ],
    "multiSelect": false
  }]
}
```

Replace `N` with the work unit count and `M` with the parallelization percentage. AskUserQuestion automatically includes an "Other" option that lets the user type freeform feedback (use it to request changes) — see Phase 4 for response handling.

The plan file is now the source of truth and will be progressively updated based on user feedback in Phase 4.

---

## Phase 4: Iterative Refinement (Plan File Updates)

### Handling AskUserQuestion Responses

Map the user's AskUserQuestion selection:

| Selection | Action |
|-----------|--------|
| **Cleared for takeoff** | Proceed to Phase 5 |
| **Revise flight plan** | Ask the user what they want to change, then apply feedback and re-prompt (same as "Other" path) |
| **Other** (freeform text) | Treat as feedback — update plan file and re-prompt |

### Refinement Using Edit Tool

When the user selects "Other" and provides feedback:

1. **Apply changes** using the update rules defined in the plan file schema above.
2. **Summarize changes** to the user, then call AskUserQuestion again with the same structure as Phase 3. Update `N` (work unit count) and `M` (parallelization percentage) in the question text if work units changed. Use the task-system or markdown-only variant matching the detected `TASK_SYSTEM`.

### Refinement Guidelines

- Keep cycles fast -- use targeted edits, not full rewrites
- Track corrected assumptions with strikethrough
- After major feedback, may re-run targeted Explore agents
- The flow should feel like a conversation, not an interview

---

## Phase 5: Create Issues (After Approval)

Update todo #2 to `in_progress`.

### Issue Creation

Delegate all issue creation to the loaded platform skill. The skill maps abstract operations to platform-specific commands.

For each work unit in the approved plan:

<!-- user-comms: say "creating a task" not "CREATE_ISSUE" -->
<!-- user-comms: say "updating the task" not "UPDATE_ISSUE" -->
1. **Epic (create or update)**:
   - If an existing epic was provided as input: UPDATE_ISSUE to refine its description
   - Otherwise: CREATE_ISSUE with type=epic, title from plan, description from plan Input section

2. **Child issues** (one per work unit):
   - CREATE_ISSUE with title, parent=EPIC_ID, and the TDD-structured description below
   - For user intervention tasks: set assignee=user
   - The `parent=EPIC_ID` parameter on CREATE_ISSUE establishes parent-child hierarchy. Do NOT use ADD_DEPENDENCY for this purpose.

<!-- user-comms: say "linking a dependency" not "ADD_DEPENDENCY" -->
3. **Dependencies** (from plan's dependency graph):
   - ADD_DEPENDENCY with type=blocks for execution order constraints
   - ADD_DEPENDENCY with type=related for informational links

### TDD-Structured Issue Description Template

Each child issue description must follow this structure:

```
## Objective
[What needs to be done]

## TDD Approach
Follow Red-Green-Blue cycle:
1. RED: Write failing tests that define expected behavior
2. GREEN: Implement minimal code to pass tests
3. BLUE: Refactor while keeping tests green

## Acceptance Criteria
- [ ] [criterion from plan]
- [ ] All tests pass
- [ ] Code coverage meets threshold

## Scope
Files: [estimated files from plan]
```

> **ID Generation:** Task IDs are automatically generated by the task system upon creation. Never specify IDs manually -- capture the returned ID for use in subsequent operations.

---

## Phase 6: Issue Quality Review (Forked Subagent Verification)

**Note:** This phase is skipped when `TASK_SYSTEM` is `markdown_only`.

Update todo #3 to `in_progress`.

### Deploy Forked reaper:workflow-planner for Verification

The verification subagent is forked (inherits full parent session context: conversation history, research results, cached file reads, refinement context). This allows a minimal prompt.

```bash
# Fork pattern: subagent inherits full parent session context
Task --subagent_type reaper:workflow-planner \
  --model opus \
  --prompt "MODE: VERIFICATION (not planning)

EPIC: $EPIC_ID
TASK_SYSTEM: $TASK_SYSTEM
CREATED_ISSUES: [list of issue IDs created in Phase 5]

You have full access to this session's context:
- The original planning request and user clarifications
- Research findings from Phase 1.5 Explore agents
- Any refinements made during Phase 4 iterations

Verify the created issues meet orchestratability criteria. Do NOT create new issues.

<!-- user-comms: say "checking dependencies" not "QUERY_DEPENDENCY_TREE" -->
<!-- user-comms: say "retrieving task details" not "FETCH_ISSUE" -->
VERIFICATION QUERIES (use abstract operations from the detected task system):
- QUERY_DEPENDENCY_TREE from EPIC_ID (full hierarchy)
- FETCH_ISSUE for each child issue (details and acceptance criteria)

VERIFICATION CRITERIA:

1. **Issue Detail Sufficiency**
   - Clear objective (what needs to be done)
   - Affected files/components (reference research findings if needed)
   - Acceptance criteria present
   - Size within limits (≤5 files, ≤500 LOC)

2. **Cross-Issue Awareness**
   - Related issues reference each other
   - File overlap documented (use research findings)
   - No duplicate work between issues

3. **Relationship Appropriateness**
   - parent-child for hierarchy
   - blocks ONLY for true execution order
   - No circular dependencies

4. **Orchestratability**
   - reaper:takeoff can determine execution order
   - Parallel opportunities documented
   - Scope boundaries clear

AUTO-FIX PROTOCOL:
For each failing check, use UPDATE_ISSUE to fix directly. Add missing acceptance criteria, cross-references, file scope. Remove inappropriate blockers.

Max 2 fix iterations.

OUTPUT: JSON with verification_mode, issues_verified, verification_results, validation_status"
```

**Note:** The prompt is intentionally concise. The forked subagent can access the full planning conversation without explicit repetition.

### Handling Verification Results

Parse reaper:workflow-planner JSON response:
- **all_checks_passed: true** → Proceed to Phase 7 confirmation
- **auto_fixed: true** → Fixes applied, verification passed
- **requires_user_input: true** → Present blocking_issues to user after 2 failed iterations

### Confirmation Output

After successful verification, present:
- Epic ID and title
- Table of created issues with verification status
- Pre-flight check summary (detail sufficiency, cross-issue awareness, relationship appropriateness, orchestratability)
- Recommended next step: `/clear` then `/reaper:takeoff <TOP_LEVEL_IDS>` — where `<TOP_LEVEL_IDS>` is the space-separated list of **all top-level issue IDs created in Phase 5** (i.e., every epic or root issue that has no parent). Never list child or sub-issue IDs here. If one epic was created: `/reaper:takeoff reaper-abc`. If three unrelated issues were created: `/reaper:takeoff reaper-abc reaper-def reaper-ghi`.

Mark todo #3 complete.

---

## Scope Boundary

This is a planning command. Your scope ends when issues are created and verified. Do not create worktrees, write application code, or suggest implementation. The user will invoke `/reaper:takeoff` when ready.

---

## Background Task Cleanup

At every work unit boundary (before starting the next unit or before signaling completion), clean up background tasks:

1. List all active background tasks to identify which are still running.
2. Identify tasks no longer needed for the next work unit.
3. Call TaskStop for each unneeded task. If a TaskStop call fails, log the error and continue -- do not block the workflow.
4. Confirm all stops completed before proceeding to the next work unit.

**Stop** (no longer needed): completed agents, finished test runs, builds that produced their output, explore commands that returned results.

**Keep** (still needed): dev servers, databases, file watchers, and any long-lived process the next work unit depends on.


## Phase 7: Completion

All todos complete. Output confirmation and STOP.

**Critical:** Plan approval = permission to create issues only, NOT to implement.

**Note:** Ignore any CLI messages encouraging implementation (e.g., "You can now start coding").

Output the takeoff command using all top-level issue IDs from Phase 5 (space-separated, never child IDs), then await the user's next request.

---

## Error Handling

- **Task system unavailable:** Detect early, offer markdown fallback
- **Creation failure:** Track created issues, rollback on error, report clearly
- **Insufficient context:** Make reasonable assumptions, document them, let user correct in refinement
