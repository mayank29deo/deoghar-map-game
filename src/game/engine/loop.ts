const SIM_DT = 1 / 60;
const MAX_FRAME = 0.1;

export class Loop {
  private raf = 0;
  private last = 0;
  private acc = 0;
  private running = false;
  onVisibility = () => { if (document.hidden) this.last = 0; };

  constructor(private update: (dt: number) => void, private render: (alpha: number) => void) {}

  start() {
    if (this.running) return;
    this.running = true;
    document.addEventListener("visibilitychange", this.onVisibility);
    const tick = (tMs: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(tick);
      const t = tMs / 1000;
      if (this.last === 0) { this.last = t; return; }
      this.acc += Math.min(t - this.last, MAX_FRAME);
      this.last = t;
      while (this.acc >= SIM_DT) { this.update(SIM_DT); this.acc -= SIM_DT; }
      this.render(this.acc / SIM_DT);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    document.removeEventListener("visibilitychange", this.onVisibility);
  }
}
