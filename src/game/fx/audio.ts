const MUTE_KEY = "deoghar-dash:muted";

/** Tiny WebAudio synth — no audio files. Lazy-inits on first user gesture. */
class GameAudio {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  muted = false;

  constructor() {
    try { this.muted = localStorage.getItem(MUTE_KEY) === "1"; } catch { /* default unmuted */ }
  }

  /** must be called from a user-gesture context at least once */
  ensure() {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = "sawtooth";
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = "lowpass";
      this.engineFilter.frequency.value = 320;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(this.engineFilter).connect(this.engineGain).connect(this.ctx.destination);
      this.engineOsc.start();
    } catch { this.ctx = null; }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    try { localStorage.setItem(MUTE_KEY, this.muted ? "1" : "0"); } catch { /* ignore */ }
    if (this.muted && this.engineGain && this.ctx) this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    return this.muted;
  }

  setEngine(speedFrac: number, on: boolean, basePitch = 52) {
    if (!this.ctx || !this.engineOsc || !this.engineGain) return;
    const t = this.ctx.currentTime;
    const target = on && !this.muted ? 0.028 + speedFrac * 0.02 : 0;
    this.engineGain.gain.setTargetAtTime(target, t, 0.12);
    this.engineOsc.frequency.setTargetAtTime(basePitch + speedFrac * 95, t, 0.08);
    this.engineFilter!.frequency.setTargetAtTime(280 + speedFrac * 900, t, 0.1);
  }

  private blip(freq: number, dur: number, at = 0, type: OscillatorType = "sine", vol = 0.16) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + at;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  horn(vehicleKey: string) {
    this.ensure();
    switch (vehicleKey) {
      case "auto": this.blip(523, 0.18, 0, "square", 0.12); this.blip(415, 0.22, 0.16, "square", 0.12); break;
      case "bike": this.blip(700, 0.2, 0, "square", 0.1); break;
      case "scooty": this.blip(620, 0.18, 0, "square", 0.1); break;
      case "sedan": this.blip(440, 0.3, 0, "square", 0.09); this.blip(554, 0.3, 0, "square", 0.09); break;
      default: this.blip(330, 0.35, 0, "square", 0.11); this.blip(415, 0.35, 0, "square", 0.11);
    }
  }

  pickup() { this.blip(660, 0.12); this.blip(880, 0.16, 0.09); }
  deliver() { this.blip(880, 0.14); this.blip(1175, 0.22, 0.1); this.blip(1568, 0.18, 0.22, "triangle", 0.12); }
  comboLost() { this.blip(196, 0.3, 0, "triangle", 0.1); }
  jingle() { [523, 659, 784, 1047].forEach((f, i) => this.blip(f, 0.22, i * 0.13, "triangle", 0.14)); }
}

export const audio = new GameAudio();
