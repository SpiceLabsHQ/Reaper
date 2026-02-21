# Agent Design Standard

> Reference document for the `claude-agent-architect` and `ai-prompt-engineer` agents. Defines the tier-based structural framework for all Reaper agents.

---

## 1. Purpose and Scope

This document codifies the tier-based subagent design framework derived from Reaper's squadron analysis. It answers one question: **how much structure does an agent need?**

Structure serves the agent. Too little structure and the agent hallucinates its own operating mode. Too much structure and token waste crowds out actual behavior. The tier system calibrates structure to need — and need is determined by a single, objective measure: the number of distinct operational modes the agent supports.

**Scope:** This standard applies to all agents authored or modified within the Reaper system (`src/agents/`). It does not govern prompts generated for target projects, which follow only general software development best practices.

---

## 2. The Anti-Cargo-Culting Rule

**Tier follows from mode count — not from perceived importance, complexity, or output sophistication.**

This is the single most important rule in the standard. Violations always manifest the same way: a developer adds Tier 2 structure (decision tables, EXIT conditions, mode routing) to a single-mode agent because the agent "feels important" or "does complex work." The result is an agent burdened with scaffolding it never uses, which dilutes the signal of the actual instructions.

| Common Cargo-Culting Mistake | Correct Approach |
|---|---|
| Adding a mode-selection table to a single-mode agent | Tier 1 has no mode table — it does one thing |
| Adding EXIT conditions for modes that don't exist | EXIT conditions are per-mode; single-mode agents have one exit path |
| Splitting a single flow into "modes" to justify more structure | If the agent genuinely has one flow, it is Tier 1 |
| Using Tier 3's mode-switching protocol for a two-mode agent | Tier 2's decision table is sufficient; no switching protocol needed |

**A Tier 1 agent that produces sophisticated output is still Tier 1.** The `security-auditor` produces a structured multi-tool scan with severity classification. It is Tier 1 because it has one operational mode: scan and report. The `branch-manager` accepts many operation types (setup, commit, merge, teardown, audit) but they all flow through the same single-executor pattern — it is also Tier 1. `workflow-planner` has two modes (planning and verification) that differ in processing logic and output contract — it is Tier 2.

---

## 3. Tier Definitions

### Tier 1 — Single-Mode Agents (Specialists)

**Criterion:** Exactly one operational mode. The agent does one thing regardless of input variation.

**Structural requirement:** Lightweight. Identity + task + output format is sufficient. No mode-selection table, no mode-routing logic, no switching protocol.

**Gate Mode behavior:** Embed gate criteria inline. Because the agent has only one mode, gate criteria are part of that mode's definition. No external skill injection is required.

**Examples:**
- `reaper:technical-writer` — generates documentation
- `reaper:security-auditor` — scans and reports security findings
- `reaper:branch-manager` — pure executor for git write operations; operation types (setup, commit, merge, teardown, audit) vary by input but share one processing flow and one output contract
- `reaper:ai-prompt-engineer` — audits, optimizes, creates, migrates, or advises on prompts

> **Note on `ai-prompt-engineer`:** This agent has five named sub-tasks (Audit, Optimize, Create, Migrate, Advise), but they share a single operational flow: validate inputs, read reference material, analyze, produce output. Sub-tasks that vary only in input type and output format are not distinct operational modes. If the agent's fundamental processing logic or output contract changes based on context — not just its inputs — it may qualify for Tier 2.

**Opt-out mechanism:** If you believe an agent warrants Tier 1 classification but it supports 2+ distinct operational modes, you must justify this in a comment in the agent source template:

```ejs
<%# TIER-JUSTIFICATION: This agent is classified Tier 1 despite having [N] input types
    because all input types follow the same processing flow and output contract.
    Mode count justification: [explain why variation is input-type, not operational-mode] %>
```

Without this justification, 2+ distinct operational modes automatically require Tier 2.

---

### Tier 2 — Dual-Mode Agents (Context-Sensitive Workers)

**Criterion:** Exactly two operational modes. The agent's processing logic, tool set, or output contract changes materially depending on invocation context.

**Structural requirement:** Full Tier 2 checklist (see Section 4). Mode selection must be expressed as a lookup table, not prose. EXIT conditions are explicit and per-mode.

**Gate Mode behavior:** Receive gate criteria via code-review skill injection. The agent's two modes (normal operation vs. gate evaluation) have different output contracts, so gate criteria are delivered externally to prevent criteria drift when the quality bar changes.

**Examples:**
- `reaper:workflow-planner` — planning mode (default) vs. verification mode (`MODE: VERIFICATION`); different skills are loaded, producing different output contracts
- `reaper:ai-prompt-engineer` in gate-capable builds — normal prompting advisor vs. gate evaluator
- `reaper:code-review` (skill-injected) — review mode vs. gate mode

---

### Tier 3 — Multi-Mode Agents (Orchestrators)

**Criterion:** Three or more distinct operational modes.

**Structural requirement:** All Tier 2 requirements, plus a dedicated mode-switching protocol section. Mode-switching logic must not be scattered through prose — it belongs in one declared section that the agent reads before any other behavioral rule.

**Gate Mode behavior:** Receive gate criteria via skill injection. Complexity at this tier warrants external gate definition to keep the agent's own prompt focused on orchestration logic.

**Examples:** No current Reaper agent is Tier 3. Tier 3 is the design target for any future agent that genuinely requires three or more distinct operational modes — for example, an agent that acts as a planner, a reviewer, and a passthrough router depending on invocation context. When adding such an agent, apply all Tier 2 requirements plus the mode-switching protocol section.

---

## 4. Tier 2 Hard Checklist

Every Tier 2 agent must satisfy all five requirements. Failure on any item is grounds for rejection during `reaper:ai-prompt-engineer` gate review.

### 4.1 EXIT Conditions

Every mode must declare its EXIT conditions explicitly. Ambiguous exits cause agents to silently degrade — they continue processing when they should stop.

**Required format:**

```
## Pre-Work Validation

### Mode: [Mode Name]
**If [condition], EXIT with:** "[exact error message the agent must produce]"
```

Accepted exit triggers:
- Missing required input for this mode
- Input present but invalid (fails format or range check)
- Dependency not available (tool missing, file not found)
- Conflicting inputs that cannot be resolved

**Anti-pattern:** A single shared EXIT block for all modes. Each mode has distinct required inputs and distinct failure conditions. Sharing an EXIT block forces vague error messages that do not help the caller.

### 4.2 Decision Tables

Mode selection must be expressed as a table, not prose. Prose mode-selection logic is ambiguous and drifts under token pressure.

**Required format:**

```markdown
## Mode Selection

| Signal | Mode | Required Inputs |
|--------|------|-----------------|
| [how to detect this mode] | [Mode Name] | [what is required] |
| [how to detect this mode] | [Mode Name] | [what is required] |
```

The Signal column must be unambiguous: a field name, a flag value, a keyword in the prompt, or the presence/absence of a parameter. "User seems to want X" is not an acceptable signal.

### 4.3 Anti-Pattern Format

Anti-patterns listed in a Tier 2 agent must use the three-column format: Detection Signal, Anti-Pattern name, Fix. A description-only column is not sufficient — the agent needs to know what to look for and what to do about it.

**Required format:**

```markdown
| Anti-Pattern | Detection Signal | Fix |
|---|---|---|
| [name] | [observable signal in input/output] | [specific corrective action] |
```

**Rationale:** An agent auditing for anti-patterns cannot act on a description alone. The Detection Signal tells it what pattern to match; the Fix tells it what to emit in the report. Without both, the agent either misses the anti-pattern or reports it without actionable guidance.

### 4.4 Section Ordering

Tier 2 agents must open with identity and authority, in that order, before any behavioral rules. The model's role and its scope boundary must be established before it reads the rules it will apply.

**Required ordering:**

1. **Identity** — who the agent is and what it does (first paragraph of the system prompt body)
2. **Authority / Scope boundary** — what the agent does and does not own (before any process rules)
3. **Mode selection table** — how the agent determines its operating mode
4. **Per-mode process** — what the agent does in each mode
5. **Output format** — expected JSON contract
6. **Constraints** — what the agent must never do

Placing authority after behavioral rules is the most common ordering violation. An agent that reads a dozen rules before understanding its scope boundary tends to over-apply those rules.

### 4.5 Partial Usage Criterion

Any section used verbatim (or near-verbatim) in three or more agent templates must be extracted to a partial in `src/partials/` and included via `<%- include('partials/name') %>`.

**Threshold:** Three occurrences in `src/agents/*.ejs`. Two occurrences may remain inline. Three or more require extraction.

**How to check:**

```bash
grep -l "your-section-content" src/agents/*.ejs | wc -l
```

**Why this matters:** Inline duplication means a single standard change requires editing N agent files and risks divergence. Partials enforce consistency at build time.

**Existing partials that satisfy this criterion:**

| Partial | Used By |
|---|---|
| `pre-work-validation-coding` | feature-developer, bug-fixer, refactoring-dev, branch-manager |
| `pre-work-validation-security` | security-auditor |
| `output-requirements` | All agents with JSON output contracts |
| `tdd-testing-protocol` | feature-developer, bug-fixer, refactoring-dev |
| `quality-gate-protocol` | Agents that participate in gate pipeline |
| `artifact-cleanup-coding` | All coding agents |

---

## 5. Tier 1 Template

Use this template as a starting point for Tier 1 agents. Remove the `TIER-JUSTIFICATION` comment if the agent has exactly one operational mode (no justification needed).

```markdown
---
name: [agent-name]
description: [One sentence. What the agent does and when to use it.] Examples: <example>...</example>
model: [opus|sonnet|haiku]
color: [yellow|cyan|purple|etc.]
tools: [comma-separated tool list]
---

You are [role description]. [One sentence on primary responsibility and approach.]

[OPTIONAL — only if input type variation needs declaration:]
<%# TIER-JUSTIFICATION: This agent is classified Tier 1 despite having [N] input types
    because all input types follow the same processing flow and output contract.
    Mode count justification: [explain] %>

<scope_boundaries>

## Scope

**In scope:**
- [What this agent owns]

**Not in scope:**
- [What this agent does not own, and who does own it]

</scope_boundaries>

## Pre-Work Validation

Before beginning, validate these inputs:

1. **[Required input]** (required) — [what it is and where to find it]
2. **[Optional input]** (preferred) — [what it is; behavior when absent]

If [required input] is missing, exit with: "[exact error message]"

<%- include('partials/output-requirements', { isReviewAgent: false, ... }) %>

## [Core behavior section]

[Process description. Single flow — no mode branching.]

## Required JSON Output

[Output contract.]
```

**Opt-out mechanism note:** If a Tier 1 agent later acquires a second operational mode (through a feature addition, gate-capable flag, or skill injection), it must be reclassified as Tier 2. The `TIER-JUSTIFICATION` comment is not a permanent escape hatch — it documents a deliberate decision that must be revisited when the agent evolves.

---

## 6. Gate Mode Guidance

Gate Mode is when an agent operates as a quality gate, evaluating a work product against pass/fail criteria rather than producing its normal output.

### When to Embed vs. Inject

| Tier | Gate Mode Approach | Rationale |
|---|---|---|
| Tier 1 | Embed gate criteria inline (inside `<% if (gateCapable) { %>` block) | Single-mode agents can absorb gate criteria as a behavioral extension of their one mode |
| Tier 2 | Receive criteria via code-review skill injection | Two-mode agents already context-switch; gate criteria belong in the external skill to prevent the agent's own prompt from drifting when criteria change |
| Tier 3 | Receive criteria via skill injection | Multi-mode agents have enough complexity; externalizing gate criteria keeps the agent focused on orchestration |

### Gate Mode Output Contract

All agents in gate mode must return the universal gate contract JSON, regardless of tier:

```json
{
  "gate_status": "PASS|FAIL",
  "task_id": "...",
  "working_dir": "...",
  "summary": "...",
  "blocking_issues": [],
  "advisory_issues": [],
  "all_checks_passed": true,
  "pre_work_validation": { "validation_passed": true },
  "files_modified": [],
  "commands_executed": []
}
```

### Criteria Drift Prevention

Gate criteria embedded inline in an agent's prompt are subject to drift: they get edited as the agent is updated for other reasons, and the quality bar shifts without anyone noticing.

For Tier 2 and Tier 3 agents, the code-review skill (`skills/code-review/SKILL.md`) is the authoritative source for gate criteria. When the bar changes, you update one file and every agent that uses skill injection gets the updated criteria automatically.

For Tier 1 agents, this risk is lower (single mode, fewer moving parts), which is why inline embedding is acceptable.

### The `gateCapable` Flag

Agents that participate as quality gates in the pipeline must declare `gateCapable: true` in the build config. This flag controls whether the `<% if (gateCapable) { %>` gate-mode section is rendered in the generated output.

Agents that are never used as gates must not include gate-mode sections, even unused ones. Dead context dilutes the agent's focus.

---

## 7. Annotated Agent Skeletons

### Tier 1 Skeleton — `reaper:security-auditor` (simplified)

```
[FRONTMATTER]
  name: security-auditor
  model: opus
  color: yellow
  (gateCapable: true — gate mode section rendered inline via EJS block)

[IDENTITY]                          ← Required: first paragraph
  "You are a Security Auditor Agent..."

[SCOPE BOUNDARY]                    ← Required: before any rules
  "This agent performs security analysis only..."

[PRE-WORK VALIDATION]               ← Required: single EXIT path
  "If TASK or WORKTREE missing, EXIT with: ..."

[OUTPUT REQUIREMENTS]               ← Partial: output-requirements
  (included via partial)

[SINGLE OPERATING PROCEDURE]        ← No mode branching
  0. Tooling pre-flight
  1. Output sanitization
  2. Run tools
  3. Classify findings

[OUTPUT FORMAT]                     ← Single JSON contract
  gate_status, summary, blocking_issues

[GATE MODE SECTION]                 ← Inline, inside gateCapable block
  (work-type-aware scan adjustments)
```

**What is absent:** Mode selection table, mode-switching protocol, per-mode EXIT conditions. One mode. One flow.

---

### Tier 2 Skeleton — `reaper:workflow-planner`

```
[FRONTMATTER]
  name: workflow-planner
  model: opus
  color: yellow

[IDENTITY]                          ← Required: first paragraph
  "You are a Strategic Planning Agent..."

[SKILL ROUTING / MODE SELECTION]    ← Required for Tier 2: table or equivalent
  "You are a routing agent. Before doing any work, load the appropriate skill:"

  | Signal                      | Mode         | Skill to Load                         |
  |-----------------------------|--------------|---------------------------------------|
  | Prompt contains MODE: VERIFICATION | Verification | workflow-planner-verification |
  | Otherwise (default)         | Planning     | workflow-planner-planning             |

  "Load the skill immediately and follow its instructions."

[PER-MODE EXIT CONDITIONS]          ← Required for Tier 2: one per mode
  Planning mode: EXIT conditions delegated to workflow-planner-planning skill
  Verification mode: EXIT conditions delegated to workflow-planner-verification skill
  (skills declare their own EXIT conditions; the agent prompt routes only)

[SCOPE BOUNDARY]                    ← Required: explicit in/not-in-scope lists
  In scope: task analysis, decomposition, parallel work identification
  Not in scope: implementation, code review, test execution

[SHARED CONTEXT]                    ← Content valid across both modes
  Core principles, work type taxonomy, quality gate protocol

[COMPLETION PROTOCOL]               ← Shared across modes
  Design deliverables, quality standards, orchestrator handoff
```

**What Tier 2 adds over Tier 1:** Mode selection table (with unambiguous Signal column), per-mode EXIT conditions, explicit scope boundary before behavioral rules. When mode-specific process is complex enough to be extracted into skills, the agent prompt becomes a router — that is still Tier 2 as long as there are exactly two modes.

---

### Tier 3 Skeleton — Hypothetical multi-mode agent

No current Reaper agent is Tier 3. This skeleton illustrates the required structure for a future agent with three or more genuine operational modes.

```
[FRONTMATTER]
  name: hypothetical-multi-mode-agent
  model: opus
  color: yellow

[IDENTITY]                          ← Required: first paragraph
  "You are [role]..."

[MODE-SWITCHING PROTOCOL]           ← Required for Tier 3: dedicated named section
                                    ← Must appear before ALL behavioral rules
  "Before doing any other work, determine your operating mode:"

  | Signal                          | Mode         | Required Inputs    |
  |---------------------------------|--------------|--------------------|
  | Prompt contains MODE: PLAN      | Planning     | task description   |
  | Prompt contains MODE: REVIEW    | Review       | artifact + criteria|
  | Prompt contains MODE: PASSTHROUGH | Passthrough | forwarded payload |

  "Load the appropriate skill or section for the detected mode, then stop reading
   this preamble and follow that mode's instructions."

[SCOPE BOUNDARY]                    ← Required: before per-mode sections
  In scope: [what this agent owns]
  Not in scope: [explicit exclusions with owners]

[PER-MODE EXIT CONDITIONS]          ← Required for Tier 3: one per mode
  Planning: EXIT if task description missing
  Review: EXIT if artifact or criteria missing
  Passthrough: EXIT if forwarded payload is malformed

[PER-MODE PROCESS]                  ← Each mode's steps in a dedicated subsection
  ### Planning Mode
    [steps]
  ### Review Mode
    [steps]
  ### Passthrough Mode
    [steps]

[OUTPUT FORMAT]                     ← Declare which contract each mode returns
  Planning → plan JSON contract
  Review → gate contract JSON
  Passthrough → upstream contract JSON (forwarded)
```

**What Tier 3 adds over Tier 2:** A dedicated `MODE-SWITCHING PROTOCOL` section that is the first substantive content the agent reads, before any behavioral rules. This prevents mode-switching logic from being buried in prose where it gets missed under token pressure. Per-mode process is typically externalized into skills because three or more inline sections would make the agent prompt unwieldy.

---

## 8. Classification Checklist

Use this checklist when authoring or reviewing an agent:

```
[ ] Count distinct operational modes
    [ ] 1 mode  → Tier 1
    [ ] 2 modes → Tier 2
    [ ] 3+ modes → Tier 3
    [ ] Ambiguous → resolve by asking: does the output CONTRACT change, or only the inputs?

[ ] Tier 1 checks
    [ ] No mode-selection table present
    [ ] Single EXIT path
    [ ] Gate criteria embedded inline (if gate-capable)
    [ ] TIER-JUSTIFICATION comment present if agent has 2+ input types

[ ] Tier 2 checks (all required)
    [ ] Mode selection table present, signals are unambiguous
    [ ] Per-mode EXIT conditions present, one per mode
    [ ] Anti-pattern entries have Detection Signal + Fix columns
    [ ] Section ordering: identity → scope → mode table → per-mode process → output → constraints
    [ ] Shared sections with 3+ occurrences are extracted to partials
    [ ] Gate criteria received via skill injection (not embedded inline)

[ ] Tier 3 checks (Tier 2 checks plus)
    [ ] Dedicated mode-switching protocol section
    [ ] Mode-switching section appears before all behavioral rules
    [ ] Gate criteria received via skill injection
    [ ] Per-mode process may be externalized to skills if inline would exceed ~200 lines
```

---

[Back to README](../README.md)
