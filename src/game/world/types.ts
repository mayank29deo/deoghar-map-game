export interface MapNode { x: number; z: number }
export interface MapEdge { id: number; a: number; b: number; cls: string; width: number; name: string | null; pts: [number, number][] }
export interface Poi { id: number; name: string | null; type: string; x: number; z: number }
export interface Landmark { key: string; name: string; kind: string; x: number; z: number }
export interface Footprint { pts: [number, number][] }
export interface MapData {
  meta: { bbox: number[]; origin: { lat: number; lon: number }; generated: string };
  nodes: MapNode[]; edges: MapEdge[]; pois: Poi[]; buildings: Footprint[]; water: Footprint[]; landmarks: Landmark[];
}
export interface Lot { x: number; z: number; rotY: number; w: number; d: number; h: number; colorIdx: number; shop: boolean }
