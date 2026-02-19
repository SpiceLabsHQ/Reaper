---
description: Not sure where to start? This command helps you find the right workflow.
---

# Start: Find Your Workflow

<!-- user-comms-contract -->

## User Communication Contract

Speak about work outcomes and progress — never about internal machinery, tool names, or implementation steps.

### Forbidden Terms

Do not use any of the following in user-facing messages, status cards, or progress output:

**Abstract operation names** — replace with plain language:

| Forbidden | Use instead |
|-----------|-------------|
| `FETCH_ISSUE` | "retrieving task details" or "looking up the issue" |
| `CREATE_ISSUE` | "creating a task" or "logging the issue" |
| `UPDATE_ISSUE` | "updating the task" or "recording progress" |
| `ADD_DEPENDENCY` | "linking a dependency" |
| `LIST_CHILDREN` | "listing subtasks" |
| `QUERY_DEPENDENCY_TREE` | "checking dependencies" |
| `CLOSE_ISSUE` | "marking the task complete" |

**Internal state variables** — omit or rephrase:

| Forbidden | Use instead |
|-----------|-------------|
| `TASK_SYSTEM` / `markdown_only` | "your project's task tracking setup" |
| `PLAN_CONTEXT` | "the task requirements" or "the plan" |
| `CODEBASE CONTEXT` | "the codebase" |

**Internal file sentinels** — never surface raw filenames:

`RESULTS.md`, `REVIEW.md`, `SECURITY.md`, `FAULT.md`, `TASK.md`

**Tool names** — never expose tool internals as user language:

| Forbidden | Use instead |
|-----------|-------------|
| `TaskCreate` | "tracking progress" or "updating the work plan" |
| `TaskUpdate` | "recording progress" |

**Architecture terms** — omit entirely:

`platform skill routing`, `behavioral contract`, `skill routing table`, `gate classification internals`

### Tone Rule

Describe what is happening for the user ("running tests", "planning the feature", "reviewing security") — not what the system is doing internally ("routing to skill", "resolving TASK_SYSTEM", "invoking TaskCreate").


## Visual Vocabulary

> **Opt-out**: If the project's CLAUDE.md contains the line `Reaper: disable ASCII art`, emit plain text status labels only. No gauge bars, no box-drawing, no card templates. Use the `functional` context behavior regardless of the `context` parameter.

> **Rendering constraint**: One line, one direction, no column alignment. Every visual element must be renderable in a single horizontal pass. No multi-line box-drawing that requires vertical alignment across columns. Exception: The `start` context uses box-drawing for its welcome screen cards, which are rendered once as orientation content rather than repeated status displays.

### Gauge States

Six semantic states expressed as fixed-width 10-block bars. Use these consistently across all commands to communicate work status.

```
  ██████████  LANDED       complete, healthy
  ████████░░  ON APPROACH  coding done, quality gates running
  ██████░░░░  IN FLIGHT    work in progress
  ███░░░░░░░  TAKING OFF   deploying, about to execute
  ░░░░░░░░░░  TAXIING     waiting, not started
  ░░░░!!░░░░  FAULT        failed, needs attention
```

Gauge usage rules:
- Always use exactly 10 blocks per bar (full-width = 10 filled, empty = 10 unfilled).
- The exclamation marks in the FAULT bar replace two blocks at the center to signal breakage.
- Pair each bar with its label and a short gloss on the same line.

### Quality Gate Statuses

Five inspection verdicts for quality gate results. Gate statuses are inspection verdicts, not work lifecycle states. Use gauge states for work unit progress, gate statuses for quality inspection results.

| Status | Meaning |
|--------|---------|
| **PASS** | gate passed all checks |
| **FAIL** | gate found blocking issues |
| **RUNNING** | gate currently executing |
| **PENDING** | gate not yet started |
| **SKIP** | gate not applicable to this work type |

### Runway Card

Render when the start command is invoked with no input (bare invocation). Shows the three workflow entrypoints and how they connect.

```
  REAPER
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Three workflows. Each builds on the last.

  ┌─ SQUADRON ─────────────────────────┐
  │  Think before you plan.            │
  │                                    │
  │  Design decisions & architecture.  │
  │  Assembles domain experts who      │
  │  debate, clash, and converge.      │
  │                                    │
  │  /reaper:squadron <question>       │
  └────────────────────────────────────┘
          ↓ feeds into
  ┌─ FLIGHT-PLAN ──────────────────────┐
  │  Start most work here.             │
  │                                    │
  │  Breaks scope into parallel tasks  │
  │  with dependencies mapped. Creates │
  │  issues ready for execution.       │
  │                                    │
  │  /reaper:flight-plan <description> │
  └────────────────────────────────────┘
          ↓ feeds into
  ┌─ TAKEOFF ──────────────────────────┐
  │  Give it a task and walk away.     │
  │                                    │
  │  Writes code test-first through    │
  │  mandatory quality gates. Presents │
  │  finished work for your sign-off.  │
  │                                    │
  │  /reaper:takeoff <task>            │
  └────────────────────────────────────┘
```

Runway card rules:
- Show exactly three entrypoint boxes in the order: SQUADRON, FLIGHT-PLAN, TAKEOFF.
- Connect each pair with `↓ feeds into` between closing and opening boxes.
- Each box contains: tagline (bold first line), description (2-3 lines), and command syntax.
- Use the REAPER branded header with heavy rule (━━━) at the top.

### Input Analysis Card

Render when the start command is invoked with user input. Shows the parsed input, key elements extracted, and routing factors that determine which workflow to recommend.

```
  REAPER
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌───────────────────────────────────────────────┐
  │                                               │
  │  "[user's input quoted back]"                 │
  │                                               │
  │                  * * *                        │
  │                                               │
  │  KEY ELEMENTS                                 │
  │                                               │
  │  ★  [Concern 1]                               │
  │     [Sub-detail expanding on concern]         │
  │                                               │
  │  ★  [Concern 2]                               │
  │     [Sub-detail expanding on concern]         │
  │                                               │
  │                  * * *                        │
  │                                               │
  │  ROUTING FACTORS                              │
  │                                               │
  │  [Factor]      [value — with editorial gloss] │
  │  [Factor]      [value — with editorial gloss] │
  │                                               │
  └───────────────────────────────────────────────┘
```

Input analysis card rules:
- Quote the user's input verbatim inside the box, wrapped in double quotes.
- KEY ELEMENTS section: Extract 2-4 key concerns from the input, each with a ★ bullet and a sub-detail line.
- ROUTING FACTORS section: List factors as key-value pairs that explain why a specific workflow is recommended (e.g., Complexity, Scope, Dependencies, Design risk).
- Separate sections with `* * *` centered dividers.
- Use the REAPER branded header with heavy rule (━━━) at the top.


Parse `[ARGUMENTS]` to determine which mode to enter.

- **If `[ARGUMENTS]` is empty or whitespace** -- enter Mode 1 (Bare Invocation).
- **If `[ARGUMENTS]` contains any text** -- enter Mode 2 (Input Classification).

---

## Mode 1 -- Bare Invocation

The user typed `/reaper:start` with no arguments. They need guidance on which workflow to use.

### Render the Runway Card

Use the Runway Card from the Visual Vocabulary above to greet the user. This is the welcome mat.

### Present Workflow Options

After the Runway Card, present three options using AskUserQuestion. Each option maps to a downstream command. The descriptions are educational -- they tell the user what each workflow does and when to pick it.

```json
{
  "questions": [{
    "question": "What are you working on?",
    "header": "Pick a Workflow",
    "options": [
      {
        "label": "I have a design question",
        "description": "Assembles domain experts to explore architecture, trade-offs, and competing approaches before you commit to a direction."
      },
      {
        "label": "I have a feature to plan",
        "description": "Breaks your feature into parallel work units with dependencies mapped. Creates issues ready for autonomous execution."
      },
      {
        "label": "I have a task to build",
        "description": "Give it a task ID or description and walk away. Writes code test-first through mandatory quality gates."
      }
    ],
    "multiSelect": false
  }]
}
```

### Handle Selection

Map the user's choice to a downstream command and invoke it. The downstream command will prompt the user for details.

| Selection | Action |
|-----------|--------|
| "I have a design question" | `Skill("reaper:squadron")` |
| "I have a feature to plan" | `Skill("reaper:flight-plan")` |
| "I have a task to build" | `Skill("reaper:takeoff")` |
| Other (freeform text) | Treat as input -- fall through to Mode 2 using the freeform text as `[ARGUMENTS]` |

Invoke the Skill with no arguments. The downstream command will ask the user for its own input.

---

## Mode 2 -- Input Classification

The user typed `/reaper:start <input>`. Classify the input and recommend the best workflow, but always let the user override.

### Step 1: Classify Input

Apply these heuristic rules in order. Stop at the first match.

**Rule 1 -- Task ID pattern detected: recommend takeoff**

<!-- user-comms: describe detection as "looks like a task ID" — do not expose regex patterns or rule numbers in user output -->
Match any of these patterns in the input:
- `PROJ-123` (uppercase letters, dash, digits)
- `repo-a3f` (lowercase letters, dash, alphanumeric short hash)
- `#456` (hash followed by digits)

These three patterns are sufficient and unambiguous. Do not apply broader regex matching -- hyphenated English words like "real-time" or "trade-off" are not task IDs.

If a task ID pattern is found anywhere in the input, classify as **takeoff**.

**Rule 2 -- Design keywords detected (and no task ID): recommend squadron**

Check whether the input contains any of these keywords or phrases (case-insensitive):
- architecture
- design
- decision
- migrate
- strategy
- trade-off (or tradeoff)
- "should we"
- compare

If one or more design keywords match AND Rule 1 did not match, classify as **squadron**.

**Rule 3 -- Everything else: recommend flight-plan**

If neither Rule 1 nor Rule 2 matched, classify as **flight-plan**.

### Step 2: Render the Input Analysis Card

Use the Input Analysis Card from the Visual Vocabulary above. Populate it with:
- The user's input
- The detected classification
- The recommended workflow

### Step 3: Present Options with Recommendation

Present all three workflows using AskUserQuestion. The recommended option appears first and is marked "(Recommended)". Option descriptions explain WHY each workflow fits (or does not fit) the input -- this is how the user learns which workflow to pick in the future.

**If classified as takeoff:**

```json
{
  "questions": [{
    "question": "How would you like to proceed?",
    "header": "Input Analysis",
    "options": [
      {
        "label": "takeoff (Recommended)",
        "description": "This looks like a task ID or a specific piece of work. Takeoff will fetch the task details, set up a worktree, and execute it autonomously with quality gates."
      },
      {
        "label": "flight-plan",
        "description": "Choose this if the input describes a larger feature that should be decomposed into multiple tasks before execution."
      },
      {
        "label": "squadron",
        "description": "Choose this if you need to explore design trade-offs and get expert opinions before committing to a direction."
      }
    ],
    "multiSelect": false
  }]
}
```

**If classified as squadron:**

```json
{
  "questions": [{
    "question": "How would you like to proceed?",
    "header": "Input Analysis",
    "options": [
      {
        "label": "squadron (Recommended)",
        "description": "This sounds like a design question. Squadron assembles domain experts to debate trade-offs and produce a technical brief before you commit to a direction."
      },
      {
        "label": "flight-plan",
        "description": "Choose this if you already know the direction and want to decompose it into executable work units."
      },
      {
        "label": "takeoff",
        "description": "Choose this if the work is already scoped and ready to build -- no planning or design exploration needed."
      }
    ],
    "multiSelect": false
  }]
}
```

**If classified as flight-plan:**

```json
{
  "questions": [{
    "question": "How would you like to proceed?",
    "header": "Input Analysis",
    "options": [
      {
        "label": "flight-plan (Recommended)",
        "description": "This looks like a feature that needs decomposition. Flight-plan will break it into parallel work units, map dependencies, and create issues for autonomous execution."
      },
      {
        "label": "takeoff",
        "description": "Choose this if the work is small enough to execute directly without planning -- a single task, not a multi-step feature."
      },
      {
        "label": "squadron",
        "description": "Choose this if you are unsure about the technical approach and want expert debate before committing to a plan."
      }
    ],
    "multiSelect": false
  }]
}
```

### Step 4: Handle Selection

Map the user's choice to a downstream command. Pass the original user input as arguments so the downstream command has context.

<!-- user-comms: do not surface skill routing or platform detection details to the user — just invoke the selected workflow -->
| Selection | Action |
|-----------|--------|
| "takeoff (Recommended)" or "takeoff" | `Skill("reaper:takeoff", args="[original-user-input]")` |
| "flight-plan (Recommended)" or "flight-plan" | `Skill("reaper:flight-plan", args="[original-user-input]")` |
| "squadron (Recommended)" or "squadron" | `Skill("reaper:squadron", args="[original-user-input]")` |
| Other (freeform text) | Combine freeform text with original input, re-classify, and present options again |

Replace `[original-user-input]` with the exact text from `[ARGUMENTS]`.

---

## Scope Boundary

This is a routing command. Classify and delegate only. Never execute downstream logic -- that belongs to squadron, flight-plan, and takeoff respectively.
