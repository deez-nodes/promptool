# Bundled fonts

All three families are licensed under the **SIL Open Font License 1.1**, which
permits bundling and redistribution with this page. Full text:
https://openfontlicense.org

| File | Family | Weight | Upstream |
|---|---|---|---|
| `orbitron-700.woff2` | Orbitron | 700 | https://fonts.google.com/specimen/Orbitron |
| `orbitron-900.woff2` | Orbitron | 900 | " |
| `rajdhani-600.woff2` | Rajdhani | 600 | https://fonts.google.com/specimen/Rajdhani |
| `rajdhani-700.woff2` | Rajdhani | 700 | " |
| `jetbrains-mono-400.woff2` | JetBrains Mono | 400 | https://fonts.google.com/specimen/JetBrains+Mono |
| `jetbrains-mono-700.woff2` | JetBrains Mono | 700 | " |

Latin subsets, fetched from the Fontsource mirror
(`cdn.jsdelivr.net/npm/@fontsource/...`), 100 KB total.

## Why only six weights

The previous CDN link requested ten: Orbitron 500/700/900, JetBrains Mono
300/400/500/700, Rajdhani 500/600/700. Auditing every `font-family` and
`font-weight` declaration in `index.html` showed four were referenced nowhere —
Orbitron 500, Rajdhani 500, JetBrains Mono 300 and 500 — so they are not
shipped.

Both bold weights are load-bearing and easy to miss: `<b>` inside `#logo`
resolves to Orbitron 700, and `<b>` inside the vim HUD strings resolves to
JetBrains Mono 700. Dropping either silently degrades to a synthesised bold.

## Adding a weight

Add the `@font-face` block in `index.html`, drop the `.woff2` here, and add a
row above. Do not reintroduce the CDN link — `checks/check.mjs` asserts that no
external resource is referenced, and that assertion exists because the original
"pure static" claim shipped with a live Google Fonts request in it.
