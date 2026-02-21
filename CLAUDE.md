# CLAUDE.md

This file guides **Reaper development**. **Output boundary**: generated content for target projects must use general software development best practices — not Reaper internals.

## What is Reaper?

Reaper is a Claude Code plugin that orchestrates specialized AI agents for autonomous software development. It implements TDD-first workflows with mandatory quality gates, worktree isolation, and conventional commits.

### Agent Roles

See global CLAUDE.md for role detection. Main agents use the Agent Selection Matrix below; subagents follow TDD (Red/Green/Blue).

## The Five Keys

These are **Reaper's internal design values**. They guide every decision in Reaper's own development, from architecture to error messages. All five matter. The ordering only applies when values conflict — defer to the higher key.

> **Scope**: The Five Keys shape how Reaper is built. They must NOT be imposed on target projects through generated prompts, agent instructions, or command output. Target projects have their own values and conventions.

**1. Correctness** — Quality is non-negotiable. Tests pass, gates hold, code works. When speed conflicts with correctness, correctness wins. Every time.

**2. Transparency** — Show your work. Make state visible, explain decisions, surface errors clearly. No magic, no silent failures. Developers should always know what happened and why.

**3. Craft** — Every interaction should feel considered. Helpful errors, sensible defaults, zero unnecessary friction. Polish isn't vanity — it's respect for the developer's time.

**4. Conviction** — Be opinionated. Strong defaults guide developers toward the pit of success. Provide escape hatches, not blank canvases. When the tool knows better, it should lead.

**5. Fun** — This tool has a voice. Themed commands spark personality, power features reward the curious, and visible progress celebrates your wins. Developer tooling doesn't have to be joyless.

### Where Voice Applies

| Context | Voice |
|---------|-------|
| User-facing commands/skills | Personality and themed language encouraged |
| Agent prompts | Clinical, precise, no personality |
| Generated output for target projects | Neutral best practices only |

## Agent Selection Matrix (Main Agents Only)

Use specialized agents for all development work. Subagents: skip this section.

| Task Type | Agent | When to Use |
|-----------|-------|-------------|
| Planning | `reaper:workflow-planner` | 3+ steps, multi-component features, parallel work analysis |
| Bug Fixing | `reaper:bug-fixer` | All bug reports and issues |
| New Features | `reaper:feature-developer` | All new functionality |
| Git Operations | `reaper:branch-manager` | Worktree setup, merges, cleanup |
| Testing | `reaper:test-runner` | Quality validation (mandatory before merge) |
| Code Review | SME via code-review skill (automatic) | Work-type-matched reviewer; see gate profile table |
| Security | `reaper:security-auditor` | Security analysis |

**Workflow phases:**
1. **Plan** (mandatory for 3+ steps): `reaper:workflow-planner`
2. **Implement**: `reaper:bug-fixer` or `reaper:feature-developer`
3. **Validate** (mandatory): `reaper:test-runner` then SME reviewer (via code-review skill) + `reaper:security-auditor`
4. **Integrate**: `reaper:branch-manager` for safe merge to develop

## Safety Rules

- Always work in `./trees/` worktrees — never work directly in the root directory
- Always request explicit user approval before merging to `main`
- Always let hooks run to completion — never skip them (`--no-verify`, `HUSKY=0`)
- Always use real task IDs from `bd list` and report actual test results — never fabricate either
- Always edit source templates in `src/` — never edit generated files directly
- Always read source files before modifying them — verify paths exist before referencing them
- Never set environment variables inline with commands (use subshells instead)

The user, and only the user, may override any of these rules explicitly.

### Workflow & Commands (Main Agent / Human)

Typical flow: `flight-plan` -> approve -> `/clear` -> `takeoff`

| Command | Purpose |
|---------|---------|
| `/reaper:start [desc]` | Orientation / getting started |
| `/reaper:flight-plan <desc>` | Plan with work breakdown |
| `/reaper:takeoff <TASK-ID\|desc>` | Execute task autonomously |
| `/reaper:ship <worktree>` | Commit, push, open PR |
| `/reaper:squadron <question>` | Collaborative design session |
| `/reaper:status-worktrees` | Check worktree status |
| `/reaper:claude-sync` | Suggest CLAUDE.md updates |
| `/reaper:configure-quality-gates` | Detect runners, write QG section |

Takeoff auto-fetches details: Beads (`reaper-xxx`) via `bd show`, Jira (`PROJ-123`) via `acli jira workitem view`. Description-only also works.

### Commit Standards

Commits are enforced by commitlint with Beads reference requirement:

```
<type>(<scope>): <subject>    # max 72 chars

<body>

Ref: reaper-xxx               # Required for non-chore commits
```

**Types:** feat, fix, docs, style, refactor, perf, test, chore, ci

Use `bd list` to find issue IDs, or `bd create` to create one.

### Testing & Quality

- 70%+ coverage required (untestable plumbing excluded via `node:coverage disable`)
- All tests run in worktrees (`./trees/`), never in root
- Run linting before every commit (enforced by husky)
- Quality gates: reaper:test-runner → SME reviewer (via code-review skill) + reaper:security-auditor
- Prompt quality gate: always run `reaper:ai-prompt-engineer` after modifying agents, skills, commands, hooks, or partials (see Workflow for Editing Agents/Skills step 4)
- Self-learning: recurring quality gate failures surface as CLAUDE.md update candidates
- Auto-formatting: PostToolUse hook formats code on every write/edit (detects Prettier, Biome, ESLint, Pint, PHP-CS-Fixer, Ruff, Black, gofmt, rustfmt, RuboCop, and more)
- Prefer SOLID principles (single responsibility, dependency injection, interface segregation) in all application code
- Mock all external services in tests — no real API calls
- Favor integration tests over unit tests; reserve unit tests for complex pure functions and hard-to-trigger edge cases

### Environment Requirements

- **Node.js 22+** (LTS) required for coverage threshold enforcement
- Test file lists are explicit (not glob-based) for cross-platform CI compatibility
- When adding test files: update `package.json` scripts AND `.github/workflows/test.yml`

### Branch-Manager Constraints (enforced by contract tests)

- Merges use temp worktree (`./trees/[TASK_ID]-integration`), never `git checkout` in root (ADR-0014)
- Stop-and-report on unexpected state; never self-remediate or bypass hooks (Protocols #7-#11)
- Takeoff reuses branch-manager sessions via `Task --resume`; do not redeploy fresh per commit

### Worktree Isolation

All work in `./trees/` worktrees, never root. Prefer `reaper:branch-manager` for setup/teardown.

Manual fallback:
```bash
git worktree add ./trees/TASK-ID-desc -b feature/TASK-ID-desc develop
git -C ./trees/TASK-ID-desc status
(cd ./trees/TASK-ID-desc && npm test)
git worktree remove ./trees/TASK-ID-desc
```

## Project Structure

```
src/             # SOURCE TEMPLATES - Edit files here
  agents/        # Agent EJS templates
  commands/      # Orchestration command EJS templates (flight-plan, takeoff, ship, etc.)
  skills/        # Skill EJS templates and static assets (worktree-manager, issue-tracker-*)
    worktree-manager/
      scripts/   # Shell scripts (copied verbatim by build)
    issue-tracker-github/
      scripts/   # Shell scripts (copied verbatim by build)
  hooks/         # Hook templates
  partials/      # Shared EJS partials

agents/          # GENERATED from src/agents/
commands/        # GENERATED from src/commands/
skills/          # GENERATED from src/skills/ (worktree-manager, issue-tracker-*)
hooks/           # GENERATED from src/hooks/

scripts/         # Build tooling
docs/            # User-facing documentation (agents, commands, workflow, quality gates, auto-formatting)
```

### Documentation Maintenance

When changing agents, commands, gates, formatters, or workflow, update the corresponding doc in `docs/` and `README.md`. Run `/reaper:claude-sync` to detect gaps.

## Template Build System

This project uses an EJS template build system. Generated files live at the project root (not in `dist/`).

Edit source in `src/` only. Root-level `agents/`, `commands/`, `skills/`, `hooks/` are generated — never edit directly.

### Build Commands

```bash
npm run build        # Compile all templates to project root
npm run build:watch  # Watch mode for development
```

### Dev Launcher

`claude_dev` is a permanent dev tool for testing Reaper as a plugin locally. It launches Claude Code with the repo loaded as a plugin and permissions bypass available (but not forced):

```bash
./claude_dev                  # Interactive session with Reaper loaded
./claude_dev -p "prompt"      # Non-interactive with Reaper loaded
```

Do not delete this file — it is intentional project tooling, not a leftover artifact.

### Workflow for Editing Agents/Skills

1. **Edit the source template** in `src/` (e.g., `src/agents/bug-fixer.ejs`)
2. **Run build**: `npm run build`
3. **Review all build output for side effects**: Run `git diff agents/ commands/ skills/ hooks/` to inspect every generated file that changed — not just the intended target. Partials are shared; a single partial change can propagate to many tools. For each file that changed unexpectedly:
   - Read the diff and determine whether the change is correct and intentional
   - If the side effect is benign or easily corrected, fix it before continuing
   - **If a side effect cannot be easily compensated for, stop immediately and alert the user** — do not proceed to commit
   - **When renaming or replacing an agent/skill reference in a command**: search all `src/partials/` for the old name — partials are included by multiple commands and may carry stale references that survive a command-only edit
4. **Run prompt review**: Always run `reaper:ai-prompt-engineer` as a quality gate after modifying any agent, skill, command, hook, or partial template. This agent audits prompts for anti-patterns, token waste, and model-specific best practices.
5. **Commit both** source and generated files

The pre-commit hook automatically runs the build and stages generated files.

### User-Invocable Commands

Orchestration commands (start, flight-plan, takeoff, ship, squadron, status-worktrees, claude-sync) are user-invocable via `/reaper:*` syntax. They are defined in `src/commands/` with `user-invocable: true` in their frontmatter.

### Partials (Shared Content)

Common sections in `src/partials/*.ejs`. Include via: `<%- include('partials/output-requirements', { isReviewAgent: true }) %>`. Parameters vary by partial — check the partial source for available options.

Key parameterized partials: `visual-vocabulary` (by context: takeoff, ship, status-worktrees, flight-plan, squadron, start, functional; respects `Reaper: disable ASCII art` opt-out), `output-requirements` (by agent type), `tdd-testing-protocol`, `quality-gate-protocol`.

## Beads Issue Tracking

This project uses Beads for lightweight git-based issue tracking:

```bash
bd list                    # List all issues
bd show reaper-xxx         # View issue details
bd create "Title"          # Create new issue
bd update reaper-xxx --status "In Progress"
bd close reaper-xxx        # Mark complete
bd sync                    # Sync with git remote
```

**Before starting work:** Run `bd show reaper-xxx` to read the issue details and update status to "In Progress". **After merge to develop:** Update to "In Review" and add a completion comment.

## Quality Gates

The following commands are used during automated quality gates:

**Test command**: `npm run test:coverage`
**Lint command**: `skip`

## Reference

### Agent Categories

| Category | Agents |
|----------|--------|
| Planning | reaper:workflow-planner, reaper:api-designer, reaper:cloud-architect, reaper:database-architect, reaper:event-architect, reaper:observability-architect, reaper:frontend-architect, reaper:data-engineer, reaper:test-strategist, reaper:compliance-architect |
| Development | reaper:feature-developer, reaper:bug-fixer, reaper:refactoring-dev, reaper:branch-manager |
| Quality | reaper:test-runner, reaper:security-auditor, reaper:performance-engineer (Gate 2 code review uses SME routing via code-review skill) |
| Ops | reaper:deployment-engineer, reaper:integration-engineer, reaper:incident-responder |
| Craft | reaper:technical-writer, reaper:claude-agent-architect, reaper:ai-prompt-engineer, reaper:principal-engineer |

### Agent Naming Convention

When referencing Reaper agents in Task tool calls, use the fully qualified name with the `reaper:` prefix:

```bash
# Correct
Task --subagent_type reaper:workflow-planner

# Incorrect
Task --subagent_type workflow-planner
```

This prefix is required because Reaper is a Claude Code plugin, and plugin agents must be namespaced.

### Quick Reference (Subagent Launching)

```bash
# Planning (mandatory for 3+ steps)
Task --subagent_type reaper:workflow-planner \
  --prompt "TASK: reaper-a3f, DESCRIPTION: Analyze feature for parallel work opportunities"

# Bug fix
Task --subagent_type reaper:bug-fixer \
  --prompt "TASK: reaper-b2e, DESCRIPTION: Fix null pointer in payment processing"

# Feature
Task --subagent_type reaper:feature-developer \
  --prompt "TASK: reaper-c4d, DESCRIPTION: Add user profile API with validation"

# Worktree setup
Task --subagent_type reaper:branch-manager \
  --prompt "TASK: reaper-a3f, WORKTREE: ./trees/reaper-a3f-oauth, DESCRIPTION: Create worktree"

# Quality (mandatory before merge)
Task --subagent_type reaper:test-runner \
  --prompt "TASK: reaper-a3f, WORKTREE: ./trees/reaper-a3f-oauth, DESCRIPTION: Run full suite"
# Gate 2 SME dispatch (with skill injection) is automated by takeoff — do not construct manually.
```
