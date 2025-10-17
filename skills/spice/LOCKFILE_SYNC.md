---
name: lockfile-sync
description: Validates that lockfiles are in sync with package definition files and regenerates when needed. Activates after dependency changes, before commits, or when lockfile mismatches are detected. Prevents "works on my machine" issues.
allowed-tools: [Bash, Read]
---

# SPICE Lockfile Sync Skill

Ensures dependency lockfiles remain in sync with package definitions, preventing environment inconsistencies and "works on my machine" issues.

## Activation Triggers

This skill automatically activates when:
- After modifying package definition files (package.json, requirements.txt, etc.)
- Before committing dependency changes
- When CI/CD fails due to lockfile mismatches
- During code review of dependency changes

## Lockfile Validation Protocol

**ALWAYS validate lockfiles before committing dependency changes:**

```bash
WORKTREE_PATH="./trees/PROJ-123-description"

validate_lockfiles() {
    local worktree_path="$1"

    echo "=== Validating Lockfile Sync ==="

    # Detect project type and validate appropriate lockfile
    if [ -f "$worktree_path/package.json" ]; then
        validate_nodejs_lockfile "$worktree_path"
    elif [ -f "$worktree_path/requirements.txt" ] || [ -f "$worktree_path/pyproject.toml" ]; then
        validate_python_lockfile "$worktree_path"
    elif [ -f "$worktree_path/Gemfile" ]; then
        validate_ruby_lockfile "$worktree_path"
    elif [ -f "$worktree_path/composer.json" ]; then
        validate_php_lockfile "$worktree_path"
    elif [ -f "$worktree_path/go.mod" ]; then
        validate_go_lockfile "$worktree_path"
    elif [ -f "$worktree_path/Cargo.toml" ]; then
        validate_rust_lockfile "$worktree_path"
    else
        echo "⚠️  No package definition file found"
        return 1
    fi
}
```

## Language-Specific Validation

### Node.js Lockfile Validation

```bash
validate_nodejs_lockfile() {
    local worktree_path="$1"

    echo "=== Node.js Lockfile Validation ==="

    # Check lockfile exists
    if [ ! -f "$worktree_path/package-lock.json" ] && \
       [ ! -f "$worktree_path/yarn.lock" ] && \
       [ ! -f "$worktree_path/pnpm-lock.yaml" ]; then
        echo "❌ ERROR: No lockfile found!"
        echo "Expected: package-lock.json, yarn.lock, or pnpm-lock.yaml"
        return 1
    fi

    # Verify lockfile is committed
    if git -C "$worktree_path" check-ignore package-lock.json yarn.lock pnpm-lock.yaml 2>/dev/null | grep -q .; then
        echo "❌ ERROR: Lockfile is in .gitignore!"
        echo "Lockfiles must be committed for reproducible builds"
        return 1
    fi

    # Test with lockfile (npm ci uses lockfile only)
    if [ -f "$worktree_path/package-lock.json" ]; then
        echo "🧪 Testing with npm ci (lockfile-only install)..."
        (cd "$worktree_path" && npm ci) || {
            echo "❌ ERROR: npm ci failed - lockfile out of sync"
            echo ""
            echo "Fix with: npm install (regenerates lockfile)"
            return 1
        }
    elif [ -f "$worktree_path/yarn.lock" ]; then
        echo "🧪 Testing with yarn install --frozen-lockfile..."
        (cd "$worktree_path" && yarn install --frozen-lockfile) || {
            echo "❌ ERROR: yarn install failed - lockfile out of sync"
            echo ""
            echo "Fix with: yarn install (regenerates lockfile)"
            return 1
        }
    elif [ -f "$worktree_path/pnpm-lock.yaml" ]; then
        echo "🧪 Testing with pnpm install --frozen-lockfile..."
        (cd "$worktree_path" && pnpm install --frozen-lockfile) || {
            echo "❌ ERROR: pnpm install failed - lockfile out of sync"
            echo ""
            echo "Fix with: pnpm install (regenerates lockfile)"
            return 1
        }
    fi

    echo "✅ Node.js lockfile is in sync"
    return 0
}
```

### Python Lockfile Validation

```bash
validate_python_lockfile() {
    local worktree_path="$1"

    echo "=== Python Lockfile Validation ==="

    # Poetry projects
    if [ -f "$worktree_path/pyproject.toml" ] && [ -f "$worktree_path/poetry.lock" ]; then
        echo "🧪 Validating Poetry lockfile..."
        (cd "$worktree_path" && poetry check) || {
            echo "❌ ERROR: poetry.lock out of sync"
            echo "Fix with: poetry lock --no-update"
            return 1
        }

    # pip with requirements.txt
    elif [ -f "$worktree_path/requirements.txt" ]; then
        if [ -f "$worktree_path/requirements.lock" ]; then
            echo "🧪 Validating requirements.lock..."
            # Compare requirements.txt vs requirements.lock
            diff <(sort "$worktree_path/requirements.txt") \
                 <(sort "$worktree_path/requirements.lock") || {
                echo "⚠️  WARNING: requirements.txt and requirements.lock differ"
                echo "Consider using pip-tools: pip-compile requirements.txt"
            }
        else
            echo "⚠️  No requirements.lock found"
            echo "Consider using pip-tools for lockfile generation"
        fi

    # pipenv
    elif [ -f "$worktree_path/Pipfile" ] && [ -f "$worktree_path/Pipfile.lock" ]; then
        echo "🧪 Validating Pipfile.lock..."
        (cd "$worktree_path" && pipenv verify) || {
            echo "❌ ERROR: Pipfile.lock out of sync"
            echo "Fix with: pipenv lock"
            return 1
        }
    fi

    echo "✅ Python lockfile is in sync"
    return 0
}
```

### Ruby Lockfile Validation

```bash
validate_ruby_lockfile() {
    local worktree_path="$1"

    echo "=== Ruby Lockfile Validation ==="

    if [ ! -f "$worktree_path/Gemfile.lock" ]; then
        echo "❌ ERROR: Gemfile.lock not found"
        echo "Generate with: bundle install"
        return 1
    fi

    # Verify lockfile is committed
    if git -C "$worktree_path" check-ignore Gemfile.lock 2>/dev/null | grep -q .; then
        echo "❌ ERROR: Gemfile.lock is in .gitignore!"
        return 1
    fi

    # Check if Gemfile.lock is in sync
    echo "🧪 Testing with bundle check..."
    (cd "$worktree_path" && bundle check) || {
        echo "❌ ERROR: Gemfile.lock out of sync"
        echo "Fix with: bundle install"
        return 1
    }

    echo "✅ Ruby lockfile is in sync"
    return 0
}
```

### PHP Lockfile Validation

```bash
validate_php_lockfile() {
    local worktree_path="$1"

    echo "=== PHP Lockfile Validation ==="

    if [ ! -f "$worktree_path/composer.lock" ]; then
        echo "❌ ERROR: composer.lock not found"
        echo "Generate with: composer install"
        return 1
    fi

    # Verify lockfile is committed
    if git -C "$worktree_path" check-ignore composer.lock 2>/dev/null | grep -q .; then
        echo "❌ ERROR: composer.lock is in .gitignore!"
        return 1
    fi

    # Validate composer.lock is in sync
    echo "🧪 Testing with composer validate..."
    (cd "$worktree_path" && composer validate --strict) || {
        echo "❌ ERROR: composer.lock out of sync"
        echo "Fix with: composer update --lock"
        return 1
    }

    echo "✅ PHP lockfile is in sync"
    return 0
}
```

### Go Lockfile Validation

```bash
validate_go_lockfile() {
    local worktree_path="$1"

    echo "=== Go Lockfile Validation ==="

    if [ ! -f "$worktree_path/go.sum" ]; then
        echo "❌ ERROR: go.sum not found"
        echo "Generate with: go mod download"
        return 1
    fi

    # Verify go.sum is committed
    if git -C "$worktree_path" check-ignore go.sum 2>/dev/null | grep -q .; then
        echo "❌ ERROR: go.sum is in .gitignore!"
        return 1
    fi

    # Verify go.mod and go.sum are in sync
    echo "🧪 Testing with go mod verify..."
    (cd "$worktree_path" && go mod verify) || {
        echo "❌ ERROR: go.sum out of sync"
        echo "Fix with: go mod tidy"
        return 1
    }

    echo "✅ Go lockfile is in sync"
    return 0
}
```

### Rust Lockfile Validation

```bash
validate_rust_lockfile() {
    local worktree_path="$1"

    echo "=== Rust Lockfile Validation ==="

    if [ ! -f "$worktree_path/Cargo.lock" ]; then
        echo "❌ ERROR: Cargo.lock not found"
        echo "Generate with: cargo build"
        return 1
    fi

    # Verify Cargo.lock is committed (required for binary crates)
    if git -C "$worktree_path" check-ignore Cargo.lock 2>/dev/null | grep -q .; then
        echo "⚠️  WARNING: Cargo.lock in .gitignore"
        echo "Binary crates should commit Cargo.lock"
    fi

    # Check if Cargo.lock is outdated
    echo "🧪 Testing with cargo check..."
    (cd "$worktree_path" && cargo check) || {
        echo "❌ ERROR: Cargo.lock may be out of sync"
        echo "Fix with: cargo update"
        return 1
    }

    echo "✅ Rust lockfile is in sync"
    return 0
}
```

## Regenerate Lockfile When Out of Sync

```bash
regenerate_lockfile() {
    local worktree_path="$1"

    echo "=== Regenerating Lockfile ==="

    # Detect project type and regenerate
    if [ -f "$worktree_path/package.json" ]; then
        if [ -f "$worktree_path/package-lock.json" ]; then
            echo "Regenerating package-lock.json..."
            (cd "$worktree_path" && npm install) || return 1
        elif [ -f "$worktree_path/yarn.lock" ]; then
            echo "Regenerating yarn.lock..."
            (cd "$worktree_path" && yarn install) || return 1
        elif [ -f "$worktree_path/pnpm-lock.yaml" ]; then
            echo "Regenerating pnpm-lock.yaml..."
            (cd "$worktree_path" && pnpm install) || return 1
        fi

    elif [ -f "$worktree_path/pyproject.toml" ]; then
        echo "Regenerating poetry.lock..."
        (cd "$worktree_path" && poetry lock --no-update) || return 1

    elif [ -f "$worktree_path/Gemfile" ]; then
        echo "Regenerating Gemfile.lock..."
        (cd "$worktree_path" && bundle install) || return 1

    elif [ -f "$worktree_path/composer.json" ]; then
        echo "Regenerating composer.lock..."
        (cd "$worktree_path" && composer update --lock) || return 1

    elif [ -f "$worktree_path/go.mod" ]; then
        echo "Regenerating go.sum..."
        (cd "$worktree_path" && go mod tidy) || return 1

    elif [ -f "$worktree_path/Cargo.toml" ]; then
        echo "Regenerating Cargo.lock..."
        (cd "$worktree_path" && cargo update) || return 1
    fi

    echo "✅ Lockfile regenerated"
    return 0
}
```

## Verify No Changes After Regeneration

**Critical: Lockfile should not change if already in sync:**

```bash
verify_no_changes() {
    local worktree_path="$1"

    echo "=== Verifying Lockfile Stability ==="

    # Check if lockfile was modified
    LOCKFILE_CHANGES=$(git -C "$worktree_path" status --porcelain | \
        grep -E "package-lock.json|yarn.lock|pnpm-lock.yaml|poetry.lock|Gemfile.lock|composer.lock|go.sum|Cargo.lock")

    if [ -n "$LOCKFILE_CHANGES" ]; then
        echo "⚠️  WARNING: Lockfile was modified!"
        echo ""
        echo "$LOCKFILE_CHANGES"
        echo ""
        echo "This indicates lockfile was out of sync."
        echo "Stage and commit the updated lockfile."
        return 1
    else
        echo "✅ Lockfile unchanged - already in sync"
        return 0
    fi
}
```

## Complete Lockfile Sync Workflow

```bash
#!/bin/bash
# Complete lockfile sync validation and regeneration

WORKTREE_PATH="$1"

if [ -z "$WORKTREE_PATH" ]; then
    echo "Usage: $0 ./trees/PROJ-123-description"
    exit 1
fi

if [ ! -d "$WORKTREE_PATH" ]; then
    echo "ERROR: Worktree not found at $WORKTREE_PATH"
    exit 1
fi

echo "╔════════════════════════════════════════╗"
echo "║  SPICE Lockfile Sync                   ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Step 1: Validate lockfiles
validate_lockfiles "$WORKTREE_PATH"
VALIDATION_EXIT_CODE=$?

if [ $VALIDATION_EXIT_CODE -ne 0 ]; then
    echo ""
    echo "=== Attempting Automatic Fix ==="

    # Step 2: Regenerate if validation failed
    regenerate_lockfile "$WORKTREE_PATH" || {
        echo "ERROR: Failed to regenerate lockfile"
        exit 1
    }

    # Step 3: Verify regeneration fixed the issue
    validate_lockfiles "$WORKTREE_PATH" || {
        echo "ERROR: Lockfile still out of sync after regeneration"
        exit 1
    }

    # Step 4: Check if changes were made
    verify_no_changes "$WORKTREE_PATH"
fi

echo ""
echo "=== Summary ==="
echo "✅ Lockfile validation passed"
echo "✅ Dependencies are reproducible"
echo "✅ Safe to commit"
echo ""
```

## Common Issues and Solutions

### Issue: "npm ci" fails but "npm install" works

**Cause:** package-lock.json out of sync with package.json

**Solution:**
```bash
# Delete node_modules and lockfile
rm -rf node_modules package-lock.json

# Regenerate lockfile
npm install

# Verify with npm ci
npm ci

# Commit updated lockfile
git add package-lock.json
git commit -m "fix(deps): regenerate package-lock.json"
```

### Issue: Lockfile keeps changing on different machines

**Cause:** Different package manager versions or OS differences

**Solution:**
```bash
# Standardize package manager version
npm install -g npm@9.8.0  # Specify version

# Or use engines field in package.json
cat >> package.json <<EOF
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
EOF

# Use volta or nvm to enforce versions
volta pin node@18 npm@9
```

### Issue: Poetry lockfile fails validation after merge

**Cause:** Merge conflict in poetry.lock

**Solution:**
```bash
# Discard conflicted lockfile
git checkout --theirs poetry.lock

# Regenerate from merged pyproject.toml
poetry lock --no-update

# Verify
poetry check

# Commit resolved lockfile
git add poetry.lock
git commit -m "fix(deps): regenerate poetry.lock after merge"
```

### Issue: go.sum contains extra checksums

**Cause:** go.sum accumulates checksums, not always cleaned

**Solution:**
```bash
# Clean up go.sum
go mod tidy

# Verify
go mod verify

# Commit cleaned go.sum
git add go.sum
git commit -m "chore(deps): clean up go.sum"
```

## Validation Checklist

Before considering lockfile sync complete, verify:

- [ ] Lockfile exists for project type
- [ ] Lockfile is committed (not in .gitignore)
- [ ] Lockfile-only install succeeds (npm ci, yarn --frozen-lockfile, etc.)
- [ ] No changes when regenerating lockfile
- [ ] Lockfile matches package definition file
- [ ] All team members use same package manager version
- [ ] CI/CD uses lockfile-only installation

## Integration with SPICE Workflow

This skill integrates at key points:

1. **After Dependency Changes**: Validate lockfile updated correctly
2. **Pre-Commit**: Ensure lockfile committed with package changes
3. **Code Review**: Verify lockfile changes match package changes
4. **CI/CD**: Use lockfile-only installation for reproducibility

Lockfile synchronization prevents the "works on my machine" problem by ensuring all environments use identical dependency versions.

## References

- SPICE Dependency Update: `~/.claude/skills/spice/DEPENDENCY_UPDATE.md`
- Pre-Commit Hooks: `~/.claude/skills/spice/GITHOOKS_SETUP.md`
- Testing Guide: `~/.claude/docs/spice/SPICE-Testing.md`
