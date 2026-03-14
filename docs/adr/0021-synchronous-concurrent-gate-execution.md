# ADR-0021: Synchronous Concurrent Gate Execution

**Date**: 2026-03-13
**Status**: Accepted

---

## Context

### The background polling failure mode

Gate agents (`reaper:test-runner`, `reaper:security-auditor`, SME reviewers) execute shell commands to validate coding agent output. The original implementation used Claude Code's `run_in_background` parameter to launch long-running commands (test suites, lint passes) as background tasks, then polled for completion using `TaskOutput`. The intent was to avoid blocking the agent's conversation thread during multi-minute test runs.

In practice, this pattern failed catastrophically. A single gate invocation that should complete in 30-40 seconds with 3-4 tool calls instead consumed 673 seconds and 17 tool calls. The failure mode has three compounding causes:

**Context loss between polls.** Each `TaskOutput` call is a new tool invocation. The agent must reconstruct its intent — what it launched, why, and what to do with the result — from conversation history. Over multiple poll cycles, the agent's grasp of the original execution plan degrades. It begins re-checking tasks it already confirmed, losing track of which background jobs correspond to which gate checks.

**Indefinite hangs on TaskOutput.** When a background task completes between the agent's decision to poll and the actual `TaskOutput` call, the result may already be consumed or the task handle stale. The agent enters a retry loop, polling repeatedly for output that will never arrive, until the conversation times out or the agent gives up and re-runs the command from scratch.

**Coordination overhead for concurrent tasks.** Gate agents often need to run lint and tests concurrently (ADR-0007 specifies parallel Gate 2 execution). With `run_in_background`, each concurrent task requires its own background handle, its own polling loop, and its own result extraction. The agent must juggle multiple task IDs across tool calls, correlating each result back to the correct gate check. This coordination logic is fragile and token-expensive, consuming context window on bookkeeping rather than validation.

### Why this matters for the gate pipeline

The quality gate pipeline (ADR-0007) is the enforcement mechanism for Reaper's correctness guarantee. Gate agents that hang, lose context, or produce unreliable results undermine the pipeline's purpose. A gate that takes 11 minutes instead of 40 seconds is not merely slow — it risks conversation timeout, which means the gate never produces a verdict, which means the orchestrator cannot proceed. The work unit stalls, and the user must manually intervene to restart the gate cycle.

The problem is not with the gate agents' logic but with the execution model. The agents know what commands to run and how to interpret the results. The failure is in the mechanism for running those commands and retrieving their output.

---

## Decision

Gate agents execute all shell commands synchronously using standard Bash tool calls. Concurrency is achieved through shell-level parallelism (background subprocesses with `&` and `wait`), not through Claude Code's `run_in_background` infrastructure.

### Single synchronous Bash call with concurrent subprocesses

When a gate agent needs to run multiple commands concurrently (e.g., lint and test suite), it issues a single synchronous Bash tool call that launches subprocesses internally:

```bash
WORKING_DIR="/path/to/worktree"
TEST_STDOUT="/tmp/${TASK}-test-stdout.log"
LINT_STDOUT="/tmp/${TASK}-lint-stdout.log"

# Print paths before execution so orchestrator can inspect progress
echo "Output file paths:"
echo "  test: $TEST_STDOUT"
echo "  lint: $LINT_STDOUT"

# Launch concurrently within a single synchronous call
(cd "$WORKING_DIR" && npm run test:coverage > "$TEST_STDOUT" 2>&1) &
TEST_PID=$!
(cd "$WORKING_DIR" && npm run lint > "$LINT_STDOUT" 2>&1) &
LINT_PID=$!

# Wait and capture discrete exit codes
wait $TEST_PID
TEST_EXIT_CODE=$?
wait $LINT_PID
LINT_EXIT_CODE=$?

echo "Exit codes:"
echo "  test: $TEST_EXIT_CODE"
echo "  lint: $LINT_EXIT_CODE"
```

The Bash tool call blocks until `wait` completes, which means the agent receives all results in a single tool response. No polling. No task handles. No context loss between tool calls.

### File-based output capture with task-scoped filenames

Command output is captured to `/tmp/` using task-scoped names (`/tmp/${TASK}-test-stdout.log`, `/tmp/${TASK}-lint-stdout.log`). This serves two purposes:

**Progress observability.** The file paths are printed before execution begins. An orchestrator or human operator can `tail -f` these files to monitor gate progress in real time without interfering with the agent's execution. This satisfies the transparency requirement without adding tool calls.

**Deterministic cleanup.** Task-scoped filenames avoid collisions when multiple gate cycles run against the same worktree (e.g., retry after failure). The gate agent cleans up its own output files after extracting results. If the agent fails before cleanup, the files are identifiable by task ID and can be removed by the orchestrator or a subsequent gate run.

### Output paths printed before execution begins

The gate agent prints the output file paths as the first action in the Bash call, before launching any subprocesses. This guarantees that an external observer knows where to look for output even if the gate agent crashes mid-execution. The paths are deterministic (derived from worktree path and task ID), but printing them explicitly removes any need for the observer to reconstruct the naming convention.

### Timeout enforcement

The synchronous Bash call uses the tool's `timeout` parameter to enforce a maximum execution time. If the combined lint + test execution exceeds the timeout, the tool call fails with a clear error rather than hanging indefinitely. The gate agent reports this as a gate failure with a specific blocking issue ("gate execution timed out"), which the orchestrator can retry or escalate per the differential retry limits in ADR-0007.

---

## Consequences

**Positive:**

- Gate execution completes in 3-4 tool calls instead of 17, reducing token consumption by an order of magnitude and eliminating the context loss that degraded result quality.
- Wall-clock time drops from 673 seconds to approximately 40 seconds for a standard lint + test gate, because no time is spent on polling loops, context reconstruction, or stale task handle recovery.
- The agent receives all command output in a single tool response, which means result parsing happens in one pass with full context. No correlation of background task handles to gate checks is needed.
- Progress is observable without agent cooperation. An operator can `tail -f` the output files at any time during execution, which satisfies transparency requirements without adding tool calls or agent complexity.
- Timeout enforcement is mechanical (the Bash tool's `timeout` parameter), not behavioral (hoping the agent notices it has been polling too long). Hangs are impossible by construction.

**Negative / Risks:**

- The synchronous call blocks the agent's conversation thread for the duration of test execution. For large test suites (several minutes), no intermediate status updates reach the orchestrator until the call completes. This is acceptable because the output files provide an alternative observation channel, and the previous "status updates" via polling were themselves the source of the failure mode being eliminated.
- Shell-level concurrency (`&` and `wait`) requires correct quoting and error handling in the Bash script. A malformed command in one subprocess does not automatically fail the other. The gate agent must check exit codes or output content for both subprocesses independently. This is straightforward but must be implemented correctly.
- File-based output capture writes temporary files to `/tmp/` with task-scoped filenames. If the gate agent crashes before cleanup, these files persist until the OS clears `/tmp/` or until a subsequent gate run cleans them up. The files are small (test and lint output) and named by task ID, so the risk of accumulation is low.
- The Bash tool's `timeout` parameter has a maximum value (600,000ms / 10 minutes). Test suites that legitimately exceed 10 minutes cannot use this pattern without splitting into multiple sequential calls. For Reaper's own test suite this is not a concern, but target projects with very large suites may need adaptation.

---

## Alternatives Considered

**Background tasks with smarter polling** -- Retain `run_in_background` but improve the polling strategy: exponential backoff, cached task handles, explicit state machines to track which polls have completed. Rejected because the fundamental problem is not the polling strategy but the polling model itself. Every poll is a tool call that costs tokens and risks context loss. A smarter polling loop is still a polling loop — it reduces the failure rate but does not eliminate the failure mode. The synchronous approach eliminates polling entirely, which is the correct fix for a class of problems caused by polling.

**Sequential lint-then-test execution** -- Run lint first, wait for results, then run tests. No concurrency, no background tasks, no polling. Rejected because it approximately doubles wall-clock time for no correctness benefit. Lint and test execution are independent — neither depends on the other's output. Running them sequentially wastes the time spent waiting for whichever finishes first. Shell-level concurrency within a single synchronous call achieves the same simplicity (one tool call, deterministic completion) without the time penalty.

---

## Related Decisions

- **ADR-0007: Quality Gate Pipeline** -- Defines the 2-gate structure and parallel Gate 2 execution that gate agents implement. This ADR changes how gate agents execute commands internally, not the pipeline structure itself.
- **ADR-0009: JSON Gate Output Contract** -- Defines the structured output that gate agents return to the orchestrator. The synchronous execution model does not change the output contract; it changes the mechanism by which gate agents gather the evidence that populates the contract fields.

## Implementation

- **reaper-4ola.1**: Implements this decision in the `reaper:test-runner` agent prompt, replacing `run_in_background` instructions with synchronous concurrent execution protocol.
