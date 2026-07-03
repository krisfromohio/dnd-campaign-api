import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import * as store from "./store.js";

describe("assertValidKey", () => {
  it("accepts simple alphanumeric slugs", () => {
    expect(store.assertValidKey("marta")).toBe("marta");
    expect(store.assertValidKey("npc_01-b")).toBe("npc_01-b");
  });
  it("rejects path traversal attempts", () => {
    expect(() => store.assertValidKey("../../etc/passwd")).toThrow();
    expect(() => store.assertValidKey("..")).toThrow();
  });
  it("rejects path separators", () => {
    expect(() => store.assertValidKey("a/b")).toThrow();
    expect(() => store.assertValidKey("a\\b")).toThrow();
  });
  it("rejects empty or non-string input", () => {
    expect(() => store.assertValidKey("")).toThrow();
    expect(() => store.assertValidKey(undefined)).toThrow();
    expect(() => store.assertValidKey(null)).toThrow();
  });
  it("rejects keys over 64 chars", () => {
    expect(() => store.assertValidKey("a".repeat(65))).toThrow();
  });
});

describe("capHistory", () => {
  it("leaves a short history untouched", () => {
    const h = [{ text: "a" }, { text: "b" }];
    expect(store.capHistory(h, 10)).toEqual(h);
  });
  it("keeps only the most recent entries when over the cap", () => {
    const h = Array.from({ length: 5 }, (_, i) => ({ text: String(i) }));
    const capped = store.capHistory(h, 3);
    expect(capped).toEqual([{ text: "2" }, { text: "3" }, { text: "4" }]);
  });
  it("handles null/undefined input", () => {
    expect(store.capHistory(null)).toEqual([]);
    expect(store.capHistory(undefined)).toEqual([]);
  });
});

// ---- Real filesystem I/O, isolated to a temp DATA_DIR per test ----
describe("store I/O", () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "npc-store-test-"));
    process.env.DATA_DIR = tmpDir;
  });

  afterEach(async () => {
    delete process.env.DATA_DIR;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("readNpcDef returns null when no definition file exists yet", async () => {
    expect(await store.readNpcDef("nobody")).toBeNull();
  });

  it("writeNpcDef then readNpcDef round-trips the data", async () => {
    await store.writeNpcDef("marta", { name: "Old Marta", persona: "Gruff sailor." });
    const def = await store.readNpcDef("marta");
    expect(def.name).toBe("Old Marta");
    expect(def.persona).toBe("Gruff sailor.");
  });

  it("writeNpcDef always forces id to match the key, even if the body disagrees", async () => {
    await store.writeNpcDef("marta", { id: "someone-else", name: "Old Marta" });
    const def = await store.readNpcDef("marta");
    expect(def.id).toBe("marta");
  });

  it("writeNpcDef rejects an unsafe key before touching the filesystem", async () => {
    await expect(store.writeNpcDef("../escape", { name: "x" })).rejects.toThrow();
  });

  it("readNpcState returns sensible defaults (not encountered) before any write", async () => {
    const state = await store.readNpcState("marta");
    expect(state.encountered).toBe(false);
    expect(state.portraitUrl).toBeNull();
  });

  it("writeNpcState then readNpcState round-trips, including a cached portrait", async () => {
    await store.writeNpcState("marta", { inventory: [], gold: 40, portraitUrl: "https://example.com/x.png", moodLabel: "guarded", visualMood: "narrowed eyes", encountered: true });
    const state = await store.readNpcState("marta");
    expect(state.encountered).toBe(true);
    expect(state.portraitUrl).toBe("https://example.com/x.png");
    expect(state.gold).toBe(40);
  });

  it("readPcState defaults playerModel/inventory/gold to null before any write", async () => {
    const state = await store.readPcState("hero");
    expect(state.playerModel).toBeNull();
    expect(state.inventory).toBeNull();
    expect(state.gold).toBeNull();
  });

  it("readRelState defaults to a fresh, empty relationship record", async () => {
    const rel = await store.readRelState("marta", "hero");
    expect(rel.relationship).toBeNull();
    expect(rel.history).toEqual([]);
    expect(rel.objectiveStatus).toEqual({});
  });

  it("writeRelState then readRelState round-trips relationship and history", async () => {
    await store.writeRelState("marta", "hero", {
      relationship: { trust: 62, patience: 50, suspicion: 30, respect: 55 },
      objectiveStatus: { "earn-logbook": "complete" },
      history: [{ role: "player", text: "hi" }, { role: "npc", text: "hello" }],
    });
    const rel = await store.readRelState("marta", "hero");
    expect(rel.relationship.trust).toBe(62);
    expect(rel.objectiveStatus["earn-logbook"]).toBe("complete");
    expect(rel.history).toHaveLength(2);
  });

  it("writeRelState stamps an updatedAt timestamp automatically", async () => {
    await store.writeRelState("marta", "hero", { relationship: { trust: 50, patience: 50, suspicion: 50, respect: 50 }, objectiveStatus: {}, history: [] });
    const rel = await store.readRelState("marta", "hero");
    expect(rel.updatedAt).toBeTruthy();
    expect(new Date(rel.updatedAt).toString()).not.toBe("Invalid Date");
  });

  it("supports multiple PCs against the same NPC as independent relationship records", async () => {
    await store.writeRelState("marta", "alice", { relationship: { trust: 90, patience: 50, suspicion: 10, respect: 80 }, objectiveStatus: {}, history: [] });
    await store.writeRelState("marta", "bob", { relationship: { trust: 5, patience: 50, suspicion: 90, respect: 10 }, objectiveStatus: {}, history: [] });

    const alice = await store.readRelState("marta", "alice");
    const bob = await store.readRelState("marta", "bob");
    expect(alice.relationship.trust).toBe(90);
    expect(bob.relationship.trust).toBe(5);
    // confirm they're genuinely separate files, not aliasing the same record
    expect(alice.relationship.trust).not.toBe(bob.relationship.trust);
  });

  it("NPC inventory/portrait state is shared across PCs (not per-pair)", async () => {
    await store.writeNpcState("marta", { inventory: [{ id: "compass", name: "Brass compass", value: 25, qty: 1 }], gold: 40, portraitUrl: "https://example.com/x.png", moodLabel: null, visualMood: null, encountered: true });
    // Two different PCs read the same NPC-level state
    const viaAlice = await store.readNpcState("marta");
    const viaBob = await store.readNpcState("marta");
    expect(viaAlice.inventory).toEqual(viaBob.inventory);
    expect(viaAlice.portraitUrl).toBe(viaBob.portraitUrl);
  });

  it("listNpcDefs returns every seeded NPC as {id, name}", async () => {
    await store.writeNpcDef("marta", { name: "Old Marta" });
    await store.writeNpcDef("finn", { name: "Finn the Fence" });
    const list = await store.listNpcDefs();
    const ids = list.map((n) => n.id).sort();
    expect(ids).toEqual(["finn", "marta"]);
  });

  it("listNpcDefs returns an empty array, not an error, when no NPCs exist yet", async () => {
    expect(await store.listNpcDefs()).toEqual([]);
  });

  it("readPcDef and readNpcDef are independent — a PC id never collides with an NPC id", async () => {
    await store.writeNpcDef("shared-name", { name: "NPC version" });
    await store.writePcDef("shared-name", { name: "PC version" });
    const npc = await store.readNpcDef("shared-name");
    const pc = await store.readPcDef("shared-name");
    expect(npc.name).toBe("NPC version");
    expect(pc.name).toBe("PC version");
  });
});

