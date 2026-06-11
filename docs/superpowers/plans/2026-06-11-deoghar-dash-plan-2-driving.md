# Deoghar Dash — Plan 2: Driving Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** All five vehicles drivable through real Deoghar with arcade feel — keyboard input, surface-aware speed (road/off-road/gali), building collisions, spring chase camera. Ends at tag `v0.2.0-driving`.

**Architecture:** A `RoadGrid` (Uint8 raster of road classes at 3 m cells, built once from map edges) answers "what surface am I on?" in O(1). A pure `stepVehicle()` advances kinematic state from input + surface + spec. `LotIndex` + circle-vs-OBB resolution keeps vehicles out of buildings. `ChaseCam` spring-follows with speed FOV kick. GameApp gains a `drive` mode (default) alongside `orbit` (debug, key O); vehicle switching on keys 1–5 for testing until the Garage exists (Plan 3).

**Tech Stack:** Same as Plan 1. New files only in `src/game/`. Prereq: `v0.1.0-world` tag checked out and green (`npm test`, `npm run build`).

**Builds on (existing, do not recreate):** `engine/rng.ts` (`Rng`, `mulberry32`, `range`), `engine/loop.ts` (`Loop`), `world/geom2d.ts` (`CellGrid`, `pointSegDist`), `world/mapData.ts` (`MAP`, `nodeDegrees`), `world/types.ts`, `world/palette.ts`, `world/sky.ts` (`SkyRig.update(focus)`), `GameApp.ts`.

---

## File structure

```
src/game/
  sim/roadGrid.ts            # Uint8 class raster + classAt(x,z)  (TDD)
  sim/roadGrid.test.ts       →  src/game/sim/__tests__/roadGrid.test.ts
  vehicles/specs.ts          # VEHICLES table from design spec §3
  vehicles/controller.ts     # pure stepVehicle()                 (TDD)
  vehicles/builders.ts       # 5 low-poly vehicle mesh builders
  vehicles/chaseCam.ts       # spring camera rig
  sim/collision.ts           # LotIndex + resolveCircleVsLots     (TDD)
  engine/input.ts            # keyboard state
  GameApp.ts                 # MODIFY: drive mode, player, spawn, integration
```

Surface contract (single source of truth): `0=offroad, 1=primary, 2=secondary, 3=tertiary, 4=residential, 5=service, 6=gali`. Cars (sedan/SUV) on a gali cell are treated as `0` (offroad) — the "too narrow" feel without invisible walls.

---

### Task 1: RoadGrid (TDD)

**Files:** Create `src/game/sim/roadGrid.ts`, `src/game/sim/__tests__/roadGrid.test.ts`

- [ ] **Step 1: failing test**

```ts
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
    expect(g.classAt(30, 3)).toBe(CLS_INDEX.primary);   // within 4.5+0.8 corridor
    expect(g.classAt(30, 9)).toBe(0);                    // beyond corridor
    expect(g.classAt(0, 200)).toBe(0);
    expect(g.classAt(99999, 0)).toBe(0);                 // out of extent
  });
  it("prefers wider class where roads overlap", () => {
    const g = new RoadGrid(map([
      { id: 0, a: 0, b: 1, cls: "gali", width: 2.2, name: null, pts: [[-20, 0], [20, 0]] },
      { id: 1, a: 2, b: 3, cls: "primary", width: 9, name: null, pts: [[0, -20], [0, 20]] },
    ]));
    expect(g.classAt(0, 0)).toBe(CLS_INDEX.primary);
  });
});
```

- [ ] **Step 2: run, expect module-not-found FAIL** — `npx vitest run src/game/sim`

- [ ] **Step 3: implement**

```ts
import type { MapData } from "../world/types";

export const CLS_INDEX: Record<string, number> = { primary: 1, secondary: 2, tertiary: 3, residential: 4, service: 5, gali: 6 };
const CELL = 3;
const EXTENT = 3300; // meters from origin covered each direction

export class RoadGrid {
  readonly size = Math.ceil((EXTENT * 2) / CELL);
  private cells: Uint8Array;

  constructor(map: MapData) {
    this.cells = new Uint8Array(this.size * this.size);
    for (const e of map.edges) {
      const cls = CLS_INDEX[e.cls];
      if (!cls) continue;
      const r = e.width / 2 + 0.8;
      for (let i = 0; i < e.pts.length - 1; i++) {
        const [ax, az] = e.pts[i], [bx, bz] = e.pts[i + 1];
        const len = Math.hypot(bx - ax, bz - az);
        const steps = Math.max(1, Math.ceil(len / 1.5));
        for (let s = 0; s <= steps; s++) {
          this.stamp(ax + ((bx - ax) * s) / steps, az + ((bz - az) * s) / steps, r, cls);
        }
      }
    }
  }

  private stamp(x: number, z: number, r: number, cls: number) {
    const span = Math.ceil(r / CELL);
    const ci = Math.floor((x + EXTENT) / CELL), cj = Math.floor((z + EXTENT) / CELL);
    for (let i = ci - span; i <= ci + span; i++) {
      for (let j = cj - span; j <= cj + span; j++) {
        if (i < 0 || j < 0 || i >= this.size || j >= this.size) continue;
        const cx = i * CELL - EXTENT + CELL / 2, cz = j * CELL - EXTENT + CELL / 2;
        if ((cx - x) ** 2 + (cz - z) ** 2 > r * r) continue;
        const k = j * this.size + i;
        const cur = this.cells[k];
        if (cur === 0 || cls < cur) this.cells[k] = cls; // lower index = wider road wins
      }
    }
  }

  classAt(x: number, z: number): number {
    const i = Math.floor((x + EXTENT) / CELL), j = Math.floor((z + EXTENT) / CELL);
    if (i < 0 || j < 0 || i >= this.size || j >= this.size) return 0;
    return this.cells[j * this.size + i];
  }
}
```

- [ ] **Step 4: run tests green** — `npm test`
- [ ] **Step 5: commit** `feat: road-class raster grid for surface queries (TDD)`

---

### Task 2: Vehicle specs + keyboard input

**Files:** Create `src/game/vehicles/specs.ts`, `src/game/engine/input.ts`

- [ ] **Step 1: specs.ts** (numbers from design spec §3; steering/grip hand-tunable in Task 7)

```ts
export interface VehicleSpec {
  key: string; label: string;
  topSpeed: number; accel: number; brake: number; reverseSpeed: number;
  steerRate: number;        // rad/s at full lock, low speed
  steerFalloff: number;     // 0..1 — how much lock tightens away at top speed
  grip: number;             // 0..1 heading-follow; lower = drifty
  offroadFactor: number;
  galiAllowed: boolean;
  radius: number;           // collision circle
  camDist: number; camHeight: number;
  payoutMult: number; unlockAt: number;
  bodyColor: number; accentColor: number;
}

export const VEHICLES: VehicleSpec[] = [
  { key: "scooty", label: "Scooty", topSpeed: 16, accel: 9, brake: 18, reverseSpeed: 4, steerRate: 2.6, steerFalloff: 0.55, grip: 0.92, offroadFactor: 0.35, galiAllowed: true, radius: 0.9, camDist: 9, camHeight: 4.2, payoutMult: 1.0, unlockAt: 0, bodyColor: 0x2a9d8f, accentColor: 0xf4f1ea },
  { key: "bike", label: "Bike", topSpeed: 22, accel: 11, brake: 20, reverseSpeed: 4, steerRate: 2.9, steerFalloff: 0.7, grip: 0.88, offroadFactor: 0.35, galiAllowed: true, radius: 0.9, camDist: 9.5, camHeight: 4.2, payoutMult: 1.1, unlockAt: 2000, bodyColor: 0xc44536, accentColor: 0x1a1a1a },
  { key: "auto", label: "Auto-rickshaw", topSpeed: 14, accel: 7, brake: 14, reverseSpeed: 4, steerRate: 2.2, steerFalloff: 0.45, grip: 0.85, offroadFactor: 0.45, galiAllowed: true, radius: 1.3, camDist: 10.5, camHeight: 4.8, payoutMult: 1.2, unlockAt: 5000, bodyColor: 0xe9c46a, accentColor: 0x2d6a4f },
  { key: "sedan", label: "Sedan", topSpeed: 19, accel: 8.5, brake: 17, reverseSpeed: 5, steerRate: 2.0, steerFalloff: 0.5, grip: 0.95, offroadFactor: 0.35, galiAllowed: false, radius: 1.6, camDist: 12, camHeight: 5.2, payoutMult: 1.15, unlockAt: 10000, bodyColor: 0x6c8ebf, accentColor: 0x22303f },
  { key: "suv", label: "SUV", topSpeed: 15, accel: 7, brake: 15, reverseSpeed: 5, steerRate: 1.8, steerFalloff: 0.4, grip: 0.96, offroadFactor: 0.75, galiAllowed: false, radius: 1.8, camDist: 13, camHeight: 5.8, payoutMult: 1.3, unlockAt: 20000, bodyColor: 0x3d405b, accentColor: 0xb0b7c3 },
];
```

- [ ] **Step 2: input.ts**

```ts
export class Input {
  private down = new Set<string>();
  private oncePressed = new Set<string>();
  private onKey = (e: KeyboardEvent) => {
    if (e.type === "keydown") {
      if (!this.down.has(e.code)) this.oncePressed.add(e.code);
      this.down.add(e.code);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    } else this.down.delete(e.code);
  };
  attach() { window.addEventListener("keydown", this.onKey); window.addEventListener("keyup", this.onKey); }
  detach() { window.removeEventListener("keydown", this.onKey); window.removeEventListener("keyup", this.onKey); }
  get throttle(): number { return (this.down.has("KeyW") || this.down.has("ArrowUp") ? 1 : 0) + (this.down.has("KeyS") || this.down.has("ArrowDown") ? -1 : 0); }
  get steer(): number { return (this.down.has("KeyD") || this.down.has("ArrowRight") ? 1 : 0) + (this.down.has("KeyA") || this.down.has("ArrowLeft") ? -1 : 0); }
  get handbrake(): boolean { return this.down.has("Space"); }
  /** true exactly once per physical press */
  consumePress(code: string): boolean { const had = this.oncePressed.has(code); this.oncePressed.delete(code); return had; }
}
```

- [ ] **Step 3: typecheck + commit** `feat: vehicle spec table + keyboard input`

---

### Task 3: Arcade controller (TDD)

**Files:** Create `src/game/vehicles/controller.ts`, `src/game/vehicles/__tests__/controller.test.ts`

- [ ] **Step 1: failing tests**

```ts
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
    expect(s.x).toBeGreaterThan(5);   // heading 0 = +x
    expect(Math.abs(s.z)).toBeLessThan(0.01);
  });
  it("reverses when throttling back from rest", () => {
    let s = createVehState(0, 0, 0);
    for (let i = 0; i < 240; i++) s = stepVehicle(s, { throttle: -1, steer: 0, handbrake: false }, scooty, road, 1 / 60);
    expect(s.speed).toBeLessThan(-1);
    expect(s.x).toBeLessThan(-1);
  });
});
```

- [ ] **Step 2: run, FAIL** — then implement:

```ts
import type { VehicleSpec } from "./specs";

export interface VehState { x: number; z: number; heading: number; speed: number; steerVis: number; drifting: boolean }
export interface VehInput { throttle: number; steer: number; handbrake: boolean }
export interface Surface { cls: number; galiBlocked: boolean }

export function createVehState(x: number, z: number, heading: number): VehState {
  return { x, z, heading, speed: 0, steerVis: 0, drifting: false };
}

const DRAG = 0.6;          // 1/s proportional drag
const ROLL = 0.8;          // m/s^2 constant rolling resistance
const GALI_SPEED = 0.6;    // allowed 2W speed factor in alleys

export function stepVehicle(s: VehState, input: VehInput, spec: VehicleSpec, surface: Surface, dt: number): VehState {
  let { x, z, heading, speed } = s;

  let surfFactor = 1;
  if (surface.cls === 0 || surface.galiBlocked) surfFactor = spec.offroadFactor;
  else if (surface.cls === 6) surfFactor = GALI_SPEED;
  const top = spec.topSpeed * surfFactor;

  // longitudinal
  if (input.throttle > 0) {
    speed += spec.accel * input.throttle * dt * (speed > top ? 0 : 1 - Math.max(0, speed) / (top + 1));
  } else if (input.throttle < 0) {
    if (speed > 0.5) speed += spec.brake * input.throttle * dt;              // braking
    else speed = Math.max(speed + spec.accel * 0.6 * input.throttle * dt, -spec.reverseSpeed * surfFactor);
  }
  // drag + rolling resistance toward 0
  const sign = Math.sign(speed);
  speed -= sign * Math.min(Math.abs(speed), (DRAG * Math.abs(speed) + ROLL) * dt);
  if (input.handbrake) speed -= sign * Math.min(Math.abs(speed), spec.brake * 0.9 * dt);
  if (speed > top) speed = Math.max(top, speed - spec.brake * 1.2 * dt);     // over-cap decay (entering offroad fast)

  // steering — effectiveness scales with speed fraction, falls off near top speed
  const spdFrac = Math.min(Math.abs(speed) / spec.topSpeed, 1);
  const lock = spec.steerRate * (1 - spec.steerFalloff * spdFrac);
  const steerEff = input.handbrake ? lock * 1.6 : lock;
  if (Math.abs(speed) > 0.15) heading += input.steer * steerEff * spdFrac * Math.sign(speed) * dt;

  // hard turns scrub speed a little
  speed -= Math.abs(input.steer) * spdFrac * (input.handbrake ? 3.5 : 1.2) * dt * sign;

  x += Math.cos(heading) * speed * dt;
  z += Math.sin(heading) * speed * dt;

  const steerVis = s.steerVis + (input.steer - s.steerVis) * Math.min(1, dt * 10);
  const drifting = input.handbrake && Math.abs(speed) > spec.topSpeed * 0.4;
  return { x, z, heading, speed, steerVis, drifting };
}
```

Convention: heading 0 = +x, increases clockwise when viewed from above (+x→+z); steer +1 = right.

- [ ] **Step 3: tests green** — `npm test`
- [ ] **Step 4: commit** `feat: arcade vehicle controller (TDD)`

---

### Task 4: Collision (TDD)

**Files:** Create `src/game/sim/collision.ts`, `src/game/sim/__tests__/collision.test.ts`

- [ ] **Step 1: failing tests**

```ts
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
```

- [ ] **Step 2: implement**

```ts
import type { Lot } from "../world/types";

const CELL = 12;

export class LotIndex {
  private map = new Map<string, number[]>();
  constructor(lots: Lot[]) {
    lots.forEach((lot, i) => {
      const r = Math.hypot(lot.w, lot.d) / 2;
      const i0 = Math.floor((lot.x - r) / CELL), i1 = Math.floor((lot.x + r) / CELL);
      const j0 = Math.floor((lot.z - r) / CELL), j1 = Math.floor((lot.z + r) / CELL);
      for (let a = i0; a <= i1; a++) for (let b = j0; b <= j1; b++) {
        const k = `${a},${b}`;
        let arr = this.map.get(k);
        if (!arr) this.map.set(k, (arr = []));
        arr.push(i);
      }
    });
  }
  nearby(x: number, z: number): number[] {
    return this.map.get(`${Math.floor(x / CELL)},${Math.floor(z / CELL)}`) ?? [];
  }
}

export interface CollisionResult { x: number; z: number; hit: boolean; nx: number; nz: number }

/** Push circle (x,z,r) out of any overlapping lot OBB. One iteration is enough at arcade speeds. */
export function resolveCircleVsLots(x: number, z: number, r: number, lots: Lot[], index: LotIndex): CollisionResult {
  let hit = false, nx = 0, nz = 0;
  for (const i of index.nearby(x, z)) {
    const lot = lots[i];
    const cos = Math.cos(-lot.rotY), sin = Math.sin(-lot.rotY);
    // world → lot local (rotY rotates +x toward -z in world; inverse here)
    const dx = x - lot.x, dz = z - lot.z;
    const lx = dx * cos - dz * sin, lz = dx * sin + dz * cos;
    const hw = lot.w / 2, hd = lot.d / 2;
    const cx = Math.max(-hw, Math.min(hw, lx)), cz = Math.max(-hd, Math.min(hd, lz));
    let px = lx - cx, pz = lz - cz;
    let dist = Math.hypot(px, pz);
    let pen: number;
    if (dist > 1e-9) {
      pen = r - dist;
      if (pen <= 0) continue;
      px /= dist; pz /= dist;
    } else {
      // center inside box: push out along the shallowest face
      const dxFace = hw - Math.abs(lx), dzFace = hd - Math.abs(lz);
      if (dxFace < dzFace) { px = Math.sign(lx) || 1; pz = 0; pen = dxFace + r; }
      else { px = 0; pz = Math.sign(lz) || 1; pen = dzFace + r; }
    }
    // local normal → world
    const wcos = Math.cos(lot.rotY), wsin = Math.sin(lot.rotY);
    const wx = px * wcos - pz * wsin, wz = px * wsin + pz * wcos;
    x += wx * pen; z += wz * pen;
    nx = wx; nz = wz; hit = true;
  }
  return { x, z, hit, nx, nz };
}
```

- [ ] **Step 3: tests green; commit** `feat: lot spatial index + circle-vs-OBB collision (TDD)`

---

### Task 5: Vehicle visual builders

**Files:** Create `src/game/vehicles/builders.ts`

Each builder returns `{ group, wheels, body }`; wheel cylinders axis = z (rotateZ(π/2) on geometry) so `wheel.rotation.z -= speed/r*dt` spins them; body leans via `body.rotation.x` (roll around heading axis happens after group.rotation.y). All meshes castShadow. Dimensions in meters, origin at ground center, +x forward in local space (group.rotation.y = -heading aligns +x world heading).

- [ ] **Step 1: implement** (complete file)

```ts
import * as THREE from "three";
import type { VehicleSpec } from "./specs";

export interface VehicleVisual { group: THREE.Group; wheels: THREE.Mesh[]; body: THREE.Group }

const lam = (c: number) => new THREE.MeshLambertMaterial({ color: c });
const DARK = 0x1f2125, TYRE = 0x232323, GLASS = 0x9fc4d8;

function wheel(r: number, w: number, x: number, z: number): THREE.Mesh {
  const g = new THREE.CylinderGeometry(r, r, w, 10);
  g.rotateX(Math.PI / 2); // axis → z (cylinder default axis is y)
  const m = new THREE.Mesh(g, lam(TYRE));
  m.position.set(x, r, z);
  m.castShadow = true;
  return m;
}

function finish(parts: THREE.Object3D[], wheels: THREE.Mesh[]): VehicleVisual {
  const body = new THREE.Group();
  for (const p of parts) { p.traverse((o) => { if (o instanceof THREE.Mesh) { o.castShadow = true; } }); body.add(p); }
  const group = new THREE.Group();
  group.add(body, ...wheels);
  return { group, wheels, body };
}

export function buildVehicle(spec: VehicleSpec): VehicleVisual {
  switch (spec.key) {
    case "scooty": return scooty(spec);
    case "bike": return bike(spec);
    case "auto": return auto(spec);
    case "sedan": return sedan(spec);
    default: return suv(spec);
  }
}

function scooty(spec: VehicleSpec): VehicleVisual {
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.18, 0.5), lam(spec.bodyColor));
  deck.position.set(-0.1, 0.45, 0);
  const front = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.45), lam(spec.bodyColor));
  front.position.set(0.6, 0.75, 0);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.7), lam(DARK));
  bar.position.set(0.6, 1.15, 0);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.16, 0.42), lam(DARK));
  seat.position.set(-0.35, 0.78, 0);
  return finish([deck, front, bar, seat], [wheel(0.28, 0.12, 0.75, 0), wheel(0.28, 0.12, -0.65, 0)]);
}

function bike(spec: VehicleSpec): VehicleVisual {
  const tank = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.34, 0.4), lam(spec.bodyColor));
  tank.position.set(0.15, 0.78, 0);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.16, 0.24), lam(spec.accentColor));
  frame.position.set(-0.05, 0.58, 0);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.3), lam(DARK));
  seat.position.set(-0.5, 0.78, 0);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.62), lam(DARK));
  bar.position.set(0.62, 1.05, 0);
  const fork = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.5, 0.07), lam(DARK));
  fork.position.set(0.68, 0.6, 0);
  return finish([tank, frame, seat, bar, fork], [wheel(0.32, 0.1, 0.78, 0), wheel(0.32, 0.12, -0.72, 0)]);
}

function auto(spec: VehicleSpec): VehicleVisual {
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.0, 1.3), lam(spec.bodyColor));
  cab.position.set(-0.2, 0.95, 0);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.12, 1.36), lam(spec.accentColor));
  roof.position.set(-0.2, 1.55, 0);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 1.0), lam(spec.bodyColor));
  nose.position.set(0.95, 0.85, 0);
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.95), lam(GLASS));
  screen.position.set(0.74, 1.2, 0);
  return finish([cab, roof, nose, screen], [wheel(0.3, 0.14, 0.95, 0), wheel(0.3, 0.14, -0.75, 0.55), wheel(0.3, 0.14, -0.75, -0.55)]);
}

function sedan(spec: VehicleSpec): VehicleVisual {
  const lower = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.55, 1.6), lam(spec.bodyColor));
  lower.position.set(0, 0.62, 0);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.5, 1.45), lam(spec.bodyColor));
  cabin.position.set(-0.25, 1.14, 0);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.36, 1.3), lam(GLASS));
  glass.position.set(-0.25, 1.16, 0);
  glass.scale.set(1.01, 0.9, 0.92);
  return finish([lower, cabin, glass], [wheel(0.34, 0.22, 1.15, 0.72), wheel(0.34, 0.22, 1.15, -0.72), wheel(0.34, 0.22, -1.15, 0.72), wheel(0.34, 0.22, -1.15, -0.72)]);
}

function suv(spec: VehicleSpec): VehicleVisual {
  const lower = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.8, 1.8), lam(spec.bodyColor));
  lower.position.set(0, 0.85, 0);
  const upper = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 1.7), lam(spec.bodyColor));
  upper.position.set(-0.2, 1.55, 0);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 1.6), lam(GLASS));
  glass.position.set(-0.2, 1.58, 0);
  const rack = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 1.4), lam(spec.accentColor));
  rack.position.set(-0.2, 1.92, 0);
  return finish([lower, upper, glass, rack], [wheel(0.42, 0.26, 1.1, 0.82), wheel(0.42, 0.26, 1.1, -0.82), wheel(0.42, 0.26, -1.1, 0.82), wheel(0.42, 0.26, -1.1, -0.82)]);
}
```

- [ ] **Step 2: typecheck; commit** `feat: five low-poly vehicle builders`

---

### Task 6: Chase camera + GameApp integration (the drive!)

**Files:** Create `src/game/vehicles/chaseCam.ts`. Modify `src/game/GameApp.ts`.

- [ ] **Step 1: chaseCam.ts**

```ts
import * as THREE from "three";
import type { VehicleSpec } from "./specs";
import type { VehState } from "./controller";

export class ChaseCam {
  private pos = new THREE.Vector3();
  private look = new THREE.Vector3();
  private initialized = false;

  constructor(private camera: THREE.PerspectiveCamera) {}

  snap(s: VehState, spec: VehicleSpec) { this.initialized = false; void s; void spec; }

  update(dt: number, s: VehState, spec: VehicleSpec) {
    const back = new THREE.Vector3(-Math.cos(s.heading), 0, -Math.sin(s.heading));
    const desired = new THREE.Vector3(s.x, 0, s.z).addScaledVector(back, spec.camDist).setY(spec.camHeight);
    const ahead = new THREE.Vector3(s.x + Math.cos(s.heading) * (6 + s.speed * 0.35), 1.2, s.z + Math.sin(s.heading) * (6 + s.speed * 0.35));
    if (!this.initialized) { this.pos.copy(desired); this.look.copy(ahead); this.initialized = true; }
    const k = 1 - Math.exp(-dt * 5.5);
    this.pos.lerp(desired, k);
    this.look.lerp(ahead, 1 - Math.exp(-dt * 9));
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.look);
    const targetFov = 60 + (Math.abs(s.speed) / spec.topSpeed) * 14;
    if (Math.abs(this.camera.fov - targetFov) > 0.1) { this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 4); this.camera.updateProjectionMatrix(); }
  }
}
```

- [ ] **Step 2: GameApp integration.** Modify `GameApp.ts`:

Imports to add:
```ts
import { Input } from "./engine/input";
import { RoadGrid } from "./sim/roadGrid";
import { LotIndex, resolveCircleVsLots } from "./sim/collision";
import { VEHICLES } from "./vehicles/specs";
import { buildVehicle, type VehicleVisual } from "./vehicles/builders";
import { createVehState, stepVehicle, type VehState } from "./vehicles/controller";
import { ChaseCam } from "./vehicles/chaseCam";
import type { Lot } from "./world/types";
```

New fields:
```ts
private input = new Input();
private roadGrid!: RoadGrid;
private lots!: Lot[];
private lotIndex!: LotIndex;
private mode: "drive" | "orbit" = "drive";
private chase!: ChaseCam;
private specIdx = 0;
private vehState!: VehState;
private visual!: VehicleVisual;
private focus = new THREE.Vector3();
```

In `buildWorld()`: keep a reference to generated lots (`this.lots = generateLots(...)` then `buildCity(this.lots, MAP)`), build `this.roadGrid = new RoadGrid(MAP)` and `this.lotIndex = new LotIndex(this.lots)`.

After world build in constructor: `this.input.attach()`, `this.chase = new ChaseCam(this.camera)`, spawn:
```ts
private spawn() {
  const lm = MAP.landmarks.find((l) => l.key === "tower-chowk")!;
  // face along the widest incident edge
  let heading = 0;
  for (const e of MAP.edges) {
    const [ax, az] = e.pts[0], [bx, bz] = e.pts[e.pts.length - 1];
    if (Math.hypot(ax - lm.x, az - lm.z) < 2) { heading = Math.atan2(e.pts[1][1] - az, e.pts[1][0] - ax); break; }
    if (Math.hypot(bx - lm.x, bz - lm.z) < 2) { const p = e.pts[e.pts.length - 2]; heading = Math.atan2(p[1] - bz, p[0] - bx); break; }
  }
  this.vehState = createVehState(lm.x, lm.z, heading);
  this.setVehicle(0);
}
private setVehicle(i: number) {
  if (this.visual) this.scene.remove(this.visual.group);
  this.specIdx = i;
  this.visual = buildVehicle(VEHICLES[i]);
  this.scene.add(this.visual.group);
  this.chase.snap(this.vehState, VEHICLES[i]);
}
```

Loop update callback (replaces empty update):
```ts
(dt) => {
  if (this.input.consumePress("KeyO")) this.mode = this.mode === "drive" ? "orbit" : "drive";
  for (let i = 0; i < 5; i++) if (this.input.consumePress(`Digit${i + 1}`)) this.setVehicle(i);
  if (this.mode !== "drive") return;
  const spec = VEHICLES[this.specIdx];
  const cls = this.roadGrid.classAt(this.vehState.x, this.vehState.z);
  const surface = { cls, galiBlocked: cls === 6 && !spec.galiAllowed };
  let next = stepVehicle(this.vehState, { throttle: this.input.throttle, steer: this.input.steer, handbrake: this.input.handbrake }, spec, surface, dt);
  const res = resolveCircleVsLots(next.x, next.z, spec.radius, this.lots, this.lotIndex);
  if (res.hit) {
    next = { ...next, x: res.x, z: res.z, speed: next.speed * 0.55 };
  }
  this.vehState = next;
}
```

Render callback:
```ts
() => {
  if (this.mode === "drive") {
    const spec = VEHICLES[this.specIdx];
    const s = this.vehState;
    this.visual.group.position.set(s.x, 0, s.z);
    this.visual.group.rotation.y = -s.heading;
    this.visual.body.rotation.x = s.steerVis * Math.min(Math.abs(s.speed) / spec.topSpeed, 1) * 0.10; // lean into turns
    const spin = (s.speed / 0.3) * (1 / 60);
    for (const w of this.visual.wheels) w.rotation.z -= spin;
    this.chase.update(1 / 60, s, spec);
    this.focus.set(s.x, 0, s.z);
  } else {
    this.controls.update();
    this.focus.copy(this.controls.target);
  }
  this.sky.update(this.focus);
  this.renderer.render(this.scene, this.camera);
  this.stats?.frame();
}
```
`controls.enabled = this.mode === "orbit"` toggled in the O-key handler. `dispose()` additionally calls `this.input.detach()`.

Note on wheel spin sign and body lean axis: local +x is forward, wheels' axis is z after `rotateX(π/2)`; `rotation.z` spins them around their axle as built. Lean uses body.rotation.x (roll around forward axis). If visual direction reads wrong during the feel pass, flip signs there — geometry conventions are the most error-prone part of this task and are explicitly checked in Step 3.

- [ ] **Step 3: visual + feel verification (manual, REQUIRED before commit)**
  1. `npm run dev` open page → you spawn at Tower Chowk on the scooty, chase cam behind, facing along a road.
  2. W accelerates smoothly; top speed feels reached in ~3 s; A/D carve; Space slides with wider steering; S brakes then reverses.
  3. Wheels spin forward (not backward); body leans INTO turns (flip sign if out).
  4. Drive off-road → obvious slowdown. Drive into a building → soft push-out, no tunneling at top speed.
  5. Keys 1–5 swap vehicles in place; each silhouette distinct; SUV visibly better off-road; sedan refuses nothing yet (galis just slow it like offroad).
  6. Key O → orbit mode for inspection; O again returns.
  7. Stats: calls ≤ ~35, ms/frame via `window.__app` micro-bench still < 4 ms.
- [ ] **Step 4: typecheck + tests + commit** `feat: drivable vehicles with chase cam, collisions, surface awareness`

---

### Task 7: Feel pass + milestone

- [ ] Tune `specs.ts` (steerRate/grip/camDist) and controller constants from real driving until: scooty nimble, bike fast+twitchy, auto wobbly-charming, sedan planted, SUV heavy but unstoppable off-road. Commit per meaningful change.
- [ ] Verify all Plan-1 visuals still intact (temple, water, shadows).
- [ ] `npm test` + `npm run build` green.
- [ ] Tag + push: `git tag v0.2.0-driving && git push && git push origin v0.2.0-driving`.

## Self-review notes
- Spec §3 (vehicle table) → Task 2 specs; §5 controls desktop subset → Task 2 input (mobile = Plan 4); §3 galis/off-road → RoadGrid + controller surface logic; §4.2 collisions vs buildings → Task 4 (real-footprint polys approximated by their lot OBBs is NOT done — footprint buildings are rare (98) and mostly large compounds away from roads; accepted gap for v0.2, listed for Plan 3 backlog).
- Types consistent: `Lot` from world/types reused by collision; `VehState/VehicleSpec` defined once; surface contract documented at top.
- No placeholders; every step has full code or an explicit numbered manual check.
