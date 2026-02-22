# ADR-0018: Build-Time Prompt Size Reporting

**Date**: 2026-02-21
**Status**: Accepted

---

## Context

### The Invisible Cost of Partial Accumulation

Reaper's agent prompts are assembled from EJS templates that include shared partials. As the project grows, partials are added or expanded to cover new concerns -- output requirements, testing protocols, quality gate instructions, visual vocabulary. Each partial adds tokens to every agent that includes it.

The v1.12.0 release cycle landed six new partials. No mechanism existed to surface the cumulative token cost of these additions. A developer adding a partial sees only the partial itself; the per-agent impact -- how many tokens each agent's fully compiled prompt now consumes -- is invisible until the prompt exceeds a model's context window and fails at runtime.

This is a compounding problem. Each partial addition is individually reasonable. The aggregate effect is not visible from any single change. By the time a prompt becomes too large, the cost is distributed across many partials and many commits, making it difficult to identify which additions drove the growth or where to cut.

### Why Visibility Matters

Claude Code agents operate within model context windows. A prompt that consumes a large fraction of the available context leaves less room for the conversation, tool results, and reasoning that the agent needs to do its work. Prompt size is not just a hard limit concern -- it is a quality-of-work concern. The earlier developers see the cost of their changes, the earlier they can make informed decisions about what to include.

### The Feedback Loop Gap

The existing build system compiles EJS templates to markdown files and reports success or failure. It does not report the size of the compiled output. A developer who runs `npm run build` after adding a partial receives no signal about the token cost of their change. The feedback loop between "I added content to a partial" and "this made agent X larger by N tokens" does not exist.

---

## Decision

Report estimated token counts per compiled agent prompt as the final step of `npm run build`. The report lists all agents sorted descending by estimated token count, giving developers immediate visibility into prompt size after every build.

### Token estimation method

The report uses the approximation of 4 characters per token. This is a widely used heuristic for English-heavy text with code fragments. It is not exact -- actual tokenization varies by model and content -- but it is sufficient for trend detection and relative comparison. The goal is to surface order-of-magnitude differences and catch growth, not to predict exact token consumption.

### Integration point

The report runs as the final build step, after all templates have been compiled. It reads the generated agent files (the build output), computes character counts, divides by 4, and prints a sorted table to stdout. No new files are created; the report is ephemeral console output that appears alongside the existing build summary.

### What the report enables

- **Per-change awareness**: A developer who adds a partial can immediately see which agents grew and by how much.
- **Trend detection**: Sorting by size makes the largest agents visible at a glance. An agent that was previously mid-list appearing at the top signals unexpected growth.
- **Budget conversations**: When an agent approaches a concerning size, the report provides the data needed to discuss what to remove or extract, rather than discovering the problem at runtime.

---

## Consequences

**Positive:**

- Zero-cost feedback loop: developers see prompt size impact during normal development workflow without any additional commands or tooling. The information appears automatically.
- Build-time placement ensures the data is available before code is committed or pushed. Problems are surfaced at the earliest possible point in the development cycle.
- The 4-chars-per-token heuristic requires no external dependencies (no tokenizer library, no API calls). The report adds negligible time to the build.
- The report is console-only output, not a committed artifact. It does not create files that need to be maintained, reviewed, or kept in sync.

**Negative / Risks:**

- The 4-chars-per-token approximation is imprecise. Actual token counts vary by model tokenizer, and prompts with heavy code or special characters may diverge from the estimate. This is acceptable for trend detection but should not be used for precise budget enforcement.
- Console output can be ignored. Unlike a failing test or a lint error, a large prompt size does not block the build. Developers must choose to look at the report. If enforcement becomes necessary, a future change could add a configurable threshold that fails the build.
- The report only covers agent prompts. Command prompts, skill prompts, and hook prompts are not included in the initial implementation. These could be added if their sizes become a concern.

---

## Alternatives Considered

**CI-time reporting** -- Run the token size analysis in the CI pipeline after code is pushed. Rejected because this places the feedback loop too late. A developer who has already committed, pushed, and opened a PR receives the size data only after the work feels "done." The psychological cost of reworking a completed PR is higher than adjusting during local development. Build-time reporting surfaces the same data before the developer leaves their editor.

**Runtime instrumentation** -- Measure actual token consumption per agent invocation at runtime, using the model's tokenizer or API response metadata. Rejected because there is no clean hook for per-request measurement without instrumenting every agent invocation path. Runtime measurement also conflates prompt size with conversation size (tool results, user messages, prior turns), making it difficult to isolate the prompt's contribution. The build-time approach measures the prompt in isolation, which is the dimension developers can directly control.

**Manual auditing** -- Rely on developers and reviewers to periodically check prompt sizes by inspecting compiled files. Rejected because it does not scale. Manual checks are performed when someone remembers to do them, which is typically after a problem has already occurred. The six-partial accumulation in v1.12.0 demonstrated that manual vigilance did not catch the growth. Automated reporting removes the dependency on human memory.

**Hard token budget with build failure** -- Set a maximum token count per agent and fail the build if any agent exceeds it. Rejected as a first step because the correct budget is not yet known. The reporting phase must come first to establish baseline sizes and growth patterns. Once the team has data on what "normal" looks like, a budget threshold can be added as a subsequent change. Starting with enforcement before establishing baselines would produce arbitrary limits that either never trigger or block legitimate work.

---

## Related Decisions

- **ADR-0005: EJS Template Build System** -- Established the build pipeline that compiles agent templates. The token size report extends this pipeline with a reporting step that reads its output.
- **ADR-0006: Output Boundary** -- Established that generated content for target projects must not contain Reaper internals. The token report is internal development tooling (console output during build) and does not cross the output boundary.
