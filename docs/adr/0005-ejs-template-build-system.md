# ADR-0005: EJS Template Build System

**Date**: 2026-02-18
**Status**: Accepted

---

## Context

Reaper generates dozens of agent, command, skill, and hook files that share large sections of content. The TDD testing protocol appears in every coding agent. The output contract format appears in every agent that reports through quality gates. Git prohibitions, visual vocabulary, plan file schemas, and validation preambles recur across multiple file types.

Without a shared template system, this content is duplicated verbatim in every file that needs it. A change to the output contract format requires editing every agent file individually. A new partial — say, a directory exclusion list — must be copy-pasted into each consumer. At the current scale (30+ agents, 7+ commands, multiple skills and hooks), this duplication creates three problems:

1. **Drift**: Independent copies diverge silently. One agent gets the updated output contract; three others retain the old version. No mechanism detects the inconsistency.

2. **Maintenance burden**: A single shared-section change requires touching every file that contains it. The cost scales linearly with the number of consumers, making improvements increasingly expensive.

3. **Onboarding friction**: New agents must be assembled by copying sections from existing agents. Contributors must know which sections are required for which agent type — knowledge that lives in tribal memory, not in the system.

A static-markdown approach (no build step, each file is its own source of truth) eliminates build complexity but accepts all three problems as permanent costs.

---

## Decision

We adopt EJS (Embedded JavaScript) as the template engine for all generated plugin files, with a build step that compiles source templates to their output locations.

### Template engine: EJS

EJS supports `<%- include('partials/tdd-testing-protocol') %>` syntax for composing files from shared fragments. It handles conditionals (`<% if (isCodingAgent) { %>`) and loops, enabling parameterized partials — a single partial can render differently based on the consuming template's context.

EJS was chosen over alternatives because it handles arbitrary markdown prose naturally (agent prompts are primarily long-form text, not structured data) and requires no additional abstraction layer between the template and the output.

### Source directory: `src/`

All templates live under `src/`:

- `src/agents/*.ejs` — agent system prompts
- `src/commands/*.ejs` — orchestration command prompts
- `src/skills/**/*.ejs` — skill documentation and workflow files
- `src/skills/**/*.sh` — shell scripts (copied verbatim, not compiled)
- `src/hooks/*.ejs` — hook configuration templates
- `src/partials/*.ejs` — shared content fragments (not compiled independently)

`src/` is the authoritative source. The generated files at the project root (`agents/`, `commands/`, `skills/`, `hooks/`) are build artifacts.

### Partials as the deduplication mechanism

Shared content sections are extracted into `src/partials/*.ejs`. Each partial encapsulates one concern: TDD protocol, output requirements, git prohibitions, visual vocabulary, validation preambles, and others. Templates compose from partials using EJS includes with optional parameters:

```ejs
<%- include('partials/output-requirements', { isReviewAgent: true }) %>
<%- include('partials/tdd-testing-protocol') %>
```

A change to any partial propagates to all consuming templates at the next build. No manual synchronization is required.

### Build-to-root convention

Generated files are compiled to the project root — not to a `dist/` directory. This preserves the directory structure that Claude Code's plugin loader expects: `agents/*.md`, `commands/*.md`, `skills/**/*.md`, `hooks/hooks.json`. The plugin loader reads these paths directly; a `dist/` indirection would require loader configuration that does not exist.

### Pre-commit hook enforcement

A pre-commit hook runs the build and stages generated files before every commit. This prevents generated files from drifting out of sync with their source templates. If a contributor edits a source template and commits, the hook ensures the corresponding generated file is rebuilt and included in the same commit.

### Contract tests

`scripts/contracts.test.js` validates structural and semantic invariants of the generated output: valid YAML frontmatter, no EJS residue (`<%` tags) in output, no unresolved template variables, correct hooks.json schema, and semantic checks per agent category (e.g., coding agents contain the TDD protocol section). These tests run post-build and catch silent compilation failures that would otherwise ship broken agent prompts.

---

## Consequences

**Positive:**
- Single source of truth for shared content — one edit propagates to all consumers
- Contract tests catch build regressions before they reach production
- New agents compose from existing partials in minutes rather than hours of copy-paste
- Parameterized partials support variation without duplication (e.g., coding vs. review output contracts)
- The pre-commit hook eliminates the class of bugs where source and generated files diverge

**Negative / Risks:**
- Contributors must learn to edit source templates in `src/`, never generated files at the root — violating this produces changes that are silently overwritten on the next build
- The pre-commit hook adds build time to every commit (a few seconds in practice)
- The "never edit generated files" discipline requires documentation and enforcement; the contract tests catch EJS residue but cannot detect a contributor who edits a generated file and skips the hook
- EJS syntax in markdown templates can reduce readability of the source files, particularly for templates with heavy conditional logic

---

## Alternatives Considered

**Static markdown files (no build step)** — Each file is self-contained. No build tooling, no template syntax, no compilation step. Rejected because shared content must be duplicated in every consumer file. At 30+ agents with 15+ partials, the maintenance burden and drift risk are unsustainable. This directly contradicts the project's correctness value: silent inconsistency between files is a category of bug that static markdown cannot prevent.

**YAML configuration with a custom renderer** — Define agent structure in YAML, render markdown from structured data. More explicit about which sections an agent includes. Rejected because agent prompts are primarily long-form prose, not structured fields. Forcing prose into YAML values creates awkward multiline strings and loses the ability to read the template as a document. EJS preserves the prose-first nature of the content.

**Handlebars or Mustache** — Similar template composition with `{{> partial}}` syntax. Rejected because Handlebars is intentionally logic-less — it lacks conditionals and loops without registering helpers. Several Reaper partials require parameterization (e.g., `visual-vocabulary.ejs` accepts a context parameter that changes its output). EJS handles this natively; Handlebars would require custom helper registration for each parameterized partial.

**No build step with inline duplication** — Accept duplication as a cost and manage it through discipline and code review. Fastest to start, zero tooling overhead. Rejected because discipline does not scale: as the number of files grows, the probability that a shared-section change misses one consumer approaches certainty. The build system converts a discipline problem into a mechanical guarantee.

