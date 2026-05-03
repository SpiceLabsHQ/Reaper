# SPC-33 — Subagent Memory Frontmatter Spike

## Objective

The Claude Agent SDK documents a `memory: 'user' | 'project' | 'local'` field on the
TypeScript `AgentDefinition`. Reaper agents are not raw `AgentDefinition` objects —
they are markdown files with YAML frontmatter, loaded by Claude Code as plugin
agents. This spike answers a single question: does the Claude Code markdown plugin
agent loader pass a `memory:` key from the frontmatter through to the underlying
SDK, or is a different wiring mechanism required before downstream WUs (SPC-34
through SPC-42) can rely on it?

## SDK Documentation Findings

**Source: [Subagents in the SDK — code.claude.com](https://code.claude.com/docs/en/agent-sdk/subagents)**

The SDK reference documents `memory` as a field of `AgentDefinition`:

| Field    | Type                             | Required | Description                  |
| :------- | :------------------------------- | :------- | :--------------------------- |
| `memory` | `'user' \| 'project' \| 'local'` | No       | Memory source for this agent |

The accepted values are exactly three string literals: `user`, `project`, `local`.
The SDK page makes no claim about markdown frontmatter behavior on its own — that
question is settled by the Claude Code subagents page below.

**Source: [Using agent memory — platform.claude.com](https://platform.claude.com/docs/en/managed-agents/memory)**

This page describes a separate concept: API-level **Managed Agents memory stores**,
addressed by ID (`memstore_...`), attached to sessions via the `resources[]` array
on the API session-create call, mounted under `/mnt/memory/` inside the container.
This is the server-side Managed Agents product surface and is **not** what the
markdown frontmatter `memory:` key controls. Conflating the two would cause WU2 to
emit incorrect guidance. The `memory:` frontmatter field is the SDK / Claude Code
local-filesystem feature, not the Managed Agents API memory store.

## Plugin Agent Loader Findings

**Source: [Create custom subagents — code.claude.com](https://code.claude.com/docs/en/sub-agents)**

This is the canonical reference for the markdown frontmatter loader and resolves
the spike question definitively. The "Supported frontmatter fields" table lists
`memory` explicitly as a supported field (verbatim from the docs):

> | `memory` | No | Persistent memory scope: `user`, `project`, or `local`. Enables cross-session learning |

The doc also dedicates a full section, **"Enable persistent memory"**, to the
field, including a worked example:

```yaml
---
name: code-reviewer
description: Reviews code for quality and best practices
memory: user
---
You are a code reviewer. As you review code, update your agent memory with
patterns, conventions, and recurring issues you discover.
```

The three scope values map to filesystem locations:

| Scope     | Location                                      | Use when                                                                                    |
| :-------- | :-------------------------------------------- | :------------------------------------------------------------------------------------------ |
| `user`    | `~/.claude/agent-memory/<name-of-agent>/`     | the subagent should remember learnings across all projects                                  |
| `project` | `.claude/agent-memory/<name-of-agent>/`       | the subagent's knowledge is project-specific and shareable via version control              |
| `local`   | `.claude/agent-memory-local/<name-of-agent>/` | the subagent's knowledge is project-specific but should not be checked into version control |

The same source documents what Claude Code does **automatically** when `memory` is
set, which materially affects how downstream WUs phrase their agent guidance:

- The subagent's system prompt is augmented with instructions for reading and
  writing the memory directory.
- The first 200 lines or 25KB (whichever comes first) of `MEMORY.md` from the
  memory directory is injected into the system prompt, with curation guidance if
  the file exceeds that limit.
- `Read`, `Write`, and `Edit` tools are auto-enabled so the subagent can manage
  its own memory files.

**Plugin compatibility:** the same page enumerates the three frontmatter fields
that are silently dropped for plugin subagents — `hooks`, `mcpServers`, and
`permissionMode`. `memory` is **not** in that exclusion list, so it is honored
when Reaper agents are loaded as plugin subagents. (Cross-checked against the
Note at line 204-206 of the doc.)

**Reaper precedent:** `grep -rn "^memory:" src/agents/ agents/ src/partials/` in
the worktree returns zero hits. No prior wiring exists; this spike is the first
introduction of the field to Reaper sources.

## Empirical Result

**Procedure**

1. Edited `src/agents/technical-writer.ejs` to add `memory: local` immediately
   after the existing `model: opus` frontmatter line.
2. Ran `npm run build` from the session worktree
   (`.claude/worktrees/SPC-32-subagent-memory`).
3. Inspected the generated `agents/technical-writer.md`.
4. Reverted the test edit, rebuilt, and confirmed `git status` reports no changes
   to either the source or the generated file.

**Build outcome (with `memory: local` added)**

```
Build Summary:
  Success: 61
  Errors:  0
```

No build error. No warning. No unsupported-key complaint from the EJS pipeline.
This is expected once the build script is examined: `scripts/build.js`'s
`parseFrontmatter()` matches the entire `---\n...\n---\n` block as an opaque
string and re-emits it verbatim ahead of the compiled body — the build does not
parse, validate, or transform individual frontmatter keys. Any YAML key added in
source flows through to output unchanged.

**Generated file (head of `agents/technical-writer.md`)**

```yaml
---
name: technical-writer
description: >-
  Creates comprehensive technical documentation from codebases ...
color: cyan
model: opus
memory: local
---
```

The `memory: local` line appears in the generated markdown exactly as written in
the source. Because Claude Code's plugin agent loader documents `memory` as a
supported frontmatter field with the three accepted values, this generated file
will be honored at agent-load time and Claude Code will provision
`.claude/agent-memory-local/technical-writer/` with the documented system-prompt
augmentation.

**Revert verification**

After removing the test edit and rebuilding:

```
$ git status --short src/agents/technical-writer.ejs agents/technical-writer.md
(no output — both files clean)
```

Build re-ran with `Success: 61, Errors: 0`. No production agent changes remain.

## Recommendation

**Proceed.** The `memory:` frontmatter field is supported by the Claude Code
markdown subagent loader, is honored on the plugin-agent code path Reaper uses
(it is not in the plugin exclusion list), accepts exactly the three SDK values,
and flows through Reaper's EJS build pipeline unchanged with no build failures
or warnings. No alternative wiring path is required.

**Frontmatter snippet for downstream WUs (SPC-34 through SPC-42):**

```yaml
memory: project
```

`project` is the recommended default scope per the upstream docs ("makes
subagent knowledge shareable via version control"). Use `user` only when the
agent's knowledge is genuinely cross-project (e.g., a personal coding-style
preference agent), and `local` only when the knowledge must stay out of the
repository (e.g., contains environment-specific paths or secrets-adjacent
context).

**Notes for the partial author (SPC-34):**

- The partial only needs to emit the single `memory:` line; the upstream loader
  handles the system-prompt augmentation, the `MEMORY.md` injection, and the
  `Read`/`Write`/`Edit` tool auto-enable. No body-level instructional text is
  required for the field to work — but agent-specific guidance about _what_ to
  record is still valuable and should be considered for the partial.
- `Read`, `Write`, and `Edit` are auto-added when `memory` is set. Agents that
  declare a restrictive `tools:` allowlist (e.g., review-only agents that
  currently list only `Read, Grep, Glob`) will silently gain `Write` and `Edit`
  the moment `memory:` is added. Each downstream WU must decide per-agent
  whether that side effect is desirable. Where it is not, that agent should be
  excluded from the memory rollout rather than have its `tools:` list fought
  with — the upstream loader's auto-enable behavior cannot be overridden from
  frontmatter.
- The 25KB / 200-line `MEMORY.md` injection cap means agents should be
  instructed to keep `MEMORY.md` itself terse and offload detail to sibling
  files in the memory directory. The upstream docs mention this curation
  responsibility.

## Cross-reference

- WU2 (SPC-34) authoring `src/partials/memory-guidance.ejs` should cite this
  document for the SDK/loader contract and for the `Read`/`Write`/`Edit`
  auto-enable side effect that affects review-only agents.
- WU3.x (SPC-35 through SPC-40) wiring batches should pick the per-agent scope
  (`user` / `project` / `local`) using the guidance in the Recommendation
  section above; default to `project` unless the agent's knowledge profile
  argues otherwise.
- WU3.7 (SPC-42, ADR-0026) should record this spike as the empirical basis for
  adopting the field and note the auto-tool-enable interaction as the primary
  trade-off.

## Sources

- [Subagents in the SDK — code.claude.com](https://code.claude.com/docs/en/agent-sdk/subagents)
- [Create custom subagents — code.claude.com](https://code.claude.com/docs/en/sub-agents)
- [Using agent memory — platform.claude.com](https://platform.claude.com/docs/en/managed-agents/memory) (distinguished as a separate, unrelated feature)
