---
name: env-validator
description: Validates environment variable files for completeness, format correctness, and security. Activates during environment setup, deployment preparation, or when .env issues are detected. Compares against .env.example templates.
allowed-tools: [Bash, Read]
---

# SPICE Environment Validator Skill

Validates .env files for completeness, format correctness, and security to prevent configuration errors and accidental secret exposure.

## Activation Triggers

This skill automatically activates when:
- Setting up new development environments
- Before deployment to staging/production
- When environment variable errors occur
- During security audits for accidental secret commits

## Environment File Validation Protocol

```bash
validate_env_files() {
    local worktree_path="$1"

    echo "=== Environment File Validation ==="

    # Check if .env.example exists (template)
    if [ ! -f "$worktree_path/.env.example" ]; then
        echo "⚠️  WARNING: No .env.example template found"
        echo "Create .env.example to document required variables"
        return 1
    fi

    # Check if .env exists
    if [ ! -f "$worktree_path/.env" ]; then
        echo "❌ ERROR: .env file not found"
        echo "Copy from template: cp .env.example .env"
        return 1
    fi

    echo "✅ Both .env.example and .env found"
    return 0
}
```

## Compare .env.example with .env

```bash
compare_env_files() {
    local worktree_path="$1"

    echo "=== Comparing .env with .env.example ==="

    # Extract variable names from .env.example
    REQUIRED_VARS=$(grep -v '^#' "$worktree_path/.env.example" | grep -v '^$' | cut -d= -f1)

    MISSING_VARS=""

    for var in $REQUIRED_VARS; do
        if ! grep -q "^$var=" "$worktree_path/.env"; then
            MISSING_VARS="$MISSING_VARS\n  - $var"
        fi
    done

    if [ -n "$MISSING_VARS" ]; then
        echo "❌ ERROR: Missing required environment variables:"
        echo -e "$MISSING_VARS"
        echo ""
        echo "Add these variables to .env file"
        return 1
    fi

    echo "✅ All required variables present"
    return 0
}
```

## Validate Format

```bash
validate_format() {
    local worktree_path="$1"

    echo "=== Validating .env Format ==="

    local has_errors=0

    # Check for spaces around =
    if grep -qE '^[A-Z_]+ = ' "$worktree_path/.env"; then
        echo "❌ ERROR: Spaces around = sign detected"
        echo "Format: VARIABLE=value (no spaces)"
        grep -nE '^[A-Z_]+ = ' "$worktree_path/.env"
        has_errors=1
    fi

    # Check for invalid variable names
    if grep -qE '^[^A-Z_#]' "$worktree_path/.env"; then
        echo "❌ ERROR: Invalid variable names (must be UPPERCASE_WITH_UNDERSCORES)"
        grep -nE '^[^A-Z_#]' "$worktree_path/.env"
        has_errors=1
    fi

    # Check for trailing spaces
    if grep -qE ' $' "$worktree_path/.env"; then
        echo "⚠️  WARNING: Trailing spaces detected"
        grep -nE ' $' "$worktree_path/.env"
        has_errors=1
    fi

    # Check for values with spaces not quoted
    if grep -qE '^[A-Z_]+=[^ ]+ [^ ]+$' "$worktree_path/.env"; then
        echo "⚠️  WARNING: Values with spaces should be quoted"
        echo 'Format: VARIABLE="value with spaces"'
        grep -nE '^[A-Z_]+=[^ ]+ [^ ]+$' "$worktree_path/.env"
    fi

    if [ $has_errors -eq 1 ]; then
        return 1
    fi

    echo "✅ Format validation passed"
    return 0
}
```

## Detect Accidentally Committed Secrets

```bash
detect_committed_secrets() {
    local worktree_path="$1"

    echo "=== Checking for Committed Secrets ==="

    # Check if .env is in .gitignore
    if ! git -C "$worktree_path" check-ignore .env 2>/dev/null | grep -q .; then
        echo "❌ ERROR: .env is NOT in .gitignore!"
        echo "This is a SECURITY RISK - secrets may be committed to git"
        echo ""
        echo "Add to .gitignore:"
        echo "  echo '.env' >> .gitignore"
        return 1
    fi

    # Check if .env was ever committed
    if git -C "$worktree_path" log --all --full-history -- .env 2>/dev/null | grep -q .; then
        echo "⚠️  WARNING: .env was previously committed to git!"
        echo "Secrets may exist in git history"
        echo ""
        echo "Remove from history with git filter-repo:"
        echo "  pip install git-filter-repo"
        echo "  git filter-repo --path .env --invert-paths"
        return 1
    fi

    echo "✅ .env is properly gitignored"
    return 0
}
```

## Warn About Default Values

```bash
check_default_values() {
    local worktree_path="$1"

    echo "=== Checking for Default/Example Values ==="

    # Check for common placeholder values
    PLACEHOLDERS="changeme|example|your_|placeholder|TODO|FIXME"

    if grep -iE "$PLACEHOLDERS" "$worktree_path/.env"; then
        echo "⚠️  WARNING: Possible placeholder values detected:"
        grep -niE "$PLACEHOLDERS" "$worktree_path/.env"
        echo ""
        echo "Replace placeholder values with actual configuration"
        return 1
    fi

    echo "✅ No placeholder values detected"
    return 0
}
```

## Generate Documentation

```bash
document_env_variables() {
    local worktree_path="$1"

    echo "=== Generating Environment Variable Documentation ==="

    DOC_FILE="$worktree_path/ENV_VARIABLES.md"

    cat > "$DOC_FILE" <<EOF
# Environment Variables

## Required Variables

EOF

    # Extract variables from .env.example with comments
    grep -v '^$' "$worktree_path/.env.example" | while IFS= read -r line; do
        if [[ $line =~ ^# ]]; then
            # Comment line
            echo "$line" >> "$DOC_FILE"
        else
            # Variable line
            VAR_NAME=$(echo "$line" | cut -d= -f1)
            VAR_VALUE=$(echo "$line" | cut -d= -f2-)
            echo "- **$VAR_NAME**: \`$VAR_VALUE\`" >> "$DOC_FILE"
        fi
    done

    cat >> "$DOC_FILE" <<EOF

## Setup Instructions

1. Copy the example environment file:
   \`\`\`bash
   cp .env.example .env
   \`\`\`

2. Update values in \`.env\` with your configuration

3. Verify all required variables are set:
   \`\`\`bash
   # Check for missing variables
   source .env && echo "All variables loaded"
   \`\`\`

## Security Notes

- **NEVER commit \`.env\` to version control**
- Keep production credentials separate from development
- Rotate secrets regularly
- Use a secret management service in production (AWS Secrets Manager, HashiCorp Vault, etc.)

EOF

    echo "✅ Documentation generated: $DOC_FILE"
    cat "$DOC_FILE"
}
```

## Complete Validation Workflow

```bash
#!/bin/bash
# Complete environment validation workflow

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
echo "║  SPICE Environment Validator           ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Step 1: Check files exist
validate_env_files "$WORKTREE_PATH" || exit 1

# Step 2: Compare required variables
echo ""
compare_env_files "$WORKTREE_PATH" || exit 1

# Step 3: Validate format
echo ""
validate_format "$WORKTREE_PATH" || exit 1

# Step 4: Check for committed secrets
echo ""
detect_committed_secrets "$WORKTREE_PATH" || exit 1

# Step 5: Warn about placeholders
echo ""
check_default_values "$WORKTREE_PATH"

# Step 6: Generate documentation
echo ""
document_env_variables "$WORKTREE_PATH"

echo ""
echo "=== Summary ==="
echo "✅ Environment validation complete"
echo "✅ All required variables present"
echo "✅ Format is correct"
echo "✅ No security issues detected"
echo ""
```

## Common Issues and Solutions

### Issue: Variable exists but application can't read it

**Cause:** Variable not exported or wrong format

**Solution:**
```bash
# Verify variable is set
source .env
echo $DATABASE_URL

# Export variables before running app
set -a && source .env && set +a
npm start

# Or use dotenv package
npm install dotenv
# Add to app: require('dotenv').config()
```

### Issue: Values with special characters break parsing

**Cause:** Unquoted values with special characters

**Solution:**
```bash
# Use quotes for values with special characters
DATABASE_URL="postgresql://user:p@$$word@localhost/db"

# Escape quotes inside quoted strings
API_KEY="secret\"with\"quotes"
```

### Issue: .env committed to git by mistake

**Cause:** Forgot to add .env to .gitignore

**Solution:**
```bash
# Add to .gitignore
echo '.env' >> .gitignore

# Remove from git but keep local file
git rm --cached .env
git commit -m "chore: remove .env from version control"

# Remove from history (DESTRUCTIVE)
git filter-repo --path .env --invert-paths
```

## Validation Checklist

Before considering environment setup complete, verify:

- [ ] .env.example exists and documents all variables
- [ ] .env file exists with all required variables
- [ ] No spaces around = in variable assignments
- [ ] Variable names are UPPERCASE_WITH_UNDERSCORES
- [ ] Values with spaces are properly quoted
- [ ] No trailing spaces in file
- [ ] .env is in .gitignore
- [ ] .env never committed to git
- [ ] No placeholder values (changeme, example, etc.)
- [ ] Documentation generated for team

## Integration with SPICE Workflow

This skill integrates at key points:

1. **Environment Setup**: Validate before starting development
2. **Pre-Deployment**: Verify production configuration
3. **Security Audits**: Check for exposed secrets
4. **Onboarding**: Help new developers configure environment

Proper environment validation prevents configuration errors and security incidents caused by exposed secrets.

## References

- SPICE Security Standards: `~/.claude/docs/spice/CLAUDE-IMPORT.md#security-quality-gates`
- GitIgnore Generator: `~/.claude/skills/spice/GITIGNORE_GENERATOR.md`
- Security Auditor Agent: Validates for secret exposure
