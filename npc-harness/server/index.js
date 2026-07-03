import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import * as store from "./store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json({ limit: "2mb" }));

// simple in-memory rate limit per IP — swap for something durable before
// you have real multi-user traffic, this just stops accidental hammering
const hits = new Map();
const RATE_LIMIT = 60; // requests per minute
app.use((req, res, next) => {
  const now = Date.now();
  const windowStart = now - 60_000;
  const key = req.ip;
  const arr = (hits.get(key) || []).filter((t) => t > windowStart);
  arr.push(now);
  hits.set(key, arr);
  if (arr.length > RATE_LIMIT) return res.status(429).json({ error: "Rate limit exceeded" });
  next();
});

app.post("/api/claude", async (req, res) => {
  const { system, message } = req.body || {};
  if (!system || !message) return res.status(400).json({ error: "system and message are required" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY is not set on the server" });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
        max_tokens: 1000,
        system,
        messages: [{ role: "user", content: message }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      return res.status(502).json({ error: "Upstream model call failed" });
    }

    const data = await response.json();
    const textBlock = (data.content || []).find((b) => b.type === "text");
    res.json({ text: textBlock ? textBlock.text : "" });
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: "Proxy request failed" });
  }
});

// ---- NPC / PC directory ----

app.get("/api/npcs", async (req, res) => {
  try {
    res.json(await store.listNpcDefs());
  } catch (err) {
    console.error("List NPCs error:", err);
    res.status(500).json({ error: "Failed to list NPCs" });
  }
});

app.get("/api/pcs", async (req, res) => {
  try {
    res.json(await store.listPcDefs());
  } catch (err) {
    console.error("List PCs error:", err);
    res.status(500).json({ error: "Failed to list PCs" });
  }
});

// ---- Combined session: NPC def + NPC state + relationship (this pair) + PC def + PC state ----

app.get("/api/session/:npcId/:pcId", async (req, res) => {
  const { npcId, pcId } = req.params;
  try {
    const [npcDef, npcState, pcDef, pcState, relState] = await Promise.all([
      store.readNpcDef(npcId),
      store.readNpcState(npcId),
      store.readPcDef(pcId),
      store.readPcState(pcId),
      store.readRelState(npcId, pcId),
    ]);

    if (!npcDef) return res.status(404).json({ error: `No NPC found for id "${npcId}"` });
    if (!pcDef) return res.status(404).json({ error: `No PC found for id "${pcId}"` });

    // NPC inventory/gold: use persisted runtime state if this NPC has been
    // touched before, otherwise fall back to the definition's starting values.
    const npcInventory = npcState.inventory !== null ? npcState.inventory : npcDef.inventory;
    const npcGold = npcState.gold !== null ? npcState.gold : (npcDef.startingGold ?? 0);
    const pcInventory = pcState.inventory !== null ? pcState.inventory : [];
    const pcGold = pcState.gold !== null ? pcState.gold : (pcDef.startingGold ?? 0);
    const playerModel = pcState.playerModel || { honesty: 50, aggression: 50, curiosity: 50, generosity: 50 };
    const relationship = relState.relationship || { trust: 50, patience: 50, suspicion: 50, respect: 50 };

    // Objective definitions live on the NPC (authored once); status is per
    // NPC+PC pair, so the same NPC can be at a different stage with each PC.
    const objectives = (npcDef.objectives || []).map((def) => ({
      ...def,
      status: relState.objectiveStatus?.[def.id] || "active",
    }));

    res.json({
      npcId,
      pcId,
      npc: {
        name: npcDef.name,
        persona: npcDef.persona,
        coreValues: npcDef.coreValues,
        appearance: npcDef.appearance,
        sheet: npcDef.sheet,
        inventory: npcInventory,
        gold: npcGold,
        portraitUrl: npcState.portraitUrl,
        moodLabel: npcState.moodLabel,
        visualMood: npcState.visualMood,
        encountered: npcState.encountered,
      },
      pc: {
        name: pcDef.name,
        sheet: pcDef.sheet,
        playerModel,
        inventory: pcInventory,
        gold: pcGold,
      },
      relationship,
      objectives,
      history: relState.history || [],
    });
  } catch (err) {
    console.error("Load session error:", err);
    res.status(err.status || 500).json({ error: err.message || "Failed to load session" });
  }
});

app.post("/api/session/:npcId/:pcId", async (req, res) => {
  const { npcId, pcId } = req.params;
  const body = req.body || {};
  try {
    const writes = [];

    if (body.npc) {
      const prevNpcState = await store.readNpcState(npcId);
      writes.push(
        store.writeNpcState(npcId, {
          ...prevNpcState,
          inventory: body.npc.inventory ?? prevNpcState.inventory,
          gold: body.npc.gold ?? prevNpcState.gold,
          portraitUrl: body.npc.portraitUrl ?? prevNpcState.portraitUrl,
          moodLabel: body.npc.moodLabel ?? prevNpcState.moodLabel,
          visualMood: body.npc.visualMood ?? prevNpcState.visualMood,
          encountered: body.npc.encountered ?? prevNpcState.encountered,
        })
      );
    }

    if (body.pc) {
      const prevPcState = await store.readPcState(pcId);
      writes.push(
        store.writePcState(pcId, {
          ...prevPcState,
          playerModel: body.pc.playerModel ?? prevPcState.playerModel,
          inventory: body.pc.inventory ?? prevPcState.inventory,
          gold: body.pc.gold ?? prevPcState.gold,
        })
      );
    }

    if (body.relationship || body.history || body.objectiveStatus) {
      const prevRel = await store.readRelState(npcId, pcId);
      writes.push(
        store.writeRelState(npcId, pcId, {
          relationship: body.relationship ?? prevRel.relationship,
          objectiveStatus: { ...prevRel.objectiveStatus, ...(body.objectiveStatus || {}) },
          history: store.capHistory(body.history ?? prevRel.history),
        })
      );
    }

    await Promise.all(writes);
    res.json({ ok: true });
  } catch (err) {
    console.error("Save session error:", err);
    res.status(err.status || 500).json({ error: err.message || "Failed to save session" });
  }
});

// ---- Definition editing (persona/sheet/objectives/inventory authoring) ----

app.put("/api/npcs/:npcId", async (req, res) => {
  try {
    await store.writeNpcDef(req.params.npcId, req.body);
    res.json({ ok: true });
  } catch (err) {
    console.error("Save NPC def error:", err);
    res.status(err.status || 500).json({ error: err.message || "Failed to save NPC definition" });
  }
});

app.put("/api/pcs/:pcId", async (req, res) => {
  try {
    await store.writePcDef(req.params.pcId, req.body);
    res.json({ ok: true });
  } catch (err) {
    console.error("Save PC def error:", err);
    res.status(err.status || 500).json({ error: err.message || "Failed to save PC definition" });
  }
});

app.get("/healthz", (req, res) => res.send("ok"));

// serve the built frontend
const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));
app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));

export default app;

// Only actually bind a port when this file is run directly (node server/index.js
// or npm run start/dev:server) — not when imported by tests.
const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const port = process.env.PORT || 8080;
  app.listen(port, () => console.log(`Server listening on port ${port}`));
}
