import * as THREE from "three";
import { PALETTE } from "./palette";

const VSH = `varying vec3 vWorld; void main(){ vWorld=(modelMatrix*vec4(position,1.0)).xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const FSH = `
varying vec3 vWorld;
uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uBand; uniform vec3 uSunDir; uniform vec3 uSunColor;
void main(){
  float h = normalize(vWorld).y;
  vec3 col = mix(uHorizon, uZenith, smoothstep(0.0, 0.30, h));
  col = mix(uBand, col, smoothstep(0.0, 0.08, h));
  float sunAmt = pow(max(dot(normalize(vWorld), uSunDir), 0.0), 350.0);
  float glow  = pow(max(dot(normalize(vWorld), uSunDir), 0.0), 8.0);
  col += uSunColor * (sunAmt * 1.2 + glow * 0.15);
  gl_FragColor = vec4(col, 1.0);
}`;

export class SkyRig {
  readonly sun: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  private dome: THREE.Mesh;
  private uniforms: Record<string, THREE.IUniform>;
  /** t: 0 = golden hour … 1 = dusk */
  timeOfDay = 0.15;

  constructor(scene: THREE.Scene) {
    this.uniforms = {
      uZenith: { value: new THREE.Color(PALETTE.sky.zenith) },
      uHorizon: { value: new THREE.Color(PALETTE.sky.horizon) },
      uBand: { value: new THREE.Color(PALETTE.sky.band) },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunColor: { value: new THREE.Color(PALETTE.sky.sun) },
    };
    this.dome = new THREE.Mesh(
      new THREE.SphereGeometry(4500, 32, 16),
      new THREE.ShaderMaterial({ vertexShader: VSH, fragmentShader: FSH, uniforms: this.uniforms, side: THREE.BackSide, depthWrite: false, fog: false }),
    );
    this.dome.frustumCulled = false;
    scene.add(this.dome);

    this.sun = new THREE.DirectionalLight(PALETTE.sun.color, 2.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const c = this.sun.shadow.camera;
    c.left = -700; c.right = 700; c.top = 700; c.bottom = -700; c.near = 50; c.far = 3000;
    this.sun.shadow.bias = -0.0005;
    scene.add(this.sun, this.sun.target);

    this.hemi = new THREE.HemisphereLight(PALETTE.sun.hemiSky, PALETTE.sun.hemiGround, 0.55);
    scene.add(this.hemi);

    scene.fog = new THREE.Fog(PALETTE.fog, 250, 2400);
    this.apply();
  }

  /** Aim sun + shadow box around a focus point (camera target). */
  update(focus: THREE.Vector3) {
    this.apply();
    const az = THREE.MathUtils.degToRad(255), el = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(16, 3, this.timeOfDay));
    const dir = new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), -Math.cos(el) * Math.sin(az));
    this.sun.position.copy(focus).addScaledVector(dir, 1500);
    this.sun.target.position.copy(focus);
    (this.uniforms.uSunDir.value as THREE.Vector3).copy(dir).normalize();
    this.dome.position.copy(focus);
  }

  private apply() {
    const t = this.timeOfDay;
    this.sun.intensity = THREE.MathUtils.lerp(2.2, 1.1, t);
    this.hemi.intensity = THREE.MathUtils.lerp(0.55, 0.3, t);
  }
}
