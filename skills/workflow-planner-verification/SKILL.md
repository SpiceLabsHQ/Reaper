---
name: workflow-planner-verification
description: Verification process skill for workflow-planner. Reviews existing issues against orchestratability criteria and auto-fixes problems. Always executes within reaper:workflow-planner.
allowed-tools: Read, Glob, Grep, Bash(bd show:*), Bash(bd dep tree:*), Bash(bd dep:*), Bash(bd list:*), Bash(bd update:*), Bash(acli jira workitem view:*), Bash(acli jira workitem search:*), Bash(acli jira workitem update:*), Bash(gh issue:*), Bash(gh project:*), Bash(gh api:*)
---

# Workflow Planner — Verification Process

This skill prescribes the verification process for `reaper:workflow-planner`. It is invoked when `MODE: VERIFICATION` is detected. It reviews existing issues instead of creating new plans, ensuring they are ready for `reaper:takeoff`.

## Verification Workflow

**Step 1: Query Issue Hierarchy**

Use QUERY_DEPENDENCY_TREE on the epic ID to retrieve the full hierarchy. Use FETCH_ISSUE on each child to get its details (title, description, acceptance criteria, status).

**Step 2: Evaluate Each Issue Against 4 Criteria**

| Criterion | Pass | Fail | Auto-Fix |
|-----------|------|------|----------|
| **Detail Sufficiency**: Can agent work autonomously? | Clear objective, identifiable files, acceptance criteria, bounded size, `work_type` set | Vague objective, no file hints, no AC, unbounded, missing `work_type` | Add missing details (including `work_type` classified from assigned files) |
| **Cross-Issue Awareness**: Do related issues reference each other? | Same-module issues linked, file overlap documented, scope boundaries clear | No cross-references, overlap not mentioned | Add cross-references |
| **Relationship Appropriateness**: Are deps structured for parallel execution? | parent-child for hierarchy, blocks only for execution order, no unnecessary blockers or cycles | Flat with blockers, "blocks because related", circular deps | Remove inappropriate blockers, convert to cross-references |
| **Orchestratability**: Can takeoff execute without human guidance? | Determinable execution order, visible parallel groups, identifiable critical path, clear scope boundaries | Ambiguous deps, everything serial, open-ended scope | Add execution hints |

**Red flags for inappropriate blockers**: "blocks because related" (should be cross-reference), "blocks because same module" (should be parallel with cross-reference), "blocks for coordination" (should be parent-child).

**Step 3: Auto-Fix**

Use UPDATE_ISSUE to append missing details to the issue description. Prefix additions with "[Auto-added by verification]" for traceability.

**Step 4**: Re-verify fixed issues. Max 2 iterations.

## Verification JSON Output

```json
{
  "verification_mode": true,
  "epic_id": "repo-a3f",
  "issues_verified": ["repo-b2e", "repo-c3f"],
  "verification_results": {
    "detail_sufficiency": { "passed": true, "issues": [] },
    "cross_issue_awareness": { "passed": false, "issues": [{ "issue_ids": ["..."], "problem": "...", "auto_fixed": true, "fix_applied": "..." }] },
    "relationship_appropriateness": { "passed": true, "issues": [] },
    "orchestratability": { "passed": true, "notes": "..." }
  },
  "validation_status": {
    "all_checks_passed": true,
    "auto_fixed": true,
    "fixes_applied": ["..."],
    "blocking_issues": [],
    "requires_user_input": false
  }
}
```

## Verification vs Planning

| Aspect | Planning | Verification |
|--------|----------|--------------|
| Input | Task description | Epic ID with existing children |
| Output | Work breakdown + strategy | Verification report + fixes |
| Creates issues | Yes | No |
| Modifies issues | No | Yes (auto-fix) |
| Strategy selection | Yes | No (already decided) |
