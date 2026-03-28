# ADR-0024: Work-Type-Aware Work Unit Sizing

**Date**: 2026-03-27
**Status**: Proposed

---

## Context

### The uniform size cap

The workflow planner enforces a uniform size constraint on all work units: maximum 5 files and approximately 500 lines of code per unit. Any work unit exceeding either limit is flagged as a red flag ("too large") and must be decomposed further. Strategy 3 (`large_multi_worktree`) is triggered when any single work unit exceeds these limits.

This uniform cap was a reasonable starting default. It kept work units within the reliable output range for LLM coding agents and avoided context exhaustion on complex tasks. However, it treats all file types as equally risky, which creates two problems:

**1. Low-risk work is over-constrained.** Test files, documentation, and configuration files have low integration risk -- they rarely break other components when changed. A test file at 800 LOC is structurally repetitive (setup, act, assert) and well within an agent's reliable output range. Under the uniform cap, this file forces decomposition into two work units, doubling the quality gate overhead for no reliability gain.

**2. High-risk work is under-constrained.** A 500-LOC change to a shared interface module that is imported by 30 other files carries significantly more integration risk than a 500-LOC test file. The uniform cap treats them identically. An agent producing 500 lines of shared interface code is more likely to introduce defects than one producing 500 lines of test assertions, but both pass the same size gate.

### Gate overhead is fixed per work unit

Research confirms that LLM accuracy degrades with output token count, not just context length. Quality gate overhead, however, is fixed per work unit regardless of size: each unit triggers a full test-runner pass, an SME code review, and a security audit. The optimization goal is to maximize gate-amortized work per unit while staying within the high first-pass reliability range for each work type.

Under the uniform cap, a takeoff session decomposing a feature into 8 work units runs 8 full gate cycles. If 4 of those units are test files that could safely be twice as large, the session runs 4 unnecessary gate cycles -- each adding wall-clock time, token cost, and coordination overhead.

### Classification must be deterministic

The workflow planner must classify each work unit's type to apply per-type limits. Two approaches exist:

**LLM inference**: The planner reads each file and uses judgment to classify it. This is flexible but non-deterministic -- the same file may be classified differently across planning sessions, and the classification is not auditable without re-reading the planner's reasoning.

**Pattern matching**: File path patterns map deterministically to work types. `tests/**/*.test.ts` is always `test_code_unit`. `docs/**/*.md` is always `documentation`. The mapping is a static lookup table that produces identical results for identical inputs.

Pattern matching is sufficient for the majority of files because software projects follow consistent naming conventions. The edge case is `application_code`, where two files with identical path patterns (e.g., `src/utils/helpers.ts` and `src/core/auth.ts`) may have vastly different integration risk depending on how many other modules depend on them.

### The application_code complexity problem

Not all application code carries equal risk. A utility function imported by 2 files is low-risk; a shared interface imported by 30 files is high-risk. The uniform cap cannot distinguish between them, and path patterns alone cannot either -- both live under `src/` with the same file extension.

The distinguishing signal is coupling: how many other files import or depend on the file in question. A file with high import count (many modules import it) or high export count (it exposes many public interfaces) is a high-coupling module. Changes to high-coupling modules propagate widely and are more likely to cause integration failures.

This coupling signal is available at planning time via a targeted `grep` for import statements referencing the candidate file. The cost is one grep call per `application_code` file -- bounded by the number of files in the work unit, not by the size of the codebase.

---

## Decision

### Decision 1: Pattern-first work_type classification

Work unit classification uses a deterministic pattern-matching procedure. During the grounding phase, the planner scans candidate files and maps each to a `work_type` using path patterns:

| Path Pattern | work_type |
|---|---|
| `tests/**/*.test.*`, `test/**/*.spec.*`, `__tests__/**/*` | `test_code_unit` |
| `tests/**/*.integration.*`, `test/**/*.e2e.*`, `cypress/**/*` | `test_code_integration` |
| `src/**/*.ts`, `src/**/*.js`, `app/**/*.php`, `lib/**/*.rb`, `**/*.go` (and similar source extensions) | `application_code` |
| `docs/**/*.md`, `**/*.mdx`, `*.md` | `documentation` |
| `migrations/**/*`, `db/**/*`, `**/schema.*` | `database_migration` |
| `openapi.*`, `swagger.*`, `**/*.graphql`, `**/*.proto` | `api_specification` |
| `src/agents/**/*`, `src/skills/**/*`, `src/commands/**/*`, `prompts/**/*` | `agent_prompt` |
| `.github/workflows/**/*`, `Jenkinsfile`, `.gitlab-ci.yml`, `Dockerfile`, `docker-compose.*` | `ci_cd_pipeline` |
| `terraform/**/*`, `k8s/**/*`, `infra/**/*`, `*.tf`, `helm/**/*` | `infrastructure_config` |
| `*.config.*`, `*.json`, `*.yaml`, `*.yml`, `*.toml`, `.env*` | `configuration` |

When a file matches multiple patterns, the more specific pattern wins. When files in a work unit span multiple types, the dominant type (most files) determines the unit's `work_type`.

Pattern matching is the primary classification mechanism. The planner does not use LLM inference to override pattern-based classification. If a file does not match any pattern, it defaults to `application_code`.

### Decision 2: Import-count and export-count heuristic for application_code complexity

For files classified as `application_code`, the planner runs a targeted grep to assess coupling complexity:

1. For each candidate `application_code` file, grep the codebase for import/require statements referencing that file's module path.
2. Count the number of distinct files that import the candidate (import count).
3. Optionally count the number of exported symbols in the candidate file (export count).
4. Classify complexity based on the coupling signal:
   - **Low complexity**: Import count <= 5. The file is loosely coupled; changes are unlikely to propagate.
   - **High complexity**: Import count > 5, or the file is in a known high-risk path (auth, payment, core shared interfaces). Changes affect many dependents and carry elevated integration risk.

This heuristic is recorded as a `complexity` field (`low` or `high`) on `application_code` work units in the planning output. The field is conditional -- it appears only on `application_code` units where the grep-based assessment was performed.

The heuristic will replace the ad-hoc `+2 auth/payment/core logic` bonus in the complexity scoring dimensions (see #37). Instead of path-based bonuses that assume risk from directory names, the import-count grep will measure actual coupling from the codebase's dependency graph.

### Decision 3: Per-type size limits replace the uniform cap

Each `work_type` has its own maximum file count and maximum LOC, calibrated to the type's reliability profile:

| work_type | Max Files | Max LOC | Rationale |
|---|---|---|---|
| `application_code` | 5 | 500 | Standard cap; when Decision 2 lands (#37), this will split into low-complexity (5/500) and high-complexity (3/300) tiers |
| `test_code_unit` | 5 | 1000 | Repetitive structure (setup/act/assert) is reliable at higher volume |
| `test_code_integration` | 5 | 800 | Cross-component interaction requires more setup but follows predictable patterns |
| `database_migration` | 3 | 200 | Schema changes are high-risk and must be minimal |
| `infrastructure_config` | 5 | 400 | Infrastructure changes are high-risk but often verbose (Terraform, Helm) |
| `api_specification` | 3 | 300 | Contract changes propagate to consumers; conservative constraint |
| `agent_prompt` | 3 | -- | No LOC limit; prompt files are prose/declarative where line counts are not a reliable proxy for complexity |
| `documentation` | 10 | -- | No LOC limit; documentation is low-risk and benefits from batch production |
| `ci_cd_pipeline` | 5 | 300 | Pipeline changes affect all builds; moderate limit |
| `configuration` | 5 | 300 | Config files are low-risk but should stay focused |
| `architecture_review` | 10 | -- | No LOC limit; review artifacts are prose/declarative content |

These limits are defined in a single shared partial (`src/partials/work-unit-limits.ejs`) consumed by both the workflow planner and the takeoff command's validator. This ensures the planner and executor enforce identical constraints.

The "Red Flags (Too Large)" heuristic is updated to reference work-type limits instead of the hardcoded 5-file/500-LOC values. The Strategy 3 escalation trigger -- previously "any work unit >5 files or >500 LOC" -- becomes "any work unit exceeding its work_type's max files or max LOC."

---

## Consequences

**Positive:**

- Low-risk work types (test files, documentation) can be batched into larger work units, reducing the number of quality gate cycles per takeoff session. A session that previously required 8 gate cycles for 8 small test units may now require 4 cycles with larger test units -- halving gate overhead without reducing reliability.
- High-risk work types (database migrations, shared interfaces) receive tighter limits than before, catching over-scoped changes that the uniform 500-LOC cap permitted. A 400-LOC migration that passed the old gate is now flagged for decomposition.
- Classification is deterministic and auditable. Given the same file paths, the pattern table produces the same work types every time. There is no LLM judgment in the classification step, so results are reproducible across planning sessions.
- The import-count heuristic will provide an evidence-based coupling signal that will replace the ad-hoc `+2 auth/payment/core logic` scoring bonus (#37). Instead of assuming risk from directory names, the planner will measure actual dependency relationships in the codebase.
- The shared partial ensures the planner and takeoff validator agree on limits. Changing a limit in one place updates both consumers, eliminating the risk of divergent enforcement.

**Negative / Risks:**

- Pattern matching is brittle for non-standard project structures. A project that places tests in `src/` alongside source files, or uses unconventional extensions, will misclassify files. The default-to-`application_code` fallback is conservative (it applies the standard cap), but misclassification means the work type's intended limits are not applied.
- The import-count grep adds a per-file cost during planning. For work units with many `application_code` files, this is multiple grep calls against the codebase. In large repositories, this may add noticeable latency to the planning phase. The cost is bounded (one grep per candidate file, not per codebase file), but it is non-zero.
- Per-type limits are more complex to reason about than a single uniform cap. Contributors modifying the limits table must understand why each type has its specific values and how changes propagate through the planner and takeoff validator. The shared partial mitigates but does not eliminate this complexity.
- The `test_code` split into `test_code_unit` and `test_code_integration` doubles the number of test-related types. Misclassification between the two (e.g., an integration test file matching the unit test pattern) applies the wrong limit. The consequence is bounded -- 1000 LOC vs 800 LOC -- but the distinction adds classification surface area.
- The complexity heuristic uses a simple import-count threshold. It does not account for the nature of the imports (a file imported for a type definition carries less risk than one imported for runtime behavior) or transitive dependencies. The heuristic is a coarse signal, not a precise risk model.

---

## Alternatives Considered

**Uniform limits with a higher cap** -- Raise the uniform cap (e.g., 8 files / 800 LOC) to accommodate low-risk work types without introducing per-type logic. Rejected because a higher uniform cap also applies to high-risk types. A database migration at 800 LOC is significantly riskier than a test file at 800 LOC, but a uniform cap cannot distinguish between them. Raising the cap improves efficiency for low-risk work at the cost of reliability for high-risk work.

**Pure LLM inference for classification** -- Let the planner read each file and classify it using judgment rather than pattern matching. Rejected because LLM classification is non-deterministic. The same file may be classified differently across sessions, making planning results non-reproducible. It also adds token cost (the planner must read file contents for classification) and cannot be validated without re-running the planner. Pattern matching is cheaper, deterministic, and sufficient for the majority of files. The import-count heuristic handles the one case (application_code complexity) where path patterns are genuinely insufficient.

**Complexity tiers for all work types** -- Apply the import-count/export-count heuristic to every work type, not just `application_code`. Rejected because other work types have natural complexity bounds. Test files do not have importers in the same way source modules do; documentation files have no dependency graph; infrastructure config files are not imported by application code. The heuristic is meaningful only for `application_code`, where coupling varies widely across files with identical path patterns.

**Static risk scores per directory** -- Assign risk scores to well-known directories (e.g., `src/core/` = high risk, `src/utils/` = low risk) instead of grep-based coupling analysis. Rejected because directory naming conventions vary across projects and do not reliably predict coupling. A `utils/` directory may contain the most heavily imported module in the codebase. The import-count grep measures actual coupling rather than inferring it from directory names.

---

## Related Decisions

- **ADR-0015: Workflow-Planner Process Extraction** -- The per-type limits and classification procedure are implemented in the extracted planning skill (`reaper:workflow-planner-planning`), consistent with the process-in-skills pattern this ADR established.
- **ADR-0017: Workflow-Planner Task Dispatch** -- The planning skill executes within the workflow-planner agent context via Task dispatch, ensuring the agent's heuristics and domain knowledge are available when classification and sizing decisions are made.
