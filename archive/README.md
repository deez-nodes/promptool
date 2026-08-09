# archive/

Code that is no longer part of the shipped tool, kept because the idea is worth
returning to.

## bridge.js

A zero-dependency Node HTTP server that put prompTOR in front of a **single, long-lived
`claude` session**.

It spawned one persistent `claude` process in `stream-json` mode and multiplexed it:
terminal keystrokes and the browser's `POST /send` both became user turns on the *same*
session stdin, and every assistant/result event was fanned back out to both the terminal
and the browser over Server-Sent Events (`GET /stream`). It served `promptor.html` itself
so the page was same-origin, injecting a per-launch `window.__PROMPTOR_TOKEN__` that every
request had to echo back in an `x-promptor-token` header. `POST /restart` swapped the
engine's model/effort without losing the page.

Endpoints: `/health`, `/send`, `/stream`, `/restart`.

### Why it was removed

Not because it was wrong — because it **cannot run where the tool is hosted**.

prompTOR ships as a single static HTML file with no build step and no server. The bridge
needs a local Node process, a spawnable `claude` binary, and a same-origin HTTP origin.
None of those exist for someone who opens `promptor.html` from a file path or from static
hosting. Keeping the client half in the shipped file meant the page carried `fetch()` calls,
an `EventSource`, a token global, and a row of permanently disabled Optimize / Run / model /
effort controls that could never light up for the overwhelming majority of users — dead UI
advertising a capability that was not there.

So the client half was stripped from `promptor.html` and the server half was moved here.

### Why it was kept

The session-multiplexing design is sound. One engine process shared by a terminal and a GUI,
events broadcast to both, no per-turn child processes — that is the right shape for this
problem, and it is genuinely dependency-free.

If it returns, it should return as a **separate, optional local companion tool** that drives
prompTOR from the outside, not as something baked into the shipped page. The static file
must stay pure static with zero network calls; anything live belongs in a process the user
explicitly chooses to start.

### If you resurrect it

`bridge.js` still expects to serve `promptor.html` from its own directory and to inject
`window.__PROMPTOR_TOKEN__` into it. That client-side contract no longer exists in
`promptor.html`. Reviving the bridge means rebuilding the client half — ideally as a
separate page or an opt-in module — rather than reintroducing network calls into the
shipped editor.
