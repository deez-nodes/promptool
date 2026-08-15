(function (PT) {
  'use strict';

  // First-run library content. These are the ten best-practice blocks that used to
  // live in a hard-coded BLOCKS table in index.html. They are prompt text, and in
  // v2 prompt text is a section — so they arrive as an ordinary saved prompt you
  // can edit, search, delete, or pull single pieces out of. Nothing special-cases
  // them; delete the prompt and they are gone.
  var BLOCKS = [
    ['investigate_first',
      '<investigate_before_answering>\nNever speculate about code you have not opened. If the user references a specific file, read it before answering. Investigate relevant files BEFORE making any claim about the codebase. Give grounded, hallucination-free answers.\n</investigate_before_answering>'],
    ['no_overengineering',
      "Avoid over-engineering. Only make changes that are directly requested or clearly necessary. Don't add features, refactors, docs, defensive code, or abstractions beyond the task. The right amount of complexity is the minimum needed."],
    ['general_solution',
      "Write a high-quality, general-purpose solution using standard tools. Don't hard-code to specific test inputs; implement logic that works for all valid inputs. Tests verify correctness — they don't define the solution. If a task is infeasible or a test is wrong, say so rather than working around it."],
    ['autonomy_safety',
      'Take local, reversible actions freely (editing files, running tests), but for actions that are hard to reverse, affect shared systems, or are destructive (deleting files/branches, dropping tables, rm -rf, git push --force, posting to PRs/issues), ask before proceeding. Never use destructive shortcuts like --no-verify.'],
    ['cleanup_temp_files',
      'If you create any temporary files, scripts, or helper files for iteration, remove them at the end of the task.'],
    ['parallel_tools',
      '<use_parallel_tool_calls>\nIf you intend to call multiple tools with no dependencies between them, make all the independent calls in parallel. If a call depends on a previous result, call them sequentially. Never use placeholders or guess missing parameters.\n</use_parallel_tool_calls>'],
    ['conservative_action',
      '<do_not_act_before_instructions>\nDo not change files unless clearly instructed. When intent is ambiguous, default to information, research, and recommendations rather than action.\n</do_not_act_before_instructions>'],
    ['self_check',
      'Before you finish, verify your answer against the success criteria / constraints above.'],
    ['avoid_markdown',
      '<avoid_excessive_markdown>\nWrite in clear flowing prose using complete paragraphs. Reserve markdown for inline code, code blocks, and simple headings. Avoid bullet/numbered lists unless presenting truly discrete items or asked for a list.\n</avoid_excessive_markdown>'],
    ['no_preamble',
      'Respond directly without preamble. Do not start with phrases like "Here is..." or "Based on...".']
  ];

  function build() {
    var now = Date.now();
    var blocks = {
      id: PT.model.newId('p'),
      name: 'Best-practice blocks',
      kind: 'template',
      created: now,
      updated: now,
      sections: BLOCKS.map(function (b) {
        return PT.model.newSection({ tag: b[0], body: b[1], include: false });
      })
    };
    return {
      version: 1,
      prompts: [blocks],
      bank: ['Claude Code', 'Unreal Engine', 'Anthropic', 'TypeScript']
        .map(function (t) { return { id: PT.model.newId('t'), text: t, created: now }; })
    };
  }

  PT.seed = { build: build };
})(window.PT = window.PT || {});
