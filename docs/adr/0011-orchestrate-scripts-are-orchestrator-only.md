# ADR-0011: Orchestrate Scripts Are Orchestrator-Only

**Date**: 2026-02-19
**Status**: Accepted

---

## Context

Reaper's agent templates define `Stop` hooks in their frontmatter. When a subagent finishes, Claude Code fires these hooks and injects the output into the calling context — the orchestrator (`takeoff`). The scripts follow a consistent naming convention: `scripts/orchestrate-*.sh`, one per agent class (coding agents, gate agents, branch-manager, ops agents).

Because these scripts fire on `Stop`, their output is structurally invisible to the subagent that triggered them. The subagent has already completed when the hook runs. Only the orchestrator receives the output.

Without a documented contract for what these scripts may contain, two failure modes become possible:

1. **Scope creep.** A contributor adds diagnostic output, debugging context, or agent-facing instructions to a script on the assumption that "more information is better." The orchestrator receives noise that adds no decision value, and the script's purpose becomes ambiguous.

2. **Misuse as an agent communication channel.** Someone assumes the output is visible to the subagent and writes content intended for the agent rather than the orchestrator. The content is silently ignored — the agent never sees it — but the script now contains misleading text that does not serve its actual audience.

---

## Decision

`scripts/orchestrate-*.sh` scripts are exclusively an orchestrator communication channel. Their sole purpose is to provide the orchestrator with next-step instructions after a subagent completes.

### What these scripts may contain

- Which agent class to deploy next (e.g., "deploy test-runner")
- Gate decision logic (e.g., "if gate_status = PASS, proceed; if FAIL, return to coding agent")
- Pipeline-terminal signals (e.g., "this agent is terminal — do not re-enter gates")
- Cleanup or bookkeeping steps the orchestrator must perform (e.g., worktree removal, ticket closure)
- Escalation conditions and iteration limits

### What these scripts must not contain

- Instructions or prompts addressed to the subagent (the subagent cannot see this output)
- Debugging context, diagnostic information, or logging intended for developers
- State that the orchestrator already holds (the orchestrator's context is richer than a shell script can replicate)
- Speculative guidance for scenarios the script's agent class does not produce

### Content discipline

Scripts must be minimal. Each script should say exactly what the orchestrator needs to know to proceed — no more. The test: if a line of output does not change the orchestrator's next action, it should not be in the script.

---

## Consequences

**Positive:**
- The purpose of each script is unambiguous: orchestration instructions for takeoff, nothing else
- Contributors cannot accidentally write agent-facing content into scripts that agents will never read
- Minimal scripts are easier to audit and maintain; their behavior is apparent at a glance
- The orchestrator receives a focused signal rather than a stream it must filter

**Negative / Risks:**
- The constraint is enforced by convention, not by tooling; a contributor unfamiliar with the hook lifecycle could still add non-orchestration content without immediate breakage
- Legitimate needs for richer orchestrator context (e.g., agent-class-specific state passing) must find a different mechanism — these scripts are not the right vehicle

---

## Alternatives Considered

**General-purpose hook output** — Scripts could contain anything useful: agent hints, debugging state, development notes. Rejected because the audience is strictly the orchestrator. Content not addressed to the orchestrator does not belong in these scripts, regardless of how useful it might seem in isolation.

**Richer state passing via scripts** — Scripts could serialize agent-class-specific state for the orchestrator to consume. Rejected because the orchestrator's primary signal comes from the structured JSON returned by the agent itself (ADR-0009). Shell scripts are not the right mechanism for structured state — that belongs in the agent output contract. Scripts remain instruction-only.

**No scripts — inline orchestration logic** — Move next-step instructions directly into the takeoff command template. Rejected because the `Stop` hook mechanism is the right architectural seam for post-agent orchestration. Inlining everything into takeoff couples the command to every agent's post-completion logic and makes the template harder to maintain.
