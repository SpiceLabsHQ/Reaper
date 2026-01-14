# Reaper Template Build System

This document describes the template build system for the Reaper plugin, enabling DRY (Don't Repeat Yourself) development through EJS partials.

## Overview

The build system extracts repeated content from agent, skill, command, and hook files into reusable EJS partials. Source templates live in `src/` and compile to the project root directories.

## Directory Structure

```
reaper/
├── src/                          # Source templates
│   ├── agents/                   # Agent EJS templates
│   │   ├── bug-fixer.ejs
│   │   ├── feature-developer.ejs
│   │   └── ...
│   ├── skills/                   # Skill EJS templates
│   │   ├── spice/
│   │   │   ├── SKILL.ejs
│   │   │   └── ...
│   │   └── worktree-manager/
│   │       └── ...
│   ├── commands/                 # Command EJS templates
│   │   ├── takeoff.ejs
│   │   └── ...
│   ├── hooks/                    # Hook templates
│   │   └── hooks.json            # Static, no templating needed
│   ├── partials/                 # Shared content partials
│   │   ├── pre-work-validation-coding.ejs
│   │   ├── pre-work-validation-review.ejs
│   │   ├── pre-work-validation-planning.ejs
│   │   ├── directory-exclusions.ejs
│   │   ├── output-requirements.ejs
│   │   ├── git-prohibitions.ejs
│   │   ├── tdd-testing-protocol.ejs
│   │   ├── artifact-cleanup-coding.ejs
│   │   ├── artifact-cleanup-review.ejs
│   │   ├── file-conflict-detection.ejs
│   │   ├── no-commits-policy.ejs
│   │   └── json-output-structure.ejs
│   └── README.md                 # Source directory documentation
├── scripts/
│   └── build.js                  # Node.js build script
├── agents/                       # Generated output (git-tracked)
├── skills/                       # Generated output (git-tracked)
├── commands/                     # Generated output (git-tracked)
└── hooks/                        # Generated output (git-tracked)
```

## Partials Reference

### Pre-Work Validation Partials

| Partial | Used By | Description |
|---------|---------|-------------|
| `pre-work-validation-coding.ejs` | bug-fixer, feature-developer, refactoring-specialist, integration-engineer | Validates TASK, WORKTREE_PATH, DESCRIPTION |
| `pre-work-validation-review.ejs` | code-reviewer, security-auditor, test-runner | Validates TASK, WORKING_DIR, PLAN_CONTEXT |
| `pre-work-validation-planning.ejs` | workflow-planner, api-designer, database-architect, cloud-architect | Validates task scope completeness |

### Standard Protocol Partials

| Partial | Used By | Description |
|---------|---------|-------------|
| `directory-exclusions.ejs` | All coding agents | Standard exclusion patterns for tests/linting |
| `output-requirements.ejs` | All agents | JSON output requirements, no file writing |
| `git-prohibitions.ejs` | Coding agents | Never run git add/commit/push/merge |
| `tdd-testing-protocol.ejs` | bug-fixer, feature-developer, refactoring-specialist | TDD Red-Green-Blue cycle |
| `artifact-cleanup-coding.ejs` | Coding agents | Clean up test/lint artifacts |
| `artifact-cleanup-review.ejs` | Review agents | Clean up scan/build artifacts |
| `file-conflict-detection.ejs` | Coding agents | Strategy 2 parallel work safety |
| `no-commits-policy.ejs` | Coding agents | Coding agents never commit |

### Output Structure Partials

| Partial | Used By | Description |
|---------|---------|-------------|
| `json-output-structure.ejs` | All agents | Standardized JSON response format |

## Template Variables

Templates use these EJS variables passed during compilation:

### Agent Variables

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `AGENT_NAME` | string | Agent identifier | `bug-fixer` |
| `AGENT_TYPE` | enum | Agent category | `coding`, `review`, `planning` |
| `AGENT_COLOR` | string | Status line color | `green`, `yellow`, `blue` |
| `AGENT_MODEL` | string | Optional model override | `opus`, `haiku` |
| `HAS_TDD` | boolean | Uses TDD protocol | `true`/`false` |
| `HAS_GIT_PROHIBITIONS` | boolean | Has git restrictions | `true`/`false` |
| `TASK_NOUN` | string | What agent works on | `bug`, `feature`, `code` |

### Agent Type Mappings

```javascript
const AGENT_TYPES = {
  coding: ['bug-fixer', 'feature-developer', 'refactoring-specialist', 'integration-engineer'],
  review: ['code-reviewer', 'security-auditor', 'test-runner'],
  planning: ['workflow-planner', 'api-designer', 'database-architect', 'cloud-architect'],
  operations: ['branch-manager', 'deployment-engineer', 'incident-responder'],
  documentation: ['documentation-generator', 'claude-agent-architect'],
  performance: ['performance-engineer']
};
```

## EJS Syntax Reference

### Including Partials

```ejs
<%# Include a partial %>
<%- include('partials/pre-work-validation-coding') %>

<%# Include with local variables %>
<%- include('partials/output-requirements', { agentType: 'coding', taskNoun: 'bug' }) %>
```

### Conditional Content

```ejs
<% if (AGENT_TYPE === 'coding') { %>
## Git Prohibitions
<%- include('partials/git-prohibitions') %>
<% } %>

<% if (HAS_TDD) { %>
## TDD Testing Protocol
<%- include('partials/tdd-testing-protocol') %>
<% } %>
```

### Variable Interpolation

```ejs
You are a <%= AGENT_NAME %> Agent that <%= AGENT_DESCRIPTION %>.

<%# Escaped output (HTML entities) %>
<%= userInput %>

<%# Unescaped output (raw markdown) %>
<%- markdownContent %>
```

## Build Script Usage

### Commands

```bash
# Build all templates
npm run build

# Build with watch mode (development)
npm run build:watch

# Build specific type
npm run build -- --type=agents
npm run build -- --type=skills
```

### Build Script API

```javascript
// scripts/build.js
const { buildTemplates } = require('./build');

// Build all
buildTemplates();

// Build specific directory
buildTemplates({ only: ['agents'] });

// Build with validation
buildTemplates({ validate: true });
```

## Workflow Integration

### Pre-commit Hook

The build runs automatically on pre-commit:

```bash
# .husky/pre-commit
npm run build
git add agents/ skills/ commands/ hooks/
```

This ensures:
1. Templates compile without errors
2. Generated files are always committed with source changes
3. No drift between source and output

### CI/CD

The build should also run in CI to verify:
- Template syntax is valid
- All partials exist
- Output matches committed files

```yaml
# Example GitHub Actions step
- name: Verify build
  run: |
    npm run build
    git diff --exit-code agents/ skills/ commands/ hooks/
```

## Adding New Content

### Adding a New Partial

1. Create partial in `src/partials/`:
   ```bash
   touch src/partials/my-new-partial.ejs
   ```

2. Add content (no frontmatter, just the markdown):
   ```markdown
   ## My New Section

   Content that will be shared across agents...
   ```

3. Include in agents:
   ```ejs
   <%- include('partials/my-new-partial') %>
   ```

4. Run build:
   ```bash
   npm run build
   ```

### Adding a New Agent

1. Create template in `src/agents/`:
   ```bash
   touch src/agents/my-new-agent.ejs
   ```

2. Add frontmatter and content:
   ```ejs
   ---
   name: my-new-agent
   description: ...
   color: green
   ---

   You are a My New Agent...

   <%- include('partials/pre-work-validation-coding') %>

   ... agent-specific content ...
   ```

3. Register in build config (if using agent type inference):
   ```javascript
   // In scripts/build.js or config
   AGENT_TYPES.coding.push('my-new-agent');
   ```

4. Run build:
   ```bash
   npm run build
   ```

## Partial Content Details

### pre-work-validation-coding.ejs

For coding agents (bug-fixer, feature-developer, refactoring-specialist, integration-engineer):

- Validates TASK identifier + DESCRIPTION
- Validates WORKTREE_PATH format (./trees/[task-id]-description)
- Validates detailed work description
- Optional JIRA integration
- EXIT PROTOCOL on missing requirements

### pre-work-validation-review.ejs

For review agents (code-reviewer, security-auditor, test-runner):

- Validates TASK identifier
- Validates WORKING_DIR (code location)
- Validates PLAN_CONTEXT or TEST_RUNNER_RESULTS
- Additional inputs per agent (TEST_COMMAND, LINT_COMMAND for test-runner)

### directory-exclusions.ejs

Standard exclusion patterns for all languages:
- `**/trees/**` - Worktree directories
- `**/*backup*/` - Backup directories
- `**/node_modules/**` - Node.js dependencies
- `**/vendor/**` - PHP/Go dependencies
- Language-specific examples (Jest, pytest, PHPUnit, RSpec, Go)

### git-prohibitions.ejs

Git operations that coding agents must never run:
- `git add`
- `git commit`
- `git push`
- `git merge`
- `git rebase`

Explains why only branch-manager is authorized after quality gates.

### tdd-testing-protocol.ejs

TDD testing guidance for coding agents:
- Test YOUR changes only (not full test suite)
- Red-Green-Blue cycle
- Language-specific examples
- Why separation matters (test-runner runs full suite)

### artifact-cleanup-coding.ejs

Cleanup for coding agent artifacts:
- Coverage directories (coverage/, .nyc_output/, htmlcov/)
- Test cache (.pytest_cache/, __pycache__)
- Linter cache (.eslintcache, .ruff_cache/)
- Find-based deletion patterns

### artifact-cleanup-review.ejs

Cleanup for review agent artifacts:
- Build artifacts (dist/, build/)
- Security scan results (trivy-*.json, semgrep-*.json)
- Type checking artifacts (.tsbuildinfo)

### file-conflict-detection.ejs

Strategy 2 parallel work safety:
- Check git status before making changes
- Detect unexpected modified files
- EXIT IMMEDIATELY with conflict report
- Orchestrator resolution instructions

### no-commits-policy.ejs

Commit policy for all strategies:
- Coding agents NEVER commit
- Workflow explanation per strategy
- What happens after quality gates
- Critical rules summary

### json-output-structure.ejs

Standardized JSON response format:
- Minimal required fields
- What NOT to include
- Agent-type variations
- Example structures

## Maintenance

### Updating Partials

When updating a partial:
1. Edit the partial in `src/partials/`
2. Run `npm run build`
3. Review all affected agents in `agents/`
4. Commit both source and generated files

### Verifying Consistency

After major changes:
```bash
# Rebuild all
npm run build

# Check for uncommitted changes
git status

# Diff to see what changed
git diff agents/
```

### Troubleshooting

**Build fails with "partial not found":**
- Check partial name matches exactly (case-sensitive)
- Ensure partial exists in `src/partials/`

**Output doesn't match expected:**
- Check variable values in build config
- Verify conditional logic in template
- Run build with verbose logging

**Git shows changes after build:**
- Source templates were edited but build wasn't run
- Run `npm run build` and commit all changes
