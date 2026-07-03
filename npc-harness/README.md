# dnd-campaign-api

A D&D-lite NPC dialogue harness for testing agentic NPCs: relationship
state, full stat blocks, DC-tiered skill checks, mood-driven intro
portraits, and state-triggered objectives (quest/info/recruit/trade/combat).

This is a **prototyping harness**, not a finished game. It's built to let
a DM/designer iterate quickly on NPC persona, core values, and mechanics
before wiring it into a real game client.

## How it's structured

- `src/App.jsx` — the harness UI (React). All game logic — dice rolls, DC
  math, delta clamping, objective evaluation — runs here in plain JS, not
  via the LLM, so it's deterministic and testable.
- `server/index.js` — a small Express proxy. The frontend never talks to
  Anthropic directly; it POSTs to `/api/claude`, and the server attaches
  the real API key and forwards the request. This is required — an API key
  can't safely live in browser code. It also exposes the session/NPC/PC
  persistence routes (see below).
- `server/store.js` — file-based storage for NPC/PC definitions and runtime
  state, with key validation to prevent path traversal via a malicious
  `npcId`/`pcId`.
- Portraits use a free, keyless image endpoint (Pollinations) called
  directly from the browser, since it needs no secret. Swap
  `buildPortraitUrl()` in `App.jsx` for a real provider (Fal.ai, Atlas
  Cloud, etc.) through the backend when you're ready for production-grade
  images — see the note in that function.

## Persistence

NPCs and PCs are addressed by a unique id (a filename slug) and split into
two layers:

- **Definitions** (`server/data/npcs/<id>.json`, `server/data/pcs/<id>.json`)
  — persona, core values, appearance, stat block, starting inventory. These
  are the "resource files" — author them by hand, or generate them with
  another tool and drop them in. Tracked in git.
- **Runtime state** (`server/data/state/`) — relationship sliders, current
  inventory, portrait cache, and objective status. Written by the dialogue
  engine after every conversation turn. **Not** tracked in git (see
  `.gitignore`) since it's generated, not authored.

Relationship state and conversation history are keyed by the **NPC+PC pair**
(`state/relationship/<npcId>__<pcId>.json`), not by NPC alone — so the same
NPC can be at a different relationship stage with each PC that talks to
them. NPC inventory and the portrait cache are keyed by NPC alone, since
those are facts about the NPC regardless of who's talking to them.

**Starting a session**: link directly with `?npc=<id>&pc=<id>` in the URL —
that's the intended way another tool embeds a specific pairing. Without
those params, a picker screen lists whatever's in `server/data/npcs/` and
`server/data/pcs/`.

**Portraits**: generated once, on an NPC's first-ever encounter, then
cached and reused forever — never regenerated automatically on later visits.
The "regenerate art" button is a manual override and persists its result as
the new cached image.

**Editing a definition** (persona, values, sheet, objective definitions)
in the UI doesn't save automatically — that's authoring, not play. Use the
"💾 save definitions" button in the top bar. Play state (relationship,
inventory, history) autosaves continuously as you play, debounced to avoid
flooding the network while dragging a slider.

**Important caveat**: local disk on Fly is not guaranteed to survive a
`fly deploy` (it usually survives a machine simply idling/restarting, but
not a redeploy). For durability across deploys, mount a
[Fly Volume](https://fly.io/docs/volumes/overview/) and point `DATA_DIR` at
it (see `.env.example`) — no code changes needed, just infra.



```bash
npm install
cp .env.example .env   # then add your real ANTHROPIC_API_KEY
npm run dev             # runs the backend (:8080) and Vite dev server (:5173) together
```

Open the Vite URL it prints (usually `http://localhost:5173`). The dev
server proxies `/api/*` to the backend automatically (see `vite.config.js`).

## Production build

```bash
npm run build   # builds the frontend into dist/
npm run start   # serves dist/ and the API from one Express process
```

## Deploying to Fly.io

```bash
fly launch --no-deploy   # first time only, if the app isn't created yet — say yes to using the existing fly.toml
fly secrets set ANTHROPIC_API_KEY=sk-ant-...
fly deploy
```

`fly.toml` is set to scale to zero when idle (`min_machines_running = 0`),
which keeps cost near-zero for low/occasional traffic — the tradeoff is a
cold-start delay on the first request after idle.

## Known scope limits (by design, for now)

- Combat is a trigger banner only ("⚔ Combat Initiated"), not a full
  initiative/turn system.
- Objective conditions only evaluate relationship-state thresholds
  (trust/patience/suspicion/respect). Narrative-condition objectives
  ("player asked about X") aren't implemented yet.
- HP/AC/Speed on character sheets are reference fields only — not wired
  into any check yet.
- No auth — anyone with the URL (and the right `?npc=&pc=` ids) can read
  and write that session's state. Fine for prototyping/a private table, not
  for anything public-facing.
- File-based storage has no locking — two simultaneous writers to the same
  NPC+PC pair (e.g. two browser tabs open on the same session) can race and
  one write can clobber the other. Fine for one DM, not for concurrent
  editors. A real DB is the fix if that ever matters.
- Conversation history is persisted as a capped raw log (last 60 entries),
  not summarized — a very long relationship will eventually lose its
  earliest turns rather than compressing them into a summary. Good enough
  for now; a periodic summarization pass would be the next iteration.
- The simple in-memory rate limiter in `server/index.js` resets on
  restart and won't work across multiple server instances — replace it
  before you have real concurrent traffic.
