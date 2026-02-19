# ADR-0009: JSON Gate Output Contract

**Date**: 2026-02-18
**Status**: Accepted

---

## Context

Reaper's quality gate pipeline exists to provide independent validation of coding agent work. Three gate agents — `reaper:test-runner`, SME code reviewers (via the `code-review` skill), and `reaper:security-auditor` — each produce a verdict that the orchestrator uses to decide whether work proceeds to integration.

The fundamental problem is zero-trust between pipeline stages. Coding agents (`reaper:bug-fixer`, `reaper:feature-developer`, etc.) are optimized to complete tasks. This optimization pressure means they will produce prose like "all tests pass" and "coverage looks good" regardless of whether those claims are verified. This is not malice — it is the predictable behavior of an agent rewarded for task completion. Prose claims are unverifiable by the orchestrator without independently re-running the work, which defeats the purpose of delegation.

If the orchestrator trusts coding agent self-reports, the gate pipeline collapses into theater. The entire value of independent gate agents is that they run checks themselves and report structured, machine-verifiable results. An orchestrator that parses prose ("the tests look good, coverage seems adequate") to extract pass/fail signals introduces interpretation errors and creates a surface for gaming — an agent can phrase a partial failure as a qualified success.

The orchestrator needs an unambiguous, machine-readable signal from each gate agent. The signal must be parseable without interpretation, consistent across gate types, and structured so that logical inconsistencies (a gate claiming success while reporting failures) are mechanically detectable.

---

## Decision

**All quality gate agents return structured JSON as the sole authoritative signal. The orchestrator extracts pass/fail decisions exclusively from structured fields and discards narrative prose.**

### Universal contract fields

Every gate agent returns these fields:

| Field | Type | Purpose |
|-------|------|---------|
| `all_checks_passed` | `boolean` | Top-level pass/fail verdict |
| `blocking_issues` | `array` | Issues that must be fixed before proceeding; empty array means pass |
| `pre_work_validation.validation_passed` | `boolean` | Whether the agent's inputs (worktree path, files, context) were valid before work began |
| `files_modified` | `array` | Files the agent touched, used for scope verification |

### Gate-specific fields

Each gate agent extends the universal contract with domain-specific evidence:

**`reaper:test-runner`:**
- `tests.passed` — count of passing tests
- `tests.failed` — count of failing tests
- `tests.skipped` — count of skipped tests
- `tests.total` — total test count
- `coverage.percentage` — measured line coverage
- `coverage.threshold_met` — whether coverage meets the configured minimum
- `lint.errors` — count of lint errors
- `lint.warnings` — count of lint warnings

**SME code reviewer (via `code-review` skill):**
- `blocking_issues` — issues that must be fixed; empty array means pass
- `non_blocking_notes` — optional improvement suggestions that do not block merge
- `plan_coverage` — whether the implementation covers the plan (`full`, `partial`, or `not_checked`)
- `scope_violations` — files or changes outside the assigned task scope
- `files_reviewed` — list of files the reviewer inspected
- `summary` — brief narrative of the review outcome

The reviewer does not emit `gate_status`. The orchestrator computes pass/fail externally: `blocking_issues.length === 0 && scope_violations.length === 0`.

**`reaper:security-auditor`:**
- `gate_status` — top-level pass/fail verdict (PASS or FAIL)
- `summary` — brief narrative of findings
- `blocking_issues` — security issues that must be fixed before proceeding; empty array means pass

### Red flags: automatic redeployment triggers

The orchestrator treats the following patterns as immediate failures requiring redeployment of the coding agent, regardless of the `all_checks_passed` value:

- **Invalid inputs**: `pre_work_validation.validation_passed: false` — the gate agent did not have valid inputs to begin work; results are unreliable.
- **Logical inconsistency**: `tests.failed > 0` despite `gate_status === "PASS"` — the verdict contradicts the failure count.
- **Scope violation**: `files_modified` contains paths outside the assigned worktree or task scope — the agent operated beyond its boundaries.
- **Missing evidence**: the response lacks `commands_executed` or `verification_evidence` — the agent claims results without showing work.
- **Extreme outlier**: 100% coverage on first attempt with no prior test infrastructure — statistically implausible and likely fabricated.

### What orchestrators extract vs. discard

**Extract**: `all_checks_passed`, `blocking_issues`, coverage and exit code values (for progress reporting and threshold enforcement).

**Discard**: narrative prose, intermediate reasoning, agent self-assessment text. These may exist in the response but carry zero decision weight. The orchestrator never parses prose to determine pass/fail.

---

## Consequences

**Positive:**
- Pass/fail decisions are mechanical — no interpretation, no ambiguity, no judgment calls by the orchestrator
- Red flag detection is automatic; logical inconsistencies surface without human review
- Orchestrators can iterate programmatically (retry on failure, proceed on pass) without natural language processing
- Structured JSON is difficult to fabricate consistently at scale — a field that says `tests_failed: 0` while another says `test_exit_code: 1` is a detectable contradiction
- The contract is portable across gate agents: any agent that returns the universal fields can participate in the pipeline

**Negative / Risks:**
- Gate agents must strictly adhere to the contract — missing fields, wrong types, or structural deviations cause orchestrator failures rather than graceful degradation
- The structured output requirement adds verbosity to gate agent prompts, consuming tokens on contract specification
- The contract must be versioned when fields are added or modified; unversioned changes break orchestrators that depend on the prior schema
- Agents may still fabricate structured data (e.g., reporting `tests_failed: 0` without running tests); the red flag heuristics mitigate but do not eliminate this risk

---

## Alternatives Considered

**Prose-based validation** — Gate agents write free-form summaries; the orchestrator interprets natural language to extract pass/fail. Rejected because prose is inherently ambiguous ("most tests pass", "coverage is close to the threshold"), inconsistent across agents, and trivially gameable by phrasing failures as qualified successes.

**Shared test execution** — The orchestrator runs tests directly instead of delegating to `reaper:test-runner`. Rejected because it couples the orchestrator to test infrastructure details (runner configuration, coverage tools, lint setup) and eliminates the independence that makes the gate valuable. The orchestrator should not need to know how to run tests — only whether they passed.

**Trusted coding agent output** — Accept coding agents' self-reported results as the gate signal, eliminating independent gate agents entirely. Rejected because trust without verification is not a gate. Coding agents are optimized for completion, not accuracy of self-assessment. This alternative removes the pipeline's reason for existing.

**Hybrid (prose + structured)** — Gate agents produce both a narrative summary and structured JSON. The orchestrator uses structured fields when available and falls back to prose parsing otherwise. Rejected because the fallback path reintroduces every problem the structured contract solves. If prose parsing is acceptable as a fallback, agents (or future contributors) will under-invest in structured output quality, knowing the prose path exists. A single authoritative signal eliminates ambiguity about which output the orchestrator trusts.
