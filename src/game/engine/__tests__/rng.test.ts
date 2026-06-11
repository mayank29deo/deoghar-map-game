import { describe, expect, it } from "vitest";
import { mulberry32 } from "../rng";

describe("mulberry32", () => {
  it("is deterministic for a seed", () => {
    const a = mulberry32(814112), b = mulberry32(814112);
    const seqA = [a(), a(), a()], seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });
  it("differs across seeds", () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
  it("stays in [0,1)", () => {
    const r = mulberry32(99);
    for (let i = 0; i < 1000; i++) { const v = r(); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); }
  });
});
