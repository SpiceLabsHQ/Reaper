# 🌲 Git Worktrees for LLMs

> **MANDATORY**: ALL LLM work MUST happen in worktrees under ./trees/ directory

## Why Worktrees?
- **Isolation**: User continues working while LLM develops
- **Parallel**: Multiple feature branches simultaneously  
- **Safety**: No conflicts with user's directory

## 🚨 CRITICAL WARNINGS FOR LLMs

1. **NEVER use direct `cd` to enter worktrees** - Security restrictions prevent this
   - ❌ WRONG: `cd ./trees/PROJ-123-description`
   - ✅ CORRECT for Git commands: `git -C ./trees/PROJ-123-description status`
   - ✅ CORRECT for non-Git commands: `(cd ./trees/PROJ-123-description && npm test)`

2. **ALWAYS verify before cleanup** - Prevent lost work
   - Check for uncommitted changes: `git -C ./trees/PROJ-123-description status --porcelain`
   - Check for unmerged commits: `git log develop..feature/PROJ-123-description --oneline`
   - Never use `--force` without verification

3. **ALWAYS check if work already exists** - Avoid duplicate fixes
   - Before creating worktree: `git log develop --grep="PROJ-123"`
   - Check recent commits in related files

## 🤖 Agent-Enhanced Worktree Workflow (RECOMMENDED)

**RECOMMENDED**: Use `branch-manager` agent for safe, automated worktree management with built-in validation and backup protocols.

```bash
# RECOMMENDED: Agent-managed worktree setup
Task --subagent_type branch-manager \
  --description "Setup worktree environment" \
  --prompt "Create clean worktree for PROJ-123-description, setup dependencies, validate environment for development work"

# Agent handles:
# - Pre-flight validation and safety checks
# - Worktree creation with proper branch naming  
# - Dependency installation and environment setup
# - Conflict detection and backup creation
# - Environment validation and ready-state reporting
```

**Agent Benefits:**
- **Safety First**: Automated backups and uncommitted change protection
- **Environment Setup**: Automatic dependency detection and installation
- **Conflict Detection**: Pre-merge conflict analysis and prevention
- **Clean Teardown**: Safe worktree removal with validation
- **Structured Reporting**: JSON status reports for orchestration

**Agent-Managed Teardown:**
```bash
# RECOMMENDED: Safe agent-managed cleanup
Task --subagent_type branch-manager \
  --description "Teardown worktree safely" \
  --prompt "Clean up PROJ-123-description worktree, merge to develop if ready, remove branch and worktree with safety validation"

# Agent ensures:
# - No uncommitted changes are lost (automatic backup)
# - No unmerged commits (validation before cleanup)
# - Safe merge operations with conflict detection
# - Proper branch and remote cleanup
# - Audit trail of all operations
```

### 🔄 Parallel Work with Agent Planning

**MAXIMIZE EFFICIENCY**: Use `workflow-planner` agent to identify safe parallel work opportunities:

```bash
# STEP 1: Analyze for parallel opportunities (MANDATORY for complex tasks)
Task --subagent_type workflow-planner \
  --description "Analyze parallel work opportunities" \
  --prompt "Analyze PROJ-123 requirements, identify components that can be developed in parallel worktrees without merge conflicts. Map file dependencies and recommend work partitioning."

# STEP 2: Create parallel worktrees based on agent recommendations
# Example: Agent identifies 3 safe parallel streams
Task --subagent_type branch-manager \
  --description "Setup parallel worktrees" \
  --prompt "Create 3 parallel worktrees for PROJ-123: frontend components, backend services, and test suite based on workflow analysis"
```

**Agent-Recommended Parallel Patterns:**
- **Frontend/Backend Separation**: Different codebases, minimal file overlap
- **Feature Components**: Independent modules with clear interfaces  
- **Test Development**: Unit tests, integration tests, documentation
- **Configuration**: Environment-specific configs, deployment scripts

**Agent Will Prevent** (File Overlap Detection):
- **Shared Database Schema**: Migration conflicts
- **Core Service Changes**: API contract modifications
- **Authentication System**: Security-critical shared code
- **Build Configuration**: Package.json, requirements.txt changes

## 🚨 Manual LLM Worktree Workflow (FALLBACK)

```bash
# 0. Pre-work verification (CRITICAL)
# Verify you're in root directory, not accidentally in a worktree
pwd | grep -q "/trees/" && { echo "ERROR: Must start from root directory, not worktree"; exit 1; }

# Replace PROJ-123 with your actual Jira ticket key
# Replace 'description' with brief feature/fix description
# Check if fix already exists
git log --oneline develop --grep="PROJ-123" | head -5
[ -n "$(git log --oneline develop --grep="PROJ-123")" ] && { 
    echo "STOP: PROJ-123 may already be fixed in develop. Verify before proceeding."
}

# 1. Create worktree in ./trees/ directory (ALWAYS use ./trees/ pattern)
mkdir -p trees
git worktree add ./trees/PROJ-123-description -b feature/PROJ-123-description develop \
|| { echo "STOP: Worktree creation failed"; exit 1; }

# 2. Set up environment (use subshells for non-git commands)
# NOTE: git -C only works for git commands, not npm/pip/bundle
if [ -f "./trees/PROJ-123-description/package.json" ]; then 
    (cd ./trees/PROJ-123-description && npm install) || (cd ./trees/PROJ-123-description && yarn install)
elif [ -f "./trees/PROJ-123-description/requirements.txt" ]; then 
    (cd ./trees/PROJ-123-description && pip install -r requirements.txt)
elif [ -f "./trees/PROJ-123-description/Gemfile" ]; then 
    (cd ./trees/PROJ-123-description && bundle install)
fi

# 3. Work in isolated environment using git -C (NEVER cd directly)
# Examples:
git -C ./trees/PROJ-123-description status

# MANDATORY: Run linting before committing (in worktree)
if [ -f "./trees/PROJ-123-description/package.json" ]; then 
    (cd ./trees/PROJ-123-description && npm run lint:fix) || (cd ./trees/PROJ-123-description && npm run lint) || { echo "ERROR: Linting failed"; exit 1; }
elif [ -f "./trees/PROJ-123-description/requirements.txt" ]; then 
    (cd ./trees/PROJ-123-description && black . && isort . && flake8 .) || { echo "ERROR: Python linting failed"; exit 1; }
elif [ -f "./trees/PROJ-123-description/Gemfile" ]; then 
    (cd ./trees/PROJ-123-description && bundle exec rubocop -a) || { echo "ERROR: Ruby linting failed"; exit 1; }
fi

git -C ./trees/PROJ-123-description add .
git -C ./trees/PROJ-123-description commit -m "fix: description

Ref: PROJ-123"

# Run tests in worktree (NOT root directory)
echo "Running tests in worktree (NOT root)..."
(cd ./trees/PROJ-123-description && npm test) || { echo "Tests failed"; exit 1; }

# 4. Update from develop (in worktree)
git -C ./trees/PROJ-123-description fetch origin develop
git -C ./trees/PROJ-123-description rebase origin/develop || { 
    echo "STOP: Resolve conflicts first"; exit 1; 
}

# 5. Merge to develop branch only (from main repo)
git checkout develop
git merge feature/PROJ-123-description --no-ff

# NOTE: LLMs MUST NOT merge to main automatically - requires explicit human permission
# Main branch merges require human approval for production deployments

# 7. Clean up (verify first!)
# Check for unmerged commits
UNMERGED=$(git log develop..feature/PROJ-123-description --oneline 2>/dev/null)
if [ -n "$UNMERGED" ]; then
    echo "ERROR: Branch has unmerged commits!"
    echo "$UNMERGED"
    exit 1
fi

# Remove remote branch if exists
if git show-ref --verify --quiet "refs/remotes/origin/feature/PROJ-123-description"; then
    git push origin --delete feature/PROJ-123-description
fi

# Remove worktree and local branch
git worktree remove ./trees/PROJ-123-description
git branch -d feature/PROJ-123-description
```

## Worktree Commands

**Create Worktree:**
```bash
# Always from develop (STANDARD) - use ./trees/ pattern
# Replace PROJ-123 with your Jira ticket, 'description' with brief description
mkdir -p trees
git worktree add ./trees/PROJ-123-description -b feature/PROJ-123-description develop \
|| { echo "STOP: Worktree creation failed"; exit 1; }

# Existing branch
git worktree add ./trees/PROJ-123-description existing-branch-name \
|| { echo "STOP: Check branch exists and no conflicts"; exit 1; }
```

**Manage Worktrees:**
```bash
# List all worktrees
git worktree list

# Remove worktree (from root directory)
git worktree remove ./trees/PROJ-123-description

# Force remove if dirty (verify first!)
git worktree remove ./trees/PROJ-123-description --force
```

## 🎯 Naming Convention
- Format: `./trees/PROJ-123-description` (replace with your Jira ticket and description)
- Examples:
  - `./trees/PROJ-123-auth` (PROJ-123 is Jira ticket)
  - `./trees/BUG-456-security` (BUG-456 is Jira ticket)

## Remote Worktree Management

**Important**: LLMs cannot `cd` into worktrees due to security restrictions. Use appropriate methods based on command type.

### Working with Worktrees Remotely

```bash
# ❌ WRONG - Direct cd will fail for LLMs
cd ./trees/PROJ-123-description

# ✅ CORRECT - Different approaches for different command types:

# For Git commands: Use -C flag
git -C ./trees/PROJ-123-description status
git -C ./trees/PROJ-123-description add .
git -C ./trees/PROJ-123-description commit -m "message"

# For non-Git commands: Use subshells
(cd ./trees/PROJ-123-description && npm install)
(cd ./trees/PROJ-123-description && npm test)
(cd ./trees/PROJ-123-description && python -m pytest)
```

### Essential Remote Operations

```bash
# Replace PROJ-123 with your Jira ticket, 'description' with brief description

# 1. Check status without entering worktree
git -C ./trees/PROJ-123-description status

# 2. Stage changes
git -C ./trees/PROJ-123-description add .
git -C ./trees/PROJ-123-description add src/specific-file.js

# 3. Run linting before commit (MANDATORY)
if [ -f "./trees/PROJ-123-description/package.json" ]; then 
    (cd ./trees/PROJ-123-description && npm run lint:fix) || (cd ./trees/PROJ-123-description && npm run lint) || { echo "ERROR: Linting failed"; exit 1; }
elif [ -f "./trees/PROJ-123-description/requirements.txt" ]; then 
    (cd ./trees/PROJ-123-description && black . && isort . && flake8 .) || { echo "ERROR: Python linting failed"; exit 1; }
fi

# 4. Commit changes
git -C ./trees/PROJ-123-description commit -m "fix: resolve authentication issue

Ref: PROJ-123"

# 5. View diffs
git -C ./trees/PROJ-123-description diff
git -C ./trees/PROJ-123-description diff --staged

# 6. Pull/push operations
git -C ./trees/PROJ-123-description pull origin develop
git -C ./trees/PROJ-123-description push origin feature/PROJ-123-description

# 7. Run tests (using subshell) - Tests run in worktree, NOT root
(cd ./trees/PROJ-123-description && npm test) || { echo "ERROR: Tests failed in worktree"; exit 1; }

# 8. Install dependencies
if [ -f "./trees/PROJ-123-description/package.json" ]; then
    (cd ./trees/PROJ-123-description && npm install) || { echo "ERROR: Install failed in worktree"; exit 1; }
fi

# 9. View logs
git -C ./trees/PROJ-123-description log --oneline -10

# 10. Rebase from develop
git -C ./trees/PROJ-123-description fetch origin develop
git -C ./trees/PROJ-123-description rebase origin/develop
```

## Parallel Development with Worktrees

### ⚠️ Track All Parallel Work

When working on multiple bugs in parallel, **ALWAYS** create a tracking file to prevent lost work:

```bash
# Create tracking document BEFORE starting
cat > PARALLEL_WORK.md << EOF
# Parallel Work Tracking - $(date)

## Active Worktrees
| KEY | Description | Status | Branch | Worktree Path |
|-----|-------------|--------|--------|---------------|
| PROJ-123 | Fix auth bug | In Progress | feature/PROJ-123-auth | ./trees/PROJ-123-auth |
| PROJ-124 | Fix API timeout | In Progress | feature/PROJ-124-timeout | ./trees/PROJ-124-timeout |

## Merge Checklist
- [ ] PROJ-123 merged to develop
- [ ] PROJ-124 merged to develop
- [ ] All worktrees removed
- [ ] All branches deleted
- [ ] PARALLEL_WORK.md removed

## Notes
- Started: $(date)
- Developer: LLM Agent
EOF

# Update tracking as you work
echo "| PROJ-125 | Fix cache issue | In Progress | feature/PROJ-125-cache | ./trees/PROJ-125-cache |" >> PARALLEL_WORK.md
```

### Directory Structure
- **Standard location**: `trees/` subdirectory in main repo
- **Naming**: `trees/PROJ-123-1`, `trees/PROJ-123-2`, etc.
- **Purpose**: Test different approaches simultaneously

### Safe Parallel Workflow

1. **Track ALL worktrees before starting**:
   ```bash
   # Save initial state
   git worktree list > worktrees-initial.txt
   
   # Initialize parallel worktrees
   # Replace PROJ-123 with your Jira ticket
   mkdir -p trees
   for i in 1 2 3; do
     git worktree add trees/PROJ-123-$i -b feature/PROJ-123-$i develop
   done
   ```

2. **Work independently** in each worktree:
   - Create `TASK.md` with Jira ticket details
   - Implement different solutions
   - Document approach in `RESULTS.md`
   - Use git -C for all operations (no cd)

### Key Files
- **PARALLEL_WORK.md**: Track all active worktrees (Required)
- **TASK.md**: Jira ticket details and requirements
- **RESULTS.md**: Implementation summary and decisions

## Completion Workflow

```bash
# Replace PROJ-123 with your Jira ticket, 'description' with brief description

# Verify you're in root directory, not in a worktree
pwd | grep -q "/trees/" && { echo "ERROR: Must run from root directory, not worktree"; exit 1; }

# 1. Run linting in worktree (MANDATORY before tests)
echo "Running linting in worktree (MANDATORY)..."
if [ -f "./trees/PROJ-123-description/package.json" ]; then 
    (cd ./trees/PROJ-123-description && npm run lint:fix) || (cd ./trees/PROJ-123-description && npm run lint) || { echo "STOP: Linting failed"; exit 1; }
elif [ -f "./trees/PROJ-123-description/requirements.txt" ] || [ -f "./trees/PROJ-123-description/pyproject.toml" ]; then 
    (cd ./trees/PROJ-123-description && black . && isort . && flake8 .) || (cd ./trees/PROJ-123-description && ruff format . && ruff check --fix .) || { echo "STOP: Python linting failed"; exit 1; }
elif [ -f "./trees/PROJ-123-description/Gemfile" ]; then 
    (cd ./trees/PROJ-123-description && bundle exec rubocop -a) || { echo "STOP: Ruby linting failed"; exit 1; }
elif [ -f "./trees/PROJ-123-description/composer.json" ]; then 
    (cd ./trees/PROJ-123-description && ./vendor/bin/php-cs-fixer fix .) || { echo "STOP: PHP linting failed"; exit 1; }
elif [ -f "./trees/PROJ-123-description/go.mod" ]; then 
    (cd ./trees/PROJ-123-description && gofmt -w . && golangci-lint run --fix) || { echo "STOP: Go linting failed"; exit 1; }
fi

# 2. Run tests in worktree (NOT in root directory)
echo "Running tests in worktree (NOT root directory)..."
if [ -f "./trees/PROJ-123-description/package.json" ] && grep -q "\"test\"" "./trees/PROJ-123-description/package.json"; then 
    (cd ./trees/PROJ-123-description && npm test -- --coverage) || { echo "STOP: Tests failed"; exit 1; }
elif [ -f "./trees/PROJ-123-description/requirements.txt" ]; then 
    (cd ./trees/PROJ-123-description && python -m pytest --cov) || { echo "STOP: Tests failed"; exit 1; }
elif [ -f "./trees/PROJ-123-description/Rakefile" ]; then 
    (cd ./trees/PROJ-123-description && rake test) || { echo "STOP: Tests failed"; exit 1; }
else 
    echo "WARNING: No test command found - verify manually"
fi

# 3. Update from develop (in worktree using git -C)
echo "Updating from develop..."
git -C ./trees/PROJ-123-description fetch origin develop
git -C ./trees/PROJ-123-description rebase origin/develop || { 
    echo "STOP: Resolve conflicts in worktree first"
    echo "Run: git -C ./trees/PROJ-123-description rebase --continue"
    exit 1
}

# 4. Verify before merge
echo "Verifying branch status..."
UNMERGED=$(git log develop..feature/PROJ-123-description --oneline 2>/dev/null)
if [ -z "$UNMERGED" ]; then
    echo "WARNING: No commits to merge from feature/PROJ-123-description"
    exit 1
fi
echo "Commits to merge:"
echo "$UNMERGED"

# 5. Merge to develop ONLY (from main repo, NOT worktree)
git checkout develop
git merge feature/PROJ-123-description --no-ff -m "feat: merge feature/PROJ-123-description

Ref: PROJ-123"

# 6. Push develop changes only
# NOTE: LLMs MUST NOT merge to main automatically - requires explicit user permission
git push origin develop

# IMPORTANT: Main branch merges require human approval
echo "✅ Merged to develop and pushed. Main branch merge requires explicit user permission."

# 7. Safe cleanup with verification
echo "Cleaning up..."

# Check for uncommitted changes before removal
if [ -n "$(git -C ./trees/PROJ-123-description status --porcelain 2>/dev/null)" ]; then
    echo "ERROR: Uncommitted changes in worktree!"
    git -C ./trees/PROJ-123-description status
    echo "Commit or stash changes before cleanup"
    exit 1
fi

# Remove remote branch if exists
if git show-ref --verify --quiet "refs/remotes/origin/feature/PROJ-123-description"; then
    git push origin --delete feature/PROJ-123-description
fi

# Remove worktree
git worktree remove ./trees/PROJ-123-description || {
    echo "WARNING: Could not remove worktree cleanly"
    echo "Check: git worktree list"
    echo "Force remove: git worktree remove ./trees/PROJ-123-description --force"
}

# Remove local branch
git branch -d feature/PROJ-123-description || {
    echo "WARNING: Could not delete branch"
    echo "Branch may have unmerged commits"
}

# 8. Update Jira ticket to In Review status (MANDATORY)
echo "Updating Jira ticket to In Review status..."
acli jira workitem transition --key PROJ-123 --status "In Review" || { 
    echo "WARNING: Could not transition PROJ-123 to In Review status"
    echo "Please manually update the ticket status in Jira"
}

echo "✅ Completion workflow finished for PROJ-123"
```

## POST-APPROVAL CLEANUP
Track: git worktree list > task_start.txt
Clean: Remove ONLY ./trees/PROJ-XXX-* created during task
Jira: acli jira workitem transition --key PROJ-XXX --status Done
Children: acli jira workitem search --jql "parent=PROJ-XXX" | transition each