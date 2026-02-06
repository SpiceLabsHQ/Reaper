# Agent Catalog

Reaper coordinates 25 specialized agents. You never invoke them directly -- Reaper dispatches the right agent based on your task. Each agent has a focused role, specific tools, and quality standards. When you run `/reaper:takeoff` or `/reaper:flight-plan`, Reaper selects and orchestrates the agents for you.

## Planning (10 agents)

Architects and strategists. These agents analyze requirements, design systems, and produce implementation-ready specifications. They plan work; they do not implement it.

| Agent | Purpose |
|-------|---------|
| `reaper:workflow-planner` | Analyzes task complexity, selects strategy, decomposes into dependency-aware work units with parallel work identification |
| `reaper:api-designer` | Designs REST, GraphQL, and gRPC APIs with OpenAPI/AsyncAPI specs, versioning strategies, and integration patterns |
| `reaper:cloud-architect` | Cloud infrastructure design, IaC strategy (Terraform/CDK/Pulumi), cost optimization, and scaling across AWS, GCP, and Azure |
| `reaper:database-architect` | Schema design, migration planning, query optimization, indexing strategies, sharding, and replication topology |
| `reaper:event-architect` | Event-driven architectures, message broker selection (Kafka/RabbitMQ/SQS), saga patterns, CQRS, and event sourcing |
| `reaper:frontend-architect` | Component architecture, state management, rendering strategies (SSR/CSR/ISR/RSC), design systems, and WCAG accessibility |
| `reaper:observability-architect` | Metrics, logs, and traces architecture, SLO/SLI definition, symptom-based alerting, and platform selection |
| `reaper:data-engineer` | ETL/ELT pipeline design, data warehouse modeling (star/snowflake schemas), streaming architecture, and data quality frameworks |
| `reaper:test-strategist` | Test pyramid design, contract testing (Pact), chaos engineering, mutation testing, and test data management |
| `reaper:compliance-architect` | GDPR, HIPAA, SOC2, PCI-DSS compliance architecture, data residency, consent management, and audit trails (not legal advice) |

## Development (4 agents)

Builders. These agents write production code and tests in isolated worktrees using TDD methodology and SOLID principles.

| Agent | Purpose |
|-------|---------|
| `reaper:feature-developer` | Implements new features using TDD (Red-Green-Blue) with SOLID principles and comprehensive test coverage |
| `reaper:bug-fixer` | Systematic bug reproduction with a failing test, minimal fix, then refactor -- smallest correct change without side effects |
| `reaper:refactoring-dev` | Improves existing code structure while preserving functionality, targeting simplicity over abstraction |
| `reaper:branch-manager` | Git operations, worktree setup and teardown, safe merges, and repository maintenance with safety protocols |

## Quality (5 agents)

Gatekeepers. These agents validate code and infrastructure after implementation. They run automatically as quality gates -- you do not need to invoke them.

| Agent | Purpose |
|-------|---------|
| `reaper:test-runner` | Executes full test suites, validates coverage thresholds, runs linting -- the authoritative source for test metrics |
| `reaper:code-reviewer` | Reviews code for SOLID principles, plan adherence, best practices, and test quality (does not re-run tests) |
| `reaper:security-auditor` | Vulnerability detection with Trivy, Semgrep, and TruffleHog -- OWASP compliance and secrets scanning |
| `reaper:performance-engineer` | Profiles bottlenecks, implements targeted optimizations, and validates improvements with before/after metrics |
| `reaper:validation-runner` | Non-code validation: Terraform, OpenAPI specs, Helm charts, Docker builds, schema checks, and migration dry-runs |

## Ops (3 agents)

Operators. These agents handle deployment, integration, and incident response for production systems.

| Agent | Purpose |
|-------|---------|
| `reaper:deployment-engineer` | CI/CD pipeline implementation, release automation, deployment strategies, and versioning with changelog generation |
| `reaper:integration-engineer` | Third-party service integration, API clients, webhook handlers, and event-driven system connectivity |
| `reaper:incident-responder` | Production incident diagnosis, log analysis, root cause investigation, and coordinated emergency remediation |

## Craft (3 agents)

Shapers. These agents refine documentation, agent design, and prompt quality for any project -- not just Reaper.

| Agent | Purpose |
|-------|---------|
| `reaper:technical-writer` | Generates technical documentation from codebases with verification and accuracy standards |
| `reaper:claude-agent-architect` | Designs, creates, and refactors agents -- structure, format compliance, and design quality control |
| `reaper:ai-prompt-engineer` | Prompt optimization, anti-pattern detection, token reduction, and model-specific tuning across LLM families |

## How agents are dispatched

You do not choose which agent runs. Reaper handles dispatch automatically based on the task:

- **`/reaper:takeoff`** determines which development agent to use based on task type (new feature, bug fix, refactoring), then runs quality gate agents automatically after implementation completes.
- **`/reaper:flight-plan`** deploys the workflow planner to decompose complex tasks into work units before execution begins.
- **`/reaper:squadron`** coordinates multiple planning agents in parallel for cross-cutting architectural decisions.
- **Quality gates** (test-runner, code-reviewer, security-auditor) run automatically after every implementation agent finishes. You never trigger them manually.
- **Branch operations** (commits, merges, worktree management) are always handled by the branch-manager agent through orchestration scripts.

The dispatch layer matches task characteristics to agent capabilities. A bug report routes to `bug-fixer`. A new feature routes to `feature-developer`. Infrastructure validation routes to `validation-runner`. The routing is deterministic -- same input, same agent.

---

**Total: 25 agents** across 5 categories.

[Back to README](../README.md)
