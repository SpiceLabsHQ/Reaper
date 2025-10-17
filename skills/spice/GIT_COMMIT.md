---
name: git-commit
description: Writes SPICE-compliant commit messages following conventional commit format with verification. Automatically activates when creating commits or when commit message assistance is needed. Enforces type selection, 72-character limit, proper structure, and Jira reference format.
allowed-tools: [Bash, Read]
---

# SPICE Git Commit Message Skill

Automates creation of SPICE-compliant commit messages following conventional commit standards enforced by commitlint.

## Commit Message Format

```
<type>(<scope>): <subject> (max 72 characters)

<body>

Ref: JIRA-KEY
```

## Verification Protocol

**ALWAYS verify staged changes before writing commit message:**

1. Check staged files: `git status --short`
2. Review changes: `git diff --cached | head -50`
3. Analyze the ACTUAL changes to determine correct type and scope
4. Write message based on verified changes

## Commit Types

Select the appropriate type based on the actual changes:

- `feat`: New feature (triggers MINOR version bump)
- `fix`: Bug fix (triggers PATCH version bump)
- `docs`: Documentation only changes
- `style`: Formatting, whitespace, missing semi-colons (no code change)
- `refactor`: Code refactoring (no feature change or bug fix)
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build process, dependencies, tooling
- `ci`: CI/CD pipeline changes

## Breaking Changes

For breaking changes, add to footer:

```
BREAKING CHANGE: Description of breaking change
```

This triggers a MAJOR version bump.

## Scope

The scope should identify the affected module, component, or area:

- Examples: `auth`, `api`, `ui`, `database`, `config`, `docs`
- Use the most specific scope that accurately describes the change
- Omit scope if change affects multiple areas broadly

## Subject Line Rules

1. **Maximum 72 characters** (hard limit enforced by commitlint)
2. **Imperative mood**: "add" not "added", "fix" not "fixed"
3. **No period** at the end
4. **Lowercase** after the colon
5. **No Jira key** in subject (goes in footer only)

## Body

- Explain WHAT changed and WHY, not HOW
- Wrap at 72 characters per line
- Separate from subject with blank line
- Can be multiple paragraphs
- Use bullet points for multiple changes

## Footer

**REQUIRED**: Include Jira reference in footer:

```
Ref: PROJ-123
```

If no Jira ticket exists, document why:

```
Ref: N/A (emergency hotfix)
```

## Common Mistakes to Avoid

❌ **Subject too long**
```
feat(auth): add OAuth2 integration with Google and GitHub providers for user authentication
```

✅ **Correct**
```
feat(auth): add OAuth2 integration

Implements OAuth2 authentication with Google and GitHub providers.
Includes token refresh and session management.

Ref: PROJ-123
```

❌ **Jira key in subject**
```
feat(auth): add OAuth2 PROJ-123
```

✅ **Correct**
```
feat(auth): add OAuth2

Ref: PROJ-123
```

❌ **Wrong type**
```
chore(api): add user registration endpoint
```

✅ **Correct** (new endpoint is a feature, not chore)
```
feat(api): add user registration endpoint
```

## Validation Checklist

Before writing commit message, verify:

- [ ] Ran `git status --short` to see staged files
- [ ] Ran `git diff --cached` to review actual changes
- [ ] Selected correct type based on actual changes
- [ ] Subject line ≤ 72 characters
- [ ] Subject uses imperative mood
- [ ] Scope accurately describes affected area
- [ ] Body explains WHY, not just WHAT
- [ ] Jira reference in footer (or documented reason for absence)
- [ ] No breaking change footer unless API/interface changed

## Example Workflow

```bash
# 1. Verify staged changes
git status --short
# Output shows: M src/auth.js, M tests/auth.test.js

# 2. Review actual changes
git diff --cached | head -50
# Changes show: added OAuth2 provider integration

# 3. Write verified commit message
feat(auth): add OAuth2 provider support

Integrates OAuth2 authentication for Google and GitHub.
Includes token management and refresh flow.

Ref: AUTH-456
```

## Integration with SPICE Workflow

This skill automatically activates when:

- User requests commit creation
- Agent needs to write commit message
- Commit message validation is required

The skill ensures all commits follow SPICE standards and pass commitlint validation before hooks execute.
