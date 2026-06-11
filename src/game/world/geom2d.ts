export function pointSegDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const abx = bx - ax, abz = bz - az;
  const len2 = abx * abx + abz * abz;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * abx + (pz - az) * abz) / len2));
  const dx = px - (ax + t * abx), dz = pz - (az + t * abz);
  return Math.hypot(dx, dz);
}

export function polylineLength(pts: [number, number][]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return len;
}

export class CellGrid {
  private used = new Set<string>();
  constructor(private cell: number) {}
  tryClaim(x: number, z: number): boolean {
    const key = `${Math.floor(x / this.cell)},${Math.floor(z / this.cell)}`;
    if (this.used.has(key)) return false;
    this.used.add(key);
    return true;
  }
}
