# Configuration (`.reaper.yml`)

_How Reaper figures out your project._

Reaper is configured per project by a `.reaper.yml` file at the repository root. The file's shape is pinned by [`reaper.schema.json`](../reaper.schema.json), a JSON Schema draft-07 document. Reaper's reader and validator both consume the same schema, so what passes validation is exactly what the reader will return.

This page is the canonical reference. If something here disagrees with the schema or the reader, the schema and reader win — please open an issue.

[Back to README](../README.md)

---

## Quick start

Run the init wizard once per project:

```
/reaper:init
```

It detects your test runner, lint command, and tracker, asks a few questions, and writes a validated `.reaper.yml` for you. To check an existing config:

```
/reaper:doctor
```

Doctor validates the file against the schema and surfaces drift between what's declared and what's installed.

If you'd rather hand-author the file, here's a minimal Node project:

```yaml
version: 1

test:
  cmd: npm test

lint:
  cmd: npm run lint

tracker:
  system: github
  repo: owner/repo
```

`version`, `test`, `lint`, and `tracker` are required. Everything else has a sensible default in `defaults.yml`.

---

## Resolution chain

`scripts/config-get.sh <dot.path.key>` resolves a key in this order:

1. **The user's `.reaper.yml`** in the current working directory.
2. **The bundled `defaults.yml`** that ships with Reaper (alongside the reader script). Keys whose value is `null` here have no global default — they fall through to the next layer.
3. **`--fallback-script <path>`** — Reaper executes the script; its stdout (with trailing newlines stripped) becomes the value.
4. **`--default <value>`** — caller-supplied literal fallback.
5. **Hard error.** The reader prints `Run /reaper:init to configure missing key 'X'` to stderr and exits 1.

```
+----------------------------+
|  1. ./.reaper.yml          |  user-authored, in cwd
+----------------------------+
              |
              v (key not set / null)
+----------------------------+
|  2. defaults.yml           |  bundled with Reaper
+----------------------------+
              |
              v (key not set / null)
+----------------------------+
|  3. --fallback-script PATH |  optional: stdout becomes the value
+----------------------------+
              |
              v (script absent or failed)
+----------------------------+
|  4. --default VAL          |  optional: literal value
+----------------------------+
              |
              v (no default supplied)
+----------------------------+
|  5. Hard error, exit 1     |  "Run /reaper:init to configure 'X'"
+----------------------------+
```

`--default` is preferred over `--fallback-script` when both are supplied: literal defaults are predictable and don't spawn a subprocess. The fallback-script lane is kept for cases where the value genuinely needs to be computed from the environment (for example, picking up a CI-injected token).

`null` in either YAML file is treated as "not set" so `defaults.yml` can declare required-without-default keys explicitly and the reader still falls through.

---

## Schema reference

The keys below are grouped by section. For each: type, default, description, and a short example. The authoritative source is [`reaper.schema.json`](../reaper.schema.json) — this table mirrors it.

> **Conventions.** `type: string` means a YAML string. `default: required` means there is no fallback — the key must appear in `.reaper.yml`. `default: null` means the bundled `defaults.yml` declares the key but does not supply a value (you must set it). All other defaults come from `defaults.yml` and apply automatically when the key is absent from your `.reaper.yml`.

### `version` (required)

| Key       | Type   | Default  | Description                                                                             |
| --------- | ------ | -------- | --------------------------------------------------------------------------------------- |
| `version` | number | required | Schema version. Must equal `1` (enforced via `const`). Used to detect breaking changes. |

```yaml
version: 1
```

If a future schema revision changes shape, Reaper will emit migration guidance pointing at this file. The current schema is version 1.

### `test` (required)

Commands Reaper invokes to run the project's test suite.

| Key            | Type   | Default  | Description                                                          |
| -------------- | ------ | -------- | -------------------------------------------------------------------- |
| `test.cmd`     | string | required | Primary test command (e.g. `npm test`, `pytest`, `go test ./...`).   |
| `test.cmd_e2e` | string | _unset_  | Optional end-to-end test command, when separate from the unit suite. |

```yaml
test:
  cmd: npm test
  cmd_e2e: npm run test:e2e
```

`reaper:test-runner` reads `test.cmd` to drive the Gate 1 test execution.

### `lint` (required)

Lint command configuration.

| Key        | Type   | Default  | Description                                                 |
| ---------- | ------ | -------- | ----------------------------------------------------------- |
| `lint.cmd` | string | required | Primary lint command (e.g. `npm run lint`, `ruff check .`). |

```yaml
lint:
  cmd: npm run lint
```

If your project genuinely has no linter, set it to a no-op like `true` or a script that succeeds.

### `format`

Optional auto-format command configuration. Used by Reaper's auto-formatting hook when no native formatter is detected by file extension.

| Key          | Type   | Default | Description                                             |
| ------------ | ------ | ------- | ------------------------------------------------------- |
| `format.cmd` | string | _unset_ | Auto-format command (e.g. `npm run format`, `black .`). |

```yaml
format:
  cmd: npm run format
```

### `coverage`

Coverage threshold configuration.

| Key                  | Type   | Default | Description                                                     |
| -------------------- | ------ | ------- | --------------------------------------------------------------- |
| `coverage.threshold` | number | `80`    | Minimum coverage percentage (0–100) required for tests to pass. |

```yaml
coverage:
  threshold: 70
```

Reaper bundles a default of `80`. Lower it to match your project's minimum bar; the test-runner enforces this value, not a hardcoded one.

### `tracker` (required)

Issue tracker configuration. Reaper integrates with one tracker per project.

| Key                      | Type            | Default  | Description                                                                                  |
| ------------------------ | --------------- | -------- | -------------------------------------------------------------------------------------------- |
| `tracker.system`         | enum            | required | One of `github`, `beads`, `jira`, `linear`, `markdown_only`.                                 |
| `tracker.repo`           | string          | _unset_  | Repository slug (e.g. `owner/repo` for GitHub).                                              |
| `tracker.project_id`     | string          | _unset_  | Project board / workspace identifier (GitHub Project number, Jira project key, Linear team). |
| `tracker.default_labels` | array of string | `[]`     | Labels Reaper applies to issues it creates or updates.                                       |

```yaml
tracker:
  system: github
  repo: owner/repo
  project_id: '12'
  default_labels:
    - reaper
    - automated
```

The `markdown_only` value tells Reaper there is no tracker — `flight-plan` and `takeoff` will fall back to plan files under `.claude/plans/`.

### `worktrees`

Worktree management configuration.

| Key                        | Type   | Default             | Description                                                                             |
| -------------------------- | ------ | ------------------- | --------------------------------------------------------------------------------------- |
| `worktrees.base_path`      | string | `.claude/worktrees` | Base directory under which Reaper creates per-task worktrees.                           |
| `worktrees.naming_pattern` | string | `{task_id}-{slug}`  | Template for worktree directory names. Supports `{task_id}` and `{slug}` substitutions. |

```yaml
worktrees:
  base_path: .claude/worktrees
  naming_pattern: '{task_id}-{slug}'
```

If your project keeps worktrees somewhere unconventional (a sibling directory, a tmpfs mount), this is the lever to pull.

### `git`

Git workflow configuration.

| Key                       | Type   | Default   | Description                                                    |
| ------------------------- | ------ | --------- | -------------------------------------------------------------- |
| `git.default_base_branch` | string | `develop` | Branch new feature branches are cut from and merged back into. |

```yaml
git:
  default_base_branch: main
```

Set this to `main` if your project doesn't use a `develop` branch.

### `workflow`

Workflow gating configuration.

| Key                              | Type            | Default | Description                                                                          |
| -------------------------------- | --------------- | ------- | ------------------------------------------------------------------------------------ |
| `workflow.require_security_gate` | boolean         | `true`  | When true, Reaper runs the security-auditor gate before allowing a merge.            |
| `workflow.require_tdd`           | boolean         | `true`  | When true, Reaper enforces the Red-Green-Blue TDD cycle for coding agents.           |
| `workflow.skip_gates_for`        | array of string | `[]`    | List of file path globs whose changes bypass quality gates (e.g. docs-only changes). |

```yaml
workflow:
  require_security_gate: true
  require_tdd: true
  skip_gates_for:
    - 'docs/**'
    - '*.md'
```

These flags exist for projects that need to relax Reaper's defaults — most projects should keep them on. Setting `require_tdd: false` in particular changes coding-agent behavior project-wide.

---

## Per-language examples

Each block is a complete, valid `.reaper.yml`. Drop it at your repo root, change values to match, and run `/reaper:doctor` to verify.

### Node / TypeScript

```yaml
version: 1

test:
  cmd: npm test
  cmd_e2e: npm run test:e2e

lint:
  cmd: npm run lint

format:
  cmd: npm run format

coverage:
  threshold: 80

tracker:
  system: github
  repo: acme/widgets
  default_labels:
    - reaper

worktrees:
  base_path: .claude/worktrees
  naming_pattern: '{task_id}-{slug}'

git:
  default_base_branch: develop

workflow:
  require_security_gate: true
  require_tdd: true
```

### Python

```yaml
version: 1

test:
  cmd: pytest

lint:
  cmd: ruff check .

format:
  cmd: black .

coverage:
  threshold: 85

tracker:
  system: jira
  project_id: ACME

git:
  default_base_branch: main
```

### Go

```yaml
version: 1

test:
  cmd: go test ./...

lint:
  cmd: golangci-lint run

format:
  cmd: gofmt -w .

coverage:
  threshold: 75

tracker:
  system: github
  repo: acme/widgets-go

git:
  default_base_branch: main
```

### Rust

```yaml
version: 1

test:
  cmd: cargo test

lint:
  cmd: cargo clippy -- -D warnings

format:
  cmd: cargo fmt

coverage:
  threshold: 70

tracker:
  system: linear
  project_id: ACM

git:
  default_base_branch: main
```

---

## Migration from `CLAUDE.md` Quality Gates

Earlier versions of Reaper read the test and lint commands from a `## Quality Gates` block in your project's `CLAUDE.md`. That section is being replaced by `.reaper.yml`, which is more discoverable, schema-validated, and addressable by every Reaper component without ad-hoc parsing.

### Side-by-side

**Before** — `CLAUDE.md`:

```markdown
## Quality Gates

The following commands are used during automated quality gates:

**Test command**: `npm run test:coverage`
**Lint command**: `npm run lint`
```

**After** — `.reaper.yml`:

```yaml
version: 1

test:
  cmd: npm run test:coverage

lint:
  cmd: npm run lint

tracker:
  system: github
  repo: owner/repo
```

### Step-by-step

1. Run `/reaper:init`. The wizard reads your existing `## Quality Gates` block (if any) as a starting point, prompts for tracker details, and writes a validated `.reaper.yml`.
2. Replace your `## Quality Gates` section in `CLAUDE.md` with a one-line pointer to `.reaper.yml`. Reaper itself does this for the Reaper repo — see [`CLAUDE.md`](../CLAUDE.md).
3. Run `/reaper:doctor` to confirm the new config validates and matches what's installed.

The `## Quality Gates` block is no longer read by any Reaper component once `.reaper.yml` exists. You can delete it, or keep it as a human-readable summary that points readers at `.reaper.yml`.

---

## Commands reference

Both scripts ship with Reaper and are intended to be called by other Reaper components — but they're also usable directly from your shell when debugging.

### `scripts/config-get.sh <dot.path.key>`

Resolve a single configuration value through the resolution chain.

```bash
# Read a scalar.
scripts/config-get.sh test.cmd
# -> npm test

# Read an array (space-separated by default).
scripts/config-get.sh tracker.default_labels
# -> reaper automated

# Read an array as JSON.
scripts/config-get.sh tracker.default_labels --format json
# -> ["reaper","automated"]

# Supply a literal default for missing keys.
scripts/config-get.sh coverage.threshold --default 80

# Supply a fallback script (its stdout becomes the value).
scripts/config-get.sh tracker.repo --fallback-script ./bin/detect-repo.sh
```

Exit codes: `0` if the key resolved, `1` if every layer was empty, `2` for usage errors.

### `scripts/config-validate.sh [path]`

Validate a config file against `reaper.schema.json`.

```bash
# Validate ./.reaper.yml (default) — human output on stderr.
scripts/config-validate.sh

# Validate a specific file.
scripts/config-validate.sh path/to/.reaper.yml

# Machine-readable output.
scripts/config-validate.sh --format json
# -> {"errors":[...],"warnings":[...]}

# Use a custom schema (rare; mostly for tests).
scripts/config-validate.sh --schema ./test/fixtures/old-schema.json
```

The validator distinguishes errors from warnings:

- **Errors** — schema violations: type mismatches, missing required keys, wrong enum values, wrong `version`. These fail validation (exit 1).
- **Warnings** — unknown top-level or nested keys that aren't declared in the schema. These print prefixed with `WARN` but **do not** fail validation. Exit stays `0` if there are no errors.

The forward-compat policy is deliberate: Reaper warns about unknown keys instead of breaking your config when a future Reaper version introduces a key you haven't adopted yet, or when you add custom keys for your own tooling.

---

## Programmatic access (Node)

Both scripts also ship as ES modules for callers that already run Node:

```js
// Read a value.
import { resolveKey } from './scripts/config-get.mjs';
const { found, value, source } = resolveKey({
  key: 'test.cmd',
  userConfigPath: '.reaper.yml',
  defaultsPath: 'defaults.yml',
});

// Validate a file.
import { validateConfigFile } from './scripts/config-validate.mjs';
const { errors, warnings } = validateConfigFile(
  '.reaper.yml',
  'reaper.schema.json'
);
```

This is the same code path the shell wrappers use — there's no second implementation to drift.

---

## Forward-compatibility notes

- **Unknown keys are warnings, not errors.** Adding a custom key like `org.team_name` won't fail validation; it'll print a `WARN` line and otherwise be left alone. Reaper itself never reads keys it didn't declare in the schema, so your custom keys are safe to keep.
- **`version: 1` is fixed for the current schema.** When the schema changes shape, Reaper will recognize an old `version` value and point you at a migration guide.
- **`additionalProperties` is permissive throughout.** Sub-objects (like `test`, `tracker`, `workflow`) accept extra keys for the same reason — to keep your config forward-compatible across Reaper versions.

---

## Related documentation

- [Quality gates](quality-gates.md) — how Reaper consumes `test.cmd`, `lint.cmd`, and `coverage.threshold`.
- [Workflow](workflow.md) — where in the lifecycle the config is read.
- [Commands](commands.md#reaperinit) — `/reaper:init` and `/reaper:doctor` reference.
- [ADR-0025](adr/0025-reaper-yml-config-architecture.md) — why Reaper uses `.reaper.yml`.

[Back to README](../README.md)
