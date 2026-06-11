import raw from "../../data/deoghar-map.json";
import type { MapData } from "./types";

export const MAP: MapData = raw as unknown as MapData;

/** node index → number of incident edges */
export function nodeDegrees(map: MapData): Uint8Array {
  const deg = new Uint8Array(map.nodes.length);
  for (const e of map.edges) {
    if (deg[e.a] < 255) deg[e.a]++;
    if (deg[e.b] < 255) deg[e.b]++;
  }
  return deg;
}
