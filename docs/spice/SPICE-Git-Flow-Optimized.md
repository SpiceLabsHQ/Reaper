# 🌳 Git Flow & Standards (Optimized)

## 🚨 Main Branch Protection
**CRITICAL**: LLMs STRICTLY PROHIBITED from merging to `main` without explicit user permission.

### Forbidden Actions
- `git checkout main && git merge develop`
- `git push origin main`
- Any automatic merge/push to main
- `--no-verify` commits

### Permission Required
User must explicitly state: "merge to main", "update main branch", "deploy to production", "release to main"

## 🌳 Branching Strategy

### Branch Types
- **main**: Production only, protected
- **develop**: Integration, protected  
- **feature/[TASK_ID]-[DESCRIPTION]**: From develop
- **release/X.Y.Z**: develop → main+develop
- **hotfix/[TASK_ID]-fix**: main → main+develop

### Rules
- NO direct commits to main/develop
- Delete feature branches after merge
- Include task ID in branch name

## 📝 Commit Standards

### Format
```
<type>(<scope>): <subject> (max 72 chars)

<body>

Ref: [TASK_ID]
```

### Types
- `feat`: New feature → MINOR
- `fix`: Bug fix → PATCH
- `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`: No bump
- `BREAKING CHANGE:` in footer → MAJOR

### Verification (MANDATORY)
```bash
git status --short
git diff --cached | head
# Write commit based on verified changes
```

## 🤖 Agent Git Operations

### Branch Management
```bash
Task --subagent_type reaper:branch-manager \
  --description "Setup environment" \
  --prompt "Create feature branch for [TASK_ID]-[DESCRIPTION], setup worktree, validate"
```

### Safe Merge
```bash
Task --subagent_type reaper:branch-manager \
  --description "Safe merge" \
  --prompt "Merge feature/[TASK_ID]-[DESCRIPTION] to develop with conflict detection"
```

### Quality Chain
```bash
# 1. Planning
Task --subagent_type reaper:workflow-planner --prompt "Analyze [TASK_ID] for parallel work"

# 2. Implementation  
Task --subagent_type reaper:bug-fixer --prompt "Fix [TASK_ID] with TDD"
# OR
Task --subagent_type reaper:feature-developer --prompt "Implement [TASK_ID] with TDD"

# 3. Quality
Task --subagent_type reaper:test-runner --prompt "Run tests for [TASK_ID]"
Task --subagent_type reaper:code-reviewer --prompt "Review [TASK_ID]"

# 4. Integration
Task --subagent_type reaper:branch-manager --prompt "Merge [TASK_ID] to develop"
```

## 🎨 Linting (MANDATORY)

### Auto-detect and Run
```bash
# JavaScript
[ -f package.json ] && (npm run lint:fix || npm run lint)

# Python  
[ -f requirements.txt ] && (black . && isort . && flake8 .)

# PHP
[ -f composer.json ] && ./vendor/bin/php-cs-fixer fix .

# Ruby
[ -f Gemfile ] && bundle exec rubocop -a

# Go
[ -f go.mod ] && (gofmt -w . && golangci-lint run --fix)
```

### Verification Pattern
```bash
LINT_EXIT_CODE=0
(cd ./trees/[TASK_ID]-[DESCRIPTION] && npm run lint) || LINT_EXIT_CODE=$?
[ $LINT_EXIT_CODE -eq 0 ] || { echo "ERROR: Lint failed"; exit 1; }
```

## ✅ Merge Process

### Pre-Merge Checks
```bash
# Check branch exists
git show-ref --verify --quiet "refs/heads/feature/[TASK_ID]-[DESCRIPTION]"

# Check for commits
git log develop..feature/[TASK_ID]-[DESCRIPTION] --oneline

# Check worktree status
git -C ./trees/[TASK_ID]-[DESCRIPTION] status --porcelain
```

### Merge to Develop Only
```bash
git checkout develop
git merge feature/[TASK_ID]-[DESCRIPTION] --no-ff -m "Merge [TASK_ID]"
git push origin develop
echo "✅ Merged to develop - main requires human approval"
```

### Cleanup
```bash
# Remove remote branch
git push origin --delete feature/[TASK_ID]-[DESCRIPTION]

# Remove worktree
git worktree remove ./trees/[TASK_ID]-[DESCRIPTION]

# Remove local branch
git branch -d feature/[TASK_ID]-[DESCRIPTION]

# Update task status
# For Beads: bd close [TASK_ID]
# For JIRA: acli jira workitem transition --key [TASK_ID] --status "In Review"
```

## 📦 Versioning
- **Use SemVer**: CLI tools, libraries, APIs, mobile apps, MCP servers
- **NO SemVer**: Websites, web apps, docs
- **Format**: MAJOR.MINOR.PATCH

## 🚀 CI/CD
- Run on every push
- Tests + coverage
- Linting
- Build/compile
- **Protection**: main (2 approvals), develop (1 approval)

## 🔗 Module Integration
- **Worktrees**: @SPICE-Worktrees.md - ALL work in ./trees/
- **Testing**: @SPICE-Testing.md - 80%+ coverage required
- **Task Tracking**: All commits reference task IDs