# PROMPTOOL: Spec-Driven Development Plan

## 1. Executive Summary
**PROMPTOOL** is a modular, section-based prompt engineering IDE built from scratch in **Nuxt 3**. It empowers prompt designers to build structured, parameterized, and production-ready prompts using customizable building blocks, runtime variable interpolation (`{{var}}`), an interactive lexicon/term bank, and a multi-target compiler (Raw, OpenAI Messages, Anthropic XML, LangChain).

---

## 2. Nuxt Modules Stack & Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       PROMPTOOL ARCHITECTURE                                       │
├───────────────────┬──────────────────────────────────┬─────────────────────────────────────────────┤
│  1. SPECIFICATION │ • AST & Grammar (Sections/Vars)  │ • Template & Term Bank Schemas              │
├───────────────────┼──────────────────────────────────┼─────────────────────────────────────────────┤
│  2. NUXT MODULES  │ • @pinia/nuxt (Reactive Store)   │ • @vueuse/nuxt (Shortcuts, Storage, Virtual)│
│                   │ • @nuxtjs/tailwindcss (Theming)  │ • Nitro Server Engine (Export, API, AST)    │
├───────────────────┼──────────────────────────────────┼─────────────────────────────────────────────┤
│  3. IDE ENGINE    │ • Prompt Block Composer & Reorder│ • Variable Token Interpolation {{var}}      │
│                   │ • Real-time Token Cost Estimator │ • Model Targets (Anthropic, OpenAI, Gemini) │
├───────────────────┼──────────────────────────────────┼─────────────────────────────────────────────┤
│  4. VERIFICATION  │ • Unit Tests for Serializer/AST  │ • E2E UI Smoke & Hotkey Workflows           │
└───────────────────┴──────────────────────────────────┴─────────────────────────────────────────────┘
```

### Module Stack
- **`@pinia/nuxt`**:
  - Global reactive store managing prompt documents, section order, variable key-value pairs, undo/redo history, and lexicon terms.
- **`@vueuse/nuxt`**:
  - `useStorage`: Zero-latency client persistence with `localStorage` and `IndexedDB`.
  - `useMagicKeys`: IDE-level keyboard shortcuts (`Ctrl+N`, `Ctrl+Enter`, `Ctrl+K`, `Ctrl+S`).
  - `useClipboard`: Instant copying of compiled prompts, JSON payloads, and code snippets.
  - `useDebounceFn`: Smooth live token calculations and AST serialization.
- **`@nuxtjs/tailwindcss`**:
  - Utility classes implementing the REVX color system and optical glow tokens.
- **Nuxt Server Engine (`server/api/`)**:
  - `/api/prompt/serialize`: Server-authoritative AST compilation into OpenAI Messages format, Anthropic XML tags, and LangChain templates.
  - `/api/prompt/tokenize`: BPE / tiktoken estimation and pricing calculator.
  - `/api/prompt/export`: Export as standalone JSON, Markdown, or Python/TS SDK snippets.

---

## 3. Core Functional Modules

### A. Section-Based Prompt Block Composer
- **Section Roles**: System Prompt, Instruction, Context, Constraints, Few-Shot Examples, Output Format.
- **Block Manipulation**: Drag-and-drop or hotkey reordering (`Alt+Up` / `Alt+Down`), block duplication, deletion, enable/disable toggle, collapse/expand.
- **Dynamic Variable Highlighting**: Highlights `{{var_name}}` inline, detects undeclared or missing variables.

### B. Lexicon & Term Bank Floating Palette (`Ctrl+K`)
- **Instant Search**: Fuzzy search over prompt engineering best-practice terms and guardrails.
- **Categorized Snippets**:
  - *Role Personas* (e.g. "Senior Staff Engineer", "Principal Security Auditor").
  - *Reasoning Constraints* (e.g. "Step-by-step thinking before final answer").
  - *Negative Guardrails* (e.g. "Never hallucinate API keys or internal paths").
  - *Output Formats* (e.g. "JSON schema strictly adhering to OpenAPI 3.1").
- **One-Click Insert**: Insert directly into the active editor cursor position or append as a new block.

### C. Live Variable Matrix & Playground
- **Variable Table**: Define key, data type (string, number, enum, JSON), default value, and description.
- **Testing Playground**: Swap variable values on the fly and preview the interpolated output in real time.

### D. Multi-Target Compiler & Token Inspector
- **Compilation Targets**:
  1. **Raw Text / Markdown**: Clean concatenated output with configurable block delimiters.
  2. **OpenAI / Chat Format**: Structured JSON `[{ role: "system", content: "..." }, { role: "user", ... }]`.
  3. **Anthropic XML Format**: `<system>...</system><instructions>...</instructions>`.
  4. **LangChain / LlamaIndex Snippets**: Ready-to-use Python and TypeScript prompt template code.
- **Real-Time Token & Cost Estimation**: Live token counting with model-specific pricing (Gemini 2.5, Claude 3.7, GPT-4o, DeepSeek-R1).

---

## 4. Sprint Milestones

```
┌───────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐
│ SPRINT 1  │ ──> │ SPRINT 2  │ ──> │ SPRINT 3  │ ──> │ SPRINT 4  │
│  Theming  │     │   Store   │     │ Term Bank │     │ Test & QA │
└───────────┘     └───────────┘     └───────────┘     └───────────┘
```

1. **Sprint 1: Theming & Token Foundation**
   - Implement root CSS tokens, fonts (`Orbitron`, `Rajdhani`, `JetBrains Mono`), and Tailwind theme extensions.
   - Replicate the exact REVX navbar and control aesthetics.

2. **Sprint 2: Store & Block Composer**
   - Implement `usePromptStore` with Pinia and VueUse `localStorage` persistence.
   - Build section list, section block editor, and dynamic variable interpolation.

3. **Sprint 3: Term Bank & Multi-Target Serializer**
   - Build search palette (`Ctrl+K`) with pre-seeded engineering terms.
   - Implement live multi-target compiler (Raw, OpenAI JSON, Anthropic XML, LangChain).

4. **Sprint 4: Verification & Test Suite**
   - Implement tests for serialization, store state transitions, and variable substitution.
   - Verify zero compile errors with `npm run build` and `nuxt build`.
