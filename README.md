# Reaper

**Ground control for your codebase.**

Reaper is a Claude Code plugin that turns Claude into a caffeine-addicted air traffic controller for your development workflow. It coordinates specialized agents -- planners, developers, reviewers, security auditors -- through mandatory quality gates so you never see half-finished work.

**Zero-touch development**: Describe what you want, approve the plan, and walk away. Come back to tested, reviewed, gate-passed code ready for your sign-off.

> Built for Spice Labs. Shared because why not.

[![CI](https://github.com/SpiceLabsHQ/Reaper/actions/workflows/test.yml/badge.svg)](https://github.com/SpiceLabsHQ/Reaper/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.7.0-orange.svg)](CHANGELOG.md)

```bash
claude plugin marketplace add SpiceLabsHQ/claude-marketplace
claude plugin install reaper@spice-labs
```

**Prerequisites**: [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)

---

## See It Fly

A single command kicks off the full arc -- planning, implementation, testing, review, and security audit -- without you lifting a finger.

```
> /reaper:takeoff Add rate limiting - 100 req/min per IP, Redis-backed

 workflow-planner    Strategy: medium-branch -> feature/rate-limiting
 feature-developer   Created middleware, Redis store, config, 14 tests (TDD)
 test-runner         42 tests passed . 94% coverage . lint clean
 code-reviewer       SOLID  . no issues
 security-auditor    OWASP  . no secrets . no vulnerabilities

  5 files changed . 14 tests added . 3 quality gates passed
  Ready for your review. Say "ship it" when you're happy.
```

*Stylized output. Actual formatting varies by terminal and task complexity.*

---

## Start Small, Go Big

Three commands. Each unlocks when you outgrow the last.

### Start here: `/reaper:takeoff`

Give Reaper a task and walk away.

This is the command you will use 90% of the time. Hand it a task ID or a plain description -- Reaper selects the right agents, creates a worktree, writes code test-first, and runs every quality gate before presenting finished work.

```
> /reaper:takeoff PROJ-42

 Picking up task: "Add webhook retry with exponential backoff"
 Strategy: medium-branch -> feature/PROJ-42-webhook-retry
 Working... (agents will report when all gates pass)
```

You review. You approve. That is it.

When a single task is not enough, you will want a plan.

### Level up: `/reaper:flight-plan`

For work that spans multiple files, concerns, or days.

Describe the full scope and Reaper decomposes it into parallelizable work units with dependency mapping. After your approval, issues are created in your task system (Beads, Jira, or markdown fallback) and each unit is ready for `/reaper:takeoff`.

```
> /reaper:flight-plan Add user notification preferences with email, SMS, push

 Flight plan ready -- 3 work units, 2 parallelizable:
  1. PROJ-50  Notification dispatcher service
  2. PROJ-51  Preferences API + storage        (parallel with 1)
  3. PROJ-52  Preferences dashboard UI          (blocked by 2)

  Approve this plan? Issues will be created in Beads.
```

Approve the plan, run `/clear` for fresh context, then `/reaper:takeoff PROJ-50` to start executing.

When the decision itself is what matters, call in the experts.

### Unlock: `/reaper:squadron`

A deliberation forum of specialist agents.

Token-heavy by design -- use when getting the architecture wrong costs more than getting it slow.

Reaper assembles domain experts relevant to your question, has each deliver a position, surfaces tensions between them, and routes debate toward convergence.

```
> /reaper:squadron Should we migrate from REST to GraphQL?

 Squadron assembled -- 4 domain experts:
  API DESIGNER . DATABASE ARCHITECT . FRONTEND ARCHITECT . PERFORMANCE ENGINEER

 Positions delivered. Tensions identified. Routing debate...
 Converged: 3 decisions for your review, 1 unresolved trade-off.

  Ready for your input.
```

You get structured recommendations and explicit trade-offs, not a vague summary.

---

## Under the Hood

Reaper is opinionated about how work gets done. These subsystems run automatically -- you do not configure them.

### Complexity Strategies

The workflow planner scores every task and selects the right isolation level.

| Strategy | Complexity | Environment |
|----------|------------|-------------|
| Small Direct | Low | Current branch |
| Medium Branch | Medium | Feature branch |
| Large Multi-Worktree | High | Isolated `./trees/` worktrees |

### Quality Gates

Claude gets picky so you don't have to be. Every task passes through a test runner, code reviewer, and security auditor before you see it. If a gate fails, work returns to the code agent automatically -- up to three iterations before escalating to you.

You never see half-finished work.

Full gate details: [docs/quality-gates.md](docs/quality-gates.md)

### Auto-Formatting

A PostToolUse hook formats code on every file write. It detects your project's formatter automatically -- Prettier, Biome, ESLint, Pint, Ruff, Black, gofmt, rustfmt, RuboCop, and more. Formatting issues never reach the quality gates.

Full formatter list: [docs/auto-formatting.md](docs/auto-formatting.md)

### Agents

20+ specialized agents. You never hire them directly -- the orchestrator dispatches the right ones based on task complexity, type, and phase. Planners, developers, reviewers, security auditors, incident responders, and more.

Full agent catalog: [docs/agents.md](docs/agents.md)

### Workflow

The full orchestration lifecycle -- from `/reaper:flight-plan` through quality gates to `/reaper:ship` -- documented step by step with examples.

Full workflow: [docs/workflow.md](docs/workflow.md)

### All Commands

Every slash command, flag, and option in one place.

Command reference: [docs/commands.md](docs/commands.md)

---

## Contributing

Fork it. Make it weird. We are into it.

Want to contribute back? Open an issue, show us what you have got. If it fits how we work, we will pull it in.

**How we roll**:

- TDD first (Red-Green-Refactor)
- SOLID principles
- Conventional commits with task reference
- 70%+ test coverage

Full standards: [docs/spice/SPICE.md](docs/spice/SPICE.md)

Take it somewhere we would never expect. We are flattered either way.

---

## License

MIT License -- Copyright (c) 2025 Spice Labs. See [LICENSE](LICENSE) for details.
