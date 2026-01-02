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
  { content: "Launch workflow-planner subagent to verify issues", status: "pending" }
])
```

**Rules:**
- Dynamic system name in todo #2 based on detection
- Sub-breakdowns allowed (e.g., "Create epic", "Create 5 child issues")
- **FORBIDDEN:** Any todo mentioning worktrees, implementation, coding, testing, deploying

These 3 core todos define your complete scope. When all complete, STOP.

---

## Phase 2: Analyze and Decompose

### Work Analysis

Identify:
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

## Phase 3: Generate Plan Document

Present plan with these sections:

### Required Sections

1. **Overview:** Goal (1-2 sentences), Scope (included/excluded), Success criteria
2. **Work Units Table:**
   | # | Title | Type | Hours | Parallel | Assignee | Blocked By |
   |---|-------|------|-------|----------|----------|------------|
   | 1 | Example unit | Story | 2h | Group A | agent | - |

3. **Unit Details:** Description, acceptance criteria, estimated files (per unit)
4. **Parallel Execution:** Groups, sequence diagram
5. **Dependencies:**
   ```mermaid
   flowchart TD
       Epic --> Unit1 & Unit2
       Unit1 & Unit2 --> Unit3
   ```
6. **User Intervention:** Table of manual tasks with reasons
7. **Estimates:** Total units, parallelizable %, critical path
8. **Next Steps:** Approval instructions

---

## Phase 4: User Approval

Wait for response:
- **Approve:** "yes", "looks good", "go ahead", "approved", "create", "lgtm"
- **Cancel:** "cancel", "no", "stop", "abort"
- **Modify:** Any description of changes → regenerate plan

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

## Phase 6: Issue Quality Review (Subagent Verification)

Update todo #3 to `in_progress`.

### Deploy workflow-planner for Verification

After creating issues, launch workflow-planner in VERIFICATION_MODE to review them:

```bash
Task --subagent_type workflow-planner \
  --model opus \
  --prompt "MODE: VERIFICATION (not planning)
EPIC: $EPIC_ID
TASK_SYSTEM: $TASK_SYSTEM
ORIGINAL_REQUEST: [original planning request]
CREATED_ISSUES: [list of issue IDs created in Phase 5]

You are reviewing issues that were ALREADY CREATED. Do NOT create new issues.
Query the issue hierarchy and verify each issue meets orchestratability criteria.

VERIFICATION QUERIES:
- Beads: bd dep tree $EPIC_ID (full hierarchy)
- Beads: bd show <id> (each child issue details)
- Jira: acli jira workitem search --jql 'parent = $EPIC_ID'
- Jira: acli jira workitem view <id> (each child issue details)

VERIFICATION CRITERIA:

1. **Issue Detail Sufficiency**
   - Each issue has clear objective (what needs to be done)
   - Affected files/components specified or discoverable
   - Acceptance criteria present (when is it done?)
   - Size within limits (≤5 files, ≤500 LOC estimated)

2. **Cross-Issue Awareness**
   - Related issues (same module, same API) reference each other
   - File overlap between issues is documented
   - No agent will accidentally duplicate work from another issue
   - Each issue knows what OTHER issues are working on nearby code

3. **Relationship Appropriateness**
   - parent-child used for hierarchy (epic → story → task)
   - blocks ONLY for true execution order (A must finish before B starts)
   - Blockers are DISCOURAGED - prefer parallel work when possible
   - No circular dependencies in the graph

4. **Orchestratability**
   - spice:orchestrate can determine execution order from relationships
   - Parallel work opportunities are clear and documented
   - Critical path is identifiable
   - Agents know scope boundaries (when to stop working)

AUTO-FIX PROTOCOL (MANDATORY):
For each failing check, update the issue directly using:
- Beads: bd update <id> --description 'updated description'
- Jira: acli jira workitem update <id> --description 'updated description'

Fixes to apply:
- Missing acceptance criteria → Add to issue description
- Missing cross-references → Add 'Related: <other-id>' to descriptions
- Inappropriate blockers → Remove with bd dep remove, add parent-child instead
- Missing file scope → Add 'Files: ...' to description

After applying fixes, re-verify the fixed issues. Max 2 iterations.

OUTPUT: JSON with verification_mode, issues_verified, verification_results, validation_status"
```

### Handling Verification Results

Parse workflow-planner JSON response:
- **all_checks_passed: true** → Proceed to Phase 7 confirmation
- **auto_fixed: true** → Fixes applied, verification passed
- **requires_user_input: true** → Present blocking_issues to user after 2 failed iterations

### Confirmation Output

```markdown
## Planning Complete ✓

### Epic: [EPIC-ID] - [Title]

### Issues Created & Verified
| ID | Title | Type | Status | Blocked By |
|----|-------|------|--------|------------|
| [ID-1] | [Title] | Story | ✓ Verified | - |

### Verification Summary
- Detail Sufficiency: ✓ All issues have acceptance criteria
- Cross-Issue Awareness: ✓ Related issues reference each other
- Relationship Appropriateness: ✓ No unnecessary blockers
- Orchestratability: ✓ Ready for spice:orchestrate

### Next Step
`/spice:orchestrate [EPIC-ID]`
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
- **Insufficient context:** Ask clarifying questions before planning
