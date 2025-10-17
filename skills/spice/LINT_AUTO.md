---
name: lint-auto
description: Automatically detects project type and runs appropriate linting with auto-fix. Activates before commits, on lint failures, or when code formatting is needed. Supports Node.js, Python, Ruby, PHP, Go, and Rust projects.
allowed-tools: [Bash, Read]
---

# SPICE Auto-Lint Skill

Automates linting error detection and auto-fixing across multiple project types, ensuring code passes quality gates before commits.

## Activation Triggers

This skill automatically activates when:
- Pre-commit hooks fail due to linting errors
- Code formatting or linting is requested
- Before creating commits to prevent hook failures
- When linting errors block quality gates

## Auto-Detection and Execution Protocol

**ALWAYS run in worktree context - NEVER in root directory:**

```bash
# CRITICAL: Verify working in worktree
pwd | grep -q "/trees/" || {
    echo "ERROR: Must run linting in worktree, not root directory"
    echo "Usage: (cd ./trees/PROJ-123 && lint command)"
    exit 1
}
```

### Project Type Detection Pattern

```bash
WORKTREE_PATH="./trees/PROJ-123-description"

# Function to detect project type and run appropriate linter
detect_and_lint() {
    local worktree_path="$1"

    echo "🔍 Detecting project type and linting configuration..."

    # Node.js / JavaScript / TypeScript
    if [ -f "$worktree_path/package.json" ]; then
        echo "📦 Node.js project detected"
        lint_nodejs "$worktree_path"
        return $?

    # Python
    elif [ -f "$worktree_path/requirements.txt" ] || [ -f "$worktree_path/pyproject.toml" ]; then
        echo "🐍 Python project detected"
        lint_python "$worktree_path"
        return $?

    # Ruby
    elif [ -f "$worktree_path/Gemfile" ]; then
        echo "💎 Ruby project detected"
        lint_ruby "$worktree_path"
        return $?

    # PHP
    elif [ -f "$worktree_path/composer.json" ]; then
        echo "🐘 PHP project detected"
        lint_php "$worktree_path"
        return $?

    # Go
    elif [ -f "$worktree_path/go.mod" ]; then
        echo "🔵 Go project detected"
        lint_go "$worktree_path"
        return $?

    # Rust
    elif [ -f "$worktree_path/Cargo.toml" ]; then
        echo "🦀 Rust project detected"
        lint_rust "$worktree_path"
        return $?

    else
        echo "⚠️  No recognized project type found"
        echo "Checked for: package.json, requirements.txt, pyproject.toml, Gemfile, composer.json, go.mod, Cargo.toml"
        return 1
    fi
}
```

## Language-Specific Linting

### Node.js Linting

```bash
lint_nodejs() {
    local worktree_path="$1"

    echo "=== Node.js Linting ==="

    # Check for lint scripts in package.json
    if grep -q '"lint:fix"' "$worktree_path/package.json"; then
        echo "Running: npm run lint:fix"
        (cd "$worktree_path" && npm run lint:fix) || {
            echo "ERROR: npm run lint:fix failed"
            return 1
        }
    elif grep -q '"lint"' "$worktree_path/package.json"; then
        echo "Running: npm run lint"
        (cd "$worktree_path" && npm run lint) || {
            echo "ERROR: npm run lint failed (no auto-fix available)"
            echo "Suggestion: Add 'lint:fix' script to package.json"
            return 1
        }
    elif [ -f "$worktree_path/.eslintrc.js" ] || [ -f "$worktree_path/.eslintrc.json" ]; then
        # ESLint config exists but no npm script
        echo "Running: npx eslint . --fix"
        (cd "$worktree_path" && npx eslint . --fix) || {
            echo "ERROR: eslint --fix failed"
            return 1
        }
    else
        echo "⚠️  No linting configuration found"
        echo "Suggestion: Initialize ESLint with: npx eslint --init"
        return 1
    fi

    echo "✅ Node.js linting completed"
    return 0
}
```

### Python Linting

```bash
lint_python() {
    local worktree_path="$1"

    echo "=== Python Linting ==="

    # Check for Ruff (modern fast linter)
    if [ -f "$worktree_path/pyproject.toml" ] && grep -q "ruff" "$worktree_path/pyproject.toml"; then
        echo "Running: ruff format + ruff check --fix"
        (cd "$worktree_path" && ruff format . && ruff check --fix .) || {
            echo "ERROR: Ruff linting failed"
            return 1
        }
        echo "✅ Ruff formatting and linting completed"
        return 0
    fi

    # Fallback to traditional Black + isort + flake8
    local has_errors=0

    # Black for formatting
    if command -v black &> /dev/null; then
        echo "Running: black ."
        (cd "$worktree_path" && black .) || {
            echo "ERROR: black formatting failed"
            has_errors=1
        }
    else
        echo "⚠️  black not installed (pip install black)"
    fi

    # isort for import sorting
    if command -v isort &> /dev/null; then
        echo "Running: isort ."
        (cd "$worktree_path" && isort .) || {
            echo "ERROR: isort failed"
            has_errors=1
        }
    else
        echo "⚠️  isort not installed (pip install isort)"
    fi

    # flake8 for style checking (no auto-fix)
    if command -v flake8 &> /dev/null; then
        echo "Running: flake8 ."
        (cd "$worktree_path" && flake8 .) || {
            echo "ERROR: flake8 found style violations"
            echo "Manual fixes may be required"
            has_errors=1
        }
    else
        echo "⚠️  flake8 not installed (pip install flake8)"
    fi

    if [ $has_errors -eq 1 ]; then
        return 1
    fi

    echo "✅ Python linting completed"
    return 0
}
```

### Ruby Linting

```bash
lint_ruby() {
    local worktree_path="$1"

    echo "=== Ruby Linting ==="

    # Check for RuboCop configuration
    if [ -f "$worktree_path/.rubocop.yml" ]; then
        # Try bundler first
        if [ -f "$worktree_path/Gemfile" ] && grep -q "rubocop" "$worktree_path/Gemfile"; then
            echo "Running: bundle exec rubocop -a"
            (cd "$worktree_path" && bundle exec rubocop -a) || {
                echo "ERROR: RuboCop auto-fix failed"
                return 1
            }
        else
            echo "Running: rubocop -a"
            (cd "$worktree_path" && rubocop -a) || {
                echo "ERROR: RuboCop auto-fix failed"
                return 1
            }
        fi
    else
        echo "⚠️  No .rubocop.yml configuration found"
        echo "Suggestion: Initialize RuboCop with: rubocop --init"
        return 1
    fi

    echo "✅ Ruby linting completed"
    return 0
}
```

### PHP Linting

```bash
lint_php() {
    local worktree_path="$1"

    echo "=== PHP Linting ==="

    # Check for PHP-CS-Fixer
    if [ -f "$worktree_path/.php-cs-fixer.php" ] || [ -f "$worktree_path/.php-cs-fixer.dist.php" ]; then
        echo "Running: ./vendor/bin/php-cs-fixer fix ."
        (cd "$worktree_path" && ./vendor/bin/php-cs-fixer fix .) || {
            echo "ERROR: PHP-CS-Fixer failed"
            return 1
        }
    elif [ -f "$worktree_path/vendor/bin/php-cs-fixer" ]; then
        echo "Running: ./vendor/bin/php-cs-fixer fix . (no config file)"
        (cd "$worktree_path" && ./vendor/bin/php-cs-fixer fix .) || {
            echo "ERROR: PHP-CS-Fixer failed"
            return 1
        }
    else
        echo "⚠️  PHP-CS-Fixer not found"
        echo "Suggestion: composer require --dev friendsofphp/php-cs-fixer"
        return 1
    fi

    echo "✅ PHP linting completed"
    return 0
}
```

### Go Linting

```bash
lint_go() {
    local worktree_path="$1"

    echo "=== Go Linting ==="

    local has_errors=0

    # gofmt for formatting
    echo "Running: gofmt -w ."
    (cd "$worktree_path" && gofmt -w .) || {
        echo "ERROR: gofmt failed"
        has_errors=1
    }

    # golangci-lint for comprehensive checking
    if command -v golangci-lint &> /dev/null; then
        echo "Running: golangci-lint run --fix"
        (cd "$worktree_path" && golangci-lint run --fix) || {
            echo "ERROR: golangci-lint found issues"
            has_errors=1
        }
    else
        echo "⚠️  golangci-lint not installed (recommended)"
        echo "Install: https://golangci-lint.run/usage/install/"
    fi

    if [ $has_errors -eq 1 ]; then
        return 1
    fi

    echo "✅ Go linting completed"
    return 0
}
```

### Rust Linting

```bash
lint_rust() {
    local worktree_path="$1"

    echo "=== Rust Linting ==="

    local has_errors=0

    # rustfmt for formatting
    echo "Running: cargo fmt"
    (cd "$worktree_path" && cargo fmt) || {
        echo "ERROR: cargo fmt failed"
        has_errors=1
    }

    # clippy for linting with auto-fix
    echo "Running: cargo clippy --fix --allow-dirty"
    (cd "$worktree_path" && cargo clippy --fix --allow-dirty) || {
        echo "ERROR: cargo clippy found issues"
        has_errors=1
    }

    if [ $has_errors -eq 1 ]; then
        return 1
    fi

    echo "✅ Rust linting completed"
    return 0
}
```

## Before/After Reporting

**ALWAYS show impact of linting:**

```bash
WORKTREE_PATH="./trees/PROJ-123-description"

# Count errors before linting
echo "=== Linting Impact Report ==="

# Get baseline (this varies by linter)
# Example for ESLint:
if [ -f "$WORKTREE_PATH/.eslintrc.js" ]; then
    BEFORE_COUNT=$((cd "$WORKTREE_PATH" && npx eslint . --format json 2>/dev/null | jq '[.[] | .errorCount] | add // 0') 2>/dev/null || echo "unknown")
    echo "📊 Errors before auto-fix: $BEFORE_COUNT"
fi

# Run auto-fix
detect_and_lint "$WORKTREE_PATH"
LINT_EXIT_CODE=$?

# Count errors after linting
if [ -f "$WORKTREE_PATH/.eslintrc.js" ]; then
    AFTER_COUNT=$((cd "$WORKTREE_PATH" && npx eslint . --format json 2>/dev/null | jq '[.[] | .errorCount] | add // 0') 2>/dev/null || echo "unknown")
    echo "📊 Errors after auto-fix: $AFTER_COUNT"

    if [ "$BEFORE_COUNT" != "unknown" ] && [ "$AFTER_COUNT" != "unknown" ]; then
        FIXED=$((BEFORE_COUNT - AFTER_COUNT))
        echo "✅ Auto-fixed: $FIXED errors"
    fi
fi

# List modified files
echo ""
echo "📝 Files modified by linter:"
git -C "$WORKTREE_PATH" status --short | grep '^ M' || echo "No files modified"

# Return original exit code
exit $LINT_EXIT_CODE
```

## Integration with Pre-Commit Hooks

**Prevent --no-verify flag usage:**

```bash
# ❌ FORBIDDEN: Bypassing linting
# git commit --no-verify
# git commit -n
# HUSKY=0 git commit

# ✅ CORRECT: Fix linting errors before commit
detect_and_lint "./trees/PROJ-123-description"

if [ $? -eq 0 ]; then
    echo "✅ Linting passed - safe to commit"
    git -C "./trees/PROJ-123-description" commit -m "feat(scope): description"
else
    echo "ERROR: Fix linting errors before committing"
    echo "Do NOT use --no-verify to bypass linting"
    exit 1
fi
```

## Complete Lint Workflow

```bash
#!/bin/bash
# Complete auto-lint workflow with reporting

WORKTREE_PATH="$1"

if [ -z "$WORKTREE_PATH" ]; then
    echo "Usage: $0 ./trees/PROJ-123-description"
    exit 1
fi

# Verify worktree exists
if [ ! -d "$WORKTREE_PATH" ]; then
    echo "ERROR: Worktree not found at $WORKTREE_PATH"
    exit 1
fi

echo "╔════════════════════════════════════════╗"
echo "║  SPICE Auto-Lint                       ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Detect and lint
detect_and_lint "$WORKTREE_PATH"
LINT_EXIT_CODE=$?

echo ""
echo "=== Summary ==="
if [ $LINT_EXIT_CODE -eq 0 ]; then
    echo "✅ All linting checks passed"
    echo "✅ Safe to commit"
else
    echo "❌ Linting failed"
    echo "❌ Fix errors before committing"
    echo ""
    echo "Common fixes:"
    echo "  - Review linter output above"
    echo "  - Some errors may require manual fixes"
    echo "  - Re-run linter after manual fixes"
fi

echo ""
echo "Modified files:"
git -C "$WORKTREE_PATH" status --short | grep '^ M' || echo "No files modified"

exit $LINT_EXIT_CODE
```

## Common Issues and Solutions

### Issue: "npm run lint:fix" fails with missing dependencies

**Cause:** Linting dependencies not installed in worktree

**Solution:**
```bash
# Reinstall dependencies
(cd ./trees/PROJ-123-description && npm install)

# Verify eslint is installed
(cd ./trees/PROJ-123-description && npx eslint --version)

# Retry linting
(cd ./trees/PROJ-123-description && npm run lint:fix)
```

### Issue: Python linting fails with "command not found"

**Cause:** Linting tools not installed in Python environment

**Solution:**
```bash
# Install common Python linters
pip install black isort flake8

# Or use Ruff (modern alternative)
pip install ruff

# Retry linting
(cd ./trees/PROJ-123-description && black . && isort . && flake8 .)
```

### Issue: Linter finds errors but auto-fix doesn't resolve them

**Cause:** Some linting rules require manual fixes

**Solution:**
```bash
# Review the specific errors
(cd ./trees/PROJ-123-description && npm run lint)

# Common manual fixes:
# - Unused variables (remove them)
# - Missing types (add type annotations)
# - Complex logic (refactor for clarity)

# After manual fixes, verify
(cd ./trees/PROJ-123-description && npm run lint:fix)
```

### Issue: Linter modifies too many files

**Cause:** First-time linting on legacy codebase

**Solution:**
```bash
# Stage only your changes first
git -C ./trees/PROJ-123-description add <your-files>

# Run linter on staged files only
(cd ./trees/PROJ-123-description && npx lint-staged)

# Or lint specific files
(cd ./trees/PROJ-123-description && npx eslint src/your-file.js --fix)
```

## Validation Checklist

Before considering linting complete, verify:

- [ ] Running in worktree context (not root directory)
- [ ] Project type correctly detected
- [ ] Appropriate linter executed with auto-fix
- [ ] Linter exit code is 0 (all checks passed)
- [ ] Modified files listed in git status
- [ ] No errors remaining that block commit
- [ ] Did NOT use --no-verify to bypass linting

## Integration with SPICE Workflow

This skill integrates at multiple points in the SPICE workflow:

1. **Before Commit**: Run auto-lint to fix style issues
2. **Pre-Commit Hook**: Automatically triggered by git hooks
3. **Quality Gates**: test-runner agent validates linting passed
4. **Continuous Integration**: CI pipelines verify linting

Auto-linting ensures code quality standards are met before any code enters the develop branch.

## References

- SPICE Linting Standards: `~/.claude/docs/spice/CLAUDE-IMPORT.md#linting-standards`
- Test Runner Agent: Uses this skill for lint validation
- Pre-Commit Hooks: `~/.claude/skills/spice/GITHOOKS_SETUP.md`
