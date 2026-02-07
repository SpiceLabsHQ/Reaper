# src/ Directory - Agent Template System

This directory contains the template system for generating Reaper agent definitions. It uses EJS (Embedded JavaScript) templates to enable DRY (Don't Repeat Yourself) agent authoring while maintaining consistency across all agents.

## Directory Structure

```
src/
├── README.md              # This file
├── partials/              # Reusable template fragments
│   ├── pre-work-validation-coding.ejs    # Validation for coding agents
│   ├── pre-work-validation-review.ejs    # Validation for review agents
│   ├── directory-exclusions.ejs          # Standard directory exclusions
│   ├── output-requirements.ejs           # JSON output requirements
│   ├── git-prohibitions.ejs              # Git operation prohibitions
│   ├── tdd-testing-protocol.ejs          # TDD testing protocol
│   ├── artifact-cleanup-coding.ejs       # Cleanup for coding agents
│   ├── artifact-cleanup-review.ejs       # Cleanup for review agents
│   ├── file-conflict-detection.ejs       # Strategy 2 conflict detection
│   └── no-commits-policy.ejs             # No commits policy for agents
└── templates/             # Full agent templates (future)
```

## Partials Overview

### Pre-Work Validation Partials

| Partial | Agent Type | Purpose |
|---------|------------|---------|
| `pre-work-validation-coding.ejs` | Coding agents | Validates TASK, WORKTREE_PATH, DESCRIPTION |
| `pre-work-validation-review.ejs` | Review agents | Validates TASK, WORKING_DIR, PLAN_CONTEXT, TEST_RUNNER_RESULTS |

### Common Sections

| Partial | Purpose |
|---------|---------|
| `directory-exclusions.ejs` | Patterns to exclude when running tests/linting |
| `output-requirements.ejs` | Requirements for JSON output (no report files) |
| `git-prohibitions.ejs` | Prohibited git commands for coding agents |
| `tdd-testing-protocol.ejs` | TDD testing scope and methodology |
| `file-conflict-detection.ejs` | Detecting concurrent edits in Strategy 2 |
| `no-commits-policy.ejs` | Why coding agents never commit |

### Artifact Cleanup Partials

| Partial | Agent Type | Purpose |
|---------|------------|---------|
| `artifact-cleanup-coding.ejs` | Coding agents | Cleanup coverage, test cache, linter artifacts |
| `artifact-cleanup-review.ejs` | Review agents | Cleanup build, type-check artifacts |

## Usage (Future)

When the template build system is complete, agents will be generated from templates like:

```ejs
---
name: bug-fixer
description: ...
---

You are a Bug Fixer Agent...

<%- include('partials/pre-work-validation-coding') %>

<%- include('partials/directory-exclusions') %>

<%- include('partials/output-requirements') %>

<%- include('partials/git-prohibitions') %>

## TDD Bug-Fixing Methodology
...

<%- include('partials/tdd-testing-protocol') %>

<%- include('partials/artifact-cleanup-coding') %>

<%- include('partials/file-conflict-detection') %>

<%- include('partials/no-commits-policy') %>

## REQUIRED JSON OUTPUT STRUCTURE
...
```

## Content Guidelines

### Partials Should Be:
- Self-contained markdown sections
- No frontmatter (just content)
- Agent-agnostic where possible
- Consistent formatting and structure

### Partials Should NOT:
- Reference specific agent names
- Contain EJS syntax (until template rendering is implemented)
- Include agent-specific examples (unless the partial is agent-type-specific)

## Maintenance

When updating shared sections:
1. Edit the partial in `src/partials/`
2. Rebuild all agents using the template system
3. Verify consistency across generated agents
