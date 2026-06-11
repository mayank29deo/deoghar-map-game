import { describe, expect, it } from "vitest";
import { CellGrid, pointSegDist, polylineLength } from "../geom2d";

describe("pointSegDist", () => {
  it("perpendicular distance to segment interior", () => {
    expect(pointSegDist(5, 3, 0, 0, 10, 0)).toBeCloseTo(3);
  });
  it("distance to nearest endpoint beyond segment", () => {
    expect(pointSegDist(-4, 3, 0, 0, 10, 0)).toBeCloseTo(5);
  });
});

describe("polylineLength", () => {
  it("sums segment lengths", () => {
    expect(polylineLength([[0, 0], [3, 0], [3, 4]])).toBeCloseTo(7);
  });
});

describe("CellGrid", () => {
  it("claims a cell once", () => {
    const grid = new CellGrid(4);
    expect(grid.tryClaim(1, 1)).toBe(true);
    expect(grid.tryClaim(2, 2)).toBe(false); // same 4m cell
    expect(grid.tryClaim(9, 1)).toBe(true);
  });
});
