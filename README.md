# Reaper

**Ground control for your codebase.**

Reaper turns Claude into a caffeine-addicted air traffic controller who never sleeps, never forgets a checklist, and never lets an agent veer off course. It's a Claude Code plugin that teaches Claude how to coordinate specialized agents—planners, developers, reviewers, security auditors—in the right sequence with automatic quality gates.

**Zero-touch development**: Approve the plan, grab a coffee, come back to finished work ready for your review. Claude coordinates the airspace. You just fly the plane.

> Built for Spice Labs. Shared because why not.

This is how we work: TDD-first, SOLID principles, worktree isolation, mandatory quality gates. It's opinionated. We're not sorry. Fork it, remix it, make it weird—we're flattered either way.

## At a Glance

| Component | What it does |
|-----------|--------------|
| **Agents** | Specialized workers for planning, development, quality, integration, ops |
| **Commands** | `/reaper:flight-plan`, `/reaper:takeoff`, `/reaper:status-worktrees`, `/reaper:claude-sync` |
| **Skills** | Auto-activating utilities for commits, linting, worktrees |
| **Strategies** | Complexity-aware workflows from quick fixes to multi-worktree epics |

---

## Installation

```bash
# Add the Spice Labs marketplace
claude plugin marketplace add SpiceLabsHQ/claude-marketplace

# Install Reaper from the marketplace
claude plugin install reaper@spice-labs
```

**Prerequisites**: [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)

---

## Quick Start

1. **Plan your work in detail**
   `/reaper:flight-plan Implement user notifications with email, SMS, and push support`

2. **Review and approve the plan** — Claude presents work units with dependencies mapped

3. **Issues created automatically** — Beads, Jira, or markdown fallback

4. **Clear context** — Run `/clear` for fresh execution (recommended)

5. **Execute the work** — `/reaper:takeoff TASK-123` and watch her fly!

**The orchestration workflow**:

1. **Analyze** — Claude deploys `reaper:workflow-planner` to assess complexity and select a strategy
2. **Implement** — Claude dispatches the right agent (`reaper:bug-fixer`, `reaper:feature-developer`, etc.) using TDD
3. **Validate** — Claude runs `reaper:test-runner` for full test suite, 80%+ coverage
4. **Review** — Claude deploys `reaper:code-reviewer` + `reaper:security-auditor` in parallel
5. **Present** — Only after all gates pass, Claude presents finished work for your approval

Plan in detail upfront. Claude coordinates the airspace. You only see finished work.

---

## How It Works

### The Recommended Workflow

```
/reaper:flight-plan "detailed description"
         │
         ▼
┌─────────────────────┐
│   Plan & Approve    │ ← You review work breakdown and dependencies
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│   Issues Created    │ ← Beads/Jira/Markdown with mapped dependencies
└─────────────────────┘
         │
         ▼
       /clear          ← Fresh context for execution
         │
         ▼
/reaper:takeoff TASK-123
         │
         ▼
┌─────────────────────────────┐
│  reaper:workflow-planner   │ ← Analyzes complexity, selects strategy
└─────────────────────────────┘
              │
              ▼
┌─────────────────────────────┐
│        Code Agent           │ ← reaper:bug-fixer / reaper:feature-developer / reaper:refactoring-specialist
└─────────────────────────────┘
              │
              ▼
┌─────────────────────────────┐
│       Quality Gates         │ ← reaper:test-runner → reaper:code-reviewer + reaper:security-auditor
└─────────────────────────────┘
         │
         ▼
┌─────────────────────┐
│   Your Approval     │ ← Only after ALL gates pass
└─────────────────────┘
```

### Three Complexity Strategies

The `workflow-planner` calculates a complexity score based on file impact, dependencies, testing burden, and integration risk, then selects the appropriate strategy:

| Strategy | Complexity | Use Case | Environment |
|----------|------------|----------|-------------|
| **Small Direct** | ≤10 | Config changes, simple fixes, docs | Current branch |
| **Medium Branch** | ≤30 | Multi-file changes, no overlap | Feature branch |
| **Large Multi-Worktree** | >30 | Complex features, file overlap | Isolated `./trees/` worktrees |

---

## Agents

### Planning

| Agent | Purpose |
|-------|---------|
| `reaper:workflow-planner` | Analyzes task complexity, selects strategy, decomposes into work units |
| `reaper:api-designer` | Designs REST/GraphQL APIs with OpenAPI specs and versioning |
| `reaper:cloud-architect` | Designs cloud infrastructure, IaC, cost optimization (AWS/GCP/Azure) |
| `reaper:database-architect` | Schema design, migrations, query optimization, scaling strategies |

### Development

| Agent | Purpose |
|-------|---------|
| `reaper:feature-developer` | Implements new features with TDD and SOLID principles |
| `reaper:bug-fixer` | Systematic bug reproduction and minimal fixes with TDD |
| `reaper:refactoring-specialist` | Code improvements while preserving functionality |
| `reaper:branch-manager` | Git operations, worktree management, safe merges |

### Quality

| Agent | Purpose |
|-------|---------|
| `reaper:test-runner` | Full test suite, 80%+ coverage validation, linting (authoritative) |
| `reaper:code-reviewer` | SOLID principles, best practices, code quality |
| `reaper:security-auditor` | Vulnerability detection, OWASP compliance, secrets scanning |
| `reaper:performance-engineer` | Performance analysis, load testing, optimization |

### Delivery & Ops

| Agent | Purpose |
|-------|---------|
| `reaper:deployment-engineer` | CI/CD pipelines, release automation, versioning |
| `reaper:integration-engineer` | Third-party services, APIs, webhooks, event-driven systems |
| `reaper:incident-responder` | Production diagnosis, log analysis, coordinated remediation |

### Documentation

| Agent | Purpose |
|-------|---------|
| `reaper:documentation-generator` | Technical documentation from codebases |
| `reaper:claude-agent-architect` | Agent design, creation, and quality control |

---

## Commands

### `/reaper:flight-plan`

**Start here.** Generate execution plans with epic/issue structure.

```bash
# Detailed planning (recommended)
/reaper:flight-plan Implement user notifications with email, SMS, and push support.
             Include preferences dashboard for users to manage notification settings.
```

Claude creates structured work breakdown with parallel opportunities and dependency mapping. After your approval, issues are created in your task system (Beads/Jira) or as markdown.

### `/reaper:takeoff`

Execute development work from a task ID or plan.

```bash
# Preferred: Task ID from your task system
/reaper:takeoff PROJ-123
/reaper:takeoff reaper-a3f

# Alternative: Path to plan file
/reaper:takeoff ./plans/notifications.md

# Fallback: Description only (less context for Claude)
/reaper:takeoff Implement rate limiting - 100 req/min per IP, Redis-backed
```

Claude handles the full workflow: planning → implementation → quality gates → your review.

### `/reaper:status-worktrees`

Check parallel development status.

```bash
/reaper:status-worktrees              # All worktrees
/reaper:status-worktrees PROJ-123     # Specific task
```

Shows implementation progress, uncommitted changes, test coverage, and completion percentage.

### `/reaper:claude-sync`

Analyze commits and suggest CLAUDE.md updates.

```bash
/reaper:claude-sync
```

Claude deploys parallel analyzers (architecture, environment, workflow, integration) to identify undocumented changes since CLAUDE.md was last modified.

---

## Quality Gates

Claude gets picky so you don't have to be. Every task goes through mandatory validation:

**1. reaper:test-runner** (BLOCKING)
- Full test suite execution
- 80%+ coverage for application code
- Linting and type checking
- Build validation

**2. reaper:code-reviewer + reaper:security-auditor** (PARALLEL)
- SOLID principles and best practices
- Vulnerability scanning
- Secrets detection

**3. Auto-iteration**
- If any gate fails, work returns to the code agent automatically
- Up to 3 iterations before escalating to you
- No user intervention during iteration

**4. User approval**
- Only after ALL gates pass
- You review and explicitly approve: "commit", "merge", "ship it"
- `reaper:branch-manager` handles git operations

You never see half-finished work.

---

## Contributing

Fork it. Seriously. Make it yours.

Want to contribute back? We love that. Open an issue, show us what you've got. If it fits how we work, we'll pull it in.

**How we roll**:
- TDD (Red-Green-Refactor)
- SOLID principles
- Conventional commits with ticket reference
- 80%+ test coverage
- Details in `docs/spice/SPICE.md`

Take it somewhere weird. Name it something ridiculous. We're into it.

---

## License

MIT License

Copyright (c) 2025 Spice Labs

See [LICENSE](LICENSE) for details.
