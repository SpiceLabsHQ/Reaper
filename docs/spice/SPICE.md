# 🌶️ Spice Labs Development Standards v1.4.0

> *"Code without standards is like cooking without a recipe - you might get lucky, but you probably won't."*

## 🤖 LLM Instructions

**MANDATORY**: Follow these standards for ALL Spice Labs projects:
- **ROOT DIRECTORY PROHIBITION**: LLMs must NEVER work directly in the root project directory
- **ALL WORK IN WORKTREES**: Every edit, test, and command must happen in ./trees/ worktrees
- **NO ENVIRONMENT VARIABLE COMMANDS**: Commands must not start with variable assignments
- **Worktrees**: See @SPICE-Worktrees.md - ALL LLM work MUST happen in worktrees
- **Testing**: See @SPICE-Testing.md - TDD required, 80%+ coverage, ALL tests run in worktree
- **Git Flow**: See @SPICE-Git-Flow.md - Commits, branching, merge protection
- **Task Management**: Use TodoWrite with Jira updates
- **Pre-work**: Validate Jira ticket before starting
- **Design**: Apply SOLID principles
- **Analysis**: Use mcp__sequential-thinking for complex problems
- **Research**: Use Task tool for multi-step searches
- **Web Scraping**: Default to mcp__firecrawl tools
- **Browser Testing**: Use mcp__puppeteer and mcp__browser-tools

### 🚫 FORBIDDEN: Fabricating Information
**NEVER** invent Jira IDs, test results, or any data. If missing Jira KEY, STOP and ask user.
**KEY Format**: Jira project prefix + number (e.g., PROJ-123, BUG-456) - user must provide this.

## 📋 Module Cross-References
1. **@SPICE-Worktrees.md** - Git worktree workflows, safety warnings, remote management
2. **@SPICE-Testing.md** - TDD workflows, testing requirements, coverage standards
3. **@SPICE-Git-Flow.md** - Branching strategy, commit standards, main branch protection
4. **@SPICE-Cloud-Infrastructure.md** - Default regions, resource naming conventions

## 🎯 Instruction Precedence Rules

When instructions conflict, follow this hierarchy:
1. **Main Branch Protection** overrides all git workflow instructions
2. **Safety warnings** override convenience patterns  
3. **Later sections** take precedence over earlier conflicting guidance
4. **CRITICAL warnings** override standard procedures

## 📝 Placeholder Convention

- **PROJ-123**: Replace with your actual Jira ticket key (e.g., BUG-456, FEAT-789)
- **description**: Replace with brief feature/fix description
- All examples show the pattern - substitute your actual values

---

## 🏗️ SOLID Principles

### S - Single Responsibility
- One class = one reason to change
- No "god classes"

### O - Open/Closed
- Open for extension, closed for modification
- Use interfaces/inheritance

### L - Liskov Substitution
- Subclasses replaceable for parent classes
- No unexpected exceptions

### I - Interface Segregation
- Small, focused interfaces
- No unused methods

### D - Dependency Inversion
- Depend on abstractions
- Inject dependencies

**Example Pattern:**
```javascript
// DIP: Inject dependencies
class OrderService {
  constructor(notifier) { // Not EmailNotifier
    this.notifier = notifier;
  }
}
```

---

## 📦 Versioning

**Use SemVer for:**
- CLI tools, libraries, APIs
- Mobile apps, MCP servers

**NO SemVer for:**
- Websites, web apps, docs

**Format:** MAJOR.MINOR.PATCH

---

## 🚀 CI/CD

**Pipeline Requirements:**
1. Run on every push
2. Execute tests + coverage
3. Run linting
4. Build/compile

**Branch Protection:**
- main: 2 approvals, passing builds
- develop: 1 approval, passing builds

### 🔐 OIDC Authentication (Bitbucket → AWS)

**MANDATORY**: Use OIDC for Bitbucket Pipelines AWS access whenever possible. Never use static access keys.

**Why OIDC:**
- No static credentials to rotate or leak
- Auditable via CloudTrail
- AWS-recommended for CI/CD

**Spice Labs Setup:**
All Spice-managed AWS accounts are pre-configured to trust `https://bitbucket.org/spice-labs/`. No additional AWS setup needed for repos in this workspace.

**Pipeline Configuration:**
```yaml
definitions:
  steps:
    - step: &deploy-to-aws
        name: Deploy to AWS
        oidc: true  # Required: enables OIDC token
        script:
          - export AWS_ROLE_ARN="arn:aws:iam::ACCOUNT_ID:role/ROLE_NAME"
          - export AWS_DEFAULT_REGION="us-east-1"
          - aws sts get-caller-identity  # Verify auth
          - # Your deployment commands
```

**Required Variables:**

| Variable | Required | Description |
|----------|----------|-------------|
| `AWS_ROLE_ARN` | Yes | IAM role ARN to assume |
| `AWS_DEFAULT_REGION` | Yes | AWS region for API calls |
| `AWS_WEB_IDENTITY_TOKEN_FILE` | Auto | Set by Bitbucket when `oidc: true` |

**Reference:**
- [AWS OIDC Web Identity](https://docs.aws.amazon.com/sdkref/latest/guide/access-assume-role-web.html)
- [Bitbucket OIDC Docs](https://support.atlassian.com/bitbucket-cloud/docs/deploy-on-aws-using-bitbucket-pipelines-openid-connect/)

---

## 📋 Jira Integration

### Hierarchy
```
Epic
  └─> Story (--parent flag)
       └─> Sub-task (--parent flag)
Bug (standalone)
Task (standalone or child)
```

### 🚨 Epic/Story Workflow (Required)

**Given ANY ticket:**
1. Check hierarchy: `acli jira workitem search --jql "parent = PROJ-123"`
2. If no children found → work on this ticket directly
3. If children found → branch at parent level, work on children
4. TodoWrite ALL children before starting
5. Update parent status to "In Progress"
6. If ticket blocked → STOP, tell user to unblock first

### Pre-Work Validation
```bash
# 1. Verify tools exist
command -v acli >/dev/null || { echo "STOP: Install acli first"; exit 1; }
command -v git >/dev/null || { echo "STOP: Install git first"; exit 1; }

# 2. View ticket and check blockers
acli jira workitem view PROJ-123 --fields summary,status,parent,blockedby
# If blockedby has values → STOP, tell user

# 3. Update status (REQUIRED)
acli jira workitem transition --key PROJ-123 --status "In Progress" \
|| { echo "STOP: Invalid status transition"; exit 1; }

# 4. Create worktree (see @SPICE-Worktrees.md for full workflow)
mkdir -p trees
git worktree add ./trees/PROJ-123-description -b feature/PROJ-123-description develop
```

### ACLI Commands
```bash
# Create (use exact types: Epic, Story, Sub-task, Bug, Task)
acli jira workitem create --project KEY --type Story \
  --parent EPIC-KEY --summary "Title" --description "Details"

# Search (use 'issuetype' not 'type')
acli jira workitem search --jql "parent = PROJ-100" \
  --fields key,summary,issuetype,status

# Transition
acli jira workitem transition --key PROJ-123 --status "In Review"

# Comment (separate from transitions/edits)
acli jira workitem comment --key PROJ-123 --body "Comment text here"
```

### 📝 Adding Comments
**IMPORTANT**: Comments must be added as separate commands
- Cannot add comments during transitions or edits
- Use `acli jira workitem comment` command
- Supports single ticket (--key) or multiple (--jql)

### ✅ Completion Workflow
**MANDATORY**: After successful merge to develop branch, transition ticket to "In Review" status:

```bash
# Update Jira ticket to In Review (replace PROJ-123 with your ticket)
acli jira workitem transition --key PROJ-123 --status "In Review" || { 
    echo "WARNING: Could not transition PROJ-123 to In Review status"
    echo "Please manually update the ticket status in Jira"
}
```

**When to mark In Review:**
- ✅ Code merged successfully to develop branch
- ✅ All tests passing
- ✅ Worktree cleaned up
- ✅ Feature branch deleted

**Important**: Work is NOT complete until Jira ticket is moved to In Review status.

### POST-APPROVAL
User approval triggers: "approved", "ship it", "merge it"
Status: In Review→Done (ONLY after cleanup)
Cleanup: Task-scoped worktrees/branches only

---

## 🔒 Security

- Never commit secrets/keys
- Run `npm audit` or `pip check` before commits
- **Run available linting before ALL commits** to fix formatting issues
- Validate all inputs

## 🎨 Linting & Code Quality

**MANDATORY before commits**: Run available linting to fix formatting issues and prevent commit hook failures.

**Project-specific linting commands:**
```bash
# JavaScript/Node.js projects
if [ -f package.json ]; then 
    npm run lint:fix 2>/dev/null || npm run lint 2>/dev/null || yarn lint:fix 2>/dev/null || yarn lint 2>/dev/null
fi

# Python projects  
if [ -f requirements.txt ] || [ -f pyproject.toml ]; then
    black . 2>/dev/null && isort . 2>/dev/null && flake8 . 2>/dev/null || ruff format . 2>/dev/null && ruff check --fix . 2>/dev/null
fi

# PHP projects
if [ -f composer.json ]; then
    ./vendor/bin/php-cs-fixer fix . 2>/dev/null || composer run lint:fix 2>/dev/null
fi

# Ruby projects
if [ -f Gemfile ]; then
    bundle exec rubocop -a 2>/dev/null || rubocop -a 2>/dev/null
fi

# Go projects
if [ -f go.mod ]; then
    gofmt -w . 2>/dev/null && golangci-lint run --fix 2>/dev/null
fi
```

**Exit code verification required** - agents must verify linting passes before committing:
```bash
LINT_EXIT_CODE=0
# Run project-specific linting and capture exit code
(cd ./trees/PROJ-123-description && npm run lint) || LINT_EXIT_CODE=$?
[ $LINT_EXIT_CODE -eq 0 ] || { echo "ERROR: Linting failed with exit code $LINT_EXIT_CODE"; exit 1; }
```

---

## 🛠️ MCP Tools

**Use these specialized tools** for enhanced capabilities:

### 🤔 Sequential Thinking (`mcp__sequential-thinking__sequentialthinking`)
- **When**: Complex problems requiring step-by-step analysis
- **Use for**: Algorithm design, debugging complex issues, architectural decisions
- **Features**: Revise thoughts, branch thinking, hypothesis testing

### 🔍 Research & Analysis
- **Task Tool**: Multi-step searches, open-ended research
- **Agent Tool**: When searching for keywords/files across codebase
- **Grep/Glob**: Direct file pattern matching

### 🌐 Web Scraping & Browser Automation
**Default to Firecrawl** (`mcp__firecrawl__*`):
- `firecrawl_scrape`: Single page extraction
- `firecrawl_search`: Web search with content extraction
- `firecrawl_deep_research`: Complex research questions
- `firecrawl_extract`: Structured data extraction

**Browser Testing** (`mcp__puppeteer__*`, `mcp__browser-tools__*`):
- Navigation and interaction
- Performance/SEO/Accessibility audits
- Console/Network debugging
- Screenshots and element inspection

### 📊 IDE Integration (`mcp__ide__*`)
- `getDiagnostics`: Language server errors/warnings
- `executeCode`: Run Python in Jupyter kernels

---

## 🤖 LLM Coding Agents (MANDATORY)

**CRITICAL**: Use specialized coding agents for enhanced development workflows. These agents provide systematic approaches to complex development tasks with built-in quality controls and parallel work optimization.

### 📋 Agent Selection Matrix

| Task Type | Required Agent | When to Use | Key Benefits |
|-----------|---------------|-------------|--------------|
| **Complex Planning** | `reaper:workflow-planner` | ≥3 steps, multi-component features | Parallel work analysis, conflict prevention |
| **Bug Reports** | `reaper:bug-fixer` | All bug fixes and issues | TDD methodology, systematic reproduction |
| **New Features** | `reaper:feature-developer` | All new functionality | SOLID principles, comprehensive testing |
| **Git Operations** | `reaper:branch-manager` | Worktree management, merges | Safe operations, automated backups |
| **Code Quality** | `reaper:code-reviewer` | Before merges, quality gates | Security analysis, best practices |
| **Testing** | `reaper:test-runner` | Quality validation, CI/CD | Comprehensive coverage, lint validation |

### 🎯 Workflow Planning (ALWAYS FIRST)

**MANDATORY**: Start every multi-step task with workflow planning to identify parallel work opportunities.

```bash
# REQUIRED: Analyze task complexity and parallel opportunities
Task --subagent_type reaper:workflow-planner \
  --description "Plan implementation strategy" \
  --prompt "Analyze [FEATURE/BUG] requirements, identify components that can be developed in parallel worktrees without merge conflicts. Map dependencies and create phased implementation plan."
```

**Agent Outputs:**
- **Task Decomposition**: Break complex work into manageable units
- **Parallel Work Analysis**: Identify safe concurrent development paths  
- **Dependency Mapping**: Understand component relationships
- **Conflict Prevention**: File overlap analysis and work partitioning
- **Risk Assessment**: Integration challenges and mitigation strategies

**When Agent Recommends Parallel Work:**
```bash
# Example: Agent identifies 3 parallel-safe components
mkdir -p trees
git worktree add ./trees/PROJ-123-frontend -b feature/PROJ-123-frontend develop
git worktree add ./trees/PROJ-123-backend -b feature/PROJ-123-backend develop  
git worktree add ./trees/PROJ-123-tests -b feature/PROJ-123-tests develop

# Work concurrently in separate worktrees, merge sequentially
```

### 🐛 Bug Fixing (SYSTEMATIC TDD)

**MANDATORY**: Use `reaper:bug-fixer` agent for all bug reports and issues.

```bash
# REQUIRED: Systematic bug reproduction and fixing
Task --subagent_type reaper:bug-fixer \
  --description "Fix reported bug with TDD" \
  --prompt "Reproduce bug [JIRA_KEY]: [BUG_DESCRIPTION]. Write failing test, implement minimal fix, ensure comprehensive test coverage. Follow Red-Green-Refactor methodology."
```

**Agent Workflow:**
1. **RED**: Write failing test that reproduces the bug
2. **GREEN**: Implement minimal fix to make test pass  
3. **BLUE**: Refactor for quality and comprehensive coverage
4. **Validation**: Run full test suite, ensure no regressions

**Why This Agent:**
- **Systematic Approach**: Consistent TDD methodology
- **Regression Prevention**: Comprehensive test coverage
- **Quality Assurance**: SOLID principles compliance
- **Documentation**: Structured bug fix reports

### 🚀 Feature Development (TDD + SOLID)

**MANDATORY**: Use `reaper:feature-developer` agent for all new functionality.

```bash
# REQUIRED: Feature implementation with TDD and SOLID principles
Task --subagent_type reaper:feature-developer \
  --description "Implement new feature" \
  --prompt "Implement [FEATURE_NAME] for [JIRA_KEY]. Use TDD methodology, apply SOLID principles, ensure 80%+ test coverage. Create integration tests for feature workflows."
```

**Agent Capabilities:**
- **TDD Implementation**: Test-first development methodology
- **SOLID Architecture**: Single responsibility, dependency injection
- **Integration Testing**: End-to-end workflow validation
- **Quality Gates**: Linting, type checking, security validation

**Perfect For:**
- New API endpoints with validation
- UI components with proper testing
- Service classes with dependency injection
- Database integrations with migrations

### 🌳 Branch Management (SAFE GIT OPS)

**RECOMMENDED**: Use `reaper:branch-manager` agent for git operations and worktree management.

```bash
# RECOMMENDED: Safe worktree setup and management
Task --subagent_type reaper:branch-manager \
  --description "Setup worktree environment" \
  --prompt "Create clean worktree for [JIRA_KEY], setup dependencies, validate environment. Provide safe merge operations when work complete."
```

**Agent Benefits:**
- **Safe Operations**: Automated backups, conflict detection
- **Environment Setup**: Dependency installation, validation
- **Merge Safety**: Pre-merge testing, conflict analysis
- **Cleanup**: Proper worktree teardown, branch management

### 📊 Quality Assurance Integration

**Chain Agent Usage** for comprehensive quality:

```bash
# 1. Plan the work
Task --subagent_type reaper:workflow-planner --prompt "Analyze requirements..."

# 2. Implement with appropriate agent
Task --subagent_type reaper:feature-developer --prompt "Implement feature..."
# OR
Task --subagent_type reaper:bug-fixer --prompt "Fix reported issue..."

# 3. Quality validation
Task --subagent_type reaper:test-runner --prompt "Run comprehensive testing..."

# 4. Code review before merge
Task --subagent_type reaper:code-reviewer --prompt "Review implementation..."

# 5. Safe merge operations
Task --subagent_type reaper:branch-manager --prompt "Merge to develop..."
```

### ⚡ Parallel Work Optimization

**MAXIMIZE EFFICIENCY**: Use workflow planning to identify parallel development opportunities.

**Safe Parallel Patterns** (Agent-Verified):
- **Frontend/Backend Separation**: Different codebases, minimal file overlap
- **Feature Components**: Independent modules with clear interfaces
- **Test Development**: Unit tests, integration tests, documentation
- **Configuration**: Environment-specific configs, deployment scripts

**Avoid Parallel Work** (Agent Will Flag):
- **Shared Database Schema**: Migration conflicts
- **Core Service Changes**: API contract modifications  
- **Authentication System**: Security-critical shared code
- **Build Configuration**: Package.json, requirements.txt changes

**Agent-Recommended Parallel Workflow:**
```bash
# Agent identifies 3 safe parallel streams
STREAM_1="frontend-components"
STREAM_2="backend-services" 
STREAM_3="documentation-tests"

# Create parallel worktrees
for stream in $STREAM_1 $STREAM_2 $STREAM_3; do
  git worktree add ./trees/PROJ-123-$stream -b feature/PROJ-123-$stream develop
done

# Work concurrently, merge in dependency order (agent provides sequence)
```

### 🔄 Agent Integration Workflow

**Enhanced Development Process:**

1. **Planning Phase** (MANDATORY)
   ```bash
   Task --subagent_type reaper:workflow-planner --prompt "Analyze [TASK] for parallel opportunities"
   ```

2. **Implementation Phase** (Choose Appropriate Agent)
   ```bash
   # For bugs:
   Task --subagent_type reaper:bug-fixer --prompt "Systematic bug reproduction and fix"
   
   # For features:  
   Task --subagent_type reaper:feature-developer --prompt "TDD feature implementation"
   ```

3. **Quality Phase** (MANDATORY)
   ```bash
   Task --subagent_type reaper:test-runner --prompt "Comprehensive testing validation"
   Task --subagent_type reaper:code-reviewer --prompt "Quality and security review"
   ```

4. **Integration Phase** (RECOMMENDED)
   ```bash
   Task --subagent_type reaper:branch-manager --prompt "Safe merge operations"
   ```

---

## 🧠 Extended Thinking

**For complex tasks**, use sequential thinking tool:

```bash
# Example: Designing a caching strategy
mcp__sequential-thinking__sequentialthinking
- thought: "First, I need to understand the current data access patterns..."
- next_thought_needed: true
- thought_number: 1
- total_thoughts: 5  # Can adjust as needed
```

**Key Features:**
- **Revise previous thoughts**: Mark with `is_revision: true`
- **Branch thinking**: Use `branch_from_thought` for alternatives
- **Hypothesis testing**: Generate → Verify → Iterate
- **Dynamic planning**: Adjust `total_thoughts` as understanding evolves

**When to Use:**
- Architectural decisions
- Complex algorithm design
- Debugging intricate issues
- Multi-faceted problem solving
- Performance optimization strategies

---

## 📖 LLM Quick Reference

### Critical Rules
1. **ROOT DIRECTORY PROHIBITION**: NEVER work directly in root directory
2. **WORKTREES**: ALL LLM work in ./trees/ worktrees (see @SPICE-Worktrees.md)
3. **NO ENVIRONMENT VARIABLES**: Commands must not start with variable assignments
4. **NEVER fabricate** Jira IDs or data
5. **Pre-work**: Validate ticket → Update status → Create worktree
6. **SOLID**: Apply to all code
7. **TDD**: Test first, 80%+ coverage, mock externals (see @SPICE-Testing.md)
8. **Git Flow**: Commits, branches, merge protection (see @SPICE-Git-Flow.md)
9. **No bypassing** hooks or quality gates
10. **Browser testing** for web apps
11. **Use MCP tools** for enhanced capabilities

### Workflow Summary (Agent-Enhanced)
1. **Verify root directory** (`pwd | grep -q "/trees/" && exit 1`)
2. Check Jira hierarchy
3. TodoWrite all tasks
4. **🎯 PLANNING PHASE** (MANDATORY for ≥3 steps):
   ```bash
   Task --subagent_type reaper:workflow-planner --prompt "Analyze [TASK] for parallel work opportunities"
   ```
5. **🚀 IMPLEMENTATION PHASE** (Choose agent based on task type):
   - **Bugs**: `Task --subagent_type reaper:bug-fixer --prompt "Systematic TDD bug fix"`
   - **Features**: `Task --subagent_type reaper:feature-developer --prompt "TDD feature implementation"`
   - **Complex Analysis**: Use sequential thinking tool
6. **🌳 ENVIRONMENT SETUP** (Recommended):
   ```bash
   Task --subagent_type reaper:branch-manager --prompt "Setup worktree environment"
   # OR manual: Create worktree (see @SPICE-Worktrees.md for detailed workflow)
   ```
7. **Setup environment** in worktree (if not using reaper:branch-manager)
8. TDD implementation following agent guidance (see @SPICE-Testing.md)
9. **📊 QUALITY PHASE** (MANDATORY):
   ```bash
   Task --subagent_type reaper:test-runner --prompt "Comprehensive testing validation"
   Task --subagent_type reaper:code-reviewer --prompt "Quality and security review"
   ```
10. **MANDATORY: Run linting and fix issues** (in worktree) - see Linting & Code Quality section
11. Update from develop
12. **🔄 INTEGRATION PHASE** (Recommended):
    ```bash
    Task --subagent_type reaper:branch-manager --prompt "Safe merge to develop"
    # OR manual: Merge to develop branch (see @SPICE-Git-Flow.md for merge protection)
    ```
13. **Clean up worktree** (handled by reaper:branch-manager or manual)
14. **Note**: Main branch merges require explicit human permission
15. Review→Approval→Done (user approval required)

### Essential Commands (Agent-Enhanced)
```bash
# SAFETY: Verify you're in root directory first
pwd | grep -q "/trees/" && { echo "ERROR: Must start from root"; exit 1; }

# 🎯 PLANNING: Analyze work for parallel opportunities (MANDATORY for complex tasks)
Task --subagent_type reaper:workflow-planner \
  --description "Plan implementation strategy" \
  --prompt "Analyze PROJ-123 requirements for parallel work opportunities and dependency mapping"

# 🚀 IMPLEMENTATION: Choose appropriate agent
# For bug fixes:
Task --subagent_type reaper:bug-fixer \
  --description "Fix reported bug with TDD" \
  --prompt "Reproduce and fix PROJ-123: [BUG_DESCRIPTION] using systematic TDD approach"

# For new features:
Task --subagent_type reaper:feature-developer \
  --description "Implement new feature" \
  --prompt "Implement PROJ-123: [FEATURE_NAME] with TDD methodology and SOLID principles"

# 🌳 ENVIRONMENT: Setup worktree (recommended via agent)
Task --subagent_type reaper:branch-manager \
  --description "Setup clean worktree" \
  --prompt "Create worktree environment for PROJ-123, install dependencies, validate setup"

# Manual worktree creation (if not using reaper:branch-manager)
mkdir -p trees
git worktree add ./trees/PROJ-123-description -b feature/PROJ-123-description develop

# 📊 QUALITY: Comprehensive validation (MANDATORY)
Task --subagent_type reaper:test-runner \
  --description "Run comprehensive testing" \
  --prompt "Execute all tests, linting, and quality checks for PROJ-123"

Task --subagent_type reaper:code-reviewer \
  --description "Review code quality" \
  --prompt "Review PROJ-123 implementation for security, best practices, and quality"

# MANDATORY: Run linting in worktree before committing
(cd ./trees/PROJ-123-description && npm run lint:fix) || (cd ./trees/PROJ-123-description && npm run lint) || { echo "ERROR: Linting failed"; exit 1; }

# 🔄 INTEGRATION: Safe merge operations (recommended via agent)
Task --subagent_type reaper:branch-manager \
  --description "Safe merge to develop" \
  --prompt "Merge PROJ-123 feature branch to develop with conflict detection and validation"

# Manual merge to develop only (see @SPICE-Git-Flow.md for safety verification)
git checkout develop && git merge feature/PROJ-123-description --no-ff

# 🧠 COMPLEX ANALYSIS: Sequential thinking for complex problems
mcp__sequential-thinking__sequentialthinking \
  --thought "Breaking down the problem..." \
  --next_thought_needed true \
  --thought_number 1 \
  --total_thoughts 5
```

### MCP Tool Examples

**Research Pattern:**
```bash
# Multi-step file search
Task --description "Find auth implementation" \
  --prompt "Search for authentication logic across the codebase"

# Complex analysis
mcp__sequential-thinking__sequentialthinking
# Use for: architecture decisions, debugging, optimization
```

**Web Automation Pattern:**
```bash
# Scrape and analyze
mcp__firecrawl__firecrawl_deep_research \
  --query "React performance optimization techniques" \
  --maxDepth 3 \
  --maxUrls 50

# Browser testing workflow
mcp__puppeteer__puppeteer_navigate --url "http://localhost:3000"
mcp__browser-tools__runAccessibilityAudit
mcp__browser-tools__runPerformanceAudit
```

---

*Last updated: 2025-08-01*