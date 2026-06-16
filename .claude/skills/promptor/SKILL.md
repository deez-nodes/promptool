---
name: promptor
description: Optimize a rough prompt with Anthropic best practices, then RUN it in this same session and show the result. Use when the user pastes a draft prompt to improve and execute, says "optimize and run this", "optimize this prompt", or is driving prompTOR's GUI/bridge. Optimizes by citing rule IDs from this skill's brain, then runs inline (no extra claude process).
---

# prompTOR

Turn a rough prompt into a best-practice one, then run it — all in **this one session**. This
skill is the shared brain for both the typed `/promptor` flow and the GUI driven by `bridge.js`.

## Workflow

### 1. Read the brain first
Before optimizing, read `principles.md` and `snippets.md` in this skill directory (read
`evals.md` only if producing an eval stub). They are the single source of truth — cite rule IDs
(A1, A2, B1, C1, D1, D2, E1, E3, F1, F5, G1, I2, I3, I8) when explaining choices.

### 2. Optimize
- Pick the one base template from `snippets.md` Part 1 that matches the task (general, extract,
  longdoc, agentic, research, role).
- Apply the foundations: role → **SYSTEM** (D1); ask for quality (A1) + motivation (A2) in the
  task; wrap input/data in XML tags (C1) with data first (E1); say what TO do (F1); use a schema
  not prefill for structured output (F5); make agentic asks explicit actions (G1) with minimal
  scope (I2).
- Add only the Part 2 blocks that fit the task.
- **Emit the optimized prompt labeled `SYSTEM:` and `USER:`, with XML-tagged sections**, followed
  by a short **"why, by rule ID"** list (one line per change).

### 3. Run — inline, this session
Runs happen **in this session** — never spawn a child `claude` (that would split the session and,
via `--bare`, force API-key billing). When the user approves running:
- Treat the optimized prompt as a fresh task under a `--- RUN OUTPUT ---` delimiter, and ignore
  the optimization discussion above it.
- Because a single session can't swap its real system prompt mid-conversation, deliver the
  optimized `SYSTEM:` text as framing at the top of the run turn.
- Keep chatting for follow-ups — they continue the same run.

### 4. Eval stub (optional)
Offer at the end. Defer to `evals.md` (which documents the harness `promptor.html generateEval()`
produces). Note that the eval harness is the only part on separate metered API billing.

## Operating notes
- **One shared session.** Never spawn a child `claude`; never call `/promptor` recursively.
- **OAuth, not API key.** Never `--bare` (it strips OAuth, skills, and CLAUDE.md). Never
  `--dangerously-skip-permissions`.
- **Read-only by default.** The bridge runs the engine with `Read`/`Grep`/`Glob` only; broader
  tool use is a deliberate opt-in.
- The GUI sends optimize requests as `/promptor optimize this draft:\n<draft>` and runs by sending
  the optimized prompt as the next turn — same session, streamed back over SSE.
