// Boots ui.js against a minimal DOM shim and drives the real user flows.
// Not a unit test — a smoke test for the one failure that matters most:
// a load-time error that leaves the page blank.
import fs from 'node:fs';
import assert from 'node:assert/strict';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '../src');

/* ── DOM shim ────────────────────────────────────────────────────────────── */
class El {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = []; this.parentNode = null;
    this._cls = new Set(); this._html = ''; this._text = '';
    this.style = {}; this.dataset = {}; this.value = ''; this.checked = false;
    this.listeners = {}; this.attrs = {};
    this.classList = {
      add: (c) => this._cls.add(c),
      remove: (c) => this._cls.delete(c),
      toggle: (c, on) => (on ? this._cls.add(c) : this._cls.delete(c)),
      contains: (c) => this._cls.has(c),
    };
    this.selectionStart = 0; this.selectionEnd = 0;
    this.scrollHeight = 80;
  }
  get className() { return [...this._cls].join(' '); }
  set className(v) { this._cls = new Set(String(v).split(/\s+/).filter(Boolean)); }
  get innerHTML() { return this._html; }
  set innerHTML(v) { this._html = String(v); this.children = []; }
  get textContent() { return this._text || this.children.map((c) => c.textContent).join(''); }
  set textContent(v) { this._text = String(v); this.children = []; }
  appendChild(c) { c.parentNode = this; this.children.push(c); this._html = ''; return c; }
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
  removeEventListener() {}
  getBoundingClientRect() { return { left: 0, top: 0, bottom: 100, right: 100 }; }
  focus() {} blur() { this.fire('blur'); }
  setAttribute(k, v) { this.attrs[k] = v; } getAttribute(k) { return this.attrs[k]; }
  showModal() { this.open = true; } close() { this.open = false; }
  click() { this.fire('click'); }
  fire(t, ev = {}) { (this.listeners[t] || []).forEach((fn) => fn({ preventDefault() {}, ...ev })); }
  walk(out = []) { for (const c of this.children) { out.push(c); c.walk(out); } return out; }
  querySelectorAll(sel) {
    const cls = sel.replace(/^\./, '');
    return this.walk().filter((e) => e._cls.has(cls));
  }
  closest(sel) {
    const cls = sel.replace(/^\./, '');
    let n = this;
    while (n) { if (n._cls.has(cls)) return n; n = n.parentNode; }
    return null;
  }
}

const byId = {};
const IDS = ['sections','preview','toast','ac','empty','prompt-bar','prompt-name','char-count',
  'list-prompts','list-sections','q-prompts','q-sections','filter-kind','filter-tag',
  'btn-new','btn-add-section','btn-template','btn-delete','btn-copy','btn-save-file',
  'btn-bank','btn-export','btn-import','file-import','dlg-bank','bank-text',
  'btn-bank-save','btn-bank-close'];
IDS.forEach((id) => { byId[id] = new El('div'); });

const docListeners = {};
const document = {
  getElementById: (id) => byId[id] || null,
  createElement: (t) => new El(t),
  createTextNode: (t) => { const e = new El('#text'); e.textContent = t; return e; },
  addEventListener: (t, fn) => { (docListeners[t] ||= []).push(fn); },
  activeElement: null,
  body: new El('body'),
};

const localStorage = (() => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null),
           setItem: (k, v) => m.set(k, String(v)),
           removeItem: (k) => m.delete(k) };
})();

const window = {
  addEventListener() {}, getSelection: () => '',
  innerWidth: 1600, innerHeight: 900,
};
const navigator = { clipboard: null };
const setTimeout_ = () => 0;

/* ── load every module the page loads, in page order ─────────────────────── */
const ORDER = ['model.js','serialize.js','complete.js','store.js','search.js','seed.js','ui.js'];
for (const f of ORDER) {
  const src = fs.readFileSync(`${SRC}/${f}`, 'utf8');
  new Function('window','document','localStorage','navigator','setTimeout','clearTimeout','confirm','alert',src)
    (window, document, localStorage, navigator, setTimeout_, () => {}, () => true, () => {});
}
const PT = window.PT;

/* ── drive it ────────────────────────────────────────────────────────────── */
let pass = 0, fail = 0;
const check = (name, fn) => {
  try { fn(); console.log('  ok   ' + name); pass++; }
  catch (e) { console.log('  FAIL ' + name + '  — ' + e.message); fail++; }
};

check('all 7 modules registered', () => {
  assert.deepEqual(Object.keys(PT).sort(),
    ['complete','model','search','seed','serialize','store','ui'].sort());
});

// boot() is bound to DOMContentLoaded, which the shim never fires — call it.
check('boot() runs without throwing', () => { PT.ui.boot(); });

check('seed loaded: 1 template prompt, 10 block sections, 4 bank terms', () => {
  const s = PT.store.load();
  assert.equal(s.prompts.length, 1);
  assert.equal(s.prompts[0].kind, 'template');
  assert.equal(s.prompts[0].sections.length, 10);
  assert.equal(s.bank.length, 4);
});

check('section library lists the 10 seeded blocks', () => {
  assert.equal(byId['list-sections'].children.length, 10);
});

check('+ New creates a prompt with the six default sections', () => {
  byId['btn-new'].fire('click');
  assert.equal(byId['sections'].children.length, 6);
  const tags = byId['sections'].children.map((c) =>
    c.children[0].children[1].value.replace(/[<>]/g, ''));
  assert.deepEqual(tags, ['role','context','goal','background','state','output']);
});

check('typing in a section updates the preview', () => {
  const first = byId['sections'].children[0];
  const body = first.children[1];
  body.value = 'You are working on Unreal Engine and Claude Code.';
  body.fire('input');
  assert.equal(byId['preview'].innerHTML.includes('&lt;role&gt;'), true);
  assert.equal(byId['preview'].innerHTML.includes('Unreal Engine'), true);
});

check('serialized output is exactly the XML section', () => {
  const p = PT.store.load().prompts.find((x) => x.sections.length === 6);
  assert.equal(PT.serialize.toXml(p),
    '<role>\nYou are working on Unreal Engine and Claude Code.\n</role>');
});

check('unticking include drops the section from the output', () => {
  const inc = byId['sections'].children[0].children[0].children[2].children[0];
  inc.checked = false; inc.fire('change');
  const p = PT.store.load().prompts.find((x) => x.sections.length === 6);
  assert.equal(PT.serialize.toXml(p), '');
  inc.checked = true; inc.fire('change');
});

check('Tab completes a Title-Case phrase from another section', () => {
  const goal = byId['sections'].children[2];      // section 3 = goal
  const ta = goal.children[1];
  ta.value = 'Ship Unr';
  ta.selectionStart = ta.selectionEnd = ta.value.length;
  ta.fire('keydown', { key: 'Tab', shiftKey: false, ctrlKey: false, altKey: false });
  assert.equal(ta.value, 'Ship Unreal Engine');
});

check('Tab again cycles to the next candidate', () => {
  const ta = byId['sections'].children[2].children[1];
  ta.fire('keydown', { key: 'Tab', shiftKey: false, ctrlKey: false, altKey: false });
  assert.notEqual(ta.value, 'Ship Unreal Engine');
  assert.equal(ta.value.startsWith('Ship Unr'), true);
});

check('renaming a tag slugs it into a valid XML name', () => {
  const tag = byId['sections'].children[0].children[0].children[1];
  tag.value = 'Custom Thing'; tag.fire('blur');
  const p = PT.store.load().prompts.find((x) => x.sections.length === 6);
  assert.equal(p.sections[0].tag, 'custom_thing');
});

check('inserting a library section copies it and leaves the source untouched', () => {
  const before = PT.store.load().prompts.find((x) => x.kind === 'template');
  const beforeBody = before.sections[0].body;
  const beforeId = before.sections[0].id;
  // The library is ordered most-recently-updated first, so the prompt being
  // edited outranks the seed. Find the seeded block by name, not by position.
  const row = byId['list-sections'].children.find((r) => r._html.includes('investigate_first'));
  assert.ok(row, 'investigate_first is listed in the library');
  row.fire('click');

  const after = PT.store.load();
  const tpl = after.prompts.find((x) => x.kind === 'template');
  const mine = after.prompts.find((x) => x.sections.length === 7);
  assert.ok(mine, 'current prompt gained a section');
  const copied = mine.sections[6];
  assert.equal(copied.body, beforeBody);
  assert.notEqual(copied.id, beforeId);
  assert.equal(tpl.sections[0].body, beforeBody);   // source unchanged
  assert.equal(tpl.sections.length, 10);
});

check('deleting a section removes only that one', () => {
  const n = byId['sections'].children.length;
  byId['sections'].children[1].children[0].children[4].fire('click');
  assert.equal(byId['sections'].children.length, n - 1);
});

check('search finds a prompt by section body', () => {
  const s = PT.store.load();
  assert.equal(PT.search.prompts(s, 'unreal', {}).length, 1);
  assert.equal(PT.search.prompts(s, 'over-engineering', {}).length >= 1, true);
});

check('export → import round-trips the whole store', () => {
  const s = PT.store.load();
  const r = PT.store.importJson(PT.store.exportJson(s));
  assert.equal(r.ok, true);
  assert.deepEqual(r.store, s);
});

check('reload restores everything from localStorage', () => {
  const before = PT.store.load();
  PT.ui.boot();
  assert.deepEqual(PT.store.load(), before);
});

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
