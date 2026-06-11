import * as THREE from "three";
import { fromLatLon } from "./geo";

/**
 * Real satellite imagery draped under the 3D city (MapTiler raster tiles, slippy z15).
 * Loads at runtime with VITE_MAPTILER_KEY; returns null without a key (sandy ground stays).
 * Attribution: © MapTiler © OpenStreetMap contributors — shown on the Home screen.
 */
const BBOX = { south: 24.462, west: 86.672, north: 24.512, east: 86.728 };
const Z = 15;

const tileX = (lon: number) => Math.floor(((lon + 180) / 360) * 2 ** Z);
const tileY = (lat: number) => {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** Z);
};
const tileLon = (x: number) => (x / 2 ** Z) * 360 - 180;
const tileLat = (y: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** Z))) * 180) / Math.PI;

export function buildSatellite(): THREE.Group | null {
  const key = import.meta.env.VITE_MAPTILER_KEY as string | undefined;
  if (!key) return null;

  const group = new THREE.Group();
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");

  const x0 = tileX(BBOX.west), x1 = tileX(BBOX.east);
  const y0 = tileY(BBOX.north), y1 = tileY(BBOX.south); // y grows southward
  for (let tx = x0; tx <= x1; tx++) {
    for (let ty = y0; ty <= y1; ty++) {
      const nw = fromLatLon(tileLat(ty), tileLon(tx));
      const se = fromLatLon(tileLat(ty + 1), tileLon(tx + 1));
      const w = se.x - nw.x, d = se.z - nw.z;
      const tex = loader.load(`https://api.maptiler.com/tiles/satellite-v2/${Z}/${tx}/${ty}.jpg?key=${key}`);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(w, d),
        new THREE.MeshLambertMaterial({ map: tex }),
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(nw.x + w / 2, 0.02, nw.z + d / 2); // above sandy ground, below road ribbons
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }
  return group;
}

export const SATELLITE_ENABLED = Boolean(import.meta.env.VITE_MAPTILER_KEY);
