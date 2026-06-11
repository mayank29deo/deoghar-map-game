import { describe, expect, it } from "vitest";
import { mulberry32 } from "../../engine/rng";
import { buildAdjacency, stepAuto, stepCow, type AutoAgent, type CowAgent } from "../traffic";
import type { MapData } from "../../world/types";

describe("stepCow", () => {
  it("never strays far beyond its leash", () => {
    const rng = mulberry32(5);
    let cow: CowAgent = { x: 0, z: 0, homeX: 0, homeZ: 0, heading: 0, speed: 1.1, turnIn: 1, fleeing: 0 };
    for (let i = 0; i < 4000; i++) cow = stepCow(cow, rng, 1 / 30);
    expect(Math.hypot(cow.x, cow.z)).toBeLessThan(75); // leash 60 + one wander step margin
  });
});

describe("stepAuto", () => {
  const map: MapData = {
    meta: { bbox: [], origin: { lat: 0, lon: 0 }, generated: "" },
    nodes: [{ x: 0, z: 0 }, { x: 100, z: 0 }, { x: 200, z: 0 }],
    edges: [
      { id: 0, a: 0, b: 1, cls: "primary", width: 9, name: null, pts: [[0, 0], [100, 0]] },
      { id: 1, a: 1, b: 2, cls: "primary", width: 9, name: null, pts: [[100, 0], [200, 0]] },
    ],
    pois: [], buildings: [], water: [], landmarks: [],
  };
  it("advances along the edge and hops to a connected edge at the end", () => {
    const rng = mulberry32(9);
    const adj = buildAdjacency(map, ["primary"]);
    let a: AutoAgent = { edge: 0, s: 95, dir: 1, speed: 10, x: 0, z: 0, heading: 0 };
    for (let i = 0; i < 60; i++) a = stepAuto(a, map, adj, rng, 1 / 30);
    expect(a.x).toBeGreaterThan(95); // moved past the junction onto a next edge
    expect([0, 1]).toContain(a.edge);
    expect(Number.isFinite(a.heading)).toBe(true);
  });
});
