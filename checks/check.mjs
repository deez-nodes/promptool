#!/usr/bin/env node
/**
 * checks/check.mjs — zero-dependency verification harness for the merged promptor.html
 *
 *   "C:\Program Files\nodejs\node.exe" C:\Dev\promptool\checks\check.mjs
 *
 * Exit code 0 = every check passed, 1 = at least one failed (CI-usable).
 *
 * The assertions below encode the MERGE SPEC, not whatever promptor.html currently
 * happens to contain. Failures are expected while the merge is in progress.
 *
 * Two kinds of checks are run, and each is labelled in the output:
 *   [struct] — string/regex assertions over the file text.
 *   [behav]  — the real <script> block is evaluated in node:vm against a DOM +
 *              localStorage stub, and the resulting runtime state is inspected.
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
// Defaults to ../index.html (renamed from promptor.html so GitHub Pages has an
// entry point at /). An explicit path may be passed so the harness can be
// pointed at a copy (used to mutation-test the checks themselves).
const TARGET = path.resolve(process.argv[2] || process.env.PROMPTOR_HTML || path.join(ROOT, 'index.html'));

/* ════════════════════════════════════════════════════════════════════════════
   SPEC CONSTANTS — the source of truth for this harness.
   ════════════════════════════════════════════════════════════════════════════ */

// A. bridge tokens that must not survive anywhere in the file.
const BANNED_TOKENS = [
  { label: 'fetch(', re: /\bfetch\s*\(/g },
  { label: 'EventSource', re: /\bEventSource\b/g },
  { label: '__PROMPTOR_TOKEN__', re: /__PROMPTOR_TOKEN__/g },
  { label: '__PROMPTOR_PORT__', re: /__PROMPTOR_PORT__/g },
  { label: 'x-promptor-token', re: /x-promptor-token/gi },
  { label: '/health', re: /\/health\b/g },
  { label: '/stream', re: /\/stream\b/g },
  { label: '/restart', re: /\/restart\b/g },
  // not enumerated in the spec, but it is the bridge's own endpoint and the
  // spec's intent is "the bridge is fully gone".
  { label: "/send (bridge endpoint)", re: /['"`]\/send['"`]/g },
];

// A. functions that must be gone.
const REMOVED_FUNCTIONS = [
  'bridgePost', 'chatSend', 'cmsg', 'handleEvent', 'openStream',
  'optimizeViaBridge', 'runViaBridge', 'setBridgeEnabled', 'onRunCfgChange',
];

// B. every template that must exist after the merge.
const EXPECTED_TEMPLATES = [
  'claude_code', 'dev', 'general', 'pe_agentic', 'pe_extract', 'pe_general',
  'pe_longdoc', 'pe_research', 'pe_role', 'promptology',
  'ts_debug', 'ts_schema', 'ts_signal', 'ts_ui',
];

// B. exact shape of the four templates ported over from promptology.html
// (extracted from promptology.html lines 676-721; the ported content is the spec).
const PORTED_TS_TEMPLATES = {
  ts_signal: {
    label: 'TS — Signal Engine',
    fields: ['signal', 'files', 'inputs', 'outputs', 'math', 'rules'],
    fileFields: ['files'],
  },
  ts_ui: {
    label: 'TS — Frontend Component',
    fields: ['component', 'files', 'data', 'behavior', 'layout', 'rules'],
    fileFields: ['files'],
  },
  ts_schema: {
    label: 'TS — Schema / DB',
    fields: ['table', 'files', 'fields', 'queries', 'rules'],
    fileFields: ['files'],
  },
  ts_debug: {
    label: 'TS — Debug Session',
    fields: ['symptom', 'files', 'error', 'tried', 'scope'],
    fileFields: ['files'],
  },
};

// C. functions promptor.html must keep.
const KEPT_FUNCTIONS = [
  'buildCheat', 'col', 'lnEnd', 'lnStart', 'onFieldKeydown', 'pushUndo',
  'setCur', 'setFmt', 'setVim', 'setVimMode', 'slug', 'toggleCheat',
  'updateVimHud', 'wordBack', 'wordEnd', 'wordFwd',
];

// D. functions ported in from promptology.html.
const PORTED_FUNCTIONS = ['copyPrompt', 'copyRaw', 'updateCharCount'];

// E. localStorage keys.
const LEGACY_KEY = 'ts_pm_items';
const CURRENT_KEY = 'promptor_items';

/* ════════════════════════════════════════════════════════════════════════════
   REPORTING
   ════════════════════════════════════════════════════════════════════════════ */

const results = [];
let currentSection = 'SETUP';
const lines = [];
const say = (s = '') => lines.push(s);

function section(title) {
  currentSection = title;
  say('');
  say(`── ${title} ${'─'.repeat(Math.max(3, 72 - title.length))}`);
}

function fmt(v) {
  if (v === undefined) return 'undefined';
  if (typeof v === 'string') return v;
  let s;
  try { s = JSON.stringify(v); } catch { s = String(v); }
  if (s === undefined) s = String(v);
  return s.length > 600 ? s.slice(0, 600) + ` … (+${s.length - 600} chars)` : s;
}

/**
 * fn returns either true/false, or { ok, expected, actual }.
 * kind is 'struct' (text matched) or 'behav' (real code executed).
 */
function check(name, kind, fn) {
  let ok = false, expected, actual;
  try {
    const r = fn();
    if (r === true) ok = true;
    else if (r === false || r === undefined || r === null) ok = false;
    else if (typeof r === 'object') { ok = !!r.ok; expected = r.expected; actual = r.actual; }
    else ok = !!r;
  } catch (e) {
    ok = false;
    expected = expected ?? 'the check itself to run without throwing';
    actual = `harness error: ${e && e.stack ? String(e.stack).split('\n').slice(0, 3).join(' | ') : String(e)}`;
  }
  results.push({ section: currentSection, name, ok });
  say(`${ok ? 'PASS' : 'FAIL'}  [${kind}] ${name}`);
  if (!ok) {
    if (expected !== undefined) say(`         expected: ${fmt(expected)}`);
    if (actual !== undefined) say(`         actual:   ${fmt(actual)}`);
  }
  return ok;
}

/* ════════════════════════════════════════════════════════════════════════════
   FILE + SCRIPT EXTRACTION
   ════════════════════════════════════════════════════════════════════════════ */

let HTML = '';
let RAW_BYTES = 0;
let readError = null;
try {
  const raw = fs.readFileSync(TARGET, 'utf8');
  RAW_BYTES = Buffer.byteLength(raw, 'utf8');
  // Normalise line endings so every scan below is CRLF/LF agnostic. Line numbers
  // are unaffected (\r\n and \n both count as one line break).
  HTML = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
} catch (e) { readError = e; }

const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;

function extractScripts(html) {
  const blocks = [];
  let m;
  SCRIPT_RE.lastIndex = 0;
  while ((m = SCRIPT_RE.exec(html))) {
    if (/\bsrc\s*=/i.test(m[1])) continue;         // external script: not evaluable
    if (/\btype\s*=\s*["']?(?!text\/javascript|module|application\/javascript)/i.test(m[1])) continue;
    blocks.push({ body: m[2], startLine: html.slice(0, m.index).split('\n').length });
  }
  return blocks;
}

const SCRIPT_BLOCKS = extractScripts(HTML);
const SCRIPT_SRC = SCRIPT_BLOCKS.map(b => b.body).join('\n;\n');
const MARKUP_ONLY = HTML.replace(SCRIPT_RE, (all, attrs) => (/\bsrc\s*=/i.test(attrs) ? all : '<script></script>'));

function occurrences(text, re) {
  const hits = [];
  const rx = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  let m;
  while ((m = rx.exec(text))) {
    const before = text.slice(0, m.index);
    const line = before.split('\n').length;
    const lineStart = before.lastIndexOf('\n') + 1;
    const lineText = text.slice(lineStart, text.indexOf('\n', m.index) < 0 ? text.length : text.indexOf('\n', m.index));
    hits.push({ line, snippet: lineText.trim().slice(0, 140) });
    if (m[0] === '') rx.lastIndex++;
    if (hits.length >= 12) break;
  }
  return hits;
}

// occurrences() reports lines relative to the text it was given; for script-only
// scans, translate back to file lines.
function scriptLineToFileLine(scriptLine) {
  let remaining = scriptLine;
  for (const b of SCRIPT_BLOCKS) {
    const len = b.body.split('\n').length;
    if (remaining <= len) return b.startLine + remaining - 1;
    remaining -= len + 1; // the '\n;\n' joiner
  }
  return scriptLine;
}

/* ════════════════════════════════════════════════════════════════════════════
   DOM + localStorage STUB  (enough surface for the real script to boot)
   ════════════════════════════════════════════════════════════════════════════ */

function makeElement(tag, id) {
  const classes = new Set();
  const el = {
    tagName: String(tag || 'div').toUpperCase(),
    id: id || '',
    value: '', textContent: '', innerHTML: '', innerText: '', title: '',
    placeholder: '', href: '', download: '', type: '', name: '',
    disabled: false, checked: false, selected: false, spellcheck: false, rows: 1,
    selectionStart: 0, selectionEnd: 0,
    scrollHeight: 70, scrollTop: 0, scrollWidth: 0, clientHeight: 70, offsetHeight: 70,
    style: {}, dataset: {}, options: [], children: [], childNodes: [], parentNode: null,
    classList: {
      add(...c) { c.forEach(x => classes.add(x)); },
      remove(...c) { c.forEach(x => classes.delete(x)); },
      contains(c) { return classes.has(c); },
      toggle(c, force) {
        const on = force === undefined ? !classes.has(c) : !!force;
        if (on) classes.add(c); else classes.delete(c);
        return on;
      },
      get length() { return classes.size; },
      toString() { return [...classes].join(' '); },
    },
    get className() { return [...classes].join(' '); },
    set className(v) {
      classes.clear();
      String(v).split(/\s+/).filter(Boolean).forEach(x => classes.add(x));
    },
    appendChild(c) { if (c) { c.parentNode = el; el.children.push(c); } return c; },
    insertBefore(c) { if (c) { c.parentNode = el; el.children.push(c); } return c; },
    removeChild(c) { const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); return c; },
    replaceChildren() { el.children.length = 0; },
    remove() { },
    addEventListener() { }, removeEventListener() { }, dispatchEvent() { return true; },
    setAttribute(k, v) { if (k === 'id') el.id = String(v); },
    getAttribute() { return null; },
    removeAttribute() { },
    hasAttribute() { return false; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    closest() { return makeElement('div', ''); },
    focus() { }, blur() { }, click() { }, scrollIntoView() { },
    setSelectionRange(a, b) { el.selectionStart = a; el.selectionEnd = b; },
    getBoundingClientRect() { return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }; },
  };
  return el;
}

function makeStorage(map) {
  return {
    getItem(k) { const key = String(k); return map.has(key) ? map.get(key) : null; },
    setItem(k, v) { map.set(String(k), String(v)); },
    removeItem(k) { map.delete(String(k)); },
    clear() { map.clear(); },
    key(i) { const ks = [...map.keys()]; return i < ks.length ? ks[i] : null; },
    get length() { return map.size; },
  };
}

function makeSandbox(store) {
  const consoleLines = [];
  const rec = (lvl) => (...a) => consoleLines.push(`${lvl}: ${a.map(x => {
    try { return typeof x === 'string' ? x : JSON.stringify(x); } catch { return String(x); }
  }).join(' ')}`);

  const registry = new Map();
  const document = {
    getElementById(id) {
      const k = String(id);
      if (!registry.has(k)) registry.set(k, makeElement('div', k));
      return registry.get(k);
    },
    createElement(tag) { return makeElement(tag, ''); },
    createTextNode(t) { return { textContent: String(t) }; },
    createDocumentFragment() { return makeElement('div', ''); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getElementsByClassName() { return []; },
    getElementsByTagName() { return []; },
    addEventListener() { }, removeEventListener() { },
    execCommand() { return true; },
    activeElement: null,
    body: makeElement('body', 'body'),
    head: makeElement('head', 'head'),
    documentElement: makeElement('html', 'html'),
    title: '',
    readyState: 'complete',
  };

  const sandbox = {
    console: { log: rec('log'), warn: rec('warn'), error: rec('error'), info: rec('info'), debug: rec('debug') },
    document,
    localStorage: makeStorage(store),
    sessionStorage: makeStorage(new Map()),
    navigator: { clipboard: { writeText: () => Promise.resolve() }, userAgent: 'node-vm-stub' },
    location: { href: 'file:///promptor.html', search: '', hash: '', protocol: 'file:', reload() { } },
    history: { pushState() { }, replaceState() { } },
    setTimeout: () => 0, clearTimeout: () => { },
    setInterval: () => 0, clearInterval: () => { },
    requestAnimationFrame: () => 0, cancelAnimationFrame: () => { },
    queueMicrotask: () => { },
    alert() { }, confirm() { return true; }, prompt() { return null; },
    matchMedia: () => ({ matches: false, addEventListener() { }, addListener() { } }),
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    Blob: class Blob { constructor(parts, opts) { this.parts = parts; this.options = opts; } },
    URL: { createObjectURL: () => 'blob:stub', revokeObjectURL() { } },
    Event: class Event { constructor(t) { this.type = t; } },
    CustomEvent: class CustomEvent { constructor(t) { this.type = t; } },
    __registry: registry,
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  return { sandbox, consoleLines, registry };
}

/** Boot the page script against `store` (a Map used as localStorage backing). */
function loadApp(store) {
  const { sandbox, consoleLines, registry } = makeSandbox(store);
  const ctx = vm.createContext(sandbox);
  let error = null;
  try {
    vm.runInContext(SCRIPT_SRC, ctx, { filename: 'promptor.html<script>', timeout: 8000 });
  } catch (e) {
    error = e;
  }
  return { ctx, error, consoleLines, registry, store };
}

/**
 * Evaluate an expression in the loaded context. Top-level `const`/`let` from the
 * page script live in the context's global lexical scope, so they are reachable
 * from a follow-up runInContext call even if the script threw partway through.
 */
function grab(app, expr, fallback = undefined) {
  try { return vm.runInContext(expr, app.ctx, { timeout: 4000 }); }
  catch { return fallback; }
}

const typeOf = (app, name) => grab(app, `typeof ${name}`, 'undefined');

/* the primary instance: empty localStorage, used for sections A–D */
const APP = SCRIPT_SRC ? loadApp(new Map()) : null;
const LOAD_OK = !!APP && !APP.error;

/**
 * "is this identifier a live function?"
 * Runtime typeof is authoritative. Only when the script failed to boot do we
 * fall back to a source-level definition scan, so one boot error does not
 * cascade into 19 misleading "function missing" failures.
 */
function fnPresent(name) {
  if (typeOf(APP, name) === 'function') return { ok: true, how: 'runtime' };
  if (!LOAD_OK && sourceDefines(name)) return { ok: true, how: 'source-only (script failed to boot — see SETUP)' };
  return { ok: false, how: 'absent' };
}

function sourceDefines(name) {
  const n = name.replace(/[$]/g, '\\$');
  return new RegExp(
    `function\\s+${n}\\s*\\(|` +
    `(?:const|let|var)\\s+${n}\\s*=|` +
    `\\b${n}\\s*=\\s*(?:async\\s*)?(?:function\\b|\\(|[A-Za-z_$][\\w$]*\\s*=>)|` +
    `\\bwindow\\.${n}\\s*=`
  ).test(SCRIPT_SRC);
}

/* ════════════════════════════════════════════════════════════════════════════
   SETUP
   ════════════════════════════════════════════════════════════════════════════ */

say('promptor.html verification harness');
say(`target: ${TARGET}`);
if (!readError) say(`        ${RAW_BYTES.toLocaleString()} bytes, ${HTML.split('\n').length} lines`);
say('');
say('legend: [struct] = assertion over file text · [behav] = page script executed in node:vm');

section('SETUP');

check('promptor.html is readable', 'struct', () => ({
  ok: !readError && HTML.length > 0,
  expected: `a readable non-empty file at ${TARGET}`,
  actual: readError ? String(readError.message) : 'empty file',
}));

check('at least one inline <script> block found', 'struct', () => ({
  ok: SCRIPT_BLOCKS.length >= 1 && SCRIPT_SRC.trim().length > 0,
  expected: '>= 1 inline <script> block with a body',
  actual: `${SCRIPT_BLOCKS.length} inline block(s), ${SCRIPT_SRC.length} chars of JS`,
}));

check('page script boots in the DOM stub without throwing', 'behav', () => ({
  ok: LOAD_OK,
  expected: 'no exception while evaluating the page script',
  actual: APP && APP.error
    ? `${APP.error.name}: ${APP.error.message}`
    : 'script was never evaluated (no script body)',
}));

check('no runtime console errors during boot', 'behav', () => {
  const errs = (APP ? APP.consoleLines : []).filter(l => l.startsWith('error:'));
  return { ok: errs.length === 0, expected: 'zero console.error calls at load', actual: errs.join(' | ') };
});

/* ════════════════════════════════════════════════════════════════════════════
   A. BRIDGE FULLY REMOVED / NO DEAD CONTROLS
   ════════════════════════════════════════════════════════════════════════════ */

section('A. BRIDGE REMOVED — file must be pure static');

for (const tok of BANNED_TOKENS) {
  check(`zero occurrences of  ${tok.label}`, 'struct', () => {
    const hits = occurrences(HTML, tok.re);
    return {
      ok: hits.length === 0,
      expected: `0 occurrences of ${tok.label} anywhere in promptor.html`,
      actual: `${hits.length} occurrence(s): ` + hits.map(h => `L${h.line}: ${h.snippet}`).join('  //  '),
    };
  });
}

for (const fn of REMOVED_FUNCTIONS) {
  check(`bridge function removed:  ${fn}`, 'struct', () => {
    const hits = occurrences(SCRIPT_SRC, new RegExp(`\\b${fn}\\b`, 'g'));
    return {
      ok: hits.length === 0,
      expected: `identifier "${fn}" appears 0 times in the page script (definition and call sites both gone)`,
      actual: `${hits.length} occurrence(s): ` +
        hits.map(h => `L${scriptLineToFileLine(h.line)}: ${h.snippet}`).join('  //  '),
    };
  });
}

check('bridge functions are also not live at runtime', 'behav', () => {
  const alive = REMOVED_FUNCTIONS.filter(f => typeOf(APP, f) === 'function');
  return {
    ok: alive.length === 0,
    expected: 'typeof <bridgeFn> === "undefined" for all 9 removed functions',
    actual: `still defined after boot: ${alive.join(', ')}`,
  };
});

/* --- dead controls: inline handlers -------------------------------------- */

const JS_KEYWORDS = new Set([
  'if', 'for', 'while', 'switch', 'catch', 'return', 'typeof', 'function', 'new',
  'delete', 'void', 'in', 'of', 'do', 'else', 'try', 'throw', 'await', 'yield',
  'String', 'Number', 'Boolean', 'Array', 'Object', 'JSON', 'Math', 'Date',
  'parseInt', 'parseFloat', 'isNaN', 'alert', 'confirm', 'prompt', 'console',
  'encodeURIComponent', 'decodeURIComponent', 'Promise', 'Set', 'Map', 'RegExp',
]);

function inlineHandlers(markup) {
  const out = [];
  const re = /\son([a-z]+)\s*=\s*("([^"]*)"|'([^']*)')/gi;
  let m;
  while ((m = re.exec(markup))) {
    const code = m[3] !== undefined ? m[3] : m[4];
    const line = markup.slice(0, m.index).split('\n').length;
    out.push({ attr: `on${m[1]}`, code, line });
  }
  return out;
}

function calledIdents(code) {
  const names = new Set();
  const re = /(?:^|[^\w$.])([A-Za-z_$][\w$]*)\s*\(/g;
  let m;
  while ((m = re.exec(code))) {
    if (!JS_KEYWORDS.has(m[1])) names.add(m[1]);
  }
  return [...names];
}

const HANDLERS = inlineHandlers(MARKUP_ONLY);

check(`every inline on*= handler resolves to a live function (${HANDLERS.length} handler attrs scanned)`, 'behav', () => {
  const bad = [];
  for (const h of HANDLERS) {
    for (const id of calledIdents(h.code)) {
      if (typeOf(APP, id) !== 'function') bad.push(`L${h.line} ${h.attr}="${h.code.slice(0, 60)}" → ${id} is ${typeOf(APP, id)}`);
    }
  }
  return {
    ok: bad.length === 0,
    expected: 'every function called from an inline handler attribute is defined in the page script',
    actual: `${bad.length} dead control(s): ` + bad.join('  //  '),
  };
});

check('every addEventListener(evt, <bareIdentifier>) target is a live function', 'behav', () => {
  const re = /addEventListener\s*\(\s*['"][^'"]+['"]\s*,\s*([A-Za-z_$][\w$]*)\s*[,)]/g;
  const bad = [];
  let m, n = 0;
  while ((m = re.exec(SCRIPT_SRC))) {
    n++;
    if (JS_KEYWORDS.has(m[1])) continue;
    if (typeOf(APP, m[1]) !== 'function') bad.push(`${m[1]} is ${typeOf(APP, m[1])}`);
  }
  return {
    ok: bad.length === 0,
    expected: `all named addEventListener targets defined (${n} named target(s) found)`,
    actual: bad.join(', '),
  };
});

check('every el.on<evt> = <bareIdentifier> assignment targets a live function', 'behav', () => {
  const re = /\.on([a-z]+)\s*=\s*([A-Za-z_$][\w$]*)(?![\w$(])/g;
  const bad = [];
  let m;
  while ((m = re.exec(SCRIPT_SRC))) {
    if (JS_KEYWORDS.has(m[2])) continue;
    if (typeOf(APP, m[2]) !== 'function') bad.push(`.on${m[1]} = ${m[2]} (${typeOf(APP, m[2])})`);
  }
  return { ok: bad.length === 0, expected: 'no handler assigned from an undefined identifier', actual: bad.join(', ') };
});

check('every getElementById(id) has a matching element in the markup', 'struct', () => {
  const wanted = new Set();
  let m;
  const gre = /getElementById\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = gre.exec(SCRIPT_SRC))) wanted.add(m[1]);

  const present = new Set();
  const ire = /\sid\s*=\s*["']([^"']+)["']/g;
  while ((m = ire.exec(MARKUP_ONLY))) present.add(m[1]);
  // ids created dynamically by the script (e.g. row.id='blocks-row')
  const dre = /\.id\s*=\s*['"]([^'"]+)['"]/g;
  while ((m = dre.exec(SCRIPT_SRC))) present.add(m[1]);

  const missing = [...wanted].filter(id => !present.has(id)).sort();
  return {
    ok: missing.length === 0,
    expected: `all ${wanted.size} getElementById targets exist as id="…" in the markup (or are created by the script)`,
    actual: `missing element(s): ${missing.join(', ')}`,
  };
});

check('no control left permanently disabled in the markup', 'struct', () => {
  const hits = occurrences(MARKUP_ONLY, /\sdisabled(?=[\s>=])/g);
  const reEnables = /\.disabled\s*=\s*(?:false|!)|removeAttribute\s*\(\s*['"]disabled['"]/.test(SCRIPT_SRC);
  return {
    ok: hits.length === 0 || reEnables,
    expected: 'no disabled="" controls in markup unless the script can re-enable them (the bridge was the only thing that did)',
    actual: `${hits.length} disabled control(s) and no re-enabling code: ` + hits.map(h => `L${h.line}: ${h.snippet}`).join('  //  '),
  };
});

/* ════════════════════════════════════════════════════════════════════════════
   B. TEMPLATES
   ════════════════════════════════════════════════════════════════════════════ */

section('B. TEMPLATES — all 14 present and well-formed');

const templatesRaw = grab(APP, 'typeof TEMPLATES !== "undefined" ? JSON.stringify(TEMPLATES) : null', null);
let TPL = null;
try { TPL = typeof templatesRaw === 'string' ? JSON.parse(templatesRaw) : null; } catch { TPL = null; }

check('TEMPLATES object exists at runtime', 'behav', () => ({
  ok: !!TPL && typeof TPL === 'object',
  expected: 'a TEMPLATES object in the page script scope',
  actual: TPL === null ? 'TEMPLATES is not defined (or not JSON-serialisable) after boot' : typeof TPL,
}));

check('TEMPLATES contains exactly the 14 specified keys', 'behav', () => {
  const keys = TPL ? Object.keys(TPL).sort() : [];
  const missing = EXPECTED_TEMPLATES.filter(k => !keys.includes(k));
  const extra = keys.filter(k => !EXPECTED_TEMPLATES.includes(k));
  return {
    ok: missing.length === 0 && extra.length === 0,
    expected: `${EXPECTED_TEMPLATES.length} keys: ${EXPECTED_TEMPLATES.join(', ')}`,
    actual: `${keys.length} keys` +
      (missing.length ? ` · MISSING: ${missing.join(', ')}` : '') +
      (extra.length ? ` · UNEXPECTED: ${extra.join(', ')}` : ''),
  };
});

for (const key of EXPECTED_TEMPLATES) {
  check(`template ${key}: non-empty label + valid fields[]`, 'behav', () => {
    const t = TPL ? TPL[key] : undefined;
    if (!t) return { ok: false, expected: `TEMPLATES.${key} to be an object`, actual: 'missing' };
    const problems = [];
    if (typeof t.label !== 'string' || t.label.trim() === '') problems.push(`label is ${JSON.stringify(t.label)}`);
    if (!Array.isArray(t.fields)) problems.push('fields is not an array');
    else if (t.fields.length === 0) problems.push('fields is empty');
    else t.fields.forEach((f, i) => {
      if (!f || typeof f !== 'object') { problems.push(`fields[${i}] is not an object`); return; }
      if (typeof f.key !== 'string' || !f.key.trim()) problems.push(`fields[${i}].key is ${JSON.stringify(f.key)}`);
      if (typeof f.label !== 'string' || !f.label.trim()) problems.push(`fields[${i}].label is ${JSON.stringify(f.label)}`);
    });
    return {
      ok: problems.length === 0,
      expected: `${key}: non-empty string label, non-empty fields[], every field has non-empty key+label`,
      actual: problems.join('; '),
    };
  });
}

for (const [key, spec] of Object.entries(PORTED_TS_TEMPLATES)) {
  check(`ported template ${key}: field keys match promptology.html`, 'behav', () => {
    const t = TPL ? TPL[key] : undefined;
    const got = t && Array.isArray(t.fields) ? t.fields.map(f => f && f.key) : [];
    const keysOk = JSON.stringify(got) === JSON.stringify(spec.fields);
    const fileOk = spec.fileFields.every(fk => {
      const f = t && Array.isArray(t.fields) ? t.fields.find(x => x && x.key === fk) : null;
      return f && f.hasFiles === true;
    });
    return {
      ok: keysOk && fileOk,
      expected: `fields ${JSON.stringify(spec.fields)} (in order), with hasFiles:true on ${spec.fileFields.join(', ')}`,
      actual: `fields ${JSON.stringify(got)}` + (keysOk && !fileOk ? ' — hasFiles:true missing on the files field' : ''),
    };
  });

  check(`ported template ${key}: label preserved`, 'behav', () => {
    const t = TPL ? TPL[key] : undefined;
    return {
      ok: !!t && t.label === spec.label,
      expected: JSON.stringify(spec.label),
      actual: JSON.stringify(t ? t.label : undefined),
    };
  });
}

check('all 14 templates are selectable in the UI (option values or generated from TEMPLATES)', 'struct', () => {
  const optionValues = new Set();
  let m;
  const re = /<option\b[^>]*\bvalue\s*=\s*["']([^"']+)["']/gi;
  while ((m = re.exec(MARKUP_ONLY))) optionValues.add(m[1]);
  const generated = /template-select[\s\S]{0,400}?(Object\.(keys|entries)\s*\(\s*TEMPLATES)/.test(SCRIPT_SRC) ||
    /(Object\.(keys|entries)\s*\(\s*TEMPLATES)[\s\S]{0,400}?template-select/.test(SCRIPT_SRC);
  const missing = EXPECTED_TEMPLATES.filter(k => !optionValues.has(k));
  return {
    ok: missing.length === 0 || generated,
    expected: 'every template key reachable from the template picker',
    actual: `no <option value="…"> and no TEMPLATES-driven option generation for: ${missing.join(', ')}`,
  };
});

/* ════════════════════════════════════════════════════════════════════════════
   C. KEPT FUNCTIONS
   ════════════════════════════════════════════════════════════════════════════ */

section('C. KEPT FUNCTIONS — the 16 that must survive');

for (const fn of KEPT_FUNCTIONS) {
  check(`kept function exists:  ${fn}`, 'behav', () => {
    const r = fnPresent(fn);
    return {
      ok: r.ok,
      expected: `typeof ${fn} === "function" after the page script boots`,
      actual: `${fn} is ${typeOf(APP, fn)} (${r.how})`,
    };
  });
}

/* ════════════════════════════════════════════════════════════════════════════
   D. PORTED FUNCTIONS
   ════════════════════════════════════════════════════════════════════════════ */

section('D. PORTED FUNCTIONS — the 3 brought over from promptology.html');

for (const fn of PORTED_FUNCTIONS) {
  check(`ported function exists:  ${fn}`, 'behav', () => {
    const r = fnPresent(fn);
    return {
      ok: r.ok,
      expected: `typeof ${fn} === "function" after the page script boots`,
      actual: `${fn} is ${typeOf(APP, fn)} (${r.how})`,
    };
  });
}

check('copyPrompt / copyRaw actually write to the clipboard', 'behav', () => {
  if (typeOf(APP, 'copyPrompt') !== 'function' && typeOf(APP, 'copyRaw') !== 'function') {
    return { ok: false, expected: 'copyPrompt/copyRaw defined so their behaviour can be exercised', actual: 'neither is defined' };
  }
  const calls = grab(APP, `(()=>{
    const seen=[];
    const orig=navigator.clipboard.writeText;
    navigator.clipboard.writeText=(t)=>{seen.push(String(t));return Promise.resolve();};
    try{ if(typeof copyPrompt==='function') copyPrompt(); }catch(e){ seen.push('THREW:'+e.message); }
    try{ if(typeof copyRaw==='function') copyRaw(); }catch(e){ seen.push('THREW:'+e.message); }
    navigator.clipboard.writeText=orig;
    return JSON.stringify(seen);
  })()`, null);
  let arr = [];
  try { arr = JSON.parse(calls); } catch { arr = null; }
  const threw = Array.isArray(arr) ? arr.filter(x => String(x).startsWith('THREW:')) : [];
  return {
    ok: Array.isArray(arr) && arr.length > 0 && threw.length === 0,
    expected: 'calling copyPrompt()/copyRaw() reaches navigator.clipboard.writeText without throwing',
    actual: arr === null ? 'could not invoke them in the vm context' : `writeText calls: ${arr.length}, errors: ${threw.join('; ')}`,
  };
});

check('updateCharCount runs and reports a character count', 'behav', () => {
  if (typeOf(APP, 'updateCharCount') !== 'function') {
    return { ok: false, expected: 'updateCharCount defined', actual: `updateCharCount is ${typeOf(APP, 'updateCharCount')}` };
  }
  const res = grab(APP, `(()=>{ try{ updateCharCount(); return 'ok'; }catch(e){ return 'THREW:'+e.message; } })()`, 'unavailable');
  return { ok: res === 'ok', expected: 'updateCharCount() executes without throwing', actual: String(res) };
});

/* ════════════════════════════════════════════════════════════════════════════
   E. LOCALSTORAGE MIGRATION  (all behavioural)
   ════════════════════════════════════════════════════════════════════════════ */

section('E. LOCALSTORAGE MIGRATION — ts_pm_items → promptor_items, merged by id');

const mkItem = (id, name, template, extraFields = {}) => ({
  id, name, template, mode: 'prompt', status: 'ready',
  created: 1700000000000, updated: 1700000001000,
  fields: extraFields, files: {}, blocks: [],
});

const LEGACY_THREE = {
  L1: mkItem('L1', 'legacy one', 'ts_signal', { signal: 'legacy signal body' }),
  L2: mkItem('L2', 'legacy two', 'ts_debug', { symptom: 'legacy symptom body' }),
  L3: mkItem('L3', 'legacy three', 'ts_ui', { component: 'legacy component body' }),
};
const EXISTING_THREE = {
  P1: mkItem('P1', 'promptor one', 'pe_general', { role: 'kept role' }),
  P2: mkItem('P2', 'promptor two', 'pe_role', { role: 'kept role two' }),
  P3: mkItem('P3', 'promptor three', 'dev', { env: 'kept env' }),
};

function seed(obj) {
  const m = new Map();
  for (const [k, v] of Object.entries(obj)) m.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  return m;
}

/** Read the app's live item map; fall back to persisted storage if `items` was renamed. */
function itemsOf(app) {
  const raw = grab(app, 'typeof items !== "undefined" ? JSON.stringify(items) : null', null);
  if (typeof raw === 'string') {
    try { return { source: 'runtime `items`', data: JSON.parse(raw) }; } catch { /* fall through */ }
  }
  const ls = app.store.get(CURRENT_KEY);
  if (typeof ls === 'string') {
    try { return { source: `localStorage.${CURRENT_KEY}`, data: JSON.parse(ls) }; } catch { /* fall through */ }
  }
  return { source: 'unreadable', data: {} };
}

const bootNote = (app) => (app.error ? ` [page script threw during boot: ${app.error.name}: ${app.error.message}]` : '');

/* E1 — legacy populated, no promptor_items → everything migrates */
check('E1  ts_pm_items populated, promptor_items absent → all 3 legacy entries migrate', 'behav', () => {
  const app = loadApp(seed({ [LEGACY_KEY]: LEGACY_THREE }));
  const { data, source } = itemsOf(app);
  const ids = Object.keys(data).sort();
  const namesOk = ids.length === 3 && ['L1', 'L2', 'L3'].every(id => data[id] && data[id].name === LEGACY_THREE[id].name);
  return {
    ok: JSON.stringify(ids) === '["L1","L2","L3"]' && namesOk,
    expected: 'items === {L1, L2, L3} carrying the legacy names',
    actual: `${source}: ids=${JSON.stringify(ids)} names=${JSON.stringify(ids.map(i => data[i] && data[i].name))}` + bootNote(app),
  };
});

/* E1b — legacy field content survives the merge (not just the ids) */
check('E1b legacy entry payload survives (fields, template) — a real merge, not a stub', 'behav', () => {
  const app = loadApp(seed({ [LEGACY_KEY]: LEGACY_THREE }));
  const { data } = itemsOf(app);
  const l1 = data.L1;
  return {
    ok: !!l1 && l1.template === 'ts_signal' && l1.fields && l1.fields.signal === 'legacy signal body',
    expected: 'items.L1.template === "ts_signal" and items.L1.fields.signal === "legacy signal body"',
    actual: JSON.stringify(l1 ? { template: l1.template, fields: l1.fields } : l1) + bootNote(app),
  };
});

/* E2 — both populated, disjoint ids → union */
check('E2  both populated with disjoint ids → union of 5, nothing dropped', 'behav', () => {
  const legacyTwo = { L1: LEGACY_THREE.L1, L2: LEGACY_THREE.L2 };
  const app = loadApp(seed({ [LEGACY_KEY]: legacyTwo, [CURRENT_KEY]: EXISTING_THREE }));
  const { data, source } = itemsOf(app);
  const ids = Object.keys(data).sort();
  const expectIds = ['L1', 'L2', 'P1', 'P2', 'P3'];
  const missing = expectIds.filter(i => !ids.includes(i));
  return {
    ok: missing.length === 0 && ids.length === expectIds.length,
    expected: `items ids === ${JSON.stringify(expectIds)}`,
    actual: `${source}: ids=${JSON.stringify(ids)}` + (missing.length ? ` · missing ${missing.join(',')}` : '') + bootNote(app),
  };
});

/* E2b — promptor_items must NOT be overwritten wholesale */
check('E2b existing promptor_items entries are not overwritten wholesale', 'behav', () => {
  const app = loadApp(seed({ [LEGACY_KEY]: LEGACY_THREE, [CURRENT_KEY]: EXISTING_THREE }));
  const { data, source } = itemsOf(app);
  const bad = Object.keys(EXISTING_THREE).filter(id => {
    const got = data[id];
    return !got || got.name !== EXISTING_THREE[id].name || got.template !== EXISTING_THREE[id].template;
  });
  return {
    ok: bad.length === 0,
    expected: 'P1, P2, P3 still present with their original name + template',
    actual: `${source}: damaged/missing → ${bad.length ? bad.join(', ') : 'none'} · present ids=${JSON.stringify(Object.keys(data).sort())}` + bootNote(app),
  };
});

/* E3 — collision: promptor_items wins */
check('E3  colliding id → the promptor_items entry wins', 'behav', () => {
  const legacy = { SHARED: mkItem('SHARED', 'LEGACY VERSION', 'ts_debug', { symptom: 'legacy' }), L1: LEGACY_THREE.L1 };
  const existing = { SHARED: mkItem('SHARED', 'PROMPTOR VERSION', 'pe_role', { role: 'kept' }), P1: EXISTING_THREE.P1 };
  const app = loadApp(seed({ [LEGACY_KEY]: legacy, [CURRENT_KEY]: existing }));
  const { data, source } = itemsOf(app);
  const s = data.SHARED;
  return {
    ok: !!s && s.name === 'PROMPTOR VERSION' && s.template === 'pe_role',
    expected: 'items.SHARED === {name:"PROMPTOR VERSION", template:"pe_role"}',
    actual: `${source}: SHARED=${JSON.stringify(s ? { name: s.name, template: s.template } : s)}` + bootNote(app),
  };
});

/* E4 — idempotent across two loads of the same storage */
check('E4  running the migration twice does not duplicate entries', 'behav', () => {
  const store = seed({
    [LEGACY_KEY]: { ...LEGACY_THREE, SHARED: mkItem('SHARED', 'LEGACY VERSION', 'ts_debug') },
    [CURRENT_KEY]: { ...EXISTING_THREE, SHARED: mkItem('SHARED', 'PROMPTOR VERSION', 'pe_role') },
  });
  const run1 = loadApp(store);          // first page load
  const a = itemsOf(run1);
  const run2 = loadApp(store);          // second page load, same localStorage
  const b = itemsOf(run2);
  const ids1 = Object.keys(a.data).sort();
  const ids2 = Object.keys(b.data).sort();
  const names1 = Object.values(a.data).map(v => v && v.name).sort();
  const names2 = Object.values(b.data).map(v => v && v.name).sort();
  const expectIds = ['L1', 'L2', 'L3', 'P1', 'P2', 'P3', 'SHARED'];
  return {
    ok: JSON.stringify(ids1) === JSON.stringify(expectIds) &&
      JSON.stringify(ids2) === JSON.stringify(ids1) &&
      JSON.stringify(names2) === JSON.stringify(names1),
    expected: `after load #1 and load #2 the id set is identical and equals ${JSON.stringify(expectIds)} (7 entries, no re-keyed copies)`,
    actual: `load#1 (${a.source}) ${ids1.length} ids ${JSON.stringify(ids1)} · load#2 (${b.source}) ${ids2.length} ids ${JSON.stringify(ids2)}` +
      (JSON.stringify(names2) !== JSON.stringify(names1) ? ` · names diverged: ${JSON.stringify(names2)}` : '') +
      bootNote(run1) + bootNote(run2),
  };
});

/* E5 — legacy key must survive */
check(`E5  ${LEGACY_KEY} still present and unmodified after migration`, 'behav', () => {
  const store = seed({ [LEGACY_KEY]: LEGACY_THREE, [CURRENT_KEY]: EXISTING_THREE });
  const before = store.get(LEGACY_KEY);
  const app = loadApp(store);
  const after = app.store.get(LEGACY_KEY);
  let same = false;
  try { same = after != null && JSON.stringify(JSON.parse(after)) === JSON.stringify(JSON.parse(before)); } catch { same = false; }
  return {
    ok: after != null && same,
    expected: `localStorage["${LEGACY_KEY}"] still holds its original 3 entries (migration must not delete or rewrite it)`,
    actual: after == null ? 'key was removed from localStorage' : `key present but content changed: ${String(after).slice(0, 300)}` + bootNote(app),
  };
});

/* E6 — no legacy key: nothing happens, nothing breaks */
check('E6  ts_pm_items absent → promptor_items untouched, no crash', 'behav', () => {
  const app = loadApp(seed({ [CURRENT_KEY]: EXISTING_THREE }));
  const { data, source } = itemsOf(app);
  const ids = Object.keys(data).sort();
  return {
    ok: !app.error && JSON.stringify(ids) === '["P1","P2","P3"]',
    expected: 'items ids === ["P1","P2","P3"] and no boot error',
    actual: `${source}: ids=${JSON.stringify(ids)}` + bootNote(app),
  };
});

/* E7 — migration is not gated on an empty promptor_items */
check('E7  migration still runs when promptor_items already exists (not first-run-only-if-empty)', 'behav', () => {
  const app = loadApp(seed({ [LEGACY_KEY]: LEGACY_THREE, [CURRENT_KEY]: EXISTING_THREE }));
  const { data, source } = itemsOf(app);
  const missingLegacy = ['L1', 'L2', 'L3'].filter(id => !data[id]);
  return {
    ok: missingLegacy.length === 0,
    expected: 'L1, L2, L3 merged in even though promptor_items was non-empty',
    actual: `${source}: legacy ids missing → ${missingLegacy.join(', ') || 'none'} · ids=${JSON.stringify(Object.keys(data).sort())}` + bootNote(app),
  };
});

/* ════════════════════════════════════════════════════════════════════════════
   SUMMARY
   ════════════════════════════════════════════════════════════════════════════ */

section('SUMMARY');

const bySection = new Map();
for (const r of results) {
  if (!bySection.has(r.section)) bySection.set(r.section, { pass: 0, fail: 0 });
  bySection.get(r.section)[r.ok ? 'pass' : 'fail']++;
}
for (const [name, s] of bySection) {
  const tag = String(name).split('.')[0].slice(0, 6).padEnd(6);
  say(`${s.fail === 0 ? 'ok  ' : 'FAIL'}  ${tag}  ${s.pass}/${s.pass + s.fail} passed${s.fail ? `  (${s.fail} failing)` : ''}`);
}
const passed = results.filter(r => r.ok).length;
const failed = results.length - passed;
say('');
say(`TOTAL ${passed}/${results.length} passed, ${failed} failed`);
if (failed) {
  say('');
  say('failing checks:');
  for (const r of results.filter(x => !x.ok)) say(`  · [${r.section.split('.')[0]}] ${r.name}`);
}
say('');

process.stdout.write(lines.join('\n') + '\n');
process.exitCode = failed ? 1 : 0;
