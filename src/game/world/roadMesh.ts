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
