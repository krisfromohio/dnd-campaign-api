import fs from "fs/promises";
import path from "path";

// All persisted data lives under DATA_DIR. Locally this is ./data; on Fly,
// point this at a mounted Volume (fly volumes create + a [[mounts]] block in
// fly.toml) for state to survive redeploys — without a Volume, local disk on
// Fly is ephemeral across deploys (it does usually survive a machine simply
// stopping/starting when idle, but NOT a `fly deploy`).
//
// Read lazily (a function, not a module-load-time constant) so tests can
// point process.env.DATA_DIR at a temp directory per test run without
// writing into real data or needing import-order tricks.
function dataDir() {
  return process.env.DATA_DIR || path.join(process.cwd(), "data");
}
const defsNpcDir = () => path.join(dataDir(), "npcs");
const defsPcDir = () => path.join(dataDir(), "pcs");
const stateNpcDir = () => path.join(dataDir(), "state", "npc");
const statePcDir = () => path.join(dataDir(), "state", "pc");
const stateRelDir = () => path.join(dataDir(), "state", "relationship");

// NPC/PC ids become filenames — only allow safe slugs to prevent path traversal.
const KEY_RE = /^[a-zA-Z0-9_-]{1,64}$/;
export function assertValidKey(key) {
  if (typeof key !== "string" || !KEY_RE.test(key)) {
    const err = new Error(`Invalid key: "${key}". Keys must be 1-64 chars, letters/numbers/underscore/dash only.`);
    err.status = 400;
    throw err;
  }
  return key;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function readJSON(filePath, fallback = null) {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    if (e.code === "ENOENT") return fallback;
    throw e;
  }
}

async function writeJSON(filePath, data) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

const relFile = (npcId, pcId) => path.join(stateRelDir(), `${npcId}__${pcId}.json`);

// ---- Definitions (authored/generated, read-mostly) ----

export async function listNpcDefs() {
  await ensureDir(defsNpcDir());
  const files = (await fs.readdir(defsNpcDir())).filter((f) => f.endsWith(".json"));
  const out = [];
  for (const f of files) {
    const def = await readJSON(path.join(defsNpcDir(), f));
    if (def) out.push({ id: def.id, name: def.name });
  }
  return out;
}

export async function listPcDefs() {
  await ensureDir(defsPcDir());
  const files = (await fs.readdir(defsPcDir())).filter((f) => f.endsWith(".json"));
  const out = [];
  for (const f of files) {
    const def = await readJSON(path.join(defsPcDir(), f));
    if (def) out.push({ id: def.id, name: def.name });
  }
  return out;
}

export async function readNpcDef(npcId) {
  assertValidKey(npcId);
  return readJSON(path.join(defsNpcDir(), `${npcId}.json`));
}

export async function readPcDef(pcId) {
  assertValidKey(pcId);
  return readJSON(path.join(defsPcDir(), `${pcId}.json`));
}

export async function writeNpcDef(npcId, def) {
  assertValidKey(npcId);
  await writeJSON(path.join(defsNpcDir(), `${npcId}.json`), { ...def, id: npcId });
}

export async function writePcDef(pcId, def) {
  assertValidKey(pcId);
  await writeJSON(path.join(defsPcDir(), `${pcId}.json`), { ...def, id: pcId });
}

// ---- Runtime state (mutated during play) ----

const DEFAULT_NPC_STATE = () => ({ inventory: null, gold: null, portraitUrl: null, moodLabel: null, visualMood: null, encountered: false });
const DEFAULT_PC_STATE = () => ({ playerModel: null, inventory: null, gold: null });
const DEFAULT_REL_STATE = () => ({ relationship: null, objectiveStatus: {}, history: [], updatedAt: null });

export async function readNpcState(npcId) {
  assertValidKey(npcId);
  return (await readJSON(path.join(stateNpcDir(), `${npcId}.json`))) || DEFAULT_NPC_STATE();
}
export async function writeNpcState(npcId, state) {
  assertValidKey(npcId);
  await writeJSON(path.join(stateNpcDir(), `${npcId}.json`), state);
}

export async function readPcState(pcId) {
  assertValidKey(pcId);
  return (await readJSON(path.join(statePcDir(), `${pcId}.json`))) || DEFAULT_PC_STATE();
}
export async function writePcState(pcId, state) {
  assertValidKey(pcId);
  await writeJSON(path.join(statePcDir(), `${pcId}.json`), state);
}

export async function readRelState(npcId, pcId) {
  assertValidKey(npcId);
  assertValidKey(pcId);
  return (await readJSON(relFile(npcId, pcId))) || DEFAULT_REL_STATE();
}
export async function writeRelState(npcId, pcId, state) {
  assertValidKey(npcId);
  assertValidKey(pcId);
  await writeJSON(relFile(npcId, pcId), { ...state, updatedAt: new Date().toISOString() });
}

// Cap history length so a long-running relationship doesn't grow the file
// (and the payload sent to the client) without bound.
export function capHistory(history, max = 60) {
  return (history || []).slice(-max);
}
