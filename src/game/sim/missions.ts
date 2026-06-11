import type { Rng } from "../engine/rng";
import { pick } from "../engine/rng";
import type { MapData } from "../world/types";
import { payout } from "./scoring";

export interface Stop { x: number; z: number; name: string }
export interface Offer { id: number; pickup: Stop; drop: Stop; distM: number; estPay: number; parcel: string }
export interface ActiveMission { offer: Offer; phase: "pickup" | "drop"; acceptedAt: number; pickedAt: number | null }

export const ARRIVE_R = 9;

export const PARCELS = [
  "Peda box", "Puja flowers", "Tiffin dabba", "Documents", "New phone",
  "Medicines", "Banarasi sari", "School books", "Sweets hamper", "Chai patti",
];

export const SHOP_NAMES = [
  "Baba Sweets", "Jharkhand Medico", "Shree Tiffin Ghar", "Deoghar Mobile Point",
  "Mahadev General Store", "Tower Chowk Mishthan", "Saree Sadan", "Vidya Pustak Bhandar",
  "Shivam Florist", "Anand Dairy", "Baidyanath Prasadalay", "Hill View Dhaba",
];

interface Spot { x: number; z: number; name: string | null }

function candidates(map: MapData): Spot[] {
  if (map.pois.length >= 8) return map.pois;
  return map.nodes.map((n) => ({ x: n.x, z: n.z, name: null }));
}

function pickInBand(spots: Spot[], cx: number, cz: number, min: number, max: number, rng: Rng): Spot | null {
  const inBand = spots.filter((s) => {
    const d = Math.hypot(s.x - cx, s.z - cz);
    return d >= min && d <= max;
  });
  if (inBand.length === 0) return null;
  return pick(rng, inBand);
}

/** POIs sit inside buildings; snap mission stops to the nearest road node so every target is drivable. */
function snapToRoad(map: MapData, s: Spot): Spot {
  if (map.nodes.length === 0) return s;
  let best = s.x, bestZ = s.z, bestD = Infinity;
  for (const n of map.nodes) {
    const d = (n.x - s.x) ** 2 + (n.z - s.z) ** 2;
    if (d < bestD) { bestD = d; best = n.x; bestZ = n.z; }
  }
  return { x: best, z: bestZ, name: s.name };
}

export function generateOffer(map: MapData, px: number, pz: number, rng: Rng, vehicleMult: number, id: number): Offer {
  const spots = candidates(map);
  const pickup = snapToRoad(map, pickInBand(spots, px, pz, 150, 600, rng) ?? pickInBand(spots, px, pz, 0, 2000, rng) ?? { x: px + 200, z: pz, name: null });
  const drop = snapToRoad(map, pickInBand(spots, pickup.x, pickup.z, 300, 1500, rng) ?? pickInBand(spots, pickup.x, pickup.z, 100, 4000, rng) ?? { x: pickup.x + 500, z: pickup.z, name: null });
  const distM = Math.hypot(drop.x - pickup.x, drop.z - pickup.z);
  return {
    id,
    pickup: { x: pickup.x, z: pickup.z, name: pickup.name ?? pick(rng, SHOP_NAMES) },
    drop: { x: drop.x, z: drop.z, name: drop.name ?? pick(rng, SHOP_NAMES) },
    distM,
    estPay: payout({ distM, vehicleMult, combo: 1, withinPar: false }),
    parcel: pick(rng, PARCELS),
  };
}

export function near(x: number, z: number, t: { x: number; z: number }): boolean {
  return Math.hypot(x - t.x, z - t.z) <= ARRIVE_R;
}
