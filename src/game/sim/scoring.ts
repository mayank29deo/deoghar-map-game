export function comboMult(chain: number): number {
  return Math.min(1 + 0.25 * (Math.max(1, chain) - 1), 3);
}

const ROUTE_FACTOR = 1.4; // straight-line → street-route estimate

export function payout(p: { distM: number; vehicleMult: number; combo: number; withinPar: boolean }): number {
  const estKm = (p.distM * ROUTE_FACTOR) / 1000;
  const base = 40 + 25 * estKm;
  const bonus = p.withinPar ? 30 : 0;
  const raw = (base + bonus) * p.vehicleMult * p.combo;
  return Math.round(raw / 5) * 5;
}

/** Time window for the speed bonus: route estimate at ~55% of top speed, plus grace. */
export function parSeconds(distM: number, topSpeed: number): number {
  return (distM * ROUTE_FACTOR) / (topSpeed * 0.55) + 20;
}
