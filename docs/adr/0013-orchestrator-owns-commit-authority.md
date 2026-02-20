# ADR-0013: Orchestrator Owns Commit and Merge Authority

**Date**: 2026-02-19
**Status**: Accepted

---

## Context

ADR-0010 established that coding agents are prohibited from writing to git history and that `reaper:branch-manager` is the sole agent authorized to commit and merge. That decision addressed *which agent* may commit. This ADR addresses the follow-up question: *who decides when and where* to commit.

The original branch-manager implementation contained a "Dual Authorization" section that required two conditions before allowing commits or merges to protected branches:

1. **Quality gates passed** -- verified by the branch-manager itself from gate result evidence in the prompt.
2. **User authorization obtained** -- verified by the branch-manager itself from an explicit user confirmation flag.

It also exposed an `allow_main_merge` flag as an escape hatch, permitting merges to `main` when the orchestrator set the flag to `true`.

Analysis of the full codebase revealed three problems:

**Dual Authorization was dead code.** No orchestrator command (takeoff, ship, or any other) ever populated `dual_authorization_met` in the branch-manager's response, and no consumer ever read it. The protocol existed in the branch-manager prompt but had no upstream producer or downstream consumer. The branch-manager was performing authorization checks that no one asked for and no one consumed.

**`allow_main_merge` was never set.** No orchestrator command ever passed `allow_main_merge: true` to branch-manager. The flag existed as an escape hatch for a scenario that never occurred in practice. It added complexity to the branch-manager prompt without providing value.

**Commit timing was misplaced.** The shared `quality-gate-protocol.ejs` partial contained a "Commit on Pass" section that directed the orchestrator to commit after each individual gate passed. In a multi-gate pipeline (Gate 1: test-runner, Gate 2: principal-engineer + security-auditor), this produced per-gate commits -- one commit after test-runner passed, another after the Gate 2 reviewers passed. The correct behavior is per-unit commits: a single commit after *all* gates for a work unit complete. Since `quality-gate-protocol.ejs` is a shared partial consumed by both orchestrator commands and non-orchestrator agents, embedding commit logic there forced commit decisions into a context that lacked full pipeline awareness.

---

## Decision

Executor agents are pure tools. All authorization and commit-timing decisions belong to the orchestrator.

### 1. Branch-manager is a pure executor

Branch-manager executes git operations as directed by the orchestrator. It does not independently verify whether quality gates passed, whether the user authorized the operation, or whether a particular branch target is permitted. Those are orchestrator decisions communicated through the deployment prompt.

The Dual Authorization section and `allow_main_merge` flag are removed from the branch-manager prompt. The "Authority and Boundaries" section replaces them with a clear statement: authorization decisions belong to the orchestrator; branch-manager executes them.

### 2. Lightweight precondition check replaces authorization protocol

Branch-manager retains one safety check: if the deployment prompt does not explicitly confirm that quality gates passed and (for protected branch merges) user authorization was obtained, branch-manager returns an error asking for clarification. This is a precondition check on the instruction received -- a guard against malformed orchestrator prompts, not an independent authorization decision. The orchestrator remains the authority on whether those conditions were actually satisfied.

### 3. Commit authority moves to takeoff's per-unit cycle

The "Commit on Pass" section is removed from the shared `quality-gate-protocol.ejs` partial. Commit logic now lives exclusively in takeoff's per-unit cycle (step 7 of the Per-Unit Cycle in `src/commands/takeoff.ejs`):

> After all gates pass, deploy reaper:branch-manager to commit the current state to the feature branch. This is a commit-only step -- do not merge to develop.

This produces per-unit commits (one commit after all gates for a work unit pass) rather than per-gate commits (one commit after each individual gate passes). The quality-gate-protocol partial remains responsible for gate sequencing, iteration rules, and pass/fail validation -- but not for deciding when to commit.

### Convention established

All executor agents -- branch-manager today, and any future executor agents -- are pure tools. They execute operations as directed by the orchestrator. Authorization decisions (when to commit, what to merge, which branch to target, whether the user has approved) belong to the orchestrator. Executors may have lightweight precondition checks to guard against malformed instructions, but they do not implement independent authorization protocols.

---

## Consequences

**Positive:**
- Dead code eliminated: Dual Authorization and `allow_main_merge` no longer bloat the branch-manager prompt with unused logic
- Single source of truth for commit timing: takeoff's per-unit cycle is the one place that decides when commits happen, replacing scattered commit logic across shared partials
- Per-unit commits instead of per-gate commits: a work unit produces one commit after all gates pass, not multiple intermediate commits after individual gates
- Clearer agent contract: branch-manager's role is unambiguous -- execute what the orchestrator says, report errors if instructions are incomplete
- Simpler extension: future executor agents follow the same pattern without needing to duplicate authorization protocols

**Negative / Risks:**
- Orchestrator must be correct: since executors no longer independently verify authorization, a buggy orchestrator could direct a commit or merge that should not happen. The lightweight precondition check (missing confirmation = error) mitigates the most obvious case, but the orchestrator bears more responsibility.
- Commit logic is less discoverable: moving commit decisions from a shared partial to a specific command (takeoff) means developers looking at quality-gate-protocol will not see when commits happen. The partial's removal of "Commit on Pass" must be understood in context of takeoff's per-unit cycle.

---

## Alternatives Considered

**Keep Dual Authorization in executor** -- Branch-manager independently verifies that quality gates passed and user authorization was obtained before executing commits or merges. Rejected because it was dead code: no orchestrator ever populated the required fields, and no consumer ever read the executor's authorization verdict. The protocol added prompt complexity without providing value. The orchestrator is the right place for authorization decisions because it has full pipeline context -- it knows which gates ran, what their results were, and whether the user approved. An executor verifying these conditions independently is redundant at best and contradictory at worst.

**Keep `allow_main_merge` as an escape hatch** -- Retain the flag in branch-manager for future use, even though no orchestrator currently sets it. Rejected because speculative escape hatches that are never exercised accumulate as dead code and prompt bloat. If a future orchestrator needs to direct a merge to `main`, the pure executor model handles it naturally: the orchestrator confirms user authorization in the deployment prompt, and branch-manager executes. No special flag is needed.

**Keep "Commit on Pass" in the shared partial** -- Leave commit-timing logic in `quality-gate-protocol.ejs` so all orchestrator commands inherit it. Rejected because the shared partial lacks the context to make correct commit-timing decisions. It does not know whether it is being consumed in a per-gate or per-unit context. Per-gate commits (the prior behavior) produce unnecessary intermediate commits in a multi-gate pipeline. Moving commit logic to takeoff's per-unit cycle ensures the commit decision is made with full awareness of the pipeline stage.

---

## Related Decisions

- **ADR-0010: No Commits by Coding Agents** -- Established that branch-manager is the sole commit agent. This ADR extends that decision by clarifying that branch-manager is a pure executor and authorization logic belongs to the orchestrator.
