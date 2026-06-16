# prompTOR — eval stub guidance

When the user wants to check a prompt holds up, offer a small eval. The generator already exists:
`promptor.html`'s `generateEval(item)` emits a runnable Python harness. This file documents what it
produces so the skill can describe/defer to it.

> ⚠️ **Separate billing.** The generated harness uses the `anthropic` SDK + `ANTHROPIC_API_KEY`
> — the **only** part of prompTOR on metered API billing. It is optional, run by hand
> (`pip install anthropic; export ANTHROPIC_API_KEY=…; python eval_*.py`), and never invoked by the
> bridge or the live OAuth session.

## Grader auto-selection (by template evalGrader)
- json/exact → grade_json/grade_exact (code-based, E-G1): valid & correct shape (E-S1), accuracy ≥
  threshold (E-S2), no spurious fields (E-S4).
- code → grade_code (E-G1): tests pass, general not hard-coded (I3), no out-of-scope edits (I2).
- else llm → grade_llm (E-G3): LLM-as-judge, reason then verdict, prefer a separate grader model.

## Test data
Typical + labeled edge cases (E-D1): empty, very long, ambiguous/adversarial. Seed set — expand to
dozens (E-D3).

## How to offer it
Offer at the end of an optimize/run. If yes, produce the harness or point at the GUI's **Eval Stub**
preview tab (which calls generateEval() directly). Keep it a stub the user fills in.
