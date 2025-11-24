# 🌶️ Spice Labs Essential Standards

> **Agent-First Development**: This document contains essential standards for both main agents and subagents.

**Version:** 1.1.0 | **Last Updated:** 2025-10-09

---

## 🎯 Determine Your Role

**Check your available tools list right now to identify your role:**

### ✅ If you see "Task" tool → You are the MAIN AGENT (supervisor)

**Your responsibilities:**
- **Delegate all implementation work** to subagents (bug-fixer, feature-developer, etc.)
- **Use the Agent Selection Matrix** below to choose the right subagent for each task
- **Validate subagent work** and provide guidance on standards compliance
- **Orchestrate workflow** from planning through integration
- **Never write implementation code yourself** - that's what subagents do
- **Focus on**: Task breakdown, subagent selection, quality validation, workflow coordination

**Your workflow:**
1. Break down user requests into tasks (TodoWrite)
2. Select appropriate subagents from the matrix below
3. Launch subagents with clear, specific prompts using Task tool
4. Validate their output against standards
5. Coordinate integration and completion

---

### ❌ If you do NOT see "Task" tool → You are a SUBAGENT (specialized worker)

**Your responsibilities:**
- **Complete the specific task** described in your launch prompt
- **Do the actual implementation work** (write code, fix bugs, create tests, etc.)
- **Follow TDD methodology** with Red-Green-Refactor cycle
- **Apply SOLID principles** to all code you write
- **Execute all safety rules** and standards documented below
- **Update Jira status** for work you complete (if using Jira)
- **Do NOT try to delegate** - you are the subagent doing the work
- **Focus on**: Code quality, test coverage, following standards, completing your specific task

**Your workflow:**
1. Read your launch prompt carefully for the specific task
2. Create failing tests (Red)
3. Write minimal implementation (Green)
4. Refactor for quality (Blue)
5. Ensure 80%+ coverage and linting passes
6. Commit with proper message format
7. Update Jira ticket status

---

## 📚 Quick Navigation

**Detailed References** (standard links - not imported to context):
- [Worktree Workflows](./SPICE-Worktrees.md) - Advanced patterns, parallel work, manual fallbacks
- [Testing Guide](./SPICE-Testing.md) - Language-specific examples, mocking patterns
- [Git Flow](./SPICE-Git-Flow.md) - Branch strategies, merge verification, detailed commands
- [Full Standards](./SPICE.md) - Complete historical reference

---

## 🚫 Critical Safety Rules
**📌 Applies to: BOTH main agents and subagents**

**⚠️ USER OVERRIDE CLAUSE**: The user, and only the user, may explicitly override any of these rules.

### Absolute Prohibitions for LLMs

1. **ROOT DIRECTORY PROHIBITION**
   - ❌ NEVER work directly in the root project directory
   - ✅ ALL edits, tests, and commands MUST happen in `./trees/` worktrees
   - Verify: `pwd | grep -q "/trees/" && { echo "ERROR: Must start from root"; exit 1; }`

2. **WORKTREE ISOLATION**
   - Every feature/bug gets its own worktree in `./trees/[TASK-ID]-description`
   - Use git -C for git commands: `git -C ./trees/PROJ-123 status`
   - Use subshells for non-git commands: `(cd ./trees/repo-a3f && npm test)`

3. **MAIN BRANCH PROTECTION**
   - LLMs are STRICTLY FORBIDDEN from merging to `main` without explicit user permission
   - ✅ Allowed: Merge to `develop` branch only
   - ✅ Allowed: Recommend main merge to user
   - ❌ Forbidden: Any automatic merge to main
   - User must explicitly say: "merge to main", "deploy to production", "release to main"

4. **NO FABRICATION**
   - NEVER invent task IDs, test results, or any data
   - If task ID and detailed description both missing → STOP and ask user
   - Accepted formats: `PROJ-123` (Jira), `repo-a3f` (Beads), `#456` (GitHub), `custom-id`, or description-only

5. **NO ENVIRONMENT VARIABLE COMMANDS**
   - ❌ Wrong: `NODE_ENV=test npm test`
   - ✅ Correct: `(cd ./trees/PROJ-123 && npm test)`

6. **LINTING MANDATORY**
   - Run linting before EVERY commit to prevent hook failures
   - Auto-detect project type and run appropriate linter
   - Exit code verification required for agents

---

## 🤖 Agent Selection Matrix
**📌 Applies to: MAIN AGENTS ONLY** (Subagents: skip this section)

**CRITICAL**: Use specialized agents for ALL development work. This is THE most important section for workflow decisions.

### Decision Tree

| Task Type | Required Agent | When to Use | Key Benefits |
|-----------|---------------|-------------|--------------|
| **Planning** | `workflow-planner` | ≥3 steps, multi-component features | Parallel work analysis, conflict prevention |
| **Bug Fixing** | `bug-fixer` | ALL bug reports and issues | TDD methodology, systematic reproduction |
| **New Features** | `feature-developer` | ALL new functionality | SOLID principles, comprehensive testing |
| **Git Operations** | `branch-manager` | Worktree setup, merges, cleanup | Safe operations, automated backups |
| **Testing** | `test-runner` | Quality validation (MANDATORY before merge) | Coverage validation, lint checking |
| **Code Review** | `code-reviewer` | Pre-merge review, quality gates | Security analysis, best practices |

### Agent Usage Patterns

**Examples support flexible task identifiers: Jira (PROJ-123), Beads (repo-a3f), GitHub (#456), custom (sprint-5-auth)**

**1. Planning Phase (MANDATORY for complex tasks)**
```bash
# Jira task
Task --subagent_type workflow-planner \
  --prompt "TASK: PROJ-123, DESCRIPTION: Analyze OAuth authentication requirements for parallel work opportunities"

# Beads task
Task --subagent_type workflow-planner \
  --prompt "TASK: repo-a3f, DESCRIPTION: Plan rate limiting implementation across API and middleware layers"
```

**2. Bug Fixing (REQUIRED for all bugs)**
```bash
# GitHub issue
Task --subagent_type bug-fixer \
  --prompt "TASK: #456, DESCRIPTION: Fix null pointer in payment processing when user has no payment method"

# Description-only
Task --subagent_type bug-fixer \
  --prompt "TASK: hotfix-oauth, DESCRIPTION: Fix OAuth token refresh race condition causing 401 errors"
```

**3. Feature Development (REQUIRED for all features)**
```bash
# Custom task ID
Task --subagent_type feature-developer \
  --prompt "TASK: sprint-5-notifications, DESCRIPTION: Implement real-time push notifications with WebSocket support"

# Jira task (backward compatible)
Task --subagent_type feature-developer \
  --prompt "TASK: PROJ-123, DESCRIPTION: Add user profile API with validation and avatar upload"
```

**4. Environment Setup (RECOMMENDED)**
```bash
Task --subagent_type branch-manager \
  --prompt "TASK: PROJ-123, WORKTREE: ./trees/PROJ-123-auth, DESCRIPTION: Create worktree, install dependencies, validate"
```

**5. Quality Validation (MANDATORY before merge)**
```bash
Task --subagent_type test-runner \
  --prompt "TASK: repo-a3f, WORKTREE: ./trees/repo-a3f-oauth, DESCRIPTION: Run full test suite for OAuth implementation"

Task --subagent_type code-reviewer \
  --prompt "TASK: #456, WORKTREE: ./trees/issue-456-fix, DESCRIPTION: Review payment processing fix for quality"
```

**6. Safe Merge (RECOMMENDED)**
```bash
Task --subagent_type branch-manager \
  --prompt "TASK: PROJ-123, WORKTREE: ./trees/PROJ-123-auth, DESCRIPTION: Merge to develop with conflict detection"
```

[Full Agent Documentation](./SPICE.md#llm-coding-agents-mandatory)

---

## 📋 Jira Integration
**📌 Applies to: BOTH main agents and subagents**

**Note:** Most projects use Jira, but some don't or aren't ready yet. If Jira is not applicable, skip this section.

### Hierarchy
```
Epic
  └─> Story (--parent flag)
       └─> Sub-task (--parent flag)
Bug (standalone)
Task (standalone or child)
```

### Pre-Work Validation (When Using Jira)

**Given ANY ticket, ALWAYS:**
1. Check hierarchy: `acli jira workitem search --jql "parent = PROJ-123"`
2. If no children → work on this ticket directly
3. If children found → branch at parent level, work on children
4. TodoWrite ALL children before starting
5. Update parent status to "In Progress"
6. If ticket blocked → STOP, tell user to unblock first

### Essential ACLI Commands

```bash
# View ticket and check blockers
acli jira workitem view PROJ-123 --fields summary,status,parent,blockedby

# Update status to In Progress (REQUIRED before starting)
acli jira workitem transition --key PROJ-123 --status "In Progress"

# Search for child tickets
acli jira workitem search --jql "parent = PROJ-123" \
  --fields key,summary,issuetype,status

# Create tickets
acli jira workitem create --project KEY --type Story \
  --parent EPIC-KEY --summary "Title" --description "Details"

# Add comments (separate command, not during transitions)
acli jira workitem comment --key PROJ-123 --body "Comment text"
```

### Completion Workflow

**MANDATORY**: After successful merge to develop, transition to "In Review":
```bash
acli jira workitem transition --key PROJ-123 --status "In Review" || {
    echo "WARNING: Could not transition PROJ-123 to In Review"
    echo "Please manually update the ticket in Jira"
}
```

**When to mark In Review:**
- ✅ Code merged to develop
- ✅ All tests passing
- ✅ Worktree cleaned up
- ✅ Feature branch deleted

[Detailed Jira Workflows](./SPICE.md#jira-integration)

---

## 🔮 Beads Integration
**📌 Applies to: BOTH main agents and subagents**

**Note:** Some projects use Beads for lightweight issue tracking. Beads issues use hash-based identifiers like `repo-a3f` or `prefix-custom-name`.

### Beads Overview

Beads is a lightweight, git-based issue tracker. Issues are identified by hash-based names (e.g., `repo-a3f`, `docs-b2e`) instead of sequential numbers.

**Access Methods:**
- CLI: `bd` command
- MCP Server: `beads` (when available)

### Essential BD Commands

```bash
# List all issues
bd list

# View issue details
bd show repo-a3f

# Create new issue
bd new "Issue title and description"

# Update issue status
bd issue update repo-a3f --status "In Progress"

# Add comment to issue
bd comment repo-a3f "Comment text"

# Close/resolve issue
bd issue update repo-a3f --status "Done"
```

### Pre-Work Validation (When Using Beads)

**Given ANY Beads issue:**
1. View issue details: `bd show repo-a3f`
2. Check if issue has sub-issues or dependencies
3. Update status to "In Progress" before starting work
4. Use issue description for implementation guidance

### Completion Workflow

**RECOMMENDED**: After successful merge to develop, update Beads issue:
```bash
# Update status
bd issue update repo-a3f --status "In Review" 2>/dev/null || {
    echo "INFO: Beads update skipped (bd command not available or issue not found)"
}

# Add completion comment
bd comment repo-a3f "Implemented and merged to develop. Ready for review." 2>/dev/null
```

**When to mark In Review:**
- ✅ Code merged to develop
- ✅ All tests passing
- ✅ Worktree cleaned up
- ✅ Feature branch deleted

### MCP Integration (When Available)

If the Beads MCP server is configured, you can use MCP tools for issue management:
- Read issue details via MCP resource
- Update issue status programmatically
- Query related issues

**Note:** Beads integration is optional. If `bd` command is not available, work proceeds with description-only mode.

---

## 🎯 Orchestrator Exception: Task ID-Only Mode

**📌 Applies to: Main agents using spice:orchestrate command**

**IMPORTANT:** The `spice:orchestrate` command is an exception to the "detailed description always required" rule.

### Why the Exception?

The orchestrator can query task systems (Jira, Beads) to fetch complete task details automatically, making redundant descriptions unnecessary.

### Valid Orchestrator Usage

**Task ID only** (orchestrator fetches details):
```bash
/spice:orchestrate PROJ-123           # Fetches from Jira
/spice:orchestrate repo-a3f           # Fetches from Beads
```

**Task ID + enriched description** (combines both):
```bash
/spice:orchestrate PROJ-123: Fix email validation with plus signs
/spice:orchestrate repo-a3f: Use bcrypt for password hashing
```

**Description only** (no task system):
```bash
/spice:orchestrate Fix critical payment timeout - add retry logic and error handling
```

### Orchestrator Fetch Behavior

1. **Jira format** (`PROJ-123`) → Queries `acli jira workitem view` for summary, description, acceptance criteria
2. **Beads format** (`repo-a3f`) → Queries `bd show` for issue details
3. **Unknown format** (`sprint-5`) → Requires description (no task system to query)
4. **Query fails** → Falls back to user-provided description OR aborts if missing

### Important: Individual Agents Still Require Descriptions

When orchestrator deploys individual agents, it ALWAYS provides the fetched/combined description in the agent prompt:

```bash
# Orchestrator internally does this:
Task --subagent_type bug-fixer \
  --prompt "TASK: PROJ-123
DESCRIPTION: [fetched from Jira] Fix email validation bug...
WORKTREE: ./trees/PROJ-123-fix
..."
```

**Agents never see just a task ID** - they always receive complete context from the orchestrator.

---

## 🏗️ Core SOLID Principles
**📌 Applies to: BOTH main agents and subagents** (Essential for subagents writing code)

Apply to ALL code:

- **S - Single Responsibility**: One class = one reason to change
- **O - Open/Closed**: Open for extension, closed for modification
- **L - Liskov Substitution**: Subclasses replaceable for parents
- **I - Interface Segregation**: Small, focused interfaces
- **D - Dependency Inversion**: Depend on abstractions, inject dependencies

**Example Pattern (Dependency Injection):**
```javascript
// ✅ CORRECT: Depend on abstraction
class OrderService {
  constructor(notifier) { // Generic notifier interface
    this.notifier = notifier;
  }
}

// ❌ WRONG: Depend on concrete implementation
class OrderService {
  constructor() {
    this.notifier = new EmailNotifier(); // Tightly coupled
  }
}
```

[Full SOLID Examples](./SPICE.md#solid-principles)

---

## 🔄 Standard Workflow (Agent-Enhanced)
**📌 Applies to: MAIN AGENTS ONLY** (Subagents: follow your specific launch prompt)

**High-level process for all development tasks:**

1. **Verify Root Directory**
   ```bash
   pwd | grep -q "/trees/" && { echo "ERROR: Must start from root"; exit 1; }
   ```

2. **Check Jira Hierarchy** (if using Jira)
   ```bash
   acli jira workitem search --jql "parent = PROJ-123"
   ```

3. **TodoWrite All Tasks**
   - Create comprehensive task list
   - Mark tasks in_progress as you work

4. **🎯 PLANNING PHASE** (MANDATORY for ≥3 steps)
   ```bash
   Task --subagent_type workflow-planner --prompt "Analyze [TASK] for parallel opportunities"
   ```

5. **🚀 IMPLEMENTATION PHASE** (Choose based on task type)
   - **Bugs:** `Task --subagent_type bug-fixer --prompt "Systematic TDD bug fix"`
   - **Features:** `Task --subagent_type feature-developer --prompt "TDD feature implementation"`

6. **🌳 ENVIRONMENT SETUP** (Recommended)
   ```bash
   Task --subagent_type branch-manager --prompt "Setup worktree environment"
   # OR manual: mkdir -p trees && git worktree add ./trees/PROJ-123-desc -b feature/PROJ-123-desc develop
   ```

7. **Setup Environment** (if not using branch-manager)
   - Install dependencies in worktree
   - Validate environment

8. **TDD Implementation** (Agent-guided)
   - Agents handle Red-Green-Refactor cycle
   - Follow SOLID principles
   - 80%+ coverage requirement

9. **📊 QUALITY PHASE** (MANDATORY)
   ```bash
   Task --subagent_type test-runner --prompt "Comprehensive testing validation"
   Task --subagent_type code-reviewer --prompt "Quality and security review"
   ```

10. **🔄 INTEGRATION PHASE** (Recommended)
    ```bash
    Task --subagent_type branch-manager --prompt "Safe merge to develop"
    # OR manual: git checkout develop && git merge feature/PROJ-123 --no-ff
    ```

11. **Jira Update** (if using Jira)
    ```bash
    acli jira workitem transition --key PROJ-123 --status "In Review"
    ```

12. **Note:** Main branch merges require explicit user permission

[Detailed Workflow](./SPICE.md#workflow-summary-agent-enhanced)

---

## 📝 Commit Message Standards
**📌 Applies to: BOTH main agents and subagents** (Essential for subagents making commits)

**Enforced by commitlint - violations will block commits:**

### Format
```
<type>(<scope>): <subject> (max 72 chars)

<body>

Ref: PROJ-123
```

### Types
- `feat`: New feature → MINOR version bump
- `fix`: Bug fix → PATCH version bump
- `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`: No version bump
- `BREAKING CHANGE:` in footer → MAJOR version bump

### LLM Verification (MANDATORY)
**ALWAYS verify before writing commit message:**
```bash
git status --short        # Check what's actually staged
git diff --cached | head  # Review the actual changes
# THEN write commit message based on verified changes
```

### Examples
```bash
# ✅ CORRECT
feat(auth): add OAuth2 integration

Implements Google OAuth2 for user authentication

Ref: PROJ-123

# ❌ WRONG - exceeds 72 chars
feat(auth): add OAuth2 integration with Google and GitHub providers for authentication

# ❌ WRONG - ticket in subject instead of footer
feat(auth): add OAuth2 PROJ-123
```

[Full Commit Guide](./SPICE-Git-Flow.md#commit-standards)

---

## 🧪 Testing Requirements
**📌 Applies to: BOTH main agents and subagents** (Essential for subagents writing tests)

**TDD Agent-Driven (Primary Method)**

### Agent Workflows

**1. Bug Fixing (bug-fixer agent)**
- 🔴 RED: Write failing test reproducing the bug
- 🟢 GREEN: Implement minimal fix to pass test
- 🔵 BLUE: Refactor for quality and comprehensive coverage
- 🔍 VALIDATION: Run full suite, ensure no regressions

**2. Feature Development (feature-developer agent)**
- 🔴 RED: Write comprehensive test suite for acceptance criteria
- 🟢 GREEN: Implement feature with SOLID principles
- 🔵 BLUE: Refactor for maintainability
- 🔗 INTEGRATION: Create end-to-end workflow tests

**3. Quality Validation (test-runner agent - MANDATORY)**
- Execute all tests with coverage analysis
- Run linting and type checking
- Validate 80%+ coverage requirement
- Security scanning

### Critical Requirements

- **80%+ coverage** for application code (enforced)
- **Mock ALL externals** (APIs, HTTP, services)
- **No real API calls** in tests
- **ALL tests run in worktree** (NEVER in root)
  ```bash
  # ✅ CORRECT
  (cd ./trees/PROJ-123 && npm test)

  # ❌ WRONG
  npm test  # Runs in root directory
  ```

### What to Test

**MUST test (application code):**
- Business logic, API endpoints, services, UI components, data access, auth

**SHOULD NOT test (dev tooling):**
- Test scripts, build configs, linting configs, CI/CD pipelines

[Testing Details](./SPICE-Testing.md)

---

## 🎨 Linting Standards
**📌 Applies to: BOTH main agents and subagents** (Essential for subagents making commits)

**MANDATORY before ALL commits** - prevents hook failures

### Auto-Detection Pattern
```bash
# Auto-detect project type and run appropriate linter
if [ -f package.json ]; then
    npm run lint:fix || npm run lint || { echo "ERROR: Linting failed"; exit 1; }
elif [ -f requirements.txt ] || [ -f pyproject.toml ]; then
    black . && isort . && flake8 . || ruff format . && ruff check --fix . || { echo "ERROR: Python linting failed"; exit 1; }
elif [ -f composer.json ]; then
    ./vendor/bin/php-cs-fixer fix . || { echo "ERROR: PHP linting failed"; exit 1; }
elif [ -f Gemfile ]; then
    bundle exec rubocop -a || { echo "ERROR: Ruby linting failed"; exit 1; }
elif [ -f go.mod ]; then
    gofmt -w . && golangci-lint run --fix || { echo "ERROR: Go linting failed"; exit 1; }
fi
```

### Forbidden Actions
- ❌ `git commit --no-verify`
- ❌ `git commit -n`
- ❌ `HUSKY=0 git commit`
- ❌ Disabling hooks in any way

---

## 🌲 Worktree Essentials
**📌 Applies to: BOTH main agents and subagents** (Essential for subagents doing implementation)

**ALL LLM work MUST happen in worktrees under `./trees/` directory**

### Quick Commands
```bash
# Create worktree from develop
mkdir -p trees
git worktree add ./trees/PROJ-123-description -b feature/PROJ-123-description develop

# Work in worktree (never cd directly for LLMs)
git -C ./trees/PROJ-123-description status
(cd ./trees/PROJ-123-description && npm test)

# List all worktrees
git worktree list

# Clean up after merge
git worktree remove ./trees/PROJ-123-description
git branch -d feature/PROJ-123-description
```

### Recommended: Use branch-manager agent
```bash
Task --subagent_type branch-manager \
  --description "Setup worktree environment" \
  --prompt "Create worktree for PROJ-123, install dependencies, validate"
```

[Worktree Workflows](./SPICE-Worktrees.md)

---

## 🔒 Security & Quality Gates
**📌 Applies to: BOTH main agents and subagents**

### Before Merging to Develop

**ALL must pass:**
- [ ] Tests pass with 80%+ coverage
- [ ] Linting passes
- [ ] Build succeeds
- [ ] No console errors (web apps)
- [ ] All tests run in worktree (NOT root)
- [ ] Code review completed (code-reviewer agent)
- [ ] Security validation passed

### Versioning

**Use SemVer for:**
- CLI tools, libraries, APIs, mobile apps, MCP servers

**NO SemVer for:**
- Websites, web apps, documentation

**Format:** MAJOR.MINOR.PATCH

---

## 📖 Quick Reference
**📌 Main agents: Subagent launching patterns | Subagents: Implementation commands**

### Essential Command Patterns

```bash
# SAFETY: Verify you're in root directory first
pwd | grep -q "/trees/" && { echo "ERROR: Must start from root"; exit 1; }

# PLANNING: Analyze for parallel opportunities (works with any task ID format)
Task --subagent_type workflow-planner \
  --prompt "TASK: PROJ-123, DESCRIPTION: Analyze OAuth implementation for parallel work opportunities"
# OR: "TASK: repo-a3f, DESCRIPTION: ..." (Beads)
# OR: "TASK: #456, DESCRIPTION: ..." (GitHub)
# OR: "TASK: sprint-5-auth, DESCRIPTION: ..." (custom)

# IMPLEMENTATION: Bug fix (any task ID format)
Task --subagent_type bug-fixer \
  --prompt "TASK: #456, DESCRIPTION: Fix null pointer in payment processing, add defensive checks"

# IMPLEMENTATION: Feature (backward compatible with Jira)
Task --subagent_type feature-developer \
  --prompt "TASK: PROJ-123, DESCRIPTION: Implement user profile API with avatar upload and validation"

# ENVIRONMENT: Setup worktree
Task --subagent_type branch-manager \
  --prompt "TASK: repo-a3f, WORKTREE: ./trees/repo-a3f-oauth, DESCRIPTION: Create worktree, install deps"

# QUALITY: Validation (MANDATORY)
Task --subagent_type test-runner \
  --prompt "TASK: sprint-5-auth, WORKTREE: ./trees/sprint-5-auth, DESCRIPTION: Run full test suite"

Task --subagent_type code-reviewer \
  --prompt "TASK: PROJ-123, WORKTREE: ./trees/PROJ-123-fix, DESCRIPTION: Review for security and quality"

# INTEGRATION: Safe merge
Task --subagent_type branch-manager \
  --prompt "TASK: PROJ-123, WORKTREE: ./trees/PROJ-123-fix, DESCRIPTION: Merge to develop safely"

# TICKET UPDATE: Only if using Jira (conditional on task ID format)
acli jira workitem transition --key PROJ-123 --status "In Review"  # Only for Jira tasks
```

---

**Remember:**
- **Main agents**: Guide subagents and validate their work. Never do implementation yourself.
- **Subagents**: Do the implementation work assigned to you. Follow TDD, SOLID, and all standards.

*Last updated: 2025-10-09 | Version 1.1.0*
