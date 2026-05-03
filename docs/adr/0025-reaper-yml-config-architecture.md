# ADR-0025: `.reaper.yml` Config-First Architecture

**Date**: 2026-05-02
**Status**: Accepted

---

## Context

Reaper started without a config file. Each component that needed project-specific information — the test command, the lint command, the tracker system, the base branch — discovered that information at the call site:

- `flight-plan` and `takeoff` shelled out to `scripts/detect-task-system.sh` to figure out whether the project used GitHub, Jira, Beads, or markdown plan files. The detection logic walked recent commit history looking for tracker patterns.
- `reaper:test-runner` and `reaper:branch-manager` parsed a `## Quality Gates` block out of the project's `CLAUDE.md` to learn the test and lint commands. The block was written by `/reaper:configure-quality-gates`, which itself ran a separate detection routine over `package.json`, `pyproject.toml`, `go.mod`, and so on.
- The base branch (`develop` vs `main`) was hardcoded in several agent prompts, with one-off overrides scattered across templates.
- Coverage thresholds, security-gate enforcement, TDD enforcement, and worktree paths were all expressed as defaults in code rather than declared anywhere a user could see or change.

This worked, but it had three structural problems:

1. **Inconsistency.** The same project fact (e.g. "this is a GitHub-tracked repo") was inferred independently in multiple places. Two call sites could disagree if their detection heuristics drifted, and there was no single source of truth to reconcile them against.
2. **Opacity.** Users couldn't see what Reaper had concluded about their project without reading the source. There was no project-level config file to inspect, edit, or check into version control.
3. **Brittleness.** Every new tracker, ecosystem, or workflow option required editing the detection scripts and the agent prompts that consumed them. The lack of a stable schema meant changes propagated slowly and inconsistently.

We needed a single, declarative source of truth for project-level configuration — readable by humans, addressable by every Reaper component, and stable enough to evolve without breaking existing setups.

---

## Decision

Reaper adopts a `.reaper.yml` file at the project root as the canonical source of project configuration. Five sub-decisions follow from that choice.

### 1. YAML at the project root

The config lives in `./.reaper.yml`. YAML was chosen over alternatives because it supports comments, accepts both flat and nested keys naturally, and is the dominant config format in adjacent ecosystems (CI configs, Kubernetes, Helm). Hand-editing a Reaper config should feel like hand-editing a `.github/workflows/*.yml` file — familiar, explanatory, and forgiving.

The file lives at the project root rather than under `.claude/` because it is project-level configuration, not Claude-Code-runtime configuration. Users expect tools to surface their config files where IDEs and code review systems will pick them up by default.

### 2. Bundled Node reader

`scripts/config-get.{sh,mjs}` ships with Reaper and reads keys from the resolution chain. The shell wrapper exists for callers that don't already run Node (Bash hooks, makefiles); it dispatches to the `.mjs` implementation, which uses the `yaml` npm package for parsing.

The reader is intentionally narrow: it resolves one dot-path key per invocation, with optional `--default` and `--fallback-script` lanes. It does not validate, transform, or render — those concerns live elsewhere. This narrowness keeps each call site auditable: every `config-get.sh tracker.system` is a single, traceable lookup.

### 3. Layered resolution chain

Lookups walk five layers in order:

1. The user's `./.reaper.yml`
2. The bundled `defaults.yml` (alongside the reader, overridable via `REAPER_DEFAULTS_PATH` for tests)
3. `--fallback-script PATH` — executed; stdout becomes the value
4. `--default <value>` — caller-supplied literal fallback
5. Hard error: `Run /reaper:init to configure missing key 'X'` and exit 1

The fail-loud terminus is deliberate. Earlier prototypes returned an empty string on miss, which let agents continue with subtly broken configurations. Failing loudly with a pointer to `/reaper:init` makes the failure mode self-correcting: the user reads the error and runs the wizard.

`--default` is preferred over `--fallback-script` when both are supplied. A literal default is cheaper to evaluate and more predictable than spawning a subprocess; the fallback-script lane exists for cases where the value genuinely depends on the environment (e.g. detecting a CI-injected token).

`null` in either YAML file is treated as "not set" so the bundled `defaults.yml` can declare required-without-default keys explicitly (the schema knows the key exists; the value just isn't set globally) and the reader still falls through to the next layer. This avoids a class of bugs where a YAML key that happens to evaluate to null short-circuits the chain.

### 4. JSON Schema validation

`scripts/config-validate.{sh,mjs}` validates a config against `reaper.schema.json` (JSON Schema draft-07) using `ajv`. Two categories of finding are reported:

- **Errors** — type mismatches, missing required keys, wrong enum values, wrong `version: const 1`. These fail validation (exit 1).
- **Warnings** — unknown top-level or nested keys that aren't declared in the schema. These print prefixed with `WARN` but do not fail validation; exit stays `0`.

The error/warning split bakes forward-compat into the validator. When a future Reaper version introduces a new key, projects that haven't adopted it yet still validate. When a user adds a custom key for their own tooling, it doesn't break Reaper. Errors are reserved for actual schema violations that Reaper components cannot interpret.

`/reaper:init` runs the validator before writing — no malformed config ever reaches disk. `/reaper:doctor` runs it on demand, plus drift checks (does the test command actually exist? does the tracker repo resolve?) for ongoing health monitoring.

### 5. `render-*.sh` script pattern + "Doctor as script"

When an agent prompt or command needs to vary based on configuration (e.g. inject a different snippet depending on `tracker.system`), the variation lives in a `scripts/render-*.sh` script rather than as inline EJS conditionals in the markdown template.

The render script reads config via `config-get.sh`, branches on the value, and prints a finished prompt fragment. The EJS template for the agent or command includes the render script's output verbatim. This pattern composes cleanly with the build system's existing partial mechanism while keeping logic out of markdown.

A related principle, "Doctor as script," applies to `/reaper:doctor` itself. The command runs zero agent tool calls — its entire output is produced by a shell script that calls `config-validate.sh` plus a handful of drift probes. The Claude-side command is a thin wrapper that invokes the script and renders its output. This keeps the doctor fast, deterministic, and testable in isolation.

---

## Alternatives Considered

**TOML.** Rejected. TOML is a fine config format for projects that already ship a Rust or Python toolchain, but Reaper has neither. Adding a TOML parser to the bundled reader meant adding a new dependency for marginal ergonomic gain over YAML, and TOML's nested-table syntax is awkward for arrays of strings (a common shape in tracker labels and skip-gate globs).

**JSON.** Rejected. JSON is non-negotiably comment-free, which makes hand-authored config files brittle and unfriendly. Every other Reaper-adjacent ecosystem (GitHub Actions, Helm, Kubernetes manifests, `.gitlab-ci.yml`, Linear's webhook configs) uses YAML for hand-edited configs. We followed the prevailing convention.

**Hidden under `.claude/`.** Rejected. Putting config under `.claude/reaper.yml` would have signaled "Claude-runtime config" — but `.reaper.yml` is project-level config that survives Claude Code rebuilds, runs in CI, and gets reviewed in pull requests. Project-level config conventionally lives at the repo root (`.eslintrc`, `tsconfig.json`, `pyproject.toml`, `Cargo.toml`), and that's where users will expect to find it.

**Inline EJS conditionals in agent templates.** Rejected. EJS conditionals embedded in markdown templates couple branching logic to template rendering, make the templates harder to test in isolation, and produce diffs that mix presentation changes with logic changes. The render-script pattern keeps logic in shell (where it can be unit-tested with `node:test`) and keeps templates focused on prose.

---

## Consequences

**Positive**

- **Single source of truth.** Every Reaper component that needs `test.cmd`, `tracker.system`, `git.default_base_branch`, or any other project fact reads it from the same place. Components cannot disagree about what the project's test command is.
- **User customization without forking.** Users override Reaper's defaults by editing `.reaper.yml`. They no longer need to fork agent prompts or patch detection scripts to change a coverage threshold or pick a non-`develop` base branch.
- **Fewer agent tool calls.** Configuration lookups are shell calls, not agent reasoning steps. `reaper:doctor` does its full job without invoking any agent tools — the entire output comes from one script.
- **Migration story is concrete.** `/reaper:init` reads existing signals (the `## Quality Gates` block in `CLAUDE.md`, `package.json` scripts, etc.) and produces a `.reaper.yml`. Migration is a one-command operation.
- **Forward-compat by default.** Unknown keys warn instead of failing. Reaper can introduce new config keys without breaking projects that haven't adopted them yet, and projects can add custom keys without breaking Reaper.
- **The schema is the documentation.** `reaper.schema.json` is the contract. Both the reader and the validator consume it; the docs mirror it; the init wizard prompts from it. There's one place to change the contract, and everything else follows.

**Negative**

- **New runtime dependencies.** The reader adds `yaml` (~50KB) and `ajv` (~150KB) as production dependencies. For Reaper-the-plugin this is acceptable — Reaper already requires Node 22+ — but it is a real dependency surface. Both packages are mature, widely used, and security-tracked, which mitigates but does not eliminate the cost.
- **Schema migration burden.** When the schema needs to change shape (renaming a key, splitting a value into two, changing a type), we'll need to write a migration. The `version: const 1` field exists to make this tractable: a future Reaper version can detect a `version: 1` config, run a migration to `version: 2`, and re-validate. We have not yet exercised this path, so the migration tooling is theoretical until we need it.
- **`.reaper.yml` becomes a load-bearing file.** A typo in `.reaper.yml` can break Reaper for a project. The validator and `/reaper:doctor` exist precisely to catch typos before they become outages, but the cost of having a config file at all is that the config file can be wrong. The mitigation is to make the wizard (`/reaper:init`) the primary authoring path, with hand-editing as the escape hatch.

---

## Related Decisions

- **ADR-0006: Output Boundary** — `.reaper.yml` is Reaper's config file, not a config schema imposed on target projects. Generated content for target projects continues to follow general best practices, not Reaper internals.
- **ADR-0011: Orchestrate Scripts Are Orchestrator-Only** — `config-get.sh` is callable from any layer, not just the orchestrator. This ADR diverges from 0011 deliberately: configuration reads are universally safe and should not be gated behind the orchestrator.
- **ADR-0012: Agent Context Self-Service** — Agents read their own context via skills and config, rather than receiving giant pre-injected prompts. `.reaper.yml` is a foundational layer of that self-service: agents call `config-get.sh` to learn project facts, the same way they call `gh issue view` to learn task facts.
