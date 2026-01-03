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
| **Commands** | `/orchestrate`, `/plan`, `/status-worktrees`, `/claude-sync` |
| **Skills** | Auto-activating utilities for commits, linting, worktrees |
| **Strategies** | Complexity-aware workflows from quick fixes to multi-worktree epics |

---

## Installation

```bash
claude plugin add SpiceLabsHQ/reaper
```

**Prerequisites**: [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)

---

## Quick Start

```bash
# Start Claude Code in your project
claude

# Orchestrate a task
/orchestrate Fix the authentication bug where users can't log in with email addresses containing plus signs
```

**What happens next**:

1. **Analyze** — Claude deploys `workflow-planner` to assess complexity and select a strategy
2. **Implement** — Claude dispatches `bug-fixer` to write a failing test, then fix the code (TDD)
3. **Validate** — Claude runs `test-runner` for full test suite, 80%+ coverage
4. **Review** — Claude deploys `code-reviewer` + `security-auditor` in parallel
5. **Present** — Only after all gates pass, Claude presents finished work for your approval

You describe the work. Claude coordinates the airspace. You only see finished work.

---

## How It Works

### The Orchestration Model

```
/orchestrate "task description"
         │
         ▼
┌─────────────────────┐
│  workflow-planner   │ ← Analyzes complexity, selects strategy
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│    Code Agent       │ ← bug-fixer / feature-developer / refactoring-specialist
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│   Quality Gates     │ ← test-runner → code-reviewer + security-auditor
└─────────────────────┘
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
| `workflow-planner` | Analyzes task complexity, selects strategy, decomposes into work units |
| `api-designer` | Designs REST/GraphQL APIs with OpenAPI specs and versioning |
| `cloud-architect` | Designs cloud infrastructure, IaC, cost optimization (AWS/GCP/Azure) |
| `database-architect` | Schema design, migrations, query optimization, scaling strategies |

### Development

| Agent | Purpose |
|-------|---------|
| `feature-developer` | Implements new features with TDD and SOLID principles |
| `bug-fixer` | Systematic bug reproduction and minimal fixes with TDD |
| `refactoring-specialist` | Code improvements while preserving functionality |
| `branch-manager` | Git operations, worktree management, safe merges |

### Quality

| Agent | Purpose |
|-------|---------|
| `test-runner` | Full test suite, 80%+ coverage validation, linting (authoritative) |
| `code-reviewer` | SOLID principles, best practices, code quality |
| `security-auditor` | Vulnerability detection, OWASP compliance, secrets scanning |
| `performance-engineer` | Performance analysis, load testing, optimization |

### Delivery & Ops

| Agent | Purpose |
|-------|---------|
| `deployment-engineer` | CI/CD pipelines, release automation, versioning |
| `integration-engineer` | Third-party services, APIs, webhooks, event-driven systems |
| `incident-responder` | Production diagnosis, log analysis, coordinated remediation |

### Documentation

| Agent | Purpose |
|-------|---------|
| `documentation-generator` | Technical documentation from codebases |
| `claude-agent-architect` | Agent design, creation, and quality control |

---

## Commands

### `/orchestrate`

Main entry point for all development work.

```bash
# Task description only
/orchestrate Implement rate limiting - 100 req/min per IP, Redis-backed

# With external task ID (fetches details from Jira/Beads)
/orchestrate PROJ-123

# Combined
/orchestrate PROJ-123: Add input validation for email field
```

Claude handles the full workflow: planning → implementation → quality gates → your review.

### `/plan`

Generate execution plans with epic/issue structure.

```bash
/plan Implement user notifications with email, SMS, and push support
```

Claude creates structured work breakdown with parallel opportunities and dependency mapping. Outputs issues to your task system (Jira/Beads) or markdown.

### `/status-worktrees`

Check parallel development status.

```bash
/status-worktrees              # All worktrees
/status-worktrees PROJ-123     # Specific task
```

Shows implementation progress, uncommitted changes, test coverage, and completion percentage.

### `/claude-sync`

Analyze commits and suggest CLAUDE.md updates.

```bash
/claude-sync
```

Claude deploys parallel analyzers (architecture, environment, workflow, integration) to identify undocumented changes since CLAUDE.md was last modified.

---

## Quality Gates

Claude gets picky so you don't have to be. Every task goes through mandatory validation:

**1. test-runner** (BLOCKING)
- Full test suite execution
- 80%+ coverage for application code
- Linting and type checking
- Build validation

**2. code-reviewer + security-auditor** (PARALLEL)
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
- `branch-manager` handles git operations

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
