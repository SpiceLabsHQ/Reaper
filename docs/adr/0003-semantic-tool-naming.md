# ADR-0003: Semantic Tool Naming

**Date**: 2026-02-18
**Status**: Accepted

---

## Context

As Reaper's tool roster grew — agents, commands, skills, hooks — naming decisions became implicit. No rule said what made a good name, so no rule prevented a bad one.

The specific pressure that surfaced this gap: when asked to design new tools, Claude (the model building Reaper) sometimes reached for names that were generic, abbreviated, or internally coherent only to the session that created them. A name like `helper` or `tracker` or `agent-2` tells a future reader nothing. Even well-intentioned names without a pattern fail to compose: a reader can't guess that `issue-tracker-beads`, `issue-tracker-github`, and `issue-tracker-jira` are related by looking at any one of them alone.

The `issue-tracker-*` skills demonstrate the positive pattern. A shared semantic prefix makes the family visible at a glance; the suffix names the platform. A reader who knows `issue-tracker-beads` can predict `issue-tracker-jira` exists without checking.

This ADR establishes naming as a first-class constraint — not a style guide, but a structural rule with a compliance test.

---

## Decision

**Tool names must be semantic.** A name is semantic when a reader unfamiliar with the implementation can determine the tool's purpose or role from the name alone — without reading documentation, source, or asking the author.

### Two valid naming patterns

**1. Role/noun (preferred)**

Name the tool after what it *is*: the role it plays or the resource it manages.

| Tool | Reads as |
|------|----------|
| `security-auditor` | An auditor who specializes in security |
| `database-architect` | An architect for database concerns |
| `worktree-manager` | A manager for git worktrees |
| `issue-tracker-beads` | An issue tracker backed by Beads |
| `branch-manager` | A manager for git branches |

The role/noun pattern works because it anchors the name to a stable identity. The tool's *behavior* may evolve; its *role* rarely does.

**2. Thematic-semantic (permitted)**

Names that evoke purpose through a consistent metaphor are acceptable when the metaphor maps clearly to the action — and when the metaphor is already established in the system.

| Tool | Reads as |
|------|----------|
| `flight-plan` | Plan your work before executing |
| `takeoff` | Execute the plan |
| `ship` | Deliver completed work |
| `squadron` | Assemble a team of experts |

Thematic names require the metaphor to earn its meaning. A new reader who encounters `takeoff` and `flight-plan` in the same system can infer the relationship. A tool named `soar` or `altitude` in the same system would break that inference. Thematic names are only semantic within an established theme; isolated thematic names are not.

### Semantic prefixes for related tools

When multiple tools share a domain or protocol, they must use a shared semantic prefix. The prefix names the category; the suffix names the variant.

```
issue-tracker-beads
issue-tracker-github
issue-tracker-jira
issue-tracker-planfile
```

A reader who knows one member of the family can predict the others. Prefix-based naming also produces correct sort order in any alphabetical listing, grouping related tools without additional organization.

### Anti-patterns

The following naming patterns violate this rule:

| Anti-pattern | Examples | Why it fails |
|---|---|---|
| Ordinal suffixes | `agent-1`, `reviewer-2` | No meaning — just a count |
| Generic nouns | `helper`, `utils`, `processor`, `handler` | Says nothing about the domain |
| Abbreviations | `db-arch`, `sec-aud`, `wt-mgr` | Forces the reader to decode |
| Cute names without mapping | `spark`, `atlas`, `nova` | No inference path to function |
| Verb-only names | `run`, `check`, `fix` | Too broad; reads as an action, not an identity |
| Implementation-leaking names | `ejs-compiler`, `md-generator` | Names the mechanism, not the purpose |

---

## Compliance

A new or renamed tool name should answer **yes** to at least one of the following:

- [ ] Can a reader determine the tool's purpose or role from the name, without reading documentation?
- [ ] If thematic, does the metaphor map to an action already established in the system?
- [ ] If one of multiple related tools, does it share a semantic prefix with its siblings?

And **no** to all of the following:

- [ ] Does the name require reading source or documentation to understand?
- [ ] Does the name use an ordinal suffix (`-1`, `-2`) as a differentiator?
- [ ] Does the name abbreviate a longer, clearer term?
- [ ] Is it a generic noun that would apply equally well to a dozen other tools?

---

## Migration

Existing tool names are not automatically grandfathered. Names that fail the compliance test above should be flagged and evaluated individually. The bar for renaming is whether the confusion cost of the current name outweighs the migration cost of changing it — both are real. A rename decision must be made explicitly, not avoided indefinitely.

Known names to evaluate at next review: `refactoring-dev` (`dev` vs `developer` inconsistency), `claude-agent-architect` (`claude` as a brand qualifier vs. a domain qualifier).

---

## Consequences

**Positive:**
- New tools are nameable by a rule, not by intuition — consistent outcomes across sessions and authors
- Related tools cluster correctly in any listing without manual grouping
- Names document intent; documentation doesn't have to carry the full burden of discoverability
- The compliance checklist gives authors a concrete test to apply before committing a name

**Negative / Risks:**
- Thematic names require judgment about whether a metaphor "maps clearly" — the line isn't always bright
- Enforcing the rule retroactively on existing names requires migration work and coordination with downstream users of the tool

---

## Alternatives Considered

**No convention — rely on author judgment** — Rejected. The gap this ADR addresses *is* unguided author judgment. Without a documented rule, names are only as good as the session that produced them.

**Strict function-based naming only (no themes)** — Would require renaming `flight-plan`, `takeoff`, `ship`, and `squadron`. These names carry established meaning within Reaper's UX and their metaphors map consistently. Renaming them would destroy a coherent mental model without producing clearer names. Rejected.

**Enforce a single naming template** (e.g., always `<domain>-<role>`) — Too rigid. The `issue-tracker-*` family uses `<category>-<platform>`; the command family uses thematic verbs; agents use `<domain>-<title>`. A single template would force unnatural names on tools that don't fit the template. Rejected in favor of two valid patterns with a shared compliance test.
