# ADR-0019: Post-Merge Root-Cleanliness Assertion

**Date**: 2026-02-21
**Status**: Accepted

---

## Context

### The root index pollution problem

ADR-0014 established that all branch-manager merge operations use an isolated integration worktree inside `./trees/`. The merge pattern advances the review branch ref using `git branch -f` when root is not on the target branch, or `git merge --ff-only` from root when root is on the target branch. This avoids checking out the review branch in root and preserves root working tree stability, including when root is already on the branch being advanced.

The original implementation included a final step after each merge cycle: `git reset --mixed HEAD` in the root working tree. The reasoning was defensive -- after `git branch -f` advances a ref, the root's index could become stale relative to the new HEAD if root happened to be checked out to the branch whose ref was just advanced. The `reset --mixed HEAD` was intended to re-sync the index with the current HEAD without discarding untracked files.

### Why `git reset --mixed HEAD` became the problem it was meant to solve

The `reset --mixed HEAD` step is safe when root is on a branch unrelated to the merge (e.g., `develop` while the review branch ref is advanced). In that case, `reset --mixed HEAD` is a no-op: the index already matches HEAD because HEAD did not change.

The dangerous case arises when root is checked out to the review branch being advanced. This happens when a developer or orchestrator has switched root to the review branch for inspection. In this scenario:

1. `git branch -f feature/[TASK_ID]-review [INTEGRATION-TEMP]` advances the review branch ref to the merge commit.
2. Root's HEAD now points at the new commit (because root is on that branch), but root's index and working tree still reflect the old commit.
3. `git reset --mixed HEAD` resets root's index to match the new HEAD -- the merge commit. This replaces the index contents with the merged tree, staging changes relative to what root's working tree actually contains.

The result is that root's index is rewritten to match a commit the working tree was never updated to reflect. `git status` in root now shows phantom changes -- files appear modified or deleted because the index (new merge commit) disagrees with the working tree (old commit's files). The root is left in a corrupted state that requires manual intervention.

This is not a theoretical concern. During the v1.12.0 integration cycle, root was checked out to the review branch when the merge cycle ran. The `reset --mixed HEAD` step rewrote root's index, producing dozens of phantom staged changes that appeared as if the developer had manually staged a large set of modifications. The root was dirty in a way that was confusing to diagnose and required `git checkout -- .` to recover.

### The deeper issue: detection versus remediation

The `reset --mixed HEAD` step was a remediation -- it attempted to fix a potential index staleness problem after every merge. But remediation without detection masks the underlying issue. If root's index becomes stale because root is on the wrong branch, the correct response is to surface that fact, not to silently rewrite the index and hope for the best. Silent remediation turns a detectable precondition violation into a subtle postcondition corruption.

---

## Decision

Replace `git reset --mixed HEAD` with a detection-oriented approach: a precondition check before the merge and a postcondition assertion after the merge. Both use `git status --porcelain` on the root working tree.

### Precondition check (before merge)

Before beginning the integration worktree merge cycle, branch-manager runs:

```bash
git status --porcelain
```

in the root working tree. Two conditions are checked:

**Uncommitted changes in root (hard fail).** If the output is non-empty, root has uncommitted changes. The merge operation aborts immediately with `status: error`. Proceeding with uncommitted changes in root risks those changes being affected by ref advancement or cleanup operations. The orchestrator must resolve the dirty root before retrying.

**Root checked out to the review branch (informational, handled correctly).** If root's current branch (`git branch --show-current`) matches the review branch being merged into, branch-manager emits an informational log message and uses `git merge --ff-only` from root instead of `git branch -f` to advance the ref. Running `git merge --ff-only [INTEGRATION-TEMP]` from root atomically advances HEAD, the index, and the working tree to the merge commit -- the same way a normal fast-forward merge works. This eliminates the index staleness that would result from advancing the ref pointer without updating the index. If root is on a different branch, a pointer-only advance via `git branch -f` remains safe and is used instead.

### Postcondition assertion (after merge)

After the merge cycle completes (integration worktree created, merge performed, ref advanced, integration worktree removed, temp branch deleted), branch-manager runs:

```bash
git status --porcelain
```

in the root working tree. If the output is non-empty and root was clean before the merge (the precondition check passed with no uncommitted changes), the merge operation has introduced unexpected changes to root. This is a Protocol #11 trigger.

### Protocol #11: stop and report, never self-remediate

Protocol #11 is Safety Protocol 11 in the branch-manager's behavioral contracts:

> **Stop and report on unexpected state -- do not self-remediate.** When any operation fails or the repository is in an unexpected state, return `status: error` with full details (current branch, git status output, error message). Do not attempt to fix the situation autonomously. The orchestrator -- not the agent -- decides how to respond to failures.

When the postcondition assertion fires, branch-manager returns `status: error` with:

- The full `git status --porcelain` output showing what changed
- The current branch in root
- A message explaining that the merge cycle left root in a dirty state that was not present before the merge began

Branch-manager does not attempt to fix the dirty root. It does not run `git reset`, `git checkout`, `git stash`, or any other remediation command. The orchestrator receives the error report and decides how to proceed -- whether to inspect the state, reset the root, abort the operation, or escalate to the user.

This is the critical distinction from the previous approach: detection and reporting replace silent remediation. If root becomes dirty after a merge, something unexpected happened, and the correct response is to surface that fact rather than mask it.

---

## Consequences

**Positive:**

- Root index corruption is eliminated. The `git reset --mixed HEAD` step that could rewrite root's index when root is on the review branch is removed entirely. No merge operation modifies root's index or working tree.
- Unexpected state is surfaced immediately. If a merge cycle somehow dirties root (a condition that should not occur under the isolated worktree pattern), the postcondition assertion catches it and reports it before the orchestrator proceeds to the next operation.
- Consistent with Protocol #11. The postcondition assertion follows the same stop-and-report pattern used throughout branch-manager for unexpected states. There is no special-case remediation logic for root cleanliness -- it uses the same escalation path as every other unexpected condition.
- Precondition check prevents merging into an already-dirty root, which eliminates an entire class of ambiguous failures where it is unclear whether the merge or a prior operation caused the dirty state.

**Negative / Risks:**

- The "root on review branch" case is now handled correctly via `git merge --ff-only` from root, so it no longer produces index staleness or phantom staged changes. A developer who leaves root on the review branch will see their working tree cleanly advanced to the merge commit after the operation completes, matching the same postcondition as if they were not on that branch.
- The postcondition assertion adds one `git status --porcelain` call after every merge cycle. This is negligible overhead but is a new failure point: if the assertion fires due to a transient condition (e.g., a background process writing to the working tree during the merge), it will halt the merge pipeline. This is acceptable because false positives are preferable to silent corruption -- the orchestrator can inspect and retry.
- Contract tests that previously enforced the presence of `git reset --mixed HEAD` in the branch-manager template must be updated to enforce the postcondition assertion pattern instead. This is a one-time migration cost.

---

## Alternatives Considered

**Keeping `git reset --mixed HEAD` as a safety net** -- The original approach: after every merge cycle, run `git reset --mixed HEAD` in root to ensure the index is in sync with HEAD. Rejected because it masks the underlying problem rather than detecting it. When root is not on the review branch, the reset is a no-op (unnecessary). When root is on the review branch, the reset rewrites the index to match a commit the working tree does not reflect (destructive). In no scenario does the reset provide value: it is either unnecessary or harmful. Worse, if root has legitimately staged changes from another operation, `git reset --mixed HEAD` silently unstages them, destroying work that the developer or another agent intended to commit. A remediation step that can corrupt state should not run unconditionally after every merge.

**Postcondition assertion with automatic recovery** -- Run `git status --porcelain` after the merge, and if root is dirty, automatically run `git reset --mixed HEAD` or `git checkout -- .` to restore cleanliness. Rejected because automatic recovery violates Protocol #11 (stop and report, never self-remediate). The postcondition assertion exists to detect unexpected state, not to fix it. If the assertion fires, the cause is unknown -- it could be a bug in the merge pattern, a concurrent process, or a genuine conflict. Automatic recovery assumes the cause is benign and the fix is safe, which is exactly the assumption that caused the original `reset --mixed HEAD` corruption. The orchestrator, which has broader context about the operation pipeline, is better positioned to decide the correct recovery action.

**No assertion at all (trust the isolated worktree pattern)** -- The isolated worktree merge pattern (ADR-0014) is designed to never touch root. If the pattern is implemented correctly, root should always remain clean. Therefore, no postcondition check is needed. Rejected because implementation correctness is not a substitute for runtime verification. The isolated worktree pattern is correct in design, but bugs in the branch-manager template, unexpected git behavior, or environmental factors could still dirty root. The postcondition assertion is a defensive check that costs nearly nothing and catches failures that would otherwise go undetected until the developer notices phantom changes in root -- potentially much later, when the cause is difficult to trace.

---

## Related Decisions

- **ADR-0014: Isolated Merge Worktree for Branch-Manager** -- Established the isolated merge pattern that this ADR defends. The precondition and postcondition checks exist to verify that the isolation guarantees of ADR-0014 hold at runtime.
- **ADR-0010: No Commits by Coding Agents** -- Established that branch-manager is the sole agent authorized to perform git write operations. The root-cleanliness assertion runs within branch-manager, the only agent that could potentially affect root state during merges.
- **ADR-0013: Orchestrator Owns Commit and Merge Authority** -- Established that the orchestrator decides how to respond to failures. The postcondition assertion reports to the orchestrator rather than self-remediating, consistent with this authority model.
