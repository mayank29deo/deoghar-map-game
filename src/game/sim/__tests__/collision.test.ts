import { describe, expect, it } from "vitest";
import { LotIndex, resolveCircleVsLots } from "../collision";
import type { Lot } from "../../world/types";

const lot = (x: number, z: number, rotY = 0): Lot => ({ x, z, rotY, w: 8, d: 6, h: 6, colorIdx: 0, shop: false });

describe("resolveCircleVsLots", () => {
  it("pushes a penetrating circle out of an axis-aligned lot", () => {
    const lots = [lot(0, 0)];
    const idx = new LotIndex(lots);
    const r = resolveCircleVsLots(4.5, 0, 1.0, lots, idx); // box half-w 4, circle pen 0.5
    expect(r.hit).toBe(true);
    expect(r.x).toBeGreaterThanOrEqual(5.0 - 1e-6);
  });
  it("leaves a clear circle untouched", () => {
    const lots = [lot(0, 0)];
    const idx = new LotIndex(lots);
    const r = resolveCircleVsLots(20, 20, 1.0, lots, idx);
    expect(r.hit).toBe(false);
    expect(r.x).toBe(20);
  });
  it("respects lot rotation", () => {
    const lots = [lot(0, 0, Math.PI / 2)]; // w8 d6 rotated: now extends ±3 in x, ±4 in z
    const idx = new LotIndex(lots);
    expect(resolveCircleVsLots(3.5, 0, 1.0, lots, idx).hit).toBe(true);
    expect(resolveCircleVsLots(4.5, 0, 1.0, lots, idx).hit).toBe(false);
  });
});
