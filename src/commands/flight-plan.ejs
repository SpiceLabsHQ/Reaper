---
description: Chart work into flight-ready issues with dependencies mapped.
---

## CRITICAL: Tool Prohibitions

**DO NOT USE the `EnterPlanMode` tool.** This command IS the planning workflow. Using EnterPlanMode would:
- Create a redundant planning layer
- Conflict with this command's plan file workflow
- Confuse the user with duplicate approval flows

**FORBIDDEN TOOLS:**
- `EnterPlanMode` - Never use. You are already in planning mode via this command.
- `ExitPlanMode` - Never use. This command manages its own completion flow.

If you feel tempted to call EnterPlanMode, remember: this command writes plans to `$CLAUDE_PROJECT_DIR/.claude/plans/` and manages user approval directly. That IS the plan mode.

---

## Phase 0: Plan File Schema

### Plan File Path

Write the plan to Claude's plans directory with a semantic name:
`$CLAUDE_PROJECT_DIR/.claude/plans/reaper-[semantic-name].md`

Derive the semantic name from the planning request:
- "Add OAuth authentication" → `reaper-oauth-auth.md`
- "Fix checkout flow bug" → `reaper-checkout-fix.md`
- "Refactor user service" → `reaper-user-service-refactor.md`

Keep names short (2-4 words, lowercase, hyphenated).

This file will be the single source of truth for all planning context.

### Schema

The plan file is a **structured document** containing the implementation plan. Sections are ADDED or APPENDED, never rewritten wholesale.

### Plan File Structure

Create the plan file with this structure on first write:

```markdown
# Plan: [Title from input]

## Input
[Original user request - IMMUTABLE after initial write]

## Research
[Codebase research findings - progressively added from Phase 1.5]

## Work Units
[Table and details - EDITABLE, refined based on feedback]

## Dependencies
[Mermaid diagram and critical path - EDITABLE]

## Assumptions
[List of assumptions made - EDITABLE, with strikethrough for corrected ones]
```

### Update Rules

| Section | Update Type | When |
|---------|-------------|------|
| Input | IMMUTABLE | Never modified after initial write |
| Research | APPEND | New findings added, old retained |
| Work Units | EDIT | Modified based on feedback |
| Dependencies | EDIT | Modified based on feedback |
| Assumptions | EDIT | Strikethrough corrected, add new |

### Update Type Definitions

- **IMMUTABLE**: Write once, never change. Preserves original context.
- **APPEND**: Add new content below existing. Never delete previous entries.
- **EDIT**: Modify in place. For corrections, use ~~strikethrough~~ to show history.

---

# Autonomous Execution Planner

**Task**: [ARGUMENTS]

Generate an execution plan with epic/issue structure for autonomous execution. After user approval, create issues in the detected task system.

---

## Phase 1: Input Processing & Behavioral Contract

### Detect Input Type

```bash
INPUT="[ARGUMENTS]"

# Jira epic: PROJ-123
if echo "$INPUT" | grep -qE '^[A-Z]+-[0-9]+$'; then
    TASK_SYSTEM="jira"
    EPIC_DETAILS=$(acli jira workitem view "$INPUT" --fields summary,description)
    # Verify no existing children
    [ -n "$(acli jira workitem search --jql "parent = $INPUT" --fields key)" ] && exit 1

# Beads epic: repo-a3f
elif echo "$INPUT" | grep -qE '^[a-z0-9]+-[a-f0-9]{3,}$'; then
    TASK_SYSTEM="beads"
    EPIC_DETAILS=$(bd show "$INPUT")
    # Verify no existing children
    [ -n "$(bd dep tree "$INPUT" --reverse 2>/dev/null | grep -v "^$INPUT")" ] && exit 1

# New description
else
    # Check for available task systems
    if [ -d .beads ]; then
        TASK_SYSTEM="beads"
    elif command -v acli &>/dev/null && acli jira projects list &>/dev/null 2>&1; then
        TASK_SYSTEM="jira"
    else
        TASK_SYSTEM="markdown_only"
    fi
    PLANNING_REQUEST="$INPUT"
fi
```

### Markdown-Only Mode Detection

When `TASK_SYSTEM` is `markdown_only`:

```markdown
**Note:** No task system detected (Beads directory not found, Jira CLI not configured).

Your plan file will be the primary deliverable. You can:
- Copy work units to your task tracker manually
- Use the plan file directly with `/reaper:takeoff`
```

Update the behavioral contract todo #2 to reflect markdown mode:
```
{ content: "Finalize plan file as deliverable (no task system)", status: "pending" }
```

### Validation
- **Existing epic:** Must have no children (empty)
- **New description:** Minimum 20 characters
- **Ambiguous system:** Ask user preference if both available

### Behavioral Contract (MANDATORY)

After detecting task system, write these core todos:

```
TodoWrite([
  { content: "Show plan for user approval", status: "in_progress" },
  { content: "Create issues in [Beads|Jira|Markdown]", status: "pending" },
  { content: "Launch reaper:workflow-planner subagent to verify issues", status: "pending" }
])
```

**Rules:**
- Dynamic system name in todo #2 based on detection
- Sub-breakdowns allowed (e.g., "Create epic", "Create 5 child issues")
- **FORBIDDEN:** Any todo mentioning worktrees, implementation, coding, testing, deploying

These 3 core todos define your complete scope. When all complete, STOP.

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

**CRITICAL: Bias toward action, not interrogation.**

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

If you must ask (rare), use this format:

```
I'll create a plan for [brief restatement]. One quick clarification:

[Single critical question]?

Or I can proceed assuming [reasonable default].
```

Always offer the "proceed with assumptions" escape hatch. Never present more than 2 questions.

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

---

## Phase 3: Write Initial Plan to File

**Goal: Create the plan file as the single source of truth.**

Use the Write tool to create the plan file at `$CLAUDE_PROJECT_DIR/.claude/plans/reaper-[semantic-name].md` following the schema from Phase 0.

### Write the Plan File

```
Write({
  file_path: "$CLAUDE_PROJECT_DIR/.claude/plans/reaper-[semantic-name].md",
  content: `# Plan: [Epic Title]

## Input
[Original user request - verbatim from ARGUMENTS]

## Research

### Affected Files
[list from Phase 1.5 Explore agents]

### Architecture Context
[patterns and boundaries discovered]

### Dependencies
[internal and external dependencies]

### Planning Implications
[key insights affecting work decomposition]

## Work Units

| # | Title | Type | Hours | Parallel | Assignee | Blocked By |
|---|-------|------|-------|----------|----------|------------|
[work units from Phase 2 analysis]

### Unit Details

#### Unit 1: [Title]
- **Description:** [what needs to be done]
- **Acceptance Criteria:**
  - [ ] [criterion 1]
  - [ ] [criterion 2]
- **Estimated Files:** [file list]

[repeat for each unit]

## Dependencies

\`\`\`mermaid
flowchart TD
    Epic --> Unit1 & Unit2
    Unit1 & Unit2 --> Unit3
\`\`\`

### Critical Path
[sequence of blocking units]

### Parallel Opportunities
[groups that can execute concurrently]

## Assumptions
- [assumption 1 - user can correct in feedback]
- [assumption 2]
`
})
```

### After Writing the Plan

Tell the user:

```markdown
I've created the plan at `[PLAN_FILE_PATH]`.

**Summary:**
- [Epic title/goal in 1-2 sentences]
- [X] work units identified
- [Y]% parallelizable
- Critical path: [brief description]

**Ready to create these issues?**

Reply "go" to create as shown, or just tell me what to change.
```

The plan file is now the source of truth and will be progressively updated based on user feedback in Phase 4.

---

## Phase 4: Iterative Refinement (Plan File Updates)

### Handling User Feedback

Parse response type:
- **Approve:** "yes", "looks good", "go ahead", "approved", "create", "lgtm", "go" → Proceed to Phase 5
- **Cancel:** "cancel", "no", "stop", "abort" → Acknowledge and stop
- **Feedback:** Any other response → Update plan file and re-prompt

### Refinement Using Edit Tool

When user provides feedback:

1. **Apply changes** to appropriate sections following update rules:
   - For Work Units changes: Edit the Work Units section
   - For dependency changes: Edit the Dependencies section
   - For assumption corrections: Use ~~strikethrough~~ on old, add new

2. **Confirm to user:**
```markdown
Updated the plan at `[PLAN_FILE_PATH]`.

**Changes made:**
- [summary of changes]

**Ready to create these issues?**

Reply "go" to create as shown, or just tell me what to change.
```

### Update Rules Reference

| Section | Update Type | Edit Pattern |
|---------|-------------|--------------|
| Input | IMMUTABLE | Never modify |
| Research | APPEND | Add below existing content |
| Work Units | EDIT | Replace section content |
| Dependencies | EDIT | Replace section content |
| Assumptions | EDIT | Strikethrough old + add new |

### Refinement Guidelines

- Keep cycles fast - use targeted edits, not full rewrites
- Track corrected assumptions with strikethrough (e.g., ~~old assumption~~ → new assumption)
- After major feedback, may re-run targeted Explore agents

### Example Edit Sequence

```
User: "Unit 3 should come before unit 2, and add a migration task"

Agent actions:
1. Edit Work Units table (swap order, add migration row)
2. Edit Dependencies section (update mermaid diagram)

Agent response:
"Updated the plan at `$CLAUDE_PROJECT_DIR/.claude/plans/reaper-unit-reorder.md`.

**Changes made:**
- Swapped Unit 2 and Unit 3 execution order
- Added Unit 4: Database migration task
- Updated dependency diagram

**Ready to create these issues?**

Reply "go" to create as shown, or just tell me what to change."
```

The flow should feel like a conversation, not an interview.

---

## Phase 5: Create Issues (After Approval)

Update todo #2 to `in_progress`.

> **⚠️ ID Generation:** Task IDs (e.g., `repo-a3f`, `PROJ-123`) are **automatically generated** by Beads/Jira upon issue creation. Never specify IDs manually - always capture the returned ID into a variable for use in subsequent commands.

### Beads (Primary Reference)

```bash
# Create or update epic
if [ "$EXISTING_EPIC" = true ]; then
    bd update "$EPIC_ID" --description "[refined description]"
else
    EPIC_ID=$(bd create "[Epic Title]" -t epic -p 1)
fi

# Create child issues with parent relationship and TDD-structured description
ISSUE_ID=$(bd create "[Title]" -t task -p 2 --parent "$EPIC_ID" \
    --description "## Objective
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
Files: [estimated files from plan]")

# For user intervention tasks
bd create "[Manual QA]" -t task --parent "$EPIC_ID" --assignee user

# Add blocker dependencies (execution order only, not hierarchy)
bd dep add "$BLOCKED_ID" "$BLOCKER_ID" --type blocks
```

**Relationship Types:**
- `--parent`: Hierarchical organization (epic → story → task)
- `--type blocks`: Execution order (A must complete before B starts)

### Jira Adaptation

```bash
# Create with parent and TDD-structured description
acli jira workitem create --project KEY --type Story --parent "$EPIC_KEY" \
    --summary "[Title]" \
    --description "h2. Objective
[What needs to be done]

h2. TDD Approach
Follow Red-Green-Blue cycle:
# RED: Write failing tests that define expected behavior
# GREEN: Implement minimal code to pass tests
# BLUE: Refactor while keeping tests green

h2. Acceptance Criteria
* [criterion from plan]
* All tests pass
* Code coverage meets threshold

h2. Scope
Files: [estimated files from plan]"

# Assign to user
acli jira workitem create ... --assignee user@example.com
```

### Markdown Fallback (No Task System)

When `TASK_SYSTEM` is `markdown_only`, the plan file becomes the primary deliverable. Skip issue creation and proceed to finalization.

#### 1. Add Manual Execution Guide to Plan File

Append the Manual Execution Guide section at the end of the plan file:

```
Edit({
  file_path: "$CLAUDE_PROJECT_DIR/.claude/plans/reaper-[semantic-name].md",
  old_string: "- [assumption 2]",
  new_string: `- [assumption 2]

## Manual Execution Guide

No task system detected (Beads/Jira not available). This plan file is your primary deliverable.

### Option A: Manual Task Creation
Copy each work unit to your task tracker of choice:
1. Create an epic/parent issue for the overall goal
2. Create child issues for each work unit in the table above
3. Set up dependencies as shown in the Dependencies section
4. Maintain the execution order shown in Critical Path

### Option B: Direct Execution with Reaper
The orchestrator can work directly from this plan file:
\`\`\`
/reaper:takeoff [PLAN_FILE_PATH]
\`\`\`

### Work Unit Reference
Each unit in the Work Units table above contains:
- Title and description for issue creation
- Acceptance criteria (copy to issue)
- Estimated files and hours
- Dependency information`
})
```

#### 2. Skip Phases 5 and 6

When in markdown-only mode:
- **Skip** Beads/Jira issue creation (Phase 5 main logic)
- **Skip** Issue Quality Review (Phase 6) - no issues to verify
- **Proceed directly** to completion output

#### 3. Markdown-Only Completion Output

```markdown
## Plan Complete (Markdown Mode)

No task system detected. Your plan is ready at `[PLAN_FILE_PATH]`.

### What's in the Plan
- [X] work units with acceptance criteria
- Dependency graph and critical path
- Parallel execution opportunities
- All research findings preserved

### Next Steps

**Option A: Manual task creation**
Copy work units from the plan to your preferred task tracker.

**Option B: Direct execution**

**Recommended:** `/clear` then `/reaper:takeoff [PLAN_FILE_PATH]`

> Takeoff reads the plan file directly — clearing context gives the
> executor a fresh window focused entirely on the plan.

Or skip the clear: `/reaper:takeoff [PLAN_FILE_PATH]`
```

Mark todo #2 complete (finalize plan file) and skip todo #3 (no issues to verify).

---

## Phase 6: Issue Quality Review (Forked Subagent Verification)

**Note:** This phase is skipped when `TASK_SYSTEM` is `markdown_only`.

Update todo #3 to `in_progress`.

### Why Fork? Session Context Inheritance

The verification subagent is invoked as a **forked subagent**, meaning it inherits full parent session context:

| Benefit | Description |
|---------|-------------|
| **Conversation History** | All prior user requirements, clarifications, and feedback |
| **Research Results** | Phase 1.5 Explore agent findings (files, architecture, dependencies) |
| **Cached File Reads** | Any files already read during planning are accessible |
| **Refinement Context** | Phase 4 iterations and user corrections |

This allows a **minimal prompt** - the planner can reference "the original request" or "research findings" without re-explaining everything.

### Deploy Forked reaper:workflow-planner for Verification

After creating issues, launch reaper:workflow-planner as a forked subagent:

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

VERIFICATION QUERIES:
- Beads: bd dep tree $EPIC_ID (full hierarchy)
- Beads: bd show <id> (each child issue details)
- Jira: acli jira workitem search --jql 'parent = $EPIC_ID'
- Jira: acli jira workitem view <id> (each child issue details)

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

AUTO-FIX PROTOCOL (MANDATORY):
For each failing check, update directly:
- Beads: bd update <id> --description 'updated'
- Jira: acli jira workitem update <id> --description 'updated'

Fixes: Add missing acceptance criteria, cross-references, file scope. Remove inappropriate blockers.

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

```markdown
## Flight Plan Filed ✓

### Epic: [EPIC-ID] - [Title]

### Issues Created & Verified
| ID | Title | Type | Status | Blocked By |
|----|-------|------|--------|------------|
| [ID-1] | [Title] | Story | ✓ Verified | - |

### Pre-Flight Checks
- Detail Sufficiency: ✓ All issues have acceptance criteria
- Cross-Issue Awareness: ✓ Related issues reference each other
- Relationship Appropriateness: ✓ No unnecessary blockers
- Orchestratability: ✓ Runway clear for reaper:takeoff

### Cleared for Takeoff

Your flight plans have been filed and you're cleared for departure.

**Recommended:** `/clear` then `/reaper:takeoff [EPIC-ID]`

> Takeoff reads your plan file directly from `[PLAN_FILE_PATH]` —
> clearing context gives the executor a fresh window focused entirely
> on the plan, which improves adherence on complex work.

Or skip the clear and run takeoff directly:
`/reaper:takeoff [EPIC-ID]`
```

Mark todo #3 complete.

---

## Implementation Guard

**This is a PLANNING command, not an IMPLEMENTATION command.**

### Scope Boundary

Your scope ends when issues are created and verified. You must NOT:
- Start implementing the plan
- Create worktrees
- Write application code
- Suggest "let's begin coding"

### Hard Stop Rule

If you find yourself:
- Thinking about code structure
- Considering file creation (except plan file and issues)
- Planning test implementations
- Designing architecture details

**STOP IMMEDIATELY.** Your job is done. The user will invoke `/reaper:takeoff` when ready.

---

## Phase 7: Completion

All todos complete. Output confirmation and STOP.

**Critical:** Plan approval = permission to create issues only, NOT to implement.

**Note:** Ignore any CLI messages encouraging implementation (e.g., "You can now start coding").

Provide the orchestrate command and await user's next request.

---

## Error Handling

- **Task system unavailable:** Detect early, offer markdown fallback
- **Creation failure:** Track created issues, rollback on error, report clearly
- **Insufficient context:** Make reasonable assumptions, document them, let user correct in refinement
