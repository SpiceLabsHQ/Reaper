# Prompt Engineering Knowledge Base

> Reference document for the `ai-prompt-engineer` agent and any agent that writes or reviews LLM prompts.

## Foundational Principles

### 1. Be Explicit and Specific

Ambiguity is the primary cause of poor LLM output. Vague instructions produce generic results.

```
# Less effective
Create an analytics dashboard

# More effective
Create an analytics dashboard. Include as many relevant features
and interactions as possible. Go beyond the basics to create a
fully-featured implementation.
```

Claude 4.x models follow instructions with high precision. This means vague prompts get literally vague results, but precise prompts get precisely what you asked for.

### 2. Provide Context and Motivation

Explain *why*, not just *what*. Claude 4.x generalizes from explanations, inferring related constraints from reasoning.

```
# Less effective (rigid rule)
NEVER use ellipses

# More effective (reasoned constraint)
Your response will be read aloud by a text-to-speech engine,
so never use ellipses since the engine won't know how to
pronounce them.
```

### 3. Define Output Format Explicitly

Specify the shape of the response: JSON schema, markdown structure, prose paragraphs, or XML-tagged sections. Claude 4.x models are highly steerable on format.

**Techniques for format control:**
- XML format indicators: `<smoothly_flowing_prose_paragraphs>` tags
- Style matching: The formatting used in the prompt influences the response
- Positive framing: "Write in flowing prose paragraphs" instead of "Do not use markdown"

### 4. Tell the Model What TO Do, Not What NOT to Do

Negative instructions ("don't use markdown") leave the model guessing. Positive framing ("write in flowing prose paragraphs") gives it a clear target.

### 5. Match Prompt Style to Desired Output

The formatting style in the prompt influences the response style. If you don't want markdown, remove markdown from the prompt itself. If you want structured XML output, use XML structure in the prompt.

---

## Advanced Techniques

### Chain-of-Thought (CoT)

**When to use:**
- Complex multi-step reasoning, math, logic, and code generation
- Tasks requiring explicit reasoning traces for debugging or auditing
- Structured CoT with XML tags (`<thinking>`, `<answer>`) to separate reasoning from output

**When to skip or be cautious:**
- Straightforward tasks where the model already "thinks" internally
- Frontier models where explicit CoT provides diminishing lift (Wharton, June 2025)
- Out-of-distribution tasks where CoT can be counterproductive (arXiv, 2025-2026)

**Claude 4.x specifics:**
- Models are sensitive to the word "think" when extended thinking is disabled
- Prefer alternatives: "consider," "evaluate," "reflect"
- Use interleaved thinking for reflection after tool use:
  ```
  After receiving tool results, carefully reflect on their quality
  and determine optimal next steps before proceeding.
  ```

### Few-Shot Prompting

**The shift:** Modern frontier models understand most tasks from descriptions alone. Few-shot examples can bias the model toward patterns that don't generalize. Some reasoning models actually perform worse with few-shot examples.

**When examples are still valuable:**
- Demonstrating exact output format or schema
- Establishing tone and style
- Disambiguating edge cases
- Showing 1-2 diverse examples (not 5 similar ones)

**Anti-pattern:** Repeating the same examples causes overfitting to specific patterns.

### Task Decomposition / Prompt Chaining

Breaking complex tasks into atomic subtasks remains one of the highest-impact techniques:
- Monolithic prompts that try to do everything lead to hallucination, missed tasks, and quality degradation
- Modular prompts reduce token usage per call and improve accuracy per subtask
- Aligns naturally with multi-agent architectures

### Meta-Prompting

Using an LLM to generate, refine, or improve prompts:
- Creating reusable prompt templates at scale
- Systematically improving prompts through iteration
- Building applications where prompt quality directly impacts results

### ReAct (Reason + Act)

Separates reasoning tokens from tool invocation:
- Uses a "scratchpad" mechanism for robust planning
- Improves tool-use reliability
- Foundational pattern for general-purpose agents

### Reflection Pattern

Treats model output as a draft, then has the model critically evaluate its own work:
- Converts the LLM from a generator into a self-correcting system
- Useful for code review, writing quality, and factual accuracy

---

## Token Optimization Strategies

Token optimization is a production architecture concern, not premature optimization.

### Input Token Optimization

**Concise prompting:**
- More tokens does not mean better results
- Bloated prompts dilute signal, causing focus on irrelevant details
- Well-optimized prompts often produce superior output to verbose alternatives

**Prompt compression:**
- Remove redundancy, summarize context, optimize examples
- Apply word-level substitutions and strip extraneous characters
- Always test compressed prompts for output quality
- Lossy compression that removes critical context forces hallucination

**Conditional context inclusion:**
- Include instructions only when relevant to the current task
- System prompts often contain sections relevant only in specific scenarios
- No point burning tokens on instructions for tools not in use

### Output Token Management

Output tokens often dominate costs and latency more than input tokens:
- Explicitly constrain output length and format
- Specify when summaries vs. detailed responses are needed
- Use structured output (JSON, XML) to prevent verbose prose when not needed

### Model Routing / Right-Sizing

- Use cheaper, smaller models for simple tasks
- Well-crafted context can let a lighter model match a heavier one
- Plan-and-Execute pattern: capable model (Opus) plans, cheaper models (Haiku) execute — up to 90% cost reduction

### The Compression Tradeoff

There is no single optimizer for all cases. Increased compression comes at the cost of model performance. The key is finding the right balance per task:
- **Clarity-critical tasks**: Prefer verbosity over token savings
- **High-volume tasks**: Invest in compression and testing
- **Safety-critical instructions**: Redundancy is acceptable and encouraged

---

## Claude 4.x Model-Specific Guidance

### Precise Instruction Following

Claude 4.x follows instructions more precisely than predecessors:
- Be explicit about "above and beyond" behavior if you want it
- Examples in the prompt are taken very literally — ensure alignment with desired behavior
- Aggressive trigger language ("CRITICAL: You MUST...") can cause overtriggering in Opus 4.5
- Use natural language instead of all-caps directives where possible

### Extended and Interleaved Thinking

```
After receiving tool results, carefully reflect on their quality
and determine optimal next steps before proceeding. Use your
thinking to plan and iterate based on this new information.
```

### Long-Horizon Reasoning and State Tracking

Claude 4.5 excels at maintaining orientation across extended sessions:
- Use structured formats (JSON) for state data
- Use unstructured text for progress notes
- Use git for state tracking across sessions
- Write tests before starting work in structured format (e.g., `tests.json`)
- Create setup scripts for graceful restarts across context windows

### Context Awareness

Claude 4.5 models can track their remaining context window:
```
Your context window will be automatically compacted as it
approaches its limit, allowing you to continue working
indefinitely. Do not stop tasks early due to token budget
concerns. Save progress and state before context refreshes.
```

### Parallel Tool Calling

Claude 4.x aggressively parallelizes tool calls. Steerable to ~100% reliability:
```
If you intend to call multiple tools and there are no
dependencies between the calls, make all independent calls
in parallel. Never use placeholders or guess missing parameters.
```

### Anti-Overengineering

Claude 4.x (especially Opus 4.5) tends to overengineer. Explicit constraints help:
```
Avoid over-engineering. Only make changes that are directly
requested or clearly necessary. Keep solutions simple and focused.
Don't create helpers, utilities, or abstractions for one-time
operations. Don't design for hypothetical future requirements.
```

### Code Exploration

Opus 4.5 can be overly conservative about exploring code. Direct guidance helps:
```
ALWAYS read and understand relevant files before proposing code
edits. Do not speculate about code you have not inspected.
Be rigorous and persistent in searching code for key facts.
```

### Minimizing Hallucinations

```
Never speculate about code you have not opened. If the user
references a specific file, you MUST read the file before
answering. Give grounded and hallucination-free answers.
```

---

## XML Tags for LLM Structure

XML tags are the recommended way to structure prompts for Claude models. They provide semantic clarity about content type and intent.

### Common Patterns

```xml
<!-- Behavioral directives -->
<use_parallel_tool_calls>
  If you intend to call multiple tools and there are no
  dependencies, make all independent calls in parallel.
</use_parallel_tool_calls>

<!-- Safety constraints -->
<critical>
  NEVER commit to main branch without explicit user authorization.
</critical>

<!-- Sequential instructions -->
<instructions type="sequential">
  1. Validate all inputs before processing
  2. Execute TDD cycle (Red, Green, Refactor)
  3. Report results with evidence
</instructions>

<!-- Format control -->
<smoothly_flowing_prose_paragraphs>
  Write the prose sections of your response in flowing
  paragraphs rather than bullet points.
</smoothly_flowing_prose_paragraphs>

<!-- Typed constraints -->
<constraint type="safety">
  Git operations are forbidden for coding agents.
</constraint>
```

### Benefits

- Semantic tags (`<critical>`, `<constraint>`) convey urgency and importance
- Typed tags (`<instructions type="sequential">`) clarify content structure
- Nested tags show relationships and hierarchy
- Tags help LLMs parse long prompts and retain key information
- Tags enable clean separation of concerns within a single prompt

---

## Agentic and Multi-Agent Patterns

### Specialization Over Monoliths

As instruction complexity increases in a single agent, adherence to specific rules degrades and error rates compound. Multi-agent systems gain reliability from decentralization and specialization.

### Hub-and-Spoke Orchestration

A central orchestrator manages all agent interactions:
- Predictable workflows
- Strong consistency
- Simplified debugging
- Clear ownership of each task

### Plan-and-Execute

A capable model plans; cheaper models execute:
- Up to 90% cost reduction
- Separation of strategic thinking from systematic implementation
- Natural fit for Opus/Haiku model pairing

### Common Failure Patterns

Most production AI failures (2024-2026) were architectural, not model quality issues:

| Failure Pattern | Root Cause |
|---|---|
| Poor state management between agents | No structured state format |
| Bad handoff design | Unclear input/output contracts |
| Over-engineering initial implementations | Premature abstraction |
| Jumping to multi-agent complexity too early | Not understanding simple-case failure modes first |

---

## Anti-Patterns Reference

These are the most common prompt engineering mistakes. The `ai-prompt-engineer` agent should detect and warn against all of them.

| Anti-Pattern | Why It Fails | Fix |
|---|---|---|
| Vague/underspecified prompts | Model fills gaps with generic output | Be explicit about desired behavior, format, and scope |
| Packing too many tasks in one prompt | Divided attention leads to hallucination, missed tasks | Decompose into atomic subtasks |
| Overusing few-shot examples | Biases model, wastes tokens, can reduce performance | Use 1-2 diverse examples for format only |
| Using absolute/rigid instructions | Forces model to hallucinate to comply | Use conditional language with context |
| Telling model what NOT to do | Leaves desired behavior undefined | State what the model SHOULD do instead |
| Ignoring output token costs | Output often dominates total cost | Constrain output format and length |
| Over-engineering from the start | Simple solutions outperform complex ones initially | Start simple, add complexity only when needed |
| Repeating same examples | Overfitting to specific patterns | Provide diverse examples |
| Vague references in long conversations | Model loses track of context | Be specific with names, quotes, or re-state context |
| Over-indexing on third-party frameworks | Generic tools often underperform custom solutions | Build essential components yourself first |

---

## Emerging Trends (2025-2026)

- **Prompt engineering as production discipline**: CI/CD integration for prompt testing, reducing issues by 50%
- **Automated prompt optimization**: Tools like DSPy, Opik Agent Optimizer replace manual tuning with declarative programs and Bayesian/evolutionary optimization
- **Interoperability protocols**: MCP, A2A, ACP, and ANP emerging as standards for agent communication
- **Context awareness**: Models that track their own remaining token budget
- **Decreasing value of explicit CoT**: As models improve, explicit reasoning prompts provide diminishing returns
- **Model-specific optimization**: Different models respond differently to the same techniques — prompts must be tailored

---

## Sources

- [Anthropic Claude 4.x Prompting Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices)
- [Anthropic Interactive Prompt Engineering Tutorial](https://github.com/anthropics/prompt-eng-interactive-tutorial)
- [IBM 2026 Guide to Prompt Engineering](https://www.ibm.com/think/prompt-engineering)
- [Prompt Engineering Guide (promptingguide.ai)](https://www.promptingguide.ai/)
- [Lakera Ultimate Guide (2025)](https://www.lakera.ai/blog/prompt-engineering-guide)
- [Wharton: The Decreasing Value of Chain of Thought](https://gail.wharton.upenn.edu/research-and-insights/tech-report-chain-of-thought/)
- [arXiv: Is CoT Reasoning a Mirage?](https://arxiv.org/abs/2508.01191)
- [Portkey: Optimize Token Efficiency](https://portkey.ai/blog/optimize-token-efficiency-in-prompts/)
- [Token Optimization for AI Agents (Medium)](https://medium.com/elementor-engineers/optimizing-token-usage-in-agent-based-assistants-ffd1822ece9c)
- [Agentic AI Design Patterns 2026 (Medium)](https://medium.com/@dewasheesh.rana/agentic-ai-design-patterns-2026-ed-e3a5125162c5)
- [PromptBuilder Best Practices 2025](https://promptbuilder.cc/blog/prompt-engineering-best-practices-2025)
