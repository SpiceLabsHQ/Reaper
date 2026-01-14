---
name: code-formatter
description: Automatically formats code using project-configured formatters (Prettier, Black, gofmt, rustfmt). Activates before commits, during bulk formatting, or when formatting is requested. Respects ignore files and configuration.
allowed-tools: [Bash, Read]
---

# SPICE Code Formatter Skill

Automates code formatting to project standards using configured formatters, ensuring consistent style across the codebase.

## Activation Triggers

This skill automatically activates when:
- Code formatting is requested before commits
- Bulk formatting of multiple files is needed
- Formatting inconsistencies are detected
- New files need to match project style

## Formatter Detection Protocol

**ALWAYS detect and respect project formatter configuration:**

```bash
WORKTREE_PATH="./trees/PROJ-123-description"

# Function to detect formatter configuration
detect_formatter() {
    local worktree_path="$1"

    echo "🔍 Detecting formatter configuration..."

    # Prettier (JavaScript/TypeScript/JSON/CSS/Markdown)
    if [ -f "$worktree_path/.prettierrc" ] || \
       [ -f "$worktree_path/.prettierrc.json" ] || \
       [ -f "$worktree_path/.prettierrc.js" ] || \
       [ -f "$worktree_path/prettier.config.js" ] || \
       grep -q '"prettier"' "$worktree_path/package.json" 2>/dev/null; then
        echo "✨ Prettier configuration detected"
        return 0
    fi

    # Black (Python)
    if [ -f "$worktree_path/pyproject.toml" ] && grep -q '\[tool.black\]' "$worktree_path/pyproject.toml"; then
        echo "🐍 Black configuration detected"
        return 0
    fi

    # EditorConfig (universal fallback)
    if [ -f "$worktree_path/.editorconfig" ]; then
        echo "📝 EditorConfig detected"
        return 0
    fi

    # Language-specific defaults
    if [ -f "$worktree_path/package.json" ]; then
        echo "📦 Node.js project - will use Prettier defaults"
        return 0
    elif [ -f "$worktree_path/go.mod" ]; then
        echo "🔵 Go project - will use gofmt"
        return 0
    elif [ -f "$worktree_path/Cargo.toml" ]; then
        echo "🦀 Rust project - will use rustfmt"
        return 0
    fi

    echo "⚠️  No formatter configuration detected"
    return 1
}
```

## Staged Files vs All Files

**Format staged files only (pre-commit) or all files (bulk format):**

```bash
WORKTREE_PATH="./trees/PROJ-123-description"
MODE="${1:-staged}"  # "staged" or "all"

format_staged_files() {
    local worktree_path="$1"

    echo "=== Formatting Staged Files Only ==="

    # Get list of staged files
    STAGED_FILES=$(git -C "$worktree_path" diff --cached --name-only --diff-filter=ACM)

    if [ -z "$STAGED_FILES" ]; then
        echo "ℹ️  No staged files to format"
        return 0
    fi

    echo "📝 Staged files to format:"
    echo "$STAGED_FILES"
    echo ""

    # Format based on detected formatter
    if [ -f "$worktree_path/.prettierrc" ] || \
       [ -f "$worktree_path/package.json" ]; then
        # Prettier for JavaScript/TypeScript files
        echo "$STAGED_FILES" | grep -E '\.(js|jsx|ts|tsx|json|css|scss|md)$' | while read -r file; do
            if [ -f "$worktree_path/$file" ]; then
                echo "✨ Formatting: $file"
                (cd "$worktree_path" && npx prettier --write "$file") || {
                    echo "WARNING: Failed to format $file"
                }
            fi
        done
    fi

    echo "✅ Staged files formatted"
    return 0
}

format_all_files() {
    local worktree_path="$1"

    echo "=== Formatting All Files ==="

    # Run formatter on all files (respects ignore files)
    if [ -f "$worktree_path/.prettierrc" ] || \
       [ -f "$worktree_path/package.json" ]; then
        format_with_prettier "$worktree_path"
    elif [ -f "$worktree_path/pyproject.toml" ]; then
        format_with_black "$worktree_path"
    elif [ -f "$worktree_path/go.mod" ]; then
        format_with_gofmt "$worktree_path"
    elif [ -f "$worktree_path/Cargo.toml" ]; then
        format_with_rustfmt "$worktree_path"
    else
        echo "⚠️  No formatter detected"
        return 1
    fi

    return $?
}
```

## Language-Specific Formatters

### Prettier (JavaScript/TypeScript/Web)

```bash
format_with_prettier() {
    local worktree_path="$1"

    echo "=== Prettier Formatting ==="

    # Check for Prettier installation
    if ! (cd "$worktree_path" && npx prettier --version &>/dev/null); then
        echo "⚠️  Prettier not found - installing..."
        (cd "$worktree_path" && npm install --save-dev prettier) || {
            echo "ERROR: Failed to install Prettier"
            return 1
        }
    fi

    # Create .prettierignore if it doesn't exist
    if [ ! -f "$worktree_path/.prettierignore" ]; then
        echo "Creating .prettierignore..."
        cat > "$worktree_path/.prettierignore" <<EOF
node_modules/
dist/
build/
coverage/
.next/
*.min.js
*.min.css
package-lock.json
yarn.lock
EOF
    fi

    # Format all supported files
    echo "✨ Running Prettier on all files..."
    (cd "$worktree_path" && npx prettier --write "**/*.{js,jsx,ts,tsx,json,css,scss,md,html,yml,yaml}") || {
        echo "ERROR: Prettier formatting failed"
        return 1
    }

    echo "✅ Prettier formatting completed"
    return 0
}
```

### Black (Python)

```bash
format_with_black() {
    local worktree_path="$1"

    echo "=== Black Formatting ==="

    # Check for Black installation
    if ! command -v black &> /dev/null; then
        echo "⚠️  Black not found - installing..."
        pip install black || {
            echo "ERROR: Failed to install Black"
            return 1
        }
    fi

    # Format all Python files
    echo "🐍 Running Black on all Python files..."
    (cd "$worktree_path" && black .) || {
        echo "ERROR: Black formatting failed"
        return 1
    }

    # Also run isort for import sorting
    if command -v isort &> /dev/null; then
        echo "📦 Running isort for import sorting..."
        (cd "$worktree_path" && isort .) || {
            echo "WARNING: isort failed (not critical)"
        }
    fi

    echo "✅ Black formatting completed"
    return 0
}
```

### gofmt (Go)

```bash
format_with_gofmt() {
    local worktree_path="$1"

    echo "=== gofmt Formatting ==="

    # gofmt is part of Go installation
    if ! command -v gofmt &> /dev/null; then
        echo "ERROR: gofmt not found - Go may not be installed"
        return 1
    fi

    # Format all Go files
    echo "🔵 Running gofmt on all Go files..."
    (cd "$worktree_path" && gofmt -w .) || {
        echo "ERROR: gofmt formatting failed"
        return 1
    }

    # Also run goimports if available (better than gofmt)
    if command -v goimports &> /dev/null; then
        echo "📦 Running goimports for import management..."
        (cd "$worktree_path" && goimports -w .) || {
            echo "WARNING: goimports failed (not critical)"
        }
    fi

    echo "✅ gofmt formatting completed"
    return 0
}
```

### rustfmt (Rust)

```bash
format_with_rustfmt() {
    local worktree_path="$1"

    echo "=== rustfmt Formatting ==="

    # rustfmt is part of Rust installation
    if ! command -v rustfmt &> /dev/null; then
        echo "⚠️  rustfmt not found - installing..."
        rustup component add rustfmt || {
            echo "ERROR: Failed to install rustfmt"
            return 1
        }
    fi

    # Format all Rust files
    echo "🦀 Running rustfmt on all Rust files..."
    (cd "$worktree_path" && cargo fmt) || {
        echo "ERROR: rustfmt formatting failed"
        return 1
    }

    echo "✅ rustfmt formatting completed"
    return 0
}
```

### mix format (Elixir)

```bash
format_with_mix() {
    local worktree_path="$1"

    echo "=== mix format (Elixir) ==="

    # Check for Elixir installation
    if ! command -v mix &> /dev/null; then
        echo "ERROR: mix not found - Elixir may not be installed"
        return 1
    fi

    # Format all Elixir files
    echo "💧 Running mix format on all Elixir files..."
    (cd "$worktree_path" && mix format) || {
        echo "ERROR: mix format failed"
        return 1
    }

    echo "✅ mix format completed"
    return 0
}
```

## Respect Ignore Files

**ALWAYS respect .prettierignore, .gitignore, and formatter-specific ignore patterns:**

```bash
verify_ignore_files() {
    local worktree_path="$1"

    echo "=== Verifying Ignore Files ==="

    # Check for .prettierignore
    if [ -f "$worktree_path/package.json" ] && [ ! -f "$worktree_path/.prettierignore" ]; then
        echo "⚠️  No .prettierignore found - creating default..."
        cat > "$worktree_path/.prettierignore" <<EOF
# Dependencies
node_modules/
vendor/

# Build outputs
dist/
build/
out/
.next/
*.min.js
*.min.css

# Lock files
package-lock.json
yarn.lock
pnpm-lock.yaml
composer.lock

# Coverage
coverage/
.nyc_output/

# Logs
*.log
EOF
        echo "✅ Created .prettierignore"
    fi

    # Prettier respects .gitignore by default
    if [ -f "$worktree_path/.gitignore" ]; then
        echo "✅ .gitignore will be respected by formatters"
    fi

    # Black uses .gitignore by default
    # gofmt, rustfmt also respect .gitignore

    return 0
}
```

## Format Count Reporting

**Show how many files were formatted:**

```bash
WORKTREE_PATH="./trees/PROJ-123-description"

# Get list of unformatted files before
BEFORE_STATUS=$(git -C "$WORKTREE_PATH" status --porcelain | wc -l)

echo "=== Formatting Files ==="
format_all_files "$WORKTREE_PATH"
FORMAT_EXIT_CODE=$?

# Get list of files modified by formatter
AFTER_STATUS=$(git -C "$WORKTREE_PATH" status --porcelain | wc -l)
MODIFIED_FILES=$(git -C "$WORKTREE_PATH" status --porcelain | grep '^ M' | wc -l)

echo ""
echo "=== Formatting Summary ==="
echo "📊 Files modified by formatter: $MODIFIED_FILES"

if [ $MODIFIED_FILES -gt 0 ]; then
    echo ""
    echo "Modified files:"
    git -C "$WORKTREE_PATH" status --short | grep '^ M'
fi

exit $FORMAT_EXIT_CODE
```

## Prevent Formatting Conflicts

**Handle merge conflicts and concurrent formatting:**

```bash
check_for_conflicts() {
    local worktree_path="$1"

    echo "=== Checking for Conflicts ==="

    # Check for merge conflicts
    if git -C "$worktree_path" ls-files -u | grep -q .; then
        echo "ERROR: Cannot format during merge conflict"
        echo "Resolve conflicts first, then format"
        return 1
    fi

    # Check for unstaged changes
    if [ -n "$(git -C "$worktree_path" diff --name-only)" ]; then
        echo "⚠️  WARNING: Unstaged changes detected"
        echo "Formatting will modify these files"
        echo ""
        git -C "$worktree_path" status --short
        echo ""
        read -p "Continue with formatting? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Cancelled"
            return 1
        fi
    fi

    return 0
}
```

## Complete Formatting Workflow

```bash
#!/bin/bash
# Complete code formatting workflow

WORKTREE_PATH="$1"
MODE="${2:-all}"  # "staged" or "all"

if [ -z "$WORKTREE_PATH" ]; then
    echo "Usage: $0 ./trees/PROJ-123-description [staged|all]"
    exit 1
fi

# Verify worktree exists
if [ ! -d "$WORKTREE_PATH" ]; then
    echo "ERROR: Worktree not found at $WORKTREE_PATH"
    exit 1
fi

# Verify not in worktree (running from root)
pwd | grep -q "/trees/" && {
    echo "ERROR: Must run from root directory"
    exit 1
}

echo "╔════════════════════════════════════════╗"
echo "║  SPICE Code Formatter                  ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Step 1: Detect formatter
detect_formatter "$WORKTREE_PATH" || {
    echo "ERROR: No formatter configuration detected"
    exit 1
}

# Step 2: Verify ignore files
verify_ignore_files "$WORKTREE_PATH"

# Step 3: Check for conflicts
check_for_conflicts "$WORKTREE_PATH" || exit 1

# Step 4: Format files
echo ""
if [ "$MODE" = "staged" ]; then
    format_staged_files "$WORKTREE_PATH"
else
    format_all_files "$WORKTREE_PATH"
fi

FORMAT_EXIT_CODE=$?

# Step 5: Report results
echo ""
echo "=== Summary ==="
if [ $FORMAT_EXIT_CODE -eq 0 ]; then
    echo "✅ Formatting completed successfully"

    MODIFIED_COUNT=$(git -C "$WORKTREE_PATH" status --porcelain | grep '^ M' | wc -l)
    echo "📊 Files modified: $MODIFIED_COUNT"

    if [ $MODIFIED_COUNT -gt 0 ]; then
        echo ""
        echo "Modified files:"
        git -C "$WORKTREE_PATH" status --short | grep '^ M'
    fi
else
    echo "❌ Formatting failed"
    echo "Review errors above and retry"
fi

exit $FORMAT_EXIT_CODE
```

## Common Issues and Solutions

### Issue: Prettier formats files differently than existing code

**Cause:** No Prettier configuration exists, using defaults

**Solution:**
```bash
# Create .prettierrc with project preferences
cat > ./trees/PROJ-123/.prettierrc <<EOF
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
EOF

# Re-run formatting
(cd ./trees/PROJ-123 && npx prettier --write "**/*.{js,jsx,ts,tsx}")
```

### Issue: Black formatting conflicts with existing Python style

**Cause:** Black enforces opinionated formatting

**Solution:**
```bash
# Configure Black line length in pyproject.toml
cat >> ./trees/PROJ-123/pyproject.toml <<EOF
[tool.black]
line-length = 100
target-version = ['py38']
EOF

# Re-run formatting
(cd ./trees/PROJ-123 && black .)
```

### Issue: Formatter modifies generated or vendored files

**Cause:** Ignore files not properly configured

**Solution:**
```bash
# Add patterns to .prettierignore
cat >> ./trees/PROJ-123/.prettierignore <<EOF
# Generated files
src/generated/
public/vendor/

# Third-party libraries
vendor/
EOF

# Re-run formatting (generated files will be skipped)
(cd ./trees/PROJ-123 && npx prettier --write "**/*.js")
```

### Issue: Formatting takes too long on large codebase

**Cause:** Formatting entire codebase instead of changed files

**Solution:**
```bash
# Format only changed files since develop
git -C ./trees/PROJ-123 diff --name-only develop...HEAD | \
    grep -E '\.(js|jsx|ts|tsx)$' | \
    xargs -I {} npx prettier --write {}

# Or use lint-staged for pre-commit formatting
npx mrm lint-staged
```

## Validation Checklist

Before considering formatting complete, verify:

- [ ] Formatter configuration detected or defaults applied
- [ ] Ignore files (.prettierignore, .gitignore) respected
- [ ] No merge conflicts present
- [ ] Formatter exit code is 0 (success)
- [ ] Modified files listed in git status
- [ ] Generated/vendored files not modified
- [ ] Formatting consistent with project standards

## Integration with SPICE Workflow

This skill integrates at multiple points:

1. **Pre-Commit**: Format staged files before commit
2. **Bulk Cleanup**: Format entire codebase for consistency
3. **CI/CD**: Verify formatting in continuous integration
4. **Code Review**: Ensure consistent formatting across team

Formatting automation reduces style debates and ensures consistent code appearance across the entire codebase.

## References

- SPICE Linting Standards: `~/.claude/docs/spice/CLAUDE-IMPORT.md#linting-standards`
- Lint Auto Skill: `~/.claude/skills/spice/LINT_AUTO.md`
- Pre-Commit Hooks: `~/.claude/skills/spice/GITHOOKS_SETUP.md`
