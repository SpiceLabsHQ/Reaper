---
name: editorconfig-generator
description: Generates .editorconfig files to ensure consistent formatting across editors. Activates for new projects, team setup, or when editor configuration is needed. Detects languages and sets appropriate formatting rules.
allowed-tools: [Bash, Read]
---

# SPICE EditorConfig Generator Skill

Generates .editorconfig files to ensure consistent code formatting across different editors and team members.

## Activation Triggers

This skill automatically activates when:
- Setting up new projects or repositories
- Team onboarding requires consistent editor settings
- Formatting inconsistencies across different editors
- User requests editorconfig generation

## Language Detection

```bash
detect_languages() {
    local worktree_path="$1"

    echo "=== Detecting Project Languages ==="

    LANGUAGES=""

    # JavaScript/TypeScript
    if find "$worktree_path" -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" 2>/dev/null | head -1 | grep -q .; then
        LANGUAGES="$LANGUAGES javascript"
        echo "✓ JavaScript/TypeScript detected"
    fi

    # Python
    if find "$worktree_path" -name "*.py" 2>/dev/null | head -1 | grep -q .; then
        LANGUAGES="$LANGUAGES python"
        echo "✓ Python detected"
    fi

    # Ruby
    if find "$worktree_path" -name "*.rb" 2>/dev/null | head -1 | grep -q .; then
        LANGUAGES="$LANGUAGES ruby"
        echo "✓ Ruby detected"
    fi

    # Go
    if find "$worktree_path" -name "*.go" 2>/dev/null | head -1 | grep -q .; then
        LANGUAGES="$LANGUAGES go"
        echo "✓ Go detected"
    fi

    # Rust
    if find "$worktree_path" -name "*.rs" 2>/dev/null | head -1 | grep -q .; then
        LANGUAGES="$LANGUAGES rust"
        echo "✓ Rust detected"
    fi

    # PHP
    if find "$worktree_path" -name "*.php" 2>/dev/null | head -1 | grep -q .; then
        LANGUAGES="$LANGUAGES php"
        echo "✓ PHP detected"
    fi

    # HTML/CSS
    if find "$worktree_path" -name "*.html" -o -name "*.css" 2>/dev/null | head -1 | grep -q .; then
        LANGUAGES="$LANGUAGES web"
        echo "✓ HTML/CSS detected"
    fi

    # Markdown
    if find "$worktree_path" -name "*.md" 2>/dev/null | head -1 | grep -q .; then
        LANGUAGES="$LANGUAGES markdown"
        echo "✓ Markdown detected"
    fi

    export LANGUAGES
    echo ""
    echo "Detected languages:$LANGUAGES"
}
```

## Generate Universal Settings

```bash
generate_universal_settings() {
    local output_file="$1"

    echo "=== Generating Universal Settings ==="

    cat > "$output_file" <<'EOF'
# EditorConfig helps maintain consistent coding styles
# https://editorconfig.org

# Top-most EditorConfig file
root = true

# Unix-style newlines with a newline ending every file
[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

EOF

    echo "✅ Universal settings generated"
}
```

## Add Language-Specific Rules

```bash
add_javascript_rules() {
    local output_file="$1"

    cat >> "$output_file" <<'EOF'
# JavaScript, TypeScript, JSON
[*.{js,jsx,ts,tsx,json}]
indent_style = space
indent_size = 2
quote_type = single

EOF

    echo "✅ JavaScript/TypeScript rules added"
}

add_python_rules() {
    local output_file="$1"

    cat >> "$output_file" <<'EOF'
# Python
[*.py]
indent_style = space
indent_size = 4
max_line_length = 100

EOF

    echo "✅ Python rules added"
}

add_ruby_rules() {
    local output_file="$1"

    cat >> "$output_file" <<'EOF'
# Ruby
[*.rb]
indent_style = space
indent_size = 2

EOF

    echo "✅ Ruby rules added"
}

add_go_rules() {
    local output_file="$1"

    cat >> "$output_file" <<'EOF'
# Go
[*.go]
indent_style = tab
indent_size = 4

EOF

    echo "✅ Go rules added"
}

add_rust_rules() {
    local output_file="$1"

    cat >> "$output_file" <<'EOF'
# Rust
[*.rs]
indent_style = space
indent_size = 4
max_line_length = 100

EOF

    echo "✅ Rust rules added"
}

add_php_rules() {
    local output_file="$1"

    cat >> "$output_file" <<'EOF'
# PHP
[*.php]
indent_style = space
indent_size = 4

EOF

    echo "✅ PHP rules added"
}

add_web_rules() {
    local output_file="$1"

    cat >> "$output_file" <<'EOF'
# HTML, CSS, SCSS
[*.{html,css,scss}]
indent_style = space
indent_size = 2

EOF

    echo "✅ HTML/CSS rules added"
}

add_markdown_rules() {
    local output_file="$1"

    cat >> "$output_file" <<'EOF'
# Markdown
[*.md]
indent_style = space
indent_size = 2
trim_trailing_whitespace = false

EOF

    echo "✅ Markdown rules added"
}

add_makefile_rules() {
    local output_file="$1"

    cat >> "$output_file" <<'EOF'
# Makefiles must use tabs
[Makefile]
indent_style = tab

EOF

    echo "✅ Makefile rules added"
}
```

## Respect Existing Configuration

```bash
respect_existing() {
    local worktree_path="$1"
    local new_config="$2"

    if [ -f "$worktree_path/.editorconfig" ]; then
        echo "=== Existing .editorconfig Found ==="

        # Backup existing
        cp "$worktree_path/.editorconfig" "$worktree_path/.editorconfig.backup"
        echo "✅ Backed up existing .editorconfig"

        # Check if existing has custom rules
        if grep -q "# Custom" "$worktree_path/.editorconfig"; then
            echo "⚠️  Custom rules detected in existing config"
            echo "Review and merge manually: .editorconfig.backup"
        fi
    fi
}
```

## Complete Generation Workflow

```bash
#!/bin/bash
# Complete .editorconfig generation workflow

WORKTREE_PATH="$1"

if [ -z "$WORKTREE_PATH" ]; then
    WORKTREE_PATH="."
fi

if [ ! -d "$WORKTREE_PATH" ]; then
    echo "ERROR: Directory not found at $WORKTREE_PATH"
    exit 1
fi

echo "╔════════════════════════════════════════╗"
echo "║  SPICE EditorConfig Generator          ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Step 1: Detect languages
detect_languages "$WORKTREE_PATH"

# Step 2: Respect existing config
OUTPUT_FILE="$WORKTREE_PATH/.editorconfig"
respect_existing "$WORKTREE_PATH" "$OUTPUT_FILE"

# Step 3: Generate universal settings
generate_universal_settings "$OUTPUT_FILE"

# Step 4: Add language-specific rules
echo "=== Adding Language-Specific Rules ==="
if echo "$LANGUAGES" | grep -q "javascript"; then
    add_javascript_rules "$OUTPUT_FILE"
fi

if echo "$LANGUAGES" | grep -q "python"; then
    add_python_rules "$OUTPUT_FILE"
fi

if echo "$LANGUAGES" | grep -q "ruby"; then
    add_ruby_rules "$OUTPUT_FILE"
fi

if echo "$LANGUAGES" | grep -q "go"; then
    add_go_rules "$OUTPUT_FILE"
fi

if echo "$LANGUAGES" | grep -q "rust"; then
    add_rust_rules "$OUTPUT_FILE"
fi

if echo "$LANGUAGES" | grep -q "php"; then
    add_php_rules "$OUTPUT_FILE"
fi

if echo "$LANGUAGES" | grep -q "web"; then
    add_web_rules "$OUTPUT_FILE"
fi

if echo "$LANGUAGES" | grep -q "markdown"; then
    add_markdown_rules "$OUTPUT_FILE"
fi

# Always add Makefile rules
add_makefile_rules "$OUTPUT_FILE"

echo ""
echo "=== Summary ==="
echo "✅ .editorconfig generated successfully"
echo "✅ Location: $OUTPUT_FILE"
echo "✅ Languages configured:$LANGUAGES"
echo ""
echo "Next steps:"
echo "  1. Review the configuration"
echo "  2. Install EditorConfig plugin for your editor"
echo "  3. Commit: git add .editorconfig && git commit -m \"chore: add .editorconfig\""
echo ""
```

## Common Issues and Solutions

### Issue: EditorConfig not applied in editor

**Cause:** EditorConfig plugin not installed

**Solution:**
```bash
# Install EditorConfig plugin for your editor:
# - VS Code: ext install EditorConfig.EditorConfig
# - IntelliJ/WebStorm: Built-in support
# - Sublime: Package Control -> EditorConfig
# - Vim: Plugin 'editorconfig/editorconfig-vim'
```

### Issue: Conflicts with Prettier or ESLint

**Cause:** Multiple formatting tools with different settings

**Solution:**
```bash
# EditorConfig should define basic rules (indent, line endings)
# Prettier/ESLint handle advanced formatting

# Make them consistent:
# .editorconfig: indent_size = 2
# .prettierrc: "tabWidth": 2
```

### Issue: Different behavior across editors

**Cause:** Different EditorConfig plugin versions

**Solution:**
```bash
# Use explicit values instead of defaults
[*]
indent_style = space  # Not "inherit"
indent_size = 2       # Not "auto"
```

## Validation Checklist

Before considering .editorconfig complete, verify:

- [ ] All project languages have specific rules
- [ ] Universal settings (charset, line endings) defined
- [ ] Makefile uses tabs (required)
- [ ] Markdown doesn't trim trailing whitespace
- [ ] File committed to repository
- [ ] Team members have EditorConfig plugin installed
- [ ] Settings consistent with linters (Prettier, ESLint)

## Integration with SPICE Workflow

This skill integrates at key points:

1. **Project Setup**: Generate .editorconfig for consistent formatting
2. **Team Onboarding**: Ensure new developers have same editor settings
3. **Code Review**: Reduce formatting noise in diffs
4. **Cross-Editor Collaboration**: Consistent formatting regardless of IDE

EditorConfig ensures basic formatting consistency before code even reaches linters and formatters.

## References

- Code Formatter Skill: `~/.claude/skills/spice/CODE_FORMATTER.md`
- EditorConfig Documentation: https://editorconfig.org
- Supported Properties: https://github.com/editorconfig/editorconfig/wiki/EditorConfig-Properties
