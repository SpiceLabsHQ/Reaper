# ADR-0001: Code Review Skill with SME Routing

**Date**: 2026-02-18
**Status**: Accepted

---

## Context

Reaper's takeoff command enforces a mandatory code review quality gate (Gate 2) using a dedicated `code-reviewer` agent. This agent accumulated two problems:

1. **Missing plan context**: `PLAN_CONTEXT` was documented as a required input but takeoff passed only a task ID, leaving the agent to self-fetch context. Agents that self-serve context hallucinate scope.

2. **Dead context**: The agent loaded all 9 work-type criteria profiles on every invocation, paying for 8 profiles that would never be used. This is a prompt anti-pattern — token overhead with no quality benefit.

A deeper structural concern: a generic reviewer assessing specialist work (a database-architect's migration, an AI engineer's agent prompt) produces weaker findings than a domain expert applying a shared review process to their own area.

---

## Decision

We retire the dedicated `code-reviewer` agent and replace it with:

1. **A multi-file `code-review` skill** (`src/skills/code-review/`) that defines review *process*, not domain knowledge:
   - `SKILL.md` — universal gate protocol: plan completion check, scope creep detection, blocking issue format, and the JSON output contract
   - Work-type specialty files — additional process steps unique to that artifact type (see below)

2. **SME routing in the gate profile table** — the existing work-type lookup table gains a `reviewer_agent` column mapping each work type to a recommended Reaper agent. Takeoff performs a static lookup at dispatch time; no LLM reasoning in the critical path.

3. **Open agent roster** — the recommended agents are defaults, not constraints. Takeoff may select any available agent (including third-party agents) when the default is unavailable or when the agent's tool description is a better match. Any agent that can follow the skill's process documentation is a valid reviewer.

4. **Fresh invocations only** — the reviewing agent is always a new Task call, never resumed from the coding agent session. Self-review produces confirmation bias regardless of agent type.

5. **Plan materialization by takeoff** — before dispatching a reviewer, takeoff reads the plan file content (or fetches the issue body via the platform skill) and injects it directly into the reviewer's task prompt.

### Work-Type Specialty Files (MVP)

The skill's `SKILL.md` covers the universal review process. Specialty files add process steps for work types where the universal flow is insufficient:

| File | Work Type | Additional Process |
|------|-----------|-------------------|
| `application-code.md` | `application_code`, `test_code` | Verify test coverage was written (not run), SOLID checklist, obvious runtime correctness |
| `agent-prompt.md` | `agent_prompt` | Anti-pattern checklist (dead context, persona conflict, vague instructions), output format contract validation, tool list appropriateness |
| `database-migration.md` | `database_migration` | Verify rollback script exists, check idempotency, assess data impact on existing rows |
| `documentation.md` | `documentation` | Cross-reference implementation against docs (accuracy), check coverage of what was shipped |

Work types without a specialty file (`infrastructure_config`, `api_specification`, `ci_cd_pipeline`, `configuration`) use `SKILL.md` only. The reviewing SME's domain knowledge covers the gap.

### Mixed Changesets

When a changeset spans multiple work types, takeoff deploys one SME reviewer per detected work type in parallel — preserving the union semantics of the existing gate protocol. Security-auditor continues to run alongside code review in Gate 2.

### Migration

The existing `code-reviewer` agent is retained as a fallback `reviewer_agent` entry for any work type not yet covered by the SME table. It is removed once all 9 work types have a validated SME mapping.

---

## Consequences

**Positive:**
- Plan context is reliably delivered; scope hallucination is eliminated
- Token overhead drops ~60-70% per review invocation (one profile injected, not nine)
- Domain experts review their own work type — higher signal findings
- Third-party agents can participate in Gate 2 without modifying Reaper internals
- Criteria maintained in one place (skill directory) — no drift across agent definitions
- Conditional gate-mode logic can be removed from individual agent prompts

**Negative / Risks:**
- SME agents carry larger base context windows than the dedicated reviewer; retry limit drops to 1 (vs. code-reviewer's 2) to control cost
- Gate output contract (`{ gate_status, blocking_issues }`) must be enforced by the skill, not each agent — fragmentation risk with third-party agents
- Coverage gap during migration for unmapped work types
- Specialty files must stay under ~80 lines each or they dilute SME context; enforced via contract tests

---

## Alternatives Considered

**Fix the existing agent only** — Plumb PLAN_CONTEXT correctly and add dynamic profile injection to the current agent. Lower blast radius, ships faster. Rejected because it preserves the generalist-reviewing-specialist problem and doesn't open the gate to third-party agents.

**Criteria in a shared partial** — Extract the 9 profiles into `src/partials/code-review-criteria.ejs`. Keeps criteria centralized at build time but requires agents to include the partial, coupling them to review concerns. Rejected in favor of the skill boundary.
