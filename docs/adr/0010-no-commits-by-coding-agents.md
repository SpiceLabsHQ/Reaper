# ADR-0010: No Commits by Coding Agents

**Date**: 2026-02-18
**Status**: Accepted

---

## Context

Reaper's orchestrator deploys coding agents (bug-fixer, feature-developer, refactoring-dev, integration-engineer) to implement changes in worktrees. These agents run TDD cycles during development: they write tests, make them pass, and refactor. The question is whether coding agents should commit their work directly, or whether commits should be deferred to a later stage in the pipeline.

If coding agents commit their own work, two risks emerge:

1. **Premature commits.** A coding agent that commits before quality gates run embeds unvalidated code in the branch history. If the test-runner gate or SME review subsequently fails, the branch contains commits that need to be amended or reverted. This is messier than simply not committing in the first place.

2. **Loss of user authority.** The user should maintain authority over what enters the branch's commit history. When agents commit autonomously, the user's ability to review, squash, or reject work before it is recorded is reduced. Commits become a fait accompli rather than a deliberate act.

A subtler problem arises from the relationship between TDD tests and quality gates. Coding agents run tests during development as part of the Red-Green-Blue cycle. These test runs are development feedback -- they tell the agent "keep going" or "fix this." They are not the same as the independent test-runner gate, which is the authoritative quality signal. If a coding agent commits after its own TDD tests pass but before test-runner validates, the commit may still fail the quality gate. The branch accumulates commits that looked green to the agent but are rejected by the gate.

---

## Decision

Coding agents are prohibited from writing to git history. Commits are exclusively delegated to `reaper:branch-manager` after quality gates pass.

### Prohibited operations for coding agents

- `git commit` on any branch
- `git merge` (branch integration is orchestrator work)
- Any git operation that writes to history: `git rebase`, `git cherry-pick`, `git reset`

### Permitted operations for coding agents

- `git status`, `git diff` (read-only introspection)
- `git add` (staging files as a side effect of development -- but not committing them)
- Reading git history for context (`git log`, `git show`)

### Commit authority hierarchy

1. **`reaper:branch-manager`** -- the sole agent authorized to commit and merge. It is invoked by the orchestrator only after all gate agents (test-runner, SME reviewer, security-auditor) have passed.
2. **User** -- the sole authority over merges to `develop` or `main`. The orchestrator must receive explicit user approval ("merge", "ship it") before invoking branch-manager for integration into protected branches.

### TDD tests vs. test-runner gate

The distinction between development feedback and authoritative quality signals is structural, not cosmetic:

- **TDD tests** (run by the coding agent during development) = development feedback loop. Signals: "proceed" or "fix." Not authoritative. The orchestrator must treat TDD test results reported by coding agents as non-evidence.
- **test-runner gate** (run independently after coding is complete) = authoritative validation. Signals: `all_checks_passed: true/false`. Only test-runner's JSON output is accepted as a quality signal for gate decisions.

### Enforcement

The `no-commits-policy` partial (`src/partials/no-commits-policy.ejs`) is included in all coding agent prompts via EJS template inclusion. It instructs agents that they are not authorized for git commit operations and clarifies that their test results are development feedback only.

Contract tests verify the partial remains present in all coding agent templates. The orchestrator's zero-trust policy for coding agent claims (ADR-0009) further prevents the orchestrator from trusting self-reported commit status or test metrics from coding agents.

---

## Consequences

**Positive:**
- Clean commit history: only gate-validated code is committed to the branch
- Quality gate sovereignty: gates always precede commits, never the reverse
- User retains authority over what enters `develop` and `main`
- No premature commits to untangle when gates fail
- Clear separation of concerns: coding agents code, branch-manager handles git operations

**Negative / Risks:**
- Extra round-trips (coding agent completes, gates run, branch-manager commits) add latency to each work unit
- All coding agent prompts must consistently include the no-commits partial; a missed inclusion creates a gap in enforcement
- The distinction between TDD tests (development feedback) and test-runner results (authoritative gate signal) requires documentation and understanding from all contributing developers

---

## Alternatives Considered

**Coding agents commit on TDD green** -- The agent commits immediately when its own tests pass. Fewer round-trips, faster iteration. Rejected because it creates premature commits before gate validation and blurs the line between development feedback and authoritative quality signals. A green TDD cycle does not mean the code passes the full test suite, SME review, or security audit.

**All agents commit freely** -- Maximum agent autonomy with no restrictions on git operations. Rejected because it sacrifices clean commit history, quality gate sovereignty, and user authority over branch history. The resulting history would contain unvalidated commits interleaved with gate-validated ones.

**Orchestrator commits directly on gate pass (not branch-manager)** -- The orchestrator itself runs `git commit` after gates pass, keeping commit responsibility with the coordinator. Rejected because the orchestrator's role is coordination and delegation, not direct execution of git operations. Delegating to branch-manager maintains separation of concerns and allows branch-manager to handle edge cases (conflict resolution, rebase, worktree state) that the orchestrator should not own.

**User commits manually after every work unit** -- Maximizes user control by requiring manual `git commit` for every change. Rejected because it creates excessive friction in the autonomous workflow. The user would need to intervene after every coding-then-gate cycle, defeating the purpose of orchestrated development. User authority is preserved at the integration boundary (`develop`/`main`) where it matters most.
