import * as THREE from "three";

const SAFFRON = 0xff9933, TEAL = 0x2a9d8f;

export class MissionMarker {
  readonly group = new THREE.Group();
  private ring: THREE.Mesh;
  private beam: THREE.Mesh;
  private t = 0;

  constructor() {
    this.beam = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.8, 26, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: SAFFRON, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
    );
    this.beam.position.y = 13;
    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(4.2, 0.35, 8, 28),
      new THREE.MeshBasicMaterial({ color: SAFFRON, transparent: true, opacity: 0.9, depthWrite: false }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.4;
    this.group.add(this.beam, this.ring);
    this.group.visible = false;
  }

  show(x: number, z: number, kind: "pickup" | "drop") {
    const c = kind === "pickup" ? SAFFRON : TEAL;
    (this.beam.material as THREE.MeshBasicMaterial).color.set(c);
    (this.ring.material as THREE.MeshBasicMaterial).color.set(c);
    this.group.position.set(x, 0, z);
    this.group.visible = true;
  }

  hide() { this.group.visible = false; }

  /** call every render frame */
  pulse(dt: number) {
    if (!this.group.visible) return;
    this.t += dt;
    const s = 1 + Math.sin(this.t * 3.2) * 0.12;
    this.ring.scale.setScalar(s);
    this.beam.rotation.y += dt * 0.8;
  }
}
