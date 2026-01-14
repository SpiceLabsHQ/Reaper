# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Reaper?

Reaper is a Claude Code plugin that orchestrates specialized AI agents for autonomous software development. It implements TDD-first workflows with mandatory quality gates, worktree isolation, and conventional commits.

### Agent Roles

Check your available tools to determine your role:
- **Has "Task" tool** → Main agent (supervisor). Delegate to subagents. Never implement directly.
- **No "Task" tool** → Subagent (worker). Complete your assigned task using TDD.

### Recommended Workflow

1. **Plan first**: `/reaper:flight-plan <detailed-description>` — Create execution plan with work breakdown
2. **Review & approve** — Claude presents the plan for your approval
3. **Issues created** — Claude creates issues in Beads/Jira (or markdown fallback)
4. **Clear context**: `/clear` — Fresh context for execution (recommended)
5. **Execute**: `/reaper:takeoff <TASK-ID>` — Watch her fly!

### Key Commands

```bash
# Plan your work (start here)
/reaper:flight-plan <detailed-description>

# Execute from task ID (preferred) or description
/reaper:takeoff <TASK-ID>
/reaper:takeoff <description>

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

- 80%+ coverage required for application code
- All tests run in worktrees (`./trees/`), never in root
- Run linting before every commit (enforced by husky)
- Quality gates: reaper:test-runner → reaper:code-reviewer + reaper:security-auditor

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
  skills/        # Skill EJS templates
  commands/      # Command EJS templates
  hooks/         # Hook templates
  partials/      # Shared EJS partials

agents/          # GENERATED - Do not edit directly
commands/        # GENERATED - Do not edit directly
skills/          # GENERATED - Do not edit directly
hooks/           # GENERATED - Do not edit directly

scripts/         # Build tooling
docs/spice/      # Development standards documentation
```

## Template Build System

**CRITICAL**: This project uses an EJS template build system. Generated files live at the project root (not in `dist/`).

### Source vs Generated Files

| Location | Type | Action |
|----------|------|--------|
| `src/agents/*.ejs` | Source | ✅ Edit these |
| `src/skills/**/*.ejs` | Source | ✅ Edit these |
| `src/commands/*.ejs` | Source | ✅ Edit these |
| `src/partials/*.ejs` | Source | ✅ Edit these (shared content) |
| `agents/*.md` | Generated | ❌ Never edit - changes will be overwritten |
| `skills/**/*.md` | Generated | ❌ Never edit - changes will be overwritten |
| `commands/*.md` | Generated | ❌ Never edit - changes will be overwritten |
| `hooks/hooks.json` | Generated | ❌ Never edit - changes will be overwritten |

### Build Commands

```bash
npm run build        # Compile all templates to project root
npm run build:watch  # Watch mode for development
```

### Workflow for Editing Agents/Skills/Commands

1. **Edit the source template** in `src/` (e.g., `src/agents/bug-fixer.ejs`)
2. **Run build**: `npm run build`
3. **Verify output** in project root (e.g., `agents/bug-fixer.md`)
4. **Commit both** source and generated files

The pre-commit hook automatically runs the build and stages generated files.

### Partials (Shared Content)

Common sections are extracted into `src/partials/*.ejs`:
- `pre-work-validation-coding.ejs` - Validation for coding agents
- `output-requirements.ejs` - JSON output requirements (parameterized)
- `git-prohibitions.ejs` - Git operation restrictions
- `tdd-testing-protocol.ejs` - TDD methodology
- `artifact-cleanup-coding.ejs` - Cleanup protocols

Use EJS includes: `<%- include('partials/output-requirements', { isReviewAgent: true }) %>`

### Agent Categories

| Category | Agents |
|----------|--------|
| Planning | reaper:workflow-planner, reaper:api-designer, reaper:cloud-architect, reaper:database-architect |
| Development | reaper:feature-developer, reaper:bug-fixer, reaper:refactoring-dev, reaper:branch-manager |
| Quality | reaper:test-runner, reaper:code-reviewer, reaper:security-auditor, reaper:performance-engineer |
| Ops | reaper:deployment-engineer, reaper:integration-engineer, reaper:incident-responder |
| Meta | reaper:technical-writer, reaper:claude-agent-architect |

### Agent Naming Convention

When referencing Reaper agents in Task tool calls, use the fully qualified name with the `reaper:` prefix:

```bash
# Correct
Task --subagent_type reaper:workflow-planner

# Incorrect
Task --subagent_type workflow-planner
```

This prefix is required because Reaper is a Claude Code plugin, and plugin agents must be namespaced.

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

## Safety Rules

- Never work directly in root directory—use `./trees/` worktrees
- Never merge to `main` without explicit user permission
- Never skip hooks (`--no-verify`, `HUSKY=0`)
- Never fabricate task IDs or test results
- Never edit generated files directly—edit `src/` templates instead
