import * as THREE from "three";
import type { Lot, MapData } from "./types";
import { PALETTE } from "./palette";

export function buildCity(lots: Lot[], map: MapData): THREE.Group {
  const group = new THREE.Group();

  const box = new THREE.BoxGeometry(1, 1, 1);
  box.translate(0, 0.5, 0);
  // vertex colors multiply with per-instance color: shade the roof (top face) darker than walls
  {
    const pos = box.getAttribute("position");
    const vc = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const isTop = pos.getY(i) > 0.99;
      const v = isTop ? 0.78 : 1.0;
      vc[i * 3] = v; vc[i * 3 + 1] = v; vc[i * 3 + 2] = v;
    }
    box.setAttribute("color", new THREE.BufferAttribute(vc, 3));
  }
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
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
      // shift the awning toward the road side of the lot (lot front faces its source road)
      const toRoad = new THREE.Vector3(Math.sin(lot.rotY), 0, Math.cos(lot.rotY));
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
  const positions: number[] = [];
  for (const b of map.buildings) {
    if (b.pts.length < 3) continue;
    const shape = new THREE.Shape();
    shape.moveTo(b.pts[0][0], -b.pts[0][1]);
    for (let i = 1; i < b.pts.length; i++) shape.lineTo(b.pts[i][0], -b.pts[i][1]);
    const h = 4 + (b.pts.length % 4);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    const pos = geo.getAttribute("position");
    const idx = geo.index;
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
