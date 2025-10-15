# Claude Code Configuration Directory

This directory contains the local configuration, documentation, and customizations for Claude Code.

## 📁 Directory Structure

```
.claude/
├── README.md                    # This documentation file
├── CLAUDE.md                    # Global instructions for Claude (REQUIRED by Claude Code)
├── settings.json                # Claude Code configuration settings
├── agents/                     # AI agent definitions
├── commands/                   # Custom slash commands
└── docs/                       # Documentation
    └── spice/                  # SPICE development standards
```

## 🔧 Core Configuration Files

### CLAUDE.md
**Location**: `CLAUDE.md`
**Purpose**: Global instructions that Claude reads before every conversation
**Cannot be moved**: This file must remain in the root directory as required by Claude Code

Contains:
- Supervisor role definition for Claude
- Communication guidelines
- Commit message requirements
- References to SPICE development standards

### settings.json
**Location**: `settings.json`
**Purpose**: Claude Code application settings and preferences

## 📚 Documentation (docs/)

### SPICE Development Standards
**Location**: `docs/spice/`
**Purpose**: Comprehensive development standards and workflows for Spice Labs projects

#### Core SPICE Files:
- **SPICE.md**: Main development standards document
  - LLM instructions and workflows
  - SOLID principles
  - Agent-driven development
  - Quality gates and standards

- **SPICE-Worktrees.md**: Git worktree management
  - Worktree workflows for LLMs
  - Safety protocols
  - Parallel development patterns

- **SPICE-Testing.md**: Testing requirements
  - TDD methodology
  - Coverage requirements (80%+)
  - Agent-driven testing workflows

- **SPICE-Git-Flow.md**: Git workflow standards
  - Branching strategy
  - Commit conventions
  - Main branch protection
  - Agent-enhanced git operations

#### Optimized Versions:
- **SPICE-*-OPTIMIZED.md**: Streamlined versions of core documentation

## 🤖 Agents (agents/)

AI agents that provide specialized development capabilities:

### Core Development Agents:
- **workflow-planner.md**: Analyzes complex tasks, identifies parallel work opportunities
- **bug-fixer.md**: Systematic bug reproduction and fixing using TDD methodology
- **feature-developer.md**: New feature implementation with SOLID principles and TDD
- **branch-manager.md**: Safe git operations, worktree management, conflict prevention

### Quality Assurance Agents:
- **test-runner.md**: Comprehensive testing, linting, and coverage validation
- **code-reviewer.md**: Code quality review, security analysis, best practices
- **security-auditor.md**: Security vulnerability assessment and compliance review

### Specialized Agents:
- **documentation-generator.md**: Comprehensive technical documentation creation
- **refactoring-specialist.md**: Code improvement and technical debt elimination
- **dev-comedian.md**: Humor and levity injection during development

## ⚡ Commands (commands/)

Custom slash commands for enhanced workflow:

- **spice:orchestrate.md**: Intelligent work assignment and task management
- **spice:status-worktrees.md**: Worktree status monitoring and management

## 🔑 Key Features

### Agent-Driven Development
- Systematic workflows following proven methodologies (TDD, SOLID, etc.)
- Built-in quality gates and validation
- Intelligent analysis for safe parallel development
- Automatic backups, conflict detection, rollback capabilities

### Git Worktree Management
- LLM work isolation in separate worktrees under `./trees/`
- Prevention of conflicts with main workspace
- Support for multiple feature branches simultaneously
- Automated setup, dependency management, safe cleanup

### Testing Excellence
- Mandatory Test-Driven Development for all code changes
- Enforced 80%+ coverage requirements for application code
- Systematic test generation and validation
- Comprehensive linting, type checking, security scanning

### Jira Integration
- Automated Jira ticket management via ACLI
- Workflow automation: status transitions, comment updates
- Support for Epic → Story → Sub-task hierarchies
- Pre-work ticket validation and blocker checking

## 🚀 Development Workflow

### Dynamic Strategy Selection

**The workflow adapts based on work complexity**, choosing from three strategies:

```
workflow-planner analyzes → selects strategy → executes optimally
```

### Strategy 1: Very Small Direct (Complexity Score ≤10)

**When:** Simple fixes, config changes, single-file updates, documentation
**How:** Orchestrator or synthetic agents with quality gate validation
**Environment:** Work directly on branch, no worktree needed
**Benefits:** Fastest path for trivial changes

**Workflow:**
```
1. Orchestrator/synthetic agent makes changes
2. Quality gates: test-runner → code-reviewer + security-auditor (parallel)
3. User reviews and manually commits/merges when ready
```

### Strategy 2: Medium Single Branch (Score ≤30, No File Overlap)

**When:** Medium complexity, parallel work possible, clear file boundaries, <5 work units
**How:** Single feature branch with parallel agents on non-overlapping files
**Environment:** Work on single branch in root directory
**Benefits:** Efficient parallel work without worktree overhead

**Workflow:**
```
1. branch-manager creates feature branch (no worktree)
2. Multiple agents work in parallel on EXCLUSIVE files
   - Agent A: src/auth.js, tests/auth.test.js (ONLY these)
   - Agent B: src/config.js, tests/config.test.js (ONLY these)
3. Agents detect file conflicts and exit if detected
4. Quality gates on combined work: test-runner → code-reviewer + security-auditor
5. User reviews and manually creates consolidated commit and merges when ready
```

**Safety:** Agents exit immediately if file conflicts detected; orchestrator resolves

### Strategy 3: Large Multi-Worktree (Score >30 OR File Overlap OR >5 Units)

**When:** High complexity, file overlap between work units, or many work units
**How:** Isolated worktrees for each work stream → consolidated review branch
**Environment:** Separate worktrees under `./trees/` directory
**Benefits:** Complete isolation prevents agent conflicts, manages complexity

**Workflow:**
```
1. branch-manager creates review branch (feature/PROJ-123-review)
2. branch-manager creates worktrees for each stream:
   - ./trees/PROJ-123-auth (authentication)
   - ./trees/PROJ-123-api (API endpoints)
   - ./trees/PROJ-123-ui (user interface)

3. For EACH worktree (sequential):
   a. Code agent implements work package (NO commits)
   b. Quality gates validate: test-runner → code-reviewer + security-auditor
   c. Iterate until ALL gates pass
   d. Orchestrator deploys branch-manager AFTER quality gates pass
   e. branch-manager commits in worktree (consolidation only)
   f. branch-manager merges worktree → review branch
   g. branch-manager cleans up worktree (verify no build artifacts)

4. Review branch contains all consolidated work
5. User reviews and manually merges review branch → develop when ready
```

**Safety:** Each worktree validated independently before consolidation

### Strategy Selection Criteria

**workflow-planner estimates complexity using measurable metrics:**

**1. File Impact Score:** file count × complexity per file (1-3 points)
**2. Dependency Complexity:** external APIs, DB changes, libraries (1-3 points each)
**3. Testing Burden:** unit (1pt), integration (2pt), e2e (3pt)
**4. Integration Risk:** file overlap (3pt), interface changes (2pt)
**5. Knowledge Uncertainty:** unfamiliar tech (3pt), unclear requirements (2pt)

**Total Score Determines Strategy:**
- Score ≤10: `very_small_direct`
- Score ≤30 (no overlap, ≤5 units): `medium_single_branch`
- Score >30 OR file overlap OR >5 units: `large_multi_worktree`

**Rationale Provided:** workflow-planner explains why each strategy was chosen

### Coding Agent Testing Philosophy

**Critical separation between development testing and quality validation:**

**Coding Agents (bug-fixer, feature-developer, refactoring-specialist):**
- Test ONLY their specific changes during TDD
- Run targeted tests: `npm test -- path/to/their-file.test.js`
- Do NOT run full test suite
- Results are for immediate feedback during Red-Green-Refactor
- Purpose: Verify THEIR changes work, enable fast iteration

**Quality Gate Agent (test-runner):**
- Runs FULL test suite with ALL tests
- Validates entire codebase for regressions
- Provides authoritative metrics for quality decisions
- Enforces 80%+ coverage across application code
- Purpose: Ensure NO regressions anywhere in codebase

**Why This Matters:**
- Prevents context exhaustion (coding agents don't run hundreds of tests)
- Avoids agent conflicts during parallel development
- Orchestrator uses only test-runner metrics for go/no-go decisions
- Clear separation: coding agents develop, test-runner validates

### Quality Gate Sequence (All Strategies)

**Sequential validation after implementation:**

**1. test-runner (MANDATORY first gate):**
- Runs complete test suite (unit, integration, e2e)
- Validates 80%+ coverage for application code
- Executes linting and type checking
- Performs build validation
- Must pass before proceeding

**2. code-reviewer + security-auditor (PARALLEL):**
- Deploy both simultaneously for efficiency
- Code-reviewer: quality, best practices, SOLID principles
- Security-auditor: vulnerabilities, compliance, security patterns
- Both must pass before user authorization

**3. Iteration Loop (AUTO-LOOP - NO user prompts):**
- If ANY gate fails → return to coding agent with blocking_issues
- Orchestrator automatically iterates until all gates pass
- No user intervention during iteration

**4. User Authorization Required:**
- After ALL gates pass → present to user
- Wait for explicit approval: "commit", "merge", "ship it", "approved"
- Only then deploy branch-manager for git operations

### Strategy Escalation

**If complexity exceeds original estimate:**

**Symptoms:**
- Agents routinely exceed context limits
- File overlap discovered during Strategy 2
- Work units larger than expected
- Quality gates repeatedly fail due to scope

**Action:**
- Redeploy workflow-planner to re-analyze
- Upgrade to higher complexity strategy
- Reorganize remaining work for new strategy
- May consolidate partial work before switching

### Workflow Benefits

- **Adaptive Complexity Handling**: Right tool for the job based on actual complexity
- **Efficient Parallel Work**: Strategy 2 enables safe concurrent development
- **Complete Isolation**: Strategy 3 prevents agent conflicts in complex scenarios
- **Quality Assurance**: Multi-layered validation prevents defects
- **Iterative Improvement**: Automatic iteration on quality gate failures
- **Context Optimization**: Agents test only their changes, not entire codebase
- **Audit Trail**: Complete traceability from planning to integration
- **Flexible Workflows**: No mandatory worktrees when not needed

## 🚀 Usage Patterns

### Starting Development Work
1. **Planning**: Use `workflow-planner` agent for complex tasks
2. **Validation**: Check Jira ticket status and dependencies
3. **Environment**: Create worktree with `branch-manager` agent
4. **Implementation**: Use `bug-fixer` or `feature-developer` agents
5. **Quality**: Validate with `test-runner` and `code-reviewer` agents
6. **Integration**: Safe merge with `branch-manager` agent

### Quality Assurance
- Run linting and fix issues before every commit
- Comprehensive testing and code review before every merge
- Regular security audits and vulnerability scans
- Keep code and documentation in sync

### Safety Protocols
- Main branch protection: LLMs cannot merge to main without explicit permission
- Automatic backup systems before destructive operations
- Pre-merge conflict analysis and validation
- Safe rollback capabilities for failed operations

This configuration provides a comprehensive, safe, and efficient development environment with built-in quality controls, security measures, and productivity enhancements for all Spice Labs projects.