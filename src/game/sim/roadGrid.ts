import type { MapData } from "../world/types";

export const CLS_INDEX: Record<string, number> = { primary: 1, secondary: 2, tertiary: 3, residential: 4, service: 5, gali: 6 };
const CELL = 3;
const EXTENT = 3300; // meters covered from origin in each direction

export class RoadGrid {
  readonly size = Math.ceil((EXTENT * 2) / CELL);
  private cells: Uint8Array;

  constructor(map: MapData) {
    this.cells = new Uint8Array(this.size * this.size);
    for (const e of map.edges) {
      const cls = CLS_INDEX[e.cls];
      if (!cls) continue;
      const r = e.width / 2 + 0.8;
      for (let i = 0; i < e.pts.length - 1; i++) {
        const [ax, az] = e.pts[i], [bx, bz] = e.pts[i + 1];
        const len = Math.hypot(bx - ax, bz - az);
        const steps = Math.max(1, Math.ceil(len / 1.5));
        for (let s = 0; s <= steps; s++) {
          this.stamp(ax + ((bx - ax) * s) / steps, az + ((bz - az) * s) / steps, r, cls);
        }
      }
    }
  }

  private stamp(x: number, z: number, r: number, cls: number) {
    const span = Math.ceil(r / CELL);
    const ci = Math.floor((x + EXTENT) / CELL), cj = Math.floor((z + EXTENT) / CELL);
    for (let i = ci - span; i <= ci + span; i++) {
      for (let j = cj - span; j <= cj + span; j++) {
        if (i < 0 || j < 0 || i >= this.size || j >= this.size) continue;
        const cx = i * CELL - EXTENT + CELL / 2, cz = j * CELL - EXTENT + CELL / 2;
        if ((cx - x) ** 2 + (cz - z) ** 2 > r * r) continue;
        const k = j * this.size + i;
        const cur = this.cells[k];
        if (cur === 0 || cls < cur) this.cells[k] = cls; // lower index = wider road wins
      }
    }
  }

  classAt(x: number, z: number): number {
    const i = Math.floor((x + EXTENT) / CELL), j = Math.floor((z + EXTENT) / CELL);
    if (i < 0 || j < 0 || i >= this.size || j >= this.size) return 0;
    return this.cells[j * this.size + i];
  }
}
