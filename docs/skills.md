# Skill Catalog

Skills are reusable behavior modules that agents load at runtime to gain specialized capabilities. Unlike agents -- which have a fixed role -- skills are composable: a single agent can load different skills depending on the task. Reaper ships 8 skills across three categories.

You never invoke skills directly. Commands and agents load them automatically.

## Code Review (1 skill)

The code review skill implements Reaper's Gate 2 review protocol. It is loaded by the work-type-matched SME reviewer that the orchestrator dispatches after every implementation agent finishes.

### `code-review`

**Purpose**: Universal Gate 2 code review protocol. Guides a reviewer through plan verification, scope creep detection, completeness checks, and structured JSON output -- regardless of work type.

**Invoked by**: The `takeoff` command, which dispatches a work-type-matched SME reviewer and injects this skill. You never trigger it manually.

**What it produces**: A structured JSON verdict with `blocking_issues`, `non_blocking_notes`, `plan_coverage`, `scope_violations`, and `files_reviewed`. The orchestrator reads this output to decide whether to pass the work unit or return it to the coding agent.

**Universal review steps** (applied to every work unit):

1. **Gate 1 trust check** -- Accepts test-runner results as authoritative; never re-runs the full suite
2. **Scope creep check** -- Compares modified files against the declared scope; flags any unauthorized changes
3. **Completeness check** -- Verifies no TODOs where functional code is required, no placeholder implementations
4. **Specialty steps** -- Loads a domain-specific file based on `WORK_TYPE` for additional checks

**Specialty files** (loaded by work type):

| Work Type | Specialty File | Domain Checks |
|-----------|---------------|---------------|
| `application_code`, `test_code` | `skills/code-review/application-code.md` | SOLID principles, test coverage patterns, interface contracts |
| `database_migration` | `skills/code-review/database-migration.md` | Migration safety, rollback strategy, index impact |
| `agent_prompt` | `skills/code-review/agent-prompt.md` | Prompt anti-patterns, token efficiency, model-specific guidance |
| `documentation` | `skills/code-review/documentation.md` | Accuracy, completeness, link validity |
| `architecture_review` | `skills/code-review/architecture-review.md` | System-level concerns, ADR alignment, cross-cutting impact |
| `infrastructure_config`, `api_specification`, `ci_cd_pipeline`, `configuration` | (none) | Universal steps only |

When no specialty file applies (or `WORK_TYPE` is absent), the universal steps are sufficient. The review still produces a complete verdict.

---

## Workflow Planner (2 skills)

The workflow planner skills implement the two modes of `reaper:workflow-planner`. They are always loaded inside that agent -- you never invoke them standalone.

### `workflow-planner-planning`

**Purpose**: Planning process -- grounding, input validation, strategy selection, and work package decomposition.

**Invoked by**: `reaper:workflow-planner` in its default mode, which is triggered by `/reaper:flight-plan` and by `takeoff` when it detects a complex task.

**What it produces**: A JSON planning report with `strategy`, `units` (work packages with file assignments, acceptance criteria, and execution groups), and `risks`. This report is the deployment blueprint the orchestrator uses to spin up coding agents.

**Key behaviors**:

- **Grounding**: Reads the actual codebase before planning -- file structure, test patterns, existing conventions. Plans are grounded in reality, not speculation.
- **Strategy selection**: Scores task complexity across five dimensions (file impact, dependencies, testing, integration risk, uncertainty) and selects one of three strategies: `very_small_direct`, `medium_single_branch`, or `large_multi_worktree`.
- **Decomposition**: Breaks large features into work packages of 3-5 files and ~500 LOC each, with exclusive file assignments per package to enable safe parallelism.
- **Issue creation**: Creates child issues in your configured task system (Beads, Jira, GitHub Issues, or plan file) for each work unit.

### `workflow-planner-verification`

**Purpose**: Verification process -- reviews existing issues against orchestratability criteria and auto-fixes problems.

**Invoked by**: `reaper:workflow-planner` when `MODE: VERIFICATION` is detected. This mode is triggered by `/reaper:flight-plan` when an epic with existing child issues is provided, rather than a new task description.

**What it produces**: A JSON verification report showing which criteria passed or failed, what was auto-fixed, and whether any issues require user input before `takeoff` can proceed.

**Four criteria checked for each issue**:

| Criterion | What passes | What fails | Auto-fixed? |
|-----------|-------------|------------|-------------|
| Detail sufficiency | Clear objective, file hints, acceptance criteria, bounded size, `work_type` set | Vague objective, no file hints, missing AC | Yes -- appends missing details |
| Cross-issue awareness | Related issues reference each other, file overlaps documented | No cross-references, overlap undocumented | Yes -- adds cross-references |
| Relationship appropriateness | Hierarchy via parent-child, blocking only for execution order | Flat with inappropriate blockers, circular deps | Yes -- removes inappropriate blockers |
| Orchestratability | Determinable execution order, visible parallel groups, clear scope | Ambiguous deps, everything serial, open-ended scope | Yes -- adds execution hints |

---

## Issue Trackers (4 skills)

Issue tracker skills abstract over four task management platforms. Reaper uses them to create, update, and query work items during planning and execution. The orchestrator detects which platform is in use and loads the matching skill automatically.

**Detection**: Reaper scans the last 10 git commits (`git log --format="%B" -10`) for issue reference patterns and counts matches per system. The system with the highest count wins. Equal counts or no matches fall back to the plan file (`markdown_only`).

| System | Pattern matched in commit bodies |
|--------|----------------------------------|
| Beads | `Ref: reaper-a3f`, `Closes myapp-bc12` (lowercase ID with hex suffix) |
| Jira | `Ref: PROJ-123`, `Fixes ENG-456` (uppercase project key + number) |
| GitHub Issues | `Fixes #456`, `Closes #42` (bare `#N` references) |

All four skills expose the same abstract operations:

| Operation | What it does |
|-----------|-------------|
| `FETCH_ISSUE` | Retrieve issue details (title, description, acceptance criteria, status) |
| `LIST_CHILDREN` | List sub-issues or child work items |
| `CREATE_ISSUE` | Create a new issue, optionally under a parent |
| `UPDATE_ISSUE` | Update status, assignee, priority, or description |
| `ADD_DEPENDENCY` | Record a blocking or informational relationship between issues |
| `QUERY_DEPENDENCY_TREE` | Retrieve the full dependency graph from a root issue |
| `CLOSE_ISSUE` | Mark an issue as complete |

### `issue-tracker-beads`

**Platform**: [Beads](https://github.com/SpiceLabsHQ/beads) -- lightweight git-based issue tracking (`bd` CLI).

**Invoked by**: `reaper:workflow-planner` (during planning), `takeoff` (status updates), and `flight-plan` (issue creation). Loaded when the `bd` CLI is available.

**What it produces**: Native Beads issues with parent-child hierarchy (`reaper-a3f`, `reaper-a3f.1`, `reaper-a3f.2`), priority levels (0-4), and dependency links. Issues are stored in the git repository alongside code.

**Notable behaviors**:

- Issue IDs follow the pattern `reaper-xxx` for roots and `reaper-xxx.N` for children
- `bd ready` and `bd blocked` surface actionable work at a glance
- `bd sync` pushes issues to the remote alongside a normal `git push`

### `issue-tracker-github`

**Platform**: GitHub Issues and GitHub Projects (`gh` CLI).

**Invoked by**: Same as above. Loaded when `gh` is available and the remote is GitHub.

**What it produces**: GitHub issues with labels, sub-issue links (via GraphQL beta API), and optional project board entries. Falls back to tracking issues (task-list format) when sub-issues are not enabled for the repository.

**Notable behaviors**:

- Two modes: **with Projects** (sprint/kanban fields for status tracking) and **without Projects** (tracking issues with task lists)
- Sub-issue linking is batch-capable -- all children can be linked to a parent in a single script call
- Dependencies are encoded as `**Blocked by:**` and `**Related to:**` cross-references in issue bodies (GitHub has no native dependency links)
- Scripts located at `skills/issue-tracker-github/scripts/`: `gh-link-sub-issues.sh` and `gh-list-sub-issues.sh`
- Pull request creation always requires explicit user confirmation -- never automatic

### `issue-tracker-jira`

**Platform**: Jira (`acli jira` CLI).

**Invoked by**: Same as above. Loaded when `acli jira` is available and `PROJ-` style IDs are present.

**What it produces**: Jira issues using the native Epic > Story/Task > Sub-task hierarchy. Dependency links use Jira's native link types (`Blocks`, `Relates`).

**Notable behaviors**:

- Parent issues are created as Epics; child work items as Stories or Tasks; sub-tasks under Stories
- Status transitions enforce Jira's workflow -- if a transition fails, inspect available statuses with `acli jira workitem view`
- `QUERY_DEPENDENCY_TREE` uses JQL: `issuekey in linkedIssuesOf(<key>)` recursively

### `issue-tracker-planfile`

**Platform**: Local markdown files -- no external tracker required.

**Invoked by**: Same as above. Loaded as the fallback when no tracker CLI is detected (`TASK_SYSTEM=markdown_only`).

**What it produces**: A structured markdown plan file at `.claude/plans/<task-slug>.md` containing Input, Research, Strategy, Work Units, and Dependencies sections. The Work Units table is the source of truth for execution order.

**Notable behaviors**:

- Plan files are read by `takeoff` to discover work units without re-planning
- The Research section is passed to coding agents as codebase context
- The Dependencies section uses a Mermaid flowchart for blocking relationships; informational links are annotated separately
- If a plan file already exists when `CREATE_ISSUE` is called with `type=parent`, creation is skipped (idempotent)

---

## Worktree Manager (1 skill)

The worktree-manager skill provides safe git worktree lifecycle management. It is loaded by `reaper:branch-manager` during worktree creation and removal, and by the `takeoff` command during integration cleanup. You never invoke it directly.

### `worktree-manager`

**Purpose**: Safe git worktree lifecycle management. Prevents the CWD deletion error that permanently breaks Claude's shell session when a worktree is removed while the shell is inside it.

**Invoked by**: `reaper:branch-manager` (for worktree creation and removal during integration), and `takeoff` (during cleanup after a work unit completes). Never invoked directly.

**What it produces**: Shell scripts that handle the full worktree lifecycle -- create, list, status-check, and cleanup -- with built-in CWD safety guards. The cleanup script ensures Claude's shell always navigates to the project root before removing a worktree.

**Available scripts** (located at `skills/worktree-manager/scripts/`):

| Script | Purpose |
|--------|---------|
| `worktree-create.sh` | Create a new worktree with a feature branch off `develop` |
| `worktree-list.sh` | List all worktrees with optional JSON output and verbose status |
| `worktree-status.sh` | Check health of a specific worktree |
| `worktree-cleanup.sh` | Safely remove a worktree; requires `--keep-branch` or `--delete-branch` |

**CWD safety rule**: The cleanup script must be run from the project root, not from inside the worktree being removed. The skill's instructions enforce this pattern:

```bash
# Correct: cd to project root first, then clean up
cd "$(git rev-parse --show-toplevel)" && ${CLAUDE_PLUGIN_ROOT}/skills/worktree-manager/scripts/worktree-cleanup.sh ./trees/PROJ-123 --delete-branch
```

Protected branches (`develop`, `main`, `master`) are never deleted by the cleanup script regardless of the flag passed.

---

## How skills relate to agents and commands

```
/reaper:flight-plan
  └── reaper:workflow-planner
        ├── workflow-planner-planning  (creates the plan)
        └── issue-tracker-*           (creates issues in your tracker)

/reaper:takeoff
  └── reaper:feature-developer / reaper:bug-fixer
        └── [implementation]
  └── reaper:test-runner              (Gate 1)
  └── SME reviewer + code-review      (Gate 2)
        └── code-review               (universal steps + specialty file)
  └── reaper:security-auditor         (Gate 3)
  └── reaper:branch-manager
        └── worktree-manager          (safe cleanup)
```

Skills extend agent behavior at runtime. The same agent can behave differently depending on which skill is loaded -- `reaper:workflow-planner` plans when `workflow-planner-planning` is active and verifies when `workflow-planner-verification` is active.

---

[Back to README](../README.md)
