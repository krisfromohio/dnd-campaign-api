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
  can't safely live in browser code.
- Portraits use a free, keyless image endpoint (Pollinations) called
  directly from the browser, since it needs no secret. Swap
  `buildPortraitUrl()` in `App.jsx` for a real provider (Fal.ai, Atlas
  Cloud, etc.) through the backend when you're ready for production-grade
  images — see the note in that function.

## Local development

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
- No auth/session/multi-campaign persistence — state lives in React state
  and resets on page reload. Fine for prototyping, not for real play.
- The simple in-memory rate limiter in `server/index.js` resets on
  restart and won't work across multiple server instances — replace it
  before you have real concurrent traffic.
