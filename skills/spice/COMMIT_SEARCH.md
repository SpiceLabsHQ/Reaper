---
name: commit-search
description: Searches git commit history with flexible filters and formats results. Activates when searching for bug introductions, feature history, or commit details. Supports filtering by message, author, date, Jira key, and file path.
allowed-tools: [Bash]
---

# SPICE Commit Search Skill

Searches git commit history efficiently with multiple filter options and output formats for debugging, auditing, and historical analysis.

## Activation Triggers

This skill automatically activates when:
- Investigating when a bug was introduced
- Tracking feature development history
- Searching for commits by Jira ticket
- Finding author contributions
- Auditing changes to specific files

## Search by Message

```bash
search_by_message() {
    local query="$1"
    local format="${2:-oneline}"

    echo "=== Searching Commits by Message: '$query' ==="

    case "$format" in
        oneline)
            git log --all --grep="$query" --oneline --color=always
            ;;
        detailed)
            git log --all --grep="$query" --pretty=format:"%C(yellow)%h%Creset - %C(cyan)%an%Creset, %C(green)%ar%Creset : %s" --color=always
            ;;
        full)
            git log --all --grep="$query" --stat --color=always
            ;;
    esac
}
```

## Search by Author

```bash
search_by_author() {
    local author="$1"
    local since="${2:-}"
    local until="${3:-}"

    echo "=== Searching Commits by Author: '$author' ==="

    CMD="git log --all --author=\"$author\" --pretty=format:\"%C(yellow)%h%Creset - %C(cyan)%an%Creset, %C(green)%ar%Creset : %s\" --color=always"

    if [ -n "$since" ]; then
        CMD="$CMD --since=\"$since\""
    fi

    if [ -n "$until" ]; then
        CMD="$CMD --until=\"$until\""
    fi

    eval "$CMD"
}
```

## Search by Date Range

```bash
search_by_date_range() {
    local since="$1"
    local until="$2"
    local format="${3:-oneline}"

    echo "=== Searching Commits from $since to $until ==="

    git log --all --since="$since" --until="$until" \
        --pretty=format:"%C(yellow)%h%Creset - %C(cyan)%an%Creset, %C(green)%ad%Creset : %s" \
        --date=short --color=always
}
```

## Search by Jira Key

```bash
search_by_jira() {
    local jira_key="$1"
    local format="${2:-detailed}"

    echo "=== Searching Commits for Jira: $jira_key ==="

    git log --all --grep="$jira_key" \
        --pretty=format:"%C(yellow)%h%Creset - %C(cyan)%an%Creset, %C(green)%ar%Creset : %s%n%b%n" \
        --color=always
}
```

## Search by File Path

```bash
search_by_file() {
    local file_path="$1"
    local format="${2:-oneline}"

    echo "=== Searching Commits Affecting: $file_path ==="

    case "$format" in
        oneline)
            git log --all --follow --oneline --color=always -- "$file_path"
            ;;
        detailed)
            git log --all --follow --pretty=format:"%C(yellow)%h%Creset - %C(cyan)%an%Creset, %C(green)%ar%Creset : %s" --color=always -- "$file_path"
            ;;
        patch)
            git log --all --follow -p --color=always -- "$file_path"
            ;;
    esac
}
```

## Search by Commit Type

```bash
search_by_type() {
    local commit_type="$1"  # feat, fix, docs, etc.
    local limit="${2:-20}"

    echo "=== Searching $commit_type Commits ==="

    git log --all --grep="^$commit_type" --oneline --color=always -n "$limit"
}
```

## Generate Markdown Summary

```bash
generate_markdown_summary() {
    local query="$1"
    local output_file="${2:-COMMIT_SUMMARY.md}"

    echo "=== Generating Markdown Summary ==="

    cat > "$output_file" <<EOF
# Commit Search Results

**Query:** $query
**Date:** $(date +%Y-%m-%d)

## Commits

EOF

    # Get commits with details
    git log --all --grep="$query" --pretty=format:"- **%h** - %an, %ar : %s%n" >> "$output_file"

    cat >> "$output_file" <<EOF

## Timeline

\`\`\`
EOF

    git log --all --grep="$query" --pretty=format:"%ad - %h - %s" --date=short >> "$output_file"

    cat >> "$output_file" <<EOF
\`\`\`

## Files Changed

EOF

    git log --all --grep="$query" --name-only --pretty=format:"" | sort -u >> "$output_file"

    echo ""
    echo "✅ Summary generated: $output_file"
    cat "$output_file"
}
```

## Show Commit Statistics

```bash
show_commit_stats() {
    local query="$1"

    echo "=== Commit Statistics for: '$query' ==="
    echo ""

    # Total commits
    TOTAL=$(git log --all --grep="$query" --oneline | wc -l)
    echo "Total commits: $TOTAL"

    # Commits by author
    echo ""
    echo "Commits by author:"
    git log --all --grep="$query" --pretty=format:"%an" | sort | uniq -c | sort -rn

    # Commits over time
    echo ""
    echo "Commits by month:"
    git log --all --grep="$query" --pretty=format:"%ad" --date=format:"%Y-%m" | sort | uniq -c

    # Files most frequently changed
    echo ""
    echo "Most frequently changed files:"
    git log --all --grep="$query" --name-only --pretty=format:"" | sort | uniq -c | sort -rn | head -10
}
```

## Complete Search Workflow

```bash
#!/bin/bash
# Complete commit search workflow

SEARCH_TYPE="$1"
SEARCH_VALUE="$2"
FORMAT="${3:-detailed}"

if [ -z "$SEARCH_TYPE" ] || [ -z "$SEARCH_VALUE" ]; then
    echo "Usage: $0 <type> <value> [format]"
    echo ""
    echo "Search types:"
    echo "  message <text>         # Search commit messages"
    echo "  author <name>          # Search by author"
    echo "  jira <KEY-123>         # Search by Jira ticket"
    echo "  file <path>            # Search commits affecting file"
    echo "  type <feat|fix|...>    # Search by commit type"
    echo "  date <since> <until>   # Search by date range"
    echo ""
    echo "Formats:"
    echo "  oneline    # Short format (hash + message)"
    echo "  detailed   # Detailed format (hash, author, date, message)"
    echo "  full       # Full format with stats"
    echo "  markdown   # Generate markdown summary"
    echo ""
    echo "Examples:"
    echo "  $0 jira PROJ-123 detailed"
    echo "  $0 author \"John Doe\" oneline"
    echo "  $0 file src/auth.js patch"
    echo "  $0 type feat oneline"
    exit 1
fi

echo "╔════════════════════════════════════════╗"
echo "║  SPICE Commit Search                   ║"
echo "╚════════════════════════════════════════╝"
echo ""

case "$SEARCH_TYPE" in
    message)
        search_by_message "$SEARCH_VALUE" "$FORMAT"

        if [ "$FORMAT" = "markdown" ]; then
            generate_markdown_summary "$SEARCH_VALUE"
        fi
        ;;

    author)
        SINCE="$FORMAT"  # Reuse format param for since date
        UNTIL="$4"
        search_by_author "$SEARCH_VALUE" "$SINCE" "$UNTIL"
        ;;

    jira)
        search_by_jira "$SEARCH_VALUE" "$FORMAT"

        if [ "$FORMAT" = "markdown" ]; then
            generate_markdown_summary "$SEARCH_VALUE"
        fi
        ;;

    file)
        search_by_file "$SEARCH_VALUE" "$FORMAT"
        ;;

    type)
        LIMIT="${FORMAT:-20}"
        search_by_type "$SEARCH_VALUE" "$LIMIT"
        ;;

    date)
        UNTIL="$FORMAT"  # Reuse format param for until date
        search_by_date_range "$SEARCH_VALUE" "$UNTIL" "detailed"
        ;;

    stats)
        show_commit_stats "$SEARCH_VALUE"
        ;;

    *)
        echo "ERROR: Unknown search type: $SEARCH_TYPE"
        exit 1
        ;;
esac

echo ""
echo "=== Search Complete ==="
echo ""
```

## Common Issues and Solutions

### Issue: Too many results, need to narrow down

**Cause:** Broad search query

**Solution:**
```bash
# Combine multiple filters
git log --all \
    --grep="auth" \
    --author="John" \
    --since="2024-01-01" \
    --oneline

# Limit results
git log --grep="auth" -n 10 --oneline
```

### Issue: Can't find commit by partial message

**Cause:** grep requires regex pattern

**Solution:**
```bash
# Use case-insensitive search
git log --all -i --grep="authentication"

# Use wildcards
git log --all --grep="auth.*oauth"
```

### Issue: Need to find when bug was introduced

**Cause:** Need to bisect commits

**Solution:**
```bash
# Use git bisect for systematic search
git bisect start
git bisect bad HEAD
git bisect good v1.0.0

# Test each commit automatically
git bisect run npm test
```

## Validation Checklist

When searching commits, consider:

- [ ] Search query specific enough to avoid too many results
- [ ] Appropriate format chosen (oneline vs detailed)
- [ ] Date range specified if needed
- [ ] File path correct (use --follow for renamed files)
- [ ] Results reviewed for relevance
- [ ] Summary generated if needed for documentation

## Integration with SPICE Workflow

This skill integrates at key points:

1. **Bug Investigation**: Find when and where bugs were introduced
2. **Feature History**: Track feature development across commits
3. **Code Review**: Review commit history before merging
4. **Auditing**: Generate reports of changes by author/date/ticket

Efficient commit searching enables rapid debugging, historical analysis, and accountability tracking across the development lifecycle.

## References

- SPICE Git Standards: `~/.claude/docs/spice/SPICE-Git-Flow.md`
- Commit Message Standards: `~/.claude/skills/spice/GIT_COMMIT.md`
- Git Log Documentation: https://git-scm.com/docs/git-log
