import type { Rng } from "../engine/rng";
import { range } from "../engine/rng";
import { CellGrid } from "./geom2d";
import type { Lot, MapData } from "./types";
import { PALETTE } from "./palette";

interface ClsRule { prob: number; depth: [number, number]; lotW: [number, number]; floors: [number, number]; shopProb: number }
const RULES: Record<string, ClsRule> = {
  primary: { prob: 0.9, depth: [6, 10], lotW: [6, 10], floors: [1, 3], shopProb: 0.7 },
  secondary: { prob: 0.85, depth: [6, 10], lotW: [6, 10], floors: [1, 3], shopProb: 0.35 },
  tertiary: { prob: 0.75, depth: [6, 11], lotW: [7, 12], floors: [1, 2], shopProb: 0.15 },
  residential: { prob: 0.65, depth: [6, 11], lotW: [8, 14], floors: [1, 2], shopProb: 0 },
};
const MARGIN = 1.5;
const JUNCTION_CLEAR = 12;
const FLOOR_H = 3.1;

export function generateLots(map: MapData, rng: Rng, grid: CellGrid): Lot[] {
  const lots: Lot[] = [];
  for (const e of map.edges) {
    const rule = RULES[e.cls];
    if (!rule) continue;
    const a = map.nodes[e.a], b = map.nodes[e.b];
    for (let i = 0; i < e.pts.length - 1; i++) {
      const [ax, az] = e.pts[i], [bx, bz] = e.pts[i + 1];
      const segLen = Math.hypot(bx - ax, bz - az);
      if (segLen < 4) continue;
      const dx = (bx - ax) / segLen, dz = (bz - az) / segLen;
      const nx = -dz, nz = dx;
      let s = range(rng, 2, 6);
      while (s < segLen - 2) {
        const lotW = range(rng, rule.lotW[0], rule.lotW[1]);
        const cx = ax + dx * s, cz = az + dz * s;
        for (const side of [1, -1]) {
          if (rng() > rule.prob) continue;
          const depth = range(rng, rule.depth[0], rule.depth[1]);
          const off = e.width / 2 + MARGIN + depth / 2;
          const x = cx + nx * off * side, z = cz + nz * off * side;
          if (Math.hypot(x - a.x, z - a.z) < JUNCTION_CLEAR || Math.hypot(x - b.x, z - b.z) < JUNCTION_CLEAR) continue;
          if (!grid.tryClaim(x, z)) continue;
          const floors = Math.round(range(rng, rule.floors[0], rule.floors[1]));
          lots.push({
            x, z,
            rotY: Math.atan2(-dz, dx),
            w: lotW * range(rng, 0.8, 1.0),
            d: depth,
            h: floors * FLOOR_H * range(rng, 0.9, 1.1),
            colorIdx: Math.floor(rng() * PALETTE.walls.length),
            shop: rng() < rule.shopProb,
          });
        }
        s += lotW + range(rng, 0.5, 3);
      }
    }
  }
  return lots;
}
