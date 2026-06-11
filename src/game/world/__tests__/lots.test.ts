import { describe, expect, it } from "vitest";
import { mulberry32 } from "../../engine/rng";
import { generateLots } from "../lots";
import { CellGrid, pointSegDist } from "../geom2d";
import type { MapData } from "../types";

function fixtureMap(): MapData {
  return {
    meta: { bbox: [], origin: { lat: 0, lon: 0 }, generated: "" },
    nodes: [{ x: 0, z: 0 }, { x: 200, z: 0 }],
    edges: [{ id: 0, a: 0, b: 1, cls: "residential", width: 4.5, name: null, pts: [[0, 0], [200, 0]] }],
    pois: [], buildings: [], water: [], landmarks: [],
  };
}

describe("generateLots", () => {
  it("is deterministic for a seed", () => {
    const a = generateLots(fixtureMap(), mulberry32(814112), new CellGrid(4));
    const b = generateLots(fixtureMap(), mulberry32(814112), new CellGrid(4));
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(4);
  });
  it("keeps every lot clear of its road corridor", () => {
    const map = fixtureMap();
    const lots = generateLots(map, mulberry32(814112), new CellGrid(4));
    for (const lot of lots) {
      const d = pointSegDist(lot.x, lot.z, 0, 0, 200, 0);
      expect(d).toBeGreaterThanOrEqual(4.5 / 2 + 1.0);
    }
  });
  it("skips lots near intersection nodes", () => {
    const map = fixtureMap();
    const lots = generateLots(map, mulberry32(814112), new CellGrid(4));
    for (const lot of lots) {
      expect(Math.hypot(lot.x - 0, lot.z - 0)).toBeGreaterThanOrEqual(12);
      expect(Math.hypot(lot.x - 200, lot.z - 0)).toBeGreaterThanOrEqual(12);
    }
  });
});
