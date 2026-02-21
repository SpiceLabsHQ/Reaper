<p align="center">
  <img src="assets/reaper-banner.png" alt="Reaper" width="500">
  <br><br>
  <a href="https://github.com/SpiceLabsHQ/Reaper/actions/workflows/test.yml"><img src="https://github.com/SpiceLabsHQ/Reaper/actions/workflows/test.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <a href="CHANGELOG.md"><img src="https://img.shields.io/badge/version-1.11.0-orange.svg" alt="Version"></a>
</p>

**Ground control for your codebase.**

Reaper is a Claude Code plugin that turns Claude into a caffeine-addicted air traffic controller for your development workflow. It coordinates specialized agents -- planners, developers, reviewers, security auditors -- through mandatory quality gates so you never see half-finished work.

**Zero-touch development**: Describe what you want, approve the plan, and walk away. Come back to tested, reviewed, gate-passed code ready for your sign-off.

> Built for Spice Labs. Shared because why not.

## Installation

**Prerequisites**: [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) · Node.js 22+

```bash
claude plugin marketplace add SpiceLabsHQ/claude-marketplace
claude plugin install reaper@spice-labs
```

---

## See It Fly

A single command kicks off the full arc -- planning, implementation, testing, review, and security audit -- without you lifting a finger.

```
> /reaper:takeoff Add rate limiting - 100 req/min per IP, Redis-backed

 workflow-planner    Strategy: medium-branch -> feature/rate-limiting
 feature-developer   Created middleware, Redis store, config, 14 tests (TDD)
 test-runner         42 tests passed . 94% coverage . lint clean
 sme-reviewer        SOLID  . no issues
 security-auditor    OWASP  . no secrets . no vulnerabilities

  5 files changed . 14 tests added . 3 quality gates passed
  Ready for your review. Say "ship it" when you're happy.
```

*Stylized output. Actual formatting varies by terminal and task complexity.*

---

> **New to Reaper?** Run `/reaper:start` — it'll ask what you're trying to do and point you to the right command.

## Core Commands

Each builds on the last.

### The engine: `/reaper:takeoff`

Give Reaper a well-scoped task and walk away.

Hand it a task ID or a plain description -- Reaper selects the right agents, creates a worktree, writes code test-first, and runs every quality gate before presenting finished work.

```
> /reaper:takeoff PROJ-42

 Picking up task: "Add webhook retry with exponential backoff"
 Strategy: medium-branch -> feature/PROJ-42-webhook-retry
 Working... (agents will report when all gates pass)
```

You review. You approve. That is it.

When you know exactly what to build, takeoff is all you need. Most of the time, you will want a plan first.

### Start most work here: `/reaper:flight-plan`

Describe what you want and Reaper breaks it into takeoff-sized tasks.

Give it a feature, a problem, or a goal -- Reaper decomposes it into parallelizable work units with dependency mapping. After your approval, issues are created in your task system (Beads, Jira, or markdown fallback) and each unit is ready for `/reaper:takeoff`.

```
> /reaper:flight-plan Add user notification preferences with email, SMS, push

 Flight plan ready -- 3 work units, 2 parallelizable:
  1. PROJ-50  Notification dispatcher service
  2. PROJ-51  Preferences API + storage        (parallel with 1)
  3. PROJ-52  Preferences dashboard UI          (blocked by 2)

  Approve this plan? Issues will be created in Beads.
```

Approve the plan, run `/clear` for fresh context, then `/reaper:takeoff PROJ-50` to start executing.

When the decision itself is what matters, call in the experts before you plan.

### Think before you plan: `/reaper:squadron`

A deliberation forum for architecture, research, and hard trade-offs.

Token-heavy by design -- use when getting the decision wrong costs more than getting it slow. Reaper assembles domain experts relevant to your question, has each deliver a position, surfaces tensions between them, and routes debate toward convergence.

```
> /reaper:squadron Should we migrate from REST to GraphQL?

 Squadron assembled -- 4 domain experts:
  API DESIGNER . DATABASE ARCHITECT . FRONTEND ARCHITECT . PERFORMANCE ENGINEER

 Positions delivered. Tensions identified. Routing debate...
 Converged: 3 decisions for your review, 1 unresolved trade-off.

  Ready for your input.
```

You get structured recommendations and explicit trade-offs, not a vague summary. Feed the output into a `/reaper:flight-plan` when you are ready to act on it.

### When it is ready: `/reaper:ship`

Commit, push, and open a pull request for a completed worktree.

After `/reaper:takeoff` finishes and you have reviewed the output, hand the worktree path to `/reaper:ship`. It runs the pre-commit hook, creates a conventional commit with the task reference, pushes the branch, and opens a PR -- all in one step.

```
> /reaper:ship ./trees/PROJ-42-webhook-retry

 Committing: feat(webhooks): add retry with exponential backoff
 Pushing feature/PROJ-42-webhook-retry
 PR opened: github.com/org/repo/pull/88

  Done. Worktree cleaned up.
```

Use `/reaper:status-worktrees` at any point to see which worktrees are active and what state each one is in.

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

Claude gets picky so you don't have to be. Every task passes through a test runner, a work-type-matched SME code reviewer, and a security auditor before you see it. If a gate fails, work returns to the code agent automatically -- up to three iterations before escalating to you.

You never see half-finished work.

Full gate details: [docs/quality-gates.md](docs/quality-gates.md)

### Auto-Formatting

A PostToolUse hook formats code on every file write. It detects your project's formatter automatically -- Prettier, Biome, ESLint, Pint, Ruff, Black, gofmt, rustfmt, RuboCop, and more. Formatting issues never reach the quality gates.

Full formatter list: [docs/auto-formatting.md](docs/auto-formatting.md)

### Customization

To disable Reaper's ASCII art and box-drawing output, add the line `Reaper: disable ASCII art` to your target project's `CLAUDE.md` -- Reaper will fall back to plain text status labels everywhere.

### Agents

24 specialized agents. You never hire them directly -- the orchestrator dispatches the right ones based on task complexity, type, and phase. Planners, developers, reviewers, security auditors, incident responders, and more.

Full agent catalog: [docs/agents.md](docs/agents.md)

### Skills

8 reusable behavior modules that agents load at runtime. Skills handle code review (routing to work-type-matched SME reviewers), workflow planning, and issue tracker integration across Beads, Jira, GitHub Issues, and local plan files. You never invoke skills directly -- agents and commands load them automatically.

Full skill catalog: [docs/skills.md](docs/skills.md)

### Workflow

The full orchestration lifecycle -- from `/reaper:flight-plan` through quality gates to `/reaper:ship` -- documented step by step with examples.

Full workflow: [docs/workflow.md](docs/workflow.md)

### All Commands

Every slash command, flag, and option in one place.

Command reference: [docs/commands.md](docs/commands.md)

---

## Is This For You?

Reaper is for developers who ship features, not snippets. If you are building production systems, solving architectural problems, or running a team that needs consistent quality -- this is your tool.

If you need Claude to fix a typo or bang out a quick script, you do not need an air traffic controller. Just talk to Claude directly.

### The token conversation

Reaper's subagent architecture spins up focused agents for each phase of work. Each agent boots with its own context -- that costs tokens upfront. For a small bug fix, that overhead is not worth it. For a real work package -- a feature with tests, review, and security audit -- focused agents produce better results *and* avoid the context bloat that tanks quality in long single-agent sessions.

More tokens per task. Fewer tasks that need to be redone. That is the tradeoff.

### Claude Code Max recommended

Reaper is built for [Claude Code Max](https://www.anthropic.com/pricing) subscribers. The orchestration patterns -- multiple agents, quality gate loops, retry cycles -- consume tokens at a pace that Max handles comfortably.

Our team has never hit a usage limit while using this tool. Your mileage may vary.

**Pro plan users**: Reaper works, but your usage limits will feel it. A single `/reaper:takeoff` on a medium-complexity task can consume a meaningful chunk of your daily quota. You will get the most out of it by being deliberate about which tasks justify the orchestration overhead.

### What you get that raw Claude Code does not

- **Auditability** -- Every piece of code passes through documented quality gates. You can show the receipt.
- **Consistency** -- TDD, SOLID principles, and security audit on every task. Not just when someone remembers.
- **Steerability** -- You approve the plan. You approve the output. You control the process. It is not a black box.

This is not always the most token-efficient way to write code. It is the most *reliable* way to get code that is ready for production.

---

## Contributing

Fork it. Make it weird. We are into it.

Want to contribute back? Open an issue, show us what you have got. If it fits how we work, we will pull it in.

**How we roll**:

- TDD first (Red-Green-Refactor)
- SOLID principles
- Conventional commits with task reference
- 70%+ test coverage

Reaper develops itself using its own workflow: every feature and fix starts with `/reaper:flight-plan` to break the work into tracked tasks, gets executed via `/reaper:takeoff`, and lands only after passing the full quality gate sequence -- test runner, SME code reviewer, and security auditor. If it is good enough to ship your code, it is good enough to ship its own.

Take it somewhere we would never expect. We are flattered either way.

---

## License

MIT License -- Copyright (c) 2025 Spice Labs. See [LICENSE](LICENSE) for details.
