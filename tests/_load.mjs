import fs from 'node:fs';

export function makeLocalStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    clear: () => m.clear(),
  };
}

// Runs src files in THIS realm with `window` and `localStorage` injected as
// parameters. Deliberately not node:vm — a vm context is a separate realm, so
// objects it builds have different prototypes and deepStrictEqual rejects them.
// Each call gets a fresh window and localStorage, so tests never leak state.
export function load(...files) {
  const localStorage = makeLocalStorage();
  const window = {};
  for (const f of files) {
    const src = fs.readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');
    new Function('window', 'localStorage', src)(window, localStorage);
  }
  return { PT: window.PT, localStorage };
}
