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
├── skills/                     # Model-invoked capabilities
│   └── spice/                  # SPICE workflow utilities
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

### Strategic Planning Agents (blue):
- **workflow-planner.md**: Analyzes complex tasks, creates implementation plans with risk assessment and parallel work identification
- **api-designer.md**: Designs REST and GraphQL APIs with OpenAPI specifications, API contracts, and versioning strategies
- **cloud-architect.md**: Designs cloud infrastructure, manages infrastructure as code, optimizes cloud costs across AWS/GCP/Azure
- **database-architect.md**: Expert database architect specializing in schema design, migrations, query optimization, and scaling strategies

### Infrastructure & Setup Agents (cyan):
- **branch-manager.md**: Safe git operations, worktree management, repository maintenance, and conflict prevention

### Active Development Agents (green):
- **feature-developer.md**: Implements new features using TDD methodology with SOLID principles and comprehensive test coverage
- **bug-fixer.md**: Diagnoses and fixes bugs using systematic reproduction and minimal fixes with TDD methodology
- **refactoring-specialist.md**: Identifies and implements code improvements through systematic refactoring while preserving functionality

### Quality Gates Agents (yellow):
- **test-runner.md**: Executes comprehensive testing and linting with structured JSON validation - authoritative for quality decisions
- **code-reviewer.md**: Performs verified code review with compilation testing and evidence-based quality assessment
- **security-auditor.md**: Performs verified security vulnerability assessment using actual tool execution and evidence-based reporting
- **performance-engineer.md**: Performs systematic performance analysis, load testing, query optimization, and scalability tuning

### Integration & Release Agents (magenta):
- **deployment-engineer.md**: Implements CI/CD pipelines, manages deployment strategies, handles release automation with versioning
- **integration-engineer.md**: Integrates third-party services, APIs, webhooks, and event-driven systems with secure external connections

### Operations & Monitoring Agents (red):
- **incident-responder.md**: Diagnoses and resolves production incidents using systematic log analysis and coordinated remediation

### Documentation & Knowledge Agents (white):
- **documentation-generator.md**: Creates comprehensive technical documentation from codebases with verification and accuracy standards
- **claude-agent-architect.md**: Designs, creates, and refactors specialized agents with clear purposes and adherence to design principles

### Agent Configuration Reference
- **format-template.example**: **Reference example** showing the standard agent structure
  - **Format**: YAML frontmatter with four required fields:
    - `name`: The unique agent identifier (e.g., `bug-fixer`, `workflow-planner`)
    - `description`: Detailed description with `<example>` tags showing deployment scenarios
    - `model`: Model selection using shorthand (`sonnet` or `haiku` - no version numbers)
    - `color`: Workflow stage color (`blue`, `cyan`, `green`, `yellow`, `magenta`, `red`, `white`, `black`)
  - **Optional field**: `tools` - Only specify to restrict tool access for narrow single-purpose agents (defaults to all tools)
  - **Usage**: Reference this file to understand agent structure; it's a complete working example, not a blank template
  - **Note**: When creating custom agents, follow this format but adapt the systemPrompt content to your specific agent's purpose

### Agent Model Selection Guidelines

When designing or updating agents, select the appropriate Claude model based on task characteristics.

**Valid model values in YAML frontmatter:** `sonnet`, `haiku`, or `opus` (no version numbers)

**Use Sonnet (`model: sonnet`) for:**
- **Strategic Thinking**: Complex planning, risk assessment, architectural decisions
- **Deep Analysis**: Security vulnerability assessment, OWASP compliance, threat modeling
- **Complex Patterns**: SOLID principle enforcement, code smell detection, architectural refactoring
- **Trade-off Analysis**: Multi-factor decision making, cost-benefit analysis
- **Quality Assessment**: Comprehensive code review, security analysis, best practices evaluation

**Use Haiku (`model: haiku`) for:**
- **Systematic Work**: Following established TDD patterns, implementing well-defined features
- **Procedural Tasks**: Git operations, worktree management, repository maintenance
- **Execution & Validation**: Running tests, parsing results, generating metrics
- **Template-Based Work**: Documentation generation, report creation from code analysis
- **Targeted Implementation**: Bug fixing with clear reproduction steps, focused feature development

**Selection Criteria:**
- **Complexity**: Does the task require weighing multiple factors and making strategic decisions? (Sonnet) Or following clear procedures? (Haiku)
- **Analysis Depth**: Does it need cross-component impact analysis and architectural thinking? (Sonnet) Or focused, targeted analysis? (Haiku)
- **Decision Making**: Does it involve complex trade-offs and risk assessment? (Sonnet) Or following established patterns? (Haiku)
- **Speed vs. Depth**: Is rapid execution more important than deep strategic thinking? (Haiku) Or is thorough analysis critical? (Sonnet)

Both models are excellent at coding and significantly outperform previous generations. Choose based on the type of thinking required, not the difficulty of the code itself.

### Agent Color Standard

Agent colors provide visual feedback about **where you are in the development workflow**, similar to a traffic light system that guides you through the process from planning to production.

**Zsh Color Names:**
- `blue` - Strategic Planning
- `cyan` - Infrastructure & Setup
- `green` - Active Development
- `yellow` - Quality Gates
- `magenta` - Integration & Release
- `red` - Operations & Monitoring
- `white` - Documentation & Knowledge
- `black` - Platform Specialists

#### Stage 1: Strategic Planning (blue)

**Purpose:** Pre-development analysis, scope understanding, and approach planning

**When to use:** Assign this color to agents that analyze requirements, plan architectures, assess risks, or create implementation strategies before any coding begins.

**Example activities:**
- Breaking down complex features into work units
- Creating technical specifications from requirements
- Analyzing system architecture and design patterns
- Estimating complexity and resource needs

#### Stage 2: Infrastructure & Setup (cyan)

**Purpose:** Preparing environments, scaffolding, and establishing foundations

**When to use:** Assign this color to agents that set up infrastructure, manage environments, provision resources, or create project scaffolding.

**Example activities:**
- Creating git worktrees and branch structures
- Installing dependencies and resolving versions
- Provisioning cloud resources or databases
- Generating configuration files and boilerplate

#### Stage 3: Active Development (green)

**Purpose:** Building, coding, implementing features, and creating functionality

**When to use:** Assign this color to agents that write code, implement features, fix bugs, or actively develop functionality. This is the "GO" signal for making progress.

**Example activities:**
- Implementing new features and functionality
- Fixing bugs and defects
- Refactoring code for quality improvement
- Creating database migrations or API endpoints

#### Stage 4: Quality Gates (yellow)

**Purpose:** Validation checkpoint - pause and verify before proceeding

**When to use:** Assign this color to agents that test, review, audit, or validate code. This is the "CAUTION" signal where we stop and check our work, like a traffic light yellow light.

**Example activities:**
- Running comprehensive test suites
- Reviewing code quality and patterns
- Scanning for security vulnerabilities
- Validating performance or accessibility
- Checking compliance requirements

#### Stage 5: Integration & Release (magenta)

**Purpose:** Consolidating work and preparing for deployment

**When to use:** Assign this color to agents that merge branches, coordinate releases, prepare deployments, or consolidate work packages.

**Example activities:**
- Merging feature branches to review branches
- Bumping versions and generating changelogs
- Optimizing production builds
- Coordinating deployment pipelines

#### Stage 6: Operations & Monitoring (red)

**Purpose:** Production runtime, incident response, and system health monitoring

**When to use:** Assign this color to agents that monitor production systems, respond to incidents, analyze runtime behavior, or maintain operational health. This is the "ALERT" signal for production concerns.

**Example activities:**
- Diagnosing production incidents
- Analyzing performance metrics and logs
- Executing rollbacks or emergency fixes
- Monitoring service availability

#### Stage 7: Documentation & Knowledge (white)

**Purpose:** Explaining, teaching, and preserving institutional knowledge

**When to use:** Assign this color to agents that generate documentation, create guides, explain systems, or maintain knowledge bases. White represents clarity and illumination.

**Example activities:**
- Generating API documentation
- Creating user guides and tutorials
- Writing technical specifications
- Maintaining wikis and knowledge bases

#### Stage 8: Platform Specialists (black)

**Purpose:** Deep expertise in specific platforms, tools, or APIs

**When to use:** Assign this color ONLY to agents with specialized knowledge of particular platforms or technologies that can be called from any workflow stage. These are orthogonal to the workflow progression.

**Example activities:**
- AWS/GCP/Azure service optimization
- Docker/Kubernetes deployment strategies
- Database-specific tuning (Postgres, Redis, etc.)
- Framework-specific patterns (React, Next.js, etc.)

**Selection Notes:**
- Agents should have ONE primary color based on where they are MOST commonly used
- If an agent operates in multiple stages, choose its PRIMARY or FIRST-USE stage
- Only use black for true cross-cutting platform experts, not general-purpose helpers
- Colors provide UX feedback on workflow progress - users should instantly know "where we are"

#### Color Assignment Status

**Currently Assigned (Active Agents):**
- `blue` - workflow-planner
- `cyan` - branch-manager
- `green` - feature-developer, bug-fixer, refactoring-specialist
- `yellow` - test-runner, code-reviewer, security-auditor
- `white` - documentation-generator

**Reserved for Future Use (No Current Agents):**
- `magenta` - Reserved for Integration & Release stage agents (release-manager, deployment-orchestrator, rollout-coordinator)
- `red` - Reserved for Operations & Monitoring stage agents (incident-responder, performance-monitor, log-analyzer, health-checker)
- `black` - Reserved for Platform Specialist agents (aws-specialist, docker-specialist, kubernetes-specialist, postgres-specialist)

All standard zsh colors (8 total) have been assigned to workflow stages, with 3 colors currently reserved for future agent development.

## ⚡ Commands (commands/)

Custom slash commands for enhanced workflow:

- **spice:orchestrate.md**: Validation and coordination supervisor - parses inputs, enforces quality gates, coordinates agents
  - Delegates to workflow-planner for strategy selection and implementation guidance
  - Validates agent JSON responses and enforces size constraints
  - Manages quality gate sequence and auto-iteration loops
  - ~376 lines (streamlined to prevent context exhaustion)
- **spice:status-worktrees.md**: Worktree status monitoring and management

## 🎯 Skills (skills/)

Model-invoked capabilities that automatically activate when relevant to the current workflow.

### What Are Skills?

Skills are **model-invoked** capabilities that Claude autonomously activates based on context and task requirements. Unlike slash commands (which users invoke explicitly), skills are discovered and used by Claude when relevant.

**Key Differences from Slash Commands:**
- **Slash Commands**: User-invoked with `/command-name`, explicit activation
- **Skills**: Model-invoked automatically when relevant to the current task

### Skill Structure

Skills are organized in directories containing a `SKILL.md` file plus optional supporting materials.

**Single-Skill Package:**
```
skills/
└── skill-name/
    ├── SKILL.md              # Required: Skill definition with YAML frontmatter
    ├── examples/             # Optional: Example files and templates
    ├── scripts/              # Optional: Executable scripts and utilities
    ├── templates/            # Optional: Code templates and boilerplate
    └── docs/                 # Optional: Reference documentation
```

**Multi-Skill Package:**

For related capabilities, organize multiple skills in a single package:

```
skills/
└── package-name/
    ├── SKILL.md              # Package-level skill (optional)
    ├── SKILL_NAME_1.md       # Individual skill 1
    ├── SKILL_NAME_2.md       # Individual skill 2
    ├── SKILL_NAME_3.md       # Individual skill 3
    ├── scripts/              # Shared scripts for all skills
    ├── templates/            # Shared templates
    └── docs/                 # Shared reference documentation
```

**Multi-Skill Package Benefits:**
- **Organization**: Group related skills together (e.g., all git workflows, all testing utilities)
- **Shared Resources**: Scripts, templates, and documentation shared across skills
- **Namespace Management**: Package name provides context (e.g., `spice/GIT_COMMIT`)
- **Easier Maintenance**: Update shared resources once, benefit all skills

**Example - SPICE Package:**
```
skills/spice/
├── SKILL.md           # Package overview and shared documentation references
├── GIT_COMMIT.md      # Skill for SPICE-compliant commit messages
├── TEST_RUNNER.md     # (Future) Skill for test execution patterns
└── LINT_FIX.md        # (Future) Skill for linting automation
```

### SKILL.md Format

Every skill requires a `SKILL.md` file with YAML frontmatter followed by Markdown content:

```markdown
---
name: skill-name
description: What it does and when to use it (be specific about triggers)
allowed-tools: [optional, tool, restrictions]
---

# Skill Name

Detailed instructions, examples, and documentation that Claude reads when the skill activates.
```

**Critical Fields:**
- `name`: Unique identifier for the skill
- `description`: **Most important field** - should specify both functionality AND usage triggers so Claude knows when to activate
- `allowed-tools`: Optional - restricts which tools Claude can use when this skill is active

### Supporting Files

Skills can include any supporting materials in their directory:

**Scripts & Executables:**
- Bash scripts for automation
- Python/Node.js utilities
- Helper programs that the skill can invoke

**Templates & Boilerplate:**
- Code templates for common patterns
- Configuration file templates
- Documentation templates

**Reference Materials:**
- Examples of correct/incorrect usage
- Standards and style guides
- Lookup tables and reference data
- External documentation excerpts

**Organization Best Practices:**
- Use subdirectories to organize supporting files (`scripts/`, `templates/`, `examples/`)
- Reference supporting files by relative path in SKILL.md
- Keep files focused - one concern per file
- Include README files in subdirectories for complex organizations

### Creating Skills

Skills are located in `~/.claude/skills/` and available across all projects. Use them for universal utilities, workflow automation, and standards enforcement.

**Creating a New Skill:**

1. **Create the skill directory**: `mkdir -p ~/.claude/skills/skill-name`
2. **Create SKILL.md** with YAML frontmatter and instructions
3. **Add supporting files** (scripts, templates, examples) as needed
4. **Test activation** by using tasks that should trigger the skill

**Creating a Multi-Skill Package:**

1. **Create the package directory**: `mkdir -p ~/.claude/skills/package-name`
2. **Create package-level SKILL.md** (optional, for shared context)
3. **Create individual skill files**: `SKILL_NAME.md` for each capability
4. **Add shared resources** in subdirectories (scripts, templates, docs)
5. **Test each skill** independently to ensure proper activation

### Best Practices

1. **Write Specific Descriptions**: Include concrete triggers and use cases
   - ✅ Good: "Writes SPICE-compliant commit messages when creating commits or when commit message assistance is needed"
   - ❌ Bad: "Helps with commits"

2. **Keep Skills Focused**: Each skill should address one capability
   - One skill per workflow or task type
   - Use skill packages (directories with multiple skills) for related capabilities

3. **Progressive File Access**: Claude reads supporting files only when needed
   - Don't duplicate content between SKILL.md and supporting files
   - Reference supporting files, don't inline everything

4. **Test Activation**: Verify the skill activates appropriately
   - Test with relevant user requests
   - Adjust description if activation is too broad or too narrow

5. **Document Examples**: Include both correct and incorrect usage examples
   - Show common mistakes and how to avoid them
   - Provide templates for complex formats

### Installed Skills

- **spice/**: SPICE development workflow utilities for commit standards, testing patterns, and quality automation
  - Automatically enforces SPICE standards during development
  - Includes GIT_COMMIT skill for conventional commit format
  - Supporting documentation references SPICE standards in `docs/spice/`

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

### Beads Issue Tracking
This project uses [Beads](https://github.com/steveyegge/beads) for lightweight, git-native issue tracking with a dedicated `beads-sync` orphan branch.

**Setup Auto-Sync (Required for Contributors):**

Add this SessionStart hook to your Claude Code settings (`~/.claude/settings.json` or project settings):

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bd daemon --start --auto-commit --auto-push 2>/dev/null; bd prime --stealth"
          }
        ]
      }
    ]
  }
}
```

This starts the Beads daemon with auto-commit and auto-push on every Claude session, ensuring your issue changes sync to the shared `beads-sync` branch.

**For New Clones:**
```bash
bd migrate-sync beads-sync  # Configure sync to existing beads-sync branch
```

## 🚀 Development Workflow

### Dynamic Strategy Selection

**The workflow adapts based on work complexity**, orchestrated through collaboration:

```
orchestrate → workflow-planner (strategy + implementation plan) → orchestrate (executes + validates)
```

**Key Principle:** workflow-planner is the **single source of truth** for:
- Strategy selection rationale
- Work package decomposition and sizing
- Agent deployment sequences and instructions
- Quality gate checkpoints and validation criteria
- Implementation workflows for all three strategies

**orchestrate's Role:** Validates inputs, enforces size constraints, coordinates agents per workflow-planner's guidance, and manages quality gates.

**Note:** The strategy descriptions below are high-level overviews for user understanding. Detailed implementation workflows, agent deployment sequences, and quality gate configurations are maintained in workflow-planner agent specification (~1083 lines).

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