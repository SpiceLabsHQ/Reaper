# ADR-0014: Isolated Merge Worktree for Branch-Manager

**Date**: 2026-02-19
**Status**: Accepted

---

## Context

Reaper's `large_multi_worktree` strategy creates per-unit worktrees on separate branches and then merges each completed branch into a shared review branch (`feature/[TASK_ID]-review`). The conventional approach to performing this merge is `git checkout` followed by `git merge`:

```bash
git checkout feature/[TASK_ID]-review
git merge feature/[TASK_ID]-[COMPONENT] --no-ff
```

This approach has a structural problem in Reaper's execution model. The branch-manager agent runs in the repository root. When `git checkout` switches branches in root, it replaces the working tree contents with the target branch's files. This produces two failure modes:

**1. Root working tree disturbance.** The user (or orchestrator) may have the root checked out to `develop` with uncommitted state, open editors, or running processes that depend on the current file layout. A `git checkout` to a review branch silently replaces these files. After the merge completes and branch-manager switches back, the root working tree has been churned through two branch switches. Any uncommitted changes that conflict with either branch are lost or require stashing -- a fragile manual step that the agent must remember to perform and undo correctly.

**2. Conflict resolution in root.** If the merge produces conflicts, those conflict markers appear in the root working tree. The agent must resolve them in root, where they are interleaved with the user's files and any other worktrees referencing the same branch. A failed conflict resolution dirties root in a way that is difficult to recover from without user intervention.

Both problems violate a core Reaper safety invariant: the root working tree should remain stable and undisturbed during orchestrated operations. Worktrees exist precisely to isolate agent work from the user's environment.

---

## Decision

All branch-manager merge operations use a temporary branch and isolated worktree inside `./trees/`. The root working tree is never switched to a different branch for merge purposes.

### The pattern

```bash
# 1. Create a temp branch pointing at the current review branch head
git branch [TASK_ID]-integration-temp feature/[TASK_ID]-review

# 2. Create an isolated worktree for the merge operation
git worktree add ./trees/[TASK_ID]-integration [TASK_ID]-integration-temp

# 3. Merge the component branch inside the isolated worktree
git -C ./trees/[TASK_ID]-integration merge feature/[TASK_ID]-[COMPONENT] --no-ff

# 4. On success: advance the review branch ref to match the temp branch
#    This updates the ref without checking out the review branch in root
git branch -f feature/[TASK_ID]-review [TASK_ID]-integration-temp

# 5. Cleanup: remove the integration worktree and delete the temp branch
git worktree remove ./trees/[TASK_ID]-integration
git branch -d [TASK_ID]-integration-temp
```

### Why a temp branch

Git does not allow a worktree to be checked out to a branch that another worktree (including the main working tree) already has checked out. The review branch may already be referenced by other worktrees or by the root. A temporary branch (`[TASK_ID]-integration-temp`) sidesteps this restriction. After the merge succeeds, `git branch -f` advances the review branch ref to the temp branch's commit without requiring any checkout operation.

### Where conflicts surface

If step 3 produces merge conflicts, they appear inside `./trees/[TASK_ID]-integration` -- a disposable worktree that exists solely for this merge. The root working tree is unaffected. The agent can resolve conflicts in the isolated worktree, abort the merge, or report the failure to the orchestrator, all without disturbing the user's environment.

### Convention established

All future branch-manager merge steps must follow this pattern. Direct `git checkout` in root for the purpose of merging branches is prohibited. Rule 5 in the branch-manager's safety rules codifies this:

> Root navigation is valid before teardown operations only. It is never the correct approach for merge operations. All merges must use an isolated integration worktree inside `./trees/` so that conflicts surface there, not in root.

---

## Consequences

**Positive:**
- Root working tree stability: the user's checked-out branch, uncommitted changes, open editors, and running processes are never disturbed by merge operations
- Conflict isolation: merge conflicts surface in a disposable worktree that can be cleaned up without affecting root
- No stash/unstash choreography: the agent does not need to remember to stash uncommitted root changes before merging and restore them afterward -- a sequence that is error-prone and has no recovery path if the agent forgets
- Consistent with Reaper's worktree isolation model: all agent work happens inside `./trees/`, including merge operations
- Ref advancement without checkout: `git branch -f` updates the review branch pointer without switching any working tree, making the operation atomic from the user's perspective

**Negative / Risks:**
- Extra git operations per merge: each merge requires creating a temp branch, adding a worktree, performing the merge, advancing the ref, removing the worktree, and deleting the temp branch -- six operations versus two for a conventional checkout-merge
- Temporary branch cleanup: if the agent crashes between step 2 and step 5, a stale temp branch and orphaned worktree remain. The agent's teardown safety rules (backup refs, verify from root) mitigate this, but manual cleanup may be required after unrecoverable failures
- Pattern complexity: developers contributing to the branch-manager template must understand why direct checkout is prohibited and follow the isolated merge pattern. The ADR and in-template documentation provide this context, but the pattern is less intuitive than a simple checkout-merge

---

## Alternatives Considered

**Conventional `git checkout` + `git merge` in root** -- The standard approach: check out the target branch in root, merge the source branch, then switch back. Rejected because it violates root working tree stability. Switching branches in root replaces files, risks losing uncommitted changes, and surfaces merge conflicts in the user's working environment. The checkout-merge approach treats root as disposable workspace, which contradicts Reaper's isolation model where root is the user's stable environment and `./trees/` is where agent work happens.

**`git merge-tree` (plumbing command)** -- Git 2.38 introduced `git merge-tree --write-tree` which can perform a three-way merge in memory without any working tree, producing the merge tree object directly. This would avoid both root disturbance and the need for a temporary worktree. Rejected for two reasons: (1) Git 2.38+ is required, and Reaper targets environments where older Git versions may be installed -- imposing a minimum Git version for a core branch-manager operation creates a compatibility cliff that is difficult to detect and diagnose at runtime; (2) `merge-tree` produces tree objects that must be manually assembled into commits using low-level plumbing (`git commit-tree`), making conflict resolution impossible through normal tooling. The isolated worktree approach uses only porcelain commands available in all supported Git versions and provides a standard working tree for conflict resolution when needed.

**Merge in an existing component worktree** -- Reuse the component's worktree (which is already checked out to the component branch) to perform the merge into the review branch. Rejected because this would require switching the component worktree's branch to the review branch, which has the same checkout-disturbance problem as merging in root -- just in a different location. It also conflates the purpose of the component worktree (development) with integration (merging), making cleanup and error recovery more complex.

---

## Related Decisions

- **ADR-0010: No Commits by Coding Agents** -- Established that `reaper:branch-manager` is the sole agent authorized to commit and merge. This ADR specifies how branch-manager must perform those merge operations.
- **ADR-0013: Orchestrator Owns Commit and Merge Authority** -- Established that branch-manager is a pure executor. This ADR defines the execution pattern branch-manager uses for merges directed by the orchestrator.
