#!/usr/bin/env node
// prompTOR bridge — one shared `claude` session, piped to both the terminal and the GUI.
//
//   node bridge.js                  # defaults: sonnet / medium, port 8765
//   PORT=9000 PROMPTOR_MODEL=opus PROMPTOR_EFFORT=high node bridge.js
//
// Spawns ONE persistent `claude` in stream-json mode (OAuth, never --bare) and acts as a
// multiplexer: terminal keystrokes AND the GUI's POST /send both become user turns on that one
// session's stdin; every assistant/result event is broadcast to the terminal AND to the GUI over
// SSE. No per-turn child processes. Pure node, no dependencies.

const http = require('http');
const { spawn } = require('child_process');
const readline = require('readline');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '8765', 10);
const TOKEN = crypto.randomUUID();
const MODELS = ['sonnet', 'opus', 'fable'];
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];
const APPEND_SYS =
  'You are the engine behind prompTOR. When asked to optimize a draft, use the /promptor skill ' +
  'and its brain in .claude/skills/promptor/. When handed an optimized prompt, run it as a fresh ' +
  'task and ignore the optimization discussion above it.';

const state = { model: 'sonnet', effort: 'medium', sessionId: null, lastInit: null, lastCost: 0 };
const sseClients = new Set();
let engine = null;

// ── serve promptor.html with the per-launch token injected (same-origin ⇒ no file:// CORS) ──
const HTML_PATH = path.join(__dirname, 'promptor.html');
function indexHtml() {
  const raw = fs.readFileSync(HTML_PATH, 'utf8');
  const inject = `<script>window.__PROMPTOR_TOKEN__=${JSON.stringify(TOKEN)};window.__PROMPTOR_PORT__=${PORT};</script>`;
  return raw.includes('</head>') ? raw.replace('</head>', inject + '</head>') : inject + raw;
}

// ── the single engine ──
function spawnEngine(model, effort) {
  const args = [
    '-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose',
    '--model', model, '--effort', effort,
    '--allowedTools', 'Read', 'Grep', 'Glob',
    '--permission-mode', 'default',
    '--append-system-prompt', APPEND_SYS,
  ];
  const child = spawn('claude', args, { cwd: __dirname, stdio: ['pipe', 'pipe', 'pipe'] });
  readline.createInterface({ input: child.stdout }).on('line', onEngineLine);
  child.stderr.on('data', (d) => process.stderr.write(`\x1b[90m[engine] ${d}\x1b[0m`));
  child.on('exit', (code) => {
    console.log(`\x1b[33m[bridge] engine exited (code ${code})\x1b[0m`);
    broadcast({ type: 'system', subtype: 'engine_exit', code });
  });
  return child;
}

function restart(model, effort) {
  state.model = model; state.effort = effort; state.sessionId = null; state.lastInit = null;
  if (engine) { try { engine.kill(); } catch (_) {} }
  console.log(`\x1b[90m[bridge] starting engine — model ${model}, effort ${effort}\x1b[0m`);
  engine = spawnEngine(model, effort);
}

function sendTurn(text) {
  if (!engine || !engine.stdin.writable) return false;
  engine.stdin.write(JSON.stringify({ type: 'user', message: { role: 'user', content: String(text) } }) + '\n');
  console.log(`\n\x1b[35m⟐ you:\x1b[0m ${String(text).split('\n')[0].slice(0, 200)}`);
  return true;
}

function onEngineLine(line) {
  line = line.trim();
  if (!line) return;
  let evt;
  try { evt = JSON.parse(line); } catch (_) { return; } // tolerate non-JSON noise
  if (evt.type === 'system' && evt.subtype === 'init') {
    state.sessionId = evt.session_id; state.model = evt.model || state.model; state.lastInit = evt;
    console.log(`\x1b[32m[bridge] session ${evt.session_id} · model ${evt.model}\x1b[0m`);
  } else if (evt.type === 'assistant' && evt.message && Array.isArray(evt.message.content)) {
    const txt = evt.message.content.filter((c) => c.type === 'text').map((c) => c.text).join('');
    if (txt) console.log(`\n\x1b[36m⟐ assistant:\x1b[0m ${txt}\n`);
  } else if (evt.type === 'result') {
    state.lastCost = evt.total_cost_usd || 0;
    console.log(`\x1b[90m[result] ${evt.subtype} · $${(evt.total_cost_usd || 0).toFixed(4)} · ${evt.num_turns} turn(s)\x1b[0m`);
  }
  broadcast(evt);
}

function broadcast(evt) {
  const payload = `data: ${JSON.stringify(evt)}\n\n`;
  for (const res of sseClients) { try { res.write(payload); } catch (_) {} }
}

// ── guards ──
function originOk(req) {
  const o = req.headers.origin;
  return !o || o === `http://127.0.0.1:${PORT}` || o === `http://localhost:${PORT}`;
}
const tokenHeaderOk = (req) => req.headers['x-promptor-token'] === TOKEN;

function readBody(req) {
  return new Promise((resolve) => {
    let b = '';
    req.on('data', (c) => { b += c; if (b.length > 2e6) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(b || '{}')); } catch (_) { resolve(null); } });
  });
}

// ── HTTP server (127.0.0.1 only) ──
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const send = (code, type, body) => { res.writeHead(code, { 'Content-Type': type }); res.end(body); };
  const json = (code, obj) => send(code, 'application/json', JSON.stringify(obj));

  if (req.method === 'GET' && url.pathname === '/') {
    return send(200, 'text/html; charset=utf-8', indexHtml());
  }
  if (req.method === 'GET' && url.pathname === '/health') {
    return json(200, { ok: true, model: state.model, effort: state.effort, session_id: state.sessionId, engine_up: !!engine && !engine.killed });
  }
  if (req.method === 'GET' && url.pathname === '/stream') {
    if (url.searchParams.get('t') !== TOKEN || !originOk(req)) return json(403, { error: 'forbidden' });
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(': connected\n\n');
    if (state.lastInit) res.write(`data: ${JSON.stringify(state.lastInit)}\n\n`); // replay for late joiners
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }
  if (req.method === 'POST' && url.pathname === '/send') {
    if (!tokenHeaderOk(req) || !originOk(req)) return json(403, { error: 'forbidden' });
    const body = await readBody(req);
    if (!body || typeof body.text !== 'string' || !body.text.trim()) return json(400, { error: 'text required' });
    return sendTurn(body.text) ? json(202, { ok: true }) : json(503, { error: 'engine not ready' });
  }
  if (req.method === 'POST' && url.pathname === '/restart') {
    if (!tokenHeaderOk(req) || !originOk(req)) return json(403, { error: 'forbidden' });
    const body = await readBody(req) || {};
    const model = MODELS.includes(body.model) ? body.model : state.model;
    const effort = EFFORTS.includes(body.effort) ? body.effort : state.effort;
    restart(model, effort);
    return json(200, { ok: true, model, effort });
  }
  return json(404, { error: 'not found' });
});

// ── terminal multiplex: typed lines become user turns too (the "side by side" half) ──
readline.createInterface({ input: process.stdin }).on('line', (line) => {
  if (line.trim()) sendTurn(line);
});

restart(process.env.PROMPTOR_MODEL || 'sonnet', process.env.PROMPTOR_EFFORT || 'medium');
server.listen(PORT, '127.0.0.1', () => {
  console.log(`\x1b[1mprompTOR\x1b[0m → http://127.0.0.1:${PORT}/?t=${TOKEN}`);
  console.log('\x1b[90m(open that URL; or just type here — both drive the same session)\x1b[0m');
});

process.on('SIGINT', () => { if (engine) try { engine.kill(); } catch (_) {} ; process.exit(0); });
