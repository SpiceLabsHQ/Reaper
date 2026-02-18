# Agent Prompt Review — Specialty Steps

Applies to work type: `agent_prompt`.

Apply these steps after completing the universal review process. These checks
apply to agent prompts, skill files, and command templates.

## Anti-Pattern Detection

Check for each of the following. Flag each one found as a non-blocking note
unless it causes functional failures, in which case flag it as blocking.

- **Dead context**: Instructions that reference tools, roles, or constraints
  that do not apply to this agent. Example: a review agent prompt that
  instructs the reader to write tests.
- **Persona conflict**: Mixed metaphors within a single prompt. Example:
  "You are a surgeon. Now compile the code." Flag if the metaphor contradicts
  the agent's actual function.
- **Vague instructions**: Phrases like "Be thorough" or "Be careful" without
  concrete operationalization. These consume tokens without guiding behavior.
  Flag if the instruction has no actionable equivalent.
- **Over-long system prompt**: Flag if the prompt contains sections that could
  be removed without changing the agent's behavior on its defined task —
  repeated content, preambles that restate obvious facts, or sections that do not affect output.
- **Contradictory instructions**: Any section that directly contradicts
  another. Example: "Always emit JSON" followed by "Respond in prose."

## Output Format Contract Validation

- Does the prompt define a clear expected output format?
- If JSON output is expected: is the schema fully specified with an example
  showing all required fields, types, and allowed values?
- Is the output contract testable by downstream consumers without
  parsing ambiguous prose?

Flag as blocking if JSON output is expected but the schema is absent or
underspecified in a way that would cause consumers to fail.

## Tool List Appropriateness

- Does `allowed-tools` include only what the agent actually needs to complete
  its task? Extra tools expand attack surface unnecessarily.
- Are any dangerous tools (Write, Edit, Bash) justified by the agent's
  stated purpose? Flag unjustified dangerous tool inclusions as blocking.
- Are any tools the agent clearly needs missing from `allowed-tools`?
  Flag missing required tools as blocking.
