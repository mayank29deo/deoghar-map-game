import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createRenderer } from "./engine/renderer";
import { Loop } from "./engine/loop";
import { StatsOverlay } from "./engine/stats";
import { Input } from "./engine/input";
import { mulberry32, type Rng } from "./engine/rng";
import { SkyRig } from "./world/sky";
import { buildRoads } from "./world/roadMesh";
import { MAP } from "./world/mapData";
import { CellGrid } from "./world/geom2d";
import { generateLots } from "./world/lots";
import { buildCity } from "./world/buildings";
import { buildGround, buildLampposts, buildTemple, buildTrees, buildWater, reserveLandmarkZones } from "./world/props";
import { MissionMarker } from "./world/markers";
import type { Lot } from "./world/types";
import { RoadGrid } from "./sim/roadGrid";
import { LotIndex, resolveCircleVsLots } from "./sim/collision";
import { generateOffer, near, type ActiveMission, type Offer } from "./sim/missions";
import { comboMult, parSeconds, payout } from "./sim/scoring";
import { VEHICLES } from "./vehicles/specs";
import { buildVehicle, type VehicleVisual } from "./vehicles/builders";
import { createVehState, stepVehicle, type VehState } from "./vehicles/controller";
import { ChaseCam } from "./vehicles/chaseCam";
import { useGameStore, type Screen } from "../state/gameStore";
import { leaderboard } from "../services/leaderboard";

const SHIFT_SECONDS = 300;
const COMBO_WINDOW = 40;
const OFFER_SLOTS = 3;
const OFFER_REFILL_DELAY = 4;

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
  private chase: ChaseCam;
  private specIdx = 0;
  private vehState!: VehState;
  private visual!: VehicleVisual;
  private focus = new THREE.Vector3();
  private marker = new MissionMarker();

  // shift state (game-side truth; mirrored to store at 10 Hz)
  private screen: Screen = "home";
  private shiftLeft = SHIFT_SECONDS;
  private earnings = 0;
  private deliveries = 0;
  private chain = 0;
  private comboLeft = 0;
  private bestCombo = 1;
  private speedBonuses = 0;
  private offers: Offer[] = [];
  private mission: ActiveMission | null = null;
  private offerSeq = 0;
  private refillAt = 0;
  private clock = 0;
  private missionRng: Rng = mulberry32(1);
  private syncAcc = 0;
  private slowmo = 0;
  private honkPop = 0;
  private homeAngle = 0;
  private unsub: () => void;

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
    this.controls.enabled = false;
    if (import.meta.env.DEV) this.stats = new StatsOverlay(host, this.renderer);

    this.buildWorld();
    this.scene.add(this.marker.group);
    this.input.attach();
    this.chase = new ChaseCam(this.camera);
    this.spawnVehicle();

    this.screen = useGameStore.getState().screen;
    this.specIdx = useGameStore.getState().selectedIdx;
    this.unsub = useGameStore.subscribe((s, prev) => {
      if (s.selectedIdx !== prev.selectedIdx) this.setVehicle(s.selectedIdx);
      if (s.screen !== prev.screen) this.onScreenChange(s.screen);
      if (s.pendingAccept !== null && s.pendingAccept !== prev.pendingAccept) this.acceptOffer(s.pendingAccept);
    });

    this.loop = new Loop(
      (dt) => this.update(dt),
      () => this.render(),
    );
    window.addEventListener("resize", this.onResize);
    this.loop.start();
    if (import.meta.env.DEV) (window as unknown as { __app: GameApp }).__app = this;
  }

  // ---------- world ----------
  private buildWorld() {
    this.sky = new SkyRig(this.scene);
    this.scene.add(buildGround());
    this.scene.add(buildRoads(MAP));
    const rng = mulberry32(814112);
    const grid = new CellGrid(4);
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

  private spawnVehicle() {
    const lm = MAP.landmarks.find((l) => l.key === "tower-chowk")!;
    let heading = 0;
    for (const e of MAP.edges) {
      const [ax, az] = e.pts[0];
      const [bx, bz] = e.pts[e.pts.length - 1];
      if (Math.hypot(ax - lm.x, az - lm.z) < 2 && e.pts.length > 1) { heading = Math.atan2(e.pts[1][1] - az, e.pts[1][0] - ax); break; }
      if (Math.hypot(bx - lm.x, bz - lm.z) < 2 && e.pts.length > 1) { const p = e.pts[e.pts.length - 2]; heading = Math.atan2(p[1] - bz, p[0] - bx); break; }
    }
    this.vehState = createVehState(lm.x, lm.z, heading);
    this.setVehicle(this.specIdx);
  }

  private setVehicle(i: number) {
    if (this.visual) this.scene.remove(this.visual.group);
    this.specIdx = i;
    this.visual = buildVehicle(VEHICLES[i]);
    this.visual.group.position.set(this.vehState.x, 0, this.vehState.z);
    this.scene.add(this.visual.group);
    this.chase.snap();
  }

  // ---------- screen transitions ----------
  private onScreenChange(s: Screen) {
    this.screen = s;
    if (s === "driving") this.startShift();
    if (s === "home" || s === "garage") {
      this.sky.timeOfDay = 0.15;
      this.marker.hide();
    }
  }

  private startShift() {
    this.spawnVehicle();
    this.shiftLeft = SHIFT_SECONDS;
    this.earnings = 0;
    this.deliveries = 0;
    this.chain = 0;
    this.comboLeft = 0;
    this.bestCombo = 1;
    this.speedBonuses = 0;
    this.mission = null;
    this.offers = [];
    this.offerSeq = 0;
    this.clock = 0;
    this.refillAt = 0;
    this.missionRng = mulberry32(814112 + Date.now() % 1000000);
    this.marker.hide();
    this.chase.snap();
  }

  private acceptOffer(id: number) {
    useGameStore.setState({ pendingAccept: null });
    const offer = this.offers.find((o) => o.id === id);
    if (!offer || this.mission) return;
    this.offers = this.offers.filter((o) => o.id !== id);
    this.mission = { offer, phase: "pickup", acceptedAt: this.clock, pickedAt: null };
    this.marker.show(offer.pickup.x, offer.pickup.z, "pickup");
  }

  private deliver() {
    const m = this.mission!;
    const spec = VEHICLES[this.specIdx];
    const inChain = this.comboLeft > 0;
    this.chain = inChain ? this.chain + 1 : 1;
    const combo = comboMult(this.chain);
    this.bestCombo = Math.max(this.bestCombo, combo);
    const par = parSeconds(m.offer.distM, spec.topSpeed);
    const withinPar = m.pickedAt !== null && this.clock - m.pickedAt <= par;
    if (withinPar) this.speedBonuses++;
    const amount = payout({ distM: m.offer.distM, vehicleMult: spec.payoutMult, combo, withinPar });
    this.earnings += amount;
    this.deliveries++;
    this.comboLeft = COMBO_WINDOW;
    this.mission = null;
    this.marker.hide();
    this.slowmo = 0.45;
    useGameStore.getState().hudSync({ lastDelivery: { amount, at: Date.now() } });
  }

  private endShift() {
    const store = useGameStore.getState();
    const results = {
      earnings: this.earnings,
      deliveries: this.deliveries,
      bestCombo: this.bestCombo,
      vehicleKey: VEHICLES[this.specIdx].key,
      speedBonuses: this.speedBonuses,
      isRecord: this.earnings > store.bestShift,
      rank: null as number | null,
    };
    store.finishShift(results, this.earnings);
    const handle = store.handle || "COURIER";
    leaderboard
      .submit({ handle, vehicle: VEHICLES[this.specIdx].key, earnings: this.earnings, deliveries: this.deliveries, bestCombo: this.bestCombo, createdAt: new Date().toISOString() })
      .then(() => leaderboard.rankOf(this.earnings))
      .then((rank) => {
        const cur = useGameStore.getState().results;
        if (cur) useGameStore.setState({ results: { ...cur, rank } });
      })
      .catch(() => { /* board never blocks results */ });
  }

  // ---------- per-frame ----------
  private update(rawDt: number) {
    const dt = this.slowmo > 0 ? rawDt * 0.35 : rawDt;
    if (this.slowmo > 0) this.slowmo -= rawDt;
    if (this.input.consumePress("KeyH")) this.honkPop = 0.25;

    if (this.screen !== "driving") return;

    this.clock += dt;
    this.shiftLeft -= dt;
    if (this.shiftLeft <= 0) { this.shiftLeft = 0; this.endShift(); return; }

    // offers refill
    if (!this.mission && this.offers.length < OFFER_SLOTS && this.clock >= this.refillAt) {
      this.offers = [...this.offers, generateOffer(MAP, this.vehState.x, this.vehState.z, this.missionRng, VEHICLES[this.specIdx].payoutMult, this.offerSeq++)];
      this.refillAt = this.clock + OFFER_REFILL_DELAY;
    }

    // combo countdown
    if (this.comboLeft > 0) {
      this.comboLeft -= dt;
      if (this.comboLeft <= 0) { this.comboLeft = 0; this.chain = 0; }
    }

    // physics
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

    // mission progression
    if (this.mission) {
      const m = this.mission;
      if (m.phase === "pickup" && near(next.x, next.z, m.offer.pickup)) {
        m.phase = "drop";
        m.pickedAt = this.clock;
        this.marker.show(m.offer.drop.x, m.offer.drop.z, "drop");
      } else if (m.phase === "drop" && near(next.x, next.z, m.offer.drop)) {
        this.deliver();
      }
    }

    // sun arcs toward dusk across the shift
    this.sky.timeOfDay = 0.15 + 0.85 * (1 - this.shiftLeft / SHIFT_SECONDS);

    // HUD mirror at 10 Hz
    this.syncAcc += rawDt;
    if (this.syncAcc >= 0.1) {
      this.syncAcc = 0;
      const m = this.mission;
      const target = m ? (m.phase === "pickup" ? m.offer.pickup : m.offer.drop) : null;
      useGameStore.getState().hudSync({
        timeLeft: this.shiftLeft,
        earnings: this.earnings,
        deliveries: this.deliveries,
        chain: this.chain,
        combo: comboMult(Math.max(1, this.chain)),
        comboLeft: this.comboLeft,
        speed: Math.abs(this.vehState.speed),
        missionPhase: m ? m.phase : "none",
        targetName: target ? target.name : "",
        targetDist: target ? Math.hypot(target.x - this.vehState.x, target.z - this.vehState.z) : 0,
        bearing: target ? Math.atan2(target.z - this.vehState.z, target.x - this.vehState.x) : 0,
        heading: this.vehState.heading,
        parcel: m ? m.offer.parcel : "",
        offers: this.offers,
        playerX: this.vehState.x,
        playerZ: this.vehState.z,
      });
    }
  }

  private render() {
    const dt = 1 / 60;
    if (this.screen === "driving") {
      const spec = VEHICLES[this.specIdx];
      const s = this.vehState;
      this.visual.group.position.set(s.x, 0, s.z);
      this.visual.group.rotation.y = -s.heading;
      this.visual.body.rotation.x = s.steerVis * Math.min(Math.abs(s.speed) / spec.topSpeed, 1) * 0.1;
      const pop = this.honkPop > 0 ? 1 + this.honkPop * 0.5 : 1;
      if (this.honkPop > 0) this.honkPop -= dt;
      this.visual.body.scale.setScalar(pop);
      const spin = (s.speed / 0.3) * dt;
      for (const w of this.visual.wheels) w.rotation.z -= spin;
      this.chase.update(dt, s, spec);
      this.focus.set(s.x, 0, s.z);
    } else if (this.screen === "garage") {
      const s = this.vehState;
      this.homeAngle += dt * 0.35;
      const r = 9;
      this.camera.position.set(s.x + Math.cos(this.homeAngle) * r, 3.4, s.z + Math.sin(this.homeAngle) * r);
      this.camera.lookAt(s.x, 1.1, s.z);
      this.focus.set(s.x, 0, s.z);
      this.visual.group.position.set(s.x, 0, s.z);
    } else {
      // home / results / leaderboard: slow cinematic orbit around the temple
      this.homeAngle += dt * 0.05;
      const r = 420;
      this.camera.position.set(20 + Math.cos(this.homeAngle) * r, 230, -619 + Math.sin(this.homeAngle) * r);
      this.camera.lookAt(20, 18, -619);
      this.focus.set(20, 0, -619);
    }
    this.marker.pulse(dt);
    this.sky.update(this.focus);
    this.renderer.render(this.scene, this.camera);
    this.stats?.frame();
  }

  dispose() {
    this.unsub();
    this.loop.stop();
    window.removeEventListener("resize", this.onResize);
    this.input.detach();
    this.stats?.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
