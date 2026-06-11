export class Input {
  private down = new Set<string>();
  private oncePressed = new Set<string>();
  private onKey = (e: KeyboardEvent) => {
    if (e.type === "keydown") {
      if (!this.down.has(e.code)) this.oncePressed.add(e.code);
      this.down.add(e.code);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    } else this.down.delete(e.code);
  };
  attach() { window.addEventListener("keydown", this.onKey); window.addEventListener("keyup", this.onKey); }
  detach() { window.removeEventListener("keydown", this.onKey); window.removeEventListener("keyup", this.onKey); }
  get throttle(): number { return (this.down.has("KeyW") || this.down.has("ArrowUp") ? 1 : 0) + (this.down.has("KeyS") || this.down.has("ArrowDown") ? -1 : 0); }
  get steer(): number { return (this.down.has("KeyD") || this.down.has("ArrowRight") ? 1 : 0) + (this.down.has("KeyA") || this.down.has("ArrowLeft") ? -1 : 0); }
  get handbrake(): boolean { return this.down.has("Space"); }
  /** true exactly once per physical press */
  consumePress(code: string): boolean { const had = this.oncePressed.has(code); this.oncePressed.delete(code); return had; }
}
