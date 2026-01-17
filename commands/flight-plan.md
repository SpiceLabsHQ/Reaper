---
description: Chart work into flight-ready issues with dependencies mapped.
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
    TASK_SYSTEM=$([ -d .beads ] && echo "beads" || echo "jira")
    PLANNING_REQUEST="$INPUT"
fi
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

### User Intervention Markers

Mark units as `Assignee: user` when they require:
- Physical device testing
- Vendor/third-party coordination
- Approval workflows
- Production console configuration
- License/purchase acquisition

---

## Phase 3: Present Initial Plan

**Goal: Show something useful quickly, then refine iteratively.**

Present a complete first-pass plan. Document any assumptions made so user can correct them.

### Required Sections

1. **Overview:** Goal (1-2 sentences), Scope (included/excluded), Success criteria
2. **Assumptions:** List any assumptions made (user can correct in feedback)
3. **Work Units Table:**
   | # | Title | Type | Hours | Parallel | Assignee | Blocked By |
   |---|-------|------|-------|----------|----------|------------|
   | 1 | Example unit | Story | 2h | Group A | agent | - |

4. **Unit Details:** Description, acceptance criteria, estimated files (per unit)
5. **Parallel Execution:** Groups, sequence diagram
6. **Dependencies:**
   ```mermaid
   flowchart TD
       Epic --> Unit1 & Unit2
       Unit1 & Unit2 --> Unit3
   ```
7. **User Intervention:** Table of manual tasks with reasons
8. **Estimates:** Total units, parallelizable %, critical path

### Conversational Feedback Prompt

End the plan with a natural prompt (NOT a numbered survey):

```markdown
---

**Ready to create these issues?**

Reply "go" to create as shown, or just tell me what to change.
```

Do NOT list questions. Let the user respond naturally with any concerns or changes.

---

## Phase 4: Iterative Refinement

### Handling User Feedback

Parse response type:
- **Approve:** "yes", "looks good", "go ahead", "approved", "create", "lgtm", "go" → Proceed to Phase 5
- **Cancel:** "cancel", "no", "stop", "abort" → Acknowledge and stop
- **Feedback:** Any other response → Refine and re-present

### Refinement Process

When user provides feedback:

1. **Acknowledge briefly** - "Got it, I'll [summary of change]."
2. **Apply changes** - Update the plan based on feedback
3. **Re-present** - Show updated plan (full or diff based on change scope)
4. **Prompt again** - Same conversational format

### Refinement Guidelines

- Keep cycles fast - don't re-run all research for minor tweaks
- After major feedback, may re-run targeted Explore agents
- Track which assumptions were corrected
- If 3+ cycles without convergence, summarize outstanding questions concisely

### Example Refinement Exchange

```
User: "Unit 3 should come before unit 2, and add a migration task"

Agent: "Got it - swapping order and adding migration unit."

[Updated plan with changes highlighted]

---

**Ready to create these issues?**

Reply "go" to create as shown, or just tell me what to change.
```

The flow should feel like a conversation, not an interview

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

# Create child issues with parent relationship
ISSUE_ID=$(bd create "[Title]" -t task -p 2 --parent "$EPIC_ID")

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
# Create with parent
acli jira workitem create --project KEY --type Story --parent "$EPIC_KEY" \
    --summary "[Title]" --description "[Description]"

# Assign to user
acli jira workitem create ... --assignee user@example.com
```

### Markdown Fallback

If no task system available, output full plan as markdown for manual use.

---

## Phase 6: Issue Quality Review (Forked Subagent Verification)

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
Your flight plans have been filed and you're cleared for departure. When ready:
`/reaper:takeoff [EPIC-ID]`
```

Mark todo #3 complete.

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
