import { describe, expect, it } from "vitest";
import { ribbonPositions } from "../roadMesh";

describe("ribbonPositions", () => {
  it("emits 6 vertices (2 tris) per segment, offset by half width", () => {
    const pts: [number, number][] = [[0, 0], [10, 0], [20, 0]];
    const pos = ribbonPositions(pts, 4, 0.02);
    expect(pos.length).toBe(2 * 6 * 3); // 2 segments × 6 verts × xyz
    for (let i = 0; i < pos.length; i += 3) {
      expect(Number.isFinite(pos[i])).toBe(true);
      expect(pos[i + 1]).toBeCloseTo(0.02);
      expect(Math.abs(pos[i + 2])).toBeCloseTo(2, 5); // straight east-west road: z = ±width/2
    }
  });
  it("returns empty for degenerate polylines", () => {
    expect(ribbonPositions([[0, 0]], 4, 0).length).toBe(0);
  });
});
