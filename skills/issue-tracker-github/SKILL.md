---
name: issue-tracker-github
description: GitHub Issues and Projects integration for Reaper's abstract task operations. Maps FETCH_ISSUE, CREATE_ISSUE, and other operations to gh CLI commands.
allowed-tools: Bash, Read, Grep
---

# GitHub Issue Tracker

Maps abstract task operations to `gh` CLI commands. See `gh issue --help` and `gh project --help` for full flag details.

## Available Scripts

Scripts are in `${CLAUDE_PLUGIN_ROOT}/skills/issue-tracker-github/scripts/`:

| Script | Purpose |
|--------|---------|
| `gh-link-sub-issues.sh` | Link 1+ issues as sub-issues of a parent (bulk-capable) |
| `gh-list-sub-issues.sh` | List sub-issues of a parent via GraphQL |

## Quick Reference

| Operation | Command Pattern |
|-----------|----------------|
| FETCH_ISSUE | `gh issue view <number> --json title,body,state,labels,assignees` |
| LIST_CHILDREN | `gh-list-sub-issues.sh <parent>` or parse tracking issue body |
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

GitHub supports sub-issues via its GraphQL API (beta). Use this as the primary approach. Fall back to tracking issues for repos where sub-issues are not enabled.

### Primary: Sub-Issues via API

**CREATE_ISSUE with `parent`:**

1. Create child issues first (batch all creates before linking):
   ```bash
   gh issue create --title "Set up database schema" --body "..." --label "epic:auth"
   gh issue create --title "Implement API endpoints" --body "..." --label "epic:auth"
   gh issue create --title "Write tests" --body "..." --label "epic:auth"
   ```

2. Bulk-link all children to the parent in one call:
   ```bash
   ${CLAUDE_PLUGIN_ROOT}/skills/issue-tracker-github/scripts/gh-link-sub-issues.sh <parent-number> <child-1> <child-2> <child-3>
   ```

   The script resolves node IDs internally and links each child as a sub-issue. It handles errors per-child (skips failures, reports at the end).

**LIST_CHILDREN:**

```bash
${CLAUDE_PLUGIN_ROOT}/skills/issue-tracker-github/scripts/gh-list-sub-issues.sh <parent-number>
```

Returns JSON array of `{number, title, state}` objects.

### Efficient Bulk Pattern

When creating an epic with many children (e.g., flight-plan creating 5+ work units):

1. **Create all issues** first with `gh issue create` (no linking yet)
2. **Collect issue numbers** from the create output
3. **Bulk-link** all children in a single script invocation:
   ```bash
   ${CLAUDE_PLUGIN_ROOT}/skills/issue-tracker-github/scripts/gh-link-sub-issues.sh 42 43 44 45 46 47
   ```

This is more efficient than interleaving creates and links — the script resolves the parent node ID once and reuses it for all children.

### Fallback: Tracking Issues

For repos where sub-issues are not enabled, use a **tracking issue** with a task list in its body:

```markdown
## Tasks

- [ ] #101 Set up database schema
- [ ] #102 Implement API endpoints
- [x] #100 Write design doc
```

GitHub renders task list progress automatically. Use labels for grouping (e.g., `epic:auth`, `phase:1`).

**CREATE_ISSUE with `parent` (tracking issue fallback):**

1. Create the child issue:
   ```bash
   gh issue create --title "Implement login" --body "Details..." --label "epic:auth"
   ```
2. Append the new issue to the tracking issue's task list:
   ```bash
   BODY=$(gh issue view <parent-number> --json body -q .body)
   gh issue edit <parent-number> --body "$BODY
   - [ ] #<new-number> Implement login"
   ```

**LIST_CHILDREN (tracking issue fallback):**

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

**Idempotency:** Before appending a dependency line, read the current body and check if the reference already exists. This prevents duplicate entries on retry.

**QUERY_DEPENDENCY_TREE:**

1. Fetch the root issue body
2. Extract `**Blocked by:**` and `**Related to:**` references
3. Recursively fetch referenced issues and their cross-references
4. Build adjacency list from collected references

## CLI Reference

Run `gh issue --help` and `gh project --help` for the full flag reference. This skill documents recommended patterns for Reaper's abstract operations, not the complete CLI surface. Agents may discover and use additional flags beyond what is documented here.
