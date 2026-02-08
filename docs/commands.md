# Command Reference

All commands are invoked inside Claude Code using the `/reaper:command-name` syntax.

[Back to README](../README.md)

---

## /reaper:start

**Not sure where to start? This command helps you find the right workflow.**

The on-ramp for new users and anyone unsure which Reaper workflow fits their situation. Start either guides you through a visual menu of the three workflows or classifies your input and recommends the best match. It never executes work itself -- it routes you to the right command.

### Usage

```
/reaper:start
/reaper:start reaper-a3f
/reaper:start Should we migrate from REST to GraphQL?
/reaper:start Implement user notifications with email and push support
```

### Input

Start operates in two modes depending on whether you provide input:

- **No input** -- Shows the three Reaper workflows (squadron, flight-plan, takeoff) and presents an interactive choice. Use this when you are not sure which workflow to pick.
- **With input** -- Classifies your input and recommends the best workflow. Accepts task IDs, design questions, feature descriptions, or any free-text description of what you want to do.

### What happens

**Mode 1 -- Bare invocation** (`/reaper:start` with no arguments):

1. **Runway Card.** Renders a visual card showing the three workflows -- squadron, flight-plan, and takeoff -- with descriptions and how they connect to each other.
2. **Interactive choice.** Presents three options: "I have a design question" (routes to squadron), "I have a feature to plan" (routes to flight-plan), and "I have a task to build" (routes to takeoff).
3. **Delegation.** Invokes the selected command with no arguments. The downstream command prompts you for its own input.

**Mode 2 -- Input classification** (`/reaper:start <input>`):

1. **Deterministic classification.** Applies a heuristic in priority order: task ID patterns (like `PROJ-123`, `reaper-a3f`, or `#456`) route to takeoff; design keywords (architecture, design, decision, migrate, strategy, trade-off, "should we", compare) route to squadron; everything else routes to flight-plan.
2. **Input Analysis Card.** Renders a visual card showing your input quoted back, key elements extracted from it, and the routing factors that determined the recommendation.
3. **Recommendation with override.** Presents all three workflows with the recommended option marked and listed first. Option descriptions explain why each workflow fits or does not fit your input.
4. **Delegation.** Invokes the selected command, passing your original input as arguments so the downstream command has context.

Start always delegates to the selected command -- it never executes downstream logic itself.

---

## /reaper:takeoff

**Dispatch agents through quality gates until work lands on your desk.**

Give Reaper a task and walk away. This is the command you use 90% of the time. It handles planning, implementation, testing, code review, and security audit autonomously -- looping on failures until every quality gate passes -- then presents finished work for your sign-off.

### Usage

```
/reaper:takeoff PROJ-123
/reaper:takeoff reaper-a3f
/reaper:takeoff Implement rate limiting - 100 req/min per IP, Redis-backed
/reaper:takeoff PROJ-123: Fix login bug where email validation fails for plus signs
```

### Input

Takeoff accepts any combination of:

- **Task ID** -- Jira (`PROJ-123`) or Beads (`reaper-a3f`) identifier. Reaper fetches the issue details automatically.
- **Description** -- Free-text description of the work. Must be more than 10 characters if no task ID is provided.
- **Both** -- A task ID enriched with additional context. Fetched details and your description are combined.

Vague inputs like "fix bug" are rejected. Either provide a task ID or a detailed description.

### What happens

1. **Task system detection.** Reaper checks for Beads (`.beads/` directory) or Jira (`acli` CLI), falling back to markdown-only mode if neither is found.
2. **Plan file discovery.** Searches `.claude/plans/` for a matching plan from a prior `/reaper:flight-plan` session. If found, it skips planning and uses the existing work breakdown.
3. **Pre-planned detection.** If the task already has child issues with acceptance criteria (from flight-plan), Reaper extracts the full dependency tree and skips the planner.
4. **Planning.** When no plan exists, Reaper deploys `reaper:workflow-planner` to analyze the task, select a complexity strategy, and decompose into work units.
5. **Work package validation.** Each unit is capped at 5 files, 500 lines, and 2 hours. Oversized packages are split.
6. **Execution loop.** For each work unit:
   - Deploys the appropriate coding agent (`reaper:feature-developer`, `reaper:bug-fixer`, or `reaper:refactoring-dev`)
   - Classifies the changeset and selects a gate profile
   - Runs quality gates (test-runner, code-reviewer, security-auditor for application code; different agents for infrastructure, database, or prompt work)
   - Auto-iterates on failures up to per-gate retry limits
   - Commits on each gate pass for restore points
7. **Presentation.** Completed work is presented with a summary of what was built, which gates passed, and how to test it.

Takeoff works autonomously through the full cycle without asking permission at each step. It only stops to present finished work and ask for your review.

### Strategies

Takeoff selects a strategy based on the number of work units:

| Work units | Strategy | Behavior |
|------------|----------|----------|
| 1 | `very_small_direct` | Single agent, no worktree isolation |
| 2--4 | `medium_single_branch` | Sequential or parallel agents on one branch |
| 5+ | `large_multi_worktree` | Each agent gets its own worktree, merged at the end |

### Quality gate profiles

Different file types trigger different gate agents:

| Work type | Gate 1 (blocking) | Gate 2 (parallel) |
|-----------|-------------------|-------------------|
| Application code | test-runner | code-reviewer, security-auditor |
| Infrastructure config | validation-runner | security-auditor |
| Database migrations | validation-runner | code-reviewer |
| Agent prompts | -- | ai-prompt-engineer, code-reviewer |
| Documentation | -- | code-reviewer |

Mixed changesets run the union of all matching profiles.

### After completion

Reaper presents a "Touchdown" summary and waits for your response:

| Your response | What happens |
|---------------|--------------|
| Feedback or questions | Reaper addresses concerns, re-runs gates if changes are made |
| "looks good" | Reaper asks to confirm merge |
| "merge" / "ship it" | Reaper merges to the target branch |

---

## /reaper:flight-plan

**Chart work into flight-ready issues with dependencies mapped.**

For work that spans multiple files, concerns, or days. Flight-plan assembles a squadron of research agents, produces a structured work breakdown, and creates issues in your task system -- all before any code is written.

### Usage

```
/reaper:flight-plan Implement user notifications with email, SMS, and push support.
                    Include preferences dashboard for users to manage settings.
/reaper:flight-plan PROJ-123
```

### Input

- **Description** -- Detailed description of the work (minimum 20 characters).
- **Existing epic ID** -- A Jira or Beads issue to decompose. Must have no existing children.

### What happens

1. **Task system detection.** Same as takeoff -- checks for Beads, Jira, or falls back to markdown-only mode.
2. **Codebase research.** Launches parallel Explore agents to investigate affected files, architecture patterns, module dependencies, and integration points.
3. **Work decomposition.** Analyzes the request and research findings to produce work units, each constrained to 5 files, ~500 lines, and 1--2 hours. Every unit follows TDD methodology (tests before implementation).
4. **Plan file creation.** Writes a structured plan to `.claude/plans/reaper-[semantic-name].md` containing input, research, work units, dependencies (as a Mermaid flowchart), and assumptions.
5. **Flight briefing.** Presents a summary with work unit count, critical path, parallelization percentage, and key assumptions. Asks for approval.
6. **Iterative refinement.** If you request changes, Reaper updates the plan and re-presents. The flow is conversational, not an interview.
7. **Issue creation.** After approval, creates an epic and child issues in Beads or Jira with TDD-structured descriptions and dependency relationships.
8. **Verification.** Deploys `reaper:workflow-planner` as a verification subagent to confirm all issues meet orchestratability criteria (clear scope, acceptance criteria, correct dependencies, no circular blockers).

In markdown-only mode (no task system detected), the plan file itself becomes the deliverable.

### Output

A plan file at `.claude/plans/reaper-[name].md` and (if a task system is available) a set of issues ready for execution.

### Transition to execution

After flight-plan completes, clear context and execute:

```
/clear
/reaper:takeoff TASK-ID
```

Takeoff reads the plan file directly, skipping redundant planning.

---

## /reaper:squadron

**Assemble domain experts for collaborative design deliberation.**

A deliberation forum of specialist agents. Best for architecture decisions, technology choices, and complex trade-offs where getting the design wrong costs more than getting it slow. Token-heavy by design.

### Usage

```
/reaper:squadron Should we migrate from REST to GraphQL?
/reaper:squadron Design authentication architecture for multi-tenant SaaS
/reaper:squadron Build a multi-tenant SaaS billing system with usage-based pricing
                 and Stripe integration
```

### Input

A concept description (minimum 20 characters) describing the design question or architectural challenge.

### What happens

1. **Panel selection.** Reaper analyzes the concept against a keyword table spanning 14 domains (API design, database, cloud infrastructure, security, event-driven architecture, frontend, observability, and more). Every topic area gets at least 3 expert agents who can speak to it.
2. **Explore-first recon.** Before deploying domain experts, Reaper sends Explore agents to gather codebase facts. Narrow concepts (1--2 domains) get a single focused Explore agent; broad concepts (3+ domains) get parallel Explore agents scoped per domain. Experts receive the compiled findings so they spend their context windows on analysis, not file reads.
3. **Open phase.** Each expert delivers an independent 300-word position: their take, key decisions, tensions with other panelists, domain-specific risks.
4. **Clash phase.** The facilitator routes disagreements directly to the conflicting experts. They respond to each other by name in 3--5 sentence exchanges. Up to 2 clash cycles.
5. **Converge phase.** The facilitator synthesizes the debate as a narrative for you -- who said what, where the panel locked in, where it split. Unresolved tensions become decision points presented with concrete options.
6. **Iteration.** Based on your decisions, affected experts refine their positions. New experts can join mid-session with a compressed summary. Fundamental direction changes trigger a full panel reset.
7. **Handoff.** When you're satisfied, Reaper compiles a squadron brief (executive summary, design decisions, architecture overview, technical specs by domain, risks, implementation notes) and offers to hand it directly to `/reaper:flight-plan`.

### Expert agents

Squadron draws from the full Reaper agent roster. Selection is automatic based on concept keywords:

| Domain | Agent | Triggered by |
|--------|-------|-------------|
| API Design | api-designer | api, endpoint, rest, graphql, webhook, grpc |
| Database | database-architect | database, schema, migration, sql, nosql, sharding |
| Cloud | cloud-architect | cloud, aws, gcp, azure, kubernetes, terraform |
| Security | security-auditor | auth, oauth, jwt, encryption, compliance, rbac |
| Event-Driven | event-architect | event, kafka, rabbitmq, cqrs, saga, pub/sub |
| Frontend | frontend-architect | ui, react, vue, component, state management, ssr |
| Performance | performance-engineer | latency, cache, bottleneck, load test, throughput |
| Observability | observability-architect | monitoring, alerting, slo, tracing, metrics |
| Data | data-engineer | etl, pipeline, data warehouse, streaming, dbt |
| Testing | test-strategist | test pyramid, contract testing, e2e, chaos |
| Compliance | compliance-architect | gdpr, hipaa, pci, soc2, data residency |
| Deployment | deployment-engineer | ci/cd, blue-green, canary, rollback |
| Integration | integration-engineer | third-party, stripe, external api |
| Resilience | incident-responder | circuit breaker, blast radius, disaster recovery |

Non-Reaper agents (from other plugins or built-in types) are also candidates when relevant.

### Facilitator voice

The facilitator runs the session in two registers. When addressing experts: sharp, clipped, by capitalized job title. When turning to you: narrative, quoting experts directly, telling the story of where the debate went rather than listing bullets.

---

## /reaper:ship

**Fast-path from worktree to PR -- commit, push, open.**

The "last mile" command. Takes uncommitted work in a worktree, generates conventional commits, pushes to remote, and opens a pull request. No quality gates -- use this when gates already passed through takeoff, or when you want to ship without the full pipeline.

### Usage

```
/reaper:ship
/reaper:ship ./trees/PROJ-123-work
/reaper:ship ./trees/PROJ-123-work main
```

### Arguments

| Position | Meaning | Default |
|----------|---------|---------|
| 1 | Worktree path | Auto-detected (session context, cwd, or single worktree under `./trees/`) |
| 2 | Target branch | `develop` |

If multiple worktrees exist and none is specified, Reaper lists them and asks which one to ship.

### What happens

1. **Worktree resolution.** Checks session context, current directory, explicit argument, then auto-detects from `./trees/`.
2. **Validation.** Confirms the path is a valid git worktree, the branch is not protected (`main`, `master`, `develop`), and there is something to commit or push.
3. **Task ID extraction.** Parses the worktree directory name for Jira (`PROJ-123`), Beads (`reaper-a3f`), or GitHub issue (`issue-456`) patterns. Used in commit footers and PR body.
4. **Repo host detection.** Reads the git remote URL to determine GitHub, Bitbucket, GitLab, or Azure DevOps.
5. **Commit.** Analyzes the diff, generates conventional commit messages with task references. Multiple logical changes get separate commits.
6. **Push.** Pushes the branch with `-u` to set upstream tracking. Retries up to 3 times on failure.
7. **PR creation.** Creates a pull request using the appropriate CLI tool (`gh` for GitHub, `acli` or REST API for Bitbucket, `glab` for GitLab). Falls back to push-only with a manual PR URL for unsupported hosts.

### What ship does NOT do

- Run quality gates (use takeoff for that)
- Merge to the target branch (PR review is required)
- Clean up the worktree (cleanup happens post-merge)
- Modify code (commits what exists as-is)

---

## /reaper:status-worktrees

**Radar sweep your parallel worktrees for progress and drift.**

Monitor progress across isolated worktrees. Shows implementation status, uncommitted changes, branch divergence, and commit compliance for every active worktree.

### Usage

```
/reaper:status-worktrees
/reaper:status-worktrees PROJ-123
/reaper:status-worktrees reaper-42
```

### Arguments

| Position | Meaning | Default |
|----------|---------|---------|
| 1 | Task ID filter | All worktrees |

### Output

For each worktree under `./trees/`:

- **Task ID** extracted from directory name
- **Branch** name
- **Implementation status** -- completed (has `RESULTS.md`) or in progress
- **Changes** -- count of staged, unstaged, and untracked files
- **Last commit** -- hash, subject, and relative time
- **Commit compliance** -- whether the latest commit references the task ID

Summary statistics include total worktree count, per-task breakdown with completion counts, and overall completion percentage.

Branch status shows ahead/behind counts relative to the remote for each worktree.

Must be run from the main repository, not from inside a worktree.

---

## /reaper:claude-sync

**Surface changes since CLAUDE.md last touched down.**

Analyzes git commits since `CLAUDE.md` was last modified and identifies changes that should be documented for LLM context. Deploys four parallel analysis agents, each focused on a different dimension of change.

### Usage

```
/reaper:claude-sync
```

### What happens

1. **Baseline detection.** Finds the last commit that modified `CLAUDE.md`. If no `CLAUDE.md` exists, analyzes the last 30 days of commits.
2. **Commit extraction.** Gathers detailed commit logs with file changes and statistics from the baseline to HEAD.
3. **Parallel analysis.** Launches four specialized agents simultaneously:
   - **Architecture analyzer** -- Framework migrations, design pattern changes, structural refactoring, database architecture shifts.
   - **Environment analyzer** -- Feature flags, environment-specific behavior, Docker/container changes, CI/CD modifications.
   - **Workflow analyzer** -- Custom build processes, testing requirements, deployment workflows, git workflow changes, development constraints.
   - **Integration analyzer** -- Third-party service integrations, webhook patterns, authentication flows, rate limiting, non-standard dependencies.
4. **Report.** Aggregates findings into a prioritized report with suggested `CLAUDE.md` content for each finding.

### Filtering philosophy

Every finding is tested against two questions:

1. **Critical?** Would an LLM agent make mistakes without this knowledge?
2. **Non-obvious?** Can this be discovered by reading current files with available tools?

Both must be "yes" to recommend documentation. Standard dependencies, normal refactoring, and bug fixes are excluded.

### After the report

Reaper offers to apply high-priority suggestions directly to `CLAUDE.md`, create directory-specific documentation files for complex areas, or commit the updates.

---

[Back to README](../README.md)
