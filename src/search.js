(function (PT) {
  'use strict';

  // Linear scan, no index. At this scale it is instant, and there is no index to
  // fall out of sync with the store.
  function has(haystack, needle) {
    return String(haystack || '').toLowerCase().indexOf(needle) >= 0;
  }

  function byUpdatedDesc(a, b) { return (b.updated || 0) - (a.updated || 0); }

  function allPrompts(store) {
    return (store && Array.isArray(store.prompts) ? store.prompts : []).slice().sort(byUpdatedDesc);
  }

  function prompts(store, query, opts) {
    var o = opts || {};
    var q = String(query || '').toLowerCase();
    return allPrompts(store).filter(function (p) {
      if (o.kind && p.kind !== o.kind) { return false; }
      if (!q) { return true; }
      if (has(p.name, q)) { return true; }
      return (p.sections || []).some(function (s) { return has(s.body, q); });
    });
  }

  function sections(store, query, opts) {
    var o = opts || {};
    var q = String(query || '').toLowerCase();
    var hits = [];
    allPrompts(store).forEach(function (p) {
      (p.sections || []).forEach(function (s) {
        if (o.tag && s.tag !== o.tag) { return; }
        if (q && !has(s.body, q) && !has(s.tag, q)) { return; }
        hits.push({ promptId: p.id, promptName: p.name, section: s });
      });
    });
    return hits;
  }

  function tags(store) {
    var counts = Object.create(null), order = [];
    (store && Array.isArray(store.prompts) ? store.prompts : []).forEach(function (p) {
      (p.sections || []).forEach(function (s) {
        if (!s.tag) { return; }
        if (counts[s.tag] === undefined) { counts[s.tag] = 0; order.push(s.tag); }
        counts[s.tag] += 1;
      });
    });
    // Most used first; first appearance breaks ties so the order is deterministic.
    return order.slice().sort(function (a, b) {
      return (counts[b] - counts[a]) || (order.indexOf(a) - order.indexOf(b));
    });
  }

  PT.search = { prompts: prompts, sections: sections, tags: tags };
})(window.PT = window.PT || {});
