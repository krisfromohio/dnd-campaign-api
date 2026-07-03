import { describe, it, expect, vi } from "vitest";
import {
  clampNum,
  clamp100,
  abilityMod,
  fmtMod,
  PROF_BY_LEVEL,
  skillModifier,
  saveModifier,
  passiveSkill,
  stateDC,
  computeEffectiveDC,
  computeDegree,
  resolveCheck,
  suggestedDelta,
  tagChoicesWithDC,
  parseModelJSON,
  addItem,
  objectiveConditionMet,
} from "./App.jsx";

// A minimal fixture sheet — just enough shape for skillModifier/saveModifier/passiveSkill.
function makeSheet(overrides = {}) {
  return {
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 14, cha: 16 },
    proficiencyBonus: 3,
    skillProficiencies: { persuasion: true, deception: false, intimidation: false, performance: false, perception: true, insight: false },
    saveProficiencies: { cha: true, wis: false, str: false, dex: false, con: false, int: false },
    ...overrides,
  };
}

const neutralRel = { trust: 50, patience: 50, suspicion: 50, respect: 50 };

describe("clampNum", () => {
  it("passes through values already in range", () => {
    expect(clampNum(5, 0, 10)).toBe(5);
  });
  it("clamps below the floor", () => {
    expect(clampNum(-5, 0, 10)).toBe(0);
  });
  it("clamps above the ceiling", () => {
    expect(clampNum(50, 0, 10)).toBe(10);
  });
  it("is inclusive at exact boundaries", () => {
    expect(clampNum(0, 0, 10)).toBe(0);
    expect(clampNum(10, 0, 10)).toBe(10);
  });
});

describe("clamp100", () => {
  it("rounds before clamping", () => {
    expect(clamp100(49.6)).toBe(50);
  });
  it("clamps negative deltas to 0", () => {
    expect(clamp100(-15)).toBe(0);
  });
  it("clamps above 100", () => {
    expect(clamp100(140)).toBe(100);
  });
});

describe("abilityMod", () => {
  it.each([
    [1, -5], [8, -1], [9, -1], [10, 0], [11, 0], [12, 1], [14, 2], [16, 3], [20, 5],
  ])("score %i -> modifier %i", (score, expected) => {
    expect(abilityMod(score)).toBe(expected);
  });
});

describe("fmtMod", () => {
  it("prefixes positive with +", () => expect(fmtMod(3)).toBe("+3"));
  it("prefixes zero with +", () => expect(fmtMod(0)).toBe("+0"));
  it("leaves negative as-is", () => expect(fmtMod(-2)).toBe("-2"));
});

describe("PROF_BY_LEVEL", () => {
  it.each([
    [1, 2], [4, 2], [5, 3], [8, 3], [9, 4], [12, 4], [13, 5], [16, 5], [17, 6], [20, 6],
  ])("level %i -> +%i", (level, expected) => {
    expect(PROF_BY_LEVEL(level)).toBe(expected);
  });
});

describe("skillModifier / saveModifier / passiveSkill", () => {
  const sheet = makeSheet();
  it("adds proficiency bonus when proficient", () => {
    // persuasion is CHA (mod +3) and proficient (prof +3) -> +6
    expect(skillModifier(sheet, "persuasion")).toBe(6);
  });
  it("omits proficiency bonus when not proficient", () => {
    // deception is CHA (mod +3), not proficient -> +3
    expect(skillModifier(sheet, "deception")).toBe(3);
  });
  it("computes saving throws the same way", () => {
    // CHA save, proficient: +3 + 3 = +6
    expect(saveModifier(sheet, "cha")).toBe(6);
    // WIS save, not proficient: +2
    expect(saveModifier(sheet, "wis")).toBe(2);
  });
  it("passive skill is 10 + modifier", () => {
    // perception is WIS (mod +2), proficient (+3) -> +5 -> passive 15
    expect(passiveSkill(sheet, "perception")).toBe(15);
  });
});

describe("stateDC", () => {
  it("returns 0 modifier at neutral relationship state", () => {
    expect(stateDC("persuasion", neutralRel)).toBe(0);
  });
  it("makes persuasion easier as trust rises (negative modifier = lower DC)", () => {
    expect(stateDC("persuasion", { ...neutralRel, trust: 100 })).toBe(-5);
  });
  it("makes persuasion harder as trust falls", () => {
    expect(stateDC("persuasion", { ...neutralRel, trust: 0 })).toBe(5);
  });
  it("makes intimidation easier as patience drops", () => {
    expect(stateDC("intimidation", { ...neutralRel, patience: 0 })).toBe(-5);
  });
  it("clamps the modifier to +/-5 even at extreme inputs", () => {
    const mod = stateDC("deception", { ...neutralRel, suspicion: 100 });
    expect(mod).toBeLessThanOrEqual(5);
    expect(mod).toBeGreaterThanOrEqual(-5);
  });
  it("returns 0 for a skill with no defined state modifier", () => {
    expect(stateDC("athletics", neutralRel)).toBe(0);
  });
});

describe("computeEffectiveDC", () => {
  it("equals base DC at neutral state and neutral value alignment", () => {
    const { effDC, stateMod, valueMod } = computeEffectiveDC("persuasion", 15, neutralRel, "neutral");
    expect(effDC).toBe(15);
    expect(stateMod).toBe(0);
    expect(valueMod).toBe(0);
  });
  it("lowers DC for values-aligned approaches", () => {
    const { effDC } = computeEffectiveDC("persuasion", 15, neutralRel, "aligned");
    expect(effDC).toBe(12);
  });
  it("raises DC for values-conflicting approaches", () => {
    const { effDC } = computeEffectiveDC("persuasion", 15, neutralRel, "conflict");
    expect(effDC).toBe(18);
  });
  it("combines state and value modifiers, clamped to [1, 30]", () => {
    // trust 100 (-5 state) + conflict (+3 value) on a DC 5 ask -> 5 - 5 + 3 = 3
    const { effDC } = computeEffectiveDC("persuasion", 5, { ...neutralRel, trust: 100 }, "conflict");
    expect(effDC).toBe(3);
  });
  it("never returns a DC below 1", () => {
    const { effDC } = computeEffectiveDC("persuasion", 5, { ...neutralRel, trust: 100 }, "aligned");
    expect(effDC).toBeGreaterThanOrEqual(1);
  });
});

describe("computeDegree", () => {
  it("natural 20 is always a critical success, even against a huge total", () => {
    expect(computeDegree(20, 5, 25)).toBe("crit_success");
  });
  it("natural 1 is always a critical failure, even with a big modifier", () => {
    expect(computeDegree(1, 30, 10)).toBe("crit_fail");
  });
  it("margin >= 10 (non-nat20) is a strong success", () => {
    expect(computeDegree(15, 25, 15)).toBe("strong_success");
  });
  it("margin exactly 0 is a plain success, not a failure", () => {
    expect(computeDegree(10, 15, 15)).toBe("success");
  });
  it("margin -1 through -4 is a marginal failure", () => {
    expect(computeDegree(10, 11, 15)).toBe("marginal_fail");
  });
  it("margin exactly -5 is a strong failure, not marginal", () => {
    expect(computeDegree(10, 10, 15)).toBe("strong_fail");
  });
  it("margin -9 is a strong failure", () => {
    expect(computeDegree(10, 6, 15)).toBe("strong_fail");
  });
});

describe("resolveCheck", () => {
  it("d20 is always within [1, 20]", () => {
    for (let i = 0; i < 200; i++) {
      const { d20 } = resolveCheck(3, 15);
      expect(d20).toBeGreaterThanOrEqual(1);
      expect(d20).toBeLessThanOrEqual(20);
    }
  });
  it("total always equals d20 + modifier", () => {
    const { d20, total } = resolveCheck(4, 15);
    expect(total).toBe(d20 + 4);
  });
  it("degree is internally consistent with computeDegree on the same roll", () => {
    const pcMod = -2;
    const effDC = 12;
    const { d20, total, degree } = resolveCheck(pcMod, effDC);
    expect(degree).toBe(computeDegree(d20, total, effDC));
  });
  it("forcing a natural 20 via a mocked roll always yields crit_success", () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.99); // -> floor(0.99*20)=19 -> d20=20
    const { d20, degree } = resolveCheck(-10, 25); // huge negative mod, high DC
    expect(d20).toBe(20);
    expect(degree).toBe("crit_success");
    spy.mockRestore();
  });
  it("forcing a natural 1 via a mocked roll always yields crit_fail", () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0); // -> floor(0*20)=0 -> d20=1
    const { d20, degree } = resolveCheck(10, 5); // huge positive mod, low DC
    expect(d20).toBe(1);
    expect(degree).toBe("crit_fail");
    spy.mockRestore();
  });
});

describe("suggestedDelta", () => {
  it("is positive on the success attribute for a success", () => {
    const { attr, delta } = suggestedDelta("persuasion", 15, "success");
    expect(attr).toBe("trust");
    expect(delta).toBeGreaterThan(0);
  });
  it("is negative on the fail attribute for a failure", () => {
    const { attr, delta } = suggestedDelta("persuasion", 15, "strong_fail");
    expect(attr).toBe("trust");
    expect(delta).toBeLessThan(0);
  });
  it("scales up with DC tier at the same degree", () => {
    const low = suggestedDelta("persuasion", 5, "success");
    const high = suggestedDelta("persuasion", 25, "success");
    expect(Math.abs(high.delta)).toBeGreaterThan(Math.abs(low.delta));
  });
  it("never exceeds +/-20 even at DC 25 critical", () => {
    const { delta } = suggestedDelta("persuasion", 25, "crit_success");
    expect(Math.abs(delta)).toBeLessThanOrEqual(20);
  });
  it("intimidation success moves patience down (compliance under duress), not up", () => {
    const { attr, delta } = suggestedDelta("intimidation", 15, "success");
    expect(attr).toBe("patience");
    expect(delta).toBeLessThan(0);
  });
});

describe("tagChoicesWithDC", () => {
  it("leaves effDC null for choices with no skill tagged", () => {
    const tagged = tagChoicesWithDC([{ text: "Hello there.", skill: null, dc: null }], neutralRel);
    expect(tagged[0].effDC).toBeNull();
  });
  it("computes effDC for a tagged choice", () => {
    const tagged = tagChoicesWithDC(
      [{ text: "Come on, help me out.", skill: "persuasion", dc: 15, value_alignment: "neutral" }],
      neutralRel
    );
    expect(tagged[0].effDC).toBe(15);
    expect(tagged[0].skill).toBe("persuasion");
  });
  it("ignores an unrecognized skill key rather than throwing", () => {
    const tagged = tagChoicesWithDC([{ text: "???", skill: "juggling", dc: 15 }], neutralRel);
    expect(tagged[0].effDC).toBeNull();
  });
  it("handles an empty or missing choices array", () => {
    expect(tagChoicesWithDC(undefined, neutralRel)).toEqual([]);
    expect(tagChoicesWithDC([], neutralRel)).toEqual([]);
  });
});

describe("addItem", () => {
  it("adds a new item to an empty list", () => {
    const result = addItem([], { name: "Rope", qty: 1, value: 1 });
    expect(result).toEqual([{ name: "Rope", qty: 1, value: 1 }]);
  });
  it("combines quantity when an item of the same name already exists", () => {
    const result = addItem([{ name: "Rum", qty: 2, value: 8 }], { name: "Rum", qty: 1, value: 8 });
    expect(result).toEqual([{ name: "Rum", qty: 3, value: 8 }]);
  });
  it("does not mutate the original list", () => {
    const original = [{ name: "Rum", qty: 2, value: 8 }];
    addItem(original, { name: "Rum", qty: 1, value: 8 });
    expect(original[0].qty).toBe(2);
  });
  it("treats items with different names as distinct rows", () => {
    const result = addItem([{ name: "Rum", qty: 1, value: 8 }], { name: "Compass", qty: 1, value: 25 });
    expect(result).toHaveLength(2);
  });
});

describe("objectiveConditionMet", () => {
  const rel = { trust: 70, patience: 20, suspicion: 15, respect: 55 };
  it("evaluates >= correctly", () => {
    expect(objectiveConditionMet({ attribute: "trust", comparator: ">=", threshold: 70 }, rel)).toBe(true);
    expect(objectiveConditionMet({ attribute: "trust", comparator: ">=", threshold: 71 }, rel)).toBe(false);
  });
  it("evaluates <= correctly", () => {
    expect(objectiveConditionMet({ attribute: "suspicion", comparator: "<=", threshold: 15 }, rel)).toBe(true);
    expect(objectiveConditionMet({ attribute: "suspicion", comparator: "<=", threshold: 14 }, rel)).toBe(false);
  });
  it("reads the correct attribute off the relationship object", () => {
    expect(objectiveConditionMet({ attribute: "respect", comparator: ">=", threshold: 55 }, rel)).toBe(true);
    expect(objectiveConditionMet({ attribute: "patience", comparator: ">=", threshold: 55 }, rel)).toBe(false);
  });
});

describe("parseModelJSON", () => {
  it("parses plain JSON", () => {
    expect(parseModelJSON('{"a":1}')).toEqual({ a: 1 });
  });
  it("strips markdown code fences", () => {
    expect(parseModelJSON('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
  it("trims surrounding whitespace", () => {
    expect(parseModelJSON('   {"a":1}   \n')).toEqual({ a: 1 });
  });
  it("throws on genuinely malformed JSON, rather than silently returning garbage", () => {
    expect(() => parseModelJSON("not json at all")).toThrow();
  });
});
