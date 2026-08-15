(function (PT) {
  'use strict';

  var DEFAULT_TAGS = ['role', 'context', 'goal', 'background', 'state', 'output'];
  var KINDS = ['filled', 'template'];

  function newId(prefix) {
    var s = '';
    while (s.length < 8) { s += Math.random().toString(36).slice(2); }
    return prefix + '_' + s.slice(0, 8);
  }

  function slugTag(label) {
    var s = String(label == null ? '' : label).toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (!s) { return 'section'; }
    if (/^[0-9]/.test(s)) { return 's_' + s; }
    return s;
  }

  function newSection(opts) {
    var o = opts || {};
    return {
      id: newId('s'),
      tag: slugTag(o.tag),
      body: o.body == null ? '' : String(o.body),
      include: o.include === undefined ? true : !!o.include
    };
  }

  function newPrompt(opts) {
    var o = opts || {};
    var now = Date.now();
    return {
      id: newId('p'),
      name: o.name == null ? '' : String(o.name),
      kind: KINDS.indexOf(o.kind) >= 0 ? o.kind : 'filled',
      created: now,
      updated: now,
      sections: DEFAULT_TAGS.map(function (t) { return newSection({ tag: t }); })
    };
  }

  function cloneSection(section) {
    return { id: newId('s'), tag: section.tag, body: section.body, include: true };
  }

  // All four mutators share one shape: copy the prompt, replace sections, restamp.
  function withSections(prompt, sections) {
    var out = {};
    for (var k in prompt) { if (Object.prototype.hasOwnProperty.call(prompt, k)) { out[k] = prompt[k]; } }
    out.sections = sections;
    out.updated = Date.now();
    return out;
  }

  function addSection(prompt, section, index) {
    var next = prompt.sections.slice();
    var at = index == null ? next.length : Math.max(0, Math.min(index, next.length));
    next.splice(at, 0, section);
    return withSections(prompt, next);
  }

  function removeSection(prompt, sectionId) {
    return withSections(prompt, prompt.sections.filter(function (s) { return s.id !== sectionId; }));
  }

  function moveSection(prompt, sectionId, toIndex) {
    var next = prompt.sections.slice();
    var from = next.findIndex(function (s) { return s.id === sectionId; });
    if (from < 0) { return prompt; }
    var moved = next.splice(from, 1)[0];
    next.splice(Math.max(0, Math.min(toIndex, next.length)), 0, moved);
    return withSections(prompt, next);
  }

  function setSection(prompt, sectionId, patch) {
    return withSections(prompt, prompt.sections.map(function (s) {
      if (s.id !== sectionId) { return s; }
      var out = { id: s.id, tag: s.tag, body: s.body, include: s.include };
      if (patch.tag !== undefined) { out.tag = slugTag(patch.tag); }
      if (patch.body !== undefined) { out.body = String(patch.body); }
      if (patch.include !== undefined) { out.include = !!patch.include; }
      return out;
    }));
  }

  function validate(prompt) {
    var problems = [];
    if (!prompt || typeof prompt !== 'object') { return ['prompt is not an object']; }
    if (KINDS.indexOf(prompt.kind) < 0) { problems.push('kind must be filled or template'); }
    if (!Array.isArray(prompt.sections)) { return problems.concat('sections must be an array'); }
    prompt.sections.forEach(function (s, i) {
      if (!s.tag) { problems.push('section ' + i + ': tag is empty'); }
    });
    return problems;
  }

  PT.model = {
    DEFAULT_TAGS: DEFAULT_TAGS,
    newId: newId, slugTag: slugTag, newSection: newSection, newPrompt: newPrompt,
    cloneSection: cloneSection, addSection: addSection, removeSection: removeSection,
    moveSection: moveSection, setSection: setSection, validate: validate
  };
})(window.PT = window.PT || {});
