import { describe, expect, it } from "vitest";
import { RoadGrid, CLS_INDEX } from "../roadGrid";
import type { MapData } from "../../world/types";

const map = (edges: MapData["edges"]): MapData => ({
  meta: { bbox: [], origin: { lat: 0, lon: 0 }, generated: "" },
  nodes: [], edges, pois: [], buildings: [], water: [], landmarks: [],
});

describe("RoadGrid", () => {
  it("marks cells on a road with its class and leaves far cells offroad", () => {
    const g = new RoadGrid(map([{ id: 0, a: 0, b: 1, cls: "primary", width: 9, name: null, pts: [[-50, 0], [50, 0]] }]));
    expect(g.classAt(0, 0)).toBe(CLS_INDEX.primary);
    expect(g.classAt(30, 3)).toBe(CLS_INDEX.primary); // within 4.5+0.8 corridor
    expect(g.classAt(30, 9)).toBe(0); // beyond corridor
    expect(g.classAt(0, 200)).toBe(0);
    expect(g.classAt(99999, 0)).toBe(0); // out of extent
  });
  it("prefers wider class where roads overlap", () => {
    const g = new RoadGrid(map([
      { id: 0, a: 0, b: 1, cls: "gali", width: 2.2, name: null, pts: [[-20, 0], [20, 0]] },
      { id: 1, a: 2, b: 3, cls: "primary", width: 9, name: null, pts: [[0, -20], [0, 20]] },
    ]));
    expect(g.classAt(0, 0)).toBe(CLS_INDEX.primary);
  });
});
