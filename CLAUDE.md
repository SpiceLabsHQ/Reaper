# CLAUDE.md

This file provides guidance for **developing Reaper itself**. Everything in this document — conventions, values, safety rules, workflows — applies to working on Reaper's own codebase. This project CLAUDE.md takes precedence over global instructions for all Reaper-specific behavior.

**Output boundary**: Reaper produces commands, skills, agent prompts, and other generated content that operates on **target projects** (the user's codebase). That generated output must focus on general software development best practices — not impose Reaper's internal design philosophy, values, or conventions on target projects.

## What is Reaper?

Reaper is a Claude Code plugin that orchestrates specialized AI agents for autonomous software development. It implements TDD-first workflows with mandatory quality gates, worktree isolation, and conventional commits.

### Agent Roles

Check your available tools to determine your role:

- **Has "Task" tool** → **Main agent** (supervisor). Delegate all implementation to subagents. Validate their output. Never write code yourself.
- **No "Task" tool** → **Subagent** (worker). Complete the specific task in your launch prompt using TDD. Do not try to delegate.

**Main agent workflow:** Break down requests into tasks, select agents from the matrix below, launch with clear prompts via Task tool, validate output, coordinate integration.

**Subagent workflow:** Read launch prompt, write failing tests (Red), implement minimally (Green), refactor (Blue), verify coverage, signal completion.

## The Five Keys

These are **Reaper's internal design values**. They guide every decision in Reaper's own development, from architecture to error messages. All five matter. The ordering only applies when values conflict — defer to the higher key.

> **Scope**: The Five Keys shape how Reaper is built. They must NOT be imposed on target projects through generated prompts, agent instructions, or command output. Target projects have their own values and conventions.

**1. Correctness** — Quality is non-negotiable. Tests pass, gates hold, code works. When speed conflicts with correctness, correctness wins. Every time.

**2. Transparency** — Show your work. Make state visible, explain decisions, surface errors clearly. No magic, no silent failures. Developers should always know what happened and why.

**3. Craft** — Every interaction should feel considered. Helpful errors, sensible defaults, zero unnecessary friction. Polish isn't vanity — it's respect for the developer's time.

**4. Conviction** — Be opinionated. Strong defaults guide developers toward the pit of success. Provide escape hatches, not blank canvases. When the tool knows better, it should lead.

**5. Fun** — This tool has a voice. Themed commands spark personality, power features reward the curious, and visible progress celebrates your wins. Developer tooling doesn't have to be joyless.

### Where Voice Applies

The Five Keys — especially Fun — apply differently depending on the audience:

- **User-facing commands and skills** (start, flight-plan, takeoff, ship, squadron, status-worktrees, claude-sync): Voice, personality, and themed language are encouraged. These are the developer's interface with Reaper.
- **Agent prompts** (system prompts for coding, review, and planning agents): Must remain clinical, precise technical specifications. No themed language, personality, or humor. Agent prompts are machine-consumed instructions where ambiguity degrades output quality.
- **Output boundary** (generated agent prompts, commands, and skills that operate on target projects): Must follow general software development best practices. Do not embed Reaper-specific design philosophy, Five Keys language, or Reaper conventions into content that will guide work on the user's codebase.

## Agent Selection Matrix (Main Agents Only)

Use specialized agents for all development work. Subagents: skip this section.

| Task Type | Agent | When to Use |
|-----------|-------|-------------|
| Planning | `reaper:workflow-planner` | 3+ steps, multi-component features, parallel work analysis |
| Bug Fixing | `reaper:bug-fixer` | All bug reports and issues |
| New Features | `reaper:feature-developer` | All new functionality |
| Git Operations | `reaper:branch-manager` | Worktree setup, merges, cleanup |
| Testing | `reaper:test-runner` | Quality validation (mandatory before merge) |
| Code Review | `reaper:code-reviewer` | Pre-merge review, quality gates |
| Security | `reaper:security-auditor` | Security analysis |

**Workflow phases:**
1. **Plan** (mandatory for 3+ steps): `reaper:workflow-planner`
2. **Implement**: `reaper:bug-fixer` or `reaper:feature-developer`
3. **Validate** (mandatory): `reaper:test-runner` then `reaper:code-reviewer` + `reaper:security-auditor`
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

### Recommended Workflow (Main Agent / Human)

1. **Plan first**: `/reaper:flight-plan <detailed-description>` — Create execution plan with work breakdown
2. **Review & approve** — Claude presents the plan for your approval
3. **Issues created** — Claude creates issues in Beads/Jira (or markdown fallback)
4. **Clear context**: `/clear` — Fresh context for execution (recommended)
5. **Execute**: `/reaper:takeoff <TASK-ID>` — Executes the task plan autonomously

### Key Commands (Main Agent / Human)

```bash
# Not sure where to start?
/reaper:start
/reaper:start <description>

# Plan your work (start here)
/reaper:flight-plan <detailed-description>

# Execute from task ID (preferred) or description
/reaper:takeoff <TASK-ID>
/reaper:takeoff <description>

# Fast-path: commit, push, and open PR from a worktree
/reaper:ship <worktree-path>

# Assemble domain experts for collaborative design
/reaper:squadron <design-question>

# Check worktree status
/reaper:status-worktrees

# Suggest CLAUDE.md updates after code changes
/reaper:claude-sync
```

### Task ID-Only Mode (takeoff)

The `/reaper:takeoff` command is an exception to the "detailed description always required" rule. The orchestrator can query Beads (or Jira) to fetch task details automatically:

```bash
/reaper:takeoff reaper-a3f           # Fetches details from Beads
/reaper:takeoff reaper-a3f: Add bcrypt hashing   # Enriches with extra context
/reaper:takeoff Fix payment timeout with retry    # Description-only (no task system)
```

**Fetch behavior:** Beads format (`reaper-xxx`) queries `bd show`. Jira format (`PROJ-123`) queries `acli jira workitem view`. Unknown formats require a description. When the orchestrator deploys subagents, it always passes the full fetched description — subagents never see just a task ID.

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
- Quality gates: reaper:test-runner → reaper:code-reviewer + reaper:security-auditor
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

### Worktree Isolation

All development work happens in isolated worktrees. Never edit files, run tests, or execute commands directly in the repository root.

```bash
# Verify you are in the root (not inside a worktree)
pwd | grep -q "/trees/" && { echo "ERROR: Must start from root"; exit 1; }

# Create worktree
mkdir -p trees
git worktree add ./trees/TASK-ID-desc -b feature/TASK-ID-desc develop

# Run commands in worktree (use git -C for git, subshells for everything else)
git -C ./trees/TASK-ID status
(cd ./trees/TASK-ID && npm test)

# List all worktrees
git worktree list

# Cleanup after merge
git worktree remove ./trees/TASK-ID
git branch -d feature/TASK-ID-desc
```

Prefer using `reaper:branch-manager` for worktree setup and teardown — it handles edge cases safely.

## Project Structure

```
src/             # SOURCE TEMPLATES - Edit files here
  agents/        # Agent EJS templates
  commands/      # Orchestration command EJS templates (flight-plan, takeoff, ship, etc.)
  skills/        # Skill EJS templates (worktree-manager, issue-tracker-*)
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

User-facing docs (`README.md` and `docs/*.md`) must stay in sync with the codebase. When changes affect any of the following, update the corresponding doc:

| Change | Update |
|--------|--------|
| Agent added/removed/renamed | `docs/agents.md` and README agent count |
| Command behavior or flags changed | `docs/commands.md` |
| Quality gate pipeline modified | `docs/quality-gates.md` |
| Formatter added/removed in hook | `docs/auto-formatting.md` |
| Workflow or strategy logic changed | `docs/workflow.md` |
| Coverage threshold or key feature changed | `README.md` "Under the Hood" section |

Run `/reaper:claude-sync` to detect undocumented changes.

## Template Build System

**CRITICAL**: This project uses an EJS template build system. Generated files live at the project root (not in `dist/`).

### Source vs Generated Files

| Location | Type | Action |
|----------|------|--------|
| `src/agents/*.ejs` | Source | ✅ Edit these |
| `src/commands/*.ejs` | Source | ✅ Edit these |
| `src/skills/**/*.ejs` | Source | ✅ Edit these |
| `src/partials/*.ejs` | Source | ✅ Edit these (shared content) |
| `agents/*.md` | Generated | ❌ Never edit - changes will be overwritten |
| `commands/*.md` | Generated | ❌ Never edit - changes will be overwritten |
| `skills/**/*.md` | Generated | ❌ Never edit - changes will be overwritten |
| `hooks/hooks.json` | Generated | ❌ Never edit - changes will be overwritten |

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
3. **Verify output** in project root (e.g., `agents/bug-fixer.md`)
4. **Run prompt review**: Always run `reaper:ai-prompt-engineer` as a quality gate after modifying any agent, skill, command, hook, or partial template. This agent audits prompts for anti-patterns, token waste, and model-specific best practices.
5. **Commit both** source and generated files

The pre-commit hook automatically runs the build and stages generated files.

### User-Invocable Commands

Orchestration commands (start, flight-plan, takeoff, ship, squadron, status-worktrees, claude-sync) are user-invocable via `/reaper:*` syntax. They are defined in `src/commands/` with `user-invocable: true` in their frontmatter.

### Partials (Shared Content)

Common sections are extracted into `src/partials/*.ejs`:
- `pre-work-validation-coding.ejs` - Validation for coding agents
- `pre-work-validation-review.ejs` - Validation for review agents
- `pre-work-validation-security.ejs` - Validation for security auditor
- `output-requirements.ejs` - JSON output requirements (parameterized)
- `git-prohibitions.ejs` - Git operation restrictions
- `tdd-testing-protocol.ejs` - TDD methodology
- `artifact-cleanup-coding.ejs` - Cleanup protocols for coding agents
- `artifact-cleanup-review.ejs` - Cleanup protocols for review agents
- `visual-vocabulary.ejs` - Gauge states and card templates (parameterized by context: takeoff, ship, status-worktrees, squadron, start, functional). Respects `Reaper: disable ASCII art` opt-out in target project's CLAUDE.md.
- `no-self-reporting.ejs` - Prevents agents from self-reporting status
- `plan-file-schema.ejs` - Plan file format and sections
- `todowrite-plan-protocol.ejs` - TodoWrite plan persistence protocol
- `task-system-operations.ejs` - Task system detection, abstract operations, and platform skill routing
- `agent-deployment-template.ejs` - Agent deployment template structure
- `orchestrator-role-boundary.ejs` - Orchestrator role and delegation rules
- `quality-gate-protocol.ejs` - Quality gate profile system and sequence
- `directory-exclusions.ejs` - Standard directory exclusion patterns
- `file-conflict-detection.ejs` - Parallel work file conflict detection
- `no-commits-policy.ejs` - Coding agents never commit policy
- `work-unit-cleanup.ejs` - Background task cleanup at work unit boundaries for orchestrator commands

Use EJS includes: `<%- include('partials/output-requirements', { isReviewAgent: true }) %>`. Parameters vary by partial — check the partial source for available options.

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

## Reference

### Agent Categories

| Category | Agents |
|----------|--------|
| Planning | reaper:workflow-planner, reaper:api-designer, reaper:cloud-architect, reaper:database-architect, reaper:event-architect, reaper:observability-architect, reaper:frontend-architect, reaper:data-engineer, reaper:test-strategist, reaper:compliance-architect |
| Development | reaper:feature-developer, reaper:bug-fixer, reaper:refactoring-dev, reaper:branch-manager |
| Quality | reaper:test-runner, reaper:code-reviewer, reaper:security-auditor, reaper:performance-engineer |
| Ops | reaper:deployment-engineer, reaper:integration-engineer, reaper:incident-responder |
| Craft | reaper:technical-writer, reaper:claude-agent-architect, reaper:ai-prompt-engineer |

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
Task --subagent_type reaper:code-reviewer \
  --prompt "TASK: reaper-a3f, WORKTREE: ./trees/reaper-a3f-oauth, DESCRIPTION: Review for quality"
```
