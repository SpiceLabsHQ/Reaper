---
name: issue-tracker-github
description: GitHub Issues and Projects integration for Reaper's abstract task operations. Maps FETCH_ISSUE, CREATE_ISSUE, and other operations to gh CLI commands.
allowed-tools: Bash, Read, Grep
---

# GitHub Issue Tracker

Maps abstract task operations to `gh` CLI commands. See `gh issue --help` and `gh project --help` for full flag details.

## Quick Reference

| Operation | Command Pattern |
|-----------|----------------|
| FETCH_ISSUE | `gh issue view <number> --json title,body,state,labels,assignees` |
| LIST_CHILDREN | Parse tracking issue body for task list items (`- [ ] #N ...`) |
| CREATE_ISSUE | `gh issue create --title "..." --body "..." --label "..."` |
| UPDATE_ISSUE | `gh issue edit <number> --add-label/--title/--body/--assignee` |
| ADD_DEPENDENCY | Add cross-references to issue bodies (see Dependency Pattern) |
| QUERY_DEPENDENCY_TREE | Recursively parse cross-references from issue bodies |
| CLOSE_ISSUE | `gh issue close <number>` |

## Two Modes

### With GitHub Projects

Detect whether Projects are available:

```bash
gh project list --owner @me --format json --limit 1
```

If projects exist, use them for workflow tracking:

```bash
# Add issue to project
gh project item-add <project-number> --owner @me --url "$(gh issue view <number> --json url -q .url)"

# Update status via custom field
gh project item-edit --id <item-id> --project-id <project-id> --field-id <status-field-id> --single-select-option-id <option-id>
```

Projects provide sprint/kanban views. Use project fields for status tracking instead of labels.

### Without GitHub Projects

Use **tracking issues** as epic replacements. A tracking issue contains a task list in its body that references child issues:

```markdown
## Tasks

- [ ] #101 Set up database schema
- [ ] #102 Implement API endpoints
- [x] #100 Write design doc
```

GitHub renders task list progress automatically. Use labels for grouping (e.g., `epic:auth`, `phase:1`).

## Hierarchy Pattern

GitHub has no native parent-child relationship. Use tracking issues instead.

**CREATE_ISSUE with `parent`:**

1. Create the child issue:
   ```bash
   gh issue create --title "Implement login" --body "Details..." --label "epic:auth"
   ```
2. Append the new issue to the tracking issue's task list:
   ```bash
   # Fetch current body, append task list entry, update
   BODY=$(gh issue view <parent-number> --json body -q .body)
   gh issue edit <parent-number> --body "$BODY
   - [ ] #<new-number> Implement login"
   ```

**LIST_CHILDREN:**

Parse the tracking issue body for task list items:

```bash
gh issue view <parent-number> --json body -q .body | grep -oE '#[0-9]+'
```

Then fetch each child: `gh issue view <number> --json number,title,state`.

## Dependency Pattern

GitHub has no native dependency links. Use structured cross-references in issue bodies.

**Format:**
- `blocks` type: Add `**Blocked by:** #X, #Y` to the dependent issue's body
- `related` type: Add `**Related to:** #Z` to both issues' bodies

**ADD_DEPENDENCY (blocks):**

```bash
BODY=$(gh issue view <dependent> --json body -q .body)
gh issue edit <dependent> --body "**Blocked by:** #<blocker>
$BODY"
```

**ADD_DEPENDENCY (related):**

Add `**Related to:** #<other>` to both issues' bodies.

**QUERY_DEPENDENCY_TREE:**

1. Fetch the root issue body
2. Extract `**Blocked by:**` and `**Related to:**` references
3. Recursively fetch referenced issues and their cross-references
4. Build adjacency list from collected references
