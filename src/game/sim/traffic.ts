import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { Rng } from "../engine/rng";
import { pick, range } from "../engine/rng";
import type { MapData } from "../world/types";
import { polylineLength } from "../world/geom2d";

export interface CowAgent { x: number; z: number; heading: number; homeX: number; homeZ: number; speed: number; turnIn: number; fleeing: number }
export interface AutoAgent { edge: number; s: number; dir: 1 | -1; speed: number; x: number; z: number; heading: number }

const COW_LEASH = 60;
const COW_COUNT = 8;
const AUTO_COUNT = 6;

/** pure: advance a cow one tick — wanders, stays on its leash, flees briefly after a bump */
export function stepCow(c: CowAgent, rng: Rng, dt: number): CowAgent {
  let { x, z, heading, turnIn, fleeing } = c;
  turnIn -= dt;
  if (turnIn <= 0) {
    heading += range(rng, -1.2, 1.2);
    turnIn = range(rng, 1.5, 4);
  }
  const dx = x - c.homeX, dz = z - c.homeZ;
  if (Math.hypot(dx, dz) > COW_LEASH) heading = Math.atan2(-dz, -dx); // walk home
  const speed = c.speed * (fleeing > 0 ? 3.2 : 1);
  x += Math.cos(heading) * speed * dt;
  z += Math.sin(heading) * speed * dt;
  return { ...c, x, z, heading, turnIn, fleeing: Math.max(0, fleeing - dt) };
}

/** pure: advance an auto along its edge polyline; hop to a connected drivable edge at the end */
export function stepAuto(a: AutoAgent, map: MapData, adjacency: Map<number, number[]>, rng: Rng, dt: number): AutoAgent {
  const edge = map.edges[a.edge];
  const len = polylineLength(edge.pts);
  let s = a.s + a.speed * dt * a.dir;
  let edgeIdx = a.edge, dir = a.dir;
  if (s >= len || s <= 0) {
    const atNode = s >= len ? (dir === 1 ? edge.b : edge.a) : (dir === 1 ? edge.a : edge.b);
    const all = adjacency.get(atNode) ?? [];
    const onward = all.filter((i) => i !== a.edge); // no instant U-turns
    const options = onward.length > 0 ? onward : all;
    edgeIdx = options.length > 0 ? pick(rng, options) : a.edge;
    const next = map.edges[edgeIdx];
    dir = next.a === atNode ? 1 : -1;
    s = dir === 1 ? 0.01 : polylineLength(next.pts) - 0.01;
  }
  const pos = pointAt(map.edges[edgeIdx].pts, s);
  return { edge: edgeIdx, s, dir, speed: a.speed, x: pos.x, z: pos.z, heading: pos.heading };
}

function pointAt(pts: [number, number][], s: number): { x: number; z: number; heading: number } {
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const seg = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    if (acc + seg >= s || i === pts.length - 2) {
      const t = seg === 0 ? 0 : Math.max(0, Math.min(1, (s - acc) / seg));
      return {
        x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t,
        z: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t,
        heading: Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]),
      };
    }
    acc += seg;
  }
  return { x: pts[0][0], z: pts[0][1], heading: 0 };
}

export function buildAdjacency(map: MapData, classes: string[]): Map<number, number[]> {
  const adj = new Map<number, number[]>();
  map.edges.forEach((e, i) => {
    if (!classes.includes(e.cls)) return;
    if (!adj.has(e.a)) adj.set(e.a, []);
    if (!adj.has(e.b)) adj.set(e.b, []);
    adj.get(e.a)!.push(i);
    adj.get(e.b)!.push(i);
  });
  return adj;
}

// ---------- visuals + orchestration ----------

function cowGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const body = new THREE.BoxGeometry(1.5, 0.85, 0.7); body.translate(0, 1.0, 0); parts.push(body);
  const head = new THREE.BoxGeometry(0.5, 0.45, 0.4); head.translate(0.95, 1.25, 0); parts.push(head);
  const hornL = new THREE.BoxGeometry(0.18, 0.18, 0.08); hornL.translate(1.05, 1.55, 0.15); parts.push(hornL);
  const hornR = hornL.clone(); hornR.translate(0, 0, -0.3); parts.push(hornR);
  for (const [lx, lz] of [[0.55, 0.25], [0.55, -0.25], [-0.55, 0.25], [-0.55, -0.25]] as const) {
    const leg = new THREE.BoxGeometry(0.16, 0.6, 0.16); leg.translate(lx, 0.3, lz); parts.push(leg);
  }
  return mergeGeometries(parts);
}

function autoGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const cab = new THREE.BoxGeometry(1.9, 0.95, 1.25); cab.translate(-0.15, 0.92, 0); parts.push(cab);
  const roof = new THREE.BoxGeometry(2.0, 0.1, 1.3); roof.translate(-0.15, 1.5, 0); parts.push(roof);
  const nose = new THREE.BoxGeometry(0.45, 0.75, 0.95); nose.translate(0.9, 0.82, 0); parts.push(nose);
  return mergeGeometries(parts);
}

const COW_COLORS = [0xf2ede4, 0xd8c5ae, 0x8a6f58, 0xe8e0d2];
const AUTO_COLORS = [0xe9c46a, 0xf4a261, 0xe9c46a, 0x95d5b2, 0xe9c46a, 0xf6e7b2];

export class TrafficSystem {
  readonly group = new THREE.Group();
  private cows: CowAgent[] = [];
  private autos: AutoAgent[] = [];
  private cowMesh: THREE.InstancedMesh;
  private autoMesh: THREE.InstancedMesh;
  private adjacency: Map<number, number[]>;
  private dummy = new THREE.Object3D();
  private bumpCooldown = 0;

  constructor(private map: MapData, private rng: Rng) {
    // cows graze around the temple + Tower Chowk quarters
    const zones = ["baidyanath-temple", "tower-chowk"]
      .map((k) => map.landmarks.find((l) => l.key === k))
      .filter((l): l is NonNullable<typeof l> => Boolean(l));
    for (let i = 0; i < COW_COUNT; i++) {
      const zone = zones[i % Math.max(1, zones.length)] ?? { x: 0, z: 0 };
      const a = range(rng, 0, Math.PI * 2), r = range(rng, 25, 90);
      const x = zone.x + Math.cos(a) * r, z = zone.z + Math.sin(a) * r;
      this.cows.push({ x, z, homeX: x, homeZ: z, heading: range(rng, 0, Math.PI * 2), speed: range(rng, 0.5, 1.1), turnIn: range(rng, 0.5, 3), fleeing: 0 });
    }
    this.adjacency = buildAdjacency(map, ["primary", "secondary", "tertiary"]);
    const drivable = map.edges.map((e, i) => ({ e, i })).filter(({ e }) => ["primary", "secondary", "tertiary"].includes(e.cls));
    for (let i = 0; i < AUTO_COUNT && drivable.length > 0; i++) {
      const { i: edgeIdx } = pick(rng, drivable);
      this.autos.push({ edge: edgeIdx, s: 0.5, dir: 1, speed: range(rng, 5.5, 8), x: 0, z: 0, heading: 0 });
    }

    this.cowMesh = new THREE.InstancedMesh(cowGeometry(), new THREE.MeshLambertMaterial(), this.cows.length);
    this.cowMesh.castShadow = true;
    const color = new THREE.Color();
    this.cows.forEach((_, i) => this.cowMesh.setColorAt(i, color.set(COW_COLORS[i % COW_COLORS.length])));
    this.autoMesh = new THREE.InstancedMesh(autoGeometry(), new THREE.MeshLambertMaterial(), this.autos.length);
    this.autoMesh.castShadow = true;
    this.autos.forEach((_, i) => this.autoMesh.setColorAt(i, color.set(AUTO_COLORS[i % AUTO_COLORS.length])));
    this.group.add(this.cowMesh, this.autoMesh);
  }

  /** returns true when the player bumped an agent this tick (cooldown-limited) */
  update(dt: number, px: number, pz: number, pr: number): boolean {
    this.bumpCooldown = Math.max(0, this.bumpCooldown - dt);
    let bumped = false;
    this.cows = this.cows.map((c) => stepCow(c, this.rng, dt));
    this.autos = this.autos.map((a) => stepAuto(a, this.map, this.adjacency, this.rng, dt));

    this.cows.forEach((c, i) => {
      if (this.bumpCooldown === 0 && Math.hypot(c.x - px, c.z - pz) < pr + 1.0) {
        bumped = true;
        this.bumpCooldown = 1.5;
        c.fleeing = 2.5;
        c.heading = Math.atan2(c.z - pz, c.x - px);
      }
      this.dummy.position.set(c.x, 0, c.z);
      this.dummy.rotation.set(0, -c.heading, 0);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      this.cowMesh.setMatrixAt(i, this.dummy.matrix);
    });
    this.autos.forEach((a, i) => {
      if (this.bumpCooldown === 0 && Math.hypot(a.x - px, a.z - pz) < pr + 1.4) {
        bumped = true;
        this.bumpCooldown = 1.5;
      }
      this.dummy.position.set(a.x, 0, a.z);
      this.dummy.rotation.set(0, -a.heading, 0);
      this.dummy.updateMatrix();
      this.autoMesh.setMatrixAt(i, this.dummy.matrix);
    });
    this.cowMesh.instanceMatrix.needsUpdate = true;
    this.autoMesh.instanceMatrix.needsUpdate = true;
    return bumped;
  }
}
