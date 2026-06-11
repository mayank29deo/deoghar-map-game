import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createRenderer } from "./engine/renderer";
import { Loop } from "./engine/loop";
import { StatsOverlay } from "./engine/stats";
import { Input } from "./engine/input";
import { mulberry32 } from "./engine/rng";
import { SkyRig } from "./world/sky";
import { buildRoads } from "./world/roadMesh";
import { MAP } from "./world/mapData";
import { CellGrid } from "./world/geom2d";
import { generateLots } from "./world/lots";
import { buildCity } from "./world/buildings";
import { buildGround, buildLampposts, buildTemple, buildTrees, buildWater, reserveLandmarkZones } from "./world/props";
import type { Lot } from "./world/types";
import { RoadGrid } from "./sim/roadGrid";
import { LotIndex, resolveCircleVsLots } from "./sim/collision";
import { VEHICLES } from "./vehicles/specs";
import { buildVehicle, type VehicleVisual } from "./vehicles/builders";
import { createVehState, stepVehicle, type VehState } from "./vehicles/controller";
import { ChaseCam } from "./vehicles/chaseCam";

export class GameApp {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private loop: Loop;
  private stats?: StatsOverlay;
  private sky!: SkyRig;
  private input = new Input();
  private roadGrid!: RoadGrid;
  private lots!: Lot[];
  private lotIndex!: LotIndex;
  private mode: "drive" | "orbit" = "drive";
  private chase: ChaseCam;
  private specIdx = 0;
  private vehState!: VehState;
  private visual!: VehicleVisual;
  private focus = new THREE.Vector3();
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
    this.controls.target.set(20, 0, -619);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.maxDistance = 2500;
    this.controls.enabled = false; // drive mode default
    if (import.meta.env.DEV) this.stats = new StatsOverlay(host, this.renderer);

    this.buildWorld();
    this.input.attach();
    this.chase = new ChaseCam(this.camera);
    this.spawn();

    this.loop = new Loop(
      (dt) => this.update(dt),
      () => this.render(),
    );
    window.addEventListener("resize", this.onResize);
    this.loop.start();
    if (import.meta.env.DEV) (window as unknown as { __app: GameApp }).__app = this;
  }

  private buildWorld() {
    this.sky = new SkyRig(this.scene);
    this.scene.add(buildGround());
    this.scene.add(buildRoads(MAP));
    const rng = mulberry32(814112);
    const grid = new CellGrid(4); // reserve landmark zones, then lots, then props fill gaps
    reserveLandmarkZones(MAP, grid);
    this.lots = generateLots(MAP, rng, grid);
    this.scene.add(buildCity(this.lots, MAP));
    this.scene.add(buildTrees(MAP, rng, grid));
    this.scene.add(buildLampposts(MAP, rng, grid));
    this.scene.add(buildTemple(MAP));
    this.scene.add(buildWater(MAP));
    this.roadGrid = new RoadGrid(MAP);
    this.lotIndex = new LotIndex(this.lots);
  }

  private spawn() {
    const lm = MAP.landmarks.find((l) => l.key === "tower-chowk")!;
    let heading = 0;
    for (const e of MAP.edges) {
      const [ax, az] = e.pts[0];
      const [bx, bz] = e.pts[e.pts.length - 1];
      if (Math.hypot(ax - lm.x, az - lm.z) < 2 && e.pts.length > 1) {
        heading = Math.atan2(e.pts[1][1] - az, e.pts[1][0] - ax);
        break;
      }
      if (Math.hypot(bx - lm.x, bz - lm.z) < 2 && e.pts.length > 1) {
        const p = e.pts[e.pts.length - 2];
        heading = Math.atan2(p[1] - bz, p[0] - bx);
        break;
      }
    }
    this.vehState = createVehState(lm.x, lm.z, heading);
    this.setVehicle(0);
  }

  private setVehicle(i: number) {
    if (this.visual) this.scene.remove(this.visual.group);
    this.specIdx = i;
    this.visual = buildVehicle(VEHICLES[i]);
    this.scene.add(this.visual.group);
    this.chase.snap();
  }

  private update(dt: number) {
    if (this.input.consumePress("KeyO")) {
      this.mode = this.mode === "drive" ? "orbit" : "drive";
      this.controls.enabled = this.mode === "orbit";
      if (this.mode === "orbit") {
        this.controls.target.set(this.vehState.x, 0, this.vehState.z);
        this.camera.position.set(this.vehState.x + 120, 140, this.vehState.z + 120);
      } else this.chase.snap();
    }
    for (let i = 0; i < 5; i++) if (this.input.consumePress(`Digit${i + 1}`)) this.setVehicle(i);
    if (this.mode !== "drive") return;

    const spec = VEHICLES[this.specIdx];
    const cls = this.roadGrid.classAt(this.vehState.x, this.vehState.z);
    const surface = { cls, galiBlocked: cls === 6 && !spec.galiAllowed };
    let next = stepVehicle(
      this.vehState,
      { throttle: this.input.throttle, steer: this.input.steer, handbrake: this.input.handbrake },
      spec, surface, dt,
    );
    const res = resolveCircleVsLots(next.x, next.z, spec.radius, this.lots, this.lotIndex);
    if (res.hit) next = { ...next, x: res.x, z: res.z, speed: next.speed * 0.55 };
    this.vehState = next;
  }

  private render() {
    if (this.mode === "drive") {
      const spec = VEHICLES[this.specIdx];
      const s = this.vehState;
      this.visual.group.position.set(s.x, 0, s.z);
      this.visual.group.rotation.y = -s.heading;
      this.visual.body.rotation.x = s.steerVis * Math.min(Math.abs(s.speed) / spec.topSpeed, 1) * 0.1;
      const spin = (s.speed / 0.3) * (1 / 60);
      for (const w of this.visual.wheels) w.rotation.z -= spin;
      this.chase.update(1 / 60, s, spec);
      this.focus.set(s.x, 0, s.z);
    } else {
      this.controls.update();
      this.focus.copy(this.controls.target);
    }
    this.sky.update(this.focus);
    this.renderer.render(this.scene, this.camera);
    this.stats?.frame();
  }

  dispose() {
    this.loop.stop();
    window.removeEventListener("resize", this.onResize);
    this.input.detach();
    this.stats?.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
