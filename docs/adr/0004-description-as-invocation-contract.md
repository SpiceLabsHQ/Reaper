# ADR-0004: Description Field as the Sole Invocation Contract

**Date**: 2026-02-18
**Status**: Accepted

---

## Context

When Claude selects a tool — an agent, skill, or command — for a given task, the only information available at decision time is the tool's name and its `description` frontmatter field. The tool's body (system prompt, workflow steps, skill content) is not loaded until after the invocation decision is made.

This creates a structural fact: the `description` field *is* the invocation contract. It is the complete signal Claude has when deciding whether to use the tool.

The consequence of misunderstanding this: authors write "When to Use" and "When NOT to Use" sections in the tool body, believing they guide Claude's selection behavior. They do not. Those sections are only visible to the agent *after* it has already been invoked — at which point they may influence how the agent behaves, but they cannot influence whether it was the right tool to call.

`reaper:workflow-planner` has this problem today:

```markdown
## Quick Reference

### When to Use
- Complex features with multiple components
- Analyzing parallel development opportunities
- Integration risk assessment
- Breaking large tasks into context-safe packages

### When NOT to Use
- Simple single-component tasks or urgent hotfixes
- Well-understood work already properly sized (<5 files, <500 LOC)
```

This content is invisible during tool selection. The "When NOT to Use" guidance — which would be especially valuable for steering Claude *away* from the planner on small tasks — never reaches the decision that determines whether the planner is invoked at all.

---

## Decision

**The `description` field is the sole source of truth for invocation decisions.**

All guidance about when a tool should or should not be invoked must live in the `description` field. "When to Use" sections in the tool body are structurally incapable of influencing invocation and must not be written as if they can.

### What belongs in the description

A complete description answers three questions:

1. **What does this tool do?** — The tool's core capability in concrete terms. Not its category, not its methodology — what it actually produces or accomplishes.
2. **When should it be invoked?** — The trigger conditions: task types, request patterns, signals that indicate this is the right tool.
3. **When should it *not* be invoked?** — Disambiguation from similar tools, explicit exclusions, and anti-triggers. This is especially important for tools that share overlapping domains.

**Examples** are the most powerful mechanism for trigger conditioning. A well-formed example provides a realistic user request, the correct invocation decision, and a brief rationale. Claude uses examples as pattern templates — they teach when to invoke far more reliably than prose lists.

Reaper's existing agent descriptions already apply this pattern:

```
description: Performs security-focused code review using scanning tools (Trivy, Semgrep,
TruffleHog). Requires plan context as input. Focuses EXCLUSIVELY on security - does NOT
review general code quality. Does NOT run tests unless investigating a specific security
concern. Examples: <example>...</example> <example>...</example>
```

The description covers capability, explicit exclusions, and examples — all in the only field Claude reads before deciding.

### What does not belong in the body

Any section whose purpose is to guide the invocation decision — whether framed as "When to Use", "Use Cases", "Quick Reference", "Trigger Conditions", or similar — must not appear in the tool body.

These sections are not harmful at runtime (an agent can read them once invoked), but they create a false belief that they guide selection. Authors who write them believe they've documented the invocation contract; they have not. The documentation is a dead letter.

If the intent is to guide the agent's *behavior after invocation* — for example, helping the agent self-verify it received an appropriate task — that content may remain in the body, but it must be framed as a post-invocation check, not as invocation guidance.

### Description quality standards

A description is insufficient if:

- It describes the tool's methodology without stating what it produces (`"Uses TDD methodology"` — produce what?)
- It names the tool's domain without specifying scope (`"Handles database concerns"` — which ones? all of them?)
- It omits discrimination from the tool most likely to be confused with this one
- It lists trigger conditions only as prose without examples

A description is sufficient if a reader with no prior knowledge of the tool can determine, from the description alone, whether it is the right tool for a given task.

---

## Compliance

For any new or modified tool, the author must confirm:

- [ ] All invocation guidance (when to use, when not to use, trigger conditions) is in the `description` field
- [ ] The description states what the tool produces or accomplishes in concrete terms
- [ ] The description includes at least one example demonstrating a correct invocation
- [ ] The description discriminates from the tool most likely to be confused with this one
- [ ] Any "When to Use" / "When NOT to Use" section in the body has been removed or reframed as a post-invocation self-check

For existing tools, any "When to Use" section in the body should be evaluated: if the content is not already represented in the description, it must be migrated there before being removed from the body.

**Known violation to remediate:** `reaper:workflow-planner` — "When NOT to Use" content in body is not reflected in the description. The exclusion criteria (simple tasks, well-understood work) must be added to the description field.

---

## Consequences

**Positive:**
- Authors write invocation guidance where it actually works — in the `description` field
- Tool selection improves because all relevant context is present at decision time
- Body content stays focused on post-invocation behavior, not pre-invocation guidance
- The false belief that body sections influence selection is eliminated by explicit rule

**Negative / Risks:**
- Descriptions grow longer to accommodate exclusion criteria and examples; this is intentional and correct
- Descriptions that were previously thin must be rewritten — migration cost for existing tools
- The distinction between "post-invocation self-check" and "invocation guidance" requires author judgment; not always clear-cut

---

## Alternatives Considered

**Allow "When to Use" sections in the body as supplementary documentation** — Even if they don't affect invocation, they might help human readers. Rejected because the confusion cost outweighs the documentation value. Humans reading the body already have access to the description; the body section adds no information. Worse, it trains authors to write invocation guidance in the wrong place.

**Move invocation guidance to a separate metadata field** — A `triggers` or `use_when` field in frontmatter. Rejected because the `description` field already serves this purpose and is the field Claude actually reads. Splitting the concern across fields adds complexity without benefit.

**Auto-generate descriptions from body content** — Extract "When to Use" sections at build time and inject them into descriptions. Rejected because it preserves the structural confusion rather than resolving it: authors would still write invocation guidance in the wrong place, just with a build-time patch.
