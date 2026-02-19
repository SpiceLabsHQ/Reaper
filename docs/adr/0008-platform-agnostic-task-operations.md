# ADR-0008: Platform-Agnostic Task Operations

**Date**: 2026-02-18
**Status**: Accepted

---

## Context

Reaper's orchestration commands (takeoff, flight-plan, ship) need to create, query, and update issues in a task tracker. Different teams use different trackers: Beads (git-based), Jira, GitHub Issues, or no tracker at all.

Hardcoding `bd` (Beads CLI) commands directly into takeoff and flight-plan would lock Reaper to teams using Beads. Every new tracker would require modifying core orchestration logic — the commands themselves would accumulate platform-specific branches, growing in complexity with each supported system.

A secondary problem: commands need to know which tracker is active without requiring explicit configuration. Teams already have tracker references in their commit history (`Ref: reaper-a3f` for Beads, `Fixes PROJ-123` for Jira, `Closes #456` for GitHub Issues). Requiring an environment variable or config file adds setup friction that contradicts Reaper's zero-config design goal.

---

## Decision

We introduce an abstract task operations layer that separates orchestration logic from tracker-specific commands. Orchestration commands express intent through abstract operations; platform skills translate that intent into tracker-specific commands.

### Abstract Operations

Seven operations cover all task interactions required by orchestration commands:

| Operation | Purpose |
|-----------|---------|
| FETCH_ISSUE | Retrieve a single issue by ID (title, description, status, acceptance criteria) |
| LIST_CHILDREN | List direct child issues of a parent (one level deep) |
| CREATE_ISSUE | Create a new issue with title, description, and optional `parent` |
| UPDATE_ISSUE | Modify an existing issue (status, description, assignee) |
| ADD_DEPENDENCY | Create a `blocks` or `related` dependency between two sibling issues |
| QUERY_DEPENDENCY_TREE | Recursively retrieve the full dependency graph from a root issue |
| CLOSE_ISSUE | Mark an issue as completed/closed |

### Hierarchy via Parent Parameter

The `parent` parameter on CREATE_ISSUE is the sole mechanism for establishing parent-child relationships. ADD_DEPENDENCY is reserved for sibling-to-sibling execution constraints (`blocks`, `related`) — never for hierarchy. While some task systems support a `parent-child` dependency type via ADD_DEPENDENCY, the `parent` parameter on CREATE_ISSUE produces cleaner tracking and consistent child ID patterns.

### Detection Algorithm

The active task system is detected automatically from commit history. No configuration required.

Run `git log --format="%B" -10` and scan commit bodies for issue reference patterns:

| System | Pattern | Examples |
|--------|---------|----------|
| Beads | `(Ref\|Closes\|Resolves):?\s+[a-z][a-z0-9]*-[a-f0-9]{2,}` | `Ref: reaper-a3f`, `Closes myapp-bc12` |
| Jira | `(Ref\|Fixes\|Closes\|Resolves):?\s+[A-Z]{2,}-\d+` | `Ref: PROJ-123`, `Fixes ENG-456` |
| GitHub Issues | `(Fixes\|Closes\|Resolves):?\s+#\d+` | `Fixes #456`, `Closes #42` |

**Mixed/ambiguous rule:** If multiple systems match, the system with the highest count wins. Equal counts fall back to `markdown_only`.

**Fallback chain:**
- Commit patterns found (1+ match in last 10 commits) with single system: use that system
- Mixed patterns: highest count wins; tie = `markdown_only`
- No patterns found: `markdown_only`

### Platform Skill Routing

After detection, the orchestration command loads the corresponding skill for platform-specific command mappings:

| TASK_SYSTEM | Skill |
|-------------|-------|
| Beads | `reaper:issue-tracker-beads` |
| Jira | `reaper:issue-tracker-jira` |
| GitHub | `reaper:issue-tracker-github` |
| markdown_only | `reaper:issue-tracker-planfile` |

Each skill translates all seven abstract operations into platform-specific commands. The orchestration command never sees `bd create` or `gh issue create` — it sees CREATE_ISSUE, and the loaded skill handles the rest.

### Planfile Fallback

For projects without any task system, `reaper:issue-tracker-planfile` maps all abstract operations to reading and writing a local markdown plan file in `.claude/plans/`. This ensures Reaper works out of the box with zero external dependencies. The fallback degrades gracefully: features like cross-issue dependency graphs and status dashboards are limited, but the core workflow (plan, execute, track) remains functional.

---

## Consequences

**Positive:**
- Reaper works with any tracker or with no tracker at all
- Zero-config detection via commit history eliminates setup friction
- New trackers are added by writing a skill, not by modifying orchestration commands
- Planfile fallback ensures Reaper functions in any project regardless of tooling
- Orchestration commands remain clean — they express intent, not platform mechanics
- The `parent` parameter convention produces consistent hierarchy across all platforms

**Negative / Risks:**
- Detection edge cases: new repositories with no commits default to `markdown_only`, which may surprise teams that have a tracker configured but no commit history yet
- Mixed systems in a monorepo (e.g., some teams use Jira, others use GitHub Issues) can produce incorrect detection; the highest-count heuristic is a best guess, not a guarantee
- Detection runs at every invocation, adding latency to the critical path of every orchestration command
- The markdown fallback lacks tracking features (notifications, dashboards, multi-user assignment) that real trackers provide — teams relying on it may outgrow it without a clear migration path

---

## Alternatives Considered

**Hardcoded Beads commands** — The simplest implementation: call `bd create`, `bd show`, etc. directly from takeoff and flight-plan. Works today for the Reaper project itself. Rejected because it locks Reaper to one tracker and requires modifying core orchestration logic for every new tracker.

**Per-platform command branches in orchestration** — `if beads then ... elif jira then ...` inline within takeoff. Functional, but pollutes orchestration logic with tracker-specific code. Each new tracker adds another branch to every command that touches the task system. Rejected in favor of skill-based dispatch which isolates platform logic behind a stable interface.

**Environment variable configuration** — `REAPER_TRACKER=beads` as explicit configuration. Works, but requires manual setup in every project. Commit history detection achieves the same result with zero configuration. Rejected because automatic detection is strictly better for the common case, and the fallback to `markdown_only` handles the unconfigured case safely.

**Single universal tracker API client** — Write one HTTP client that speaks each tracker's REST API. Over-engineered for what is fundamentally an LLM-mediated skill dispatch. The LLM does not need a typed client — it needs a skill document describing the platform's CLI commands. Rejected as unnecessary abstraction.
