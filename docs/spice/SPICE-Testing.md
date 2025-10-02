# 🧪 Testing Standards for LLMs

> **CRITICAL**: ALL tests must run in worktree directory, NEVER in root

## 🤖 Agent-Driven TDD Workflow (MANDATORY)

**MANDATORY**: Use specialized agents for systematic TDD implementation with built-in quality controls.

### 🐛 Bug Fixing with TDD (bug-fixer agent)

**REQUIRED** for all bug reports and issues:

```bash
# MANDATORY: Systematic bug reproduction and fixing
Task --subagent_type bug-fixer \
  --description "Fix reported bug with TDD" \
  --prompt "Reproduce bug PROJ-123: [BUG_DESCRIPTION]. Write failing test that demonstrates the issue, implement minimal fix, ensure comprehensive test coverage following Red-Green-Refactor methodology."
```

**Agent TDD Process:**
1. **🔴 RED**: Agent writes failing test that reproduces the exact bug behavior
2. **🟢 GREEN**: Agent implements minimal fix to make test pass
3. **🔵 BLUE**: Agent refactors for quality, SOLID principles, comprehensive coverage
4. **🔍 VALIDATION**: Agent runs full test suite, ensures no regressions

### 🚀 Feature Development with TDD (feature-developer agent)

**REQUIRED** for all new functionality:

```bash
# MANDATORY: Feature implementation with TDD and SOLID principles
Task --subagent_type feature-developer \
  --description "Implement new feature with TDD" \
  --prompt "Implement PROJ-123: [FEATURE_NAME]. Use TDD methodology starting with test cases for acceptance criteria, apply SOLID principles, ensure 80%+ test coverage including integration tests."
```

**Agent TDD Process:**
1. **🔴 RED**: Agent writes comprehensive test suite covering all acceptance criteria
2. **🟢 GREEN**: Agent implements feature using SOLID principles and dependency injection
3. **🔵 BLUE**: Agent refactors for maintainability, performance, and code quality
4. **🔗 INTEGRATION**: Agent creates integration tests for end-to-end workflows

### 📊 Quality Validation (test-runner agent)

**MANDATORY** before merging any code:

```bash
# REQUIRED: Comprehensive testing validation
Task --subagent_type test-runner \
  --description "Run comprehensive testing" \
  --prompt "Execute all tests, linting, coverage analysis, and quality checks for PROJ-123. Validate 80%+ coverage requirement and ensure all quality gates pass."
```

**Agent Test Execution:**
- **Unit Tests**: All test suites with coverage analysis
- **Integration Tests**: End-to-end workflow validation
- **Linting**: Code style and quality checks
- **Type Checking**: Static analysis validation
- **Security**: Basic vulnerability scanning

## Manual TDD Workflow (Fallback)
1. 🔴 Write failing test
2. 🟢 Write minimal code to pass
3. 🔵 Refactor
4. 🔄 Repeat

## Requirements
- **80%+ coverage** (enforced for application code only)
- **Mock ALL externals** (APIs, HTTP, services)
- **No real API calls** in tests
- **AAA Pattern**: Arrange-Act-Assert
- **Performance**: Unit <1s, Integration <10s
- **CRITICAL**: ALL tests must run in worktree directory, NEVER in root

## 📁 Test Organization Standards (Language Agnostic)

**MANDATORY**: Proper test organization prevents confusion and ensures accurate test execution.

### Directory Structure (Recommended Patterns)

**Option 1: tests/ directory**
```
tests/
├── unit/              # Unit tests - fast, isolated, mocked
├── integration/       # Integration tests - components working together
└── e2e/              # End-to-end tests - full system validation
```

**Option 2: __tests__/ directory (JavaScript/React common)**
```
__tests__/
├── unit/
├── integration/
└── e2e/
```

**Option 3: spec/ directory (Ruby/RSpec common)**
```
spec/
├── unit/
├── integration/
└── features/
```

### Universal Principles

1. **Location Matches Purpose**:
   - Unit tests belong in `unit/` directories
   - Integration tests belong in `integration/` directories
   - E2E tests belong in `e2e/` or `features/` directories

2. **Naming Conventions Align with Type**:
   - ✅ `tests/unit/auth.test.js` or `tests/unit/auth_test.py`
   - ✅ `tests/integration/api-integration.test.js`
   - ❌ `tests/unit/integration.test.js` (integration test in unit directory)

3. **No Test Files in Worktree/Backup Directories**:
   - ❌ `./trees/feature-123/tests/` (will cause duplicate execution)
   - ❌ `.backup/tests/` (will cause duplicate execution)
   - ✅ `tests/unit/` in main project only

4. **Standard Exclusion Patterns**:
   - Always exclude: `**/trees/**`, `**/*backup*/**`, `**/.backup/**`
   - Language-specific: `**/node_modules/**`, `**/vendor/**`, `**/venv/**`

### Pre-Test Validation Checklist

Before running tests, verify:
- [ ] No test files in `trees/` directories
- [ ] No test files in `backup/` or `.backup/` directories
- [ ] File names match directory purpose (no integration tests in unit/)
- [ ] Exclude patterns specified for test discovery

## 🚨 Testing Location Requirements
**MANDATORY for ALL LLMs**:
- ✅ CORRECT: `(cd ./trees/PROJ-123 && npm test)` - Tests run in worktree
- ❌ WRONG: `npm test` - Tests run in root directory
- ✅ CORRECT: `(cd ./trees/PROJ-123 && python -m pytest)` - Tests run in worktree
- ❌ WRONG: `python -m pytest` - Tests run in root directory

## 🎯 What Requires Testing
**MUST be tested (application functionality):**
- Business logic and domain models
- API endpoints and controllers
- Service classes and utilities
- User interface components
- Data access layers
- Authentication and authorization
- Core application features

**SHOULD NOT be tested (development tooling):**
- Test scripts themselves
- Build configurations (webpack, vite, etc.)
- Linting configurations
- IDE integrations
- Development server setups
- Deployment scripts
- CI/CD pipeline configurations

**Key Principle:** Test the application you're building, not the tools used to build it. Development tooling tests typically fail in CI environments and should remain separate from application test suites.

## Mocking Examples

### PHP/Laravel
```php
// Laravel
Http::fake([
    'https://api.example.com/*' => Http::response(['data' => 'test'], 200)
]);
```

### JavaScript/Node.js
```javascript
// Jest/Node.js
jest.mock('axios');
axios.get.mockResolvedValue({ data: { result: 'test' } });
```

### Python
```python
# pytest/requests-mock
def test_api(requests_mock):
    requests_mock.get('https://api.example.com', json={'data': 'test'})
```

## 🌐 Browser Testing (Web Apps)

**MCP Tools Required:**
- Navigation: `mcp__puppeteer__*`
- Debugging: `mcp__browser-tools__get*`
- Audits: `mcp__browser-tools__run*Audit`

**Before Completion:**
1. Run accessibility audit
2. Check console errors
3. Verify network requests
4. Take screenshots

## Test Commands in Worktrees

**Always run tests in worktree, NOT root directory:**

```bash
# Replace PROJ-123 with your Jira ticket, 'description' with brief description

# Node.js/npm projects
(cd ./trees/PROJ-123-description && npm test) || { echo "ERROR: Tests failed in worktree"; exit 1; }
(cd ./trees/PROJ-123-description && npm test -- --coverage) || { echo "ERROR: Tests failed in worktree"; exit 1; }

# Python projects
(cd ./trees/PROJ-123-description && python -m pytest) || { echo "ERROR: Tests failed in worktree"; exit 1; }
(cd ./trees/PROJ-123-description && python -m pytest --cov) || { echo "ERROR: Tests failed in worktree"; exit 1; }

# Ruby projects
(cd ./trees/PROJ-123-description && rake test) || { echo "ERROR: Tests failed in worktree"; exit 1; }
(cd ./trees/PROJ-123-description && bundle exec rspec) || { echo "ERROR: Tests failed in worktree"; exit 1; }

# Build commands
(cd ./trees/PROJ-123-description && npm run build) || { echo "ERROR: Build failed in worktree"; exit 1; }
(cd ./trees/PROJ-123-description && npm run lint) || { echo "ERROR: Lint failed in worktree"; exit 1; }
```

## Error Handling in Tests

**Safe Pattern** (REQUIRED):
```bash
(cd ./trees/PROJ-123-description && npm test) || { echo "ERROR: Tests failed in worktree"; exit 1; }
```

**Unsafe Pattern** (FORBIDDEN):
```bash
(cd ./trees/PROJ-123-description && npm test) || echo "Tests failed"  # Don't use - allows workflow to continue
```

## Test-Driven Development Examples

### 1. Red Phase - Write Failing Test
```javascript
// user.test.js
describe('User authentication', () => {
  test('should authenticate valid user', () => {
    const user = { email: 'test@example.com', password: 'secret' };
    const result = authenticateUser(user);
    expect(result.success).toBe(true);
  });
});
```

### 2. Green Phase - Minimal Implementation
```javascript
// user.js
function authenticateUser(user) {
  return { success: true }; // Minimal implementation
}
```

### 3. Blue Phase - Refactor
```javascript
// user.js
function authenticateUser(user) {
  if (!user.email || !user.password) {
    return { success: false, error: 'Missing credentials' };
  }
  // Real authentication logic
  return { success: true, user: { id: 1, email: user.email } };
}
```

## Coverage Requirements

**Application Code**: 80%+ coverage required
**Test Command Examples**:
```bash
# Check coverage in worktree
(cd ./trees/PROJ-123-description && npm test -- --coverage)
(cd ./trees/PROJ-123-description && python -m pytest --cov)
(cd ./trees/PROJ-123-description && bundle exec rspec --format html --out coverage/index.html)
```

**Exclusions** (don't count toward coverage):
- Configuration files
- Build scripts
- Test files themselves
- Third-party integrations
- Development-only code

## Integration with Worktrees

**Standard Testing Workflow in Worktree**:
```bash
# Replace PROJ-123 with your Jira ticket
# All commands run in worktree, NOT root

# 1. Install dependencies
(cd ./trees/PROJ-123-description && npm install) || { echo "ERROR: Install failed"; exit 1; }

# 2. Run linting
(cd ./trees/PROJ-123-description && npm run lint) || { echo "ERROR: Lint failed"; exit 1; }

# 3. Run tests with coverage
(cd ./trees/PROJ-123-description && npm test -- --coverage) || { echo "ERROR: Tests failed"; exit 1; }

# 4. Build project
(cd ./trees/PROJ-123-description && npm run build) || { echo "ERROR: Build failed"; exit 1; }

# 5. Only proceed if all pass
echo "✅ All quality checks passed in worktree"
```

## Quality Gates

**Before merging to develop**, ALL must pass:
- [ ] Tests pass with 80%+ coverage
- [ ] Linting passes
- [ ] Build succeeds
- [ ] No console errors (for web apps)
- [ ] All tests run in worktree (NOT root)

**Integration with @SPICE-Worktrees.md**: All testing commands must follow worktree isolation patterns.