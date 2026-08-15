(function (PT) {
  'use strict';

  var KEY = 'promptool_v1';
  var VERSION = 1;

  function empty() { return { version: VERSION, prompts: [], bank: [] }; }

  function shaped(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { return null; }
    if (raw.version !== VERSION) { return null; }
    return {
      version: VERSION,
      prompts: Array.isArray(raw.prompts) ? raw.prompts : [],
      bank: Array.isArray(raw.bank) ? raw.bank : []
    };
  }

  function migrate(raw) { return shaped(raw) || empty(); }

  // Never throws, never returns undefined. On a parse failure the raw string is
  // preserved under a backup key first — losing data silently is not acceptable.
  function load() {
    var text = null;
    try { text = localStorage.getItem(KEY); } catch (e) { return empty(); }
    if (text === null) { return empty(); }
    var raw;
    try {
      raw = JSON.parse(text);
    } catch (e) {
      try { localStorage.setItem(KEY + '_corrupt_backup', text); } catch (e2) { /* full quota */ }
      return empty();
    }
    return migrate(raw);
  }

  function save(store) {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* quota */ }
  }

  function exportJson(store) { return JSON.stringify(store, null, 2); }

  function importJson(text) {
    var raw;
    try { raw = JSON.parse(text); } catch (e) { return { ok: false, error: 'not valid JSON' }; }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { ok: false, error: 'not an object' };
    }
    if (!Array.isArray(raw.prompts)) { return { ok: false, error: 'missing prompts array' }; }
    if (!Array.isArray(raw.bank)) { return { ok: false, error: 'missing bank array' }; }
    return { ok: true, store: { version: VERSION, prompts: raw.prompts, bank: raw.bank } };
  }

  PT.store = {
    KEY: KEY, VERSION: VERSION,
    load: load, save: save, exportJson: exportJson, importJson: importJson, migrate: migrate
  };
})(window.PT = window.PT || {});
