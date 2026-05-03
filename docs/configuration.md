# Configuration (`.reaper.yml`)

> **Initial Draft.** This page documents the foundational `.reaper.yml`
> infrastructure delivered in SPC-9. The full configuration guide — including
> migration tables, per-key examples, and end-to-end recipes — is authored in
> SPC-21. Treat anything below as the canonical schema reference until then.

Reaper is configured per project by a `.reaper.yml` file at the repository
root. The file's shape is pinned by [`reaper.schema.json`](../reaper.schema.json),
a JSON Schema draft-07 document. Reaper's reader and validator both consume
the same schema, so what passes validation is exactly what the reader will
return.

## Resolution chain

`scripts/config-get.sh <dot.path.key>` resolves a key in this order:

1. The user's `.reaper.yml` (in the current working directory)
2. The bundled `defaults.yml` (alongside the script in the plugin root)
3. `--fallback-script <path>` — executed; its stdout becomes the value
4. `--default <value>` — caller-supplied literal fallback
5. Hard error: `Run /reaper:init to configure missing key 'X'` (exit 1)

`--default` is preferred over `--fallback-script` when both are supplied:
literal defaults are predictable and don't spawn a subprocess.

## Sample valid `.reaper.yml`

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
  system: github # one of: github | beads | jira | linear | markdown_only
  repo: owner/repo
  default_labels:
    - reaper
    - automated

worktrees:
  base_path: .claude/worktrees
  naming_pattern: '{task_id}-{slug}'

git:
  default_base_branch: develop

workflow:
  require_security_gate: true
  require_tdd: true
  skip_gates_for:
    - 'docs/**'
    - '*.md'
```

## Validating a config

```bash
scripts/config-validate.sh .reaper.yml             # human output, errors on stderr
scripts/config-validate.sh .reaper.yml --format json   # structured output on stdout
```

Errors fail validation (exit 1). Unknown keys are warnings (`WARN <field>`)
and do not fail validation on their own — Reaper warns instead of breaking
forward-compatibility for keys it does not recognize.

## Reading a config value

```bash
scripts/config-get.sh test.cmd
scripts/config-get.sh tracker.default_labels                    # space-separated
scripts/config-get.sh tracker.default_labels --format json      # JSON array
scripts/config-get.sh coverage.threshold --default 80
```

## Schema reference

See [`reaper.schema.json`](../reaper.schema.json) for the canonical type
definitions, allowed enum values, and per-field descriptions. The full
configuration guide (SPC-21) will expand each key with examples, defaults,
and migration notes.
