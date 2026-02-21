# ADR-0017: Workflow-Planner Task Dispatch

**Date**: 2026-02-20
**Status**: Accepted

---

## Context

### The Skill Tool Injection Model

Claude Code's Skill tool loads a skill's content inline into the current agent's context. When a command invokes a skill via the Skill tool, the skill's instructions become part of the invoking agent's prompt -- they do not create a separate execution context. The invoking agent (typically the orchestrator running `flight-plan` or `takeoff`) absorbs the skill content and executes it directly.

### The context: fork and agent Frontmatter Assumption

ADR-0015 established a pattern where workflow-planner's extracted skills (`reaper:workflow-planner-planning` and `reaper:workflow-planner-verification`) declared `context: fork` and `agent: reaper:workflow-planner` in their frontmatter. The intent was that Claude Code would read these fields and automatically:

1. Fork a new execution context (rather than injecting inline)
2. Use `reaper:workflow-planner` as the agent for that forked context

This would have given the skills true isolation -- their own agent identity, their own context window, and the ability to be resumed via `Task --resume`.

However, Claude Code does not support `context: fork` or the `agent` frontmatter field on skills. These fields are silently ignored by the runtime. When a command invokes `reaper:workflow-planner-planning` via the Skill tool, the skill content is injected inline into the command's own context. The workflow-planner agent definition is never loaded. The planning instructions execute within the orchestrator's context, competing for token space with the orchestrator's own instructions, conversation history, and state.

### Consequences of Inline Injection

The practical effects of this silent failure were:

- **No agent isolation**: Planning and verification logic ran inside the orchestrator (flight-plan or takeoff), not inside a workflow-planner agent context. The workflow-planner agent definition -- its heuristics, judgment criteria, and domain knowledge -- was never loaded.
- **No resume capability**: Because the Skill tool does not create a separate agent session, there is no `agent_id` to capture and no session to resume. Each skill invocation is a one-shot injection into the parent context.
- **Context pressure on the orchestrator**: The orchestrator's context absorbed the full skill content on every invocation. For takeoff, which already manages strategy execution, work unit cycling, quality gates, and branch-manager sessions, the additional planning or verification content increased context pressure without providing a separate window for the work.
- **False documentation**: ADR-0015's Decision 2 described a capability that did not function as specified. Commands were written to rely on "fork-and-agent frontmatter handles agent selection automatically" -- a mechanism that was inert.

---

## Decision

Dispatch `reaper:workflow-planner` as a Task subagent rather than invoking its skills inline via the Skill tool from orchestrating commands.

### The Pattern

When `flight-plan` or `takeoff` needs planning or verification, the command dispatches `reaper:workflow-planner` using the Task tool:

```bash
Task --subagent_type reaper:workflow-planner \
  --prompt "MODE: planning
  TASK_ID: $TASK_ID
  CONTEXT: [implementation context]"
```

The workflow-planner agent, now running in its own Task context, internally uses the Skill tool to load its mode-specific skills (`reaper:workflow-planner-planning` or `reaper:workflow-planner-verification`). In this arrangement:

- The Skill tool's inline injection behavior is correct and intended -- the skill injects into the workflow-planner's context, which is exactly where it belongs
- The workflow-planner agent definition is loaded, providing its heuristics and domain knowledge as the base context
- The Task tool provides true isolation: a separate context window, a separate agent identity, and a capturable `agent_id`

### Resume Enablement

The Task tool returns an `agent_id` that can be captured and stored. If a planning result requires revision (e.g., work packages exceed size limits), the orchestrator can resume the existing session:

```bash
Task --resume $PLANNER_SESSION_ID \
  --prompt "Work packages exceed size limits. Split oversized units..."
```

This follows the same resume pattern already established for `reaper:branch-manager` sessions in takeoff, reducing retry cost from full redeployment (~3,000 tokens) to a continuation prompt (50-100 tokens).

---

## Consequences

**Positive:**

- Workflow-planner runs with its own agent definition loaded. Planning heuristics, judgment criteria, and domain knowledge are available as intended by the agent design, rather than absent due to silent frontmatter failure.
- True context isolation. Planning and verification work happens in a separate context window, not competing with the orchestrator's instructions and state for token space.
- Resume capability. The orchestrator can resume a planner session for iterative refinement (splitting oversized packages, incorporating user feedback) without redeploying the full agent context.
- Consistent dispatch model. Workflow-planner is dispatched the same way as branch-manager, test-runner, and coding agents -- via the Task tool. The Skill tool is used for what it actually does (inline content injection within an agent's own context), not for what it was hoped to do (forking execution).
- ADR-0015's skill extraction remains valid. The skills themselves are unchanged; only the invocation mechanism changes. Skills inject into workflow-planner's context (correct) rather than into the orchestrator's context (incorrect).

**Negative / Risks:**

- Task dispatch has higher baseline cost than Skill injection. Each Task invocation creates a new agent context with its own system prompt overhead. For simple planning tasks that could have been handled inline, the isolation overhead may exceed the benefit.
- Two-hop indirection. The orchestrator dispatches workflow-planner via Task, which then loads a skill via the Skill tool. This is one more layer of indirection than the (intended but non-functional) single-hop skill invocation. Debugging failures requires tracing through both layers.
- ADR-0015 Decision 2 is superseded. The `context: fork` + `agent` frontmatter pattern described in ADR-0015 does not function in Claude Code. Any other skills that adopted this pattern based on ADR-0015's guidance are also affected and must be migrated to Task dispatch or accept inline injection.

---

## Alternatives Considered

**Continue using Skill tool with inline injection (status quo)** -- Accept that skills inject inline and do not fork. The orchestrator absorbs the planning/verification content and executes it directly. Rejected because the workflow-planner agent definition is never loaded in this model. The skills were designed to run within workflow-planner's context -- its heuristics and judgment criteria are the foundation the skill instructions build on. Inline injection into the orchestrator skips that foundation entirely.

**Fix context: fork and agent frontmatter in Claude Code** -- Request or implement support for these frontmatter fields so that ADR-0015's original design functions as intended. Rejected as a dependency on platform changes outside Reaper's control. The feature may never be implemented, may be implemented differently than assumed, or may take an indeterminate amount of time. Task dispatch achieves the same isolation using a mechanism that exists and works today.

**Embed planning/verification logic directly in commands** -- Remove the skill indirection entirely and place planning and verification instructions inline in flight-plan and takeoff. Rejected because this reverses ADR-0015's extraction, re-coupling mode-specific process to the orchestrating command. It also eliminates the possibility of running planning logic in a separate agent context, since commands do not have agent identities.

---

## Related Decisions

- **ADR-0015: Workflow-Planner Process Extraction** -- Extracted planning and verification modes into discrete skills. This ADR supersedes ADR-0015's Decision 2 (executor-prescribing skills via `context: fork` + `agent` frontmatter) while preserving Decision 1 (the extraction itself). The skills remain; their invocation mechanism changes.
- **ADR-0002: SME Agents as Pure Domain Experts** -- Established process-in-skills principle. Task dispatch ensures the agent's domain knowledge is actually loaded when its skills execute, fulfilling the intent of the agent/skill separation.
