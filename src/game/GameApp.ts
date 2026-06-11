import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createRenderer } from "./engine/renderer";
import { Loop } from "./engine/loop";
import { StatsOverlay } from "./engine/stats";
import { PALETTE } from "./world/palette";
import { SkyRig } from "./world/sky";
import { buildRoads } from "./world/roadMesh";
import { MAP } from "./world/mapData";
import { mulberry32 } from "./engine/rng";
import { CellGrid } from "./world/geom2d";
import { generateLots } from "./world/lots";
import { buildCity } from "./world/buildings";

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
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), new THREE.MeshLambertMaterial({ color: PALETTE.ground }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.scene.add(buildRoads(MAP));
    const rng = mulberry32(814112);
    const grid = new CellGrid(4);
    this.scene.add(buildCity(generateLots(MAP, rng, grid), MAP));
    this.rng = rng;
    this.grid = grid; // props (Task 9) reuse both so trees never spawn inside buildings
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
