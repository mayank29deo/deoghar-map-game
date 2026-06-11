import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createRenderer } from "./engine/renderer";
import { Loop } from "./engine/loop";
import { StatsOverlay } from "./engine/stats";
import { PALETTE } from "./world/palette";

export class GameApp {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private loop: Loop;
  private stats?: StatsOverlay;
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
        this.renderer.render(this.scene, this.camera);
        this.stats?.frame();
      },
    );
    window.addEventListener("resize", this.onResize);
    this.loop.start();
  }

  private buildWorld() {
    this.scene.background = new THREE.Color(PALETTE.sky.horizon);
    const sun = new THREE.DirectionalLight(PALETTE.sun.color, 2.0);
    sun.position.set(-400, 300, 200);
    this.scene.add(sun, new THREE.AmbientLight(0xffe0c0, 0.6));
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), new THREE.MeshLambertMaterial({ color: PALETTE.ground }));
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);
    const box = new THREE.Mesh(new THREE.BoxGeometry(40, 40, 40), new THREE.MeshLambertMaterial({ color: 0xe76f51 }));
    box.position.set(20, 20, -619);
    this.scene.add(box);
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
