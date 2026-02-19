# Architecture Review — Specialty Steps

Applies to work types: `architecture_review`, `api_specification`, `infrastructure_config`.

Apply these steps after completing the universal review process.

## Service Boundary Assessment

- Does this API, service, or system boundary reflect a stable domain boundary,
  or is it drawn around implementation convenience?
- Would a change to one side of this boundary require coordinated changes to
  the other? Coordinated changes across both sides of a boundary are a
  distributed monolith signal — flag as a blocking issue.

## Contract Correctness

- Does the API or interface expose internal representations (leaky abstraction)?
  Flag if callers must know internal IDs, internal state names, or storage
  formats that should be encapsulated.
- Is the consistency model (synchronous/asynchronous, transactional vs.
  eventual) appropriate for the caller's requirements? Flag a mismatch as
  blocking if the caller's correctness depends on the consistency guarantee.
- Are idempotency properties declared and correct? For mutating operations,
  verify that repeated identical calls produce the same outcome and that this
  property is documented or enforced.

## Coupling and Blast Radius

- What is the blast radius of this change? Does it create new implicit coupling
  between previously independent modules? Flag new shared-state dependencies
  or shared mutable singletons introduced by this changeset as blocking.
- Are dependencies declared explicitly through interfaces, or implicit through
  shared state (global variables, ambient context, process environment)?
  Flag implicit dependencies as blocking when they prevent independent testing
  or deployment.

## ADR Compliance (architecture_review work type)

- Does this changeset comply with accepted ADRs in `docs/adr/`? Read the
  relevant ADR files in the worktree before assessing compliance.
- If this changeset supersedes an existing ADR, is a new ADR drafted or an
  existing ADR updated to reflect the decision? Flag the absence as blocking.
