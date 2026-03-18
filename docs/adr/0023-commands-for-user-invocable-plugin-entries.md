# ADR-0023: Commands for User-Invocable Plugin Entries

**Date**: 2026-03-18
**Status**: Accepted

---

## Context

Claude Code treats commands (`.claude/commands/`) and skills (`.claude/skills/`) as functionally equivalent in local project contexts — both create slash-command interfaces accessible via `/name`. However, this equivalence breaks down inside plugins.

Plugin-provided skills with `user-invocable: true` frontmatter do not reliably appear in the `/` autocomplete menu. Multiple GitHub issues confirm this behavior (#17509, #17496, #18949). The root cause is that when a skill has a `name` frontmatter field, Claude Code strips the plugin namespace prefix from the autocomplete entry, causing inconsistent or absent display. The skills still execute correctly when invoked by their full path (`/reaper:skill-name`), but they require the user to know the exact command name rather than discovering it through autocomplete.

Plugin-provided commands do appear in the `/` autocomplete menu, namespaced as `/plugin-name:command-name`.

Reaper's user-invocable surface (flight-plan, takeoff, ship, squadron, start, status-worktrees, claude-sync, configure-quality-gates) is the primary interface through which developers interact with Reaper. Discoverability is a first-class UX concern — developers should be able to type `/` and see available commands without prior knowledge.

Dynamic context injection (the `` !`command` `` backtick syntax for executing shell commands before Claude receives the prompt) works identically in both commands and skills.

---

## Decision

All user-invocable Reaper entries are implemented as **commands** (`src/commands/`), not skills.

Skills are reserved for entries that Claude invokes internally (via its `description` field matching) where autocomplete visibility is irrelevant or undesirable.

---

## Consequences

**Positive:**

- User-invocable commands appear in `/` autocomplete, making Reaper discoverable without prior knowledge of command names.
- Dynamic context injection remains available — the `` !`command` `` syntax works in command files.
- The existing `src/commands/` structure is preserved. No migration required.

**Negative / Risks:**

- Commands lack some skill-specific features: supporting file directories, nested discovery in monorepos, and per-skill hook scoping. If these features become necessary for user-invocable entries, this decision must be revisited.
- This distinction is not obvious from Claude Code's documentation, which presents commands and skills as equivalent. New contributors may place user-invocable entries in `src/skills/` where they will lose autocomplete visibility. This ADR documents the rule explicitly to prevent drift.

---

## Alternatives Considered

**Skills for all entries** — Implement user-invocable entries as skills to access skill-specific features (supporting files, nested discovery). Rejected because plugin skills do not appear in autocomplete, which degrades discoverability for Reaper's primary user interface.

**Mixed approach by feature need** — Use skills when supporting files are required, commands otherwise. Rejected because the autocomplete gap is not feature-dependent — all plugin skills are affected regardless of frontmatter configuration. A mixed approach would create inconsistent UX (some Reaper commands discoverable, others not) without a principled rule developers can follow.

---

## Related Decisions

- **ADR-0003: Semantic Tool Naming** — Applies to command naming conventions; this ADR governs where those commands live.
