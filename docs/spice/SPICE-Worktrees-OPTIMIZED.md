# 🌲 Git Worktrees for LLMs

> **MANDATORY**: ALL LLM work MUST happen in worktrees under ./trees/ directory

## 🚨 CRITICAL RULES

1. **NEVER use `cd` to enter worktrees** - Use `git -C` for git commands, subshells for others
2. **ALWAYS verify before cleanup** - Check uncommitted changes and unmerged commits
3. **ALWAYS check if work already exists** - `git log develop --grep="[JIRA_KEY]"`

## 🤖 Agent-Enhanced Workflow (RECOMMENDED)

```bash
# Setup worktree via agent
Task --subagent_type branch-manager \
  --description "Setup worktree environment" \
  --prompt "Create clean worktree for [JIRA_KEY]-[DESCRIPTION], setup dependencies, validate environment"

# Teardown via agent  
Task --subagent_type branch-manager \
  --description "Teardown worktree safely" \
  --prompt "Clean up [JIRA_KEY]-[DESCRIPTION] worktree, merge to develop if ready, remove with validation"

# Parallel work analysis
Task --subagent_type workflow-planner \
  --description "Analyze parallel work opportunities" \
  --prompt "Analyze [JIRA_KEY] for parallel worktree opportunities without merge conflicts"
```

## 📋 Essential Commands

### Pre-flight Checks
```bash
pwd | grep -q "/trees/" && { echo "ERROR: Must start from root"; exit 1; }
git log --oneline develop --grep="[JIRA_KEY]" | head -5
```

### Create Worktree
```bash
mkdir -p trees
git worktree add ./trees/[JIRA_KEY]-[DESCRIPTION] -b feature/[JIRA_KEY]-[DESCRIPTION] develop
```

### Setup Environment (in worktree)
```bash
# Node.js
[ -f "./trees/[JIRA_KEY]-[DESCRIPTION]/package.json" ] && (cd ./trees/[JIRA_KEY]-[DESCRIPTION] && npm install)
# Python
[ -f "./trees/[JIRA_KEY]-[DESCRIPTION]/requirements.txt" ] && (cd ./trees/[JIRA_KEY]-[DESCRIPTION] && pip install -r requirements.txt)
# Ruby
[ -f "./trees/[JIRA_KEY]-[DESCRIPTION]/Gemfile" ] && (cd ./trees/[JIRA_KEY]-[DESCRIPTION] && bundle install)
```

### Remote Operations (NO cd)
```bash
# Git commands - use -C flag
git -C ./trees/[JIRA_KEY]-[DESCRIPTION] status
git -C ./trees/[JIRA_KEY]-[DESCRIPTION] add .
git -C ./trees/[JIRA_KEY]-[DESCRIPTION] commit -m "fix: [MESSAGE]\n\nRef: [JIRA_KEY]"
git -C ./trees/[JIRA_KEY]-[DESCRIPTION] diff
git -C ./trees/[JIRA_KEY]-[DESCRIPTION] log --oneline -10
git -C ./trees/[JIRA_KEY]-[DESCRIPTION] fetch origin develop
git -C ./trees/[JIRA_KEY]-[DESCRIPTION] rebase origin/develop
git -C ./trees/[JIRA_KEY]-[DESCRIPTION] push origin feature/[JIRA_KEY]-[DESCRIPTION]

# Non-git commands - use subshells
(cd ./trees/[JIRA_KEY]-[DESCRIPTION] && npm test)
(cd ./trees/[JIRA_KEY]-[DESCRIPTION] && npm run lint)
(cd ./trees/[JIRA_KEY]-[DESCRIPTION] && npm run build)
(cd ./trees/[JIRA_KEY]-[DESCRIPTION] && python -m pytest)
```

### Linting (MANDATORY before commit)
```bash
# Node.js
[ -f "./trees/[JIRA_KEY]-[DESCRIPTION]/package.json" ] && \
  (cd ./trees/[JIRA_KEY]-[DESCRIPTION] && npm run lint:fix) || \
  (cd ./trees/[JIRA_KEY]-[DESCRIPTION] && npm run lint)

# Python  
[ -f "./trees/[JIRA_KEY]-[DESCRIPTION]/requirements.txt" ] && \
  (cd ./trees/[JIRA_KEY]-[DESCRIPTION] && black . && isort . && flake8 .)

# Ruby
[ -f "./trees/[JIRA_KEY]-[DESCRIPTION]/Gemfile" ] && \
  (cd ./trees/[JIRA_KEY]-[DESCRIPTION] && bundle exec rubocop -a)

# PHP
[ -f "./trees/[JIRA_KEY]-[DESCRIPTION]/composer.json" ] && \
  (cd ./trees/[JIRA_KEY]-[DESCRIPTION] && ./vendor/bin/php-cs-fixer fix .)

# Go
[ -f "./trees/[JIRA_KEY]-[DESCRIPTION]/go.mod" ] && \
  (cd ./trees/[JIRA_KEY]-[DESCRIPTION] && gofmt -w . && golangci-lint run --fix)
```

### Testing (in worktree)
```bash
# Node.js
[ -f "./trees/[JIRA_KEY]-[DESCRIPTION]/package.json" ] && \
  (cd ./trees/[JIRA_KEY]-[DESCRIPTION] && npm test -- --coverage)

# Python
[ -f "./trees/[JIRA_KEY]-[DESCRIPTION]/requirements.txt" ] && \
  (cd ./trees/[JIRA_KEY]-[DESCRIPTION] && python -m pytest --cov)

# Ruby  
[ -f "./trees/[JIRA_KEY]-[DESCRIPTION]/Rakefile" ] && \
  (cd ./trees/[JIRA_KEY]-[DESCRIPTION] && rake test)
```

### Merge to Develop (NOT main)
```bash
# Update from develop
git -C ./trees/[JIRA_KEY]-[DESCRIPTION] fetch origin develop
git -C ./trees/[JIRA_KEY]-[DESCRIPTION] rebase origin/develop

# Verify commits exist
git log develop..feature/[JIRA_KEY]-[DESCRIPTION] --oneline

# Merge to develop ONLY
git checkout develop
git merge feature/[JIRA_KEY]-[DESCRIPTION] --no-ff -m "feat: merge feature/[JIRA_KEY]-[DESCRIPTION]\n\nRef: [JIRA_KEY]"
git push origin develop

# Update Jira
acli jira workitem transition --key [JIRA_KEY] --status "In Review"
```

### Safe Cleanup
```bash
# Check uncommitted changes
[ -n "$(git -C ./trees/[JIRA_KEY]-[DESCRIPTION] status --porcelain)" ] && \
  { echo "ERROR: Uncommitted changes"; exit 1; }

# Check unmerged commits
[ -n "$(git log develop..feature/[JIRA_KEY]-[DESCRIPTION] --oneline)" ] && \
  { echo "ERROR: Unmerged commits"; exit 1; }

# Remove remote branch
git show-ref --verify --quiet "refs/remotes/origin/feature/[JIRA_KEY]-[DESCRIPTION]" && \
  git push origin --delete feature/[JIRA_KEY]-[DESCRIPTION]

# Remove worktree and branch
git worktree remove ./trees/[JIRA_KEY]-[DESCRIPTION]
git branch -d feature/[JIRA_KEY]-[DESCRIPTION]
```

## 🎯 Worktree Management

### List & Remove
```bash
git worktree list
git worktree remove ./trees/[JIRA_KEY]-[DESCRIPTION]
git worktree remove ./trees/[JIRA_KEY]-[DESCRIPTION] --force  # Only if verified
```

### Naming Convention
- Format: `./trees/[JIRA_KEY]-[DESCRIPTION]`
- Examples: `./trees/PROJ-123-auth`, `./trees/BUG-456-security`

## ⚡ Parallel Development

### Track Parallel Work
```bash
# Create tracking file
cat > PARALLEL_WORK.md << EOF
# Parallel Work - $(date)
| KEY | Branch | Worktree | Status |
|-----|--------|----------|--------|
| [JIRA_KEY]-1 | feature/[JIRA_KEY]-1 | ./trees/[JIRA_KEY]-1 | In Progress |
| [JIRA_KEY]-2 | feature/[JIRA_KEY]-2 | ./trees/[JIRA_KEY]-2 | In Progress |
EOF

# Create parallel worktrees
for i in 1 2 3; do
  git worktree add trees/[JIRA_KEY]-$i -b feature/[JIRA_KEY]-$i develop
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
git log develop --grep="[JIRA_KEY]" | head -5
```

### Standard Workflow
```bash
# 1. Create worktree
mkdir -p trees && git worktree add ./trees/[JIRA_KEY]-[DESCRIPTION] -b feature/[JIRA_KEY]-[DESCRIPTION] develop

# 2. Setup environment  
(cd ./trees/[JIRA_KEY]-[DESCRIPTION] && npm install)

# 3. Work (no cd)
git -C ./trees/[JIRA_KEY]-[DESCRIPTION] add .
git -C ./trees/[JIRA_KEY]-[DESCRIPTION] commit -m "fix: [MESSAGE]\n\nRef: [JIRA_KEY]"

# 4. Test in worktree
(cd ./trees/[JIRA_KEY]-[DESCRIPTION] && npm test)

# 5. Lint before merge
(cd ./trees/[JIRA_KEY]-[DESCRIPTION] && npm run lint)

# 6. Update from develop
git -C ./trees/[JIRA_KEY]-[DESCRIPTION] rebase origin/develop

# 7. Merge to develop
git checkout develop && git merge feature/[JIRA_KEY]-[DESCRIPTION] --no-ff

# 8. Clean up
git worktree remove ./trees/[JIRA_KEY]-[DESCRIPTION]
git branch -d feature/[JIRA_KEY]-[DESCRIPTION]
```

## 📝 Key Rules Summary

1. **ALL work in ./trees/** - Never in root directory
2. **Use git -C** for git commands - Never cd into worktrees
3. **Use subshells** for non-git commands - (cd ./trees/X && command)
4. **Test in worktree** - Never run tests in root
5. **Lint before commit** - Always run linting
6. **Merge to develop only** - Never to main without permission
7. **Verify before cleanup** - Check uncommitted/unmerged work
8. **Update Jira** - Transition to "In Review" after merge

**Remember**: Main branch merges require explicit human permission