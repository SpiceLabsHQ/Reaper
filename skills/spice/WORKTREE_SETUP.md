---
name: worktree-setup
description: Automates safe worktree creation with proper naming, dependency installation, and environment validation. Automatically activates when creating feature branches, starting new work, setting up development environments, or when worktree creation is needed. Prevents duplicate work and ensures proper isolation.
allowed-tools: [Bash, Read]
---

# SPICE Worktree Setup Skill

Automates the creation and setup of isolated git worktrees following SPICE standards, with built-in safety checks and environment validation.

## Activation Triggers

This skill automatically activates when:
- Creating new feature branches or starting work on tickets
- Setting up development environments
- Need to work on multiple features in parallel
- User requests worktree creation or isolation

## Pre-Setup Validation Protocol

**ALWAYS verify these conditions before creating a worktree:**

### 1. Root Directory Verification
```bash
# CRITICAL: Must be in root directory, not already in a worktree
pwd | grep -q "/trees/" && {
    echo "ERROR: Currently in a worktree directory"
    echo "Navigate to root directory first"
    exit 1
}
```

### 2. Check for Existing Work
```bash
# Prevent duplicate fixes - check if work already exists
JIRA_KEY="PROJ-123"  # Extract from user request

# Check develop branch for existing work
git log --oneline develop --grep="$JIRA_KEY" | head -5

if [ -n "$(git log --oneline develop --grep="$JIRA_KEY")" ]; then
    echo "⚠️  WARNING: $JIRA_KEY may already be fixed in develop branch"
    echo "Review existing commits before proceeding:"
    git log develop --grep="$JIRA_KEY" --oneline
    # Ask user if they want to continue or cancel
fi
```

### 3. Verify Worktree Doesn't Already Exist
```bash
# Check if worktree path already exists
WORKTREE_PATH="./trees/PROJ-123-description"

if [ -d "$WORKTREE_PATH" ]; then
    echo "ERROR: Worktree already exists at $WORKTREE_PATH"
    git worktree list
    exit 1
fi
```

## Worktree Creation Protocol

### Naming Convention

**Format:** `./trees/JIRA-KEY-description`

**Examples:**
- `./trees/PROJ-123-auth` (authentication feature)
- `./trees/BUG-456-security` (security bug fix)
- `./trees/FEAT-789-oauth` (OAuth integration)

**Rules:**
- Always use `./trees/` directory
- Include Jira ticket key
- Brief hyphenated description
- Lowercase, no spaces

### Creation Command

```bash
# Extract components from user request
JIRA_KEY="PROJ-123"           # e.g., "PROJ-123" from user input
DESCRIPTION="auth"             # Brief description of the work
WORKTREE_PATH="./trees/${JIRA_KEY}-${DESCRIPTION}"
BRANCH_NAME="feature/${JIRA_KEY}-${DESCRIPTION}"

# Create trees directory if it doesn't exist
mkdir -p trees

# Create worktree branching from develop
git worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME" develop || {
    echo "ERROR: Failed to create worktree"
    echo "Possible causes:"
    echo "  - Branch already exists: git branch -d $BRANCH_NAME"
    echo "  - Directory conflicts: rm -rf $WORKTREE_PATH"
    exit 1
}

echo "✅ Created worktree: $WORKTREE_PATH"
echo "✅ Created branch: $BRANCH_NAME"
```

## Dependency Installation

Auto-detect project type and install dependencies:

```bash
WORKTREE_PATH="./trees/PROJ-123-description"

echo "🔍 Detecting project type and installing dependencies..."

# Node.js/npm/yarn
if [ -f "$WORKTREE_PATH/package.json" ]; then
    echo "📦 Node.js project detected - installing npm dependencies"
    if [ -f "$WORKTREE_PATH/package-lock.json" ]; then
        (cd "$WORKTREE_PATH" && npm install) || {
            echo "ERROR: npm install failed"
            exit 1
        }
    elif [ -f "$WORKTREE_PATH/yarn.lock" ]; then
        (cd "$WORKTREE_PATH" && yarn install) || {
            echo "ERROR: yarn install failed"
            exit 1
        }
    else
        (cd "$WORKTREE_PATH" && npm install) || {
            echo "ERROR: npm install failed"
            exit 1
        }
    fi
    echo "✅ Node.js dependencies installed"

# Python
elif [ -f "$WORKTREE_PATH/requirements.txt" ]; then
    echo "🐍 Python project detected - installing pip dependencies"
    (cd "$WORKTREE_PATH" && pip install -r requirements.txt) || {
        echo "ERROR: pip install failed"
        exit 1
    }
    echo "✅ Python dependencies installed"

elif [ -f "$WORKTREE_PATH/pyproject.toml" ]; then
    echo "🐍 Python project detected - installing poetry/pip dependencies"
    if command -v poetry &> /dev/null; then
        (cd "$WORKTREE_PATH" && poetry install) || {
            echo "ERROR: poetry install failed"
            exit 1
        }
    else
        (cd "$WORKTREE_PATH" && pip install -e .) || {
            echo "ERROR: pip install failed"
            exit 1
        }
    fi
    echo "✅ Python dependencies installed"

# Ruby
elif [ -f "$WORKTREE_PATH/Gemfile" ]; then
    echo "💎 Ruby project detected - installing bundler dependencies"
    (cd "$WORKTREE_PATH" && bundle install) || {
        echo "ERROR: bundle install failed"
        exit 1
    }
    echo "✅ Ruby dependencies installed"

# PHP
elif [ -f "$WORKTREE_PATH/composer.json" ]; then
    echo "🐘 PHP project detected - installing composer dependencies"
    (cd "$WORKTREE_PATH" && composer install) || {
        echo "ERROR: composer install failed"
        exit 1
    }
    echo "✅ PHP dependencies installed"

# Go
elif [ -f "$WORKTREE_PATH/go.mod" ]; then
    echo "🔵 Go project detected - installing go dependencies"
    (cd "$WORKTREE_PATH" && go mod download) || {
        echo "ERROR: go mod download failed"
        exit 1
    }
    echo "✅ Go dependencies installed"

else
    echo "⚠️  No dependency file detected - skipping dependency installation"
    echo "Checked for: package.json, requirements.txt, pyproject.toml, Gemfile, composer.json, go.mod"
fi
```

## Environment Validation

Verify the environment is ready for development:

```bash
WORKTREE_PATH="./trees/PROJ-123-description"

echo "🔍 Validating environment setup..."

# 1. Verify worktree is clean
git -C "$WORKTREE_PATH" status --porcelain | grep -q . && {
    echo "⚠️  WARNING: Worktree has uncommitted changes after setup"
    git -C "$WORKTREE_PATH" status
}

# 2. Verify on correct branch
CURRENT_BRANCH=$(git -C "$WORKTREE_PATH" branch --show-current)
EXPECTED_BRANCH="feature/PROJ-123-description"

if [ "$CURRENT_BRANCH" != "$EXPECTED_BRANCH" ]; then
    echo "ERROR: Expected branch $EXPECTED_BRANCH, got $CURRENT_BRANCH"
    exit 1
fi

# 3. Verify branched from develop
BASE_BRANCH=$(git -C "$WORKTREE_PATH" merge-base --fork-point develop HEAD 2>/dev/null)
if [ -z "$BASE_BRANCH" ]; then
    echo "⚠️  WARNING: Could not verify branch was created from develop"
else
    echo "✅ Verified branch created from develop"
fi

# 4. Test basic build/compile (if applicable)
if [ -f "$WORKTREE_PATH/package.json" ] && grep -q "\"build\"" "$WORKTREE_PATH/package.json"; then
    echo "🔨 Testing build..."
    (cd "$WORKTREE_PATH" && npm run build) || {
        echo "⚠️  WARNING: Build failed - may need configuration"
    }
fi

echo "✅ Environment validation complete"
```

## Complete Setup Workflow

**Full automated setup example:**

```bash
#!/bin/bash
# Complete worktree setup for PROJ-123

JIRA_KEY="PROJ-123"
DESCRIPTION="auth"
WORKTREE_PATH="./trees/${JIRA_KEY}-${DESCRIPTION}"
BRANCH_NAME="feature/${JIRA_KEY}-${DESCRIPTION}"

# Step 1: Pre-flight checks
echo "=== Pre-Flight Validation ==="
pwd | grep -q "/trees/" && { echo "ERROR: Must run from root"; exit 1; }

# Step 2: Check for existing work
echo "=== Checking for Existing Work ==="
if [ -n "$(git log --oneline develop --grep="$JIRA_KEY")" ]; then
    echo "⚠️  $JIRA_KEY may already exist in develop:"
    git log develop --grep="$JIRA_KEY" --oneline
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    [[ ! $REPLY =~ ^[Yy]$ ]] && exit 0
fi

# Step 3: Create worktree
echo "=== Creating Worktree ==="
mkdir -p trees
git worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME" develop || {
    echo "ERROR: Worktree creation failed"
    exit 1
}
echo "✅ Created worktree at $WORKTREE_PATH"

# Step 4: Install dependencies
echo "=== Installing Dependencies ==="
if [ -f "$WORKTREE_PATH/package.json" ]; then
    (cd "$WORKTREE_PATH" && npm install) || exit 1
elif [ -f "$WORKTREE_PATH/requirements.txt" ]; then
    (cd "$WORKTREE_PATH" && pip install -r requirements.txt) || exit 1
elif [ -f "$WORKTREE_PATH/Gemfile" ]; then
    (cd "$WORKTREE_PATH" && bundle install) || exit 1
elif [ -f "$WORKTREE_PATH/composer.json" ]; then
    (cd "$WORKTREE_PATH" && composer install) || exit 1
fi
echo "✅ Dependencies installed"

# Step 5: Validate environment
echo "=== Validating Environment ==="
CURRENT_BRANCH=$(git -C "$WORKTREE_PATH" branch --show-current)
if [ "$CURRENT_BRANCH" != "$BRANCH_NAME" ]; then
    echo "ERROR: Branch mismatch"
    exit 1
fi
echo "✅ Environment ready"

# Step 6: Display summary
echo ""
echo "╔════════════════════════════════════════╗"
echo "║  Worktree Setup Complete               ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "📁 Worktree Path: $WORKTREE_PATH"
echo "🌿 Branch Name: $BRANCH_NAME"
echo "🎯 Jira Ticket: $JIRA_KEY"
echo ""
echo "Next steps:"
echo "  1. Implement changes in worktree"
echo "  2. Run tests: (cd $WORKTREE_PATH && npm test)"
echo "  3. Commit changes: git -C $WORKTREE_PATH commit"
echo "  4. Use WORKTREE_CLEANUP skill when done"
echo ""
```

## Common Issues and Solutions

### Issue: "fatal: '$BRANCH_NAME' is already checked out"

**Cause:** Branch is already associated with another worktree

**Solution:**
```bash
# List all worktrees
git worktree list

# Remove the conflicting worktree
git worktree remove ./trees/conflicting-path

# Or use a different branch name
git worktree add ./trees/PROJ-123-description existing-branch-name
```

### Issue: "fatal: invalid reference: develop"

**Cause:** Develop branch doesn't exist locally

**Solution:**
```bash
# Fetch develop from remote
git fetch origin develop

# Create local develop branch
git checkout -b develop origin/develop

# Retry worktree creation
git worktree add ./trees/PROJ-123-description -b feature/PROJ-123-description develop
```

### Issue: Dependency installation fails

**Cause:** Missing package managers or network issues

**Solution:**
```bash
# Verify package manager is installed
command -v npm &> /dev/null || echo "npm not found"
command -v pip &> /dev/null || echo "pip not found"

# Check network connectivity
curl -I https://registry.npmjs.org/ 2>/dev/null | head -1

# Retry with verbose output
(cd ./trees/PROJ-123-description && npm install --verbose)
```

## Validation Checklist

Before considering setup complete, verify:

- [ ] Running from root directory (not inside a worktree)
- [ ] No existing work for this Jira ticket in develop
- [ ] Worktree created at `./trees/JIRA-KEY-description`
- [ ] Branch named `feature/JIRA-KEY-description`
- [ ] Dependencies installed successfully
- [ ] Environment is clean (no uncommitted changes)
- [ ] On correct branch
- [ ] Branched from develop

## Integration with SPICE Workflow

This skill is the first step in the SPICE development workflow:

1. **WORKTREE_SETUP** ← You are here
2. Implement changes using TDD
3. Run PRE_COMMIT_CHECK skill
4. Create commit with GIT_COMMIT skill
5. Use WORKTREE_CLEANUP skill to merge and clean up

## References

- SPICE Worktrees: `~/.claude/docs/spice/SPICE-Worktrees.md`
- Git Flow Standards: `~/.claude/docs/spice/SPICE-Git-Flow.md`
