(function (PT) {
  'use strict';

  var MIN_WORD = 3;
  // A token: a letter, then at least MIN_WORD-1 more word characters. Hyphens and
  // underscores are inside the token so TASK-AUDIT-01 survives whole.
  var WORD = /[A-Za-z][A-Za-z0-9_-]{2,}/g;
  // Two or more consecutive Capitalised words. This is what makes "Unreal Engine"
  // and "Claude Code" completable with no configuration and no dictionary.
  var PHRASE = /\b[A-Z][a-z0-9]*(?:\s+[A-Z][a-z0-9]*)+\b/g;

  function collect(text, re, out, seen) {
    var m;
    re.lastIndex = 0;
    while ((m = re.exec(text)) !== null) {
      var v = m[0];
      if (!seen[v]) { seen[v] = 1; out.push(v); }
    }
  }

  function harvest(text) {
    if (typeof text !== 'string' || !text) { return []; }
    var out = [], seen = Object.create(null);
    collect(text, WORD, out, seen);
    collect(text, PHRASE, out, seen);
    return out;
  }

  function candidates(prefix, docTerms, bankTerms) {
    if (!prefix) { return []; }
    var lower = prefix.toLowerCase();
    var seen = Object.create(null);
    var ranked = [];

    // Bank before doc: an explicit term always beats an inferred one.
    [bankTerms || [], docTerms || []].forEach(function (source, rank) {
      (source || []).forEach(function (term, i) {
        if (typeof term !== 'string') { return; }
        if (term === prefix) { return; }
        if (term.toLowerCase().indexOf(lower) !== 0) { return; }
        if (seen[term]) { return; }
        seen[term] = 1;
        ranked.push({ term: term, rank: rank, len: term.length, i: i });
      });
    });

    ranked.sort(function (a, b) {
      return (a.rank - b.rank) || (a.len - b.len) || (a.i - b.i);
    });
    return ranked.map(function (r) { return r.term; });
  }

  PT.complete = { MIN_WORD: MIN_WORD, harvest: harvest, candidates: candidates };
})(window.PT = window.PT || {});
