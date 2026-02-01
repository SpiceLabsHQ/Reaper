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

Modern frontier models (Claude 4.x, GPT-4.1, Gemini 3) follow instructions with high precision. This means vague prompts get literally vague results, but precise prompts get precisely what you asked for.

### 2. Provide Context and Motivation

Explain *why*, not just *what*. Frontier models generalize from explanations, inferring related constraints from reasoning.

```
# Less effective (rigid rule)
NEVER use ellipses

# More effective (reasoned constraint)
Your response will be read aloud by a text-to-speech engine,
so never use ellipses since the engine won't know how to
pronounce them.
```

### 3. Define Output Format Explicitly

Specify the shape of the response: JSON schema, markdown structure, prose paragraphs, or XML-tagged sections. Most frontier models are highly steerable on format, though the mechanisms differ by provider (see Model-Specific Guidance).

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

**Model-specific notes:**
- Claude 4.x: Sensitive to the word "think" when extended thinking is disabled — prefer "consider," "evaluate," "reflect"
- OpenAI o-series (o1, o3): Built-in CoT — explicit step-by-step instructions are redundant and can hurt performance
- OpenAI GPT-4.1/4o: Still benefits from explicit CoT prompting ("think aloud" boosts reliability)
- DeepSeek R1: Native CoT via `<think>` tag — avoid step-by-step instructions; use zero-shot
- Gemini 3: Optimized reasoning at default temperature (1.0) — changing temperature degrades CoT performance

### Few-Shot Prompting

**The shift:** Modern frontier models understand most tasks from descriptions alone. Few-shot examples can bias the model toward patterns that don't generalize. Reasoning models (OpenAI o-series, DeepSeek R1) actively perform worse with few-shot examples.

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

## Model-Specific Guidance

Each model family has distinct prompting characteristics. Prompts that perform well on one model may underperform on another. This section covers the major frontier model families.

### Anthropic Claude (4.x / Opus 4.5 / Sonnet 4.5 / Haiku 4.5)

**Key characteristics:** Precise instruction following, XML tag affinity, context awareness, aggressive parallel tool calling.

**Prompting patterns:**
- **XML semantic tags** are the recommended structuring mechanism (`<critical>`, `<instructions>`, `<constraint>`)
- **Thinking sensitivity**: When extended thinking is disabled, avoid the word "think" — use "consider," "evaluate," "reflect"
- **Overtriggering**: Opus 4.5 is more responsive to system prompts than prior models. Aggressive language ("CRITICAL: You MUST...") can cause overtriggering — use natural language instead
- **Anti-overengineering**: Opus 4.5 tends to create extra files and unnecessary abstractions. Explicit constraints are needed to keep solutions minimal
- **Parallel tool calling**: Steerable to ~100% reliability with explicit instructions
- **Context awareness**: Claude 4.5 can track its remaining context window. Prompt it to save state before compaction
- **Long-horizon state**: Excels at multi-session work using git, structured state files (JSON), and setup scripts
- **Code grounding**: Prompt with "ALWAYS read files before proposing edits" to prevent hallucination

**Structuring with XML tags:**
```xml
<use_parallel_tool_calls>
  Make all independent tool calls in parallel.
</use_parallel_tool_calls>

<critical>
  NEVER commit to main without explicit authorization.
</critical>

<instructions type="sequential">
  1. Validate inputs
  2. Execute task
  3. Report results
</instructions>
```

**Model tiers:**
- **Opus 4.5**: Strategic analysis, complex trade-offs, deep reasoning
- **Sonnet 4.5**: Strong balance of capability and cost for most tasks
- **Haiku 4.5**: Fast, cost-efficient systematic work and procedural execution

### OpenAI GPT-4.1 / GPT-4o

**Key characteristics:** Literal instruction following (even more than GPT-4o), 1M token context, strong agentic capabilities, enhanced tool calling.

**Prompting patterns:**
- **Literal compliance**: GPT-4.1 follows instructions more literally than GPT-4o. Prompts must be migrated — what worked on 4o may underperform. A single clear sentence is usually enough to steer behavior
- **Agentic prompts need three reminders**: (1) Persistence — don't yield until the task is fully done, (2) Tool-calling encouragement — use tools for accuracy, (3) Planning and reflection — articulate intentions and reflect on outcomes. These three instructions alone increased SWE-bench score by ~20%
- **Use the API `tools` field** for tool descriptions, not manual injection into the system prompt (+2% SWE-bench from this alone)
- **Long context**: Place instructions at both the beginning and end of large context blocks to avoid "lost-in-the-middle" failures
- **CoT still helps**: GPT-4.1 is not a reasoning model, so explicit "think aloud" prompting boosts reliability
- **Structured output**: Performs well with numeric constraints ("3 bullets," "under 50 words") and format hints ("in JSON")
- **Pin model versions** in production (`gpt-4.1-2025-04-14`) for consistent behavior

**Key difference from GPT-4o:** 87.4% on IFEval vs 81.0%; 1M token context vs 128K; 26% cheaper; random code edits dropped from 9% to 2%.

### OpenAI o-Series (o1, o3-mini, o3)

**Key characteristics:** Built-in chain-of-thought reasoning, self-fact-checking, large context windows (up to 200K).

**Prompting patterns:**
- **Do NOT use explicit CoT prompting** — the model reasons internally. Instructions like "let's think step by step" are redundant and can be counterproductive
- **Do NOT use few-shot examples** — these are not recommended for reasoning models and can degrade performance
- **Keep prompts simple and direct** — present the problem clearly; the model analyzes deeply on its own
- **Request conciseness explicitly** — otherwise the model errs on the side of thoroughness
- **System prompts work differently**: Use for high-level behavior guidance, not step-by-step reasoning scaffolding
- **Great as planners**: Use o-series as "the planner" producing detailed multi-step solutions, then assign GPT-4.1/4o-mini as "the doer" for each step
- **Strong at evaluation**: Effective for benchmarking and validating other model responses

### Google Gemini (2.5 / 3)

**Key characteristics:** PTCF framework affinity, multimodal native, very large context windows, simplify-first philosophy (Gemini 3).

**Prompting patterns:**
- **PTCF framework**: Gemini performs best with Persona, Task, Context, Format structure
- **Gemini 3 — simplify aggressively**: Cut 30-50% of prompt verbosity compared to Gemini 2.x. State the goal and format; skip obvious rules. Elaborate prompts from 2.x produce verbose, over-explained outputs in 3
- **Temperature**: For Gemini 3, keep temperature at default 1.0. Changing it causes looping or degraded performance, especially on reasoning tasks
- **Thinking levels**: Use `LOW` thinking level with "think silently" for lower latency
- **Avoid over-constraining**: Instructions like "do not infer" or "do not guess" can cause the model to fail at basic logic
- **Time awareness**: Add current date/time to system instructions for time-sensitive queries
- **Knowledge cutoff**: Explicitly state the model's knowledge cutoff date
- **Structured output**: Use `responseSchema` parameter for strict JSON output matching a defined schema
- **Context engineering is empirical**: There is no perfect template. Treat patterns as baselines and iterate

### Meta Llama (4 Maverick / Scout)

**Key characteristics:** Open-weight MoE architecture, massive context (Scout: 10M tokens, Maverick: 1M), special token format, multimodal native.

**Prompting patterns:**
- **Special token format**: Uses `<|begin_of_text|>`, `<|header_start|>system<|header_end|>`, `<|eot|>` tokens. Use framework `apply_chat_template` rather than manual token construction
- **System prompts work well**: Define role and behavior in the system message
- **Prompt Ops toolkit**: Meta's `llama-prompt-ops` package automates prompt transformation from other models to Llama format
- **Standard techniques apply**: Few-shot, role-based prompts, and RAG all work well
- **Cross-model migration**: Prompts optimized for GPT or Claude may need adaptation — architectural and training differences affect behavior
- **Grounding**: "A well-crafted prompt can help reduce hallucination by providing clear and accurate information and context"

### DeepSeek (V3 / R1)

**Key characteristics:** Two distinct models with opposite prompting requirements. V3 is a traditional chat model; R1 is a reasoning model with native CoT.

**DeepSeek V3 (Chat):**
- Behaves similarly to GPT-4o or Claude Sonnet — standard techniques apply
- **Leverage system prompts and personas**: Responds exceptionally well to role-playing
- **Context caching**: Place static data at the beginning of prompts for API-level caching (up to 90% cost discount on repeated prefixes)
- **Multi-turn**: Use system role consistency and explicit function-calling schemas
- Supports function calling, JSON mode, and structured outputs

**DeepSeek R1 (Reasoning):**
- **Avoid system prompts entirely** — place all instructions in the user role
- **Use zero-shot prompting** — few-shot examples degrade performance. The model mimics example patterns instead of reasoning
- **Keep prompts minimal and direct** — simpler prompts produce better results
- **Temperature**: The official DeepSeek API ignores sampling parameters for R1 (only `max_tokens` works). For self-hosted or third-party deployments where temperature is honored, use 0.5-0.7 (0.6 sweet spot) — high temperature fractures reasoning chains
- **Force `<think>` tag if needed** — occasionally R1 skips its thinking phase, degrading output
- **Use structured formatting** (XML/Markdown) to define tasks within the user message
- **Negative instructions work**: Unlike most models, explicitly stating what to avoid can help R1

### Mistral (Large 2 / Magistral)

**Key characteristics:** Strong instruction following, PTCF-like structure, native function calling, structured output support.

**Prompting patterns:**
- **Role definition first**: Start with "You are a <role>, your task is to <task>" — effective for steering toward verticals
- **Markdown/XML formatting**: Critical for long prompts. Makes structure intuitive for both model and developer
- **Avoid contradictions in long prompts**: As system prompts grow, slight contradictions appear. Use explicit decision-tree logic to resolve ambiguity
- **Structured output**: Use custom structured outputs (more reliable than JSON mode). Only ask the model to generate what is strictly necessary
- **Few-shot works well**: Example prompting improves understanding, accuracy, and especially output format compliance
- **Magistral** (reasoning models, June 2025): Specialized for multi-step logic with transparent chain-of-thought reasoning traces
- **Iterative refinement**: Different Mistral model updates can change behavior — revisit prompts regularly

---

## Cross-Model Comparison Matrix

| Capability | Claude 4.x | GPT-4.1 | o-Series | Gemini 3 | Llama 4 | DeepSeek R1 | DeepSeek V3 | Mistral L2 |
|---|---|---|---|---|---|---|---|---|
| **System prompt** | Strong | Strong | Limited | Strong | Strong | Avoid | Strong | Strong |
| **XML tags** | Recommended | Supported | N/A | Supported | Supported | User-msg only | Supported | Supported |
| **Few-shot** | Sparingly | Sparingly | Avoid | Sparingly | Works well | Avoid | Works well | Works well |
| **Explicit CoT** | Careful* | Helpful | Avoid | Avoid over-constraining | Works | Avoid | Helpful | Helpful |
| **Built-in reasoning** | Extended thinking | No | Yes | Thinking levels | No | Yes (`<think>`) | No | Magistral only |
| **Max context** | 200K | 1M | 200K | 1M+ | 10M (Scout) | 128K | 128K | 128K |
| **Parallel tool calls** | Aggressive | Strong | N/A | Supported | Supported | N/A | Supported | Supported |
| **Structured output** | XML/JSON | JSON | JSON | `responseSchema` | JSON | Markdown/XML | JSON mode | Custom schemas |
| **Overengineering risk** | High (Opus) | Moderate | Low | Low | Low | Low | Moderate | Low |

\* Claude: avoid the word "think" when extended thinking is disabled

---

## Prompt Structure Tags (Cross-Model)

XML/markdown tags work across all major model families for structuring prompts. Claude models have the strongest affinity, but GPT-4.1, Gemini, Llama, and Mistral all benefit from structured sections.

### Universal Patterns

```xml
<!-- Works well across Claude, GPT-4.1, Gemini, Llama, Mistral -->
<role>You are a security auditor specializing in OWASP Top 10.</role>

<task>Analyze the provided code for SQL injection vulnerabilities.</task>

<output_format>
  Return findings as a JSON array with fields: file, line, severity, description, fix.
</output_format>

<constraints>
  - Only report vulnerabilities you can confirm from the code
  - Do not speculate about code you have not read
</constraints>
```

### Model-Specific Considerations

- **Claude**: Strongest XML tag support. Use semantic tags like `<critical>`, `<constraint type="safety">` for emphasis
- **GPT-4.1**: Responds well to XML structure. Use the API `tools` field rather than embedding tool schemas in XML
- **Gemini 3**: Supports XML-like tags. Use `<Plan>`, `<Execute>`, `<Validate>`, `<Format>` workflow tags
- **DeepSeek R1**: Place all XML structure in user message, not system prompt
- **Llama 4**: Uses its own special tokens for role structure; XML tags work within message content
- **Mistral**: Markdown and XML both work. Markdown may be more natural for shorter prompts

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
- Natural fit for tiered model pairings: Claude Opus/Haiku, OpenAI o3/GPT-4.1-mini, Gemini Pro/Flash

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
| No grounding constraint | Model claims facts without verification | Add "read before answering" or "investigate before claiming" instructions |
| Conflicting instructions | Contradictory rules in long prompts cause unpredictable behavior | Resolve with explicit decision-tree logic or priority ordering |
| Context window overflow | Prompt too large for target model's max context | Compress, decompose, or switch to a model with larger context |
| Hallucination-inducing pressure | Demanding specific answers the model cannot know forces fabrication | Add "if uncertain, say so" or remove false-precision requirements |
| Prompt injection vulnerability | User input can override system-level instructions | Add input sanitization, instruction hierarchy, or delimiter boundaries |

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

### General
- [IBM 2026 Guide to Prompt Engineering](https://www.ibm.com/think/prompt-engineering)
- [Prompt Engineering Guide (promptingguide.ai)](https://www.promptingguide.ai/)
- [Lakera Ultimate Guide (2025)](https://www.lakera.ai/blog/prompt-engineering-guide)
- [Wharton: The Decreasing Value of Chain of Thought](https://gail.wharton.upenn.edu/research-and-insights/tech-report-chain-of-thought/)
- [arXiv: Is CoT Reasoning a Mirage?](https://arxiv.org/abs/2508.01191)
- [Portkey: Optimize Token Efficiency](https://portkey.ai/blog/optimize-token-efficiency-in-prompts/)
- [Token Optimization for AI Agents (Medium)](https://medium.com/elementor-engineers/optimizing-token-usage-in-agent-based-assistants-ffd1822ece9c)
- [Agentic AI Design Patterns 2026 (Medium)](https://medium.com/@dewasheesh.rana/agentic-ai-design-patterns-2026-ed-e3a5125162c5)
- [PromptBuilder Best Practices 2025](https://promptbuilder.cc/blog/prompt-engineering-best-practices-2025)

### Anthropic Claude
- [Claude 4.x Prompting Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices)
- [Anthropic Interactive Prompt Engineering Tutorial](https://github.com/anthropics/prompt-eng-interactive-tutorial)

### OpenAI GPT / o-Series
- [OpenAI Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering)
- [OpenAI Reasoning Best Practices](https://platform.openai.com/docs/guides/reasoning-best-practices)
- [GPT-4.1 Prompting Guide (Cookbook)](https://cookbook.openai.com/examples/gpt4-1_prompting_guide)
- [Microsoft: Prompt Engineering for O1/O3-mini](https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/prompt-engineering-for-openai%E2%80%99s-o1-and-o3-mini-reasoning-models/4374010)

### Google Gemini
- [Gemini API Prompt Design Strategies](https://ai.google.dev/gemini-api/docs/prompting-strategies)
- [Gemini 3 Prompting Guide (Vertex AI)](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/start/gemini-3-prompting-guide)
- [Gemini 3 Best Practices (Philipp Schmid)](https://www.philschmid.de/gemini-3-prompt-practices)
- [Gemini 2.5 Pro Best Practices (Google Cloud Community)](https://medium.com/google-cloud/best-practices-for-prompt-engineering-with-gemini-2-5-pro-755cb473de70)

### Meta Llama
- [Llama 4 Model Card and Prompt Format](https://www.llama.com/docs/model-cards-and-prompt-formats/llama4/)
- [Meta Prompt Engineering How-To Guide](https://www.llama.com/docs/how-to-guides/prompting/)
- [Llama Prompt Ops Toolkit](https://www.marktechpost.com/2025/05/03/meta-ai-releases-llama-prompt-ops-a-python-toolkit-for-prompt-optimization-on-llama-models/)

### DeepSeek
- [DeepSeek R1 & V3 Prompting Guide](https://passhulk.com/blog/deepseek-prompt-engineering-guide-master-r1-v3-models-2025/)
- [Prompting DeepSeek R1 (Together.ai)](https://docs.together.ai/docs/prompting-deepseek-r1)
- [DeepSeek Prompting Techniques (DataStudios)](https://www.datastudios.org/post/deepseek-prompting-techniques-strategies-limits-best-practices-etc)

### Mistral
- [Mistral Official Prompting Guide](https://docs.mistral.ai/guides/prompting_capabilities)
- [Mistral System Prompt Best Practices (PromptLayer)](https://blog.promptlayer.com/mistral-system-prompt/)
- [Mistral Tokenization & Chat Templates](https://docs.mistral.ai/cookbooks/concept-deep-dive-tokenization-chat_templates)
