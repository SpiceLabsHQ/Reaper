# ADR-0006: Output Boundary — Separating Internal Values from Generated Content

**Date**: 2026-02-18
**Status**: Accepted

---

## Context

Reaper is a Claude Code plugin with its own opinionated design values — the Five Keys (Correctness, Transparency, Craft, Conviction, Fun). These values guide how Reaper itself is built, from architecture decisions to error message tone.

Reaper produces three categories of content: user-facing commands, agent system prompts, and generated output that operates on target projects (the user's codebase). The risk is that Reaper's internal philosophy leaks across these boundaries.

If Reaper embeds Five Keys language, themed terminology, or its own conventions into agent prompts or generated output that guides work on target codebases, three problems emerge:

1. **Convention friction**: Teams with their own established conventions (commit formats, testing strategies, code style) receive Reaper-flavored guidance that conflicts with their practices. The tool imposes its opinions where it has no authority.

2. **Reduced portability**: Generated content becomes Reaper-specific rather than following general software development best practices. Agents, skills, and commands that reference "the Five Keys" or "Reaper conventions" are useless outside the Reaper ecosystem.

3. **Tool-project conflation**: The separation between the tool (Reaper) and the project it operates on breaks down. Reaper's job is to orchestrate development work effectively — not to evangelize its own design philosophy through the agents it deploys.

The "Fun" key presents a specific risk. It encourages themed language and personality in developer-facing UX — appropriate when the audience is a human using Reaper's commands. But agent prompts are machine-consumed instructions. Themed language in a system prompt introduces ambiguity (is "reap the benefits" a metaphor or a command?), wastes tokens on flavor text that provides no behavioral signal, and degrades output quality when the model pattern-matches on tone rather than specification.

---

## Decision

Reaper adopts a **three-tier voice model** that maps content categories to appropriate voice registers.

### Tier 1: User-facing commands and skills

Commands like `start`, `flight-plan`, `takeoff`, `ship`, `squadron`, `status-worktrees`, and `claude-sync` are the developer's direct interface with Reaper. Voice, personality, and themed language are encouraged here. These surfaces benefit from the Fun key — they make the tool feel considered and alive. The audience is a human developer who chose to use Reaper.

### Tier 2: Agent prompts

System prompts for coding, review, and planning agents must remain clinical, precise technical specifications. No themed language, no personality, no humor. These prompts are machine-consumed instructions where every token should carry behavioral signal. Ambiguity degrades output quality. A system prompt that says "harvest the low-hanging fruit first" when it means "prioritize quick wins" forces the model to resolve a metaphor before it can act — an unnecessary inference step that risks misinterpretation.

### Tier 3: Output boundary

Generated agent prompts, commands, and skills that operate on target projects must follow general software development best practices. They must not embed Reaper-specific design philosophy, Five Keys language, or Reaper conventions into content that will guide work on the user's codebase. The target project has its own values, conventions, and constraints. Reaper's generated output must respect that autonomy.

### Enforcement

A contract test in `scripts/contracts.test.js` validates that generated output for target projects does not contain Reaper-internal language. This provides automated enforcement of the output boundary — violations are caught at build time, not discovered in production when a target project receives Reaper-flavored guidance it never asked for.

---

## Consequences

**Positive:**
- Reaper's internal design values remain internal; they shape how Reaper is built without leaking into what Reaper builds for others
- Generated output is portable to any project regardless of its conventions — no Reaper-specific assumptions embedded
- Third-party agents can be added to the roster without inheriting Reaper-specific language or design philosophy
- The contract test enforces the boundary automatically, catching violations before they ship
- The three-tier model gives contributors a clear structural rule rather than requiring case-by-case judgment about tone

**Negative / Risks:**
- Contributors must internalize the three-tier model; new authors may default to a single voice and require correction
- Content near tier boundaries requires careful authoring discipline — orchestration commands that both present UI to the user (Tier 1) and generate agent prompts (Tier 2) must cleanly separate the two concerns within a single file
- The Fun key is explicitly disallowed in Tier 2 and Tier 3, which represents a large portion of the codebase; contributors who enjoy the voice may feel constrained when writing agent prompts
- Contract tests can only catch known patterns (e.g., "Five Keys", "Reaper conventions"); novel forms of philosophical leakage require human review

---

## Alternatives Considered

**Single voice model** — Use the same tone and personality everywhere: commands, agent prompts, and generated output. Simplest approach with zero authoring friction. Rejected because it contaminates agent prompts with themed language that degrades output quality and imposes Reaper conventions on target projects that have their own standards.

**Explicit opt-in per command** — Let command authors mark individual content blocks as "output boundary safe" or not, with per-block voice annotations. More granular than a structural rule. Rejected because it creates per-author inconsistency, adds review burden to every template change, and relies on authors correctly classifying their own content — the exact judgment failure the three-tier model is designed to prevent.

**No constraint** — Ship everything with Reaper's full voice and let target project teams override what they dislike. Zero authoring overhead. Rejected because it shifts the burden to every user of Reaper rather than solving the problem once at the source, creates portability problems when generated content references Reaper-specific concepts, and embeds assumptions where they do not belong.
