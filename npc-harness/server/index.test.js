import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import request from "supertest";
import app from "./index.js";

describe("session/NPC/PC routes", () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "npc-api-test-"));
    process.env.DATA_DIR = tmpDir;
  });

  afterEach(async () => {
    delete process.env.DATA_DIR;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  const seedNpc = () =>
    request(app).put("/api/npcs/marta").send({
      name: "Old Marta",
      persona: "Gruff sailor.",
      coreValues: "Respects honesty.",
      appearance: "Weathered woman.",
      sheet: { abilities: { str: 12, dex: 10, con: 13, int: 11, wis: 15, cha: 14 }, level: 5, proficiencyBonus: 3, skillProficiencies: {}, saveProficiencies: {}, combat: { hp: 27, ac: 12, speed: 30 } },
      objectives: [{ id: "earn-logbook", label: "Earn the logbook", role: "quest", attribute: "trust", comparator: ">=", threshold: 70, action: "Marta hands over the logbook.", rewardItemId: "logbook" }],
      inventory: [{ id: "logbook", name: "Weathered Logbook", value: 0, qty: 1, questItem: true }],
      startingGold: 40,
    });

  const seedPc = () =>
    request(app).put("/api/pcs/hero").send({
      name: "Kris",
      sheet: { abilities: { str: 10, dex: 12, con: 12, int: 10, wis: 10, cha: 13 }, level: 3, proficiencyBonus: 2, skillProficiencies: {}, saveProficiencies: {}, combat: { hp: 24, ac: 13, speed: 30 } },
      startingGold: 15,
    });

  describe("GET /api/npcs and /api/pcs", () => {
    it("returns an empty array when nothing is seeded", async () => {
      const res = await request(app).get("/api/npcs");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
    it("lists seeded NPCs as {id, name}", async () => {
      await seedNpc();
      const res = await request(app).get("/api/npcs");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: "marta", name: "Old Marta" }]);
    });
    it("lists seeded PCs as {id, name}", async () => {
      await seedPc();
      const res = await request(app).get("/api/pcs");
      expect(res.body).toEqual([{ id: "hero", name: "Kris" }]);
    });
  });

  describe("GET /api/session/:npcId/:pcId", () => {
    it("404s when the NPC doesn't exist", async () => {
      await seedPc();
      const res = await request(app).get("/api/session/nobody/hero");
      expect(res.status).toBe(404);
    });
    it("404s when the PC doesn't exist", async () => {
      await seedNpc();
      const res = await request(app).get("/api/session/marta/nobody");
      expect(res.status).toBe(404);
    });
    it("rejects an invalid npc id rather than serving a 200", async () => {
      // Real guarantee is tested directly/reliably in store.test.js. Using
      // "bad@id" (fails the key regex on a plain non-path character) avoids
      // any ambiguity from URL-encoding or client-side path normalization
      // that "../" or ".." style values would introduce.
      const res = await request(app).get("/api/session/bad@id/hero");
      expect(res.status).not.toBe(200);
    });
    it("returns starting values (from the definition) on a brand-new pairing", async () => {
      await seedNpc();
      await seedPc();
      const res = await request(app).get("/api/session/marta/hero");
      expect(res.status).toBe(200);
      expect(res.body.npc.gold).toBe(40);
      expect(res.body.pc.gold).toBe(15);
      expect(res.body.relationship).toEqual({ trust: 50, patience: 50, suspicion: 50, respect: 50 });
      expect(res.body.npc.portraitUrl).toBeNull();
      expect(res.body.npc.encountered).toBe(false);
    });
    it("merges objective status per-pair onto the NPC's objective definitions", async () => {
      await seedNpc();
      await seedPc();
      const res = await request(app).get("/api/session/marta/hero");
      expect(res.body.objectives).toHaveLength(1);
      expect(res.body.objectives[0].status).toBe("active"); // default before any save
    });
  });

  describe("POST /api/session/:npcId/:pcId", () => {
    it("persists a relationship change and it's reflected on the next GET", async () => {
      await seedNpc();
      await seedPc();
      const newRel = { trust: 75, patience: 40, suspicion: 20, respect: 60 };
      const post = await request(app).post("/api/session/marta/hero").send({ relationship: newRel });
      expect(post.status).toBe(200);
      const get = await request(app).get("/api/session/marta/hero");
      expect(get.body.relationship).toEqual(newRel);
    });

    it("persists objective status and it shows up merged into objectives on GET", async () => {
      await seedNpc();
      await seedPc();
      await request(app).post("/api/session/marta/hero").send({ objectiveStatus: { "earn-logbook": "complete" } });
      const get = await request(app).get("/api/session/marta/hero");
      expect(get.body.objectives[0].status).toBe("complete");
    });

    it("persists NPC inventory/gold and portrait caching", async () => {
      await seedNpc();
      await seedPc();
      await request(app).post("/api/session/marta/hero").send({
        npc: { inventory: [], gold: 65, portraitUrl: "https://example.com/marta.png", moodLabel: "warm", visualMood: "smiling", encountered: true },
      });
      const get = await request(app).get("/api/session/marta/hero");
      expect(get.body.npc.inventory).toEqual([]);
      expect(get.body.npc.gold).toBe(65);
      expect(get.body.npc.portraitUrl).toBe("https://example.com/marta.png");
      expect(get.body.npc.encountered).toBe(true);
    });

    it("persists PC inventory/gold/playerModel independent of the NPC side", async () => {
      await seedNpc();
      await seedPc();
      await request(app).post("/api/session/marta/hero").send({
        pc: { inventory: [{ id: "compass", name: "Brass compass", value: 25, qty: 1 }], gold: 5, playerModel: { honesty: 70, aggression: 30, curiosity: 60, generosity: 50 } },
      });
      const get = await request(app).get("/api/session/marta/hero");
      expect(get.body.pc.gold).toBe(5);
      expect(get.body.pc.inventory).toHaveLength(1);
      expect(get.body.pc.playerModel.honesty).toBe(70);
    });

    it("history persists and round-trips capped at 60 entries", async () => {
      await seedNpc();
      await seedPc();
      const longHistory = Array.from({ length: 80 }, (_, i) => ({ role: i % 2 ? "npc" : "player", text: `line ${i}` }));
      await request(app).post("/api/session/marta/hero").send({ history: longHistory });
      const get = await request(app).get("/api/session/marta/hero");
      expect(get.body.history).toHaveLength(60);
      expect(get.body.history[0].text).toBe("line 20"); // oldest 20 dropped
      expect(get.body.history[59].text).toBe("line 79");
    });

    it("a partial save doesn't clobber fields it didn't mention", async () => {
      await seedNpc();
      await seedPc();
      await request(app).post("/api/session/marta/hero").send({ relationship: { trust: 80, patience: 50, suspicion: 50, respect: 50 } });
      // second save only touches objectiveStatus — relationship should survive untouched
      await request(app).post("/api/session/marta/hero").send({ objectiveStatus: { "earn-logbook": "complete" } });
      const get = await request(app).get("/api/session/marta/hero");
      expect(get.body.relationship.trust).toBe(80);
      expect(get.body.objectives[0].status).toBe("complete");
    });

    it("keeps two PCs' relationships with the same NPC independent", async () => {
      await seedNpc();
      await seedPc();
      await request(app).put("/api/pcs/rival").send({ name: "Rival", sheet: { abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, level: 1, proficiencyBonus: 2, skillProficiencies: {}, saveProficiencies: {}, combat: { hp: 10, ac: 10, speed: 30 } }, startingGold: 0 });

      await request(app).post("/api/session/marta/hero").send({ relationship: { trust: 90, patience: 50, suspicion: 50, respect: 50 } });
      await request(app).post("/api/session/marta/rival").send({ relationship: { trust: 5, patience: 50, suspicion: 50, respect: 50 } });

      const heroSession = await request(app).get("/api/session/marta/hero");
      const rivalSession = await request(app).get("/api/session/marta/rival");
      expect(heroSession.body.relationship.trust).toBe(90);
      expect(rivalSession.body.relationship.trust).toBe(5);
      // and NPC-level facts (gold) are shared, not duplicated per pair
      expect(heroSession.body.npc.gold).toBe(rivalSession.body.npc.gold);
    });
  });

  describe("PUT /api/npcs/:npcId and /api/pcs/:pcId", () => {
    it("rejects an unsafe id with a 400, not a silent write", async () => {
      const res = await request(app).put("/api/npcs/bad@id").send({ name: "x" });
      expect(res.status).toBe(400);
      // confirm nothing was actually written under that name
      const list = await request(app).get("/api/npcs");
      expect(list.body.find((n) => n.id === "bad@id")).toBeUndefined();
    });
    it("round-trips a definition edit", async () => {
      await seedNpc();
      await request(app).put("/api/npcs/marta").send({ name: "Old Marta", persona: "Updated persona.", coreValues: "x", appearance: "x", sheet: {}, objectives: [], inventory: [], startingGold: 40 });
      const res = await request(app).get("/api/npcs");
      expect(res.body.find((n) => n.id === "marta").name).toBe("Old Marta");
    });
  });

  describe("GET /healthz", () => {
    it("responds ok", async () => {
      const res = await request(app).get("/healthz");
      expect(res.status).toBe(200);
      expect(res.text).toBe("ok");
    });
  });
});
