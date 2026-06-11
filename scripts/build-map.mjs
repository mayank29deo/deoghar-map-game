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
