# ADR-0020: Rebase-First Commit Strategy with Tree-Depth Heuristic

**Date**: 2026-02-22
**Status**: Accepted

---

## Context

### The merge-commit noise problem

ADR-0014 established the isolated integration worktree pattern for all branch-manager merge operations. The existing implementation uses `--no-ff` everywhere, which unconditionally produces a merge commit for every work unit integrated into the review branch. This was the safe default when branch-manager was first introduced: `--no-ff` preserves the boundary between work units and avoids the ambiguity of fast-forward rewriting.

The problem emerges at scale. When takeoff executes many work units in sequence — a common pattern for multi-component features — the review branch history fills with merge commits that provide no information beyond "this unit was merged at this point." The actual feature work, expressed through individual commits inside each work unit, is buried one level down and requires `git log --all` or `--first-parent` manipulation to read. For an integration branch that a developer inspects before raising a PR, a history composed primarily of merge commits obscures what was actually built.

### Why --no-ff became the path of least resistance

The `--no-ff` default was appropriate when branch-manager was first designed. At that stage, the integration pattern was new, contract tests were being established, and correctness took priority over history aesthetics. `--no-ff` never loses commits and makes the merge boundary explicit, which makes it easy to audit and easy to undo. The cost — noisy history — was acceptable for an early-stage implementation.

With the isolated worktree pattern now proven stable across multiple releases and the contract test suite enforcing behavioral invariants, the implementation has enough safety margin to adopt a smarter default. The goal is not to eliminate merge commits entirely but to use them only when they carry information — specifically, when a work unit contains multiple commits whose individual identities matter.

### The flat-tree versus complex-tree distinction

Most takeoff workflows produce one of two issue tree shapes:

**Flat tree**: A parent issue with N child issues, each child a leaf node (no grandchildren). Each child maps to a single work unit. The children are independent and parallel. In a flat tree, each work unit typically produces a small number of commits — often one — and the parent issue title is the appropriate summary for the combined work.

**Complex tree**: A parent issue with children that themselves have children. Sub-parents represent logical groupings of related work units. In a complex tree, the sub-parent structure carries meaning: commits under sub-parent A are related to each other in ways they are not related to commits under sub-parent B. Squashing across sub-parent boundaries would lose that grouping.

The distinction between flat and complex trees is detectable at launch time by inspecting the issue tree depth: if all children of the root issue are leaf nodes, the tree is flat; if any child has children of its own, the tree is complex. Takeoff can compute this flag once, before deploying branch-manager, and pass it as a parameter.

---

## Decision

Adopt a rebase-first commit strategy with three merge paths. The path used for any given work unit is determined by two inputs: the number of commits in the work unit and the FLAT_TREE/COMPLEX_TREE flag set by takeoff at launch.

### Path 1: Single-commit unit — rebase + fast-forward

**Condition**: The work unit contains exactly one commit (commit-count = 1).

**Operation**: Rebase the work unit's branch onto the current tip of the review branch, then merge with `--ff-only`.

```bash
# Inside the ADR-0014 integration worktree
git rebase <review-branch-tip> <work-unit-branch>
git checkout <review-branch>
git merge --ff-only <work-unit-branch>
```

**Result**: The single commit is replayed directly onto the review branch with no merge commit. The commit's author, timestamp, and message are preserved. The review branch history reads as a linear sequence of individual commits.

**Rationale**: A single commit is already an atomic unit of work. A merge commit wrapping a single commit adds noise without adding information. Fast-forward integration treats the commit as a first-class citizen in the review branch history, not as cargo inside a merge envelope.

### Path 2: Flat-tree multi-unit — rebase + squash

**Condition**: The work unit contains more than one commit (commit-count > 1) AND the takeoff-set flag is FLAT_TREE.

**Operation**: Rebase the work unit's branch onto the current tip of the review branch, then squash all commits into a single conventional commit using the parent issue title as the subject.

```bash
# Inside the ADR-0014 integration worktree
git rebase <review-branch-tip> <work-unit-branch>
git rebase --interactive HEAD~<N>   # squash N commits to one
git checkout <review-branch>
git merge --ff-only <work-unit-branch>
```

The squashed commit message follows the conventional commit format with a Ref footer listing all issue IDs involved:

```
<type>(<scope>): <subject derived from parent issue title>

Squashes work across N components: component-a, component-b.

Ref: reaper-parent, reaper-child-1, reaper-child-2
```

**Result**: The review branch history contains one commit per parent issue, regardless of how many sub-commits the implementation produced. Each commit is self-describing via the conventional commit message and the Ref footer.

**Rationale**: In a flat tree, the child issues are leaves with no internal structure that needs to be preserved in history. The parent issue title is the correct level of abstraction for the review branch. Individual commits inside the work unit are development artifacts — useful during implementation, but not meaningful to a reviewer reading the integration branch before raising a PR.

### Path 3: Complex-tree fallback — --no-ff per sub-parent group

**Condition**: The takeoff-set flag is COMPLEX_TREE (regardless of commit count).

**Operation**: Use the existing `--no-ff` merge behavior, applied once per sub-parent group rather than once per leaf work unit. Work units under the same sub-parent are merged together into a single merge commit representing the sub-parent's contribution.

```bash
# Inside the ADR-0014 integration worktree — applied per sub-parent group
git merge --no-ff <sub-parent-branch>
```

**Result**: The review branch history contains one merge commit per sub-parent, preserving the logical grouping that the complex tree expresses. Individual commits within each group are accessible via `git log --all` or `git log <merge-commit>^...<merge-commit>`.

**Rationale**: Complex trees exist because sub-parent structure carries meaning. A sub-parent groups related work units whose individual commit identities matter for understanding what changed. Squashing across sub-parent boundaries would collapse distinctions the issue tree deliberately encodes. Preserving the merge commit at the sub-parent boundary maintains that structure in history while still reducing noise compared to one merge commit per leaf.

### FLAT_TREE/COMPLEX_TREE flag determination

Takeoff computes the tree-depth flag once, before the first branch-manager deployment, by inspecting the issue tree:

- **FLAT_TREE**: All direct children of the root issue are leaf nodes (have no children of their own).
- **COMPLEX_TREE**: At least one direct child of the root issue has children of its own.

The flag is passed to branch-manager as a launch parameter. Branch-manager does not re-inspect the tree; it trusts the flag set by takeoff. This keeps branch-manager's decision logic simple and ensures the flag is consistent across all work units in a single takeoff session.

### Integration worktree scope

All three paths execute inside the ADR-0014 isolated integration worktree (`./trees/[TASK_ID]-integration`). No rebase, squash, or fast-forward operation touches the root working tree or any other worktree. The postcondition assertion from ADR-0019 runs after each merge cycle, verifying that root remains clean regardless of which path was taken.

---

## Consequences

**Positive:**

- Review branch history is readable without `--all` or `--first-parent` flags. For single-commit units (the common case), the history reads as a linear sequence of conventional commits. For flat-tree multi-unit work, one squashed commit per parent issue provides a clean summary. For complex-tree work, merge commits appear only where they carry structural meaning.
- The conventional commit format is preserved end-to-end. Squashed commits use the same type/scope/subject/Ref structure as all other commits in the project, keeping commitlint-enforced conventions consistent.
- The decision is made once per takeoff session (flat vs. complex) rather than re-evaluated per commit, reducing per-operation overhead and ensuring consistency across all work units in a session.
- Paths 1 and 2 produce linear history on the review branch, which simplifies `git bisect`, `git blame`, and PR diff views.
- The existing `--no-ff` behavior is preserved exactly for complex trees, so no regression is introduced for the workflows that currently rely on merge commit structure.

**Negative / Risks:**

- Rebase rewrites commit SHAs. For a work unit that is already visible on a shared remote branch, rebasing would require a force-push to the work unit's branch. This is acceptable because work-unit branches are ephemeral integration artifacts — they are never intended for external consumption — but the implementation must ensure no rebase is attempted on a branch that has been pushed and shared outside the integration worktree.
- Squash (Path 2) permanently discards individual commit authorship within the work unit. If a work unit was produced by multiple contributors, their individual commits are lost in the squash. This is an acceptable tradeoff for leaf-level work units in a flat tree, where single-contributor automation is the norm, but implementors must be aware of the edge case.
- The FLAT_TREE/COMPLEX_TREE flag is computed once at takeoff launch. If the issue tree changes during a long-running takeoff session (e.g., new children are added to a previously-leaf node), the flag will be stale for the remaining work units. This is an unlikely edge case in practice, and the cost of re-evaluating the tree on every branch-manager invocation is not justified by the frequency of the scenario.
- Interactive rebase (`--interactive`) is used for Path 2 squashing. In the non-interactive integration worktree context, this requires a configured `GIT_SEQUENCE_EDITOR` or equivalent mechanism to automate the squash instruction. The implementation must handle this without requiring user input.

---

## Alternatives Considered

**Squash-always** -- Apply squash for every work unit regardless of tree shape or commit count. One squashed commit per work unit, always. Rejected because squash-always loses granularity on complex multi-branch features where the sub-parent structure matters. A complex tree encodes deliberate groupings of related work; collapsing those groupings into undifferentiated squash commits destroys the information the tree was designed to express. Reviewers reading the PR would see a flat sequence of squashed commits with no indication of which commits belong to the same logical group. The three-path heuristic preserves squashing where it adds value (flat leaves, single commits) and retains structure where it matters (complex trees).

**Keep --no-ff everywhere with improved commit messages** -- Continue using `--no-ff` for all merges, but improve the auto-generated merge commit messages to be more descriptive (e.g., include the work unit title and issue IDs in the merge commit body). Rejected because this addresses the symptom — merge commits are hard to read — without addressing the root cause: there are too many of them. Even perfectly-worded merge commits produce a history where the signal-to-noise ratio is low when takeoff runs many sequential work units. A reviewer reading the integration branch before raising a PR must mentally filter out every other commit as infrastructure. Better messages make individual merge commits easier to read in isolation, but they do not make the overall history easier to navigate. The three-path strategy reduces the commit count to the minimum necessary, which is the correct fix.

---

## Related Decisions

- **ADR-0014: Isolated Merge Worktree for Branch-Manager** -- Established the integration worktree pattern that all three merge paths execute within. This ADR extends ADR-0014 by defining the specific git operations performed inside that worktree.
- **ADR-0019: Post-Merge Root-Cleanliness Assertion** -- Established the precondition and postcondition checks that surround each merge cycle. The rebase and squash operations in Paths 1 and 2 run inside the integration worktree and do not affect root; the postcondition assertion verifies this invariant holds for the new paths as it did for the original `--no-ff` path.
