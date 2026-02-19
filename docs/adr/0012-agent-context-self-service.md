# ADR-0012: Agent Context Self-Service

**Date**: 2026-02-19
**Status**: Accepted

---

## Context

Reaper's `takeoff` command contains a "Step 3.5" that materializes plan context before dispatching Gate 2 reviewer agents. The sequence is:

1. Search `.claude/plans/` for a matching plan file and read its full contents
2. Fall back to `FETCH_ISSUE` to retrieve the issue body from the task system
3. Inject the full materialized content into every Gate 2 reviewer prompt as `PLAN_CONTEXT`

This approach was designed to ensure that Gate 2 reviewers — principal-engineer, ai-prompt-engineer, technical-writer, database-architect, deployment-engineer, security-auditor — could validate implementation scope against the original plan. The intent was correct. The mechanism is not.

The cost is approximately 46k tokens of cached overhead per Gate 2 API call. This overhead multiplies across every reviewer dispatched in a pipeline run. In a six-reviewer gate, the orchestrator is paying for six copies of the same plan content, most of which no individual reviewer reads in full. A security auditor validating injection risks does not need the data modeling section. A prompt engineer auditing agent instructions does not need the deployment steps. Content is injected uniformly because the orchestrator cannot know in advance which sections each reviewer will consult.

A second problem surfaces at Gate 1. The `test-runner` agent currently includes `pre-work-validation-review.ejs` — a review partial — rather than the coding partial appropriate to its role. That partial expects `PLAN_CONTEXT` in the agent's inputs. The orchestrator never sends `PLAN_CONTEXT` to Gate 1 because test-runner runs tests, not plan review. The include is broken in practice: it references a variable the agent never receives, adding dead validation overhead to every Gate 1 invocation.

The root cause of both problems is the same: the orchestrator is making context decisions that agents are better positioned to make themselves. An orchestrator that pre-fetches and injects content must guess what each downstream agent will need. Agents that self-serve fetch exactly what they need, when they need it.

---

## Decision

Context flows to gate agents as lightweight references, not materialized content. Agents fetch what they need using those references.

### Gate 1: test-runner receives no PLAN_CONTEXT

Test-runner's role is to run the test suite, measure coverage, and report pass/fail against thresholds. It does not validate implementation scope against a plan. Sending plan context to Gate 1 is a category error — the agent neither uses it nor should be expected to. The broken `pre-work-validation-review.ejs` include is removed from test-runner's template and replaced with the coding validation partial appropriate to its tool usage.

### Gate 2: reviewers receive a lightweight reference

Gate 2 reviewer prompts receive a `<plan_context>` block containing a reference, not content. Two reference formats are accepted:

**Format 1 — Issue ID with optional labels:**
```
epic: reaper-wiax, task: reaper-wiax.2
```
The reviewer resolves this by running `bd show reaper-wiax.2` (or the equivalent task system command) to retrieve the issue body on demand.

**Format 2 — Planfile path with optional unit range:**
```
.claude/plans/reaper-wiax.md Units 2.1-2.3
```
The reviewer reads the specified file, optionally restricting to the listed unit range, to retrieve the relevant plan sections on demand.

Either format may appear. Reviewers treat the reference as a pointer: fetch if needed, skip if the review scope does not require plan context.

### Agents affected

| Agent | Change |
|-------|--------|
| `reaper:test-runner` | Receives no `PLAN_CONTEXT`; broken review include removed |
| `reaper:principal-engineer` | Receives lightweight reference; self-serves content if needed |
| `reaper:ai-prompt-engineer` | Receives lightweight reference; self-serves content if needed |
| `reaper:technical-writer` | Receives lightweight reference; self-serves content if needed |
| `reaper:database-architect` | Receives lightweight reference; self-serves content if needed |
| `reaper:deployment-engineer` | Receives lightweight reference; self-serves content if needed |
| `reaper:security-auditor` | Receives lightweight reference; self-serves content if needed |

The `takeoff` command's Step 3.5 is removed. The orchestrator no longer searches for plan files or fetches issue bodies before dispatching gate agents. It passes the reference it already holds (the task ID and, if known, the plan file path) and delegates resolution to each reviewer.

---

## Consequences

**Positive:**
- Agents pay only for the context they actually consume. A reviewer that does not consult the plan pays zero tokens for plan content; one that reads two sections pays for two sections.
- Gate 1 overhead is eliminated entirely. Test-runner no longer receives or is expected to process plan context it has no use for.
- The broken `pre-work-validation-review.ejs` include in test-runner is corrected. Gate 1 validation now matches the agent's actual role and tool usage.
- The orchestrator is simpler. Step 3.5 — file search, content read, fallback fetch — is removed. The orchestrator passes a reference it already holds rather than materializing content it may not need to read.
- Context fetching is lazy and scoped. Reviewers that need only a subset of plan content (e.g., a specific unit or acceptance criteria) can read that subset rather than receiving the full document.

**Negative / Risks:**
- Each Gate 2 reviewer that consults plan context pays one additional tool call (a `bd show` or file read) to retrieve it. In the prior approach, the orchestrator absorbed this cost once; now each reviewer absorbs it independently if needed. For reviewers that always read the full plan, per-reviewer fetch cost may exceed the prior amortized cost.
- Reference resolution is delegated to agents. If a reference is malformed (e.g., a task ID that does not exist, a plan file path that has moved), the reviewer must handle the resolution failure gracefully rather than receiving an error at dispatch time.
- Reviewers that skip plan context because "it seems optional" may miss scope violations that plan review would have caught. The lightweight reference lowers the friction of skipping context; gate quality depends on reviewers exercising judgment about when to fetch.

---

## Alternatives Considered

**Inject full content (current behavior)** — The orchestrator materializes plan content and injects it into every Gate 2 reviewer prompt. Rejected because it generates approximately 46k tokens of cached overhead per reviewer API call regardless of whether the reviewer uses the content. Across a six-reviewer gate, this multiplies to substantial waste on content that individual reviewers may partially or entirely ignore. It also requires the orchestrator to make context decisions on behalf of agents that are better positioned to decide what they need.

**No context at all** — Gate 2 reviewers receive no plan reference and assess the implementation without consulting the original plan. Rejected because scope validation — verifying that the implementation covers the plan and does not exceed it — is a primary Gate 2 responsibility. Reviewers operating without any plan reference cannot reliably detect scope violations, partial implementations, or drift from acceptance criteria. The lightweight reference preserves scope validation capability at minimal cost.
