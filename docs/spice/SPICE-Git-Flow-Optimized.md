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
- **feature/[JIRA_KEY]-[DESCRIPTION]**: From develop
- **release/X.Y.Z**: develop → main+develop
- **hotfix/[JIRA_KEY]-fix**: main → main+develop

### Rules
- NO direct commits to main/develop
- Delete feature branches after merge
- Include Jira ticket in branch name

## 📝 Commit Standards

### Format
```
<type>(<scope>): <subject> (max 72 chars)

<body>

Ref: [JIRA_KEY]
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
Task --subagent_type branch-manager \
  --description "Setup environment" \
  --prompt "Create feature branch for [JIRA_KEY]-[DESCRIPTION], setup worktree, validate"
```

### Safe Merge
```bash
Task --subagent_type branch-manager \
  --description "Safe merge" \
  --prompt "Merge feature/[JIRA_KEY]-[DESCRIPTION] to develop with conflict detection"
```

### Quality Chain
```bash
# 1. Planning
Task --subagent_type workflow-planner --prompt "Analyze [JIRA_KEY] for parallel work"

# 2. Implementation  
Task --subagent_type bug-fixer --prompt "Fix [JIRA_KEY] with TDD"
# OR
Task --subagent_type feature-developer --prompt "Implement [JIRA_KEY] with TDD"

# 3. Quality
Task --subagent_type test-runner --prompt "Run tests for [JIRA_KEY]"
Task --subagent_type code-reviewer --prompt "Review [JIRA_KEY]"

# 4. Integration
Task --subagent_type branch-manager --prompt "Merge [JIRA_KEY] to develop"
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
(cd ./trees/[JIRA_KEY]-[DESCRIPTION] && npm run lint) || LINT_EXIT_CODE=$?
[ $LINT_EXIT_CODE -eq 0 ] || { echo "ERROR: Lint failed"; exit 1; }
```

## ✅ Merge Process

### Pre-Merge Checks
```bash
# Check branch exists
git show-ref --verify --quiet "refs/heads/feature/[JIRA_KEY]-[DESCRIPTION]"

# Check for commits
git log develop..feature/[JIRA_KEY]-[DESCRIPTION] --oneline

# Check worktree status
git -C ./trees/[JIRA_KEY]-[DESCRIPTION] status --porcelain
```

### Merge to Develop Only
```bash
git checkout develop
git merge feature/[JIRA_KEY]-[DESCRIPTION] --no-ff -m "Merge [JIRA_KEY]"
git push origin develop
echo "✅ Merged to develop - main requires human approval"
```

### Cleanup
```bash
# Remove remote branch
git push origin --delete feature/[JIRA_KEY]-[DESCRIPTION]

# Remove worktree
git worktree remove ./trees/[JIRA_KEY]-[DESCRIPTION]

# Remove local branch
git branch -d feature/[JIRA_KEY]-[DESCRIPTION]

# Update Jira
acli jira workitem transition --key [JIRA_KEY] --status "In Review"
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
- **Jira**: All commits reference tickets