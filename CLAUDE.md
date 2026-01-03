# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Reaper?

Reaper is a Claude Code plugin that orchestrates specialized AI agents for autonomous software development. It implements TDD-first workflows with mandatory quality gates, worktree isolation, and conventional commits.

### Agent Roles

Check your available tools to determine your role:
- **Has "Task" tool** → Main agent (supervisor). Delegate to subagents. Never implement directly.
- **No "Task" tool** → Subagent (worker). Complete your assigned task using TDD.

### Key Commands

```bash
# Start orchestrated development
/orchestrate <task-description>

# Generate execution plan
/plan <feature-description>

# Check worktree status
/status-worktrees

# Suggest CLAUDE.md updates after code changes
/claude-sync
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
- Quality gates: test-runner → code-reviewer + security-auditor

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
agents/          # Specialized AI agent definitions (18 agents)
commands/        # Slash commands (/orchestrate, /plan, /claude-sync, /status-worktrees)
skills/          # Auto-activating utilities
  spice/         # Code formatting, linting, git hooks, worktree management
  worktree-manager/  # Worktree lifecycle with safe cleanup
hooks/           # Claude Code hooks (session start triggers bd daemon)
docs/spice/      # Development standards documentation
```

### Agent Categories

| Category | Agents |
|----------|--------|
| Planning | workflow-planner, api-designer, cloud-architect, database-architect |
| Development | feature-developer, bug-fixer, refactoring-specialist, branch-manager |
| Quality | test-runner, code-reviewer, security-auditor, performance-engineer |
| Ops | deployment-engineer, integration-engineer, incident-responder |
| Meta | documentation-generator, claude-agent-architect |

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
