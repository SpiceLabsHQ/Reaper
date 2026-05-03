---
name: issue-tracker-linear
description: Use when working with Linear issues. TRIGGER when a Linear issue is referenced (e.g., "TEAM-123", "issue TEAM-25"); creating, transitioning, updating, linking, or querying parent/child hierarchy; resolving team, status, or label IDs needed to save an issue. Returns the right ID-resolution sequence (team → status → label) and the correct hierarchy mechanism — direct calls without it routinely create orphan issues or rejected updates. SKIP for GitHub Issues, Jira, Beads, or markdown plan files.
user-invocable: false
allowed-tools: mcp__linear-server__get_issue, mcp__linear-server__list_issues, mcp__linear-server__save_issue, mcp__linear-server__list_comments, mcp__linear-server__save_comment, mcp__linear-server__delete_comment, mcp__linear-server__list_teams, mcp__linear-server__get_team, mcp__linear-server__list_users, mcp__linear-server__get_user, mcp__linear-server__list_projects, mcp__linear-server__get_project, mcp__linear-server__save_project, mcp__linear-server__list_milestones, mcp__linear-server__get_milestone, mcp__linear-server__save_milestone, mcp__linear-server__list_cycles, mcp__linear-server__list_issue_statuses, mcp__linear-server__get_issue_status, mcp__linear-server__list_issue_labels, mcp__linear-server__create_issue_label, mcp__linear-server__list_project_labels, mcp__linear-server__list_documents, mcp__linear-server__get_document, mcp__linear-server__save_document, mcp__linear-server__list_initiatives, mcp__linear-server__get_initiative, mcp__linear-server__save_initiative, mcp__linear-server__search_documentation, mcp__linear-server__create_attachment, mcp__linear-server__get_attachment, mcp__linear-server__delete_attachment
---

# Linear Issue Tracker

Maps abstract task operations to `mcp__linear-server__*` MCP tool calls.

## Repo Context

Call the following at skill load time to orient yourself to the workspace:

- **Team name:** call `mcp__linear-server__list_teams` — note the team name and ID for use in `save_issue`
- **Available statuses:** call `mcp__linear-server__list_issue_statuses` with the team ID — enumerate valid state names (e.g., "Todo", "In Progress", "Done")
- **Available labels:** call `mcp__linear-server__list_issue_labels` with the team ID — enumerate label names for use when creating or filtering issues

Cache these values for the duration of the session; they change rarely.

## Quick Reference

| Operation | MCP Tool | Key Parameters |
|-----------|----------|----------------|
| FETCH_ISSUE | `mcp__linear-server__get_issue` | `id` (issue identifier, e.g. "SPC-123"), `includeRelations: true` to retrieve blocks/blockedBy/relatedTo |
| LIST_CHILDREN | `mcp__linear-server__list_issues` | `parentId` filter set to the parent issue ID |
| CREATE_ISSUE | `mcp__linear-server__save_issue` | `title` (required), `teamId` (required), `parentId` for child issues |
| UPDATE_ISSUE | `mcp__linear-server__save_issue` | `id` (required), plus any fields to change: `title`, `description`, `stateId`, `labelIds`, `assigneeId` |
| ADD_DEPENDENCY | `mcp__linear-server__save_issue` | `id` (required), `blocks`, `blockedBy`, or `relatedTo` arrays of issue IDs |
| QUERY_DEPENDENCY_TREE | `mcp__linear-server__get_issue` + `mcp__linear-server__list_issues` | `includeRelations: true`; recursive `parentId` walks for child traversal |
| CLOSE_ISSUE | `mcp__linear-server__save_issue` | `id` (required), `stateId` set to the "Done" or "Completed" state ID from `list_issue_statuses` |

## Hierarchy Pattern

Linear uses `parentId` on `save_issue` as the **sole mechanism** for parent-child relationships. There is no separate link call — set `parentId` at create time or update it later with another `save_issue` call.

**Creating a parent issue:**

```json
{
  "tool": "mcp__linear-server__save_issue",
  "params": {
    "title": "Authentication overhaul",
    "teamId": "<team-id>",
    "description": "Parent issue grouping auth work items."
  }
}
```

Note the returned issue `id` (e.g., `"abc123"`) — use it as `parentId` when creating children.

**CREATE_ISSUE with parent (child issue):**

```json
{
  "tool": "mcp__linear-server__save_issue",
  "params": {
    "title": "Implement OAuth2 provider",
    "teamId": "<team-id>",
    "parentId": "abc123"
  }
}
```

**LIST_CHILDREN:**

```json
{
  "tool": "mcp__linear-server__list_issues",
  "params": {
    "parentId": "abc123"
  }
}
```

Returns the list of direct child issues.

**Single-issue rule:** Plans with only a single issue do not require a parent issue. Only create a parent when there are multiple child work items to organize.

**Warning:** Do NOT use `ADD_DEPENDENCY` (blocks/blockedBy/relatedTo) to express hierarchy. Use `parentId` on `save_issue` instead. Dependency relations are for execution ordering between peer issues — not for grouping child work under a parent.

## Dependency/Relation Pattern

Linear supports typed relations on issues. Pass them as arrays of issue identifiers (e.g., `"SPC-45"`) or internal IDs on `save_issue`:

| Field | Meaning |
|-------|---------|
| `blocks` | This issue blocks the listed issues (array of issue IDs/identifiers) |
| `blockedBy` | This issue is blocked by the listed issues (array of issue IDs/identifiers) |
| `relatedTo` | Informational link — no execution order implied (array of issue IDs/identifiers) |

**ADD_DEPENDENCY (blocks):**

```json
{
  "tool": "mcp__linear-server__save_issue",
  "params": {
    "id": "SPC-101",
    "blocks": ["SPC-102"]
  }
}
```

**ADD_DEPENDENCY (blockedBy):**

```json
{
  "tool": "mcp__linear-server__save_issue",
  "params": {
    "id": "SPC-102",
    "blockedBy": ["SPC-101"]
  }
}
```

**ADD_DEPENDENCY (relatedTo):**

```json
{
  "tool": "mcp__linear-server__save_issue",
  "params": {
    "id": "SPC-103",
    "relatedTo": ["SPC-104"]
  }
}
```

**QUERY_DEPENDENCY_TREE:**

1. Fetch the root issue with `includeRelations: true` to retrieve `blocks`, `blockedBy`, and `relatedTo` arrays
2. Recursively fetch each related issue with `includeRelations: true`
3. Walk child issues via `list_issues` with `parentId` filter to include hierarchy
4. Build an adjacency list from collected relations

```json
{
  "tool": "mcp__linear-server__get_issue",
  "params": {
    "id": "SPC-100",
    "includeRelations": true
  }
}
```

**Note on append-only relations:** Relation arrays passed to `save_issue` are **appended** to existing relations — they do not replace them. There is no MCP call to remove a specific relation; use the Linear web UI for relation removal if needed.

## Pagination Pattern

Linear list operations return up to 50 issues by default. For larger datasets, use cursor-based pagination with the `cursor` and `limit` parameters on `mcp__linear-server__list_issues`.

**Worked example — process all issues in a project:**

```
Step 1: Fetch first page
  tool: mcp__linear-server__list_issues
  params: { projectId: "<project-id>", limit: 50 }
  → returns: { issues: [...], nextCursor: "eyJ..." }

Step 2: Fetch next page using cursor
  tool: mcp__linear-server__list_issues
  params: { projectId: "<project-id>", limit: 50, cursor: "eyJ..." }
  → returns: { issues: [...], nextCursor: null }  ← null means last page

Step 3: Repeat until nextCursor is null
```

Stop iterating when the response's `nextCursor` is `null` or absent — that signals the final page.

## Safe Tool Listing

All tools in `allowed-tools` with their purpose:

| Tool | Purpose |
|------|---------|
| `mcp__linear-server__get_issue` | Fetch a single issue by ID; use `includeRelations: true` for dependency data |
| `mcp__linear-server__list_issues` | List issues with filters (teamId, projectId, parentId, stateId, cursor) |
| `mcp__linear-server__save_issue` | Create or update an issue; `id` absent = create, `id` present = update |
| `mcp__linear-server__list_comments` | List comments on an issue |
| `mcp__linear-server__save_comment` | Add or update a comment on an issue |
| `mcp__linear-server__delete_comment` | Delete a comment by ID |
| `mcp__linear-server__list_teams` | List all teams in the workspace; use to resolve team IDs |
| `mcp__linear-server__get_team` | Fetch a single team by ID |
| `mcp__linear-server__list_users` | List workspace members; use for assignee lookup |
| `mcp__linear-server__get_user` | Fetch a single user by ID |
| `mcp__linear-server__list_projects` | List projects; filter by teamId |
| `mcp__linear-server__get_project` | Fetch a single project by ID |
| `mcp__linear-server__save_project` | Create or update a project |
| `mcp__linear-server__list_milestones` | List milestones for a project |
| `mcp__linear-server__get_milestone` | Fetch a single milestone by ID |
| `mcp__linear-server__save_milestone` | Create or update a milestone |
| `mcp__linear-server__list_cycles` | List cycles (sprints) for a team |
| `mcp__linear-server__list_issue_statuses` | List workflow states for a team; use to resolve state IDs |
| `mcp__linear-server__get_issue_status` | Fetch a single workflow state by ID |
| `mcp__linear-server__list_issue_labels` | List labels for a team |
| `mcp__linear-server__create_issue_label` | Create a new label for a team |
| `mcp__linear-server__list_project_labels` | List labels scoped to a project |
| `mcp__linear-server__list_documents` | List documents in the workspace |
| `mcp__linear-server__get_document` | Fetch a single document by ID |
| `mcp__linear-server__save_document` | Create or update a document |
| `mcp__linear-server__list_initiatives` | List initiatives in the workspace |
| `mcp__linear-server__get_initiative` | Fetch a single initiative by ID |
| `mcp__linear-server__save_initiative` | Create or update an initiative |
| `mcp__linear-server__search_documentation` | Full-text search across Linear documentation |
| `mcp__linear-server__create_attachment` | Attach a URL or file reference to an issue |
| `mcp__linear-server__get_attachment` | Fetch a single attachment by ID |
| `mcp__linear-server__delete_attachment` | Delete an attachment by ID |
