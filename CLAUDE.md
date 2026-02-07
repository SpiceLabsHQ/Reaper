# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. This project CLAUDE.md takes precedence over global instructions for all Reaper-specific behavior.

## What is Reaper?

Reaper is a Claude Code plugin that orchestrates specialized AI agents for autonomous software development. It implements TDD-first workflows with mandatory quality gates, worktree isolation, and conventional commits.

### Agent Roles

Check your available tools to determine your role:
- **Has "Task" tool** → Main agent (supervisor). Delegate to subagents. Never implement directly.
- **No "Task" tool** → Subagent (worker). Complete your assigned task using TDD.

## The Five Keys

These values guide every decision in Reaper, from architecture to error messages. All five matter. The ordering only applies when values conflict — defer to the higher key.

**1. Correctness** — Quality is non-negotiable. Tests pass, gates hold, code works. When speed conflicts with correctness, correctness wins. Every time.

**2. Transparency** — Show your work. Make state visible, explain decisions, surface errors clearly. No magic, no silent failures. Developers should always know what happened and why.

**3. Craft** — Every interaction should feel considered. Helpful errors, sensible defaults, zero unnecessary friction. Polish isn't vanity — it's respect for the developer's time.

**4. Conviction** — Be opinionated. Strong defaults guide developers toward the pit of success. Provide escape hatches, not blank canvases. When the tool knows better, it should lead.

**5. Fun** — This tool has a voice. Themed commands spark personality, power features reward the curious, and visible progress celebrates your wins. Developer tooling doesn't have to be joyless.

### Where Voice Applies

The Five Keys — especially Fun — apply differently depending on the audience:

- **User-facing commands and skills** (flight-plan, takeoff, ship, status-worktrees, claude-sync): Voice, personality, and themed language are encouraged. These are the developer's interface with Reaper.
- **Agent prompts** (system prompts for coding, review, and planning agents): Must remain clinical, precise technical specifications. No themed language, personality, or humor. Agent prompts are machine-consumed instructions where ambiguity degrades output quality.

## Safety Rules

- Always work in `./trees/` worktrees — never work directly in the root directory
- Always request explicit user approval before merging to `main`
- Always let hooks run to completion — never skip them (`--no-verify`, `HUSKY=0`)
- Always use real task IDs from `bd list` and report actual test results — never fabricate either
- Always edit source templates in `src/` — never edit generated files directly
- Always read source files before modifying them — verify paths exist before referencing them

### Recommended Workflow (Main Agent / Human)

1. **Plan first**: `/reaper:flight-plan <detailed-description>` — Create execution plan with work breakdown
2. **Review & approve** — Claude presents the plan for your approval
3. **Issues created** — Claude creates issues in Beads/Jira (or markdown fallback)
4. **Clear context**: `/clear` — Fresh context for execution (recommended)
5. **Execute**: `/reaper:takeoff <TASK-ID>` — Executes the task plan autonomously

### Key Commands (Main Agent / Human)

```bash
# Plan your work (start here)
/reaper:flight-plan <detailed-description>

# Execute from task ID (preferred) or description
/reaper:takeoff <TASK-ID>
/reaper:takeoff <description>

# Fast-path: commit, push, and open PR from a worktree
/reaper:ship <worktree-path>

# Check worktree status
/reaper:status-worktrees

# Suggest CLAUDE.md updates after code changes
/reaper:claude-sync
```

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

### Environment Requirements

- **Node.js 22+** (LTS) required for coverage threshold enforcement
- Test file lists are explicit (not glob-based) for cross-platform CI compatibility
- When adding test files: update `package.json` scripts AND `.github/workflows/test.yml`

### Worktree Isolation

All development work happens in isolated worktrees:

```bash
# Create worktree
git worktree add ./trees/TASK-ID-desc -b feature/TASK-ID-desc develop

# Run commands in worktree
git -C ./trees/TASK-ID status
(cd ./trees/TASK-ID && npm test)

# Cleanup after merge
git worktree remove ./trees/TASK-ID
```

## Project Structure

```
src/             # SOURCE TEMPLATES - Edit files here
  agents/        # Agent EJS templates
  commands/      # Orchestration command EJS templates (flight-plan, takeoff, ship, etc.)
  skills/        # Skill EJS templates (worktree-manager)
  hooks/         # Hook templates
  partials/      # Shared EJS partials

agents/          # GENERATED from src/agents/
commands/        # GENERATED from src/commands/
skills/          # GENERATED from src/skills/ (worktree-manager)
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

### Workflow for Editing Agents/Skills

1. **Edit the source template** in `src/` (e.g., `src/agents/bug-fixer.ejs`)
2. **Run build**: `npm run build`
3. **Verify output** in project root (e.g., `agents/bug-fixer.md`)
4. **Run prompt review**: Always run `reaper:ai-prompt-engineer` as a quality gate after modifying any agent, skill, command, hook, or partial template. This agent audits prompts for anti-patterns, token waste, and model-specific best practices.
5. **Commit both** source and generated files

The pre-commit hook automatically runs the build and stages generated files.

### User-Invocable Commands

Orchestration commands (flight-plan, takeoff, ship, squadron, status-worktrees, claude-sync) are user-invocable via `/reaper:*` syntax. They are defined in `src/commands/` with `user-invocable: true` in their frontmatter.

### Partials (Shared Content)

Common sections are extracted into `src/partials/*.ejs`:
- `pre-work-validation-coding.ejs` - Validation for coding agents
- `output-requirements.ejs` - JSON output requirements (parameterized)
- `git-prohibitions.ejs` - Git operation restrictions
- `tdd-testing-protocol.ejs` - TDD methodology
- `artifact-cleanup-coding.ejs` - Cleanup protocols
- `visual-vocabulary.ejs` - Gauge states and card templates for user-facing commands (parameterized by context: takeoff, ship, status-worktrees, squadron, functional). Respects `Reaper: disable ASCII art` opt-out in target project's CLAUDE.md.

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

## Reference

### Agent Categories

| Category | Agents |
|----------|--------|
| Planning | reaper:workflow-planner, reaper:api-designer, reaper:cloud-architect, reaper:database-architect, reaper:event-architect, reaper:observability-architect, reaper:frontend-architect, reaper:data-engineer, reaper:test-strategist, reaper:compliance-architect |
| Development | reaper:feature-developer, reaper:bug-fixer, reaper:refactoring-dev, reaper:branch-manager |
| Quality | reaper:test-runner, reaper:code-reviewer, reaper:security-auditor, reaper:performance-engineer, reaper:validation-runner |
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
