# 🧪 Testing Standards for LLMs

> **CRITICAL**: ALL tests run in worktree `./trees/[JIRA_KEY]-[DESCRIPTION]`, NEVER in root

## 🤖 Agent-Driven TDD (MANDATORY)

### Bug Fixing
```bash
Task --subagent_type reaper:bug-fixer --prompt "Fix [JIRA_KEY]: [BUG_DESCRIPTION] with TDD Red-Green-Refactor"
```

### Feature Development  
```bash
Task --subagent_type reaper:feature-developer --prompt "Implement [JIRA_KEY]: [FEATURE_NAME] with TDD, SOLID, 80%+ coverage"
```

### Quality Validation
```bash
Task --subagent_type reaper:test-runner --prompt "Execute tests, linting, coverage for [JIRA_KEY]"
```

## TDD Process
1. 🔴 **RED**: Write failing test
2. 🟢 **GREEN**: Minimal code to pass
3. 🔵 **BLUE**: Refactor for quality
4. 🔄 **REPEAT**: Until feature complete

## Requirements
- **80%+ coverage** for application code
- **Mock ALL externals** (APIs, HTTP, DB)
- **AAA Pattern**: Arrange-Act-Assert
- **Performance**: Unit <1s, Integration <10s

## 🚨 Testing Location
```bash
# ✅ CORRECT - In worktree
(cd ./trees/[JIRA_KEY]-[DESCRIPTION] && npm test)
(cd ./trees/[JIRA_KEY]-[DESCRIPTION] && python -m pytest)

# ❌ WRONG - In root
npm test
python -m pytest
```

## 🎯 What Requires Testing

**TEST**: Business logic, APIs, services, UI components, auth, data access

**SKIP**: Build configs, linting configs, IDE integrations, CI/CD scripts

## Mocking Patterns
- **JS**: `jest.mock('axios')`
- **Python**: `@patch` or `requests_mock`
- **PHP**: `Http::fake()`
- **Principle**: No real external calls in tests

## 🌐 Browser Testing
```bash
# Required for web apps
mcp__puppeteer__* # Navigation
mcp__browser-tools__get* # Debugging
mcp__browser-tools__run*Audit # Audits
```

## Test Commands
```bash
# Node.js
(cd ./trees/[JIRA_KEY]-[DESCRIPTION] && npm test) || exit 1
(cd ./trees/[JIRA_KEY]-[DESCRIPTION] && npm test -- --coverage) || exit 1

# Python
(cd ./trees/[JIRA_KEY]-[DESCRIPTION] && python -m pytest) || exit 1
(cd ./trees/[JIRA_KEY]-[DESCRIPTION] && python -m pytest --cov) || exit 1

# Ruby
(cd ./trees/[JIRA_KEY]-[DESCRIPTION] && rake test) || exit 1

# Build/Lint
(cd ./trees/[JIRA_KEY]-[DESCRIPTION] && npm run build) || exit 1
(cd ./trees/[JIRA_KEY]-[DESCRIPTION] && npm run lint) || exit 1
```

## Error Handling
```bash
# ✅ SAFE - Exits on failure
(cd ./trees/[JIRA_KEY]-[DESCRIPTION] && npm test) || { echo "ERROR"; exit 1; }

# ❌ UNSAFE - Continues on failure
(cd ./trees/[JIRA_KEY]-[DESCRIPTION] && npm test) || echo "Failed"
```

## Coverage Check
```bash
# Application code: 80%+ required
(cd ./trees/[JIRA_KEY]-[DESCRIPTION] && npm test -- --coverage)
(cd ./trees/[JIRA_KEY]-[DESCRIPTION] && python -m pytest --cov)
```

**Exclusions**: Config files, build scripts, test files, third-party code

## Standard Workflow
```bash
# All in worktree ./trees/[JIRA_KEY]-[DESCRIPTION]
# 1. Install deps
(cd ./trees/[JIRA_KEY]-[DESCRIPTION] && npm install) || exit 1

# 2. Lint
(cd ./trees/[JIRA_KEY]-[DESCRIPTION] && npm run lint) || exit 1

# 3. Test with coverage
(cd ./trees/[JIRA_KEY]-[DESCRIPTION] && npm test -- --coverage) || exit 1

# 4. Build
(cd ./trees/[JIRA_KEY]-[DESCRIPTION] && npm run build) || exit 1

echo "✅ All checks passed in worktree"
```

## Quality Gates (Before Merge)
- [ ] Tests pass with 80%+ coverage
- [ ] Linting passes
- [ ] Build succeeds
- [ ] No console errors (web apps)
- [ ] ALL tests run in worktree

**Integration**: See @SPICE-Worktrees.md for worktree patterns