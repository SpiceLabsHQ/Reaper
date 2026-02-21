# ADR-0016: Tier-Based Agent Design Standard

**Date**: 2026-02-20
**Status**: Accepted

---

## Context

### The Cargo-Culting Problem

As Reaper's agent roster grew, structural elements — decision tables, EXIT conditions, mode-switching protocols — began appearing in agents that did not need them. The cause was not malice but imitation: a developer authoring a new agent sees these constructs in existing agents, assumes they are required, and copies them. The result is agents burdened with scaffolding they never exercise.

This pattern is hard to catch in review because the copied structures are syntactically correct. The agent still works; it just carries unused instructions that dilute the signal of the ones that matter.

### The Classification Vacuum

Without a documented standard, "how much structure does this agent need?" was answered by intuition. Two common failure modes emerged:

1. **Over-structuring simple agents**: Single-purpose agents received mode-selection tables and per-mode EXIT conditions that referenced modes which did not exist. The table was there because the author had seen it elsewhere.

2. **Under-structuring complex agents**: Multi-mode agents described their mode selection in prose, which is ambiguous and drifts under token pressure. The author knew the agent was complex but had no specification for what structure complex agents require.

Neither failure was caught mechanically. Correctness required a reviewer to hold both the structural requirements and the agent's actual behavior in mind simultaneously and notice the mismatch.

### What Determines Structural Need

The squadron analysis produced a key insight: the complexity that drives structural requirements is not what an agent *does* but how many distinct output *contracts* it must honor. An agent that produces sophisticated analysis but always produces the same kind of output — same processing flow, same output schema — has one contract. An agent that changes its processing logic and output format based on invocation context has multiple contracts.

Contract count is observable from the agent source without subjective judgment. It can be grepped. It cannot be argued away by appeals to the agent's sophistication or perceived importance.

---

## Decision

Structural requirements for Reaper agents are determined by **mode count**: the number of distinct operational modes the agent supports, where each mode has a materially different processing logic or output contract.

Three tiers are defined:

**Tier 1 — Single-Mode Agents (Specialists)**
Criterion: exactly one operational mode. Structural requirement: lightweight. Identity, task description, and output format are sufficient. No mode-selection table, no per-mode EXIT conditions, no mode-switching protocol.

**Tier 2 — Dual-Mode Agents (Context-Sensitive Workers)**
Criterion: exactly two operational modes. Structural requirement: full Tier 2 checklist — a mode-selection table with unambiguous Signal column, explicit EXIT conditions per mode, anti-pattern entries with Detection Signal and Fix columns, prescribed section ordering (identity → scope → mode table → per-mode process → output → constraints), and shared sections with three or more occurrences extracted to partials.

**Tier 3 — Multi-Mode Agents (Orchestrators)**
Criterion: three or more distinct operational modes. Structural requirement: all Tier 2 requirements, plus a dedicated mode-switching protocol section that appears before all behavioral rules.

The full structural requirements, checklists, and annotated agent skeletons are specified in `docs/AGENT_DESIGN_STANDARD.md`, which is the authoritative implementation reference for `reaper:claude-agent-architect` and `reaper:ai-prompt-engineer`.

---

## Consequences

**Positive:**

- Classification is mechanical. Counting operational modes does not require judgment about importance or complexity. Any reviewer can apply the rule without calibration.
- Cargo-culting is eliminated by derivation. If the tier is derivable from mode count, structural elements that do not match the tier are visibly wrong — not just stylistically inconsistent.
- Structural drift is catchable at gate time. `reaper:ai-prompt-engineer` enforces the Tier 2 hard checklist during prompt review. Violations are blocking.
- Tier 1 agents are protected from accretion. The explicit standard creates a named, defensible objection when someone proposes adding Tier 2 structure to a single-mode agent.

**Negative / Risks:**

- Mode count requires correct identification of what constitutes an "operational mode." The boundary between input-type variation (which does not change tier) and genuine mode change (which does) requires judgment. The standard provides the decision rule — does the output contract change, or only the inputs? — but edge cases will arise.
- The standard adds an enforcement obligation. `reaper:ai-prompt-engineer` must be run after every agent modification, and the Tier 2 checklist must be kept current as structural requirements evolve. Letting the checklist drift from actual expectations defeats the purpose of the standard.

**Open Question — Gate Mode Architecture:**

The standard defines gate mode behavior per tier (Tier 1 embeds criteria inline; Tier 2 and Tier 3 receive criteria via skill injection). The underlying architectural question — when should a Tier 1 agent embed gate criteria versus receive them through external injection — is more general than this ADR's scope. That question is tracked as a separate concern in reaper-3w4s.

---

## Alternatives Considered

**Complexity-based tiers** — Classify agents by subjective complexity (simple, moderate, complex). Rejected because complexity is not objectively measurable. Different authors would classify the same agent differently. The rule cannot be mechanically checked, which means it cannot be enforced.

**Single universal template** — All agents use Tier 2 or Tier 3 structure regardless of mode count. Rejected because this universalizes overhead. A single-purpose agent with one flow has no use for a mode-selection table. Forcing the structure adds token cost and makes the agent's actual instructions harder to locate amid structural scaffolding it never exercises.

**No standard (status quo)** — Continue relying on author judgment and reviewer intuition. Rejected because the cargo-culting problem is already observable in the existing agent roster. The cost of the status quo is inconsistency and structural drift; the cost of a standard is the enforcement obligation. The standard is worth the obligation.

---

## Related Decisions

- **ADR-0002: SME Agents as Pure Domain Experts** — Established the process-in-skills principle. The tier standard extends that reasoning: structure, like process, should be proportional to need, not copied from neighboring agents.
- **ADR-0015: Workflow-Planner Process Extraction** — The first application of the tier framework to a specific agent refactoring. `workflow-planner`'s two independent modes (planning and verification) drove the recognition that mode count, not perceived complexity, is the correct structural classifier.
