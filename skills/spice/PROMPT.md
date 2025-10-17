# Prompt for Creating Remaining SPICE Skills

This document contains the specification for creating the remaining SPICE development skills. Use this prompt to create all skills in a single session.

---

## Context

We have a multi-skill package at `~/.claude/skills/spice/` that provides automated utilities for SPICE development workflows. The following skills already exist:

**Existing Skills:**
- ✅ SKILL.md (package overview)
- ✅ GIT_COMMIT.md (commit message standards)
- ✅ WORKTREE_SETUP.md (worktree creation automation)
- ✅ WORKTREE_CLEANUP.md (safe worktree removal)

**Existing Agents (DON'T create skills for these):**
- test-runner, code-reviewer, security-auditor
- documentation-generator, deployment-engineer
- refactoring-specialist, incident-responder
- branch-manager, bug-fixer, feature-developer
- workflow-planner, performance-engineer

---

## Task

Create the following 10 skills following the same structure and quality as existing skills in the package. Each skill should:

1. Use YAML frontmatter with `name` and `description` fields (required); `allowed-tools` field is optional (defaults to all tools)
2. Include clear activation triggers
3. Provide comprehensive implementation examples with bash code
4. Include error handling and validation
5. Support multiple project types (Node.js, Python, Ruby, PHP, Go, Rust where applicable)
6. Work correctly in worktrees using `(cd ./trees/PROJ-123 && command)` pattern
7. Include troubleshooting section for common issues
8. Provide validation checklists
9. Reference SPICE documentation where relevant

---

## Skills to Create

### 1. LINT_AUTO.md ⭐⭐⭐ (High Priority)

**Purpose:** Quick auto-fix linting errors before commit

**Description for YAML frontmatter:**
```yaml
description: Automatically detects project type and runs appropriate linting with auto-fix. Activates before commits, on lint failures, or when code formatting is needed. Supports Node.js, Python, Ruby, PHP, Go, and Rust projects.
```

**Note:** `allowed-tools` field is optional - omit it to allow all tools (default behavior)

**Key Features:**
- Auto-detect project type from: package.json, requirements.txt, pyproject.toml, Gemfile, composer.json, go.mod, Cargo.toml
- Run appropriate linter with fix flag:
  - Node.js: `npm run lint:fix` or `npm run lint` or eslint --fix
  - Python: `black .` and `isort .` and `flake8 .` OR `ruff format .` and `ruff check --fix .`
  - Ruby: `bundle exec rubocop -a` or `rubocop -a`
  - PHP: `./vendor/bin/php-cs-fixer fix .`
  - Go: `gofmt -w .` and `golangci-lint run --fix`
  - Rust: `cargo fmt` and `cargo clippy --fix --allow-dirty`
- Work in worktrees: `(cd ./trees/PROJ-123 && npm run lint:fix)`
- Verify zero exit code
- Prevent `--no-verify` flag usage
- Return formatted file list

**Example Workflow:**
```bash
# Detect project type and run linter
# Show before/after lint error counts
# List files that were modified
# Return exit code for quality gates
```

---

### 2. CODE_FORMATTER.md ⭐⭐⭐

**Purpose:** Auto-format code to project standards

**Description for YAML frontmatter:**
```yaml
description: Automatically formats code using project-configured formatters (Prettier, Black, gofmt, rustfmt). Activates before commits, during bulk formatting, or when formatting is requested. Respects ignore files and configuration.
```

**Key Features:**
- Detect formatter from config files:
  - Prettier: .prettierrc, prettier.config.js, package.json "prettier" field
  - Black: pyproject.toml [tool.black], setup.cfg [black]
  - EditorConfig: .editorconfig
  - Language defaults: gofmt, rustfmt, mix format
- Format staged files only or all files
- Respect ignore files: .prettierignore, .gitignore
- Work in worktrees
- Show formatted file count
- Prevent formatting conflicts

**Example Workflow:**
```bash
# Detect formatter configuration
# Format staged files: git diff --cached --name-only | xargs prettier --write
# Or format all: prettier --write "src/**/*.{js,jsx,ts,tsx}"
# Return list of formatted files
```

---

### 3. DEPENDENCY_UPDATE.md ⭐⭐⭐

**Purpose:** Check and update dependencies safely

**Description for YAML frontmatter:**
```yaml
description: Checks for outdated dependencies and performs safe updates with testing. Activates during maintenance tasks, security alerts, or when dependency updates are requested. Categorizes updates by severity and tests after each update.
```

**Key Features:**
- Check outdated dependencies:
  - Node.js: `npm outdated` or `yarn outdated`
  - Python: `pip list --outdated` or `poetry show --outdated`
  - Ruby: `bundle outdated`
  - PHP: `composer outdated`
  - Go: `go list -u -m all`
  - Rust: `cargo outdated`
- Categorize: patch (1.0.x), minor (1.x.0), major (x.0.0)
- Update in worktree with testing after each
- Run tests after updates: `(cd ./trees/PROJ-123 && npm test)`
- Rollback on test failures
- Generate update summary with changelogs

**Example Workflow:**
```bash
# Create update worktree: ./trees/deps-update-$(date +%Y%m%d)
# Check outdated: npm outdated --json
# Update patch versions first, test
# Update minor versions, test
# Report major versions for manual review
# Generate summary with security fixes
```

---

### 4. LOCKFILE_SYNC.md ⭐⭐

**Purpose:** Verify lockfiles match package definitions

**Description for YAML frontmatter:**
```yaml
description: Validates that lockfiles are in sync with package definition files and regenerates when needed. Activates after dependency changes, before commits, or when lockfile mismatches are detected. Prevents "works on my machine" issues.
```

**Key Features:**
- Detect mismatches:
  - Node.js: package.json vs package-lock.json or yarn.lock
  - Python: pyproject.toml vs poetry.lock or requirements.txt vs requirements.lock
  - Ruby: Gemfile vs Gemfile.lock
  - PHP: composer.json vs composer.lock
  - Go: go.mod vs go.sum
  - Rust: Cargo.toml vs Cargo.lock
- Verify lockfiles are committed (not in .gitignore)
- Regenerate lockfiles if out of sync
- Validate integrity: `npm ci` vs `npm install`
- Work in worktrees

**Example Workflow:**
```bash
# Check if lockfile exists
# Verify lockfile committed
# Test install with lockfile: npm ci (should succeed)
# If mismatch: regenerate with npm install
# Verify no changes after regeneration
```

---

### 5. ENV_VALIDATOR.md ⭐⭐

**Purpose:** Validate .env files and environment variables

**Description for YAML frontmatter:**
```yaml
description: Validates environment variable files for completeness, format correctness, and security. Activates during environment setup, deployment preparation, or when .env issues are detected. Compares against .env.example templates.
```

**Key Features:**
- Compare .env.example with .env
- Check for missing required variables
- Validate format:
  - No spaces around `=`
  - Proper quoting for values with spaces
  - No trailing spaces
  - Valid variable names (uppercase, underscores)
- Detect accidentally committed secrets (.env in git)
- Warn about default/example values still in use
- Document all environment variables

**Example Workflow:**
```bash
# Read .env.example to get required variables
# Check .env exists and has all required variables
# Validate format of each line
# Check if .env is in .gitignore
# Warn if .env contains "changeme" or "example"
# Generate documentation of all variables
```

---

### 6. GITIGNORE_GENERATOR.md ⭐⭐

**Purpose:** Generate comprehensive .gitignore files

**Description for YAML frontmatter:**
```yaml
description: Generates .gitignore files from templates based on detected tech stack. Activates for new projects, when .gitignore is missing, or when updating ignore patterns. Combines multiple templates and adds SPICE-specific patterns.
```

**Key Features:**
- Auto-detect tech stack from project files
- Fetch templates from gitignore.io API or github/gitignore
- Combine multiple templates (Node + macOS + VSCode)
- Add SPICE-specific patterns:
  - `trees/` (worktrees)
  - `.env` (environment variables)
  - `PARALLEL_WORK.md` (tracking files)
- Merge with existing .gitignore (preserve custom entries)
- Organize by sections with comments

**Example Workflow:**
```bash
# Detect: package.json -> Node.js, .python-version -> Python
# Fetch templates: curl https://www.toptal.com/developers/gitignore/api/node,macos,vscode
# Add SPICE patterns: trees/, .env, *.log
# Merge with existing .gitignore if present
# Sort and deduplicate entries
# Write with section comments
```

---

### 7. GITHOOKS_SETUP.md ⭐⭐⭐

**Purpose:** Install and configure git hooks

**Description for YAML frontmatter:**
```yaml
description: Installs and configures git hooks using Husky or pre-commit framework. Activates for new projects, repository setup, or when hook configuration is needed. Sets up pre-commit linting, testing, and commit message validation.
```

**Key Features:**
- Detect existing hook framework (Husky, pre-commit, custom)
- Install framework based on project type:
  - Node.js: Husky + commitlint
  - Python: pre-commit framework
  - Ruby: Overcommit
  - Generic: Manual .git/hooks scripts
- Configure hooks:
  - pre-commit: Run linting and formatting
  - commit-msg: Validate conventional commits with commitlint
  - pre-push: Run tests (optional)
- Test hooks work correctly
- Prevent `--no-verify` bypass in documentation

**Example Workflow:**
```bash
# Node.js: npm install --save-dev husky @commitlint/cli @commitlint/config-conventional
# Initialize: npx husky install
# Add pre-commit: npx husky add .husky/pre-commit "npm run lint"
# Add commit-msg: npx husky add .husky/commit-msg "npx commitlint --edit $1"
# Create commitlint.config.js
# Test with dummy commit
```

---

### 8. EDITORCONFIG_GENERATOR.md ⭐

**Purpose:** Generate .editorconfig for consistency

**Description for YAML frontmatter:**
```yaml
description: Generates .editorconfig files to ensure consistent formatting across editors. Activates for new projects, team setup, or when editor configuration is needed. Detects languages and sets appropriate formatting rules.
```

**Key Features:**
- Detect languages from file extensions in project
- Configure universal settings:
  - charset = utf-8
  - end_of_line = lf
  - insert_final_newline = true
  - trim_trailing_whitespace = true
- Configure language-specific indentation:
  - JavaScript/TypeScript: 2 spaces
  - Python: 4 spaces
  - Go: tabs
  - Ruby: 2 spaces
  - Makefiles: tabs
- Respect existing .editorconfig if present

**Example Workflow:**
```bash
# Detect languages: find . -name "*.js" -> JavaScript found
# Create .editorconfig with sections
# [*] for universal rules
# [*.js] for JavaScript-specific rules
# [Makefile] for special cases
```

---

### 9. PORT_CONFLICT_RESOLVER.md ⭐

**Purpose:** Resolve "Address already in use" errors

**Description for YAML frontmatter:**
```yaml
description: Detects and resolves port conflicts when development servers fail to start. Activates when port conflict errors occur or when checking port availability. Identifies processes using ports and suggests solutions.
```

**Key Features:**
- Detect port from error message: "EADDRINUSE: address already in use :::3000"
- Find process using port:
  - macOS/Linux: `lsof -i :3000`
  - Cross-platform: `netstat` fallback
- Show process details: PID, command, user
- Suggest solutions:
  - Kill process: `kill -9 <PID>`
  - Use alternative port
  - Update config to new port
- Verify port is available after resolution

**Example Workflow:**
```bash
# Parse error or accept port number: 3000
# Find process: lsof -i :3000 -t
# Show details: ps -p <PID> -o pid,user,command
# Offer options:
#   1. Kill process (show command)
#   2. Use port 3001 instead
#   3. Update package.json/config to new port
# Verify: lsof -i :<new_port> returns empty
```

---

### 10. COMMIT_SEARCH.md ⭐⭐

**Purpose:** Search commit history quickly

**Description for YAML frontmatter:**
```yaml
description: Searches git commit history with flexible filters and formats results. Activates when searching for bug introductions, feature history, or commit details. Supports filtering by message, author, date, Jira key, and file path.
```

**Key Features:**
- Search filters:
  - By message: `git log --grep="auth"`
  - By author: `git log --author="John"`
  - By date range: `git log --since="2024-01-01" --until="2024-12-31"`
  - By Jira key: `git log --grep="PROJ-123"`
  - By file: `git log -- path/to/file.js`
  - By type: `git log --grep="^feat"` or `git log --grep="^fix"`
- Format options:
  - Oneline: commit hash + message
  - Detailed: hash, author, date, message, stats
  - With diffs: show changes
- Generate markdown summary with links

**Example Workflow:**
```bash
# Search by Jira key: git log --all --grep="PROJ-123" --oneline
# Search by author in date range:
#   git log --author="John" --since="2024-01-01" --pretty=format:"%h - %an, %ar : %s"
# Search by file: git log --follow -- src/auth.js
# Generate summary:
#   ## Commits for PROJ-123
#   - abc1234 - feat(auth): add OAuth (2024-01-15)
#   - def5678 - fix(auth): handle edge case (2024-01-20)
```

---

## Implementation Guidelines

### YAML Frontmatter

**Required fields:**
- `name`: Unique identifier for the skill (e.g., "worktree-setup", "lint-auto")
- `description`: Clear description including what it does and when it activates

**Optional field:**
- `allowed-tools`: Array of tools the skill can use (e.g., `[Bash, Read, Write]`)
  - If omitted, all tools are available (default behavior)
  - Only specify if you need to restrict tool access for security or simplicity

### File Structure Template

```markdown
---
name: skill-name
description: [Clear description with activation triggers]
# allowed-tools: [Bash, Read, Write]  # Optional - omit to allow all tools (default)
---

# SPICE [Skill Name] Skill

[Purpose statement]

## Activation Triggers

This skill automatically activates when:
- [Trigger 1]
- [Trigger 2]
- [Trigger 3]

## [Main Section Name]

### 1. [Subsection]

[Explanation]

```bash
# Example code
```

[Additional sections...]

## Common Issues and Solutions

### Issue: [Problem description]

**Cause:** [Why it happens]

**Solution:**
```bash
# Fix commands
```

## Validation Checklist

Before considering [task] complete, verify:

- [ ] [Checkpoint 1]
- [ ] [Checkpoint 2]
- [ ] [Checkpoint 3]

## Integration with SPICE Workflow

[How this skill fits into the overall SPICE development workflow]

## References

- SPICE [Relevant Doc]: `~/.claude/docs/spice/[FILE].md`
```

### Code Quality Standards

**All bash code must:**
- Use proper error handling: `|| { echo "ERROR: message"; exit 1; }`
- Work in worktrees: `(cd ./trees/PROJ-123 && command)`
- Verify exit codes: `command && echo "Success" || echo "Failed"`
- Include validation checks before destructive operations
- Use descriptive variable names: `WORKTREE_PATH` not `WP`
- Include comments for complex logic
- Support multiple project types where applicable

**Pattern for project type detection:**
```bash
if [ -f "package.json" ]; then
    # Node.js specific
elif [ -f "requirements.txt" ] || [ -f "pyproject.toml" ]; then
    # Python specific
elif [ -f "Gemfile" ]; then
    # Ruby specific
# ... etc
fi
```

### Multi-Project Support

Each skill should support at minimum:
- Node.js (package.json, npm/yarn/pnpm)
- Python (requirements.txt, pyproject.toml, pip/poetry)
- Ruby (Gemfile, bundle)
- PHP (composer.json, composer)
- Go (go.mod, go)
- Rust (Cargo.toml, cargo) - where applicable

### Error Handling

**Required error checks:**
- File/directory existence before operations
- Command availability: `command -v npm &> /dev/null || echo "npm not found"`
- Exit code validation after critical commands
- User-friendly error messages with suggestions
- Graceful degradation when optional tools missing

### Documentation Standards

**Each skill must include:**
1. Clear activation triggers
2. Step-by-step implementation examples
3. Error handling examples
4. Troubleshooting section (3+ common issues)
5. Validation checklist
6. Integration with SPICE workflow
7. References to relevant SPICE docs

---

## Quality Checklist

Before considering the skills complete, verify:

- [ ] All 10 skills created in `~/.claude/skills/spice/` directory
- [ ] YAML frontmatter correct for each skill (name, description required; allowed-tools optional)
- [ ] Each skill has clear activation triggers
- [ ] Bash code follows error handling patterns
- [ ] Multi-project support implemented (Node, Python, Ruby, PHP, Go, Rust)
- [ ] Worktree support: uses `(cd ./trees/PROJ-123 && command)` pattern
- [ ] Each skill has troubleshooting section with 3+ issues
- [ ] Validation checklists included
- [ ] Integration with SPICE workflow explained
- [ ] References to SPICE docs included where relevant
- [ ] No overlap with existing agents
- [ ] Similar quality/length to existing skills (10-15KB per skill)

---

## Output Format

Create all 10 skills in separate files:
1. `~/.claude/skills/spice/LINT_AUTO.md`
2. `~/.claude/skills/spice/CODE_FORMATTER.md`
3. `~/.claude/skills/spice/DEPENDENCY_UPDATE.md`
4. `~/.claude/skills/spice/LOCKFILE_SYNC.md`
5. `~/.claude/skills/spice/ENV_VALIDATOR.md`
6. `~/.claude/skills/spice/GITIGNORE_GENERATOR.md`
7. `~/.claude/skills/spice/GITHOOKS_SETUP.md`
8. `~/.claude/skills/spice/EDITORCONFIG_GENERATOR.md`
9. `~/.claude/skills/spice/PORT_CONFLICT_RESOLVER.md`
10. `~/.claude/skills/spice/COMMIT_SEARCH.md`

Each file should be 10-15KB, matching the quality and detail of existing skills.

---

## Example Command to Execute

When ready to create these skills:

```
Create all 10 SPICE development skills as specified in PROMPT.md. Follow the structure and quality standards of existing skills (GIT_COMMIT.md, WORKTREE_SETUP.md, WORKTREE_CLEANUP.md). Include comprehensive examples, error handling, multi-project support, and troubleshooting sections for each skill.
```
