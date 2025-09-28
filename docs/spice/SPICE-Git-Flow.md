# 🌳 Git Flow & Standards

## Repository Standards
- One repo = one purpose
- README.md required (what, setup, run, test)
- .gitignore mandatory

## 🌳 Branching Strategy

### Branch Types
1. **main** - Production only, protected
2. **develop** - Integration, protected
3. **feature/PROJ-123-description** - From develop
4. **release/X.Y.Z** - develop → main+develop
5. **hotfix/PROJ-123-fix** - main → main+develop

### Branch Rules
- NO direct commits to main/develop
- Delete feature branches after merge
- Include Jira ticket in branch name

### Branch Examples
- `feature/PROJ-123-auth`
- `feature/BUG-456-security`
- `hotfix/PROJ-789-critical-fix`
- `release/1.2.3`

## 📝 Commit Standards

### Format (enforced by commitlint)
```
<type>(<scope>): <subject> (max 72 chars)

<body>

Ref: PROJ-123
```

### Commit Types
- `feat`: New feature → MINOR bump
- `fix`: Bug fix → PATCH bump
- `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`: No version bump
- `BREAKING CHANGE:` in footer → MAJOR bump

### Commit Examples
```bash
# ✅ CORRECT
feat(auth): add OAuth2 integration

Implements Google OAuth2 for user authentication

Ref: PROJ-123

# ❌ WRONG - ticket in subject
feat(auth): add login PROJ-123
```

### 🔍 LLM Commit Verification (MANDATORY)
**ALWAYS verify before writing commit message:**
```bash
git status --short        # Check what's actually staged
git diff --cached | head  # Review the actual changes
# THEN write commit message based on verified changes
```
**NEVER assume what's staged based on memory or context**

## 🤖 Agent-Driven Git Operations (RECOMMENDED)

**RECOMMENDED**: Use `branch-manager` agent for safe, automated git operations with built-in conflict detection and validation protocols.

### 🌳 Branch Management with Agent

```bash
# RECOMMENDED: Agent-managed branch operations
Task --subagent_type branch-manager \
  --description "Setup development environment" \
  --prompt "Create feature branch for PROJ-123-description, setup worktree, install dependencies, validate environment"

# Agent handles:
# - Branch creation with proper naming convention
# - Worktree setup in correct location
# - Dependency installation and validation
# - Environment health checks
# - Pre-flight safety verification
```

### 🚀 Safe Merge Operations with Agent

```bash
# RECOMMENDED: Agent-managed merge with conflict detection
Task --subagent_type branch-manager \
  --description "Safe merge to develop" \
  --prompt "Merge feature/PROJ-123-description to develop branch with conflict detection, testing validation, and safety checks"

# Agent ensures:
# - Pre-merge conflict analysis
# - Test suite execution and validation
# - Commit message standardization
# - Automatic backup references
# - Safe cleanup after successful merge
```

### 🔍 Repository Health with Agent

```bash
# RECOMMENDED: Comprehensive repository audit
Task --subagent_type branch-manager \
  --description "Repository health audit" \
  --prompt "Audit repository for stale branches, unmerged commits, orphaned worktrees, and provide cleanup recommendations"

# Agent provides:
# - Branch analysis with merge status
# - Worktree health validation
# - Cleanup recommendations with risk assessment
# - Structured JSON reports for automation
# - Safe cleanup operations with backups
```

### 📊 Quality Gate Integration

**Chain Agents for Comprehensive Quality:**

```bash
# 1. Planning Phase
Task --subagent_type workflow-planner --prompt "Analyze PROJ-123 for parallel work opportunities"

# 2. Implementation Phase (choose appropriate agent)
Task --subagent_type bug-fixer --prompt "Fix reported issue with systematic TDD"
# OR
Task --subagent_type feature-developer --prompt "Implement new feature with TDD"

# 3. Quality Validation Phase
Task --subagent_type test-runner --prompt "Run comprehensive testing and coverage"
Task --subagent_type code-reviewer --prompt "Review code quality and security"

# 4. Integration Phase (RECOMMENDED)
Task --subagent_type branch-manager --prompt "Safe merge with conflict detection"
```

### ⚡ Parallel Work with Agent Coordination

**MAXIMIZE EFFICIENCY** with agent-planned parallel development:

```bash
# STEP 1: Analyze for parallel opportunities
Task --subagent_type workflow-planner \
  --description "Analyze parallel work potential" \
  --prompt "Analyze PROJ-123 components for safe parallel development without merge conflicts"

# STEP 2: Create parallel branches based on agent recommendations
# Agent identifies safe parallel streams (e.g., frontend, backend, tests)
Task --subagent_type branch-manager \
  --description "Setup parallel development environment" \
  --prompt "Create 3 parallel worktrees for PROJ-123 based on workflow analysis: frontend-ui, backend-api, test-suite"

# STEP 3: Merge in dependency order (agent provides sequence)
Task --subagent_type branch-manager \
  --description "Sequential merge of parallel work" \
  --prompt "Merge parallel branches in dependency order: backend-api first, then frontend-ui, finally test-suite"
```

**Agent Benefits:**
- **Conflict Prevention**: Pre-merge analysis prevents integration issues
- **Safe Operations**: Automatic backups and rollback capabilities
- **Quality Gates**: Built-in testing and linting validation
- **Audit Trails**: Complete operation logging for compliance
- **Structured Output**: JSON reports for orchestration and automation

## 🚫 Main Branch Protection

**CRITICAL**: LLMs are STRICTLY PROHIBITED from merging to the `main` branch without explicit user permission.

### 🚨 FORBIDDEN ACTIONS for LLMs
- `git checkout main && git merge develop`
- `git push origin main`
- Any automatic merge to main branch
- Any script that updates main branch

### ✅ PERMITTED ACTIONS for LLMs
- Merge to `develop` branch only
- Push to `develop` branch only
- Work in feature branches and worktrees
- Recommend main branch merges to user

### 🔍 Permission Patterns
**LLMs may ONLY merge to main when user explicitly states:**
- "merge to main"
- "update main branch"  
- "deploy to production"
- "release to main"

**These phrases DO NOT grant permission:**
- "complete the workflow"
- "finish the task"
- "follow standard process"
- "merge everything"

### ⚠️ Main Branch Workflow
1. **LLM completes work**: Merge feature → develop only
2. **LLM notifies user**: "Ready for main branch merge"
3. **User decides**: When/if to merge develop → main
4. **User executes**: Main branch merge manually or gives explicit permission

### 🔧 Human-Only Main Branch Commands
```bash
# ONLY humans should run these commands:
git checkout main
git merge develop --no-ff
git push origin main
git tag -a v1.2.3 -m "Release version 1.2.3"
```

**Rationale**: Main branch represents production-ready code. Human oversight required for production deployments and releases.

## 🎨 Linting Standards

### Requirements
- Pre-commit hooks configured
- CI/CD enforcement
- IDE config files

### Hook Failures
**MANDATORY for ALL commits**: Run available linting before committing to prevent hook failures.

```bash
# Auto-detect and fix (REQUIRED - not optional)
if [ -f package.json ]; then 
    npm run lint:fix 2>/dev/null || npm run lint 2>/dev/null || yarn lint:fix 2>/dev/null || yarn lint 2>/dev/null || { echo "ERROR: No lint command found"; exit 1; }
elif [ -f requirements.txt ] || [ -f pyproject.toml ]; then 
    black . 2>/dev/null && isort . 2>/dev/null && flake8 . 2>/dev/null || ruff format . 2>/dev/null && ruff check --fix . 2>/dev/null || { echo "ERROR: Python linting failed"; exit 1; }
elif [ -f composer.json ]; then 
    ./vendor/bin/php-cs-fixer fix . 2>/dev/null || composer run lint:fix 2>/dev/null || { echo "ERROR: PHP linting failed"; exit 1; }
elif [ -f Gemfile ]; then 
    bundle exec rubocop -a 2>/dev/null || rubocop -a 2>/dev/null || { echo "ERROR: Ruby linting failed"; exit 1; }
elif [ -f go.mod ]; then 
    gofmt -w . 2>/dev/null && golangci-lint run --fix 2>/dev/null || { echo "ERROR: Go linting failed"; exit 1; }
fi

# Verify linting succeeded before staging changes
git add .
git commit
```

**Exit code verification pattern for agents:**
```bash
# Pattern for agents to verify linting passes
LINT_EXIT_CODE=0
if [ -f package.json ]; then 
    (cd ./trees/PROJ-123-description && npm run lint) || LINT_EXIT_CODE=$?
elif [ -f requirements.txt ]; then 
    (cd ./trees/PROJ-123-description && flake8 .) || LINT_EXIT_CODE=$?
# Add other project types as needed
fi
[ $LINT_EXIT_CODE -eq 0 ] || { echo "ERROR: Linting failed with exit code $LINT_EXIT_CODE"; exit 1; }
```

### 🚫 FORBIDDEN
- `git commit --no-verify`
- `git commit -n`
- `HUSKY=0 git commit`
- Disabling hooks

## 📦 Versioning

**Use SemVer for:**
- CLI tools, libraries, APIs
- Mobile apps, MCP servers

**NO SemVer for:**
- Websites, web apps, docs

**Format:** MAJOR.MINOR.PATCH

## ✅ Merge Verification

**Important**: Always verify merge status before cleanup to prevent lost work.

### Check All Branches for Unmerged Commits
```bash
# Function to check ALL feature branches
check_all_unmerged() {
    echo "=== Checking for unmerged commits ==="
    local UNMERGED_FOUND=0
    
    # Check all feature branches
    for branch in $(git branch -r | grep 'origin/feature/' | sed 's/origin\///'); do
        # Skip if branch doesn't exist locally
        if ! git show-ref --verify --quiet "refs/heads/$branch" 2>/dev/null; then
            continue
        fi
        
        # Check for unmerged commits
        UNMERGED=$(git log develop..$branch --oneline 2>/dev/null)
        if [ -n "$UNMERGED" ]; then
            echo "⚠️  Branch $branch has unmerged commits:"
            echo "$UNMERGED" | head -5
            echo ""
            UNMERGED_FOUND=1
        fi
    done
    
    if [ $UNMERGED_FOUND -eq 0 ]; then
        echo "✅ All branches are merged to develop"
    else
        echo "❌ Found unmerged commits! Resolve before cleanup."
        return 1
    fi
}
```

### Verify Specific Branch Before Merge
```bash
# Function to verify a branch is ready to merge
verify_branch_ready() {
    local BRANCH=$1
    local KEY=$(echo $BRANCH | grep -oE '[A-Z]+-[0-9]+' | head -1)
    
    echo "=== Verifying $BRANCH ==="
    
    # 1. Check if branch exists
    if ! git show-ref --verify --quiet "refs/heads/$BRANCH"; then
        echo "❌ Branch $BRANCH does not exist"
        return 1
    fi
    
    # 2. Check for merge conflicts with develop
    git checkout $BRANCH --quiet
    if ! git merge develop --no-commit --no-ff &>/dev/null; then
        echo "❌ Merge conflicts detected with develop"
        git merge --abort
        return 1
    fi
    git merge --abort
    
    # 3. Check commit history
    COMMITS=$(git log develop..$BRANCH --oneline)
    if [ -z "$COMMITS" ]; then
        echo "⚠️  No new commits to merge"
        return 1
    fi
    
    echo "📝 Commits to be merged:"
    echo "$COMMITS"
    
    # 4. Verify all commits reference the Jira ticket
    if [ -n "$KEY" ]; then
        BAD_COMMITS=$(git log develop..$BRANCH --format="%h %s" | grep -v "$KEY" || true)
        if [ -n "$BAD_COMMITS" ]; then
            echo "⚠️  Some commits don't reference $KEY:"
            echo "$BAD_COMMITS"
        fi
    fi
    
    echo "✅ Branch $BRANCH is ready to merge"
    return 0
}
```

### Safe Merge Process
```bash
# Safe merge with verification
safe_merge_branch() {
    local BRANCH=$1
    local WORKTREE=$2
    
    # 1. Verify branch is ready
    if ! verify_branch_ready "$BRANCH"; then
        echo "ERROR: Branch not ready to merge"
        return 1
    fi
    
    # 2. Check worktree for uncommitted changes
    if [ -n "$WORKTREE" ] && [ -d "$WORKTREE" ]; then
        if [ -n "$(git -C "$WORKTREE" status --porcelain)" ]; then
            echo "ERROR: Uncommitted changes in worktree $WORKTREE"
            git -C "$WORKTREE" status
            return 1
        fi
    fi
    
    # 3. Perform merge
    git checkout develop
    if git merge "$BRANCH" --no-ff -m "Merge branch '$BRANCH' into develop"; then
        echo "✅ Successfully merged $BRANCH to develop"
        
        # 4. Only merge to develop (main requires explicit permission)
        # NOTE: LLMs MUST NOT merge to main without explicit user permission
        echo "✅ Successfully merged to develop - main branch merge requires human approval"
        
        # 5. Clean up if successful
        if [ -n "$WORKTREE" ] && [ -d "$WORKTREE" ]; then
            git worktree remove "$WORKTREE"
        fi
        git branch -d "$BRANCH"
        
        return 0
    else
        echo "ERROR: Merge failed!"
        return 1
    fi
}
```

## 🚀 CI/CD Standards

**Pipeline Requirements:**
1. Run on every push
2. Execute tests + coverage
3. Run linting
4. Build/compile

**Branch Protection:**
- main: 2 approvals, passing builds
- develop: 1 approval, passing builds

## Integration with Other Modules

- **Worktrees**: See @SPICE-Worktrees.md for detailed worktree workflows
- **Testing**: See @SPICE-Testing.md for test requirements that must pass before merge
- **Jira Integration**: All commits must reference Jira tickets per main standards