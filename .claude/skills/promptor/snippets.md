# prompTOR — snippets (base templates + conditional blocks)

Pick **one** base template in Part 1 to match the task, fill its sections, then add any Part 2
blocks that apply. Templates mirror `promptor.html`'s `TEMPLATES`; blocks are verbatim from its
`BLOCKS`. Output sections as XML tags (`<role>…</role>`) when emitting the optimized prompt.

## Part 1 — base templates
### pe_general — general task  (eval grader: llm)
- **SYSTEM** — role: who Claude is (D1).
- **USER** — task: ask + "above and beyond" (A1); context: motivation/why (A2); examples: 3–5 in
  <example> (B1); output: say what TO do (F1), default "Respond directly, without preamble."
### pe_extract — structured extraction  (eval grader: json)
- **USER** — input in <input> (C1); fields: keys+types; labels: enum; output: schema not prefill
  (F5) — "Return strict JSON matching the schema. Choose exactly one label. No prose."
### pe_longdoc — long document Q&A  (eval grader: llm)
- **USER** — documents at top in <document> (E1); question asked last; instructions: quote-ground
  first (E3) — "First find relevant quotes in <quotes>. Then answer using only those in <answer>."
### pe_agentic — agentic coding  (eval grader: code)
- **SYSTEM** — env: stack/harness.
- **USER** — files: exact paths (read before edit); task: EXPLICIT action, not "suggest" (G1);
  rules: minimal (I2) — "Only change what is requested or clearly necessary. Don't touch unrelated
  code." Default blocks: investigate-first, no-overengineering, general-solution, cleanup-temp-files.
### pe_research — research  (eval grader: llm)
- **USER** — question; success: what a complete answer covers (I8); approach (I8): "Verify key
  facts across multiple independent sources. Track competing hypotheses and confidence;
  self-critique before concluding."
### pe_role — role/persona assistant  (eval grader: llm)
- **SYSTEM** — role+specialty (D1); tone; behavior: do/avoid, escalation, limits; identity: only
  if it must self-identify (D2) — "The assistant is Claude, created by Anthropic."

## Part 2 — conditional blocks (verbatim from promptor.html BLOCKS; add only those that fit)

### investigate-first
```
<investigate_before_answering>
Never speculate about code you have not opened. If the user references a specific file, read it before answering. Investigate relevant files BEFORE making any claim about the codebase. Give grounded, hallucination-free answers.
</investigate_before_answering>
```

### no-overengineering
```
Avoid over-engineering. Only make changes that are directly requested or clearly necessary. Don't add features, refactors, docs, defensive code, or abstractions beyond the task. The right amount of complexity is the minimum needed.
```

### general-solution
```
Write a high-quality, general-purpose solution using standard tools. Don't hard-code to specific test inputs; implement logic that works for all valid inputs. Tests verify correctness — they don't define the solution. If a task is infeasible or a test is wrong, say so rather than working around it.
```

### autonomy-safety
```
Take local, reversible actions freely (editing files, running tests), but for actions that are hard to reverse, affect shared systems, or are destructive (deleting files/branches, dropping tables, rm -rf, git push --force, posting to PRs/issues), ask before proceeding. Never use destructive shortcuts like --no-verify.
```

### cleanup-temp-files
```
If you create any temporary files, scripts, or helper files for iteration, remove them at the end of the task.
```

### parallel-tools
```
<use_parallel_tool_calls>
If you intend to call multiple tools with no dependencies between them, make all the independent calls in parallel. If a call depends on a previous result, call them sequentially. Never use placeholders or guess missing parameters.
</use_parallel_tool_calls>
```

### conservative-action
```
<do_not_act_before_instructions>
Do not change files unless clearly instructed. When intent is ambiguous, default to information, research, and recommendations rather than action.
</do_not_act_before_instructions>
```

### self-check
```
Before you finish, verify your answer against the success criteria / constraints above.
```

### avoid-markdown
```
<avoid_excessive_markdown>
Write in clear flowing prose using complete paragraphs. Reserve markdown for inline code, code blocks, and simple headings. Avoid bullet/numbered lists unless presenting truly discrete items or asked for a list.
</avoid_excessive_markdown>
```

### no-preamble
```
Respond directly without preamble. Do not start with phrases like "Here is..." or "Based on...".
```
