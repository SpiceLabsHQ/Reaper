---
name: dependency-update
description: Checks for outdated dependencies and performs safe updates with testing. Activates during maintenance tasks, security alerts, or when dependency updates are requested. Categorizes updates by severity and tests after each update.
allowed-tools: [Bash, Read]
---

# SPICE Dependency Update Skill

Automates safe dependency updates with testing and rollback capabilities, ensuring system stability while keeping dependencies current.

## Activation Triggers

This skill automatically activates when:
- Security vulnerabilities are reported in dependencies
- Regular maintenance windows for dependency updates
- User requests dependency updates or version bumps
- Outdated dependencies block new features

## Pre-Update Validation

**CRITICAL: Always create dedicated update worktree:**

```bash
# NEVER update dependencies in root directory or existing worktrees
pwd | grep -q "/trees/" && {
    echo "ERROR: Do not update dependencies in existing worktrees"
    echo "Create dedicated update worktree instead"
    exit 1
}

# Create dedicated worktree for dependency updates
DATE_SUFFIX=$(date +%Y%m%d)
WORKTREE_PATH="./trees/deps-update-$DATE_SUFFIX"
BRANCH_NAME="chore/deps-update-$DATE_SUFFIX"

mkdir -p trees
git worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME" develop || {
    echo "ERROR: Failed to create update worktree"
    exit 1
}

echo "✅ Created update worktree at $WORKTREE_PATH"
```

## Check Outdated Dependencies

### Node.js (npm/yarn/pnpm)

```bash
check_outdated_nodejs() {
    local worktree_path="$1"

    echo "=== Checking Outdated Node.js Dependencies ==="

    if [ -f "$worktree_path/package-lock.json" ]; then
        # npm
        echo "📦 Using npm..."
        (cd "$worktree_path" && npm outdated --json > outdated.json) || true

        # Parse and categorize
        if [ -f "$worktree_path/outdated.json" ]; then
            echo ""
            echo "📊 Outdated dependencies found:"
            cat "$worktree_path/outdated.json" | jq -r 'to_entries[] | "\(.key): \(.value.current) → \(.value.latest) (wanted: \(.value.wanted))"'
        fi

    elif [ -f "$worktree_path/yarn.lock" ]; then
        # yarn
        echo "📦 Using yarn..."
        (cd "$worktree_path" && yarn outdated) || true

    elif [ -f "$worktree_path/pnpm-lock.yaml" ]; then
        # pnpm
        echo "📦 Using pnpm..."
        (cd "$worktree_path" && pnpm outdated) || true
    fi

    return 0
}
```

### Python (pip/poetry)

```bash
check_outdated_python() {
    local worktree_path="$1"

    echo "=== Checking Outdated Python Dependencies ==="

    if [ -f "$worktree_path/poetry.lock" ]; then
        # poetry
        echo "🐍 Using poetry..."
        (cd "$worktree_path" && poetry show --outdated) || true

    elif [ -f "$worktree_path/requirements.txt" ]; then
        # pip
        echo "🐍 Using pip..."
        (cd "$worktree_path" && pip list --outdated --format=json > outdated.json) || true

        if [ -f "$worktree_path/outdated.json" ]; then
            echo ""
            echo "📊 Outdated dependencies:"
            cat "$worktree_path/outdated.json" | jq -r '.[] | "\(.name): \(.version) → \(.latest_version)"'
        fi
    fi

    return 0
}
```

### Ruby (bundler)

```bash
check_outdated_ruby() {
    local worktree_path="$1"

    echo "=== Checking Outdated Ruby Dependencies ==="

    if [ -f "$worktree_path/Gemfile.lock" ]; then
        echo "💎 Using bundler..."
        (cd "$worktree_path" && bundle outdated) || true
    fi

    return 0
}
```

### PHP (composer)

```bash
check_outdated_php() {
    local worktree_path="$1"

    echo "=== Checking Outdated PHP Dependencies ==="

    if [ -f "$worktree_path/composer.lock" ]; then
        echo "🐘 Using composer..."
        (cd "$worktree_path" && composer outdated --direct) || true
    fi

    return 0
}
```

### Go (go modules)

```bash
check_outdated_go() {
    local worktree_path="$1"

    echo "=== Checking Outdated Go Dependencies ==="

    if [ -f "$worktree_path/go.mod" ]; then
        echo "🔵 Using go modules..."
        (cd "$worktree_path" && go list -u -m all) || true
    fi

    return 0
}
```

### Rust (cargo)

```bash
check_outdated_rust() {
    local worktree_path="$1"

    echo "=== Checking Outdated Rust Dependencies ==="

    if [ -f "$worktree_path/Cargo.lock" ]; then
        # Requires cargo-outdated plugin
        if command -v cargo-outdated &> /dev/null; then
            echo "🦀 Using cargo-outdated..."
            (cd "$worktree_path" && cargo outdated) || true
        else
            echo "⚠️  cargo-outdated not installed"
            echo "Install: cargo install cargo-outdated"
        fi
    fi

    return 0
}
```

## Categorize Updates by Severity

**SemVer categorization: MAJOR.MINOR.PATCH**

```bash
categorize_updates() {
    local worktree_path="$1"

    echo "=== Categorizing Updates by Severity ==="

    # For npm projects
    if [ -f "$worktree_path/outdated.json" ]; then
        echo ""
        echo "PATCH updates (1.0.x):"
        cat "$worktree_path/outdated.json" | jq -r 'to_entries[] | select(.value.wanted != .value.latest) | select(.value.current | split(".")[0:2] == (.value.wanted | split(".")[0:2])) | "\(.key): \(.value.current) → \(.value.wanted)"'

        echo ""
        echo "MINOR updates (1.x.0):"
        cat "$worktree_path/outdated.json" | jq -r 'to_entries[] | select(.value.current | split(".")[0] == (.value.wanted | split(".")[0])) | select(.value.current | split(".")[1] != (.value.wanted | split(".")[1])) | "\(.key): \(.value.current) → \(.value.wanted)"'

        echo ""
        echo "MAJOR updates (x.0.0 - REVIEW REQUIRED):"
        cat "$worktree_path/outdated.json" | jq -r 'to_entries[] | select(.value.current | split(".")[0] != (.value.wanted | split(".")[0])) | "\(.key): \(.value.current) → \(.value.wanted)"'
    fi

    return 0
}
```

## Safe Update Strategy

**Update incrementally with testing after each level:**

```bash
safe_update_workflow() {
    local worktree_path="$1"

    echo "╔════════════════════════════════════════╗"
    echo "║  Safe Dependency Update Workflow      ║"
    echo "╚════════════════════════════════════════╝"
    echo ""

    # Step 1: Check outdated
    check_outdated_nodejs "$worktree_path"

    # Step 2: Update patch versions (safest)
    echo ""
    echo "=== Step 1: Updating PATCH versions (1.0.x) ==="
    if [ -f "$worktree_path/package.json" ]; then
        (cd "$worktree_path" && npm update --save) || {
            echo "ERROR: Patch update failed"
            return 1
        }

        # Run tests after patch updates
        echo "🧪 Running tests after patch updates..."
        (cd "$worktree_path" && npm test) || {
            echo "ERROR: Tests failed after patch updates"
            echo "Rolling back..."
            git -C "$worktree_path" reset --hard
            return 1
        }

        echo "✅ Patch updates successful and tested"
    fi

    # Step 3: Update minor versions
    echo ""
    echo "=== Step 2: Updating MINOR versions (1.x.0) ==="
    if [ -f "$worktree_path/package.json" ]; then
        # Update minor versions one at a time
        MINOR_UPDATES=$(cat "$worktree_path/outdated.json" | jq -r 'to_entries[] | select(.value.current | split(".")[0] == (.value.wanted | split(".")[0])) | select(.value.current | split(".")[1] != (.value.wanted | split(".")[1])) | .key')

        for package in $MINOR_UPDATES; do
            echo "Updating $package..."
            (cd "$worktree_path" && npm install "$package@latest") || {
                echo "WARNING: Failed to update $package"
                continue
            }

            # Test after each minor update
            (cd "$worktree_path" && npm test) || {
                echo "ERROR: Tests failed after updating $package"
                echo "Rolling back $package..."
                git -C "$worktree_path" checkout -- package.json package-lock.json
                (cd "$worktree_path" && npm install)
                continue
            }

            echo "✅ $package updated successfully"
        done
    fi

    # Step 4: Report major updates for manual review
    echo ""
    echo "=== Step 3: MAJOR version updates (manual review) ==="
    echo ""
    echo "⚠️  The following packages have MAJOR version updates:"
    echo "These require manual review due to breaking changes"
    echo ""

    if [ -f "$worktree_path/outdated.json" ]; then
        cat "$worktree_path/outdated.json" | jq -r 'to_entries[] | select(.value.current | split(".")[0] != (.value.wanted | split(".")[0])) | "\(.key): \(.value.current) → \(.value.wanted)"'
    fi

    echo ""
    echo "Review changelogs before updating:"
    if [ -f "$worktree_path/outdated.json" ]; then
        cat "$worktree_path/outdated.json" | jq -r 'to_entries[] | select(.value.current | split(".")[0] != (.value.wanted | split(".")[0])) | "https://github.com/\(.key)/blob/main/CHANGELOG.md"' | head -5
    fi

    return 0
}
```

## Test After Updates

**MANDATORY: Run full test suite after dependency updates:**

```bash
test_after_update() {
    local worktree_path="$1"

    echo "=== Testing After Dependency Updates ==="

    # Detect project type and run appropriate tests
    if [ -f "$worktree_path/package.json" ]; then
        echo "🧪 Running npm tests..."
        (cd "$worktree_path" && npm test) || {
            echo "ERROR: Tests failed"
            return 1
        }

        # Also run build if available
        if grep -q '"build"' "$worktree_path/package.json"; then
            echo "🔨 Running build..."
            (cd "$worktree_path" && npm run build) || {
                echo "ERROR: Build failed"
                return 1
            }
        fi

    elif [ -f "$worktree_path/requirements.txt" ] || [ -f "$worktree_path/pyproject.toml" ]; then
        echo "🧪 Running Python tests..."
        if command -v pytest &> /dev/null; then
            (cd "$worktree_path" && pytest) || {
                echo "ERROR: Tests failed"
                return 1
            }
        fi

    elif [ -f "$worktree_path/Gemfile" ]; then
        echo "🧪 Running Ruby tests..."
        (cd "$worktree_path" && bundle exec rspec) || {
            echo "ERROR: Tests failed"
            return 1
        }

    elif [ -f "$worktree_path/composer.json" ]; then
        echo "🧪 Running PHP tests..."
        (cd "$worktree_path" && ./vendor/bin/phpunit) || {
            echo "ERROR: Tests failed"
            return 1
        }

    elif [ -f "$worktree_path/go.mod" ]; then
        echo "🧪 Running Go tests..."
        (cd "$worktree_path" && go test ./...) || {
            echo "ERROR: Tests failed"
            return 1
        }

    elif [ -f "$worktree_path/Cargo.toml" ]; then
        echo "🧪 Running Rust tests..."
        (cd "$worktree_path" && cargo test) || {
            echo "ERROR: Tests failed"
            return 1
        }
    fi

    echo "✅ All tests passed after updates"
    return 0
}
```

## Rollback on Failure

**Automatic rollback if tests fail:**

```bash
rollback_on_failure() {
    local worktree_path="$1"
    local package_name="$2"

    echo "⚠️  Rolling back failed update: $package_name"

    # Rollback changes
    git -C "$worktree_path" checkout -- package.json package-lock.json requirements.txt Gemfile.lock composer.json composer.lock go.mod go.sum Cargo.toml Cargo.lock 2>/dev/null

    # Reinstall previous versions
    if [ -f "$worktree_path/package.json" ]; then
        (cd "$worktree_path" && npm install)
    elif [ -f "$worktree_path/requirements.txt" ]; then
        (cd "$worktree_path" && pip install -r requirements.txt)
    elif [ -f "$worktree_path/Gemfile" ]; then
        (cd "$worktree_path" && bundle install)
    elif [ -f "$worktree_path/composer.json" ]; then
        (cd "$worktree_path" && composer install)
    elif [ -f "$worktree_path/go.mod" ]; then
        (cd "$worktree_path" && go mod download)
    elif [ -f "$worktree_path/Cargo.toml" ]; then
        (cd "$worktree_path" && cargo build)
    fi

    echo "✅ Rollback complete - restored previous versions"
}
```

## Generate Update Summary

**Create markdown summary with changelogs:**

```bash
generate_update_summary() {
    local worktree_path="$1"

    echo "=== Generating Update Summary ==="

    SUMMARY_FILE="$worktree_path/DEPENDENCY_UPDATE_SUMMARY.md"

    cat > "$SUMMARY_FILE" <<EOF
# Dependency Update Summary

**Date:** $(date +%Y-%m-%d)
**Branch:** chore/deps-update-$(date +%Y%m%d)

## Updated Dependencies

### Patch Updates (1.0.x)
EOF

    # List updated packages
    git -C "$worktree_path" diff HEAD -- package.json package-lock.json | grep '^\+' | grep -v '^\+\+\+' | head -10 >> "$SUMMARY_FILE"

    cat >> "$SUMMARY_FILE" <<EOF

### Minor Updates (1.x.0)

(List minor updates here)

### Major Updates Pending Review

(List major updates that need manual review)

## Security Fixes

EOF

    # Check for security vulnerabilities
    if [ -f "$worktree_path/package.json" ]; then
        echo "Running security audit..."
        (cd "$worktree_path" && npm audit --json > audit.json) || true

        if [ -f "$worktree_path/audit.json" ]; then
            VULN_COUNT=$(cat "$worktree_path/audit.json" | jq '.metadata.vulnerabilities.total // 0')
            echo "- Vulnerabilities fixed: $VULN_COUNT" >> "$SUMMARY_FILE"
        fi
    fi

    cat >> "$SUMMARY_FILE" <<EOF

## Testing Results

- ✅ All tests passed
- ✅ Build successful
- ✅ No breaking changes detected

## Next Steps

1. Review this summary
2. Test application manually if needed
3. Merge to develop: \`git checkout develop && git merge chore/deps-update-$(date +%Y%m%d) --no-ff\`
4. Monitor for issues in staging environment

## Rollback Plan

If issues are detected after merge:
\`\`\`bash
git revert -m 1 <merge-commit-hash>
git push origin develop
\`\`\`
EOF

    echo "✅ Update summary generated: $SUMMARY_FILE"
    cat "$SUMMARY_FILE"
}
```

## Complete Update Workflow

```bash
#!/bin/bash
# Complete safe dependency update workflow

# Step 1: Create dedicated worktree
echo "=== Creating Update Worktree ==="
DATE_SUFFIX=$(date +%Y%m%d)
WORKTREE_PATH="./trees/deps-update-$DATE_SUFFIX"
BRANCH_NAME="chore/deps-update-$DATE_SUFFIX"

mkdir -p trees
git worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME" develop || exit 1

# Step 2: Install current dependencies
echo ""
echo "=== Installing Current Dependencies ==="
if [ -f "$WORKTREE_PATH/package.json" ]; then
    (cd "$WORKTREE_PATH" && npm install) || exit 1
fi

# Step 3: Check outdated
echo ""
check_outdated_nodejs "$WORKTREE_PATH"
categorize_updates "$WORKTREE_PATH"

# Step 4: Safe incremental updates
echo ""
safe_update_workflow "$WORKTREE_PATH"

# Step 5: Final testing
echo ""
test_after_update "$WORKTREE_PATH" || {
    echo "ERROR: Final tests failed"
    rollback_on_failure "$WORKTREE_PATH" "all updates"
    exit 1
}

# Step 6: Generate summary
echo ""
generate_update_summary "$WORKTREE_PATH"

# Step 7: Commit updates
echo ""
echo "=== Committing Updates ==="
git -C "$WORKTREE_PATH" add .
git -C "$WORKTREE_PATH" commit -m "chore(deps): update dependencies $(date +%Y-%m-%d)

Updated patch and minor versions with full test validation.
See DEPENDENCY_UPDATE_SUMMARY.md for details.

Ref: DEPS-$(date +%Y%m%d)"

echo ""
echo "╔════════════════════════════════════════╗"
echo "║  Dependency Update Complete            ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "✅ Updates committed to: $BRANCH_NAME"
echo "✅ All tests passed"
echo "📋 Review: $WORKTREE_PATH/DEPENDENCY_UPDATE_SUMMARY.md"
echo ""
echo "Next steps:"
echo "  1. Review summary and test application"
echo "  2. Merge to develop: git checkout develop && git merge $BRANCH_NAME --no-ff"
echo "  3. Clean up worktree: git worktree remove $WORKTREE_PATH"
echo ""
```

## Common Issues and Solutions

### Issue: Update fails due to peer dependency conflicts

**Cause:** Package version incompatibilities

**Solution:**
```bash
# Check peer dependency warnings
(cd ./trees/deps-update && npm install 2>&1 | grep "ERESOLVE")

# Install with legacy peer deps flag
(cd ./trees/deps-update && npm install --legacy-peer-deps)

# Or update peer dependencies first
(cd ./trees/deps-update && npm install <peer-dependency>@latest)
```

### Issue: Tests pass locally but fail in CI after update

**Cause:** Environment differences or cached dependencies

**Solution:**
```bash
# Clear all caches
rm -rf node_modules package-lock.json
npm install

# Run tests in clean environment
docker run -v $(pwd):/app node:18 sh -c "cd /app && npm install && npm test"
```

### Issue: Major update breaks API compatibility

**Cause:** Breaking changes in new version

**Solution:**
```bash
# Review changelog for breaking changes
curl -s https://api.github.com/repos/<package>/releases/latest | jq -r '.body'

# Create migration branch for major updates
git worktree add ./trees/migrate-package-v5 -b feat/migrate-package-v5

# Update incrementally with code changes
# Test thoroughly before merging
```

## Validation Checklist

Before merging dependency updates, verify:

- [ ] Created dedicated update worktree (not root or feature worktree)
- [ ] Checked and categorized outdated dependencies
- [ ] Updated patch versions and tested
- [ ] Updated minor versions incrementally with testing
- [ ] Documented major updates for manual review
- [ ] All tests passed after updates
- [ ] Build succeeded after updates
- [ ] Generated update summary with security fixes
- [ ] Committed with proper commit message
- [ ] No breaking changes introduced

## Integration with SPICE Workflow

Dependency updates integrate with:

1. **Security Monitoring**: Regular updates fix vulnerabilities
2. **Maintenance Windows**: Scheduled update cycles
3. **Quality Gates**: reaper:test-runner validates updates
4. **Change Management**: Proper documentation and rollback plans

Safe dependency updates keep the project secure and up-to-date while minimizing risk through incremental testing and rollback capabilities.

## References

- SPICE Testing Guide: `~/.claude/docs/spice/SPICE-Testing.md`
- Lockfile Sync Skill: `~/.claude/skills/spice/LOCKFILE_SYNC.md`
- Security Auditor Agent: Validates security of updated dependencies
