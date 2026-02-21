# ADR-0015: Workflow-Planner Process Extraction and Executor-Prescribing Skills

**Date**: 2026-02-20
**Status**: Accepted

---

## Context

### The ADR-0002 Exclusion

ADR-0002 established that SME agents should be pure domain experts — process belongs in skills, domain judgment belongs in agents. It explicitly excluded execution utilities from this principle:

> *Coding agents (bug-fixer, feature-developer, refactoring-dev) and execution utilities (branch-manager, test-runner, workflow-planner, incident-responder) legitimately embed process in their definitions because execution is their function.*

This exclusion was correct at the time. For a single-purpose execution utility, the agent *is* the process. Separating them adds indirection without benefit.

`workflow-planner` has since outgrown that assumption. The agent now handles two distinct operational modes:

1. **Planning mode** — decomposing a task description into a work breakdown structure, selecting a concurrency strategy, and writing a planfile to `.claude/plans/`
2. **Verification mode** — reviewing a completed implementation against a planfile to determine whether all units are satisfied and whether the result is ready for merge

These modes are independent. An invocation in planning mode has no use for verification process steps. An invocation in verification mode has no use for planning heuristics. Despite this independence, both modes' full process content is loaded on every invocation — regardless of which mode is actually needed. As the agent has grown to accommodate edge cases in each mode, this overhead has compounded.

The original exclusion was a pragmatic default. workflow-planner's evolution has created the conditions that made the exclusion appropriate to reverse.

### Context: Fork and Agent Frontmatter

When ADR-0002 was written, Claude Code's skill invocation model did not provide a mechanism for a skill to prescribe its own executor. Skills were process documents invoked by commands; the invoking command decided which agent to deploy.

Claude Code now supports `context: fork` and an `agent` frontmatter field on skills. A skill with `context: fork` runs in a forked execution context; an `agent` field specifies which agent is used for that fork. This allows a skill to declare its intended executor without requiring the invoking command to know which agent to select.

This capability is relevant to skills extracted from workflow-planner because those skills are designed to run exclusively within the workflow-planner agent. Without a declarative executor constraint, invoking commands must encode knowledge of the skill-to-agent mapping — coupling the command to the skill's internal requirements.

---

## Decision

### Decision 1: Extract workflow-planner's modes to skills

`workflow-planner` is refactored to contain general planning knowledge only — the heuristics, principles, and judgment criteria that constitute its domain expertise. Its two operational modes are extracted to discrete skills:

- **`reaper:workflow-plan`** — the planning process: decomposing requirements, selecting a concurrency strategy, writing the planfile
- **`reaper:workflow-verify`** — the verification process: reading a completed planfile, assessing unit completion, producing a merge recommendation

The agent definition no longer contains step-by-step process instructions for either mode. It describes how the workflow-planner *thinks* — not what it should do in a given invocation. This brings workflow-planner into alignment with the process-in-skills principle ADR-0002 established for SME agents, reversing the exclusion that no longer reflects the agent's structure.

### Decision 2: Executor-prescribing skills use context: fork + agent frontmatter

Skills designed to run exclusively within a specific agent MUST declare `context: fork` and `agent: <agent-name>` in their frontmatter. This is the standard pattern for skills that prescribe their own executor.

```yaml
---
context: fork
agent: reaper:workflow-planner
---
```

The `reaper:workflow-plan` and `reaper:workflow-verify` skills are the first application of this pattern. They declare `agent: reaper:workflow-planner` so that the Claude Code runtime handles agent selection. Invoking commands supply the skill reference; they do not need to know or encode which agent executes it.

This pattern generalizes. Any future skill that is semantically bound to a specific agent — where invoking it through any other agent would produce incorrect or meaningless results — should declare its executor using this mechanism.

---

## Consequences

**Positive:**

- `workflow-planner` becomes a lean, stable agent definition. Planning heuristics and verification criteria no longer share a file; each can evolve independently without touching the other or the agent.
- Token overhead is proportional to the invocation. A planning invocation loads only planning process; a verification invocation loads only verification process. Neither mode pays for the other.
- The `context: fork` + `agent` pattern makes skill-to-agent binding explicit and machine-readable. Invoking commands do not need to encode executor knowledge; the skill carries its own requirement.
- Skills self-document their intended execution environment. A developer reading `reaper:workflow-plan` knows immediately which agent runs it; they do not need to trace invoking commands to discover the dependency.
- The pattern is discoverable and uniform. Future executor-prescribing skills follow the same frontmatter convention, making the relationship visible in one place.

**Negative / Risks:**

- Two skill files must now be maintained alongside the agent definition. A change to workflow-planner's planning approach requires updating `reaper:workflow-plan`; a change to verification requires updating `reaper:workflow-verify`. The agent and its skills are three separate artifacts where one existed before.
- The `agent` frontmatter field enforces executor selection at the Claude Code runtime level. If a future invocation context does not support `context: fork`, the skill cannot self-select its executor and the invoking command must handle agent selection explicitly.
- The pattern is new. Authors writing executor-prescribing skills must know to use `context: fork` + `agent` rather than documenting the dependency in prose. The ADR provides this guidance, but it must be discoverable.

---

## Alternatives Considered

**Document the executor requirement in the skill description only** — Add a note to the skill's description field stating which agent should run it. Rejected because description-only documentation is not enforced. Invoking commands can ignore prose documentation; the `agent` frontmatter field is read by the runtime and cannot be ignored. Documentation without enforcement is guidance without guarantee.

**Agent-locking hooks** — Implement a pre-invocation hook that validates the calling agent matches the skill's expected executor and rejects mismatched invocations. Rejected because hooks add implementation complexity and brittleness. The `context: fork` + `agent` pattern delegates enforcement to the runtime using a mechanism Claude Code already supports. Adding a custom hook to replicate what the platform provides natively is unnecessary complexity.

**Keep both modes inline in workflow-planner** — Continue embedding planning and verification process in the agent definition, accepting the token overhead as the cost of simplicity. Rejected because the overhead is not fixed — it grows with each mode's process complexity, and the two modes are already independently complex enough that full-context loading on single-mode invocations is a meaningful cost. The exclusion in ADR-0002 was a pragmatic default, not a permanent constraint.

---

## Related Decisions

- **ADR-0002: SME Agents as Pure Domain Experts** — Established the process-in-skills principle and the exclusion for execution utilities that this ADR partially reverses. The core principle is unchanged; this ADR narrows the scope of the exclusion for agents whose modes are sufficiently independent to warrant extraction.
