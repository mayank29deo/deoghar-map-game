import { describe, expect, it } from "vitest";
import { createVehState, stepVehicle } from "../controller";
import { VEHICLES } from "../specs";

const scooty = VEHICLES[0];
const FULL = { throttle: 1, steer: 0, handbrake: false };
const road = { cls: 1, galiBlocked: false };

function run(n: number, state = createVehState(0, 0, 0), input = FULL, surface = road) {
  let s = state;
  for (let i = 0; i < n; i++) s = stepVehicle(s, input, scooty, surface, 1 / 60);
  return s;
}

describe("stepVehicle", () => {
  it("accelerates to ~top speed on road", () => {
    const s = run(600);
    expect(s.speed).toBeGreaterThan(scooty.topSpeed * 0.95);
    expect(s.speed).toBeLessThanOrEqual(scooty.topSpeed + 0.01);
  });
  it("caps speed off-road by offroadFactor", () => {
    const s = run(600, createVehState(0, 0, 0), FULL, { cls: 0, galiBlocked: false });
    expect(s.speed).toBeLessThanOrEqual(scooty.topSpeed * scooty.offroadFactor + 0.2);
  });
  it("coasts to a stop without throttle", () => {
    let s = run(300);
    for (let i = 0; i < 600; i++) s = stepVehicle(s, { throttle: 0, steer: 0, handbrake: false }, scooty, road, 1 / 60);
    expect(s.speed).toBeLessThan(0.3);
  });
  it("turns left with negative steer (heading decreases)", () => {
    let s = run(120);
    const h0 = s.heading;
    for (let i = 0; i < 60; i++) s = stepVehicle(s, { throttle: 1, steer: -1, handbrake: false }, scooty, road, 1 / 60);
    expect(s.heading).toBeLessThan(h0);
  });
  it("moves along its heading", () => {
    const s = run(120);
    expect(s.x).toBeGreaterThan(5); // heading 0 = +x
    expect(Math.abs(s.z)).toBeLessThan(0.01);
  });
  it("reverses when throttling back from rest", () => {
    let s = createVehState(0, 0, 0);
    for (let i = 0; i < 240; i++) s = stepVehicle(s, { throttle: -1, steer: 0, handbrake: false }, scooty, road, 1 / 60);
    expect(s.speed).toBeLessThan(-1);
    expect(s.x).toBeLessThan(-1);
  });
});
