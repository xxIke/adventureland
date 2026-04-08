# Prompt Engineering Reference

Reference guide for effective prompt and context structuring in agentic work. Based on published empirical research. Advisory — uses `SHOULD`, not `MUST`.

This guide helps craft effective prompts, task packets, and context packages for agent-to-agent dispatch and for structuring agentic work surfaces (skills, agents, rules).

## Task Classification

Before structuring a prompt or dispatching a task, classify the type:

| Type | Description | Best Pattern |
|------|-------------|--------------|
| Direct generation | Single-step output from clear spec | Simple prompt with output schema |
| Extraction/classification | Pulling structured data from input | Labeled sections, examples |
| Multi-step reasoning | Hidden dependencies, calculations | Chain-of-thought, intermediate steps |
| Multi-hop retrieval | Cross-document synthesis | Quote extraction before reasoning |
| Planning/search | Combinatorial, exploration needed | Branching, backtracking |
| Tool-driven execution | Requires environmental interaction | ReAct-style reasoning + action |
| Code with verification | Implementation with testable output | Implement then verify cycle |

The first output for complex tasks `SHOULD` be a task graph or ordered plan, not a monolithic prompt.

## Structured Task Packet

For non-trivial tasks, structure the prompt as a task packet with normalized fields:

- **objective** — what the task accomplishes (1-2 sentences)
- **success_criteria** — how to know the task is done correctly
- **required_inputs** — what context/data the task needs
- **constraints** — boundaries, limitations, things to avoid
- **available_tools** — what tools can be used
- **evidence_needed** — what must be gathered before answering
- **plan_or_subtasks** — decomposition for multi-step tasks
- **output_schema** — expected structure of the output
- **verification_steps** — how to verify the output is correct

Not every field is needed for every task. Simple tasks need only objective and success_criteria. The packet schema is a ceiling, not a floor.

## Context Positioning

Evidence-backed rules for where to place content within prompts and context:

1. **Data before instructions.** Place long source material, documents, and context near the top. Place the query, instructions, and task specification near the end.

2. **Critical information at boundaries.** Models perform best on information near the start or end of context. Information in the middle is more likely to be overlooked ("lost-in-the-middle" effect, arXiv:2307.03172).

3. **Extract before reasoning.** For long-document work, extract relevant quotes or passages first, then reason over the extracts — do not reason directly over raw dumps.

4. **Explicit sections.** Use clear delimiters or labeled sections to separate instructions, context, examples, and output specifications. XML tags, markdown headers, or other structural markers improve reliability.

5. **Minimal context.** Include only what the task requires. Each additional token of irrelevant context competes for attention and can degrade output quality.

## Control Pattern Selection

Match the control pattern to the task complexity:

| Pattern | When to Use | When NOT to Use |
|---------|-------------|-----------------|
| Simple prompt | Deterministic, short tasks | Tasks with hidden dependencies |
| Prompt chaining | Sequential transformations | Tasks needing backtracking |
| ReAct (reason + act) | Retrieval, tool use, environmental interaction | Simple generation |
| Branching/search | Planning, combinatorial, creative exploration | Straightforward extraction |
| Reflection/revision | When external feedback or test results exist | Without a verifier or rubric |

**Default:** Use the simplest pattern that produces correct output. Add complexity only when simpler patterns demonstrably fail. Production evidence shows simple composable patterns outperform unnecessarily complex frameworks.

## Applying to Agentic Work Surfaces

These principles apply directly to skill files, agent definitions, and rules:

**Skill files** `SHOULD` structure their steps as task decomposition — breaking complex procedures into explicit substeps rather than relying on prose descriptions.

**Agent definitions** `SHOULD` specify the task type the agent handles, what evidence it must gather, what tools it uses, and what success looks like — mapping to the task packet schema.

**Rules** `SHOULD` provide positive behaviors ("do X") alongside any negative constraints ("don't do Y"). Negative-only instructions without positive alternate paths degrade compliance.

**Bootstrap files** `SHOULD` front-load critical routing information and place detailed reference material later — matching the data-before-instructions pattern.

## Anti-Patterns (Empirically Backed)

These practices have published evidence of degrading performance:

1. **Undifferentiated context dumps.** Passing large amounts of unstructured context and expecting the model to find the relevant parts. Performance drops when key information is buried in the middle of long context (arXiv:2307.03172).

2. **Assuming formatting does not matter.** Prompt format (ordering, delimiters, example layout) can shift accuracy by up to 76 points in controlled studies (arXiv:2310.11324). Treat formatting as a first-class concern.

3. **Overusing autonomy.** Adding loops, tool routing, and planner/executor splits before proving they improve outcomes. Start with the simplest solution that works — agents trade cost and latency for flexibility.

4. **Blind self-refinement.** "Revise until better" loops without external checks, test execution, or explicit rubrics. Reflection works when verifiable feedback exists — it does not reliably improve output when the model judges its own work without criteria.

5. **Negative-only instructions.** "Don't be wrong" / "Don't miss anything" without specifying the positive alternate behavior. Tell the model what to do, not only what to avoid (arXiv:2104.08786).

## Key References

- Self-Consistency Improves Chain of Thought Reasoning (arXiv:2203.11171)
- Least-to-Most Prompting (arXiv:2205.10625)
- Chain-of-Thought Prompting Elicits Reasoning (arXiv:2201.11903)
- ReAct: Synergizing Reasoning and Acting (arXiv:2210.03629)
- Tree of Thoughts (arXiv:2305.10601)
- Lost in the Middle: How Language Models Use Long Contexts (arXiv:2307.03172)
- Prompt Format Sensitivity (arXiv:2310.11324, arXiv:2104.08786)
- Building Effective AI Agents (anthropic.com/research/building-effective-agents)
- Prompt Engineering Best Practices (OpenAI, Anthropic official docs)
