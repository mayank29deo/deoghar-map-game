import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createRenderer } from "./engine/renderer";
import { Loop } from "./engine/loop";
import { StatsOverlay } from "./engine/stats";
import { SkyRig } from "./world/sky";
import { buildRoads } from "./world/roadMesh";
import { MAP } from "./world/mapData";
import { mulberry32 } from "./engine/rng";
import { CellGrid } from "./world/geom2d";
import { generateLots } from "./world/lots";
import { buildCity } from "./world/buildings";
import { buildGround, buildLampposts, buildTemple, buildTrees, buildWater, reserveLandmarkZones } from "./world/props";

export class GameApp {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private loop: Loop;
  private stats?: StatsOverlay;
  private sky!: SkyRig;
  private rng!: ReturnType<typeof mulberry32>;
  private grid!: CellGrid;
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
    this.controls.target.set(20, 0, -619); // Baidyanath temple area
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.maxDistance = 2500;
    if (import.meta.env.DEV) this.stats = new StatsOverlay(host, this.renderer);

    this.buildWorld();

    this.loop = new Loop(
      () => {},
      () => {
        this.controls.update();
        this.sky.update(this.controls.target);
        this.renderer.render(this.scene, this.camera);
        this.stats?.frame();
      },
    );
    window.addEventListener("resize", this.onResize);
    this.loop.start();
    if (import.meta.env.DEV) (window as unknown as { __app: GameApp }).__app = this;
  }

  private buildWorld() {
    this.sky = new SkyRig(this.scene);
    this.scene.add(buildGround());
    this.scene.add(buildRoads(MAP));
    this.rng = mulberry32(814112);
    this.grid = new CellGrid(4); // reserve landmark zones, then lots claim cells, then trees/lampposts fill gaps
    reserveLandmarkZones(MAP, this.grid);
    this.scene.add(buildCity(generateLots(MAP, this.rng, this.grid), MAP));
    this.scene.add(buildTrees(MAP, this.rng, this.grid));
    this.scene.add(buildLampposts(MAP, this.rng, this.grid));
    this.scene.add(buildTemple(MAP));
    this.scene.add(buildWater(MAP));
  }

  dispose() {
    this.loop.stop();
    window.removeEventListener("resize", this.onResize);
    this.stats?.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
