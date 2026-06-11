import { describe, expect, it } from "vitest";
import { ORIGIN, project, unproject } from "../projection.mjs";

describe("projection", () => {
  it("maps origin to (0,0)", () => {
    const p = project(ORIGIN.lat, ORIGIN.lon);
    expect(p.x).toBeCloseTo(0, 6);
    expect(p.z).toBeCloseTo(0, 6);
  });
  it("maps +0.01° lat (north) to z ≈ −1105.74 m", () => {
    expect(project(ORIGIN.lat + 0.01, ORIGIN.lon).z).toBeCloseTo(-1105.74, 1);
  });
  it("maps +0.01° lon (east) to x ≈ +1013.08 m", () => {
    expect(project(ORIGIN.lat, ORIGIN.lon + 0.01).x).toBeCloseTo(1013.08, 1);
  });
  it("round-trips", () => {
    const p = project(24.4926, 86.7002);
    const g = unproject(p.x, p.z);
    expect(g.lat).toBeCloseTo(24.4926, 6);
    expect(g.lon).toBeCloseTo(86.7002, 6);
  });
});
