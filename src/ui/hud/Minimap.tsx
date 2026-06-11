import { useEffect, useRef } from "react";
import { MAP } from "../../game/world/mapData";
import { useGameStore } from "../../state/gameStore";

const SCALE = 0.35; // px per meter on the offscreen map
const EXTENT = 3000; // world meters covered each direction
const SIZE = 150; // on-screen px

let offscreen: HTMLCanvasElement | null = null;

function renderBase(): HTMLCanvasElement {
  if (offscreen) return offscreen;
  const c = document.createElement("canvas");
  const px = Math.ceil(EXTENT * 2 * SCALE);
  c.width = px; c.height = px;
  const g = c.getContext("2d")!;
  g.fillStyle = "rgba(43,27,61,0.92)";
  g.fillRect(0, 0, px, px);
  const W: Record<string, [number, string]> = {
    primary: [3, "#f7edd9"], secondary: [2.4, "#f7edd9"], tertiary: [1.8, "#e8d9bd"],
    residential: [1.2, "#cdbb9d"], service: [0.8, "#b3a285"], gali: [0.7, "#a8845c"],
  };
  for (const e of MAP.edges) {
    const [w, color] = W[e.cls] ?? [1, "#cdbb9d"];
    g.strokeStyle = color; g.lineWidth = w;
    g.beginPath();
    e.pts.forEach(([x, z], i) => {
      const cx = (x + EXTENT) * SCALE, cz = (z + EXTENT) * SCALE;
      if (i === 0) g.moveTo(cx, cz); else g.lineTo(cx, cz);
    });
    g.stroke();
  }
  offscreen = c;
  return c;
}

export default function Minimap() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const base = renderBase();
    const cvs = ref.current!;
    const g = cvs.getContext("2d")!;
    const id = setInterval(() => {
      const { playerX, playerZ, heading, missionPhase, bearing, targetDist } = useGameStore.getState().shift;
      g.clearRect(0, 0, SIZE, SIZE);
      g.save();
      g.beginPath();
      g.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 1, 0, Math.PI * 2);
      g.clip();
      // rotate so vehicle-forward points up: forward (heading) → screen up
      g.translate(SIZE / 2, SIZE / 2);
      g.rotate(-heading - Math.PI / 2);
      const sx = (playerX + EXTENT) * SCALE, sz = (playerZ + EXTENT) * SCALE;
      g.drawImage(base, -sx, -sz);
      g.restore();
      // player triangle (always center, pointing up)
      g.fillStyle = "#ffb703";
      g.beginPath();
      g.moveTo(SIZE / 2, SIZE / 2 - 7);
      g.lineTo(SIZE / 2 - 5, SIZE / 2 + 5);
      g.lineTo(SIZE / 2 + 5, SIZE / 2 + 5);
      g.closePath();
      g.fill();
      // target blip on rim
      if (missionPhase !== "none") {
        const rel = bearing - heading - Math.PI / 2;
        const r = Math.min((targetDist * SCALE), SIZE / 2 - 8);
        const tx = SIZE / 2 + Math.cos(rel + Math.PI / 2) * r;
        const tz = SIZE / 2 + Math.sin(rel + Math.PI / 2) * r;
        g.fillStyle = missionPhase === "pickup" ? "#ff9933" : "#2a9d8f";
        g.beginPath();
        g.arc(tx, tz, 5, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = "#2b1b3d";
        g.lineWidth = 1.5;
        g.stroke();
      }
    }, 100);
    return () => clearInterval(id);
  }, []);

  return (
    <canvas
      ref={ref}
      width={SIZE}
      height={SIZE}
      className="rounded-full border-2 border-[var(--marigold)] shadow-[0_4px_18px_rgba(20,12,28,0.6)]"
    />
  );
}
