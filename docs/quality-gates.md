# Quality Gates

*Claude gets picky so you don't have to be.*

Every task Reaper executes passes through mandatory quality gates before you see it. No half-finished work reaches your review queue. The gate pipeline runs automatically after each coding agent completes its work, and failures loop back to the coding agent with specific issues to fix -- without your involvement.

## The Three-Layer Pipeline

Quality validation runs in two sequential phases (three agent layers). Gate 1 must pass before Gate 2 begins. Gate 2 agents run in parallel.

### Gate 1: reaper:test-runner (blocking)

Gate 1 must pass before anything else proceeds.

- Full test suite execution
- 70%+ line coverage for application code (project default; configurable per-project)
- Linting and type checking
- Build validation

The test-runner is the sole authoritative source of test metrics. Coding agents run tests during TDD for fast feedback, but only the test-runner's results determine whether the gate passes.

### Gate 2: SME reviewer + reaper:security-auditor (parallel)

Gate 2 deploys a work-type-matched SME agent using the code-review skill, alongside the security auditor. Both agents run simultaneously. Both must pass.

**SME reviewer (via code-review skill):**

Rather than a fixed code-reviewer agent, Gate 2 selects a subject matter expert based on the work type of the changeset. The SME receives the universal `skills/code-review/SKILL.md` content, a matching specialty file (if applicable), and `PLAN_CONTEXT` from the task plan. This ensures code review is performed by an agent with domain expertise in the specific work type.

- Plan adherence verification (did the agent build what was specified?)
- SOLID principles and DRY compliance
- Test quality review (flaky patterns, over-mocking, missing edge cases)
- Build compilation validation
- Domain-specific review criteria from the specialty file

**Security auditor:**
- Vulnerability scanning with Trivy, Semgrep, and TruffleHog
- Hardcoded secrets detection
- Dependency CVE analysis
- OWASP Top 10 compliance checks

## Iteration Behavior

When a gate fails, the work returns to the coding agent automatically. The agent receives the specific `blocking_issues` array from the failed gate response and addresses each item.

After the coding agent applies fixes, only the failed gate re-runs -- not the entire pipeline. Each gate agent has its own retry limit before escalating to you:

| Gate Agent | Max Iterations | Rationale |
|------------|---------------|-----------|
| reaper:test-runner | 3 | Most likely to need iteration (test failures, coverage gaps) |
| SME reviewer (via code-review skill) | 1 | SME reviewers perform one focused pass per iteration |
| reaper:security-auditor | 1 | Security issues require careful one-pass remediation |
| reaper:ai-prompt-engineer | 1 | Prompt quality review is typically one-pass |
| reaper:deployment-engineer | 1 | Pipeline validation is typically one-pass |

If any gate exceeds its iteration limit, Reaper escalates to you with a summary of what failed and what was attempted. You decide how to proceed.

## Dynamic Gate Profiles

Not all work needs the same gates. Reaper auto-detects the work type from file paths and extensions in the changeset, then selects the appropriate gate agents.

| Work Type | Gate 1 (blocking) | Gate 2 (parallel) | reviewer_agent |
|-----------|-------------------|-------------------|----------------|
| Application code | test-runner | SME reviewer + security-auditor | feature-developer |
| Infrastructure (Terraform, K8s, Docker) | -- | SME reviewer + security-auditor | cloud-architect |
| Database migrations | -- | SME reviewer | database-architect |
| API specifications (OpenAPI, GraphQL) | -- | SME reviewer | api-designer |
| Agent prompts | -- | ai-prompt-engineer + SME reviewer | ai-prompt-engineer |
| Documentation | -- | SME reviewer | technical-writer |
| CI/CD pipelines | -- | SME reviewer + security-auditor | deployment-engineer |
| Test code | test-runner | SME reviewer | feature-developer |
| Configuration files | -- | SME reviewer + security-auditor | feature-developer |

Work types with no Gate 1 skip directly to Gate 2.

When a changeset spans multiple work types, Reaper computes the union of all matching profiles. If any profile includes a Gate 1, it remains blocking. Gate 2 agents are deduplicated across profiles. For example, a changeset touching both `src/auth.ts` and `terraform/main.tf` produces Gate 1: test-runner (blocking), Gate 2: SME reviewers (reaper:feature-developer for application code, reaper:cloud-architect for infrastructure) + security-auditor.

The default profile is `application_code`. If no file pattern matches a known work type, the full test-runner through SME reviewer (reaper:feature-developer with code-review skill) + security-auditor pipeline applies.

### Skill Injection

Each SME reviewer receives three pieces of context when deployed:

1. **SKILL_CONTENT** -- the full text of `skills/code-review/SKILL.md`, which defines the universal review checklist (plan adherence, SOLID principles, test quality, etc.)
2. **SPECIALTY_CONTENT** -- an optional specialty file from `skills/code-review/` matching the work type (e.g., `application-code.md` for application code, `database-migration.md` for migrations). Work types without a specialty file omit this field entirely.
3. **PLAN_CONTEXT** -- the materialized plan content from the task, giving the reviewer full context on what was intended.

This pattern allows any domain expert agent to perform a high-quality code review without needing a dedicated reviewer agent. The universal skill ensures consistent review standards while the specialty file adds domain-specific criteria.

## Self-Learning Loop

When quality gates require two or more iterations on a task, Reaper examines the `blocking_issues` from each failed attempt and identifies recurring error patterns -- the same class of issue appearing across iterations or sessions.

For each pattern, Reaper drafts a one-line CLAUDE.md entry that would prevent the error from recurring. A two-question filter applies: (a) would Claude make this mistake again without the entry? (b) is the lesson non-obvious from existing project files?

Entries are never auto-applied. You review and approve them via `/reaper:claude-sync`, which analyzes recent changes and presents suggested documentation updates for your decision. Maximum three suggestions per session.

## User Approval

Only after all gates pass does completed work reach your review queue. Reaper presents a summary of what was built, which gates ran, and what files changed.

You explicitly control what happens next:

| Your Response | What Happens |
|---------------|--------------|
| Feedback or questions | Reaper addresses concerns, re-runs gates if changes are made |
| "looks good" / "nice work" | Reaper asks for merge confirmation |
| "merge" / "ship it" / "approved" | reaper:branch-manager merges to develop |

No code lands on your main branch without your say-so.

---

[Back to README](../README.md)
