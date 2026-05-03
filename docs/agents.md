# Agent Catalog

Reaper coordinates 24 specialized agents. You never invoke them directly -- Reaper dispatches the right agent based on your task. Each agent has a focused role, specific tools, and quality standards. When you run `/reaper:takeoff` or `/reaper:flight-plan`, Reaper selects and orchestrates the agents for you.

## Planning (10 agents)

Architects and strategists. These agents analyze requirements, design systems, and produce implementation-ready specifications. They plan work; they do not implement it.

| Agent                            | Purpose                                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `reaper:workflow-planner`        | Analyzes task complexity, selects strategy, decomposes into dependency-aware work units with parallel work identification      |
| `reaper:api-designer`            | Designs REST, GraphQL, and gRPC APIs with OpenAPI/AsyncAPI specs, versioning strategies, and integration patterns              |
| `reaper:cloud-architect`         | Cloud infrastructure design, IaC strategy (Terraform/CDK/Pulumi), cost optimization, and scaling across AWS, GCP, and Azure    |
| `reaper:database-architect`      | Schema design, migration planning, query optimization, indexing strategies, sharding, and replication topology                 |
| `reaper:event-architect`         | Event-driven architectures, message broker selection (Kafka/RabbitMQ/SQS), saga patterns, CQRS, and event sourcing             |
| `reaper:frontend-architect`      | Component architecture, state management, rendering strategies (SSR/CSR/ISR/RSC), design systems, and WCAG accessibility       |
| `reaper:observability-architect` | Metrics, logs, and traces architecture, SLO/SLI definition, symptom-based alerting, and platform selection                     |
| `reaper:data-engineer`           | ETL/ELT pipeline design, data warehouse modeling (star/snowflake schemas), streaming architecture, and data quality frameworks |
| `reaper:test-strategist`         | Test pyramid design, contract testing (Pact), chaos engineering, mutation testing, and test data management                    |
| `reaper:compliance-architect`    | GDPR, HIPAA, SOC2, PCI-DSS compliance architecture, data residency, consent management, and audit trails (not legal advice)    |

## Development (4 agents)

Builders. These agents write production code and tests in isolated worktrees using TDD methodology and SOLID principles.

| Agent                      | Purpose                                                                                                                     |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `reaper:feature-developer` | Implements new features using TDD (Red-Green-Blue) with SOLID principles and comprehensive test coverage                    |
| `reaper:bug-fixer`         | Systematic bug reproduction with a failing test, minimal fix, then refactor -- smallest correct change without side effects |
| `reaper:refactoring-dev`   | Improves existing code structure while preserving functionality, targeting simplicity over abstraction                      |
| `reaper:branch-manager`    | Git operations, worktree setup and teardown, safe merges, and repository maintenance with safety protocols                  |

## Quality (3 agents + SME routing)

Gatekeepers. These agents validate code and infrastructure after implementation. They run automatically as quality gates -- you do not need to invoke them.

| Agent                         | Purpose                                                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `reaper:test-runner`          | Executes full test suites, validates coverage thresholds, runs linting -- the authoritative source for test metrics |
| `reaper:security-auditor`     | Vulnerability detection with Trivy, Semgrep, and TruffleHog -- OWASP compliance and secrets scanning                |
| `reaper:performance-engineer` | Profiles bottlenecks, implements targeted optimizations, and validates improvements with before/after metrics       |

**Gate 2 code review -- SME routing:** Rather than a dedicated reviewer agent, Gate 2 code review is performed by a work-type-matched subject matter expert (SME). The SME agents listed below are general-purpose domain experts -- they carry no gate-specific logic of their own. When the `takeoff` command dispatches an SME for Gate 2 review, it injects the contents of `skills/code-review/SKILL.md` into the agent prompt as `SKILL_CONTENT`. This skill injection provides the review protocol (plan verification, scope creep detection, completeness checks, and structured JSON output). An optional specialty file for the work type may also be loaded by the skill at review time. The agents themselves remain unaware that they are operating in a gate context.

| Work Type                                        | SME Reviewer                 |
| ------------------------------------------------ | ---------------------------- |
| `application_code`, `test_code`, `configuration` | `reaper:feature-developer`   |
| `infrastructure_config`                          | `reaper:cloud-architect`     |
| `database_migration`                             | `reaper:database-architect`  |
| `api_specification`                              | `reaper:api-designer`        |
| `agent_prompt`                                   | `reaper:ai-prompt-engineer`  |
| `documentation`                                  | `reaper:technical-writer`    |
| `ci_cd_pipeline`                                 | `reaper:deployment-engineer` |

## Ops (3 agents)

Operators. These agents handle deployment, integration, and incident response for production systems.

| Agent                         | Purpose                                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `reaper:deployment-engineer`  | CI/CD pipeline implementation, release automation, deployment strategies, and versioning with changelog generation |
| `reaper:integration-engineer` | Third-party service integration, API clients, webhook handlers, and event-driven system connectivity               |
| `reaper:incident-responder`   | Production incident diagnosis, log analysis, root cause investigation, and coordinated emergency remediation       |

## Craft (4 agents)

Shapers. These agents refine documentation, agent design, and prompt quality for any project -- not just Reaper.

| Agent                           | Purpose                                                                                                                                                                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `reaper:technical-writer`       | Generates technical documentation from codebases with verification and accuracy standards                                                                                                                                                                          |
| `reaper:claude-agent-architect` | Designs, creates, and refactors agents -- structure, format compliance, and design quality control                                                                                                                                                                 |
| `reaper:ai-prompt-engineer`     | Prompt optimization, anti-pattern detection, token reduction, and model-specific tuning across LLM families                                                                                                                                                        |
| `reaper:principal-engineer`     | Senior technical leadership providing architectural oversight, system design review, and decision arbitration -- use when evaluating service boundaries, assessing technical debt, arbitrating competing approaches, or reviewing architecture at a systemic level |

## How agents are dispatched

You do not choose which agent runs. Reaper handles dispatch automatically based on the task:

- **`/reaper:takeoff`** determines which development agent to use based on task type (new feature, bug fix, refactoring), then runs quality gate agents automatically after implementation completes.
- **`/reaper:flight-plan`** deploys the workflow planner to decompose complex tasks into work units before execution begins.
- **`/reaper:squadron`** coordinates multiple planning agents in parallel for cross-cutting architectural decisions.
- **Quality gates** (test-runner, SME reviewer, security-auditor) run automatically after every implementation agent finishes. The SME reviewer is selected based on work type -- you never trigger them manually.
- **Branch operations** (commits, merges, worktree management) are always handled by the branch-manager agent through orchestration scripts.

The dispatch layer matches task characteristics to agent capabilities. A bug report routes to `bug-fixer`. A new feature routes to `feature-developer`. The routing is deterministic -- same input, same agent.

## Subagent Memory

Every Reaper agent declares `memory: project` in its frontmatter and includes a shared memory-guidance partial parameterized by role. The Claude Agent SDK reads that field, points the agent at `.claude/agent-memory/<agent-name>/`, and auto-injects the first 200 lines (or 25 KB) of `MEMORY.md` into the agent's system prompt on every dispatch. The result is durable, role-tuned cross-session learning that supplements (rather than duplicates) `CLAUDE.md`.

Memory is stored under the project scope so it can be shared with the team via version control — committing `.claude/agent-memory/` propagates accumulated learnings the same way you propagate any other repo artifact. Projects that want per-developer silos can `.gitignore` the directory without changing any frontmatter.

### Role taxonomy

The shared partial accepts one of seven role values. Each role tailors what an agent should record; the _what NOT to write_, _when to write_, and _when to read_ guidance is shared across all roles.

| Role          | Agents                                                                                                                                                                | What this role records                                                                                            |
| :------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------- |
| `implementer` | bug-fixer, feature-developer, refactoring-dev                                                                                                                         | Recurring root-cause classes, debugging traps, validated fix shapes, project-specific test patterns               |
| `architect`   | api-designer, cloud-architect, database-architect, event-architect, observability-architect, frontend-architect, data-engineer, test-strategist, compliance-architect | Trade-off decisions and the constraints that drove them, conventions for future architects, non-obvious couplings |
| `planner`     | workflow-planner                                                                                                                                                      | Decomposition heuristics that worked here, recurring risk patterns, parallelization signals, scope-creep traps    |
| `reviewer`    | principal-engineer, security-auditor, performance-engineer                                                                                                            | Codebase-specific tooling false positives, accepted code smells with rationale, mitigations already in place      |
| `craft`       | ai-prompt-engineer, claude-agent-architect, technical-writer                                                                                                          | Prompt anti-patterns the repo keeps re-introducing, doc style decisions, token-waste patterns, house conventions  |
| `ops`         | deployment-engineer, integration-engineer, incident-responder                                                                                                         | Recurring incident root causes, production quirks, validated runbook steps, deployment failure modes, blind spots |
| `executor`    | test-runner, branch-manager                                                                                                                                           | Usually nothing — flagged only on recurring orchestrator misuse patterns that cost cycles to clean up             |

Total: 3 + 9 + 1 + 3 + 3 + 3 + 2 = 24 agents. Every Reaper-shipped agent appears in exactly one row.

### How to opt out

Memory is per-agent and overridable. To disable memory on a specific agent, edit its source template under `src/agents/`:

- **Change the scope** -- replace `memory: project` with `memory: local` (developer-private, conventionally `.gitignore`d) or `memory: user` (shared across all projects on the machine), then rebuild.
- **Disable entirely** -- remove the `memory:` frontmatter line and delete the `<%- include('partials/memory-guidance', { role: '...' }) %>` line from the same file. The agent reverts to memory-less behavior.

Whole-project opt-out without touching any agent: add `.claude/agent-memory/` to `.gitignore` so accumulated memory stays on the local machine instead of being shared via the repo. The agents continue to read and write their stores; the team simply does not share the contents.

### References

- [ADR-0026: Subagent Memory and Role-Based Storage Policy](adr/0026-subagent-memory-and-role-storage-policy.md) — the authoritative policy, including scope rationale, role definitions, and consequences.
- [SPC-33 spike: Subagent Memory Frontmatter](research/spc-33-memory-frontmatter-spike.md) — the empirical SDK details confirming that the markdown frontmatter `memory:` key is honored on Reaper's plugin-agent code path.

---

**Total: 24 agents** across 5 categories (plus work-type-matched SME routing for code review).

[Back to README](../README.md)
