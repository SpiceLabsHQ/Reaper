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

### Full Development Pipeline

The complete development workflow follows this orchestrated pattern:

```
spice:orchestrate → Code Agent → Quality Gates → Integration
```

#### 1. Task Initiation: `spice:orchestrate`
- Analyzes requirements and selects appropriate specialized agent
- Assigns work to the most suitable code agent based on task type
- Monitors progress and determines completion readiness

#### 2. Code Implementation Phase
**Code agents execute the core development work:**

- **`bug-fixer`**: Systematic bug reproduction and fixing using TDD methodology
- **`feature-developer`**: New feature implementation with SOLID principles and comprehensive testing
- **`refactoring-specialist`**: Code improvement and technical debt elimination
- **`security-auditor`**: Security vulnerability assessment and remediation

**Key Characteristics:**
- Agents work independently with full autonomy
- Follow proven methodologies (TDD, SOLID principles)
- Generate comprehensive reports on completion
- Include test coverage, documentation, and validation results

#### 3. Completion Assessment
**Orchestrator determines work completion based solely on agent reports:**
- Reviews agent-generated completion reports
- Validates that acceptance criteria are met
- Confirms proper testing and documentation
- **Does not directly read files, run tests, or modify code**
- Makes go/no-go decisions for quality gate progression

#### 4. Quality Gate Sequence
**If work is deemed complete, sequential quality validation begins:**

**a) `test-runner` Agent**
- **Pre-execution validation**: Detects nested directories (trees/, backup/), previews test discovery
- **Test organization validation**: Warns about misplaced tests (e.g., integration tests in unit/)
- **Executes comprehensive test suites** with proper exclusion patterns
- **Validates 80%+ coverage requirements** for application code
- **Runs linting and type checking**
- **Performs build validation**
- **Provides structured JSON reports** with test counts, coverage metrics, and warnings
- **Must pass before proceeding**

**b) `code-reviewer` Agent**
- Conducts thorough code quality review
- Analyzes security vulnerabilities
- Validates best practices compliance
- Checks adherence to coding standards
- **Must pass before proceeding**

**c) `security-auditor` Agent**
- Performs comprehensive security analysis
- Scans for vulnerabilities and compliance issues
- Validates authentication and authorization patterns
- Reviews data handling and encryption practices
- **Must pass before integration**

#### 5. Iteration Loop
**If any quality gate fails:**
- Work returns to appropriate code agent for remediation
- Specific issues are addressed based on quality gate feedback
- Process repeats until all quality gates pass
- Full traceability maintained throughout iterations

#### 6. Integration and Completion
**Only after all quality gates pass:**
- Code integration to develop branch
- Jira ticket status updates
- Cleanup of temporary branches and worktrees
- Final documentation and deployment preparation

### Workflow Benefits

- **Separation of Concerns**: Orchestrator focuses on workflow, agents focus on execution
- **Quality Assurance**: Multi-layered validation prevents defects from reaching production
- **Iterative Improvement**: Failed quality gates provide specific feedback for remediation
- **Audit Trail**: Complete traceability from task initiation to integration
- **Consistency**: Standardized workflow regardless of task complexity

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