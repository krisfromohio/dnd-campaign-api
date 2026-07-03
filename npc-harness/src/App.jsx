import { useState, useRef, useEffect } from "react";

// ============================================================
// D&D-lite data
// ============================================================

const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];
const ABILITY_LABEL = { str: "STR", dex: "DEX", con: "CON", int: "INT", wis: "WIS", cha: "CHA" };

const SKILLS_FULL = [
  { key: "acrobatics", label: "Acrobatics", ability: "dex" },
  { key: "animalHandling", label: "Animal Handling", ability: "wis" },
  { key: "arcana", label: "Arcana", ability: "int" },
  { key: "athletics", label: "Athletics", ability: "str" },
  { key: "deception", label: "Deception", ability: "cha" },
  { key: "history", label: "History", ability: "int" },
  { key: "insight", label: "Insight", ability: "wis" },
  { key: "intimidation", label: "Intimidation", ability: "cha" },
  { key: "investigation", label: "Investigation", ability: "int" },
  { key: "medicine", label: "Medicine", ability: "wis" },
  { key: "nature", label: "Nature", ability: "int" },
  { key: "perception", label: "Perception", ability: "wis" },
  { key: "performance", label: "Performance", ability: "cha" },
  { key: "persuasion", label: "Persuasion", ability: "cha" },
  { key: "religion", label: "Religion", ability: "int" },
  { key: "sleightOfHand", label: "Sleight of Hand", ability: "dex" },
  { key: "stealth", label: "Stealth", ability: "dex" },
  { key: "survival", label: "Survival", ability: "wis" },
];

const SOCIAL_SKILLS = [
  { key: "persuasion", label: "Persuade" },
  { key: "deception", label: "Deceive" },
  { key: "intimidation", label: "Intimidate" },
  { key: "performance", label: "Perform" },
];

const DC_TIERS = [5, 10, 15, 20, 25];
const DC_TIER_LABEL = { 5: "Modest", 10: "Easy", 15: "Medium", 20: "Bold", 25: "Audacious" };
const DC_TIER_COLOR = { 5: "#8fd18f", 10: "#7cffb2", 15: "#ffd66b", 20: "#ffb86b", 25: "#ff8b7c" };

const STATE_MODIFIERS = {
  persuasion: (rel) => -(rel.trust - 50) / 10,
  deception: (rel) => (rel.suspicion - 50) / 10,
  intimidation: (rel) => -(50 - rel.patience) / 10,
  performance: (rel) => -(rel.patience - 50) / 10,
};
const VALUE_MOD = { aligned: -3, conflict: 3, neutral: 0 };

const SKILL_EFFECTS = {
  persuasion: { successAttr: "trust", successSign: 1, failAttr: "trust", failSign: -1 },
  deception: { successAttr: "trust", successSign: 1, failAttr: "suspicion", failSign: 1 },
  intimidation: { successAttr: "patience", successSign: -1, failAttr: "respect", failSign: -1 },
  performance: { successAttr: "respect", successSign: 1, failAttr: "respect", failSign: -1 },
};

const TIER_MAX = { 5: 4, 10: 7, 15: 10, 20: 13, 25: 17 };
const DEGREE_MULT = { crit_success: 1.15, strong_success: 1.15, success: 0.8, marginal_fail: 0.5, strong_fail: 1.0, crit_fail: 1.3 };
const SUCCESS_DEGREES = new Set(["crit_success", "strong_success", "success"]);
const DEGREE_LABEL = {
  crit_success: "Critical Success", strong_success: "Strong Success", success: "Success",
  marginal_fail: "Marginal Failure", strong_fail: "Strong Failure", crit_fail: "Critical Failure",
};
const DEGREE_COLOR = {
  crit_success: "#7cffb2", strong_success: "#7cffb2", success: "#a8e6c2",
  marginal_fail: "#ffb86b", strong_fail: "#ff8b7c", crit_fail: "#ff5c5c",
};

const PROF_BY_LEVEL = (lvl) => (lvl <= 4 ? 2 : lvl <= 8 ? 3 : lvl <= 12 ? 4 : lvl <= 16 ? 5 : 6);

const ROLES = [
  { key: "quest", label: "Quest Giver", color: "#ffb86b" },
  { key: "info", label: "Info Giver", color: "#7cc8ff" },
  { key: "recruit", label: "Party Candidate", color: "#c99bff" },
  { key: "trade", label: "Merchant", color: "#7cffb2" },
  { key: "combat", label: "Combat Encounter", color: "#ff5c5c" },
];
const ROLE_COLOR = Object.fromEntries(ROLES.map((r) => [r.key, r.color]));
const ROLE_LABEL = Object.fromEntries(ROLES.map((r) => [r.key, r.label]));

const clampNum = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const clamp100 = (n) => clampNum(Math.round(n), 0, 100);
const abilityMod = (score) => Math.floor((score - 10) / 2);
const fmtMod = (m) => (m >= 0 ? `+${m}` : `${m}`);
const uid = () => Math.random().toString(36).slice(2, 9);

function skillModifier(sheet, skillKey) {
  const def = SKILLS_FULL.find((s) => s.key === skillKey);
  const abil = def ? def.ability : "cha";
  const mod = abilityMod(sheet.abilities[abil]);
  const prof = sheet.skillProficiencies[skillKey] ? sheet.proficiencyBonus : 0;
  return mod + prof;
}
function saveModifier(sheet, abil) {
  const mod = abilityMod(sheet.abilities[abil]);
  const prof = sheet.saveProficiencies[abil] ? sheet.proficiencyBonus : 0;
  return mod + prof;
}
function passiveSkill(sheet, skillKey) {
  return 10 + skillModifier(sheet, skillKey);
}

function stateDC(baseDC, skillKey, relationship) {
  const raw = STATE_MODIFIERS[skillKey] ? STATE_MODIFIERS[skillKey](relationship) : 0;
  return clampNum(Math.round(raw), -5, 5);
}

const rollD20 = () => 1 + Math.floor(Math.random() * 20);

function resolveCheck(pcMod, effDC) {
  const d20 = rollD20();
  const total = d20 + pcMod;
  const margin = total - effDC;
  let degree;
  if (d20 === 20) degree = "crit_success";
  else if (d20 === 1) degree = "crit_fail";
  else if (margin >= 10) degree = "strong_success";
  else if (margin >= 0) degree = "success";
  else if (margin > -5) degree = "marginal_fail";
  else degree = "strong_fail";
  return { d20, total, margin, degree };
}

function suggestedDelta(skillKey, dc, degree) {
  const eff = SKILL_EFFECTS[skillKey];
  const isSuccess = SUCCESS_DEGREES.has(degree);
  const attr = isSuccess ? eff.successAttr : eff.failAttr;
  const sign = isSuccess ? eff.successSign : eff.failSign;
  const mag = Math.round(TIER_MAX[dc] * (DEGREE_MULT[degree] || 1));
  return { attr, delta: clampNum(sign * mag, -20, 20) };
}

// ============================================================
// default data
// ============================================================

const DEFAULT_PERSONA = `You are Old Marta, a retired sailor who runs the harbor tavern.
You are gruff but fair, distrust nobles, and have a soft spot for anyone
who's lost someone at sea. You speak in short, clipped sentences.`;

const DEFAULT_APPEARANCE = `A weathered woman in her sixties, close-cropped silver hair, a thick
scar across one eyebrow, wearing a salt-stained wool coat over a
faded sailor's shirt, standing behind a worn wooden bar counter in a
dim harbor tavern lit by lantern light.`;

const DEFAULT_VALUES = `Respects: honesty, sailors and dock workers, grief handled with dignity, plain speaking.
Despises: nobility and titles, cruelty to animals, people who lie about the sea.`;

const RELATIONSHIP_KEYS = [
  { key: "trust", label: "TRUST" }, { key: "patience", label: "PATIENCE" },
  { key: "suspicion", label: "SUSPICION" }, { key: "respect", label: "RESPECT" },
];
const PLAYER_MODEL_KEYS = [
  { key: "honesty", label: "HONESTY" }, { key: "aggression", label: "AGGRESSION" },
  { key: "curiosity", label: "CURIOSITY" }, { key: "generosity", label: "GENEROSITY" },
];

function defaultSheet({ abilities, level, proficiencyBonus, skillProfs, saveProfs, hp, ac, speed }) {
  const skillProficiencies = {};
  SKILLS_FULL.forEach((s) => (skillProficiencies[s.key] = skillProfs.includes(s.key)));
  const saveProficiencies = {};
  ABILITIES.forEach((a) => (saveProficiencies[a] = saveProfs.includes(a)));
  return { abilities, level, proficiencyBonus, skillProficiencies, saveProficiencies, combat: { hp, ac, speed } };
}

const DEFAULT_NPC_SHEET = defaultSheet({
  abilities: { str: 12, dex: 10, con: 13, int: 11, wis: 15, cha: 14 },
  level: 5, proficiencyBonus: 3, skillProfs: ["insight", "intimidation", "perception"], saveProfs: ["wis", "cha"],
  hp: 27, ac: 12, speed: 30,
});
const DEFAULT_PC_SHEET = defaultSheet({
  abilities: { str: 10, dex: 12, con: 12, int: 10, wis: 10, cha: 13 },
  level: 3, proficiencyBonus: 2, skillProfs: ["persuasion", "deception"], saveProfs: ["cha", "wis"],
  hp: 24, ac: 13, speed: 30,
});

const DEFAULT_NPC_INVENTORY = [
  { id: uid(), name: "Weathered Logbook", value: 0, qty: 1, questItem: true },
  { id: uid(), name: "Bottle of dark rum", value: 8, qty: 3, questItem: false },
  { id: uid(), name: "Brass compass", value: 25, qty: 1, questItem: false },
];

const DEFAULT_OBJECTIVES = [
  {
    id: uid(), label: "Hears the wreck story", role: "info",
    attribute: "suspicion", comparator: "<=", threshold: 20,
    action: "Marta's guard drops. Unprompted, she begins telling the story of the Kestrel's Pride in a low, quiet voice.",
    rewardItemId: null, status: "active",
  },
  {
    id: uid(), label: "Earn the logbook", role: "quest",
    attribute: "trust", comparator: ">=", threshold: 70,
    action: "Marta reaches under the counter and slides her weathered logbook across to the player without a word, her expression softening for just a moment.",
    rewardItemId: null, status: "active",
  },
  {
    id: uid(), label: "Push her too far", role: "combat",
    attribute: "patience", comparator: "<=", threshold: 0,
    action: "Marta slams her palm on the bar and reaches for the belaying pin kept behind it, her voice dropping to a warning growl.",
    rewardItemId: null, status: "active",
  },
];

const SCENARIOS = [
  { name: "Baseline", note: "Neutral message, mid-range state", relationship: { trust: 50, patience: 50, suspicion: 50, respect: 50 }, input: "Evening. Rough night out there?" },
  { name: "Hostile / high trust", note: "Does trust actually drop?", relationship: { trust: 85, patience: 60, suspicion: 10, respect: 70 }, input: "Shut it, old woman, and pour me a drink before I make you." },
  { name: "Kind / zero trust", note: "Recovery too fast or too slow?", relationship: { trust: 2, patience: 40, suspicion: 90, respect: 20 }, input: "I'm sorry about earlier. I brought this for you — it was my father's compass." },
  { name: "Boundary clamp", note: "Already at 0/100 — clamps correctly?", relationship: { trust: 100, patience: 0, suspicion: 100, respect: 0 }, input: "Come on, just this once, cut me some slack." },
];

// ============================================================
// prompt builders
// ============================================================

function buildNarratePrompt(persona, coreValues, rel, playerModel, historyText, resolution) {
  const resolutionBlock = resolution ? `
## CHECK RESULT (this turn only)
The player attempted (may be dialogue or an action): "${resolution.text}"
- Base DC: ${resolution.dc}${DC_TIER_LABEL[resolution.dc] ? ` (${DC_TIER_LABEL[resolution.dc]})` : ""}
- DC modifiers applied: state ${resolution.stateMod >= 0 ? "+" : ""}${resolution.stateMod}${resolution.valueMod !== undefined ? `, core-values ${resolution.valueMod >= 0 ? "+" : ""}${resolution.valueMod}` : ""} → effective DC ${resolution.effDC}
- Roll: d20(${resolution.d20}) + modifier(${fmtMod(resolution.pcMod)}) = ${resolution.total}
- Outcome: ${DEGREE_LABEL[resolution.degree]}${resolution.d20 === 20 ? " (natural 20)" : ""}${resolution.d20 === 1 ? " (natural 1)" : ""}
${resolution.valueAlignment && resolution.valueAlignment !== "neutral" ? `- This approach was tagged as ${resolution.valueAlignment.toUpperCase()} with the NPC's core values — let that visibly color the reaction, independent of the roll.` : ""}

This is a resolved mechanical outcome, not a suggestion — reflect it honestly.
Apply a delta of approximately ${resolution.suggested.delta > 0 ? "+" : ""}${resolution.suggested.delta} to "${resolution.suggested.attr}" (±2 tolerance). Other attributes may move up to ±15.
` : "";

  return `You are roleplaying as an NPC in a narrative game. Stay fully in
character and never break the fourth wall.

## PERSONA (fixed)
${persona}

## CORE VALUES (fixed — should color willingness independent of relationship numbers)
${coreValues}

## CURRENT RELATIONSHIP STATE
- trust: ${rel.trust}/100
- patience: ${rel.patience}/100
- suspicion: ${rel.suspicion}/100
- respect: ${rel.respect}/100
Let these color tone and word choice but never appear as numbers in dialogue.

## PLAYER MODEL
- honesty: ${playerModel.honesty}/100
- aggression: ${playerModel.aggression}/100
- curiosity: ${playerModel.curiosity}/100
- generosity: ${playerModel.generosity}/100
Use only to shape the flavor of the player_choices you generate.

## RECENT HISTORY
${historyText || "(this is the first turn — no history yet)"}
${resolutionBlock}
## TASK
1. Write the NPC's next line(s), consistent with PERSONA, CORE VALUES, and STATE${resolution ? ", and CHECK RESULT" : ""}.
2. Propose relationship state deltas.${resolution ? " Follow the numeric guidance above for the primary attribute." : " Deltas must be -15 to +15 unless something extreme occurred (state so if used)."}
3. Generate 3-4 plain dialogue choices for the player's next line, in their voice per PLAYER MODEL. Include one that doesn't match their dominant trait.

Respond ONLY with valid JSON, no preamble, no markdown fences:
{
  "npc_dialogue": "string",
  "state_deltas": { "trust": integer, "patience": integer, "suspicion": integer, "respect": integer },
  "delta_reason": "string, 1 sentence, debug only",
  "player_choices": [ { "text": "string", "implied_traits": ["honesty+", "aggression-"] } ]
}`;
}

function buildTriggerPrompt(persona, coreValues, action, rel, playerModel, historyText) {
  return `You are roleplaying as an NPC in a narrative game. Stay fully in
character and never break the fourth wall.

## PERSONA (fixed)
${persona}

## CORE VALUES (fixed)
${coreValues}

## CURRENT RELATIONSHIP STATE
- trust: ${rel.trust}/100, patience: ${rel.patience}/100, suspicion: ${rel.suspicion}/100, respect: ${rel.respect}/100

## RECENT HISTORY
${historyText || "(no history yet)"}

## TRIGGERED ACTION
A game condition was just met. The NPC now does the following, entirely in
their own voice, colored by PERSONA, CORE VALUES, and CURRENT RELATIONSHIP
STATE — this is an instruction for what happens, not a line to repeat
verbatim:
"${action}"

## TASK
Write 1-3 sentences of narrative/dialogue depicting this happening right
now, as a natural continuation of the conversation. Do not explain game
mechanics or mention thresholds or numbers — just show it happening in
character.

Respond ONLY with valid JSON, no preamble, no markdown fences:
{ "narrative_text": "string" }`;
}

function buildOptionsPrompt(skillLabel, intent, persona, coreValues, rel, playerModel, historyText, dcInfoList) {
  const dcLines = dcInfoList.map((d) => `  - DC ${d.dc} (${DC_TIER_LABEL[d.dc]})`).join("\n");
  return `You are generating dialogue options for a player about to attempt a
${skillLabel} check against an NPC.

## NPC PERSONA
${persona}

## NPC CORE VALUES
${coreValues}

## CURRENT RELATIONSHIP STATE
trust: ${rel.trust}/100, patience: ${rel.patience}/100, suspicion: ${rel.suspicion}/100, respect: ${rel.respect}/100

## PLAYER MODEL (voice reference)
honesty: ${playerModel.honesty}/100, aggression: ${playerModel.aggression}/100, curiosity: ${playerModel.curiosity}/100, generosity: ${playerModel.generosity}/100

## RECENT HISTORY
${historyText || "(no history yet)"}

## PLAYER'S STATED GOAL
"${intent}"

## TASK
Write exactly 5 lines the player could say to pursue this goal via
${skillLabel}, one per DC tier. DC tiers are FIXED; the CONTENT and STAKES
of the ask must escalate:
${dcLines}
DC 5 = modest, low-stakes. DC 25 = audacious, high-stakes. Do not mention
DCs or mechanics inside the dialogue text.

For each option, also tag "value_alignment": "aligned" if the phrasing
genuinely appeals to or invokes something in NPC CORE VALUES, "conflict" if
it invokes something the NPC despises, or "neutral" otherwise. Be honest —
most options will be neutral.

Respond ONLY with valid JSON, no preamble, no markdown fences:
{
  "skill": "${skillLabel}",
  "options": [
    { "dc": 5, "text": "string", "value_alignment": "neutral" },
    { "dc": 10, "text": "string", "value_alignment": "neutral" },
    { "dc": 15, "text": "string", "value_alignment": "neutral" },
    { "dc": 20, "text": "string", "value_alignment": "neutral" },
    { "dc": 25, "text": "string", "value_alignment": "neutral" }
  ]
}`;
}

function buildIntroPrompt(persona, coreValues, appearance, rel, playerModel) {
  return `You are roleplaying as an NPC in a narrative game. Stay fully in
character and never break the fourth wall.

## PERSONA (fixed)
${persona}

## CORE VALUES (fixed)
${coreValues}

## APPEARANCE (fixed, internal reference only)
${appearance}

## CURRENT RELATIONSHIP STATE
- trust: ${rel.trust}/100, patience: ${rel.patience}/100, suspicion: ${rel.suspicion}/100, respect: ${rel.respect}/100

## PLAYER MODEL
- honesty: ${playerModel.honesty}/100, aggression: ${playerModel.aggression}/100, curiosity: ${playerModel.curiosity}/100, generosity: ${playerModel.generosity}/100

## TASK
This is the very start of a session. Write the NPC's opening line(s),
colored entirely by CURRENT RELATIONSHIP STATE. Also describe:
- "mood_label": 1-2 words
- "visual_mood": 6-12 words, PURELY physical/visual descriptors, for an image generator.
Then generate 3-4 opening dialogue choices for the player, in their voice per PLAYER MODEL.

Respond ONLY with valid JSON, no preamble, no markdown fences:
{
  "npc_dialogue": "string",
  "mood_label": "string",
  "visual_mood": "string",
  "player_choices": [ { "text": "string", "implied_traits": ["honesty+"] } ]
}`;
}

function parseModelJSON(raw) {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

async function callClaude(systemPrompt, userMessage) {
  const response = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system: systemPrompt, message: userMessage }),
  });
  if (!response.ok) throw new Error(`Backend error ${response.status}`);
  const data = await response.json();
  return data.text || "";
}

function buildPortraitUrl(appearance, visualMood) {
  const prompt = `${appearance}, ${visualMood}, digital painting, character portrait, dramatic lighting, detailed face`;
  const seed = Math.floor(Math.random() * 1000000);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&seed=${seed}&nologo=true`;
}

// ============================================================
// small UI primitives
// ============================================================

function Meter({ label, value, onChange, delta, accent }) {
  return (
    <div className="meter">
      <div className="meter-head">
        <span className="meter-label">{label}</span>
        <span className="meter-value" style={{ color: accent }}>
          {value}
          {delta !== undefined && delta !== 0 && <span className={`meter-delta ${delta > 0 ? "up" : "down"}`}>{delta > 0 ? ` +${delta}` : ` ${delta}`}</span>}
        </span>
      </div>
      <div className="meter-track">
        <div className="meter-fill" style={{ width: `${value}%`, background: accent }} />
        {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((t) => <div key={t} className="meter-tick" style={{ left: `${t}%` }} />)}
      </div>
      <input type="range" min={0} max={100} value={value} onChange={(e) => onChange(Number(e.target.value))} className="meter-slider" />
    </div>
  );
}

function StatBlock({ sheet, setSheet, title }) {
  const setAbility = (abil, v) => setSheet((s) => ({ ...s, abilities: { ...s.abilities, [abil]: clampNum(v, 1, 20) } }));
  const setSkillProf = (key, v) => setSheet((s) => ({ ...s, skillProficiencies: { ...s.skillProficiencies, [key]: v } }));
  const setSaveProf = (abil, v) => setSheet((s) => ({ ...s, saveProficiencies: { ...s.saveProficiencies, [abil]: v } }));
  const setCombat = (field, v) => setSheet((s) => ({ ...s, combat: { ...s.combat, [field]: v } }));
  return (
    <div className="statblock">
      <p className="panel-title">{title}</p>
      <div className="level-row">
        <label className="mini-field"><span>LEVEL</span><input type="number" value={sheet.level} onChange={(e) => setSheet((s) => ({ ...s, level: clampNum(Number(e.target.value), 1, 20) }))} /></label>
        <label className="mini-field"><span>PROF</span><input type="number" value={sheet.proficiencyBonus} onChange={(e) => setSheet((s) => ({ ...s, proficiencyBonus: clampNum(Number(e.target.value), 0, 6) }))} /></label>
        <span className="prof-hint">suggested +{PROF_BY_LEVEL(sheet.level)}</span>
      </div>
      <div className="ability-grid">
        {ABILITIES.map((a) => (
          <label key={a} className="ability"><span>{ABILITY_LABEL[a]}</span><input type="number" value={sheet.abilities[a]} onChange={(e) => setAbility(a, Number(e.target.value))} /><span className="mod-chip">{fmtMod(abilityMod(sheet.abilities[a]))}</span></label>
        ))}
      </div>
      <div className="combat-row">
        <label className="mini-field"><span>HP</span><input type="number" value={sheet.combat.hp} onChange={(e) => setCombat("hp", Number(e.target.value))} /></label>
        <label className="mini-field"><span>AC</span><input type="number" value={sheet.combat.ac} onChange={(e) => setCombat("ac", Number(e.target.value))} /></label>
        <label className="mini-field"><span>SPD</span><input type="number" value={sheet.combat.speed} onChange={(e) => setCombat("speed", Number(e.target.value))} /></label>
      </div>
      <div className="combat-note">reference only — not yet used in any check</div>
      <div className="subhead">SAVING THROWS</div>
      <div className="save-grid">
        {ABILITIES.map((a) => (
          <label key={a} className="save-row"><input type="checkbox" checked={sheet.saveProficiencies[a]} onChange={(e) => setSaveProf(a, e.target.checked)} /><span className="save-name">{ABILITY_LABEL[a]}</span><span className="save-mod">{fmtMod(saveModifier(sheet, a))}</span></label>
        ))}
      </div>
      <div className="subhead">SKILLS</div>
      <div className="skill-list">
        {SKILLS_FULL.map((s) => (
          <label key={s.key} className="skill-row"><input type="checkbox" checked={sheet.skillProficiencies[s.key]} onChange={(e) => setSkillProf(s.key, e.target.checked)} /><span className="skill-name">{s.label}</span><span className="skill-abil">{ABILITY_LABEL[s.ability]}</span><span className="skill-mod">{fmtMod(skillModifier(sheet, s.key))}</span></label>
        ))}
      </div>
      <div className="passive-line">Passive Perception: <b>{passiveSkill(sheet, "perception")}</b> &nbsp;·&nbsp; Passive Insight: <b>{passiveSkill(sheet, "insight")}</b></div>
    </div>
  );
}

function ObjectiveEditor({ objectives, setObjectives, inventory }) {
  const update = (id, patch) => setObjectives((list) => list.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  const remove = (id) => setObjectives((list) => list.filter((o) => o.id !== id));
  const add = () =>
    setObjectives((list) => [
      ...list,
      { id: uid(), label: "New objective", role: "quest", attribute: "trust", comparator: ">=", threshold: 70, action: "", rewardItemId: null, status: "active" },
    ]);
  return (
    <div className="section">
      <p className="panel-title">OBJECTIVES (triggers)</p>
      <div className="trigger-hint">When condition is met → generate narrative influenced by state/values, then raise a banner. State-attribute conditions only for now.</div>
      {objectives.map((o) => (
        <div key={o.id} className="obj-card">
          <div className="obj-head">
            <input className="obj-label" value={o.label} onChange={(e) => update(o.id, { label: e.target.value })} />
            <span className={`status-pill ${o.status}`}>{o.status === "complete" ? "✓ COMPLETE" : "ACTIVE"}</span>
          </div>
          <div className="obj-row">
            <select className="obj-select" value={o.role} onChange={(e) => update(o.id, { role: e.target.value })}>
              {ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </div>
          <div className="obj-row">
            <span className="cond-label">IF</span>
            <select className="obj-select" value={o.attribute} onChange={(e) => update(o.id, { attribute: e.target.value })}>
              {RELATIONSHIP_KEYS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
            <select className="obj-select-sm" value={o.comparator} onChange={(e) => update(o.id, { comparator: e.target.value })}>
              <option value=">=">≥</option>
              <option value="<=">≤</option>
            </select>
            <input className="obj-num" type="number" value={o.threshold} onChange={(e) => update(o.id, { threshold: Number(e.target.value) })} />
          </div>
          <div className="cond-label" style={{ marginBottom: 4 }}>THEN — action (fed to the AI to narrate, not shown verbatim)</div>
          <textarea className="obj-desc" placeholder="e.g. 'Marta slides the logbook across the counter without a word.'" value={o.action} onChange={(e) => update(o.id, { action: e.target.value })} />
          <div className="obj-row">
            <select className="obj-select" value={o.rewardItemId || ""} onChange={(e) => update(o.id, { rewardItemId: e.target.value || null })}>
              <option value="">No reward item</option>
              {inventory.map((it) => <option key={it.id} value={it.id}>Reward: {it.name}</option>)}
            </select>
          </div>
          <div className="obj-actions">
            {o.status === "complete" && <button className="mini-btn" onClick={() => update(o.id, { status: "active" })}>↺ reset</button>}
            <button className="mini-btn danger" onClick={() => remove(o.id)}>delete</button>
          </div>
        </div>
      ))}
      <button className="add-btn" onClick={add}>+ New Objective</button>
    </div>
  );
}

function InventoryEditor({ inventory, setInventory, gold, setGold, title }) {
  const update = (id, patch) => setInventory((list) => list.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const remove = (id) => setInventory((list) => list.filter((it) => it.id !== id));
  const add = () => setInventory((list) => [...list, { id: uid(), name: "New item", value: 0, qty: 1, questItem: false }]);
  return (
    <div className="section">
      <p className="panel-title">{title}</p>
      <label className="mini-field" style={{ marginBottom: 10 }}>
        <span>GOLD</span>
        <input type="number" value={gold} onChange={(e) => setGold(clampNum(Number(e.target.value), 0, 999999))} />
      </label>
      {inventory.map((it) => (
        <div key={it.id} className="item-row">
          <input className="item-name" value={it.name} onChange={(e) => update(it.id, { name: e.target.value })} />
          <input className="item-num" type="number" title="value (gp)" value={it.value} onChange={(e) => update(it.id, { value: Number(e.target.value) })} />
          <input className="item-num" type="number" title="qty" value={it.qty} onChange={(e) => update(it.id, { qty: Number(e.target.value) })} />
          <label className="item-quest" title="quest item"><input type="checkbox" checked={it.questItem} onChange={(e) => update(it.id, { questItem: e.target.checked })} />Q</label>
          <button className="mini-btn danger" onClick={() => remove(it.id)}>×</button>
        </div>
      ))}
      <button className="add-btn" onClick={add}>+ Add Item</button>
    </div>
  );
}

// ============================================================
// main component
// ============================================================

export default function NPCTestHarness() {
  const [leftTab, setLeftTab] = useState("npc");
  const [persona, setPersona] = useState(DEFAULT_PERSONA);
  const [appearance, setAppearance] = useState(DEFAULT_APPEARANCE);
  const [coreValues, setCoreValues] = useState(DEFAULT_VALUES);
  const [relationship, setRelationship] = useState({ trust: 50, patience: 50, suspicion: 50, respect: 50 });
  const [playerModel, setPlayerModel] = useState({ honesty: 50, aggression: 50, curiosity: 50, generosity: 50 });
  const [npcSheet, setNpcSheet] = useState(DEFAULT_NPC_SHEET);
  const [pcSheet, setPcSheet] = useState(DEFAULT_PC_SHEET);

  const [objectives, setObjectives] = useState(DEFAULT_OBJECTIVES);
  const [npcInventory, setNpcInventory] = useState(DEFAULT_NPC_INVENTORY);
  const [pcInventory, setPcInventory] = useState([]);
  const [npcGold, setNpcGold] = useState(40);
  const [pcGold, setPcGold] = useState(15);
  const [showInventoryPanel, setShowInventoryPanel] = useState(false);

  const [lastDeltas, setLastDeltas] = useState({});
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRaw, setLastRaw] = useState(null);
  const [lastParsed, setLastParsed] = useState(null);
  const [clampWarning, setClampWarning] = useState(null);
  const [callCount, setCallCount] = useState(0);
  const [parseFailures, setParseFailures] = useState(0);

  const [pendingSkill, setPendingSkill] = useState(null);
  const [pendingOptions, setPendingOptions] = useState(null);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [diceLog, setDiceLog] = useState([]);

  const [portraitUrl, setPortraitUrl] = useState(null);
  const [portraitLoading, setPortraitLoading] = useState(false);
  const [portraitReady, setPortraitReady] = useState(false);
  const [moodLabel, setMoodLabel] = useState(null);
  const [visualMood, setVisualMood] = useState(null);
  const [introLoading, setIntroLoading] = useState(false);

  const scrollRef = useRef(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [history]);

  const historyText = () => {
    const recent = history.slice(-10);
    if (recent.length === 0) return "";
    return recent.map((h) => (h.role === "player" ? `Player: ${h.text}` : h.role === "npc" ? `NPC: ${h.text}` : `[${h.text}]`)).join("\n");
  };

  const applyDeltas = (rawDeltas, maxAbs) => {
    const clamped = {};
    let exceeded = false;
    for (const { key } of RELATIONSHIP_KEYS) {
      let d = rawDeltas[key] ?? 0;
      if (Math.abs(d) > maxAbs) exceeded = true;
      d = clampNum(d, -maxAbs, maxAbs);
      clamped[key] = d;
    }
    if (exceeded) setClampWarning(`Model returned a delta outside ±${maxAbs} — clamped.`);
    setLastDeltas(clamped);
    let nextRel = relationship;
    setRelationship((prev) => {
      const next = { ...prev };
      for (const { key } of RELATIONSHIP_KEYS) next[key] = clamp100(prev[key] + clamped[key]);
      nextRel = next;
      return next;
    });
    return clamped, nextRel;
  };

  const grantReward = (itemId, label) => {
    if (!itemId) return;
    setNpcInventory((inv) => {
      const item = inv.find((i) => i.id === itemId);
      if (!item) return inv;
      setPcInventory((pc) => addItem(pc, { ...item, qty: 1 }));
      pushSystem(`🎁 ${label}: received "${item.name}"`);
      const remaining = item.qty - 1;
      return remaining > 0 ? inv.map((i) => (i.id === itemId ? { ...i, qty: remaining } : i)) : inv.filter((i) => i.id !== itemId);
    });
  };

  const pushSystem = (text) => setHistory((h) => [...h, { role: "system", text }]);

  const checkStateObjectives = (rel) => {
    objectives.forEach((o) => {
      if (o.status !== "active" || o.type !== "state") return;
      const val = rel[o.attribute];
      const met = o.comparator === ">=" ? val >= o.threshold : val <= o.threshold;
      if (met) {
        setObjectives((list) => list.map((x) => (x.id === o.id ? { ...x, status: "complete" } : x)));
        pushSystem(`${o.role === "combat" ? "⚔" : "✓"} OBJECTIVE COMPLETE — ${o.label}: ${o.completionCue}`);
        if (o.rewardItemId) grantReward(o.rewardItemId, o.label);
      }
    });
  };

  const applyObjectiveUpdates = (updates) => {
    if (!updates || updates.length === 0) return;
    updates.forEach((u) => {
      if (!u.complete) return;
      const obj = objectives.find((o) => o.id === u.id && o.status === "active");
      if (!obj) return;
      setObjectives((list) => list.map((x) => (x.id === obj.id ? { ...x, status: "complete" } : x)));
      pushSystem(`${obj.role === "combat" ? "⚔" : "✓"} OBJECTIVE COMPLETE — ${obj.label}: ${obj.completionCue}`);
      if (obj.rewardItemId) grantReward(obj.rewardItemId, obj.label);
    });
  };

  const runNarrate = async (playerText, resolution) => {
    setLoading(true);
    setError(null);
    setClampWarning(null);
    const activeNarrative = objectives.filter((o) => o.status === "active" && o.type === "narrative");
    const systemPrompt = buildNarratePrompt(persona, coreValues, relationship, playerModel, historyText(), resolution, activeNarrative);
    try {
      const raw = await callClaude(systemPrompt, playerText);
      setLastRaw(raw);
      setCallCount((c) => c + 1);
      let parsed;
      try { parsed = parseModelJSON(raw); }
      catch (e) { setParseFailures((c) => c + 1); throw new Error("Model did not return valid JSON. See raw output below."); }
      setLastParsed(parsed);
      const clamped = {};
      const maxAbs = resolution ? 20 : 15;
      let exceeded = false;
      for (const { key } of RELATIONSHIP_KEYS) {
        let d = (parsed.state_deltas || {})[key] ?? 0;
        if (Math.abs(d) > maxAbs) exceeded = true;
        clamped[key] = clampNum(d, -maxAbs, maxAbs);
      }
      if (exceeded) setClampWarning(`Model returned a delta outside ±${maxAbs} — clamped.`);
      setLastDeltas(clamped);
      const nextRel = {};
      RELATIONSHIP_KEYS.forEach(({ key }) => (nextRel[key] = clamp100(relationship[key] + clamped[key])));
      setRelationship(nextRel);
      setHistory((h) => [...h, { role: "player", text: playerText }, { role: "npc", text: parsed.npc_dialogue || "(no dialogue returned)" }]);
      checkStateObjectives(nextRel);
      applyObjectiveUpdates(parsed.objective_updates);
      setInput("");
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const sendTurn = (overrideInput) => {
    const playerText = overrideInput ?? input;
    if (!playerText.trim() || loading) return;
    runNarrate(playerText, null);
  };

  const invokeSkill = async (skill) => {
    if (loading || optionsLoading) return;
    const intent = input.trim() || `get something from ${persona.split(/[.,\n]/)[0].replace(/^You are\s*/i, "")}`;
    setPendingSkill(skill);
    setPendingOptions(null);
    setOptionsLoading(true);
    setError(null);
    try {
      const dcInfoList = DC_TIERS.map((dc) => ({ dc }));
      const prompt = buildOptionsPrompt(skill.label, intent, persona, coreValues, relationship, playerModel, historyText(), dcInfoList);
      const raw = await callClaude(prompt, `Generate the 5 options for ${skill.label}.`);
      setCallCount((c) => c + 1);
      const parsed = parseModelJSON(raw);
      const sMod = stateDC(0, skill.key, relationship);
      const options = parsed.options.map((o) => {
        const alignment = o.value_alignment || "neutral";
        const vMod = VALUE_MOD[alignment] ?? 0;
        const effDC = clampNum(o.dc + sMod + vMod, 1, 30);
        return { dc: o.dc, text: o.text, effDC, stateMod: sMod, valueMod: vMod, valueAlignment: alignment };
      });
      setPendingOptions(options);
    } catch (e) {
      setParseFailures((c) => c + 1);
      setError("Could not generate skill options: " + (e.message || e));
      setPendingSkill(null);
    } finally {
      setOptionsLoading(false);
    }
  };

  const chooseOption = (opt) => {
    const skill = pendingSkill;
    const pcMod = skillModifier(pcSheet, skill.key);
    const roll = resolveCheck(pcMod, opt.effDC);
    const suggested = suggestedDelta(skill.key, opt.dc, roll.degree);
    const resolution = {
      skillLabel: skill.label, skillKey: skill.key, text: opt.text, dc: opt.dc,
      stateMod: opt.stateMod, valueMod: opt.valueMod, valueAlignment: opt.valueAlignment,
      effDC: opt.effDC, d20: roll.d20, pcMod, total: roll.total, degree: roll.degree, suggested,
    };
    setDiceLog((log) => [
      { id: Date.now(), skill: skill.label, dc: opt.dc, effDC: opt.effDC, d20: roll.d20, pcMod, total: roll.total, degree: roll.degree, attr: suggested.attr, delta: suggested.delta, valueAlignment: opt.valueAlignment },
      ...log,
    ]);
    setPendingSkill(null);
    setPendingOptions(null);
    runNarrate(opt.text, resolution);
  };

  const addItem = (list, item) => {
    const existing = list.find((i) => i.name === item.name);
    if (existing) return list.map((i) => (i.name === item.name ? { ...i, qty: i.qty + item.qty } : i));
    return [...list, item];
  };

  const giveItem = (item) => {
    setNpcInventory((inv) => {
      const remaining = item.qty - 1;
      return remaining > 0 ? inv.map((i) => (i.id === item.id ? { ...i, qty: remaining } : i)) : inv.filter((i) => i.id !== item.id);
    });
    setPcInventory((pc) => addItem(pc, { ...item, qty: 1 }));
    pushSystem(`🎒 Marta hands over "${item.name}".`);
  };

  const sellItem = (item) => {
    if (pcGold < item.value) return;
    setPcGold((g) => g - item.value);
    setNpcGold((g) => g + item.value);
    setNpcInventory((inv) => {
      const remaining = item.qty - 1;
      return remaining > 0 ? inv.map((i) => (i.id === item.id ? { ...i, qty: remaining } : i)) : inv.filter((i) => i.id !== item.id);
    });
    setPcInventory((pc) => addItem(pc, { ...item, qty: 1 }));
    pushSystem(`💰 Bought "${item.name}" for ${item.value}gp.`);
  };

  const stealItem = (item) => {
    const pcMod = skillModifier(pcSheet, "sleightOfHand");
    const passivePerception = passiveSkill(npcSheet, "perception");
    const roll = resolveCheck(pcMod, passivePerception);
    setDiceLog((log) => [
      { id: Date.now(), skill: "Steal (vs passive Perception)", dc: passivePerception, effDC: passivePerception, d20: roll.d20, pcMod, total: roll.total, degree: roll.degree, attr: SUCCESS_DEGREES.has(roll.degree) ? "unnoticed" : "trust", delta: SUCCESS_DEGREES.has(roll.degree) ? 0 : -15 },
      ...log,
    ]);
    if (SUCCESS_DEGREES.has(roll.degree)) {
      setNpcInventory((inv) => {
        const remaining = item.qty - 1;
        return remaining > 0 ? inv.map((i) => (i.id === item.id ? { ...i, qty: remaining } : i)) : inv.filter((i) => i.id !== item.id);
      });
      setPcInventory((pc) => addItem(pc, { ...item, qty: 1 }));
      pushSystem(`🤏 Slipped "${item.name}" away, unnoticed.`);
    } else {
      const resolution = {
        skillLabel: "Steal (caught)", skillKey: "intimidation", text: `attempting to steal the ${item.name}`,
        dc: passivePerception, stateMod: 0, valueMod: 0, effDC: passivePerception, d20: roll.d20, pcMod, total: roll.total,
        degree: roll.degree, suggested: { attr: "trust", delta: -14 },
      };
      runNarrate(`(caught attempting to steal the ${item.name})`, resolution);
    }
  };

  const generateIntro = async () => {
    setIntroLoading(true);
    setPortraitReady(false);
    setError(null);
    setPendingOptions(null);
    setPendingSkill(null);
    try {
      const prompt = buildIntroPrompt(persona, coreValues, appearance, relationship, playerModel);
      const raw = await callClaude(prompt, "Begin the introduction.");
      setCallCount((c) => c + 1);
      let parsed;
      try { parsed = parseModelJSON(raw); }
      catch (e) { setParseFailures((c) => c + 1); throw new Error("Intro call did not return valid JSON. See raw output below."); }
      setLastRaw(raw);
      setLastParsed(parsed);
      setMoodLabel(parsed.mood_label || null);
      setVisualMood(parsed.visual_mood || null);
      setHistory([{ role: "npc", text: parsed.npc_dialogue || "(no dialogue returned)" }]);
      setLastDeltas({});
      const url = buildPortraitUrl(appearance, parsed.visual_mood || parsed.mood_label || "neutral expression");
      setPortraitLoading(true);
      setPortraitUrl(url);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setIntroLoading(false);
    }
  };

  const regeneratePortrait = () => {
    if (!visualMood) return;
    setPortraitReady(false);
    setPortraitLoading(true);
    setPortraitUrl(buildPortraitUrl(appearance, visualMood));
  };

  const loadScenario = (s) => {
    setRelationship((prev) => ({ ...prev, ...s.relationship }));
    setInput(s.input);
    setError(null);
    setClampWarning(null);
    setPendingSkill(null);
    setPendingOptions(null);
  };

  const resetAll = () => {
    setRelationship({ trust: 50, patience: 50, suspicion: 50, respect: 50 });
    setPlayerModel({ honesty: 50, aggression: 50, curiosity: 50, generosity: 50 });
    setHistory([]);
    setLastDeltas({});
    setLastRaw(null);
    setLastParsed(null);
    setError(null);
    setClampWarning(null);
    setCallCount(0);
    setParseFailures(0);
    setPendingSkill(null);
    setPendingOptions(null);
    setDiceLog([]);
    setPortraitUrl(null);
    setPortraitReady(false);
    setMoodLabel(null);
    setVisualMood(null);
    setObjectives((list) => list.map((o) => ({ ...o, status: "active" })));
    setNpcInventory(DEFAULT_NPC_INVENTORY);
    setPcInventory([]);
    setNpcGold(40);
    setPcGold(15);
  };

  return (
    <div className="harness">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .harness { font-family: 'JetBrains Mono', ui-monospace, monospace; background: #14161a; color: #e8e6e1; min-height: 100vh; display: flex; flex-direction: column; }
        .topbar { padding: 14px 20px; border-bottom: 1px solid #262a33; display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
        .topbar h1 { font-size: 14px; letter-spacing: 0.12em; margin: 0; color: #7cffb2; font-weight: 700; }
        .topbar .sub { font-size: 11px; color: #8a8f98; }
        .stats { display: flex; gap: 16px; font-size: 11px; color: #8a8f98; }
        .stats b { color: #e8e6e1; }
        .layout { display: grid; grid-template-columns: 320px 1fr 320px; flex: 1; min-height: 0; }
        @media (max-width: 1100px) { .layout { grid-template-columns: 1fr; } }
        .panel { padding: 16px; border-right: 1px solid #262a33; overflow-y: auto; }
        .panel:last-child { border-right: none; }
        .panel-title { font-size: 10px; letter-spacing: 0.14em; color: #8a8f98; margin: 0 0 12px 0; font-weight: 700; }
        .section { margin-bottom: 22px; }
        .subhead { font-size: 9px; letter-spacing: 0.1em; color: #6b6f78; margin: 12px 0 6px; border-top: 1px solid #262a33; padding-top: 10px; }
        .tabs { display: flex; gap: 4px; margin-bottom: 16px; }
        .tab-btn { flex: 1; background: #1c1f26; border: 1px solid #2e323c; color: #8a8f98; padding: 7px; border-radius: 4px; font-family: inherit; font-size: 10.5px; letter-spacing: 0.08em; cursor: pointer; }
        .tab-btn.active { color: #7cffb2; border-color: #7cffb2; }
        textarea.persona { width: 100%; min-height: 70px; background: #1c1f26; border: 1px solid #2e323c; border-radius: 4px; color: #e8e6e1; font-family: inherit; font-size: 11px; padding: 10px; resize: vertical; line-height: 1.5; }
        textarea.persona:focus, input:focus, select:focus { outline: 1px solid #7cffb2; }
        .meter { margin-bottom: 14px; }
        .meter-head { display: flex; justify-content: space-between; font-size: 10px; letter-spacing: 0.06em; margin-bottom: 4px; }
        .meter-label { color: #8a8f98; }
        .meter-value { font-weight: 700; font-size: 11px; }
        .meter-delta { font-size: 10px; margin-left: 2px; }
        .meter-delta.up { color: #7cffb2; }
        .meter-delta.down { color: #ff8b7c; }
        .meter-track { position: relative; height: 8px; background: #1c1f26; border: 1px solid #2e323c; border-radius: 2px; overflow: hidden; margin-bottom: 2px; }
        .meter-fill { height: 100%; transition: width 0.3s ease; }
        .meter-tick { position: absolute; top: 0; bottom: 0; width: 1px; background: rgba(20,22,26,0.4); }
        .meter-slider { width: 100%; margin-top: 4px; accent-color: #7cffb2; }
        .statblock { background: #1a1c22; border: 1px solid #262a33; border-radius: 6px; padding: 12px; }
        .level-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
        .mini-field { display: flex; flex-direction: column; align-items: center; gap: 3px; font-size: 9px; color: #8a8f98; letter-spacing: 0.06em; width: 60px; }
        .mini-field input { width: 100%; background: #1c1f26; border: 1px solid #2e323c; border-radius: 4px; color: #e8e6e1; font-family: inherit; text-align: center; padding: 5px 0; font-size: 12px; }
        .prof-hint { font-size: 9px; color: #6b6f78; margin-left: 4px; }
        .ability-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 4px; }
        .ability { display: flex; flex-direction: column; align-items: center; gap: 3px; font-size: 9px; color: #8a8f98; letter-spacing: 0.06em; }
        .ability input { width: 100%; background: #1c1f26; border: 1px solid #2e323c; border-radius: 4px; color: #e8e6e1; font-family: inherit; text-align: center; padding: 5px 0; font-size: 12px; }
        .mod-chip { color: #7cffb2; font-size: 10px; font-weight: 700; }
        .combat-row { display: flex; gap: 8px; margin-top: 10px; }
        .combat-note { font-size: 8.5px; color: #565a63; margin-top: 4px; font-style: italic; }
        .save-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px 10px; }
        .save-row, .skill-row { display: flex; align-items: center; gap: 6px; font-size: 10px; }
        .save-row input, .skill-row input { accent-color: #7cffb2; }
        .save-name { flex: 1; color: #cfd3da; }
        .save-mod { color: #ffb86b; font-weight: 700; }
        .skill-list { display: flex; flex-direction: column; gap: 5px; max-height: 220px; overflow-y: auto; padding-right: 4px; }
        .skill-name { flex: 1; color: #cfd3da; font-size: 10px; }
        .skill-abil { color: #565a63; font-size: 8.5px; width: 22px; }
        .skill-mod { color: #ffb86b; font-weight: 700; font-size: 10px; width: 24px; text-align: right; }
        .passive-line { margin-top: 10px; padding-top: 10px; border-top: 1px solid #262a33; font-size: 9.5px; color: #8a8f98; }
        .passive-line b { color: #e8e6e1; }
        .scenario-btn { display: block; width: 100%; text-align: left; background: #1c1f26; border: 1px solid #2e323c; color: #e8e6e1; padding: 8px 10px; border-radius: 4px; font-family: inherit; font-size: 10.5px; margin-bottom: 6px; cursor: pointer; }
        .scenario-btn:hover { border-color: #7cffb2; }
        .scenario-btn .name { color: #ffb86b; font-weight: 700; }
        .scenario-btn .note { color: #8a8f98; display: block; margin-top: 2px; }
        .reset-btn { width: 100%; background: transparent; border: 1px solid #4a2e2e; color: #ff8b7c; padding: 8px; border-radius: 4px; font-family: inherit; font-size: 10.5px; cursor: pointer; margin-top: 6px; }
        .reset-btn:hover { background: #241818; }
        .convo { display: flex; flex-direction: column; height: 100%; }
        .intro-bar { padding: 10px 16px; border-bottom: 1px solid #262a33; display: flex; gap: 8px; }
        .intro-btn { flex: 1; background: #22301f; border: 1px solid #3e5c33; color: #a8e6c2; padding: 9px; border-radius: 4px; font-family: inherit; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; cursor: pointer; }
        .intro-btn:hover { border-color: #7cffb2; }
        .intro-btn:disabled { opacity: 0.5; cursor: default; }
        .inv-toggle-btn { background: #1c1f26; border: 1px solid #3a3f4a; color: #ffd66b; padding: 9px 12px; border-radius: 4px; font-family: inherit; font-size: 11px; cursor: pointer; white-space: nowrap; }
        .inv-toggle-btn:hover { border-color: #ffd66b; }
        .portrait-card { display: flex; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #262a33; align-items: flex-start; }
        .portrait-frame { width: 96px; height: 96px; border-radius: 6px; overflow: hidden; background: #1c1f26; border: 1px solid #2e323c; flex-shrink: 0; position: relative; }
        .portrait-frame img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .portrait-loading { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #565a63; text-align: center; padding: 6px; }
        .portrait-meta { flex: 1; }
        .mood-label { font-size: 10px; color: #8a8f98; letter-spacing: 0.06em; margin-bottom: 3px; }
        .mood-label b { color: #ffb86b; text-transform: uppercase; }
        .visual-mood-text { font-size: 10px; color: #6b6f78; line-height: 1.4; margin-bottom: 6px; }
        .regen-btn { background: none; border: 1px solid #3a3f4a; color: #8a8f98; padding: 4px 9px; border-radius: 4px; font-family: inherit; font-size: 9.5px; cursor: pointer; }
        .regen-btn:hover { border-color: #7cffb2; color: #7cffb2; }
        .transcript { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
        .bubble { max-width: 78%; padding: 9px 12px; border-radius: 6px; font-size: 12px; line-height: 1.5; }
        .bubble.npc { align-self: flex-start; background: #1c1f26; border: 1px solid #2e323c; }
        .bubble.player { align-self: flex-end; background: #1f2a24; border: 1px solid #2e4636; color: #d7ffe8; }
        .bubble.system { align-self: center; background: #241f18; border: 1px solid #4a3e2e; color: #ffd66b; font-size: 10.5px; max-width: 90%; text-align: center; }
        .bubble .role { font-size: 9px; letter-spacing: 0.1em; color: #8a8f98; margin-bottom: 4px; }
        .empty-state { margin: auto; text-align: center; color: #4a4e57; font-size: 11px; max-width: 320px; line-height: 1.6; }
        .choices { padding: 0 16px 8px; display: flex; flex-wrap: wrap; gap: 6px; }
        .choice-btn { background: #1c1f26; border: 1px solid #3a3f4a; color: #cfd3da; padding: 6px 10px; border-radius: 14px; font-family: inherit; font-size: 10.5px; cursor: pointer; }
        .choice-btn:hover { border-color: #7cffb2; color: #7cffb2; }
        .skill-panel { margin: 0 16px 10px; background: #1a1c22; border: 1px solid #2e323c; border-radius: 6px; padding: 10px; }
        .skill-panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .skill-panel-head span { font-size: 10px; letter-spacing: 0.08em; color: #8a8f98; }
        .cancel-link { background: none; border: none; color: #8a8f98; font-family: inherit; font-size: 10px; cursor: pointer; text-decoration: underline; }
        .option-row { display: flex; align-items: flex-start; gap: 8px; background: #1c1f26; border: 1px solid #2e323c; border-radius: 4px; padding: 8px 10px; margin-bottom: 6px; cursor: pointer; text-align: left; width: 100%; font-family: inherit; }
        .option-row:hover { border-color: #7cffb2; }
        .dc-badge { flex-shrink: 0; font-size: 9px; font-weight: 700; padding: 3px 6px; border-radius: 3px; color: #14161a; white-space: nowrap; margin-top: 1px; }
        .value-tag { flex-shrink: 0; font-size: 8px; font-weight: 700; padding: 3px 5px; border-radius: 3px; margin-top: 1px; white-space: nowrap; }
        .value-tag.aligned { background: #22301f; color: #7cffb2; border: 1px solid #3e5c33; }
        .value-tag.conflict { background: #2a1616; color: #ff8b7c; border: 1px solid #4a2e2e; }
        .option-text { font-size: 11.5px; color: #e8e6e1; line-height: 1.4; }
        .skill-invoke-row { display: flex; gap: 6px; padding: 0 16px 8px; flex-wrap: wrap; }
        .skill-invoke-btn { background: #1c1f26; border: 1px solid #3a3f4a; color: #ffb86b; padding: 6px 10px; border-radius: 4px; font-family: inherit; font-size: 10px; cursor: pointer; }
        .skill-invoke-btn:hover { border-color: #ffb86b; }
        .skill-invoke-btn:disabled { opacity: 0.4; cursor: default; }
        .input-row { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid #262a33; }
        .input-row input { flex: 1; background: #1c1f26; border: 1px solid #2e323c; border-radius: 4px; color: #e8e6e1; font-family: inherit; font-size: 12px; padding: 10px 12px; }
        .send-btn { background: #7cffb2; border: none; color: #0d1410; font-weight: 700; font-size: 11px; letter-spacing: 0.05em; padding: 0 18px; border-radius: 4px; cursor: pointer; }
        .send-btn:disabled { opacity: 0.4; cursor: default; }
        .error-banner { margin: 0 16px 8px; background: #2a1616; border: 1px solid #4a2e2e; color: #ff8b7c; padding: 8px 10px; border-radius: 4px; font-size: 10.5px; }
        .warn-banner { margin: 0 16px 8px; background: #2a2416; border: 1px solid #4a3e2e; color: #ffb86b; padding: 8px 10px; border-radius: 4px; font-size: 10.5px; }
        .debug-block { background: #1c1f26; border: 1px solid #2e323c; border-radius: 4px; padding: 10px; font-size: 10px; line-height: 1.6; color: #a8e6c2; white-space: pre-wrap; word-break: break-word; max-height: 160px; overflow-y: auto; }
        .debug-label { font-size: 9px; color: #8a8f98; letter-spacing: 0.08em; margin: 12px 0 6px; }
        .dice-entry { background: #1c1f26; border: 1px solid #2e323c; border-radius: 4px; padding: 8px 10px; margin-bottom: 6px; font-size: 10px; }
        .dice-entry-head { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .dice-skill { color: #ffb86b; font-weight: 700; }
        .dice-degree { font-weight: 700; }
        .dice-detail { color: #8a8f98; }
        .obj-status-card { background: #1c1f26; border: 1px solid #2e323c; border-radius: 4px; padding: 8px 10px; margin-bottom: 6px; }
        .obj-status-head { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
        .obj-status-name { font-size: 10.5px; color: #e8e6e1; }
        .obj-role-tag { font-size: 8px; padding: 2px 5px; border-radius: 3px; font-weight: 700; }
        .obj-cue { font-size: 9.5px; color: #6b6f78; margin-top: 4px; }
        .status-pill { font-size: 8px; font-weight: 700; padding: 2px 6px; border-radius: 8px; white-space: nowrap; }
        .status-pill.active { background: #2a2416; color: #ffb86b; }
        .status-pill.complete { background: #22301f; color: #7cffb2; }
        .obj-card { background: #1a1c22; border: 1px solid #262a33; border-radius: 6px; padding: 10px; margin-bottom: 10px; }
        .obj-head { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
        .obj-label { flex: 1; background: #1c1f26; border: 1px solid #2e323c; border-radius: 4px; color: #e8e6e1; font-family: inherit; font-size: 11px; padding: 5px 8px; }
        .obj-row { display: flex; gap: 6px; margin-bottom: 6px; }
        .obj-select { flex: 1; background: #1c1f26; border: 1px solid #2e323c; border-radius: 4px; color: #cfd3da; font-family: inherit; font-size: 9.5px; padding: 5px; }
        .obj-select-sm { width: 44px; background: #1c1f26; border: 1px solid #2e323c; border-radius: 4px; color: #cfd3da; font-family: inherit; font-size: 9.5px; padding: 5px; }
        .obj-num { width: 54px; background: #1c1f26; border: 1px solid #2e323c; border-radius: 4px; color: #e8e6e1; font-family: inherit; font-size: 10px; padding: 5px; text-align: center; }
        .obj-desc { width: 100%; background: #1c1f26; border: 1px solid #2e323c; border-radius: 4px; color: #cfd3da; font-family: inherit; font-size: 10px; padding: 6px 8px; margin-bottom: 6px; resize: vertical; min-height: 34px; }
        .obj-actions { display: flex; justify-content: flex-end; gap: 6px; }
        .mini-btn { background: none; border: 1px solid #3a3f4a; color: #8a8f98; padding: 3px 8px; border-radius: 3px; font-family: inherit; font-size: 9px; cursor: pointer; }
        .mini-btn:hover { border-color: #7cffb2; color: #7cffb2; }
        .mini-btn.danger:hover { border-color: #ff8b7c; color: #ff8b7c; }
        .add-btn { width: 100%; background: transparent; border: 1px dashed #3a3f4a; color: #8a8f98; padding: 8px; border-radius: 4px; font-family: inherit; font-size: 10px; cursor: pointer; }
        .add-btn:hover { border-color: #7cffb2; color: #7cffb2; }
        .item-row { display: flex; align-items: center; gap: 5px; margin-bottom: 6px; }
        .item-name { flex: 1; background: #1c1f26; border: 1px solid #2e323c; border-radius: 4px; color: #e8e6e1; font-family: inherit; font-size: 10.5px; padding: 5px 7px; }
        .item-num { width: 42px; background: #1c1f26; border: 1px solid #2e323c; border-radius: 4px; color: #cfd3da; font-family: inherit; font-size: 10px; padding: 5px; text-align: center; }
        .item-quest { display: flex; align-items: center; gap: 2px; font-size: 9px; color: #ffb86b; }
        .inventory-panel { margin: 0 16px 10px; background: #1a1c22; border: 1px solid #2e323c; border-radius: 6px; padding: 10px; }
        .inventory-panel-head { display: flex; justify-content: space-between; font-size: 10px; color: #8a8f98; margin-bottom: 8px; letter-spacing: 0.06em; }
        .inv-item-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #262a33; }
        .inv-item-row:last-child { border-bottom: none; }
        .inv-item-name { flex: 1; font-size: 11px; color: #e8e6e1; }
        .inv-item-value { font-size: 9.5px; color: #6b6f78; width: 44px; }
        .inv-action-btn { background: #1c1f26; border: 1px solid #3a3f4a; color: #cfd3da; padding: 4px 8px; border-radius: 4px; font-family: inherit; font-size: 9px; cursor: pointer; }
        .inv-action-btn:hover { border-color: #7cffb2; color: #7cffb2; }
        .inv-action-btn:disabled { opacity: 0.35; cursor: default; }
        .inv-action-btn.steal:hover { border-color: #ff8b7c; color: #ff8b7c; }
      `}</style>

      <div className="topbar">
        <div>
          <h1>NPC STATE HARNESS</h1>
          <div className="sub">stat blocks · skill checks · objectives · inventory · portraits</div>
        </div>
        <div className="stats">
          <span>calls: <b>{callCount}</b></span>
          <span>parse failures: <b style={{ color: parseFailures ? "#ff8b7c" : "#e8e6e1" }}>{parseFailures}</b></span>
        </div>
      </div>

      <div className="layout">
        {/* LEFT: NPC / PC tabs */}
        <div className="panel">
          <div className="tabs">
            <button className={`tab-btn ${leftTab === "npc" ? "active" : ""}`} onClick={() => setLeftTab("npc")}>NPC</button>
            <button className={`tab-btn ${leftTab === "pc" ? "active" : ""}`} onClick={() => setLeftTab("pc")}>PC</button>
          </div>

          {leftTab === "npc" ? (
            <>
              <div className="section">
                <p className="panel-title">PERSONA (fixed)</p>
                <textarea className="persona" value={persona} onChange={(e) => setPersona(e.target.value)} />
              </div>
              <div className="section">
                <p className="panel-title">CORE VALUES</p>
                <textarea className="persona" value={coreValues} onChange={(e) => setCoreValues(e.target.value)} style={{ minHeight: 60 }} />
              </div>
              <div className="section">
                <p className="panel-title">APPEARANCE (for portraits)</p>
                <textarea className="persona" value={appearance} onChange={(e) => setAppearance(e.target.value)} style={{ minHeight: 60 }} />
              </div>
              <div className="section">
                <p className="panel-title">RELATIONSHIP STATE</p>
                {RELATIONSHIP_KEYS.map(({ key, label }) => (
                  <Meter key={key} label={label} value={relationship[key]} delta={lastDeltas[key]} accent={key === "suspicion" ? "#ff8b7c" : "#7cffb2"} onChange={(v) => setRelationship((prev) => ({ ...prev, [key]: v }))} />
                ))}
              </div>
              <ObjectiveEditor objectives={objectives} setObjectives={setObjectives} inventory={npcInventory} />
              <InventoryEditor inventory={npcInventory} setInventory={setNpcInventory} gold={npcGold} setGold={setNpcGold} title="NPC INVENTORY" />
              <div className="section">
                <StatBlock sheet={npcSheet} setSheet={setNpcSheet} title="NPC STAT BLOCK" />
              </div>
            </>
          ) : (
            <>
              <div className="section">
                <p className="panel-title">PLAYER MODEL</p>
                {PLAYER_MODEL_KEYS.map(({ key, label }) => (
                  <Meter key={key} label={label} value={playerModel[key]} accent="#ffb86b" onChange={(v) => setPlayerModel((prev) => ({ ...prev, [key]: v }))} />
                ))}
              </div>
              <div className="section">
                <p className="panel-title">PC INVENTORY</p>
                <div className="mini-field" style={{ marginBottom: 10 }}><span>GOLD</span><input type="number" value={pcGold} onChange={(e) => setPcGold(clampNum(Number(e.target.value), 0, 999999))} /></div>
                {pcInventory.length === 0 && <div className="debug-block">(empty — give, buy, or steal items from the NPC in play)</div>}
                {pcInventory.map((it) => (
                  <div key={it.id} className="inv-item-row">
                    <span className="inv-item-name">{it.name}{it.qty > 1 ? ` ×${it.qty}` : ""}</span>
                    <span className="inv-item-value">{it.value}gp</span>
                  </div>
                ))}
              </div>
              <div className="section">
                <StatBlock sheet={pcSheet} setSheet={setPcSheet} title="PC CHARACTER SHEET" />
              </div>
            </>
          )}
        </div>

        {/* CENTER: conversation */}
        <div className="panel convo" style={{ padding: 0 }}>
          <div className="intro-bar">
            <button className="intro-btn" onClick={generateIntro} disabled={introLoading || loading}>{introLoading ? "GENERATING…" : "▶ NEW INTRODUCTION"}</button>
            <button className="inv-toggle-btn" onClick={() => setShowInventoryPanel((v) => !v)}>🎒 {npcInventory.length}</button>
          </div>

          {(portraitUrl || introLoading) && (
            <div className="portrait-card">
              <div className="portrait-frame">
                {portraitUrl && <img src={portraitUrl} alt="NPC portrait" onLoad={() => { setPortraitLoading(false); setPortraitReady(true); }} onError={() => { setPortraitLoading(false); setPortraitReady(false); }} style={{ display: portraitReady ? "block" : "none" }} />}
                {(portraitLoading || !portraitReady) && <div className="portrait-loading">{portraitLoading ? "rendering…" : "no portrait"}</div>}
              </div>
              <div className="portrait-meta">
                {moodLabel && <div className="mood-label">mood: <b>{moodLabel}</b></div>}
                {visualMood && <div className="visual-mood-text">{visualMood}</div>}
                {visualMood && <button className="regen-btn" onClick={regeneratePortrait}>↻ regenerate art</button>}
              </div>
            </div>
          )}

          {showInventoryPanel && (
            <div className="inventory-panel">
              <div className="inventory-panel-head"><span>NPC HOLDS ({npcGold}gp)</span><span>YOU HAVE {pcGold}gp</span></div>
              {npcInventory.length === 0 && <div className="debug-block">(NPC inventory is empty)</div>}
              {npcInventory.map((it) => (
                <div key={it.id} className="inv-item-row">
                  <span className="inv-item-name">{it.name}{it.qty > 1 ? ` ×${it.qty}` : ""}{it.questItem ? " ★" : ""}</span>
                  <span className="inv-item-value">{it.value > 0 ? `${it.value}gp` : "—"}</span>
                  <button className="inv-action-btn" onClick={() => giveItem(it)}>give</button>
                  <button className="inv-action-btn" onClick={() => sellItem(it)} disabled={it.value === 0 || pcGold < it.value}>sell</button>
                  <button className="inv-action-btn steal" onClick={() => stealItem(it)} disabled={loading}>steal</button>
                </div>
              ))}
            </div>
          )}

          <div className="transcript" ref={scrollRef}>
            {history.length === 0 && !introLoading && (
              <div className="empty-state">Click "New Introduction" to open the scene with a mood-matched portrait, or just type a line and hit Send.</div>
            )}
            {history.map((h, i) => (
              <div key={i} className={`bubble ${h.role}`}>
                {h.role !== "system" && <div className="role">{h.role === "npc" ? "NPC" : "PLAYER"}</div>}
                {h.text}
              </div>
            ))}
            {loading && <div className="bubble npc"><div className="role">NPC</div>…</div>}
          </div>

          {error && <div className="error-banner">ERROR: {error}</div>}
          {clampWarning && <div className="warn-banner">{clampWarning}</div>}

          {optionsLoading && <div className="skill-panel"><div className="skill-panel-head"><span>ROLLING UP {pendingSkill?.label.toUpperCase()} OPTIONS…</span></div></div>}

          {pendingOptions && (
            <div className="skill-panel">
              <div className="skill-panel-head">
                <span>{pendingSkill.label.toUpperCase()} — choose your phrasing</span>
                <button className="cancel-link" onClick={() => { setPendingOptions(null); setPendingSkill(null); }}>cancel</button>
              </div>
              {pendingOptions.map((opt, i) => (
                <button key={i} className="option-row" onClick={() => chooseOption(opt)} disabled={loading}>
                  <span className="dc-badge" style={{ background: DC_TIER_COLOR[opt.dc] }}>DC {opt.dc !== opt.effDC ? `${opt.dc}→${opt.effDC}` : opt.dc}</span>
                  {opt.valueAlignment !== "neutral" && <span className={`value-tag ${opt.valueAlignment}`}>{opt.valueAlignment === "aligned" ? "VALUES ✓" : "VALUES ✗"}</span>}
                  <span className="option-text">{opt.text}</span>
                </button>
              ))}
            </div>
          )}

          {!pendingOptions && lastParsed?.player_choices?.length > 0 && (
            <div className="choices">
              {lastParsed.player_choices.map((c, i) => <button key={i} className="choice-btn" onClick={() => sendTurn(c.text)} disabled={loading}>{c.text}</button>)}
            </div>
          )}

          <div className="skill-invoke-row">
            {SOCIAL_SKILLS.map((s) => (
              <button key={s.key} className="skill-invoke-btn" onClick={() => invokeSkill(s)} disabled={loading || optionsLoading} title={`PC modifier: ${fmtMod(skillModifier(pcSheet, s.key))}`}>{s.label} ({fmtMod(skillModifier(pcSheet, s.key))})</button>
            ))}
          </div>

          <div className="input-row">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendTurn()} placeholder="Type a line, or a goal then pick a skill…" disabled={loading} />
            <button className="send-btn" onClick={() => sendTurn()} disabled={loading || !input.trim()}>SEND</button>
          </div>
        </div>

        {/* RIGHT: objectives + scenarios + dice log + debug */}
        <div className="panel">
          <div className="section">
            <p className="panel-title">OBJECTIVE STATUS</p>
            {objectives.map((o) => (
              <div key={o.id} className="obj-status-card">
                <div className="obj-status-head">
                  <span className="obj-role-tag" style={{ background: ROLE_COLOR[o.role] + "22", color: ROLE_COLOR[o.role] }}>{ROLE_LABEL[o.role]}</span>
                  <span className="obj-status-name" style={{ flex: 1 }}>{o.label}</span>
                  <span className={`status-pill ${o.status}`}>{o.status === "complete" ? "✓" : "…"}</span>
                </div>
                {o.status === "complete" && <div className="obj-cue">{o.action}</div>}
              </div>
            ))}
          </div>

          <div className="section">
            <p className="panel-title">TEST SCENARIOS</p>
            {SCENARIOS.map((s) => (
              <button key={s.name} className="scenario-btn" onClick={() => loadScenario(s)}>
                <span className="name">{s.name}</span>
                <span className="note">{s.note}</span>
              </button>
            ))}
            <button className="reset-btn" onClick={resetAll}>RESET ALL STATE</button>
          </div>

          <div className="section">
            <p className="panel-title">DICE LOG</p>
            {diceLog.length === 0 && <div className="debug-block">(no rolls yet)</div>}
            {diceLog.map((r) => (
              <div key={r.id} className="dice-entry">
                <div className="dice-entry-head">
                  <span className="dice-skill">{r.skill}</span>
                  <span className="dice-degree" style={{ color: DEGREE_COLOR[r.degree] }}>{DEGREE_LABEL[r.degree] || r.degree}</span>
                </div>
                <div className="dice-detail">d20({r.d20}) + {fmtMod(r.pcMod)} = {r.total} vs DC {r.effDC}{r.valueAlignment && r.valueAlignment !== "neutral" ? ` · values ${r.valueAlignment}` : ""}</div>
                <div className="dice-detail">{r.attr}: {r.delta > 0 ? "+" : ""}{r.delta}</div>
              </div>
            ))}
          </div>

          <div className="section">
            <p className="panel-title">DEBUG</p>
            {lastParsed?.delta_reason && (<><div className="debug-label">DELTA REASON</div><div className="debug-block">{lastParsed.delta_reason}</div></>)}
            <div className="debug-label">RAW RESPONSE</div>
            <div className="debug-block">{lastRaw || "(no calls yet)"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
