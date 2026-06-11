import { describe, expect, it } from "vitest";
import { mulberry32 } from "../../engine/rng";
import { generateOffer, near } from "../missions";
import type { MapData } from "../../world/types";

function gridMap(): MapData {
  // nodes every 100 m in a 9×9 grid, no POIs → node fallback path
  const nodes = [];
  for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) nodes.push({ x: i * 100, z: j * 100 });
  return { meta: { bbox: [], origin: { lat: 0, lon: 0 }, generated: "" }, nodes, edges: [], pois: [], buildings: [], water: [], landmarks: [] };
}

describe("generateOffer", () => {
  it("respects distance bands (pickup 150-600 from player, drop 300-1500 from pickup)", () => {
    const map = gridMap();
    const rng = mulberry32(7);
    for (let i = 0; i < 20; i++) {
      const o = generateOffer(map, 0, 0, rng, 1, i);
      const dPickup = Math.hypot(o.pickup.x, o.pickup.z);
      const dDrop = Math.hypot(o.drop.x - o.pickup.x, o.drop.z - o.pickup.z);
      expect(dPickup).toBeGreaterThanOrEqual(140);
      expect(dPickup).toBeLessThanOrEqual(620);
      expect(dDrop).toBeGreaterThanOrEqual(280);
      expect(dDrop).toBeLessThanOrEqual(1550);
      expect(o.estPay).toBeGreaterThan(0);
      expect(o.parcel.length).toBeGreaterThan(2);
      expect(o.pickup.name.length).toBeGreaterThan(2);
    }
  });
  it("is deterministic for a seed", () => {
    const a = generateOffer(gridMap(), 0, 0, mulberry32(42), 1, 0);
    const b = generateOffer(gridMap(), 0, 0, mulberry32(42), 1, 0);
    expect(a).toEqual(b);
  });
});

describe("near", () => {
  it("uses the 9 m arrival radius", () => {
    expect(near(0, 0, { x: 8, z: 0 })).toBe(true);
    expect(near(0, 0, { x: 10, z: 0 })).toBe(false);
  });
});
