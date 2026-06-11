import { describe, expect, it } from "vitest";
import { buildGraph, classify, extractPois, snapToNearest } from "../roads.mjs";

const ident = (lat, lon) => ({ x: lon, z: -lat }); // identity-ish projector for readable fixtures

const way = (id, nodes, geometry, tags) => ({ type: "way", id, nodes, geometry, tags });
const g = (lat, lon) => ({ lat, lon });

describe("classify", () => {
  it("maps highway values to class+width", () => {
    expect(classify("primary")).toEqual({ cls: "primary", width: 9 });
    expect(classify("secondary")).toEqual({ cls: "secondary", width: 7 });
    expect(classify("tertiary")).toEqual({ cls: "tertiary", width: 6 });
    expect(classify("residential")).toEqual({ cls: "residential", width: 4.5 });
    expect(classify("service")).toEqual({ cls: "service", width: 3.5 });
    expect(classify("footway")).toEqual({ cls: "gali", width: 2.2 });
    expect(classify("construction")).toBeNull();
    expect(classify(undefined)).toBeNull();
  });
});

describe("buildGraph", () => {
  it("splits ways at shared nodes into edges", () => {
    const ways = [
      way(1, [1, 2, 3], [g(0, 0), g(0, 1), g(0, 2)], { highway: "residential" }),
      way(2, [4, 2, 5], [g(1, 1), g(0, 1), g(-1, 1)], { highway: "residential", name: "Cross Rd" }),
    ];
    const { nodes, edges } = buildGraph(ways, ident);
    expect(nodes.length).toBe(5);
    expect(edges.length).toBe(4);
    const named = edges.filter((e) => e.name === "Cross Rd");
    expect(named.length).toBe(2);
    for (const e of edges) {
      expect(e.pts.length).toBeGreaterThanOrEqual(2);
      expect(e.width).toBe(4.5);
      for (const [x, z] of e.pts) { expect(Number.isFinite(x)).toBe(true); expect(Number.isFinite(z)).toBe(true); }
    }
  });
  it("drops unclassified highways and length-mismatched ways", () => {
    const ways = [
      way(1, [1, 2], [g(0, 0), g(0, 1)], { highway: "construction" }),
      way(2, [1, 2, 3], [g(0, 0), g(0, 1)], { highway: "primary" }),
    ];
    expect(buildGraph(ways, ident).edges.length).toBe(0);
  });
});

describe("extractPois", () => {
  it("keeps amenity/shop/tourism nodes with type precedence", () => {
    const els = [
      { type: "node", id: 1, lat: 1, lon: 2, tags: { amenity: "pharmacy", name: "Jeevan Medico" } },
      { type: "node", id: 2, lat: 1, lon: 3, tags: { shop: "sweets" } },
      { type: "node", id: 3, lat: 1, lon: 4, tags: { tourism: "hotel", shop: "gift" } },
      { type: "node", id: 4, lat: 1, lon: 5, tags: { power: "pole" } },
    ];
    const pois = extractPois(els, ident);
    expect(pois.length).toBe(3);
    expect(pois[0]).toMatchObject({ name: "Jeevan Medico", type: "pharmacy" });
    expect(pois[1]).toMatchObject({ name: null, type: "sweets" });
    expect(pois[2].type).toBe("gift");
  });
});

describe("snapToNearest", () => {
  it("returns nearest node index within maxDist, else -1", () => {
    const nodes = [{ x: 0, z: 0 }, { x: 100, z: 0 }];
    expect(snapToNearest(nodes, 95, 5, 20)).toBe(1);
    expect(snapToNearest(nodes, 500, 500, 20)).toBe(-1);
  });
});
