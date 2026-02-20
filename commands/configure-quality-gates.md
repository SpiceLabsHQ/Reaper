---
description: Detect and configure quality gate test and lint commands for this project.
---

# Configure Quality Gates

<!-- user-comms-contract -->

## User Communication Contract

Speak about work outcomes and progress — never about internal machinery, tool names, or implementation steps.

### Forbidden Terms

Do not use any of the following in user-facing messages, status cards, or progress output:

**Abstract operation names** — replace with plain language:

| Forbidden | Use instead |
|-----------|-------------|
| `FETCH_ISSUE` | "retrieving task details" or "looking up the issue" |
| `CREATE_ISSUE` | "creating a task" or "logging the issue" |
| `UPDATE_ISSUE` | "updating the task" or "recording progress" |
| `ADD_DEPENDENCY` | "linking a dependency" |
| `LIST_CHILDREN` | "listing subtasks" |
| `QUERY_DEPENDENCY_TREE` | "checking dependencies" |
| `CLOSE_ISSUE` | "marking the task complete" |

**Internal state variables** — omit or rephrase:

| Forbidden | Use instead |
|-----------|-------------|
| `TASK_SYSTEM` / `markdown_only` | "your project's task tracking setup" |
| `PLAN_CONTEXT` | "the task requirements" or "the plan" |
| `CODEBASE CONTEXT` | "the codebase" |

**Internal file sentinels** — never surface raw filenames:

`RESULTS.md`, `REVIEW.md`, `SECURITY.md`, `FAULT.md`, `TASK.md`

**Tool names** — never expose tool internals as user language:

| Forbidden | Use instead |
|-----------|-------------|
| `TaskCreate` | "tracking progress" or "updating the work plan" |
| `TaskUpdate` | "recording progress" |

**Architecture terms** — omit entirely:

`platform skill routing`, `behavioral contract`, `skill routing table`, `gate classification internals`

### Tone Rule

Describe what is happening for the user ("running tests", "planning the feature", "reviewing security") — not what the system is doing internally ("routing to skill", "resolving TASK_SYSTEM", "invoking TaskCreate").


Detect the test runner and linter for this project, confirm the commands with the user, and write a `## Quality Gates` section to `CLAUDE.md`.

---

## Detection

Scan the project root to identify available test runners and linters. Work through each ecosystem in order and collect every candidate command found.

### JavaScript / TypeScript

```bash
# Read package.json scripts if it exists
if [ -f "package.json" ]; then
    cat package.json
fi
```

Inspect the `scripts` section of `package.json`. Record entries whose keys contain `test`, `lint`, `check`, or `coverage`. Identify the underlying runner from the script body:

- **Test runners**: jest, vitest, mocha, tap, ava, node --test
- **Linters**: eslint, prettier, biome, oxlint

Preferred test command: the `test` script entry, or the first script whose key starts with `test`.
Preferred lint command: the `lint` script entry, or the first script whose key starts with `lint`.

### Python

```bash
# Check for pytest configuration
[ -f "pytest.ini" ] && echo "pytest.ini found"
[ -f "pyproject.toml" ] && grep -l "\[tool\.pytest" pyproject.toml 2>/dev/null && echo "pyproject.toml [tool.pytest] found"
[ -f "setup.cfg" ] && grep -l "\[tool:pytest\]" setup.cfg 2>/dev/null && echo "setup.cfg [tool:pytest] found"
[ -f "ruff.toml" ] && echo "ruff.toml found"
[ -f "pyproject.toml" ] && grep -l "\[tool\.ruff\]" pyproject.toml 2>/dev/null && echo "pyproject.toml [tool.ruff] found"
[ -f "pyproject.toml" ] && grep -l "\[tool\.pylint\]" pyproject.toml 2>/dev/null && echo "pyproject.toml [tool.pylint] found"
```

- If any pytest config is found: test command = `pytest`
- If `ruff.toml` or `[tool.ruff]` section found: lint command = `ruff check .`
- If `[tool.pylint]` found and no ruff: lint command = `pylint .`
- If `pyproject.toml` has `[tool.black]`: may be used as formatter (note separately)

### Go

```bash
[ -f "go.mod" ] && echo "go.mod found"
[ -f "Makefile" ] && grep -E "^(test|lint|check):" Makefile 2>/dev/null && echo "Makefile targets found"
```

- If `go.mod` exists: test command = `go test ./...`
- If `Makefile` has a `lint:` target: lint command = `make lint`
- If `golangci-lint` appears in `Makefile`: lint command = `golangci-lint run`

### Rust

```bash
[ -f "Cargo.toml" ] && echo "Cargo.toml found"
```

- If `Cargo.toml` exists: test command = `cargo test`, lint command = `cargo clippy`

### Makefile fallback

```bash
[ -f "Makefile" ] && grep -E "^(test|lint|check):" Makefile 2>/dev/null
```

If no ecosystem-specific config was found but a `Makefile` exists with `test:`, `lint:`, or `check:` targets, use those as candidates.

---

## Approval Flow

### Step 1: Check for existing configuration

Before prompting the user, check whether the project's `CLAUDE.md` already contains a `## Quality Gates` section. CLAUDE.md content is available in the loaded context — read it now.

If a `## Quality Gates` section exists:

- Extract the current `**Test command**` and `**Lint command**` values.
- Show them to the user.
- Ask whether to keep the existing configuration or update it:

```json
{
  "questions": [{
    "question": "A Quality Gates section already exists in CLAUDE.md. What would you like to do?",
    "header": "Existing Configuration Found",
    "options": [
      {
        "label": "Keep current configuration",
        "description": "Leave the existing test and lint commands unchanged."
      },
      {
        "label": "Update configuration",
        "description": "Replace the existing values with newly detected or manually entered commands."
      }
    ],
    "multiSelect": false
  }]
}
```

If the user selects **Keep current configuration**, stop here and confirm that no changes were made.

If the user selects **Update configuration**, continue to Step 2.

If no `## Quality Gates` section exists, proceed directly to Step 2.

### Step 2: Present detected commands

Build a summary of what was detected. If commands were found for multiple ecosystems, list all candidates and indicate which will be used as the recommendation (prefer the most specific over Makefile fallback).

Present the detected commands to the user for confirmation:

```json
{
  "questions": [{
    "question": "The following commands were detected. Would you like to use them, or enter custom commands instead?",
    "header": "Detected Quality Gate Commands",
    "options": [
      {
        "label": "Use detected commands",
        "description": "Test: <detected-test-command>\nLint: <detected-lint-command>"
      },
      {
        "label": "Enter commands manually",
        "description": "Type in test and lint commands yourself."
      },
      {
        "label": "Skip lint (lint: skip)",
        "description": "No lint command for this project. Suppresses the missing-lint warning during automated runs."
      }
    ],
    "multiSelect": false
  }]
}
```

Replace `<detected-test-command>` and `<detected-lint-command>` with the actual commands found. If nothing was detected for an ecosystem, say "Not detected" for that slot.

### Step 3: Handle manual entry

If the user selects **Enter commands manually**, ask them to provide each value. Accept any non-empty string. `lint: skip` is a valid lint command value — it suppresses the missing-lint warning during automated quality gate runs.

```json
{
  "questions": [
    {
      "question": "What command should be used to run tests?",
      "header": "Test Command",
      "placeholder": "e.g. npm test, pytest, go test ./..."
    },
    {
      "question": "What command should be used for linting? Enter 'skip' to suppress the lint warning.",
      "header": "Lint Command",
      "placeholder": "e.g. npm run lint, ruff check ., skip"
    }
  ]
}
```

### Step 4: Final confirmation

Display the resolved commands and ask for final approval before writing anything:

```json
{
  "questions": [{
    "question": "Write these commands to CLAUDE.md?",
    "header": "Confirm Quality Gate Commands",
    "options": [
      {
        "label": "Yes, write to CLAUDE.md",
        "description": "Test: <final-test-command>\nLint: <final-lint-command>"
      },
      {
        "label": "No, cancel",
        "description": "Exit without making any changes."
      }
    ],
    "multiSelect": false
  }]
}
```

Replace `<final-test-command>` and `<final-lint-command>` with the actual values from Steps 2 or 3.

If the user selects **No, cancel**, stop here and confirm that no changes were made.

---

## CLAUDE.md write

### If no existing `## Quality Gates` section

Append the following block to the end of `CLAUDE.md`:

```markdown

## Quality Gates

The following commands are used during automated quality gates:

**Test command**: `<final-test-command>`
**Lint command**: `<final-lint-command>`
```

Preserve all existing content. Append after the last line, preceded by a blank line if the file does not already end with one.

### If an existing `## Quality Gates` section is present

Replace the existing section in-place. Locate the `## Quality Gates` heading and replace everything from that heading up to (but not including) the next `##`-level heading (or end of file if none follows). Write the replacement block:

```markdown
## Quality Gates

The following commands are used during automated quality gates:

**Test command**: `<final-test-command>`
**Lint command**: `<final-lint-command>`
```

Do not modify any other part of `CLAUDE.md`.

---

## Commit

After writing `CLAUDE.md`, commit the change:

```bash
git add CLAUDE.md
git commit -m "chore(config): add quality gate commands to CLAUDE.md"
```

No `Ref:` footer. This is a configuration commit, not tied to a feature task.

Confirm success by reporting:
- Which commands were written
- Whether the section was appended or updated in-place
- The commit hash

---

## Scope Boundary

This command:
- Detects and configures quality gate commands only
- Writes only to `CLAUDE.md` — no other files are modified
- Does not run the detected commands
- Does not validate whether the commands actually work
- Does not configure CI or any external system

---

## Error Handling

<!-- user-comms: say "couldn't find a test runner" not "no test runner detected" when speaking to the user -->
- **No test runner detected**: Inform the user that no known test configuration was found, then offer manual entry as the only option.
- **No lint tool detected**: Offer the `skip` option as the default recommendation.
- **CLAUDE.md not found**: Create `CLAUDE.md` with only the `## Quality Gates` section. Inform the user that the file was created.
- **Multiple ecosystems detected**: List all candidates, recommend the most specific one (language-native over Makefile), and let the user confirm or override.
- **Commit fails**: Report the error. The `CLAUDE.md` write has already succeeded — advise the user to commit manually with `git add CLAUDE.md && git commit -m "chore(config): add quality gate commands to CLAUDE.md"`.
