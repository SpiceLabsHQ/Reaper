# ADR-0026: Subagent Memory and Role-Based Storage Policy

**Date**: 2026-05-02
**Status**: Accepted

---

## Context

The Claude Agent SDK exposes a per-subagent memory store via the `memory:` frontmatter field on agent definitions. The field accepts three values — `user`, `project`, `local` — each mapping to a distinct on-disk location. When set, Claude Code automatically augments the agent's system prompt with read/write instructions, injects the first 200 lines or 25KB of a `MEMORY.md` file from the memory directory, and silently auto-enables the `Read`, `Write`, and `Edit` tools so the agent can manage its own memory files.

The SPC-33 spike ([`docs/research/spc-33-memory-frontmatter-spike.md`](../research/spc-33-memory-frontmatter-spike.md)) confirmed empirically that the markdown-frontmatter `memory:` key is honored on the plugin-agent code path Reaper uses. It is not in the plugin exclusion list (alongside `hooks`, `mcpServers`, and `permissionMode`), and Reaper's EJS build pipeline passes the field through unchanged. No alternative wiring mechanism is required.

The spike resolved the _can we_ question. This ADR resolves the _should we, and how_ question. Without policy, three failure modes were likely:

1. **Underuse.** Memory is opt-in per-agent. If left to ad-hoc adoption, most agents would never gain memory and the population would be inconsistent — some agents accumulating learnings, most not — making downstream tooling (memory inspection, curation, cross-agent comparison) harder to build.
2. **Noise pollution.** Memory persists across sessions. Without explicit guidance on _what_ to record, agents will write conversation-specific noise, duplicate `CLAUDE.md` content, or store transient task state. A noisy memory store actively regresses future-session quality, the opposite of the feature's intent.
3. **Storage-scope drift.** The three scopes (`user`, `project`, `local`) have meaningfully different semantics — user-global vs project-shared vs project-local-only. Per-agent freelancing on scope choice would produce a population where some agents share knowledge across machines, others share via version control, and others stay local — with no coherent rationale.

Reaper has 24 first-party agents spanning planning, development, quality, ops, and craft. A uniform policy applied across the population is cheaper to maintain and easier to reason about than 24 independent decisions.

---

## Decision

### 1. Enable `memory: project` on all 24 Reaper agents

Every Reaper-shipped agent declares `memory: project` in its frontmatter. The project scope (`.claude/agent-memory/<agent-name>/`) was chosen over `local` and `user` for three reasons:

- **Shareable via version control.** Project scope writes under `.claude/agent-memory/`, which is a normal repo path. A team that adopts Reaper gets shared agent memory the same way they share any other project artifact — by committing it. Local scope (`.claude/agent-memory-local/`) is conventionally `.gitignore`d and would silo learnings per developer.
- **Project-bounded knowledge.** Reaper agents specialize per-project (a bug-fixer learns _this_ codebase's recurring null-pointer trap, an architect learns _this_ repo's deployment quirks). User scope (`~/.claude/agent-memory/`) would mix learnings across unrelated projects, surfacing irrelevant patterns and diluting signal. The knowledge profile of every Reaper agent argues for project boundaries.
- **No secrets-adjacent content.** None of the role-specific memory guidance (see Decision 2) instructs an agent to record credentials, environment-specific paths, or anything that would be unsafe to commit. The `local` scope's primary advantage — keeping memory out of the repo — has no use case in this rollout.

The original SPC-42 description proposed `memory: local`. The implementation deliberately diverges to `project` based on the SPC-33 spike's recommendation and the shareable-by-default reasoning above. Projects that want to opt out of committing agent memory can `.gitignore` `.claude/agent-memory/` without changing any agent frontmatter.

### 2. Single shared `memory-guidance` partial with seven role values

A single EJS partial — [`src/partials/memory-guidance.ejs`](../../src/partials/memory-guidance.ejs) — emits the entire "Subagent Memory" section every agent renders. The partial is parameterized by a single `role` value drawn from a fixed enumeration of seven roles:

`implementer | architect | planner | reviewer | craft | ops | executor`

Each role tailors the _what to write_ bullets to that role's knowledge profile. The _what NOT to write_, _when to write_, and _when to read_ sections are role-independent — they are the same five paragraphs for every agent — and live in the partial's shared tail.

The partial loud-fails on missing or unrecognized `role`: it emits a visible error directive into the rendered agent prompt naming the offending include site, rather than silently rendering an empty section. This makes role-misconfiguration impossible to ship unnoticed; the build produces a flagged agent that any downstream review will catch.

### 3. Future agents must include the partial with a chosen role

Any new Reaper agent added to `src/agents/` MUST:

1. Declare `memory: project` in its frontmatter (or document an explicit reason in the agent file for choosing `user` or `local`).
2. Include the memory-guidance partial with a role parameter:
   ```ejs
   <%- include('partials/memory-guidance', { role: '<role>' }) %>
   ```
3. Choose the role from the seven values listed above. If the new agent's knowledge profile does not fit any existing role, the _partial_ must be extended with a new role value first — agents do not get to define inline guidance.

This rule keeps the population uniform. Every Reaper agent reaches the same state regardless of when it was authored, and downstream tooling can rely on a single partial as the canonical memory-guidance surface.

---

## Role Taxonomy

Final mapping after the SPC-32 rollout (work units SPC-35 through SPC-40):

| Role          | Agents                                                                                                                                                                | Knowledge profile                                                                                                                                    |
| :------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------- |
| `implementer` | bug-fixer, feature-developer, refactoring-dev                                                                                                                         | Recurring root-cause classes, debugging traps, validated fix shapes, project-specific test patterns                                                  |
| `architect`   | api-designer, cloud-architect, database-architect, event-architect, observability-architect, frontend-architect, data-engineer, test-strategist, compliance-architect | Trade-off decisions and the constraints that drove them, conventions for future architects, rejected dead-ends, non-obvious system couplings         |
| `planner`     | workflow-planner                                                                                                                                                      | Decomposition heuristics that worked on this codebase, recurring risk patterns, parallelization signals, estimation corrections, scope-creep traps   |
| `reviewer`    | principal-engineer, security-auditor, performance-engineer                                                                                                            | Codebase-specific tooling false positives, accepted code smells with rationale, mitigations already in place, prior reviewer corrections             |
| `craft`       | ai-prompt-engineer, claude-agent-architect, technical-writer                                                                                                          | Prompt anti-patterns the repo keeps re-introducing, doc style decisions, token-waste patterns, house conventions for examples                        |
| `ops`         | deployment-engineer, integration-engineer, incident-responder                                                                                                         | Recurring incident root causes, production quirks, validated runbook steps not yet in on-call docs, deployment failure modes, monitoring blind spots |
| `executor`    | test-runner, branch-manager                                                                                                                                           | Usually nothing — flag back only on recurring orchestrator misuse patterns that cost cycles to clean up                                              |

Total: 3 + 9 + 1 + 3 + 3 + 3 + 2 = 24 agents. Every Reaper-shipped agent appears in exactly one row.

---

## Consequences

**Positive**

- **Uniform population.** Every Reaper agent gains memory in the same release, with role-correct guidance. Downstream tooling (memory inspection, audit, cross-agent comparison) can assume the field is set on every agent rather than handling a heterogeneous population.
- **One place to maintain guidance.** The seven role variants live in a single partial. Updating _what implementers should record_ changes one file and propagates to bug-fixer, feature-developer, and refactoring-dev on the next build. Inline per-agent guidance would have required 24 parallel edits for any policy change.
- **Pit-of-success defaults.** New contributors adding agents to Reaper inherit the policy by following the partial-include convention. They do not need to relitigate scope choice or guidance content; the policy is already encoded.
- **Auditable role mapping.** The Role Taxonomy table is a checked-in artifact. Anyone reviewing whether a new agent has been wired correctly checks one ADR plus one `grep` of the partial includes.

**Trade-offs**

- **Per-role bullets must stay current.** The role-specific _what to write_ bullets reference real codebase patterns ("EJS partials silently swallow undefined locals," "agents never edit `agents/`, only `src/agents/`"). As Reaper evolves, these examples can drift from reality. The partial is small enough that targeted edits are cheap, but the maintenance cost is real and recurring.
- **Token cost per agent.** The shared partial adds roughly 50 to 100 lines to every agent prompt. Across 24 agents this is a meaningful cumulative system-prompt footprint. The cost is amortized against the value of cross-session learning; if memory turns out to underdeliver in practice, the partial can shrink to bullet skeletons and rely on Claude Code's auto-injected guidance.
- **Tool-surface side effect.** Setting `memory:` on an agent auto-enables `Read`, `Write`, and `Edit` at the SDK level. For this rollout, no agent's _effective_ tool surface was broadened: every agent either had no `tools:` allowlist (default = full inherit, so the auto-enable was a no-op) or already listed `Read`, `Write`, and `Edit` explicitly. Future restrictive-allowlist agents (e.g., a hypothetical review-only agent listing `Read, Grep, Glob`) would silently gain `Write` and `Edit` if they adopt the policy. Such agents must either accept the broadened surface or be excluded from the memory rollout — the auto-enable cannot be overridden from frontmatter.
- **`MEMORY.md` curation responsibility.** Claude Code injects only the first 200 lines or 25KB of `MEMORY.md`. Agents that accumulate without curation will overflow the cap and silently truncate. The partial's _when to write_ guidance leans hard against noisy writes precisely to make curation unnecessary in practice, but the cap is a real constraint.

---

## Alternatives Considered

**Per-role partials.** One partial per role (`memory-guidance-implementer.ejs`, `memory-guidance-architect.ejs`, …). Rejected because the role-independent tail (_what NOT to write_, _when to write_, _when to read_) is identical across all seven roles. Splitting the partial would either duplicate that tail seven times — a copy-paste rot risk — or introduce a second shared partial that the role partials all include, which is structurally more complex than a single parameterized file. The single-partial approach keeps role-shared and role-specific content in one place where they can be reviewed together.

**Inline per-agent guidance.** Each agent writes its own _what to record_ bullets directly in its prompt. Rejected because there is no shared baseline to enforce, no single place to update policy, and copy-paste rot is the inevitable steady state. The same role-shared tail (_what NOT to write_, etc.) would either be duplicated 24 times or absent from most agents. Reaper's existing partial discipline (see [ADR-0005](0005-ejs-template-build-system.md) and the shared partials in `src/partials/`) made the partial-include path the obvious choice.

**Memory only on planning and architect agents.** Limit the rollout to agents whose work explicitly involves cross-session knowledge accumulation — workflow-planner, architects, principal-engineer — and leave coding, ops, and executor agents memory-less. Rejected because the population becomes uneven: downstream tooling has to special-case which agents have memory, and the agents that _do_ have memory are unable to record patterns they observe in cooperation with the agents that don't. The cost of enabling memory on a low-write-frequency agent (test-runner, branch-manager) is small — the executor role explicitly instructs them to write rarely or never — and the consistency benefit is real.

---

## Cross-references

- **SDK contract:**
  - [Subagents in the SDK — code.claude.com](https://code.claude.com/docs/en/agent-sdk/subagents) — `memory: 'user' | 'project' | 'local'` field on `AgentDefinition`.
  - [Create custom subagents — code.claude.com](https://code.claude.com/docs/en/sub-agents) — markdown frontmatter loader, scope-to-filesystem mapping, `MEMORY.md` injection behavior, and auto-enabled `Read`/`Write`/`Edit` tools.
  - [Using agent memory — platform.claude.com](https://platform.claude.com/docs/en/managed-agents/memory) — distinct API-level Managed Agents memory product, intentionally not used here.
- **Empirical basis:** [`docs/research/spc-33-memory-frontmatter-spike.md`](../research/spc-33-memory-frontmatter-spike.md) — the WU1 spike that confirmed Reaper's plugin-agent loader honors the `memory:` frontmatter field and that the EJS build passes it through unchanged.
- **Implementation:** [`src/partials/memory-guidance.ejs`](../../src/partials/memory-guidance.ejs) — the shared partial enforcing the role taxonomy, with loud-fail behavior on invalid role.
- **Linear work units:**
  - SPC-32 (parent) — enable subagent memory across Reaper agents.
  - SPC-33 (WU1) — frontmatter spike.
  - SPC-34 (WU2) — author the memory-guidance partial.
  - SPC-35 (WU3) — wire implementer into coding agents.
  - SPC-36 (WU4) — wire planner + architect into batch A.
  - SPC-37 (WU5) — wire architect into batch B.
  - SPC-38 (WU6) — wire reviewer + craft into specialty agents.
  - SPC-39 (WU7) — wire ops + craft into ops/writer agents.
  - SPC-40 (WU8) — wire executor into test-runner + branch-manager.
  - SPC-42 (WU3.7) — this ADR.
  - SPC-41 (WU9) — propagation into `CLAUDE.md`, `docs/agents.md`, and `README.md` will reference this ADR as the policy source.

---

## Related Decisions

- **ADR-0005: EJS Template Build System** — The single-partial pattern adopted here follows the same EJS partial discipline this ADR established. Role-parameterized includes are the standard mechanism for shared content in Reaper agent prompts.
- **ADR-0012: Agent Context Self-Service** — Subagent memory is a self-service mechanism: agents read and write their own memory directory rather than receiving knowledge through pre-injected prompts. This ADR extends the self-service principle from one-shot config reads to durable cross-session learning.
