# Deoghar Dash — Plan 1: Foundation & World Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the project, build the OSM→JSON map pipeline for Deoghar, and render the full 3D low-poly golden-hour city (roads, procedural buildings, temple, props) explorable with an orbit camera at 60 fps.

**Architecture:** Build-time Node script fetches OSM via Overpass and emits a committed `deoghar-map.json` (local-meter coordinates). Runtime: vanilla Three.js game module (`src/game/`, zero React imports) renders the world from that JSON — roads as vertex-colored ribbons, buildings as seeded procedural InstancedMesh boxes, golden-hour sky/sun/fog rig. React renders only a fullscreen canvas host.

**Tech Stack:** Vite 6 + React 18 + TypeScript + Tailwind v4, three (^0.182), zustand (later plans), vitest. Map libs are plain ESM `.mjs` in `scripts/lib/` so the build script and vitest share them.

**Spec:** `docs/superpowers/specs/2026-06-11-deoghar-dash-design.md` (§4 world build, §7 architecture, §9 performance)

**Roadmap context:** This is Plan 1 of 4. Plan 2 = driving & vehicles. Plan 3 = missions/HUD/screens (playable game). Plan 4 = Supabase/audio/fx/mobile/deploy. Plans 2–4 are authored after this plan's milestone commit.

---

## File structure (locked by this plan)

```
scripts/
  build-map.mjs                 # CLI: fetch Overpass → process → src/data/deoghar-map.json
  lib/projection.mjs            # lat/lon ⇄ local meters (origin 24.487, 86.700)
  lib/roads.mjs                 # classify(), buildGraph(), extractPois(), snapToNearest()
  lib/curated.mjs               # hand-curated landmarks (lat/lon)
  lib/__tests__/*.test.mjs      # vitest (node env)
src/
  data/deoghar-map.json         # GENERATED + COMMITTED
  game/engine/loop.ts           # fixed-dt accumulator loop, rAF, visibility pause
  game/engine/renderer.ts       # WebGLRenderer factory (ACES, sRGB, shadows, PR cap 2)
  game/engine/rng.ts            # mulberry32 seeded RNG
  game/engine/stats.ts          # dev-only fps/draw-call overlay
  game/GameApp.ts               # orchestrator: scene, camera, controls, world, loop
  game/world/types.ts           # MapData/MapEdge/MapNode/Poi/Landmark/Lot types
  game/world/palette.ts         # ALL colors live here
  game/world/geom2d.ts          # pointSegDist, polylineLength, CellGrid
  game/world/mapData.ts         # JSON import + degree map helper
  game/world/sky.ts             # sky dome shader, sun+hemi lights, fog, setTimeOfDay
  game/world/roadMesh.ts        # ribbons + dashes + chowk discs (pure geom fns + assembler)
  game/world/lots.ts            # pure seeded lot generator (TDD)
  game/world/buildings.ts       # InstancedMesh city from lots + real OSM footprints
  game/world/props.ts           # instanced trees/lampposts, temple model, water, ground
  game/world/__tests__/*.test.ts
  ui/GameCanvas.tsx             # React host (mount/dispose GameApp)
  App.tsx, main.tsx, index.css
index.html, package.json, vite.config.ts, tsconfig.json, .gitignore
```

Conventions: game code never imports React. All colors come from `palette.ts`. All randomness in world-gen flows through one seeded RNG (seed 814112). JSON coords rounded to cm. y-up, x-east, z-south (z = −north).

---

### Task 1: Project scaffold

**Files:** Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `.gitignore`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/ui/GameCanvas.tsx` (stub)

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "deoghar-dash",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "build-map": "node scripts/build-map.mjs"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "three": "^0.182.0",
    "zustand": "^5.0.3"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.0",
    "@types/node": "^24.0.0",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@types/three": "^0.182.0",
    "@vitejs/plugin-react": "^4.5.0",
    "tailwindcss": "^4.1.0",
    "typescript": "~5.8.0",
    "vite": "^6.3.5",
    "vitest": "^3.2.0"
  }
}
```

- [ ] **Step 2: Write `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.mjs"],
  },
});
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Write `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <title>Deoghar Dash</title>
    <style>html, body, #root { height: 100%; margin: 0; background: #1a1410; overflow: hidden; }</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Write `.gitignore`**

```
node_modules
dist
.env
.env.*
!.env.example
*.local
```

- [ ] **Step 6: Write `src/index.css`**

```css
@import "tailwindcss";
```

- [ ] **Step 7: Write `src/main.tsx`** — no StrictMode: StrictMode double-mounts effects in dev, which would create two WebGL contexts in GameCanvas.

```tsx
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
```

- [ ] **Step 8: Write `src/App.tsx`**

```tsx
import GameCanvas from "./ui/GameCanvas";

export default function App() {
  return (
    <div className="relative h-full w-full">
      <GameCanvas />
      <div className="pointer-events-none absolute left-3 top-3 rounded bg-black/40 px-3 py-1 font-mono text-xs tracking-widest text-amber-200">
        DEOGHAR DASH — world preview
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Write stub `src/ui/GameCanvas.tsx`** (real GameApp arrives Task 5)

```tsx
export default function GameCanvas() {
  return <div id="game-root" className="h-full w-full" />;
}
```

- [ ] **Step 10: Install and verify dev server + typecheck**

Run: `npm install` then `npm run build`
Expected: install succeeds; build prints `✓ built in …` with no TS errors.
Run: `npm run dev` briefly (background) and load `http://localhost:5173` — dark page with the amber "DEOGHAR DASH" badge.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite+React+TS+Tailwind+three project shell"
```

---

### Task 2: Seeded RNG + projection (TDD)

**Files:** Create: `src/game/engine/rng.ts`, `src/game/engine/__tests__/rng.test.ts` *(put under `src/game/engine/__tests__/` — matches vitest include `src/**/*.test.ts`)*, `scripts/lib/projection.mjs`, `scripts/lib/__tests__/projection.test.mjs`

- [ ] **Step 1: Write failing RNG test** — `src/game/engine/__tests__/rng.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { mulberry32 } from "../rng";

describe("mulberry32", () => {
  it("is deterministic for a seed", () => {
    const a = mulberry32(814112), b = mulberry32(814112);
    const seqA = [a(), a(), a()], seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });
  it("differs across seeds", () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
  it("stays in [0,1)", () => {
    const r = mulberry32(99);
    for (let i = 0; i < 1000; i++) { const v = r(); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); }
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/game/engine/__tests__/rng.test.ts` → FAIL (cannot resolve `../rng`)

- [ ] **Step 3: Implement `src/game/engine/rng.ts`**

```ts
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = <T,>(rng: Rng, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
export const range = (rng: Rng, min: number, max: number): number => min + rng() * (max - min);
```

- [ ] **Step 4: Write failing projection test** — `scripts/lib/__tests__/projection.test.mjs`

```js
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
```

- [ ] **Step 5: Run to verify failure** — `npx vitest run scripts` → FAIL (cannot resolve `../projection.mjs`)

- [ ] **Step 6: Implement `scripts/lib/projection.mjs`**

```js
export const ORIGIN = { lat: 24.487, lon: 86.7 };
const M_PER_DEG_LAT = 110574;
const M_PER_DEG_LON = 111320 * Math.cos((ORIGIN.lat * Math.PI) / 180);

/** lat/lon → local meters. x = east, z = south (−north). */
export function project(lat, lon) {
  return { x: (lon - ORIGIN.lon) * M_PER_DEG_LON, z: -(lat - ORIGIN.lat) * M_PER_DEG_LAT };
}

export function unproject(x, z) {
  return { lat: ORIGIN.lat - z / M_PER_DEG_LAT, lon: ORIGIN.lon + x / M_PER_DEG_LON };
}
```

- [ ] **Step 7: Run all tests** — `npm test` → both suites PASS (7 tests)

- [ ] **Step 8: Commit** — `git add -A && git commit -m "feat: seeded rng + equirectangular projection (TDD)"`

---

### Task 3: Road classification + graph builder + POI extraction (TDD)

**Files:** Create: `scripts/lib/roads.mjs`, `scripts/lib/__tests__/roads.test.mjs`

- [ ] **Step 1: Write failing tests** — `scripts/lib/__tests__/roads.test.mjs`

```js
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
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run scripts` → FAIL (cannot resolve `../roads.mjs`)

- [ ] **Step 3: Implement `scripts/lib/roads.mjs`**

```js
const CLASS_TABLE = [
  [["motorway", "trunk", "primary", "motorway_link", "trunk_link", "primary_link"], "primary", 9],
  [["secondary", "secondary_link"], "secondary", 7],
  [["tertiary", "tertiary_link"], "tertiary", 6],
  [["residential", "unclassified", "living_street"], "residential", 4.5],
  [["service"], "service", 3.5],
  [["footway", "path", "pedestrian", "track", "steps", "cycleway"], "gali", 2.2],
];

export function classify(highway) {
  if (!highway) return null;
  for (const [keys, cls, width] of CLASS_TABLE) if (keys.includes(highway)) return { cls, width };
  return null;
}

const r2 = (v) => Math.round(v * 100) / 100;

/** ways: Overpass `out geom` way elements. project: (lat,lon)=>{x,z}. */
export function buildGraph(ways, project) {
  const kept = [];
  for (const w of ways) {
    const c = classify(w.tags?.highway);
    if (!c) continue;
    if (!Array.isArray(w.geometry) || !Array.isArray(w.nodes)) continue;
    if (w.geometry.length !== w.nodes.length || w.nodes.length < 2) continue;
    kept.push({ ...w, cls: c.cls, width: c.width });
  }
  const count = new Map();
  for (const w of kept) for (const id of w.nodes) count.set(id, (count.get(id) ?? 0) + 1);

  const nodes = [];
  const nodeIdx = new Map();
  const getNode = (osmId, geom) => {
    let i = nodeIdx.get(osmId);
    if (i === undefined) {
      const p = project(geom.lat, geom.lon);
      i = nodes.length;
      nodes.push({ x: r2(p.x), z: r2(p.z) });
      nodeIdx.set(osmId, i);
    }
    return i;
  };

  const edges = [];
  for (const w of kept) {
    let start = 0;
    for (let i = 1; i < w.nodes.length; i++) {
      const isLast = i === w.nodes.length - 1;
      if (!isLast && (count.get(w.nodes[i]) ?? 0) < 2) continue;
      const a = getNode(w.nodes[start], w.geometry[start]);
      const b = getNode(w.nodes[i], w.geometry[i]);
      const pts = w.geometry.slice(start, i + 1).map((pt) => {
        const p = project(pt.lat, pt.lon);
        return [r2(p.x), r2(p.z)];
      });
      edges.push({ id: edges.length, a, b, cls: w.cls, width: w.width, name: w.tags?.name ?? null, pts });
      start = i;
    }
  }
  return { nodes, edges };
}

export function extractPois(elements, project) {
  const pois = [];
  for (const el of elements) {
    if (el.type !== "node" || !el.tags) continue;
    const type = el.tags.amenity ?? el.tags.shop ?? el.tags.tourism;
    if (!type) continue;
    const p = project(el.lat, el.lon);
    pois.push({ id: pois.length, name: el.tags.name ?? null, type, x: r2(p.x), z: r2(p.z) });
  }
  return pois;
}

export function snapToNearest(nodes, x, z, maxDist) {
  let best = -1, bestD2 = maxDist * maxDist;
  for (let i = 0; i < nodes.length; i++) {
    const dx = nodes[i].x - x, dz = nodes[i].z - z, d2 = dx * dx + dz * dz;
    if (d2 <= bestD2) { bestD2 = d2; best = i; }
  }
  return best;
}
```

- [ ] **Step 4: Run all tests** — `npm test` → PASS

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: road classify + graph builder + poi extraction (TDD)"`

---

### Task 4: Curated landmarks + build-map script + generate real map JSON

**Files:** Create: `scripts/lib/curated.mjs`, `scripts/build-map.mjs`. Generates: `src/data/deoghar-map.json`

- [ ] **Step 1: Write `scripts/lib/curated.mjs`**

```js
/** Hand-curated Deoghar landmarks. Coords approximate; chowks snap to nearest junction at build. */
export const LANDMARKS = [
  { key: "baidyanath-temple", name: "Baba Baidyanath Dham", lat: 24.4926, lon: 86.7002, kind: "temple" },
  { key: "tower-chowk", name: "Tower Chowk", lat: 24.48595, lon: 86.69519, kind: "chowk" },
  { key: "clock-tower", name: "Clock Tower", lat: 24.4831, lon: 86.6925, kind: "chowk" },
  { key: "deoghar-station", name: "Deoghar Jn", lat: 24.5066, lon: 86.7158, kind: "station" },
  { key: "shivganga", name: "Shivganga", lat: 24.4934, lon: 86.7042, kind: "water" },
];
```

- [ ] **Step 2: Write `scripts/build-map.mjs`**

```js
import { mkdir, writeFile } from "node:fs/promises";
import { project } from "./lib/projection.mjs";
import { buildGraph, extractPois, snapToNearest } from "./lib/roads.mjs";
import { LANDMARKS } from "./lib/curated.mjs";

const BBOX = "24.462,86.672,24.512,86.728"; // south,west,north,east
const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
];
const QUERY = `
[out:json][timeout:120];
(
  way["highway"](${BBOX});
  way["building"](${BBOX});
  way["natural"="water"](${BBOX});
  node["amenity"](${BBOX});
  node["shop"](${BBOX});
  node["tourism"](${BBOX});
);
out geom;`;

async function fetchOverpass() {
  let lastErr;
  for (const url of ENDPOINTS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Overpass: ${url} (attempt ${attempt})…`);
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "DeogharDash/0.1 (map build; mayank29deo@gmail.com)" },
          body: "data=" + encodeURIComponent(QUERY),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) {
        lastErr = err;
        console.warn(`  failed: ${err.message ?? err}`);
        await new Promise((r) => setTimeout(r, 5000 * attempt));
      }
    }
  }
  throw lastErr;
}

const r2 = (v) => Math.round(v * 100) / 100;
const ring = (geometry) => geometry.map((g) => { const p = project(g.lat, g.lon); return [r2(p.x), r2(p.z)]; });

const data = await fetchOverpass();
const els = data.elements ?? [];
const highwayWays = els.filter((e) => e.type === "way" && e.tags?.highway);
const buildingWays = els.filter((e) => e.type === "way" && e.tags?.building && Array.isArray(e.geometry));
const waterWays = els.filter((e) => e.type === "way" && e.tags?.natural === "water" && Array.isArray(e.geometry));

const { nodes, edges } = buildGraph(highwayWays, project);
const pois = extractPois(els, project);
const buildings = buildingWays.map((w) => ({ pts: ring(w.geometry) }));
const water = waterWays.map((w) => ({ pts: ring(w.geometry) }));

const landmarks = LANDMARKS.map((lm) => {
  const p = project(lm.lat, lm.lon);
  let x = r2(p.x), z = r2(p.z);
  if (lm.kind === "chowk") {
    const i = snapToNearest(nodes, x, z, 150);
    if (i >= 0) ({ x, z } = nodes[i]);
  }
  return { key: lm.key, name: lm.name, kind: lm.kind, x, z };
});

const out = {
  meta: { bbox: BBOX.split(",").map(Number), origin: { lat: 24.487, lon: 86.7 }, generated: new Date().toISOString() },
  nodes, edges, pois, buildings, water, landmarks,
};

await mkdir("src/data", { recursive: true });
await writeFile("src/data/deoghar-map.json", JSON.stringify(out));
const kb = (JSON.stringify(out).length / 1024).toFixed(0);
console.log(`✔ src/data/deoghar-map.json  ${kb} KB`);
console.log(`  nodes=${nodes.length} edges=${edges.length} pois=${pois.length} buildings=${buildings.length} water=${water.length}`);
const byCls = {};
for (const e of edges) byCls[e.cls] = (byCls[e.cls] ?? 0) + 1;
console.log("  edges by class:", byCls);
```

- [ ] **Step 3: Run against live Overpass**

Run: `npm run build-map`
Expected: `✔ src/data/deoghar-map.json` ≥ 300 KB; nodes ≥ 800; edges ≥ 1500 (1,308 raw ways split at junctions); pois ≥ 79; buildings ≥ 90; every class present in "edges by class" (primary, secondary, tertiary, residential, service, gali). If both endpoints fail (rate limit), wait 60 s and retry once before debugging.

- [ ] **Step 4: Sanity-check the JSON**

Run: `node -e "const m=require('./src/data/deoghar-map.json');const xs=m.nodes.map(n=>n.x),zs=m.nodes.map(n=>n.z);console.log('x',Math.min(...xs).toFixed(0),Math.max(...xs).toFixed(0),'z',Math.min(...zs).toFixed(0),Math.max(...zs).toFixed(0));console.log(m.landmarks)"`
Expected: x within ≈ ±2900, z within ≈ ±2800 (bbox is ~5.7 km wide); 5 landmarks with finite coords, temple near (20, −619).

- [ ] **Step 5: Commit (JSON included — it ships with the game)**

```bash
git add -A
git commit -m "feat: overpass build-map pipeline + committed Deoghar map data"
```

---

### Task 5: Engine shell — renderer, loop, stats, GameApp mounted from React

**Files:** Create: `src/game/engine/renderer.ts`, `src/game/engine/loop.ts`, `src/game/engine/stats.ts`, `src/game/world/palette.ts`, `src/game/world/types.ts`, `src/game/world/mapData.ts`, `src/game/GameApp.ts`. Modify: `src/ui/GameCanvas.tsx`

- [ ] **Step 1: Write `src/game/world/palette.ts`**

```ts
export const PALETTE = {
  sky: { zenith: 0x355e8d, horizon: 0xffb36b, band: 0xff8c42, sun: 0xfff3d6 },
  fog: 0xf2a86e,
  ground: 0xc9a36b,
  road: { primary: 0x4a4a52, secondary: 0x55555c, tertiary: 0x5e5e64, residential: 0x6a655f, service: 0x767066, gali: 0xa8845c } as Record<string, number>,
  dash: 0xf5e6c8,
  chowk: 0x8a857c,
  walls: [0xf2e3c9, 0xeed7b0, 0xf4c9a3, 0xe8b88a, 0xd9c7a6, 0xf0d9b8, 0xe6cfae, 0xc9b288],
  awnings: [0xe76f51, 0x2a9d8f, 0xe9c46a, 0xc44536],
  canopy: [0x7a8c4f, 0x8a9a55, 0x6f8147],
  trunk: 0x6b4a32,
  lamppost: 0x3a3a3e,
  temple: { base: 0xf6efe0, shikhara: 0xe8dcc0, gold: 0xd4a017, flag: 0xc0392b },
  water: 0x7fb3c9,
  sun: { color: 0xffd9a8, hemiSky: 0xffd2a0, hemiGround: 0x8a6a4a },
} as const;
```

- [ ] **Step 2: Write `src/game/world/types.ts`**

```ts
export interface MapNode { x: number; z: number }
export interface MapEdge { id: number; a: number; b: number; cls: string; width: number; name: string | null; pts: [number, number][] }
export interface Poi { id: number; name: string | null; type: string; x: number; z: number }
export interface Landmark { key: string; name: string; kind: string; x: number; z: number }
export interface Footprint { pts: [number, number][] }
export interface MapData {
  meta: { bbox: number[]; origin: { lat: number; lon: number }; generated: string };
  nodes: MapNode[]; edges: MapEdge[]; pois: Poi[]; buildings: Footprint[]; water: Footprint[]; landmarks: Landmark[];
}
export interface Lot { x: number; z: number; rotY: number; w: number; d: number; h: number; colorIdx: number; shop: boolean }
```

- [ ] **Step 3: Write `src/game/world/mapData.ts`**

```ts
import raw from "../../data/deoghar-map.json";
import type { MapData } from "./types";

export const MAP: MapData = raw as unknown as MapData;

/** node index → number of incident edges */
export function nodeDegrees(map: MapData): Uint8Array {
  const deg = new Uint8Array(map.nodes.length);
  for (const e of map.edges) {
    if (deg[e.a] < 255) deg[e.a]++;
    if (deg[e.b] < 255) deg[e.b]++;
  }
  return deg;
}
```

- [ ] **Step 4: Write `src/game/engine/renderer.ts`**

```ts
import * as THREE from "three";

export function createRenderer(canvasHost: HTMLElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvasHost.clientWidth, canvasHost.clientHeight);
  canvasHost.appendChild(renderer.domElement);
  return renderer;
}
```

- [ ] **Step 5: Write `src/game/engine/loop.ts`**

```ts
const SIM_DT = 1 / 60;
const MAX_FRAME = 0.1;

export class Loop {
  private raf = 0;
  private last = 0;
  private acc = 0;
  private running = false;
  onVisibility = () => { if (document.hidden) this.last = 0; };

  constructor(private update: (dt: number) => void, private render: (alpha: number) => void) {}

  start() {
    if (this.running) return;
    this.running = true;
    document.addEventListener("visibilitychange", this.onVisibility);
    const tick = (tMs: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(tick);
      const t = tMs / 1000;
      if (this.last === 0) { this.last = t; return; }
      this.acc += Math.min(t - this.last, MAX_FRAME);
      this.last = t;
      while (this.acc >= SIM_DT) { this.update(SIM_DT); this.acc -= SIM_DT; }
      this.render(this.acc / SIM_DT);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    document.removeEventListener("visibilitychange", this.onVisibility);
  }
}
```

- [ ] **Step 6: Write `src/game/engine/stats.ts`**

```ts
import type * as THREE from "three";

export class StatsOverlay {
  private el: HTMLDivElement;
  private frames = 0;
  private lastT = performance.now();

  constructor(host: HTMLElement, private renderer: THREE.WebGLRenderer) {
    this.el = document.createElement("div");
    this.el.style.cssText =
      "position:absolute;right:8px;top:8px;z-index:50;background:rgba(0,0,0,.5);color:#7CFC9A;font:11px monospace;padding:4px 8px;border-radius:4px;pointer-events:none;white-space:pre";
    host.appendChild(this.el);
  }
  frame() {
    this.frames++;
    const now = performance.now();
    if (now - this.lastT >= 500) {
      const fps = (this.frames * 1000) / (now - this.lastT);
      const i = this.renderer.info.render;
      this.el.textContent = `${fps.toFixed(0)} fps\ncalls ${i.calls}\ntris ${(i.triangles / 1000).toFixed(0)}k`;
      this.frames = 0;
      this.lastT = now;
    }
  }
  dispose() { this.el.remove(); }
}
```

- [ ] **Step 7: Write `src/game/GameApp.ts`** (Task 5 version: ground plane + placeholder box; world arrives Tasks 6–9)

```ts
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createRenderer } from "./engine/renderer";
import { Loop } from "./engine/loop";
import { StatsOverlay } from "./engine/stats";
import { PALETTE } from "./world/palette";

export class GameApp {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private loop: Loop;
  private stats?: StatsOverlay;
  private onResize = () => {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  constructor(private host: HTMLElement) {
    this.renderer = createRenderer(host);
    this.camera = new THREE.PerspectiveCamera(60, host.clientWidth / host.clientHeight, 0.5, 6000);
    this.camera.position.set(450, 420, 250);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(20, 0, -619); // Baidyanath temple area
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.maxDistance = 2500;
    if (import.meta.env.DEV) this.stats = new StatsOverlay(host, this.renderer);

    this.buildPlaceholder();

    this.loop = new Loop(
      () => {},
      () => {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
        this.stats?.frame();
      },
    );
    window.addEventListener("resize", this.onResize);
    this.loop.start();
  }

  private buildPlaceholder() {
    this.scene.background = new THREE.Color(PALETTE.sky.horizon);
    const sun = new THREE.DirectionalLight(PALETTE.sun.color, 2.0);
    sun.position.set(-400, 300, 200);
    this.scene.add(sun, new THREE.AmbientLight(0xffe0c0, 0.6));
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), new THREE.MeshLambertMaterial({ color: PALETTE.ground }));
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);
    const box = new THREE.Mesh(new THREE.BoxGeometry(40, 40, 40), new THREE.MeshLambertMaterial({ color: 0xe76f51 }));
    box.position.set(20, 20, -619);
    this.scene.add(box);
  }

  dispose() {
    this.loop.stop();
    window.removeEventListener("resize", this.onResize);
    this.stats?.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
```

- [ ] **Step 8: Replace `src/ui/GameCanvas.tsx`**

```tsx
import { useEffect, useRef } from "react";
import { GameApp } from "../game/GameApp";

export default function GameCanvas() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const app = new GameApp(ref.current!);
    return () => app.dispose();
  }, []);

  return <div ref={ref} className="relative h-full w-full" />;
}
```

- [ ] **Step 9: Verify in browser** — `npm run dev` → warm-tinted scene, sandy ground to the horizon, one orange box near screen center; orbit/zoom works; stats overlay shows ~60 fps, calls ≤ 5. `npm run build` passes.

- [ ] **Step 10: Commit** — `git add -A && git commit -m "feat: three.js engine shell (renderer, fixed-dt loop, stats, orbit preview)"`

---

### Task 6: Golden-hour sky, sun, shadows, fog

**Files:** Create: `src/game/world/sky.ts`. Modify: `src/game/GameApp.ts`

- [ ] **Step 1: Write `src/game/world/sky.ts`**

```ts
import * as THREE from "three";
import { PALETTE } from "./palette";

const VSH = `varying vec3 vWorld; void main(){ vWorld=(modelMatrix*vec4(position,1.0)).xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const FSH = `
varying vec3 vWorld;
uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uBand; uniform vec3 uSunDir; uniform vec3 uSunColor;
void main(){
  float h = normalize(vWorld).y;
  vec3 col = mix(uHorizon, uZenith, smoothstep(0.02, 0.45, h));
  col = mix(uBand, col, smoothstep(0.0, 0.12, h));
  float sunAmt = pow(max(dot(normalize(vWorld), uSunDir), 0.0), 350.0);
  float glow  = pow(max(dot(normalize(vWorld), uSunDir), 0.0), 8.0);
  col += uSunColor * (sunAmt * 1.2 + glow * 0.25);
  gl_FragColor = vec4(col, 1.0);
}`;

export class SkyRig {
  readonly sun: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  private dome: THREE.Mesh;
  private uniforms: Record<string, THREE.IUniform>;
  /** t: 0 = golden hour … 1 = dusk */
  timeOfDay = 0.15;

  constructor(scene: THREE.Scene) {
    this.uniforms = {
      uZenith: { value: new THREE.Color(PALETTE.sky.zenith) },
      uHorizon: { value: new THREE.Color(PALETTE.sky.horizon) },
      uBand: { value: new THREE.Color(PALETTE.sky.band) },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunColor: { value: new THREE.Color(PALETTE.sky.sun) },
    };
    this.dome = new THREE.Mesh(
      new THREE.SphereGeometry(4500, 32, 16),
      new THREE.ShaderMaterial({ vertexShader: VSH, fragmentShader: FSH, uniforms: this.uniforms, side: THREE.BackSide, depthWrite: false, fog: false }),
    );
    scene.add(this.dome);

    this.sun = new THREE.DirectionalLight(PALETTE.sun.color, 2.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const c = this.sun.shadow.camera;
    c.left = -700; c.right = 700; c.top = 700; c.bottom = -700; c.near = 50; c.far = 3000;
    this.sun.shadow.bias = -0.0005;
    scene.add(this.sun, this.sun.target);

    this.hemi = new THREE.HemisphereLight(PALETTE.sun.hemiSky, PALETTE.sun.hemiGround, 0.55);
    scene.add(this.hemi);

    scene.fog = new THREE.Fog(PALETTE.fog, 250, 2400);
    this.apply();
  }

  /** Aim sun + shadow box around a focus point (camera target). */
  update(focus: THREE.Vector3) {
    this.apply();
    const az = THREE.MathUtils.degToRad(255), el = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(16, 3, this.timeOfDay));
    const dir = new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), -Math.cos(el) * Math.sin(az));
    this.sun.position.copy(focus).addScaledVector(dir, 1500);
    this.sun.target.position.copy(focus);
    (this.uniforms.uSunDir.value as THREE.Vector3).copy(dir).normalize();
  }

  private apply() {
    const t = this.timeOfDay;
    this.sun.intensity = THREE.MathUtils.lerp(2.2, 1.1, t);
    this.hemi.intensity = THREE.MathUtils.lerp(0.55, 0.3, t);
  }
}
```

- [ ] **Step 2: Wire into `GameApp`** — in `buildPlaceholder()` (renamed `buildWorld()` in Task 7): delete `scene.background`, ambient and old directional light; add field `private sky!: SkyRig;` and construct `this.sky = new SkyRig(this.scene);` after scene setup; enable shadows on the placeholder box (`box.castShadow = true`) and ground (`ground.receiveShadow = true`); in the render callback call `this.sky.update(this.controls.target)` before rendering.

- [ ] **Step 3: Verify in browser** — gradient sky (warm orange horizon band → steel-blue zenith), visible sun disc low in the west-southwest, long soft shadow cast by the box, warm haze far away. fps still ~60.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: golden-hour sky dome, sun shadows, fog rig"`

---

### Task 7: Road network mesh (TDD on geometry, visual on assembly)

**Files:** Create: `src/game/world/geom2d.ts`, `src/game/world/roadMesh.ts`, `src/game/world/__tests__/geom2d.test.ts`, `src/game/world/__tests__/roadMesh.test.ts`. Modify: `src/game/GameApp.ts`

- [ ] **Step 1: Write failing geom2d tests** — `src/game/world/__tests__/geom2d.test.ts`

```ts
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
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/game/world` → FAIL (module not found)

- [ ] **Step 3: Implement `src/game/world/geom2d.ts`**

```ts
export function pointSegDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const abx = bx - ax, abz = bz - az;
  const len2 = abx * abx + abz * abz;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * abx + (pz - az) * abz) / len2));
  const dx = px - (ax + t * abx), dz = pz - (az + t * abz);
  return Math.hypot(dx, dz);
}

export function polylineLength(pts: [number, number][]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return len;
}

export class CellGrid {
  private used = new Set<string>();
  constructor(private cell: number) {}
  tryClaim(x: number, z: number): boolean {
    const key = `${Math.floor(x / this.cell)},${Math.floor(z / this.cell)}`;
    if (this.used.has(key)) return false;
    this.used.add(key);
    return true;
  }
}
```

- [ ] **Step 4: Write failing roadMesh geometry test** — `src/game/world/__tests__/roadMesh.test.ts`

```ts
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
```

- [ ] **Step 5: Run to verify failure** — module not found.

- [ ] **Step 6: Implement `src/game/world/roadMesh.ts`**

```ts
import * as THREE from "three";
import { PALETTE } from "./palette";
import type { MapData } from "./types";
import { nodeDegrees } from "./mapData";

/** Triangulated ribbon for one polyline. Per-point normals averaged across adjacent segments (miter-lite). */
export function ribbonPositions(pts: [number, number][], width: number, y: number): Float32Array {
  if (pts.length < 2) return new Float32Array(0);
  const half = width / 2;
  const n = pts.length;
  const nx = new Float32Array(n), nz = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = Math.max(0, i - 1), q = Math.min(n - 1, i + 1);
    let dx = pts[q][0] - pts[p][0], dz = pts[q][1] - pts[p][1];
    const len = Math.hypot(dx, dz) || 1;
    dx /= len; dz /= len;
    nx[i] = -dz; nz[i] = dx;
  }
  const out = new Float32Array((n - 1) * 18);
  let o = 0;
  for (let i = 0; i < n - 1; i++) {
    const ax = pts[i][0], az = pts[i][1], bx = pts[i + 1][0], bz = pts[i + 1][1];
    const aL = [ax + nx[i] * half, y, az + nz[i] * half], aR = [ax - nx[i] * half, y, az - nz[i] * half];
    const bL = [bx + nx[i + 1] * half, y, bz + nz[i + 1] * half], bR = [bx - nx[i + 1] * half, y, bz - nz[i + 1] * half];
    out.set([...aL, ...bL, ...aR, ...aR, ...bL, ...bR], o);
    o += 18;
  }
  return out;
}

const Y_BY_CLS: Record<string, number> = { primary: 0.06, secondary: 0.055, tertiary: 0.05, residential: 0.045, service: 0.04, gali: 0.035 };

export function buildRoads(map: MapData): THREE.Group {
  const group = new THREE.Group();
  const positions: number[] = [];
  const colors: number[] = [];
  const c = new THREE.Color();
  for (const e of map.edges) {
    const pos = ribbonPositions(e.pts, e.width, Y_BY_CLS[e.cls] ?? 0.04);
    c.set(PALETTE.road[e.cls] ?? 0x666666);
    for (let i = 0; i < pos.length; i += 3) {
      positions.push(pos[i], pos[i + 1], pos[i + 2]);
      colors.push(c.r, c.g, c.b);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.receiveShadow = true;
  group.add(mesh);

  group.add(buildDashes(map));
  group.add(buildChowks(map));
  return group;
}

function buildDashes(map: MapData): THREE.Mesh {
  const positions: number[] = [];
  for (const e of map.edges) {
    if (e.cls !== "primary" && e.cls !== "secondary") continue;
    for (let i = 0; i < e.pts.length - 1; i++) {
      const [ax, az] = e.pts[i], [bx, bz] = e.pts[i + 1];
      const segLen = Math.hypot(bx - ax, bz - az);
      const dx = (bx - ax) / (segLen || 1), dz = (bz - az) / (segLen || 1);
      for (let s = 4; s + 3 < segLen; s += 9) {
        const x0 = ax + dx * s, z0 = az + dz * s, x1 = ax + dx * (s + 3), z1 = az + dz * (s + 3);
        const pos = ribbonPositions([[x0, z0], [x1, z1]], 0.3, 0.07);
        for (const v of pos) positions.push(v);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: PALETTE.dash }));
}

function buildChowks(map: MapData): THREE.Mesh {
  const deg = nodeDegrees(map);
  const widest = new Float32Array(map.nodes.length);
  for (const e of map.edges) {
    if (e.cls === "gali" || e.cls === "service") continue;
    widest[e.a] = Math.max(widest[e.a], e.width);
    widest[e.b] = Math.max(widest[e.b], e.width);
  }
  const geos: THREE.BufferGeometry[] = [];
  const disc = new THREE.CircleGeometry(1, 20);
  disc.rotateX(-Math.PI / 2);
  for (let i = 0; i < map.nodes.length; i++) {
    if (deg[i] >= 4 && widest[i] >= 6) {
      const g = disc.clone();
      const r = widest[i] * 1.2;
      g.scale(r, 1, r);
      g.translate(map.nodes[i].x, 0.03, map.nodes[i].z);
      geos.push(g);
    }
  }
  const merged = mergeGeoms(geos);
  return new THREE.Mesh(merged, new THREE.MeshLambertMaterial({ color: PALETTE.chowk }));
}

function mergeGeoms(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: number[] = [];
  for (const g of geos) {
    const idx = g.index;
    const pos = g.getAttribute("position");
    if (idx) for (let i = 0; i < idx.count; i++) { const j = idx.getX(i); positions.push(pos.getX(j), pos.getY(j), pos.getZ(j)); }
    else for (let i = 0; i < pos.count; i++) positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  out.computeVertexNormals();
  return out;
}
```

- [ ] **Step 7: Run tests** — `npm test` → all PASS.

- [ ] **Step 8: Wire into GameApp** — rename `buildPlaceholder` → `buildWorld`; delete the orange box; add:

```ts
import { buildRoads } from "./world/roadMesh";
import { MAP } from "./world/mapData";
// inside buildWorld(), after ground:
this.scene.add(buildRoads(MAP));
```

- [ ] **Step 9: Verify in browser** — the real Deoghar network appears: dense organic street web, wide dark Deoghar Road/Bypass with cream dashes, tan galis threading between blocks, plaza discs at major chowks. Zoom out: street pattern matches OSM's Deoghar. Note fps + draw calls (expect calls ≤ 10, fps 60).

- [ ] **Step 10: Commit** — `git add -A && git commit -m "feat: road ribbons, centerline dashes, chowk discs from real map data"`

---

### Task 8: Procedural buildings (TDD lots → instanced city)

**Files:** Create: `src/game/world/lots.ts`, `src/game/world/__tests__/lots.test.ts`, `src/game/world/buildings.ts`. Modify: `src/game/GameApp.ts`

- [ ] **Step 1: Write failing lots test** — `src/game/world/__tests__/lots.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { mulberry32 } from "../../engine/rng";
import { generateLots } from "../lots";
import { pointSegDist } from "../geom2d";
import { CellGrid } from "../geom2d";
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
```

- [ ] **Step 2: Run to verify failure** — module not found.

- [ ] **Step 3: Implement `src/game/world/lots.ts`**

```ts
import type { Rng } from "../engine/rng";
import { range } from "../engine/rng";
import { CellGrid } from "./geom2d";
import type { Lot, MapData } from "./types";
import { PALETTE } from "./palette";

interface ClsRule { prob: number; depth: [number, number]; lotW: [number, number]; floors: [number, number]; shopProb: number }
const RULES: Record<string, ClsRule> = {
  primary: { prob: 0.9, depth: [6, 10], lotW: [6, 10], floors: [1, 3], shopProb: 0.7 },
  secondary: { prob: 0.85, depth: [6, 10], lotW: [6, 10], floors: [1, 3], shopProb: 0.35 },
  tertiary: { prob: 0.75, depth: [6, 11], lotW: [7, 12], floors: [1, 2], shopProb: 0.15 },
  residential: { prob: 0.65, depth: [6, 11], lotW: [8, 14], floors: [1, 2], shopProb: 0 },
};
const MARGIN = 1.5;
const JUNCTION_CLEAR = 12;
const FLOOR_H = 3.1;

export function generateLots(map: MapData, rng: Rng, grid: CellGrid): Lot[] {
  const lots: Lot[] = [];
  for (const e of map.edges) {
    const rule = RULES[e.cls];
    if (!rule) continue;
    const a = map.nodes[e.a], b = map.nodes[e.b];
    for (let i = 0; i < e.pts.length - 1; i++) {
      const [ax, az] = e.pts[i], [bx, bz] = e.pts[i + 1];
      const segLen = Math.hypot(bx - ax, bz - az);
      if (segLen < 4) continue;
      const dx = (bx - ax) / segLen, dz = (bz - az) / segLen;
      const nx = -dz, nz = dx;
      let s = range(rng, 2, 6);
      while (s < segLen - 2) {
        const lotW = range(rng, rule.lotW[0], rule.lotW[1]);
        const cx = ax + dx * s, cz = az + dz * s;
        for (const side of [1, -1]) {
          if (rng() > rule.prob) continue;
          const depth = range(rng, rule.depth[0], rule.depth[1]);
          const off = e.width / 2 + MARGIN + depth / 2;
          const x = cx + nx * off * side, z = cz + nz * off * side;
          if (Math.hypot(x - a.x, z - a.z) < JUNCTION_CLEAR || Math.hypot(x - b.x, z - b.z) < JUNCTION_CLEAR) continue;
          if (!grid.tryClaim(x, z)) continue;
          const floors = Math.round(range(rng, rule.floors[0], rule.floors[1]));
          lots.push({
            x, z,
            rotY: Math.atan2(-dz, dx),
            w: lotW * range(rng, 0.8, 1.0),
            d: depth,
            h: floors * FLOOR_H * range(rng, 0.9, 1.1),
            colorIdx: Math.floor(rng() * PALETTE.walls.length),
            shop: rng() < rule.shopProb,
          });
        }
        s += lotW + range(rng, 0.5, 3);
      }
    }
  }
  return lots;
}
```

- [ ] **Step 4: Run tests** — `npm test` → PASS. (If the corridor test fails, the bug is the offset math: offset must be `width/2 + MARGIN + depth/2` so the *near face*, not center, clears the road.)

- [ ] **Step 5: Implement `src/game/world/buildings.ts`**

```ts
import * as THREE from "three";
import type { Lot, MapData } from "./types";
import { PALETTE } from "./palette";

export function buildCity(lots: Lot[], map: MapData): THREE.Group {
  const group = new THREE.Group();

  const box = new THREE.BoxGeometry(1, 1, 1);
  box.translate(0, 0.5, 0);
  const mat = new THREE.MeshLambertMaterial();
  const mesh = new THREE.InstancedMesh(box, mat, lots.length);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  lots.forEach((lot, i) => {
    dummy.position.set(lot.x, 0, lot.z);
    dummy.rotation.set(0, lot.rotY, 0);
    dummy.scale.set(lot.w, lot.h, lot.d);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, color.set(PALETTE.walls[lot.colorIdx]));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  group.add(mesh);

  const shops = lots.filter((l) => l.shop);
  if (shops.length > 0) {
    const awningGeo = new THREE.BoxGeometry(1, 0.15, 1.4);
    const awnings = new THREE.InstancedMesh(awningGeo, new THREE.MeshLambertMaterial(), shops.length);
    shops.forEach((lot, i) => {
      const toRoad = new THREE.Vector3(Math.sin(lot.rotY), 0, Math.cos(lot.rotY)); // perpendicular-ish accent; visual pass tunes
      dummy.position.set(lot.x - toRoad.x * (lot.d / 2), 2.6, lot.z - toRoad.z * (lot.d / 2));
      dummy.rotation.set(0, lot.rotY, 0.12);
      dummy.scale.set(Math.max(3, lot.w * 0.8), 1, 1);
      dummy.updateMatrix();
      awnings.setMatrixAt(i, dummy.matrix);
      awnings.setColorAt(i, color.set(PALETTE.awnings[i % PALETTE.awnings.length]));
    });
    awnings.instanceMatrix.needsUpdate = true;
    if (awnings.instanceColor) awnings.instanceColor.needsUpdate = true;
    group.add(awnings);
  }

  group.add(realFootprints(map));
  return group;
}

function realFootprints(map: MapData): THREE.Mesh {
  const geos: THREE.BufferGeometry[] = [];
  for (const b of map.buildings) {
    if (b.pts.length < 3) continue;
    const shape = new THREE.Shape();
    shape.moveTo(b.pts[0][0], -b.pts[0][1]);
    for (let i = 1; i < b.pts.length; i++) shape.lineTo(b.pts[i][0], -b.pts[i][1]);
    const h = 4 + (b.pts.length % 4);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    geos.push(geo);
  }
  const positions: number[] = [];
  for (const g of geos) {
    const pos = g.getAttribute("position");
    const idx = g.index;
    if (idx) for (let i = 0; i < idx.count; i++) { const j = idx.getX(i); positions.push(pos.getX(j), pos.getY(j), pos.getZ(j)); }
    else for (let i = 0; i < pos.count; i++) positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  merged.computeVertexNormals();
  const mesh = new THREE.Mesh(merged, new THREE.MeshLambertMaterial({ color: PALETTE.walls[0] }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
```

- [ ] **Step 6: Wire into GameApp** `buildWorld()`:

```ts
import { mulberry32 } from "./engine/rng";
import { CellGrid } from "./world/geom2d";
import { generateLots } from "./world/lots";
import { buildCity } from "./world/buildings";
// after roads:
const grid = new CellGrid(4);
const lots = generateLots(MAP, mulberry32(814112), grid);
this.scene.add(buildCity(lots, MAP));
this.grid = grid; // keep as field — Task 9 trees reuse it so trees never spawn inside buildings
```

Add field `private grid!: CellGrid;`.

- [ ] **Step 7: Verify in browser** — city blocks line every street; warm plaster palette; primaries read as bazaar strips (awnings); shadows long; no building sits on a road (spot-check several areas, especially curved roads); reload twice → identical city (seeded). Stats: calls should stay ≤ ~15, tris < 2M, fps 60 desktop.

- [ ] **Step 8: Commit** — `git add -A && git commit -m "feat: seeded procedural city blocks + real OSM footprints (instanced)"`

---

### Task 9: Props — trees, lampposts, Baidyanath temple, Shivganga, ground

**Files:** Create: `src/game/world/props.ts`. Modify: `src/game/GameApp.ts`

- [ ] **Step 1: Implement `src/game/world/props.ts`**

```ts
import * as THREE from "three";
import type { Rng } from "../engine/rng";
import { range } from "../engine/rng";
import { CellGrid } from "./geom2d";
import type { MapData } from "./types";
import { PALETTE } from "./palette";

export function buildGround(): THREE.Mesh {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshLambertMaterial({ color: PALETTE.ground }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  return ground;
}

interface Spot { x: number; z: number; s: number }

function roadsideSpots(map: MapData, rng: Rng, grid: CellGrid, classes: string[], every: number, prob: number, offsetExtra: number): Spot[] {
  const spots: Spot[] = [];
  for (const e of map.edges) {
    if (!classes.includes(e.cls)) continue;
    for (let i = 0; i < e.pts.length - 1; i++) {
      const [ax, az] = e.pts[i], [bx, bz] = e.pts[i + 1];
      const segLen = Math.hypot(bx - ax, bz - az);
      const dx = (bx - ax) / (segLen || 1), dz = (bz - az) / (segLen || 1);
      for (let s = every / 2; s < segLen; s += every) {
        if (rng() > prob) continue;
        const side = rng() < 0.5 ? 1 : -1;
        const off = e.width / 2 + offsetExtra;
        const x = ax + dx * s + -dz * off * side, z = az + dz * s + dx * off * side;
        if (!grid.tryClaim(x, z)) continue;
        spots.push({ x, z, s: range(rng, 0.8, 1.3) });
      }
    }
  }
  return spots;
}

export function buildTrees(map: MapData, rng: Rng, grid: CellGrid): THREE.Group {
  const spots = roadsideSpots(map, rng, grid, ["residential", "tertiary"], 26, 0.45, 3.2);
  const group = new THREE.Group();
  if (spots.length === 0) return group;

  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 2.4, 5);
  trunkGeo.translate(0, 1.2, 0);
  const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshLambertMaterial({ color: PALETTE.trunk }), spots.length);

  const canopyGeo = new THREE.IcosahedronGeometry(1.8, 0);
  canopyGeo.translate(0, 3.6, 0);
  const canopies = new THREE.InstancedMesh(canopyGeo, new THREE.MeshLambertMaterial(), spots.length);
  canopies.castShadow = true;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  spots.forEach((p, i) => {
    dummy.position.set(p.x, 0, p.z);
    dummy.rotation.set(0, p.s * 7, 0);
    dummy.scale.setScalar(p.s);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    canopies.setMatrixAt(i, dummy.matrix);
    canopies.setColorAt(i, color.set(PALETTE.canopy[i % PALETTE.canopy.length]));
  });
  trunks.instanceMatrix.needsUpdate = true;
  canopies.instanceMatrix.needsUpdate = true;
  if (canopies.instanceColor) canopies.instanceColor.needsUpdate = true;
  group.add(trunks, canopies);
  return group;
}

export function buildLampposts(map: MapData, rng: Rng, grid: CellGrid): THREE.Group {
  const spots = roadsideSpots(map, rng, grid, ["primary", "secondary"], 35, 0.85, 1.2);
  const group = new THREE.Group();
  if (spots.length === 0) return group;
  const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, 5.5, 5);
  poleGeo.translate(0, 2.75, 0);
  const headGeo = new THREE.BoxGeometry(0.5, 0.18, 0.25);
  headGeo.translate(0, 5.4, 0);
  const poles = new THREE.InstancedMesh(poleGeo, new THREE.MeshLambertMaterial({ color: PALETTE.lamppost }), spots.length);
  const heads = new THREE.InstancedMesh(headGeo, new THREE.MeshLambertMaterial({ color: 0xfff2cc, emissive: 0x665522 }), spots.length);
  const dummy = new THREE.Object3D();
  spots.forEach((p, i) => {
    dummy.position.set(p.x, 0, p.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    poles.setMatrixAt(i, dummy.matrix);
    heads.setMatrixAt(i, dummy.matrix);
  });
  poles.instanceMatrix.needsUpdate = true;
  heads.instanceMatrix.needsUpdate = true;
  group.add(poles, heads);
  return group;
}

export function buildTemple(map: MapData): THREE.Group {
  const lm = map.landmarks.find((l) => l.key === "baidyanath-temple");
  const group = new THREE.Group();
  if (!lm) return group;
  const lambert = (c: number) => new THREE.MeshLambertMaterial({ color: c });

  const plaza = new THREE.Mesh(new THREE.CircleGeometry(26, 28), lambert(0xd9c39a));
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0.08;
  group.add(plaza);

  const base = new THREE.Mesh(new THREE.BoxGeometry(16, 1.2, 16), lambert(PALETTE.temple.base));
  base.position.y = 0.6;
  const hall = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 10), lambert(PALETTE.temple.base));
  hall.position.y = 1.2 + 3;
  group.add(base, hall);

  const tiers = [7, 5.6, 4.2, 2.9, 1.7];
  tiers.forEach((w, i) => {
    const tier = new THREE.Mesh(new THREE.BoxGeometry(w, 2.8, w), lambert(PALETTE.temple.shikhara));
    tier.position.y = 7.2 + 2.8 * i + 1.4;
    tier.castShadow = true;
    group.add(tier);
  });
  const kalashY = 7.2 + 2.8 * tiers.length;
  const kalash = new THREE.Mesh(new THREE.SphereGeometry(0.8, 10, 8), lambert(PALETTE.temple.gold));
  kalash.position.y = kalashY + 0.8;
  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.4, 8), lambert(PALETTE.temple.gold));
  spire.position.y = kalashY + 2.1;
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1), new THREE.MeshBasicMaterial({ color: PALETTE.temple.flag, side: THREE.DoubleSide }));
  flag.position.set(0.8, kalashY + 2.6, 0);
  group.add(kalash, spire, flag);

  group.traverse((o) => { if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; } });
  group.position.set(lm.x, 0, lm.z);
  return group;
}

export function buildWater(map: MapData): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: PALETTE.water, transparent: true, opacity: 0.92 });
  let drewAny = false;
  for (const w of map.water) {
    if (w.pts.length < 3) continue;
    const shape = new THREE.Shape();
    shape.moveTo(w.pts[0][0], -w.pts[0][1]);
    for (let i = 1; i < w.pts.length; i++) shape.lineTo(w.pts[i][0], -w.pts[i][1]);
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.05;
    group.add(mesh);
    drewAny = true;
  }
  if (!drewAny) {
    const lm = map.landmarks.find((l) => l.key === "shivganga");
    if (lm) {
      const mesh = new THREE.Mesh(new THREE.CircleGeometry(55, 28), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(lm.x, 0.05, lm.z);
      group.add(mesh);
    }
  }
  return group;
}
```

- [ ] **Step 2: Wire into GameApp** `buildWorld()` — replace the old ground line and add props (order matters: lots claim grid cells first, then trees/lampposts reuse the same `grid`):

```ts
import { buildGround, buildLampposts, buildTemple, buildTrees, buildWater } from "./world/props";
// buildWorld() final shape:
this.sky = new SkyRig(this.scene);
this.scene.add(buildGround());
this.scene.add(buildRoads(MAP));
const rng = mulberry32(814112);
const grid = new CellGrid(4);
this.scene.add(buildCity(generateLots(MAP, rng, grid), MAP));
this.scene.add(buildTrees(MAP, rng, grid));
this.scene.add(buildLampposts(MAP, rng, grid));
this.scene.add(buildTemple(MAP));
this.scene.add(buildWater(MAP));
```

- [ ] **Step 3: Verify in browser** — temple shikhara towers over the old town with gold kalash catching sun; Shivganga water near it; green canopies dot residential lanes; lampposts march along Deoghar Road; nothing intersects roads. fps 60, calls ≤ ~22.

- [ ] **Step 4: Run full test suite + build** — `npm test` and `npm run build` → green.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: trees, lampposts, Baidyanath temple, Shivganga water, ground"`

---

### Task 10: Milestone — visual acceptance + tag

- [ ] **Step 1: Full visual pass via Chrome DevTools MCP** — load `http://localhost:5173`, take screenshots: (a) wide aerial of whole city, (b) low angle near temple, (c) Tower Chowk area street level. Check against spec §4.2: golden-hour mood, dashes, chowks, galis visible, shadows long, no z-fighting shimmer while orbiting.
- [ ] **Step 2: Performance check** — stats overlay ≥ 55 fps sustained while orbiting at street level on desktop; draw calls ≤ 25; tris ≤ 2.5M. If calls exceed budget, the culprit is per-landmark groups — merge, don't add lights.
- [ ] **Step 3: Fix anything found, commit fixes** — visual tuning (lot density, tree probability, fog distances, dash spacing) is expected here; tune constants in `lots.ts` RULES / `props.ts` spacing args / `sky.ts` fog only.
- [ ] **Step 4: Tag milestone**

```bash
git tag v0.1.0-world
git log --oneline
```

Plan 2 (driving) is authored after this tag exists.

---

## Self-review notes (completed at authoring)

- **Spec coverage (Plan-1 scope = spec §4, §7 partial, §9 partial):** map pipeline ✔ (Task 3–4), projection ✔ (Task 2), road classes/widths ✔ (Task 3/7), procedural buildings + real footprints ✔ (Task 8), golden-hour sky/sun/fog ✔ (Task 6), temple/water/props ✔ (Task 9), instancing + budgets ✔ (Tasks 8–10). Deferred per roadmap: time-of-day animation during shift (Plan 3 wires `SkyRig.timeOfDay` to shift clock), dusk emissives/headlights (Plan 4), quality scaler (Plan 4), cows/traffic (Plan 2/3), minimap (Plan 3).
- **Placeholder scan:** none — every step has full code/commands.
- **Type consistency:** `Lot`, `MapData`, `CellGrid.tryClaim`, `ribbonPositions`, `generateLots(map, rng, grid)` signatures consistent across Tasks 7–9; `SkyRig.update(focus)` matches GameApp render callback; `PALETTE.road` is `Record<string, number>` so `e.cls` indexing typechecks.
