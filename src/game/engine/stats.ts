import type * as THREE from "three";

export class StatsOverlay {
  private el: HTMLDivElement;
  private frames = 0;
  private lastT = performance.now();

  constructor(host: HTMLElement, private renderer: THREE.WebGLRenderer) {
    this.el = document.createElement("div");
    this.el.style.cssText =
      "position:absolute;right:8px;top:8px;z-index:50;background:rgba(0,0,0,.5);color:#7CFC9A;font:11px monospace;padding:4px 8px;border-radius:4px;pointer-events:none;white-space:pre";
    host.appendChild(this.el);
  }
  frame() {
    this.frames++;
    const now = performance.now();
    if (now - this.lastT >= 500) {
      const fps = (this.frames * 1000) / (now - this.lastT);
      const i = this.renderer.info.render;
      this.el.textContent = `${fps.toFixed(0)} fps\ncalls ${i.calls}\ntris ${(i.triangles / 1000).toFixed(0)}k`;
      this.frames = 0;
      this.lastT = now;
    }
  }
  dispose() { this.el.remove(); }
}
