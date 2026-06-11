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
