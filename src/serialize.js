(function (PT) {
  'use strict';

  // Bodies are emitted verbatim and never escaped: a prompt legitimately contains
  // '<', '&', and whole XML or code blocks, and escaping them would corrupt intent.
  // The injection path is closed on the tag side instead.
  function toXml(prompt) {
    if (!prompt || !Array.isArray(prompt.sections)) { return ''; }
    return prompt.sections
      .filter(function (s) { return s && s.include && String(s.body).trim() !== ''; })
      .map(function (s) { return '<' + s.tag + '>\n' + s.body + '\n</' + s.tag + '>'; })
      .join('\n\n');
  }

  PT.serialize = { toXml: toXml };
})(window.PT = window.PT || {});
