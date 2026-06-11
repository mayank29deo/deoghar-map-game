import type { Lot } from "../world/types";

const CELL = 12;

export class LotIndex {
  private map = new Map<string, number[]>();
  constructor(lots: Lot[]) {
    lots.forEach((lot, i) => {
      const r = Math.hypot(lot.w, lot.d) / 2;
      const i0 = Math.floor((lot.x - r) / CELL), i1 = Math.floor((lot.x + r) / CELL);
      const j0 = Math.floor((lot.z - r) / CELL), j1 = Math.floor((lot.z + r) / CELL);
      for (let a = i0; a <= i1; a++) for (let b = j0; b <= j1; b++) {
        const k = `${a},${b}`;
        let arr = this.map.get(k);
        if (!arr) this.map.set(k, (arr = []));
        arr.push(i);
      }
    });
  }
  nearby(x: number, z: number): number[] {
    return this.map.get(`${Math.floor(x / CELL)},${Math.floor(z / CELL)}`) ?? [];
  }
}

export interface CollisionResult { x: number; z: number; hit: boolean; nx: number; nz: number }

/** Push circle (x,z,r) out of any overlapping lot OBB. One iteration is enough at arcade speeds. */
export function resolveCircleVsLots(x: number, z: number, r: number, lots: Lot[], index: LotIndex): CollisionResult {
  let hit = false, nx = 0, nz = 0;
  for (const i of index.nearby(x, z)) {
    const lot = lots[i];
    const cos = Math.cos(-lot.rotY), sin = Math.sin(-lot.rotY);
    const dx = x - lot.x, dz = z - lot.z;
    const lx = dx * cos - dz * sin, lz = dx * sin + dz * cos;
    const hw = lot.w / 2, hd = lot.d / 2;
    const cx = Math.max(-hw, Math.min(hw, lx)), cz = Math.max(-hd, Math.min(hd, lz));
    let px = lx - cx, pz = lz - cz;
    const dist = Math.hypot(px, pz);
    let pen: number;
    if (dist > 1e-9) {
      pen = r - dist;
      if (pen <= 0) continue;
      px /= dist; pz /= dist;
    } else {
      // center inside box: push out along the shallowest face
      const dxFace = hw - Math.abs(lx), dzFace = hd - Math.abs(lz);
      if (dxFace < dzFace) { px = Math.sign(lx) || 1; pz = 0; pen = dxFace + r; }
      else { px = 0; pz = Math.sign(lz) || 1; pen = dzFace + r; }
    }
    // local normal → world
    const wcos = Math.cos(lot.rotY), wsin = Math.sin(lot.rotY);
    const wx = px * wcos - pz * wsin, wz = px * wsin + pz * wcos;
    x += wx * pen; z += wz * pen;
    nx = wx; nz = wz; hit = true;
  }
  return { x, z, hit, nx, nz };
}
