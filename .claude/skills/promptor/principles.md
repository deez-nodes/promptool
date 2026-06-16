# prompTOR — principles (canonical rule table)

Single source of truth for the optimizer. Cite these IDs when explaining a rewrite. The set is
exactly the rules already referenced in `promptor.html` (`TEMPLATES` hints + `generateEval()`) —
do not invent IDs beyond these.

## Foundations

| ID | Rule | Why |
|----|------|-----|
| **A1** | Ask for quality explicitly — tell Claude to go "above and beyond" the literal ask. | Vague asks get vague output; naming the bar raises it. |
| **A2** | Give the motivation / the *why* behind the task. | Context sharpens relevance ("this will be read aloud, so…"). |
| **B1** | Provide 3–5 examples, each wrapped in `<example>` tags. | Few-shot examples pin format and edge handling better than description. |
| **C1** | Wrap the input/data to process in XML tags (e.g. `<input>…</input>`). | Clear delimiters stop the model conflating instructions with data. |
| **D1** | Put the role / persona in the **system** prompt, not the user turn. | The system prompt is where durable identity and constraints belong. |
| **D2** | Only assert a *named* identity ("you are Claude, made by Anthropic") if it must self-identify. | Otherwise it's noise that can leak into output. |
| **E1** | Put long data at the **top**; wrap documents in `<document>` tags. | Data-first ordering improves long-context grounding. |
| **E3** | Quote-ground: have Claude pull relevant quotes first, then answer from only those. | Reduces hallucination on long-document Q&A. |
| **F1** | Say what **to** do, not what *not* to do. | Positive instructions are followed more reliably than prohibitions. |
| **F5** | For structured output use a schema (Structured Outputs), not assistant **prefill**. | Prefill is brittle; schemas validate and don't fight the model. |
| **G1** | Give an **explicit action** ask ("change X to do Y"), not "suggest how to…". | Agentic prompts need a verb to act on, or Claude just advises. |
| **I2** | Keep scope minimal — change only what's requested or clearly necessary. | Prevents collateral edits and over-engineering. |
| **I3** | Write a **general** solution, not one hard-coded to the tests/inputs. | Tests verify correctness; they don't define it. |
| **I8** | Define success criteria; verify facts across sources, track competing hypotheses, self-critique before concluding. | Makes research/agentic work auditable and grounded. |

## Eval rule IDs (used by the eval stub — see `evals.md`)

| ID | Meaning |
|----|---------|
| **E-S1** | Success: output is valid and matches the expected shape. |
| **E-S2** | Success: accuracy ≥ a stated threshold on the seed set. |
| **E-S4** | Success: zero spurious / hallucinated fields or labels. |
| **E-G1** | Grader: code-based (exact match, JSON validity, or a test runner). |
| **E-G3** | Grader: LLM-as-judge — reason in `<thinking>`, then a verdict; prefer a *separate* grader model. |
| **E-D1** | Data: include typical cases **and** labeled edge cases. |
| **E-D3** | Data: this is a seed set — expand to dozens before trusting a score. |
