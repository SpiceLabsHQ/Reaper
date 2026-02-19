# ADR-0002: SME Agents as Pure Domain Experts

**Date**: 2026-02-18
**Status**: Accepted

---

## Context

As Reaper's agent roster grew, individual agents accumulated two kinds of content: domain expertise (what a security engineer knows, what a database architect cares about) and process logic (step-by-step workflows, quality gate criteria, output format contracts). This mixing created compounding problems:

1. **Agents became bloated** — domain knowledge and process steps interleaved, making files large and hard to reason about independently.

2. **Process changes required agent changes** — when a workflow evolved, every affected agent needed modification even if its domain expertise was unchanged. Orthogonal concerns were artificially coupled.

3. **Process logic wasn't portable** — workflow steps buried in agent prompts couldn't be shared with other agents or invoked by non-Reaper tooling.

ADR-0001 demonstrated the pattern in practice: the `code-review` skill defines review *process*, while SME agents (security-auditor, database-architect, etc.) bring domain judgment. This ADR establishes that pattern as a first-class architectural principle governing all future SME agent development.

---

## Scope

This ADR applies to **SME agents** — Reaper's domain expert agents that bring specialist judgment to design sessions, code reviews, and advisory tasks.

**Litmus test**: An SME agent's definition is process-agnostic. It describes how the agent *thinks*, not what it should *do* in a given task. If an agent's system prompt would be equally valid across any workflow or task type it might be deployed in, it qualifies as an SME agent.

**In scope:**

| Category | Agents |
|----------|--------|
| Planning & Architecture | api-designer, cloud-architect, database-architect, event-architect, observability-architect, frontend-architect, data-engineer, test-strategist, compliance-architect |
| Quality & Review | security-auditor, code-reviewer, performance-engineer |
| Operations & Integration | deployment-engineer, integration-engineer |
| Craft | technical-writer, claude-agent-architect, ai-prompt-engineer |

**Not in scope:** Coding agents (bug-fixer, feature-developer, refactoring-dev) and execution utilities (branch-manager, test-runner, workflow-planner, incident-responder) legitimately embed process in their definitions because execution *is* their function. This ADR does not govern them.

---

## Decision

**SME agents are pure domain experts. Process is not their concern.**

### What SME agents contain

An SME agent's system prompt has three structural sections:

- **Domain Identity** — who this expert is and what specialty they bring. The conceptual framework and vocabulary the agent uses to reason within its discipline.
- **Evaluation Lens** — what the agent examines and how it measures quality. The heuristics and judgment criteria that distinguish expert analysis from generic review.
- **Value Hierarchy** — which qualities win when they conflict. The guiding principles that orient every decision the agent makes when trade-offs arise.

**Response posture belongs here.** How an expert communicates — leading with the highest-severity finding, stating confidence levels explicitly, framing recommendations in domain terms — is domain expertise. Response posture governs what the expert *emphasizes and how it frames judgment*. The *serialization format* of that judgment (JSON keys, markdown templates, required fields) is an output contract and belongs in the skill.

**Stable expertise is preferred.** Version-specific knowledge (current CVEs, specific tool versions, library APIs) should not be hardcoded in agent definitions — it goes stale. The model's own knowledge handles current information; skills and injected context handle task-specific details.

### What SME agents do not contain

- Step-by-step workflow instructions — what to do, in what order, for a given task
- Quality gate logic or pass/fail criteria
- Output format requirements, JSON schemas, or structured contracts
- Tool invocation sequences
- Task-scoped pre-work validation (input checking that varies by workflow)

These belong in skills.

**The test for authors:** If you are writing a sentence that describes what the agent should do *for a specific task type or workflow* — whether it reads as a sequence of steps or a single conditional rule — that sentence belongs in a skill, not in the agent's definition.

### How process is delivered

Commands invoke SME agents and supply a skill reference in the prompt payload:

```
"Use the reaper:code-review skill to review this changeset. PLAN_CONTEXT: ..."
```

The agent applies its domain expertise while following the skill's process instructions. The skill defines *how*; the agent provides the *judgment*. An SME agent invoked without a skill will apply its domain expertise to whatever task the prompt describes — but process steps and output contracts must be supplied by the invoking command.

This separation means a command can pair any SME agent with any skill the invoking command supplies. Skills can also be invoked by agents outside Reaper, enabling third-party agents to execute Reaper's review, audit, or planning processes against domains Reaper doesn't natively cover.

---

## Compliance

A new or modified SME agent file should answer **no** to all of the following:

- [ ] Does it contain step-by-step instructions for how to execute a specific type of task?
- [ ] Does it specify tool invocation sequences (run X, then check Y, handle Z)?
- [ ] Does it define output schemas or structured format contracts?
- [ ] Does it contain pass/fail logic for a quality gate?
- [ ] Does it include process that would need to change if the invoking workflow changed?
- [ ] Does it hardcode version-specific knowledge (specific CVEs, tool versions, library APIs) that will go stale?

If any answer is yes, the flagged content belongs in a skill or command, not in the agent definition.

---

## Consequences

**Positive:**
- Domain expertise and process logic evolve independently — changing a workflow doesn't touch agent definitions
- The same skill can be invoked by multiple agents or commands without duplication
- Non-Reaper agents can participate in Reaper's quality gates by following a skill's process documentation
- SME agents are smaller, more stable, and easier to audit — their content is bounded to what a domain expert actually knows
- Token efficiency improves: agents carry domain context, not redundant process steps they'd receive from the skill anyway

**Negative / Risks:**
- Two artifacts must be maintained instead of one — an SME agent without a pairing skill is incomplete for process-dependent tasks
- The coupling is implicit: the skill name lives in the invoking command's prompt, not in the agent file itself. Discoverability requires reading the command that orchestrates the pair
- Output contract enforcement shifts entirely to the skill — fragmentation risk if a third-party agent ignores the contract

---

## Alternatives Considered

**Fat agents (status quo)** — embed both expertise and process inline. Simpler to discover (one file, complete picture), but orthogonal concerns are coupled. Process changes ripple through the agent roster. Rejected.

**Pure skills only (no SME agents)** — encode all logic in skills, replace SME agents with generic workers. Loses the domain judgment that makes SME review valuable. A generic agent following a security audit skill produces weaker findings than a security-auditor applying that same skill. Rejected.

**Shared partials/includes** — extract process into EJS partials included at build time. Centralizes process at build time but couples agents to review concerns at the template level. Rejected in favor of the runtime skill boundary, which is portable beyond Reaper's build system.
