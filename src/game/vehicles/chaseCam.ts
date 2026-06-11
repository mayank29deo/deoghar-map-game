import * as THREE from "three";
import type { VehicleSpec } from "./specs";
import type { VehState } from "./controller";

export class ChaseCam {
  private pos = new THREE.Vector3();
  private look = new THREE.Vector3();
  private initialized = false;

  constructor(private camera: THREE.PerspectiveCamera) {}

  snap() { this.initialized = false; }

  update(dt: number, s: VehState, spec: VehicleSpec) {
    const back = new THREE.Vector3(-Math.cos(s.heading), 0, -Math.sin(s.heading));
    const desired = new THREE.Vector3(s.x, 0, s.z).addScaledVector(back, spec.camDist).setY(spec.camHeight);
    const ahead = new THREE.Vector3(s.x + Math.cos(s.heading) * (6 + s.speed * 0.35), 1.2, s.z + Math.sin(s.heading) * (6 + s.speed * 0.35));
    if (!this.initialized) { this.pos.copy(desired); this.look.copy(ahead); this.initialized = true; }
    this.pos.lerp(desired, 1 - Math.exp(-dt * 5.5));
    this.look.lerp(ahead, 1 - Math.exp(-dt * 9));
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.look);
    const targetFov = 60 + (Math.abs(s.speed) / spec.topSpeed) * 14;
    if (Math.abs(this.camera.fov - targetFov) > 0.1) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 4);
      this.camera.updateProjectionMatrix();
    }
  }
}
