import { describe, expect, it } from "vitest";
import { comboMult, parSeconds, payout } from "../scoring";

describe("comboMult", () => {
  it("starts at 1.0 and steps +0.25", () => {
    expect(comboMult(1)).toBe(1);
    expect(comboMult(2)).toBe(1.25);
    expect(comboMult(5)).toBe(2);
  });
  it("caps at 3.0", () => {
    expect(comboMult(9)).toBe(3);
    expect(comboMult(50)).toBe(3);
  });
});

describe("payout", () => {
  it("computes base + distance, rounded to ₹5", () => {
    // 800 m: est 1.12 km → 40 + 28 = 68 → round5 = 70
    expect(payout({ distM: 800, vehicleMult: 1, combo: 1, withinPar: false })).toBe(70);
  });
  it("applies speed bonus, vehicle and combo multipliers", () => {
    // 1000 m: est 1.4 km → base 75 + 30 = 105; ×1.3 ×2 = 273 → 275
    expect(payout({ distM: 1000, vehicleMult: 1.3, combo: 2, withinPar: true })).toBe(275);
  });
});

describe("parSeconds", () => {
  it("gives a reachable but tight window", () => {
    const p = parSeconds(800, 16); // scooty
    expect(p).toBeGreaterThan(30);
    expect(p).toBeLessThan(180);
  });
});
