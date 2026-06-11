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
