# ADR-0022: Two-Layer Worktree Architecture

**Date**: 2026-03-13
**Status**: Proposed

---

## Context

### Claude Code's built-in worktree isolation

Claude Code provides a built-in `isolation: worktree` mode for subagent execution. When a subagent is launched with this mode, Claude Code automatically creates an ephemeral git worktree, runs the agent inside it, and cleans up the worktree when the agent completes. This gives each agent an isolated filesystem view without manual worktree management by the orchestrator.

### The single-layer model and its limitations

Reaper's current architecture uses a single layer of manually managed worktrees in `./trees/`. The orchestrator (takeoff) creates worktrees before deploying agents, passes the worktree path to each agent, and cleans up afterward. This model has four structural problems:

**1. Dependency installation per worktree.** Each worktree in `./trees/` is a full git working copy, but it does not share installed dependencies with other worktrees or the root. Every agent worktree needs its own `node_modules/` (or `vendor/`, `.venv/`, etc.). For projects with large dependency trees, this means either running `npm install` in every worktree -- adding minutes of wall-clock time per agent deployment -- or accepting that agents operate without dependencies and cannot run tests, linters, or builds. Neither outcome is acceptable: the first wastes time, the second prevents quality validation during development.

**2. Manual worktree lifecycle management.** The orchestrator must create worktrees before deploying agents and remove them afterward. This lifecycle management is scattered across takeoff's per-unit cycle, branch-manager's teardown phase, and error recovery paths. Each step is a potential failure point. If the orchestrator crashes between creating a worktree and deploying the agent, an orphaned worktree remains. If it crashes between agent completion and worktree removal, stale worktrees accumulate. The worktree-manager skill exists specifically to handle these edge cases, adding complexity to compensate for a fundamentally manual process.

**3. Shared worktree contention.** In `medium_single_branch` strategy, multiple agents work in a single shared worktree with exclusive file assignments. This creates coordination overhead: the orchestrator must track which files belong to which agent, detect conflicts when assignments overlap, and abort agents that touch files outside their scope. The shared worktree model works only when file boundaries are clean, which is not guaranteed for features that cross module boundaries.

**4. No leverage from Claude Code's isolation primitive.** Claude Code's `isolation: worktree` mode handles worktree creation, agent execution, and cleanup as an atomic unit. The single-layer model cannot use this because agents need worktrees with specific branch configurations, dependency installations, and file state that the built-in isolation mode does not provide. Reaper manages its own worktrees precisely because the built-in ones lack the setup that agents require. This is a missed opportunity: Claude Code already solves the isolation lifecycle problem, but Reaper cannot benefit because the setup requirements are coupled to the isolation mechanism.

### The insight: separate setup from isolation

The four problems share a root cause: the single-layer model conflates two concerns that have different lifecycles and different owners.

**Session setup** (branch creation, dependency installation, initial file state) is expensive, happens once per takeoff session, and persists across multiple agent deployments. It belongs to the orchestrator.

**Agent isolation** (giving each agent its own filesystem view so concurrent agents do not interfere) is cheap, happens per agent deployment, and is ephemeral. It belongs to the execution platform (Claude Code).

The single-layer model forces both concerns into one worktree, which means every agent worktree must be both fully set up (expensive) and fully isolated (ephemeral). These requirements conflict: setup wants persistence, isolation wants disposability.

---

## Decision

Worktree management is split into two layers with distinct lifecycles, ownership, and purposes.

### Layer 1: Session worktrees (orchestrator-owned, persistent)

The orchestrator creates one session worktree per takeoff invocation, located at `.claude/worktrees/TASK-ID-desc`. This worktree:

- Is checked out to the feature branch for the task.
- Has real dependency installations (`node_modules/`, `vendor/`, `.venv/`, etc.) performed once during session setup.
- Persists for the entire takeoff session, across all agent deployments.
- Is the source of truth for the feature branch. All commits target this worktree's branch.
- Is created by branch-manager at session start and removed by branch-manager at session end.

The session worktree replaces the current `./trees/TASK-ID-desc` worktree. The path change from `./trees/` to `.claude/worktrees/` reflects the shift in ownership: these worktrees are managed by Reaper's orchestration layer (which operates within `.claude/`), not by manual user operations.

### Layer 2: Agent worktrees (Claude Code-owned, ephemeral)

Each agent is deployed with Claude Code's `isolation: worktree` mode. Claude Code creates an ephemeral worktree, runs the agent, and removes the worktree when the agent completes. These worktrees:

- Are fully managed by Claude Code's built-in isolation mechanism. The orchestrator does not create, configure, or clean up agent worktrees.
- Symlink vendor directories (`node_modules/`, `vendor/`, `.venv/`, etc.) from the session worktree instead of installing their own copies. This gives agents access to all dependencies without the cost of per-agent installation.
- Are ephemeral. When the agent completes, Claude Code removes the worktree. Any file changes the agent made exist only in the agent worktree until the orchestrator commits them.
- Provide natural concurrent isolation. Multiple agents deployed simultaneously each get their own worktree without file contention or exclusive file assignments.

### Dependency-manager agnostic vendor symlinks

Agent worktrees symlink vendor directories from the session worktree to avoid per-agent dependency installation. The symlink targets are determined by the dependency manager in use, not hardcoded to a single ecosystem:

| Dependency Manager | Vendor Directory        | Symlink in Agent Worktree                            |
| ------------------ | ----------------------- | ---------------------------------------------------- |
| npm / yarn / pnpm  | `node_modules/`         | `node_modules -> ../session-worktree/node_modules`   |
| Composer (PHP)     | `vendor/`               | `vendor -> ../session-worktree/vendor`               |
| pip (Python)       | `.venv/`                | `.venv -> ../session-worktree/.venv`                 |
| Bundler (Ruby)     | `vendor/bundle/`        | `vendor/bundle -> ../session-worktree/vendor/bundle` |
| Go modules         | `vendor/` (if vendored) | `vendor -> ../session-worktree/vendor`               |
| Cargo (Rust)       | `target/`               | `target -> ../session-worktree/target`               |

The orchestrator detects which vendor directories exist in the session worktree and symlinks only those that are present. No dependency manager is assumed or required. Projects with no vendor directories (e.g., Go projects using the module cache) require no symlinks.

This design is intentionally simple: symlink the directory, do not replicate the dependency manager's resolution logic. If a vendor directory exists in the session worktree, it is symlinked. If it does not exist, nothing happens. The orchestrator does not need to understand lock files, version resolution, or installation semantics -- only directory existence.

### Orchestrator-owned commits with fast-forward merge

Coding agents never commit (ADR-0010). In the two-layer model, the commit flow is:

1. **Agent completes work.** The agent's file changes exist in the agent worktree (Layer 2). The agent signals completion to the orchestrator.
2. **Quality gates validate.** The orchestrator runs gate agents (test-runner, SME reviewer, security-auditor) against the agent worktree. Gates execute in the agent worktree path where the changes live.
3. **Orchestrator commits.** After all gates pass, the orchestrator directs branch-manager to commit the changes. Branch-manager commits in the agent worktree (where the changes are staged) on the agent worktree's branch.
4. **Fast-forward merge to session branch.** Branch-manager fast-forward merges (`--ff-only`) the agent worktree's branch into the session worktree's feature branch. The `--ff-only` constraint ensures the merge is a simple pointer advancement with no merge commits and no conflict resolution. If the fast-forward fails (because the session branch has diverged), the merge is rejected and the orchestrator must reconcile before retrying.
5. **Agent worktree cleanup.** Claude Code removes the agent worktree as part of its normal isolation teardown.

This flow means the session worktree accumulates commits from all agents via fast-forward merges, maintaining a linear history on the feature branch. The session worktree is always the authoritative state of the feature branch.

### Path convention

| Layer            | Path Pattern                     | Owner                               | Lifecycle                   |
| ---------------- | -------------------------------- | ----------------------------------- | --------------------------- |
| Session worktree | `.claude/worktrees/TASK-ID-desc` | Orchestrator (via branch-manager)   | Takeoff session             |
| Agent worktree   | Auto-assigned by Claude Code     | Claude Code (`isolation: worktree`) | Single agent deployment     |
| Legacy (removed) | `./trees/TASK-ID-desc`           | Orchestrator (manual)               | Replaced by two-layer model |

---

## Consequences

**Positive:**

- Dependency installation happens once per session, not once per agent. A project with a 30-second `npm install` deploying 5 agents saves over 2 minutes of wall-clock time per session. For projects with larger dependency trees, the savings are proportionally greater.
- Agent worktree lifecycle is fully managed by Claude Code's built-in isolation. The orchestrator does not create, track, or clean up agent worktrees. Orphaned worktrees from orchestrator crashes are eliminated by construction -- Claude Code's isolation teardown handles cleanup regardless of agent success or failure.
- Concurrent agents get natural isolation without file assignment coordination. Each agent has its own worktree, so there is no shared worktree contention and no need for exclusive file assignment tracking. The `medium_single_branch` shared-worktree strategy and its coordination overhead become unnecessary.
- The `--ff-only` merge constraint ensures the session branch maintains a linear history. Merge conflicts cannot be silently resolved -- they surface as merge failures that the orchestrator must explicitly handle. This is consistent with ADR-0020's preference for linear history on feature branches.
- Vendor symlinks are dependency-manager agnostic. Adding support for a new ecosystem requires no code changes -- only the presence of a vendor directory in the session worktree. This avoids ecosystem-specific logic in the orchestrator.

**Negative / Risks:**

- Symlinked vendor directories create a shared mutable resource. If an agent modifies files inside `node_modules/` (e.g., patching a dependency for debugging), the modification is visible to all concurrent agents sharing the same symlink target. In practice, agents should not modify vendor directories, but the architecture does not prevent it. A misbehaving agent could corrupt shared dependencies for the session.
- The `--ff-only` constraint means the session branch cannot have diverged when an agent's work is merged. If two agents complete concurrently and both try to fast-forward merge, the second merge will fail because the session branch advanced when the first merge completed. The orchestrator must serialize merges or rebase the second agent's commits onto the updated session branch. This serialization point is a potential bottleneck for highly parallel workflows.
- Agent worktree paths are auto-assigned by Claude Code and are not predictable. The orchestrator cannot reference a specific agent worktree by path before the agent is deployed. This is acceptable because the orchestrator communicates with agents through their prompts and responses, not by directly accessing their worktree paths. However, it means gate agents must be deployed into the same agent worktree (or given its path) to validate changes before the worktree is cleaned up.
- The `.claude/worktrees/` path is inside the `.claude/` directory, which is typically gitignored. Session worktrees at this path will not appear in `git status` from root, reducing visibility of active sessions. The `status-worktrees` command must be updated to scan `.claude/worktrees/` instead of (or in addition to) `./trees/`.
- Migration from `./trees/` to `.claude/worktrees/` requires updating all references across agents, commands, skills, and documentation. During the transition, both path conventions may coexist, creating potential confusion about which worktrees follow the old single-layer model and which follow the new two-layer model.

---

## Alternatives Considered

**Single-layer with per-agent dependency installation** -- Keep the current `./trees/` model but run `npm install` (or equivalent) in every agent worktree. This eliminates the dependency problem without architectural change. Rejected because it multiplies installation time by the number of agents deployed per session. A takeoff session deploying 5 agents to a project with a 30-second install adds 2.5 minutes of pure installation overhead. For larger projects with multi-minute installs, this becomes the dominant cost of the session. The two-layer model achieves the same result (every agent has dependencies) with a single installation.

**Patch/diff handoff between agents** -- Instead of giving agents their own worktrees, have agents produce diffs or patches as output. The orchestrator applies patches to a single canonical worktree, runs gates against the patched state, and commits if gates pass. No agent worktrees are needed at all. Rejected for three reasons: (1) agents cannot run tests or linters against their changes because they do not have a working copy with their changes applied -- they produce a diff but cannot validate it; (2) patch application is fragile when multiple agents' patches touch overlapping files, requiring the orchestrator to handle three-way merges at the patch level; (3) this removes the agent's ability to iterate on failing tests during TDD, since the agent has no working directory in which to execute its code.

**Agent-owned commits** -- Let each agent commit directly to its own branch in its agent worktree, then merge agent branches into the session branch. This simplifies the orchestrator's commit flow (agents handle their own commits) and eliminates the need for the orchestrator to commit in agent worktree paths. Rejected because it violates ADR-0010 (no commits by coding agents) and ADR-0013 (orchestrator owns commit authority). These decisions exist for good reasons: coding agents committing before quality gates run creates premature commits that must be reverted on gate failure, and agent-owned commits remove the orchestrator's ability to control commit timing, message format, and branch history shape. The two-layer model preserves orchestrator commit authority while benefiting from Claude Code's isolation mechanism.

**Single session worktree with locking** -- Use one session worktree and deploy agents into it sequentially (with a lock preventing concurrent access) instead of creating per-agent worktrees. This avoids dependency duplication entirely since all agents share one working copy. Rejected because sequential agent deployment eliminates concurrency, which is one of Reaper's primary performance advantages. The two-layer model achieves both concurrency (via per-agent isolation) and efficiency (via shared dependencies through symlinks).

---

## Related Decisions

- **ADR-0010: No Commits by Coding Agents** -- The two-layer model preserves this constraint. Coding agents work in ephemeral agent worktrees and never commit. The orchestrator directs branch-manager to commit after gates pass.
- **ADR-0013: Orchestrator Owns Commit Authority** -- The orchestrator commits in agent worktree paths and fast-forward merges to the session branch. Commit timing and authority remain with the orchestrator.
- **ADR-0014: Isolated Merge Worktree** -- The isolated merge pattern (temp branch, dedicated worktree, ref advancement) established by ADR-0014 for branch-to-branch merges remains valid. The two-layer model changes how agent work reaches the session branch (fast-forward merge from agent worktree) but does not change how the session branch is merged into review or develop branches.
- **ADR-0020: Rebase-First Commit Strategy** -- The `--ff-only` merge from agent worktree to session branch is compatible with ADR-0020's preference for linear history. The rebase-first strategy applies at the session-to-develop integration boundary, not at the agent-to-session boundary where fast-forward is enforced.
