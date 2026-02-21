# Workflow

*The full orchestration lifecycle, step by step.*

Reaper turns a description of what you want into tested, reviewed, gate-passed code. This document covers the end-to-end pipeline, from planning through quality gates to merge.

## The Recommended Cycle

Most work follows the same arc: plan, execute, review, ship.

```
/reaper:flight-plan "description"
         |
         v
+-----------------------+
|    Plan & Approve     |  <-- You review work breakdown
+-----------------------+
         |
         v
+-----------------------+
|    Issues Created     |  <-- Beads / Jira / Markdown
+-----------------------+
         |
         v
       /clear              <-- Fresh context for execution
         |
         v
/reaper:takeoff TASK-ID
         |
         v
+-------------------------------+
|   reaper:workflow-planner     |  <-- Analyzes complexity, selects strategy
+-------------------------------+
         |
         v
+-------------------------------+
|        Coding Agent           |  <-- TDD implementation (Red-Green-Refactor)
+-------------------------------+
         |
         v
+-------------------------------+
|       Quality Gates           |  <-- test-runner -> SME reviewer (via code-review skill) + security-auditor
+-------------------------------+
         |
         v
+-----------------------+
|    Your Approval      |  <-- Only after ALL gates pass
+-----------------------+
```

1. **`/reaper:flight-plan`** -- Describe the full scope. Reaper researches the codebase, decomposes the work into sized units, maps dependencies, and presents a plan for your approval.
2. **Review and approve** -- You see every work unit, its acceptance criteria, the dependency graph, and key assumptions before anything is created.
3. **Issues created** -- Approved units become issues in your task system (Beads, Jira, or a markdown plan file as fallback).
4. **`/clear`** -- Recommended between planning and execution. Gives the executor a fresh context window focused entirely on the plan.
5. **`/reaper:takeoff TASK-ID`** -- Executes the work. The orchestrator dispatches agents, runs quality gates, and iterates on failures autonomously.
6. **Your approval** -- Only after every gate passes does finished work reach you. You review, request changes, or approve the merge.
7. **Ship it** -- On your go-ahead, `reaper:branch-manager` merges to develop and worktrees are cleaned up.

The `/clear` between planning and execution is not required, but it means the takeoff orchestrator starts with maximum context headroom instead of carrying the planning conversation.

## What Happens Inside `/reaper:takeoff`

Takeoff is where the work gets done. It runs five phases in sequence, looping over each work unit until the full plan is complete.

### Phase 1: Analyze

The orchestrator parses your input (a task ID, a description, or both), queries the task system for details, and searches `.claude/plans/` for a matching plan file from a prior `/reaper:flight-plan` session.

If the task has pre-planned child issues with acceptance criteria, those become the work units directly. Otherwise, `reaper:workflow-planner` is deployed and immediately routes to the `reaper:workflow-planner-planning` skill, which assesses complexity, selects a concurrency strategy, and decomposes the task into dependency-ordered work packages.

### Phase 2: Implement

For each work unit, the orchestrator deploys the appropriate coding agent:

| Work Type | Agent | Method |
|-----------|-------|--------|
| Bug fixes | reaper:bug-fixer | Minimal fix with TDD Red-Green-Refactor |
| New features | reaper:feature-developer | TDD + SOLID from inception |
| Code improvements | reaper:refactoring-dev | Preserve behavior, improve structure |

Every coding agent works test-first. Tests are written before implementation, not after.

### Phase 3: Validate

After a coding agent finishes, `reaper:test-runner` runs the full test suite, validates coverage thresholds, and checks linting. This is Gate 1 -- it must pass before anything else proceeds.

The test-runner is the sole authoritative source of test metrics. Coding agents run tests during development for fast TDD feedback, but only the test-runner's results determine whether the gate passes.

### Phase 4: Review

Gate 2 deploys a work-type-matched SME reviewer (via the code-review skill) and `reaper:security-auditor` in parallel. Both must pass.

The SME reviewer checks plan adherence, domain correctness, test quality, and build compilation using the universal code-review skill plus an optional domain specialty file. The security auditor runs vulnerability scanning, secrets detection, dependency CVE analysis, and OWASP compliance checks.

If any gate fails, the coding agent receives the specific blocking issues and fixes them. Only the failed gate re-runs -- not the whole pipeline. Each gate has its own retry limit before escalating to you. Full gate details: [quality-gates.md](quality-gates.md).

### Phase 5: Present

Only after all gates pass for every work unit does Reaper present the completed work. You see what was built, which gates ran, what files changed, and how to test it yourself.

You control what happens next:

| Your Response | What Happens |
|---------------|--------------|
| Feedback or questions | Reaper addresses concerns, re-runs gates if changes are made |
| "looks good" | Reaper asks for merge confirmation |
| "ship it" / "merge" / "approved" | reaper:branch-manager merges to develop |

No code lands on your main branch without your explicit approval.

## Complexity Strategies

When `reaper:workflow-planner` is invoked for a new task, it routes to the `reaper:workflow-planner-planning` skill. That skill scores the task across five dimensions and selects an isolation strategy. You do not choose a strategy -- Reaper selects the right one automatically based on what the work requires.

> **Architecture note**: `workflow-planner` is a routing agent. Its two operational modes -- planning and verification -- live in dedicated skills (`reaper:workflow-planner-planning` and `reaper:workflow-planner-verification`). Each skill declares `agent: reaper:workflow-planner` in its frontmatter so the Claude Code runtime selects the correct executor automatically. See [ADR-0015](adr/0015-workflow-planner-process-extraction.md) for the rationale.

### Scoring Dimensions

| Dimension | What It Measures |
|-----------|-----------------|
| File Impact | Number and size of files changing. Single small file scores low; many large files or high-complexity areas (auth, payment, core logic) score high. |
| Dependencies | Cross-module coupling. External API integrations, database schema changes, and third-party library changes all multiply the score. |
| Testing Burden | Test infrastructure needed. Unit tests score low; integration scenarios, required mocking, and E2E tests score progressively higher. |
| Integration Risk | File overlap between work units and shared interface changes. Overlap forces worktree isolation regardless of total score. |
| Uncertainty | Unfamiliar technology, unclear requirements, missing documentation, or research needed. Each adds to the score. |

### Strategy Selection

| Strategy | Score Range | Typical Use Case | Environment |
|----------|------------|------------------|-------------|
| **Small Direct** | 0-10 | Config changes, simple fixes, single-file docs | Current branch |
| **Medium Branch** | 11-35 | Multi-file features, no file overlap between units | Feature branch |
| **Large Multi-Worktree** | >35 | Complex features, file overlap, high integration risk | Isolated `./trees/` worktrees |

Two conditions force Large Multi-Worktree regardless of score:
- Any file overlap between work units
- Any single work unit exceeding 5 files or 500 lines of code

A content override exists for the opposite direction: if a task involves five or more repetitive similar items (like creating multiple similar files), Medium Branch is selected regardless of a low score because the work benefits from parallelism without genuine complexity.

### What Each Strategy Does

**Small Direct** -- A single coding agent works on the current branch. No worktree isolation. Quality gates still run. Best for focused, low-risk changes.

**Medium Branch** -- Multiple agents work sequentially or in parallel on a single feature branch. File assignments are exclusive -- no two agents touch the same file. If an agent detects that its assigned files were modified unexpectedly, it exits immediately. Quality gates run once on the full changeset after all agents complete.

**Large Multi-Worktree** -- Each work stream gets its own isolated worktree under `./trees/`. Agents work independently without risk of conflict. A review branch serves as the consolidation target. After each worktree's gates pass, `reaper:branch-manager` merges it into the review branch. A final integration test runs on the consolidated result before presenting to you.

### Strategy Escalation

If runtime conditions exceed a strategy's assumptions, the workflow-planner re-scores and upgrades:

| From | To | Trigger |
|------|----|---------|
| Small Direct | Medium Branch | Work expands beyond 1-2 files; parallel opportunities discovered |
| Medium Branch | Large Multi-Worktree | File overlap discovered; agents report conflicts; work units exceed limits; more than 3 quality gate failures |
| Any | Re-plan | Context windows routinely exhausted; requirements fundamentally change |

Partial work is committed before escalation so nothing is lost.

## Worktree Lifecycle

Worktrees are Reaper's isolation mechanism for complex work. Each worktree is a full, independent copy of the repository with its own branch, working directory, and installed dependencies.

### Creation

When the workflow-planner selects Large Multi-Worktree strategy, the orchestrator creates worktrees using the `worktree-manager` skill:

```
./trees/PROJ-123-webhook-retry/
  (full project copy)
  on branch: feature/PROJ-123-webhook-retry
```

The naming convention is `./trees/TASK-ID-description`. The branch is created from `develop` (or your configured base branch) and named `feature/TASK-ID-description`.

### Isolation

Each worktree operates independently. An agent working in one worktree cannot see or affect changes in another. This means:

- No merge conflicts during development
- Agents can work in parallel without coordination
- A failure in one worktree does not contaminate others
- Each worktree can be tested independently

### Development

Coding agents receive their worktree path and work exclusively inside it. They follow TDD methodology, create tests before implementation, and stay within their assigned file boundaries.

### Quality Gates

Tests and reviews run inside each worktree. The test-runner executes the full test suite within the worktree context. The SME reviewer (via code-review skill) and security-auditor analyze the worktree's changes against the base branch.

### Merge

After a worktree passes all gates, `reaper:branch-manager` merges the feature branch into the review branch (or directly into develop for simpler strategies). Conflict detection runs before the merge -- if conflicts are found, the branch-manager resolves them or escalates.

### Cleanup

After a successful merge, the `worktree-manager` skill safely removes the worktree directory and optionally deletes the feature branch. This cleanup uses a dedicated script that handles the critical requirement of changing the shell's working directory before deletion -- without this, removing the current directory breaks the shell for the rest of the session.

```
Before cleanup:
  ./trees/PROJ-123-webhook-retry/  (worktree + branch)

After cleanup:
  (directory removed, branch deleted)
```

## Work Package Constraints

Every work unit, regardless of strategy, must stay within these limits:

| Constraint | Limit |
|------------|-------|
| Files per unit | 3-5 maximum |
| Lines of code per unit | ~500 |
| Direct dependencies | 2-3 maximum |
| Scope | Single testable outcome, describable in under 3 lines |
| TDD methodology | Tests written before implementation |

If any work unit exceeds these limits during planning, the workflow-planner decomposes it further. If a unit exceeds limits during execution, the orchestrator triggers re-planning with the discovered context.

These constraints exist to prevent agent context exhaustion. Large work units risk hallucination, lost context, and incomplete implementation. Small, focused units complete reliably.

## The Planning Pipeline (`/reaper:flight-plan`)

Flight-plan is the planning phase. Its scope ends when issues are created and verified -- it never writes application code.

### Research

Before decomposing work, flight-plan launches parallel research agents to explore the codebase. These agents investigate affected files, analyze architecture patterns, and map dependencies. The research findings directly inform how work units are scoped and what files they touch.

Research is skipped when the work is a brand-new standalone project, purely documentation or configuration, or the user provides explicit file lists and architecture details.

### Decomposition

Using the research findings, flight-plan breaks the work into sized units with:
- Acceptance criteria for each unit
- File assignments (verified against the actual project structure)
- Dependency ordering and parallel opportunities
- TDD approach specified per unit

### Approval Loop

Flight-plan presents a briefing: work unit count, parallelization percentage, critical path, and key assumptions. You approve, request revisions, or provide freeform feedback. The plan iterates until you are satisfied.

### Issue Creation

After approval, issues are created in Beads, Jira, or as a markdown plan file. Each issue includes the objective, TDD approach, acceptance criteria, and estimated file scope. Dependencies are set so that `reaper:takeoff` can determine execution order automatically.

A verification step runs after creation: `reaper:workflow-planner` routes to the `reaper:workflow-planner-verification` skill, which checks that every issue has sufficient detail, correct cross-references, appropriate dependency types, and clear scope boundaries. Issues that fail verification are auto-fixed (up to two iterations).

## Self-Learning

When quality gates require two or more iterations on a task, Reaper examines the failure patterns. If the same class of issue keeps appearing, it drafts a CLAUDE.md entry that would prevent the error from recurring.

These entries are never applied automatically. Run `/reaper:claude-sync` to review suggestions and decide which to keep. Maximum three suggestions per session.

## Supporting Commands

| Command | Purpose |
|---------|---------|
| `/reaper:ship` | Fast-path from worktree to pull request. Commits, pushes, and opens a PR without running quality gates. Use when you have already validated the work yourself. |
| `/reaper:status-worktrees` | Lists all active worktrees with branch status, uncommitted changes, and completion progress. |
| `/reaper:claude-sync` | Analyzes commits since CLAUDE.md was last modified. Surfaces changes that should be documented for LLM context. |
| `/reaper:squadron` | Assembles domain expert agents for collaborative design discussions. Use before flight-plan when the architecture decision itself is what matters. |

### Squadron and the Explore-First Principle

Squadron uses an **explore-first architecture**: Explore agents always run before domain experts. The Explore agents gather codebase facts -- existing implementations, architecture patterns, integration points -- so that expert agents receive pre-compiled context and spend their context windows on analysis rather than file reads.

The scope of exploration scales with concept breadth:

- **Narrow concepts (1--2 domains)**: A single Explore agent runs focused search queries targeting the relevant areas.
- **Broad concepts (3+ domains)**: Multiple Explore agents deploy in parallel, each scoped to a different domain.

After exploration completes, the compiled findings are injected into every expert's prompt as codebase context. Experts then deliver independent positions, the facilitator routes disagreements through structured clash cycles, and unresolved tensions surface as decision points for you. The full squadron workflow is documented in [commands.md](commands.md#reapersquadron).

---

[Back to README](../README.md)
