import * as THREE from "three";
import type { Rng } from "../engine/rng";
import { range } from "../engine/rng";
import { CellGrid } from "./geom2d";
import type { MapData } from "./types";
import { PALETTE } from "./palette";

/** Claim grid cells under the temple plaza and water bodies BEFORE lot generation so buildings keep out. */
export function reserveLandmarkZones(map: MapData, grid: CellGrid): void {
  const claimDisc = (cx: number, cz: number, r: number) => {
    for (let x = cx - r; x <= cx + r; x += 4)
      for (let z = cz - r; z <= cz + r; z += 4)
        if ((x - cx) ** 2 + (z - cz) ** 2 <= r * r) grid.tryClaim(x, z);
  };
  const temple = map.landmarks.find((l) => l.key === "baidyanath-temple");
  if (temple) claimDisc(temple.x, temple.z, 30);
  for (const w of map.water) {
    if (w.pts.length < 3) continue;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [x, z] of w.pts) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
    for (let x = minX; x <= maxX; x += 4) for (let z = minZ; z <= maxZ; z += 4) grid.tryClaim(x, z);
  }
  const shiv = map.landmarks.find((l) => l.key === "shivganga");
  if (shiv) claimDisc(shiv.x, shiv.z, 58);
}

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
