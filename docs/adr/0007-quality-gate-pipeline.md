# ADR-0007: Quality Gate Pipeline

**Date**: 2026-02-18
**Status**: Accepted

---

## Context

A single generic quality gate applied uniformly to all work types is either over-gating or under-gating. Running a test suite on documentation changes wastes tokens and produces meaningless results. Skipping a security audit on infrastructure configuration leaves real risk unexamined. Different artifacts need different validators.

Running all possible quality agents on every changeset compounds the problem. A Terraform change does not need test coverage analysis. An agent prompt does not need a security scan. Deploying irrelevant gate agents wastes tokens, increases latency, and produces findings that the developer must triage and dismiss -- noise that erodes trust in the gate system itself.

When gate failures occur, the retry strategy has significant cost implications. A full agent redeployment costs approximately 3,000 tokens. Resuming an existing agent session with specific blocking issues costs 50-100 tokens. Without a structured retry mechanism, the orchestrator either over-spends on fresh deployments or gives up too early on fixable issues.

---

## Decision

### 2-Gate Structure

Quality validation uses a 2-gate sequential pipeline:

**Gate 1 (blocking):** Must pass before Gate 2 begins. For work types that produce executable artifacts, this is `reaper:test-runner` to ensure functional correctness. Investing in code review and security analysis before basic tests pass wastes money on work that is already broken.

**Gate 2 (parallel):** Code review and security audit run simultaneously after Gate 1 passes. Parallelism reduces total wall-clock time compared to running these sequentially.

### Work-Type Profiles

Nine profiles map each work type to the appropriate gate agents:

| Work Type | Gate 1 | Gate 2 |
|-----------|--------|--------|
| `application_code` | reaper:test-runner | SME reviewer (reaper:feature-developer), reaper:security-auditor |
| `infrastructure_config` | -- | SME reviewer (reaper:cloud-architect), reaper:security-auditor |
| `database_migration` | -- | SME reviewer (reaper:database-architect) |
| `api_specification` | -- | SME reviewer (reaper:api-designer) |
| `agent_prompt` | -- | reaper:ai-prompt-engineer, SME reviewer (reaper:ai-prompt-engineer) |
| `documentation` | -- | SME reviewer (reaper:technical-writer) |
| `ci_cd_pipeline` | -- | SME reviewer (reaper:deployment-engineer), reaper:security-auditor |
| `test_code` | reaper:test-runner | SME reviewer (reaper:feature-developer) |
| `configuration` | -- | SME reviewer (reaper:feature-developer), reaper:security-auditor |

SME reviewer resolves to the listed `reviewer_agent` for that work type. Each SME runs the universal `code-review` skill with an optional specialty file for domain-specific checks.

For work types with no Gate 1, the pipeline skips directly to Gate 2.

### Union Semantics for Mixed Changesets

When a changeset spans multiple work types, compute the union of all matching profiles:

1. Identify all work types present in the changeset
2. Collect all unique Gate 1 agents across matching profiles -- if any profile includes a Gate 1 agent, it remains blocking
3. Collect all unique Gate 2 agents across matching profiles (deduplicated)
4. Deploy the union set through the standard gate sequence

**Example:** A changeset touching `src/auth.ts` (application_code) and `terraform/main.tf` (infrastructure_config) produces:
- Gate 1: reaper:test-runner (from application_code; infrastructure_config has no Gate 1)
- Gate 2: SME reviewer (reaper:feature-developer) + reaper:security-auditor (union of both profiles; security-auditor deduplicated)

### Differential Retry Limits

Each gate agent has its own iteration limit before escalating to the user:

| Gate Agent | Max Iterations | Rationale |
|------------|---------------|-----------|
| reaper:test-runner | 3 | Most likely to need iteration (test failures, coverage gaps) |
| SME reviewer (via code-review skill) | 1 | SME reviewers perform one focused pass per iteration |
| reaper:security-auditor | 1 | Security issues require careful one-pass remediation |
| reaper:ai-prompt-engineer | 1 | Prompt quality review is typically one-pass |
| reaper:deployment-engineer | 1 | Pipeline validation is typically one-pass |

### Resume-Based Retry

The orchestrator captures the `agent_id` from every Task tool response. On gate failure, the orchestrator prefers `Task --resume $AGENT_ID` with the specific blocking issues over a full redeployment. Resume cost is approximately 50-100 tokens compared to approximately 3,000 tokens for a fresh deployment.

This requires the orchestrator to store agent IDs for the duration of the gate cycle and fall back to fresh deployment only when the resume fails (stale agent ID) or when the maximum retry limit is exceeded.

---

## Consequences

**Positive:**
- Lower per-invocation token cost because only relevant gate agents run for each work type
- SME alignment: domain experts validate their own work type rather than a generalist reviewing everything
- Resume-based retry reduces iteration cost by an order of magnitude compared to full redeployment
- Clear escalation path through differential retry limits before requiring user intervention
- Gate 1 blocking prevents wasting Gate 2 tokens on functionally broken code

**Negative / Risks:**
- Profile maintenance burden: nine profiles must stay accurate as agents are added, removed, or renamed
- Union semantics add orchestrator complexity, particularly for changesets spanning three or more work types
- Resume requires capturing and storing agent IDs across gate iterations, adding state management to the orchestrator
- Differential retry limits may be miscalibrated for specific codebases where certain agents need more or fewer iterations

---

## Alternatives Considered

**Single gate for all work types** -- Apply one uniform gate to every changeset. Simpler to implement and maintain. Rejected because it either wastes tokens on irrelevant checks (running test-runner on documentation) or misses type-specific validators (skipping security-auditor on infrastructure config). The cost of maintaining nine profiles is justified by the token savings and validation accuracy.

**Flat parallel execution (all gates at once)** -- Run Gate 1 and Gate 2 agents simultaneously to minimize wall-clock time. Rejected because it allows expensive Gate 2 agents (code review, security audit) to run before basic functional tests pass. When Gate 1 fails, all Gate 2 work is wasted. Sequential gating ensures Gate 2 tokens are only spent on code that already works.

**No work-type differentiation** -- Use the same agent set for every changeset regardless of content. This is equivalent to the single gate alternative applied to Gate 2 specifically. Rejected for the same reasons: irrelevant findings, wasted tokens, and developer triage fatigue.

**Agent-self-selected gates** -- Let coding agents declare which quality gates should apply to their own output. Rejected because it creates a conflict of interest. An agent that knows it will be evaluated by a security auditor may avoid security-sensitive changes rather than implementing them correctly. Gate selection must be external to the agent being evaluated.
