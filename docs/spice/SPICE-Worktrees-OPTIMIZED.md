# 🌲 Git Worktrees for LLMs

> **MANDATORY**: ALL LLM work MUST happen in worktrees under ./trees/ directory

## 🚨 CRITICAL RULES

1. **NEVER use `cd` to enter worktrees** - Use `git -C` for git commands, subshells for others
2. **ALWAYS verify before cleanup** - Check uncommitted changes and unmerged commits
3. **ALWAYS check if work already exists** - `git log develop --grep="[TASK_ID]"`

## 🤖 Agent-Enhanced Workflow (RECOMMENDED)

```bash
# Setup worktree via agent
Task --subagent_type reaper:branch-manager \
  --description "Setup worktree environment" \
  --prompt "Create clean worktree for [TASK_ID]-[DESCRIPTION], setup dependencies, validate environment"

# Teardown via agent  
Task --subagent_type reaper:branch-manager \
  --description "Teardown worktree safely" \
  --prompt "Clean up [TASK_ID]-[DESCRIPTION] worktree, merge to develop if ready, remove with validation"

# Parallel work analysis
Task --subagent_type reaper:workflow-planner \
  --description "Analyze parallel work opportunities" \
  --prompt "Analyze [TASK_ID] for parallel worktree opportunities without merge conflicts"
```

## 📋 Essential Commands

### Pre-flight Checks
```bash
pwd | grep -q "/trees/" && { echo "ERROR: Must start from root"; exit 1; }
git log --oneline develop --grep="[TASK_ID]" | head -5
```

### Create Worktree
```bash
mkdir -p trees
git worktree add ./trees/[TASK_ID]-[DESCRIPTION] -b feature/[TASK_ID]-[DESCRIPTION] develop
```

### Setup Environment (in worktree)
```bash
# Node.js
[ -f "./trees/[TASK_ID]-[DESCRIPTION]/package.json" ] && (cd ./trees/[TASK_ID]-[DESCRIPTION] && npm install)
# Python
[ -f "./trees/[TASK_ID]-[DESCRIPTION]/requirements.txt" ] && (cd ./trees/[TASK_ID]-[DESCRIPTION] && pip install -r requirements.txt)
# Ruby
[ -f "./trees/[TASK_ID]-[DESCRIPTION]/Gemfile" ] && (cd ./trees/[TASK_ID]-[DESCRIPTION] && bundle install)
```

### Remote Operations (NO cd)
```bash
# Git commands - use -C flag
git -C ./trees/[TASK_ID]-[DESCRIPTION] status
git -C ./trees/[TASK_ID]-[DESCRIPTION] add .
git -C ./trees/[TASK_ID]-[DESCRIPTION] commit -m "fix: [MESSAGE]\n\nRef: [TASK_ID]"
git -C ./trees/[TASK_ID]-[DESCRIPTION] diff
git -C ./trees/[TASK_ID]-[DESCRIPTION] log --oneline -10
git -C ./trees/[TASK_ID]-[DESCRIPTION] fetch origin develop
git -C ./trees/[TASK_ID]-[DESCRIPTION] rebase origin/develop
git -C ./trees/[TASK_ID]-[DESCRIPTION] push origin feature/[TASK_ID]-[DESCRIPTION]

# Non-git commands - use subshells
(cd ./trees/[TASK_ID]-[DESCRIPTION] && npm test)
(cd ./trees/[TASK_ID]-[DESCRIPTION] && npm run lint)
(cd ./trees/[TASK_ID]-[DESCRIPTION] && npm run build)
(cd ./trees/[TASK_ID]-[DESCRIPTION] && python -m pytest)
```

### Linting (MANDATORY before commit)
```bash
# Node.js
[ -f "./trees/[TASK_ID]-[DESCRIPTION]/package.json" ] && \
  (cd ./trees/[TASK_ID]-[DESCRIPTION] && npm run lint:fix) || \
  (cd ./trees/[TASK_ID]-[DESCRIPTION] && npm run lint)

# Python  
[ -f "./trees/[TASK_ID]-[DESCRIPTION]/requirements.txt" ] && \
  (cd ./trees/[TASK_ID]-[DESCRIPTION] && black . && isort . && flake8 .)

# Ruby
[ -f "./trees/[TASK_ID]-[DESCRIPTION]/Gemfile" ] && \
  (cd ./trees/[TASK_ID]-[DESCRIPTION] && bundle exec rubocop -a)

# PHP
[ -f "./trees/[TASK_ID]-[DESCRIPTION]/composer.json" ] && \
  (cd ./trees/[TASK_ID]-[DESCRIPTION] && ./vendor/bin/php-cs-fixer fix .)

# Go
[ -f "./trees/[TASK_ID]-[DESCRIPTION]/go.mod" ] && \
  (cd ./trees/[TASK_ID]-[DESCRIPTION] && gofmt -w . && golangci-lint run --fix)
```

### Testing (in worktree)
```bash
# Node.js
[ -f "./trees/[TASK_ID]-[DESCRIPTION]/package.json" ] && \
  (cd ./trees/[TASK_ID]-[DESCRIPTION] && npm test -- --coverage)

# Python
[ -f "./trees/[TASK_ID]-[DESCRIPTION]/requirements.txt" ] && \
  (cd ./trees/[TASK_ID]-[DESCRIPTION] && python -m pytest --cov)

# Ruby  
[ -f "./trees/[TASK_ID]-[DESCRIPTION]/Rakefile" ] && \
  (cd ./trees/[TASK_ID]-[DESCRIPTION] && rake test)
```

### Merge to Develop (NOT main)
```bash
# Update from develop
git -C ./trees/[TASK_ID]-[DESCRIPTION] fetch origin develop
git -C ./trees/[TASK_ID]-[DESCRIPTION] rebase origin/develop

# Verify commits exist
git log develop..feature/[TASK_ID]-[DESCRIPTION] --oneline

# Merge to develop ONLY
git checkout develop
git merge feature/[TASK_ID]-[DESCRIPTION] --no-ff -m "feat: merge feature/[TASK_ID]-[DESCRIPTION]\n\nRef: [TASK_ID]"
git push origin develop

# Update task status
# For Beads: bd close [TASK_ID]
# For JIRA: acli jira workitem transition --key [TASK_ID] --status "In Review"
```

### Safe Cleanup
```bash
# Check uncommitted changes
[ -n "$(git -C ./trees/[TASK_ID]-[DESCRIPTION] status --porcelain)" ] && \
  { echo "ERROR: Uncommitted changes"; exit 1; }

# Check unmerged commits
[ -n "$(git log develop..feature/[TASK_ID]-[DESCRIPTION] --oneline)" ] && \
  { echo "ERROR: Unmerged commits"; exit 1; }

# Remove remote branch
git show-ref --verify --quiet "refs/remotes/origin/feature/[TASK_ID]-[DESCRIPTION]" && \
  git push origin --delete feature/[TASK_ID]-[DESCRIPTION]

# Remove worktree and branch
git worktree remove ./trees/[TASK_ID]-[DESCRIPTION]
git branch -d feature/[TASK_ID]-[DESCRIPTION]
```

## 🎯 Worktree Management

### List & Remove
```bash
git worktree list
git worktree remove ./trees/[TASK_ID]-[DESCRIPTION]
git worktree remove ./trees/[TASK_ID]-[DESCRIPTION] --force  # Only if verified
```

### Naming Convention
- Format: `./trees/[TASK_ID]-[DESCRIPTION]`
- Examples: `./trees/PROJ-123-auth`, `./trees/BUG-456-security`

## ⚡ Parallel Development

### Track Parallel Work
```bash
# Create tracking file
cat > PARALLEL_WORK.md << EOF
# Parallel Work - $(date)
| KEY | Branch | Worktree | Status |
|-----|--------|----------|--------|
| [TASK_ID]-1 | feature/[TASK_ID]-1 | ./trees/[TASK_ID]-1 | In Progress |
| [TASK_ID]-2 | feature/[TASK_ID]-2 | ./trees/[TASK_ID]-2 | In Progress |
EOF

# Create parallel worktrees
for i in 1 2 3; do
  git worktree add trees/[TASK_ID]-$i -b feature/[TASK_ID]-$i develop
done
```

### Safe Parallel Patterns (Agent-Verified)
- **Frontend/Backend**: Different codebases
- **Feature Components**: Independent modules
- **Test Development**: Unit/integration tests
- **Configuration**: Environment configs

### Avoid Parallel (File Overlap)
- Shared database schemas
- Core service changes
- Authentication systems
- Build configurations

## 🚨 Common Patterns

### Check Before Starting
```bash
pwd | grep -q "/trees/" && { echo "ERROR: Start from root"; exit 1; }
git log develop --grep="[TASK_ID]" | head -5
```

### Standard Workflow
```bash
# 1. Create worktree
mkdir -p trees && git worktree add ./trees/[TASK_ID]-[DESCRIPTION] -b feature/[TASK_ID]-[DESCRIPTION] develop

# 2. Setup environment  
(cd ./trees/[TASK_ID]-[DESCRIPTION] && npm install)

# 3. Work (no cd)
git -C ./trees/[TASK_ID]-[DESCRIPTION] add .
git -C ./trees/[TASK_ID]-[DESCRIPTION] commit -m "fix: [MESSAGE]\n\nRef: [TASK_ID]"

# 4. Test in worktree
(cd ./trees/[TASK_ID]-[DESCRIPTION] && npm test)

# 5. Lint before merge
(cd ./trees/[TASK_ID]-[DESCRIPTION] && npm run lint)

# 6. Update from develop
git -C ./trees/[TASK_ID]-[DESCRIPTION] rebase origin/develop

# 7. Merge to develop
git checkout develop && git merge feature/[TASK_ID]-[DESCRIPTION] --no-ff

# 8. Clean up
git worktree remove ./trees/[TASK_ID]-[DESCRIPTION]
git branch -d feature/[TASK_ID]-[DESCRIPTION]
```

## 📝 Key Rules Summary

1. **ALL work in ./trees/** - Never in root directory
2. **Use git -C** for git commands - Never cd into worktrees
3. **Use subshells** for non-git commands - (cd ./trees/X && command)
4. **Test in worktree** - Never run tests in root
5. **Lint before commit** - Always run linting
6. **Merge to develop only** - Never to main without permission
7. **Verify before cleanup** - Check uncommitted/unmerged work
8. **Update task status** - Close or transition to "In Review" after merge

**Remember**: Main branch merges require explicit human permission