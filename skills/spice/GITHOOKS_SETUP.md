---
name: githooks-setup
description: Installs and configures git hooks using Husky or pre-commit framework. Activates for new projects, repository setup, or when hook configuration is needed. Sets up pre-commit linting, testing, and commit message validation.
allowed-tools: [Bash, Read]
---

# SPICE Git Hooks Setup Skill

Automates installation and configuration of git hooks to enforce quality standards through automated pre-commit checks and commit message validation.

## Activation Triggers

This skill automatically activates when:
- Setting up new repositories or projects
- Implementing quality gates for development workflow
- User requests hook installation or configuration
- Team onboarding requires automated checks

## Hook Framework Detection

```bash
detect_hook_framework() {
    local worktree_path="$1"

    echo "=== Detecting Hook Framework ==="

    if [ -f "$worktree_path/package.json" ]; then
        if grep -q '"husky"' "$worktree_path/package.json"; then
            echo "✓ Husky detected (Node.js)"
            export HOOK_FRAMEWORK="husky"
            return 0
        fi
        echo "→ Will install Husky (Node.js project)"
        export HOOK_FRAMEWORK="husky"
        return 0

    elif [ -f "$worktree_path/.pre-commit-config.yaml" ]; then
        echo "✓ pre-commit framework detected (Python)"
        export HOOK_FRAMEWORK="pre-commit"
        return 0

    elif [ -f "$worktree_path/.overcommit.yml" ]; then
        echo "✓ Overcommit detected (Ruby)"
        export HOOK_FRAMEWORK="overcommit"
        return 0

    else
        echo "→ Will use manual .git/hooks scripts"
        export HOOK_FRAMEWORK="manual"
        return 0
    fi
}
```

## Node.js: Husky + Commitlint Setup

```bash
setup_husky() {
    local worktree_path="$1"

    echo "=== Setting Up Husky + Commitlint ==="

    # Install Husky and commitlint
    echo "📦 Installing Husky and commitlint..."
    (cd "$worktree_path" && npm install --save-dev \
        husky \
        @commitlint/cli \
        @commitlint/config-conventional \
        lint-staged) || {
        echo "ERROR: Failed to install Husky packages"
        return 1
    }

    # Initialize Husky
    echo "🔧 Initializing Husky..."
    (cd "$worktree_path" && npx husky install) || {
        echo "ERROR: Failed to initialize Husky"
        return 1
    }

    # Add prepare script to package.json
    if ! grep -q '"prepare"' "$worktree_path/package.json"; then
        echo "Adding prepare script to package.json..."
        npm pkg set scripts.prepare="husky install"
    fi

    # Create pre-commit hook
    echo "📝 Creating pre-commit hook..."
    cat > "$worktree_path/.husky/pre-commit" <<'EOF'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run lint-staged
npx lint-staged

# Run tests (optional - can be slow)
# npm test
EOF

    chmod +x "$worktree_path/.husky/pre-commit"

    # Create commit-msg hook
    echo "📝 Creating commit-msg hook..."
    cat > "$worktree_path/.husky/commit-msg" <<'EOF'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Validate commit message with commitlint
npx --no -- commitlint --edit "$1"
EOF

    chmod +x "$worktree_path/.husky/commit-msg"

    # Create commitlint config
    echo "📝 Creating commitlint.config.js..."
    cat > "$worktree_path/commitlint.config.js" <<'EOF'
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'chore',
        'ci',
      ],
    ],
    'subject-max-length': [2, 'always', 72],
    'subject-case': [0], // Allow any case
    'body-max-line-length': [2, 'always', 100],
  },
};
EOF

    # Create lint-staged config
    echo "📝 Creating lint-staged configuration..."
    cat >> "$worktree_path/package.json.tmp" <<'EOF'
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
EOF

    # Merge lint-staged config into package.json (simplified)
    if ! grep -q '"lint-staged"' "$worktree_path/package.json"; then
        npm pkg set 'lint-staged.*.{js,jsx,ts,tsx}[0]'="eslint --fix"
        npm pkg set 'lint-staged.*.{js,jsx,ts,tsx}[1]'="prettier --write"
    fi

    echo "✅ Husky setup complete"
    return 0
}
```

## Python: pre-commit Framework Setup

```bash
setup_precommit() {
    local worktree_path="$1"

    echo "=== Setting Up pre-commit Framework ==="

    # Install pre-commit
    echo "📦 Installing pre-commit..."
    pip install pre-commit || {
        echo "ERROR: Failed to install pre-commit"
        return 1
    }

    # Create .pre-commit-config.yaml
    echo "📝 Creating .pre-commit-config.yaml..."
    cat > "$worktree_path/.pre-commit-config.yaml" <<'EOF'
# Pre-commit hooks configuration
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
      - id: check-merge-conflict

  - repo: https://github.com/psf/black
    rev: 23.12.1
    hooks:
      - id: black
        language_version: python3

  - repo: https://github.com/pycqa/isort
    rev: 5.13.2
    hooks:
      - id: isort

  - repo: https://github.com/pycqa/flake8
    rev: 7.0.0
    hooks:
      - id: flake8
        args: ['--max-line-length=100']

  - repo: https://github.com/alessandrojcm/commitlint-pre-commit-hook
    rev: v9.11.0
    hooks:
      - id: commitlint
        stages: [commit-msg]
        additional_dependencies: ['@commitlint/config-conventional']
EOF

    # Install hooks
    echo "🔧 Installing pre-commit hooks..."
    (cd "$worktree_path" && pre-commit install) || {
        echo "ERROR: Failed to install pre-commit hooks"
        return 1
    }

    # Install commit-msg hook
    (cd "$worktree_path" && pre-commit install --hook-type commit-msg) || {
        echo "ERROR: Failed to install commit-msg hook"
        return 1
    }

    echo "✅ pre-commit setup complete"
    return 0
}
```

## Ruby: Overcommit Setup

```bash
setup_overcommit() {
    local worktree_path="$1"

    echo "=== Setting Up Overcommit ==="

    # Add overcommit to Gemfile
    if ! grep -q "overcommit" "$worktree_path/Gemfile"; then
        echo "gem 'overcommit', require: false" >> "$worktree_path/Gemfile"
        (cd "$worktree_path" && bundle install) || {
            echo "ERROR: Failed to install overcommit"
            return 1
        }
    fi

    # Initialize overcommit
    echo "🔧 Initializing overcommit..."
    (cd "$worktree_path" && bundle exec overcommit --install) || {
        echo "ERROR: Failed to initialize overcommit"
        return 1
    }

    # Create .overcommit.yml
    echo "📝 Creating .overcommit.yml..."
    cat > "$worktree_path/.overcommit.yml" <<'EOF'
# Overcommit hooks configuration
PreCommit:
  RuboCop:
    enabled: true
    on_warn: fail
    command: ['bundle', 'exec', 'rubocop']

  BundleCheck:
    enabled: true

  TrailingWhitespace:
    enabled: true

CommitMsg:
  TextWidth:
    enabled: true
    max_subject_width: 72
    max_body_width: 100
EOF

    echo "✅ Overcommit setup complete"
    return 0
}
```

## Manual Git Hooks Setup

```bash
setup_manual_hooks() {
    local worktree_path="$1"

    echo "=== Setting Up Manual Git Hooks ==="

    # Create hooks directory
    HOOKS_DIR="$worktree_path/.git/hooks"
    if [ ! -d "$HOOKS_DIR" ]; then
        echo "ERROR: .git/hooks directory not found"
        return 1
    fi

    # Create pre-commit hook
    echo "📝 Creating pre-commit hook..."
    cat > "$HOOKS_DIR/pre-commit" <<'EOF'
#!/bin/bash
# SPICE pre-commit hook

echo "=== Running Pre-Commit Checks ==="

# Run linting
if [ -f package.json ]; then
    npm run lint || {
        echo "ERROR: Linting failed"
        exit 1
    }
elif [ -f requirements.txt ]; then
    black --check . && isort --check . && flake8 . || {
        echo "ERROR: Python linting failed"
        exit 1
    }
fi

echo "✅ Pre-commit checks passed"
exit 0
EOF

    chmod +x "$HOOKS_DIR/pre-commit"

    # Create commit-msg hook
    echo "📝 Creating commit-msg hook..."
    cat > "$HOOKS_DIR/commit-msg" <<'EOF'
#!/bin/bash
# SPICE commit-msg validation

COMMIT_MSG_FILE=$1
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

echo "=== Validating Commit Message ==="

# Check format: type(scope): subject
if ! echo "$COMMIT_MSG" | grep -qE '^(feat|fix|docs|style|refactor|perf|test|chore|ci)(\([a-z]+\))?: .{1,72}$'; then
    echo "ERROR: Invalid commit message format"
    echo ""
    echo "Format: type(scope): subject (max 72 chars)"
    echo "Types: feat, fix, docs, style, refactor, perf, test, chore, ci"
    echo ""
    echo "Your message:"
    echo "$COMMIT_MSG"
    exit 1
fi

echo "✅ Commit message valid"
exit 0
EOF

    chmod +x "$HOOKS_DIR/commit-msg"

    echo "✅ Manual hooks setup complete"
    return 0
}
```

## Test Hooks Work Correctly

```bash
test_hooks() {
    local worktree_path="$1"

    echo "=== Testing Git Hooks ==="

    # Test pre-commit hook
    echo "🧪 Testing pre-commit hook..."
    echo "test" > "$worktree_path/test-file.txt"
    git -C "$worktree_path" add test-file.txt

    # Attempt commit (will trigger hooks)
    git -C "$worktree_path" commit -m "test: verify hooks work" || {
        echo "⚠️  Pre-commit hook triggered (expected)"
    }

    # Clean up test file
    git -C "$worktree_path" reset HEAD test-file.txt
    rm -f "$worktree_path/test-file.txt"

    # Test commit-msg validation
    echo "🧪 Testing commit-msg validation..."
    echo "invalid message" | git -C "$worktree_path" commit --allow-empty -F - 2>&1 | grep -q "ERROR" && {
        echo "✅ Commit-msg validation working"
    }

    echo "✅ Hook testing complete"
    return 0
}
```

## Complete Hooks Setup Workflow

```bash
#!/bin/bash
# Complete git hooks setup workflow

WORKTREE_PATH="$1"

if [ -z "$WORKTREE_PATH" ]; then
    WORKTREE_PATH="."
fi

if [ ! -d "$WORKTREE_PATH" ]; then
    echo "ERROR: Directory not found at $WORKTREE_PATH"
    exit 1
fi

echo "╔════════════════════════════════════════╗"
echo "║  SPICE Git Hooks Setup                 ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Step 1: Detect framework
detect_hook_framework "$WORKTREE_PATH"

# Step 2: Install appropriate framework
case "$HOOK_FRAMEWORK" in
    husky)
        setup_husky "$WORKTREE_PATH" || exit 1
        ;;
    pre-commit)
        setup_precommit "$WORKTREE_PATH" || exit 1
        ;;
    overcommit)
        setup_overcommit "$WORKTREE_PATH" || exit 1
        ;;
    manual)
        setup_manual_hooks "$WORKTREE_PATH" || exit 1
        ;;
esac

# Step 3: Test hooks
echo ""
test_hooks "$WORKTREE_PATH"

echo ""
echo "=== Summary ==="
echo "✅ Git hooks configured successfully"
echo "✅ Framework: $HOOK_FRAMEWORK"
echo "✅ Pre-commit: Linting and formatting"
echo "✅ Commit-msg: Conventional commit validation"
echo ""
echo "⚠️  NEVER use --no-verify to bypass hooks"
echo ""
```

## Common Issues and Solutions

### Issue: Hooks don't execute on commit

**Cause:** Hooks not executable or in wrong location

**Solution:**
```bash
# Make hooks executable
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/commit-msg

# For Husky, ensure proper installation
npx husky install
```

### Issue: commitlint validation fails unexpectedly

**Cause:** Incorrect commit message format

**Solution:**
```bash
# Valid format examples
git commit -m "feat(auth): add OAuth2 support"
git commit -m "fix(api): handle null responses"

# Invalid - will be rejected
git commit -m "Added new feature"  # Missing type
git commit -m "feat: this is a very long commit message that exceeds the 72 character limit for subject lines"  # Too long
```

### Issue: Pre-commit hook is too slow

**Cause:** Running full test suite on every commit

**Solution:**
```bash
# Run only fast checks in pre-commit
# Move slow tests to pre-push hook

# .husky/pre-push
npx husky add .husky/pre-push "npm test"

# Keep pre-commit fast
# .husky/pre-commit (only linting)
npx lint-staged
```

## Validation Checklist

Before considering hooks setup complete, verify:

- [ ] Hook framework installed and initialized
- [ ] Pre-commit hook runs linting/formatting
- [ ] Commit-msg hook validates conventional commits
- [ ] Hooks are executable (chmod +x)
- [ ] Test commit triggers hooks correctly
- [ ] Invalid commit message is rejected
- [ ] Documentation updated for team
- [ ] --no-verify bypass is prohibited

## Integration with SPICE Workflow

Git hooks integrate at critical points:

1. **Pre-Commit**: Enforce linting and formatting before code enters git
2. **Commit-Msg**: Validate commit message format for changelog generation
3. **Pre-Push**: Run full test suite before pushing to remote (optional)
4. **Quality Gates**: Automated checks prevent substandard code

Properly configured git hooks enforce quality standards automatically, reducing manual review burden and preventing quality issues.

## References

- SPICE Commit Standards: `~/.claude/skills/spice/GIT_COMMIT.md`
- Lint Auto Skill: `~/.claude/skills/spice/LINT_AUTO.md`
- Code Formatter Skill: `~/.claude/skills/spice/CODE_FORMATTER.md`
