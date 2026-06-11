import { PaperCard } from "../bits";
import { useGameStore } from "../../state/gameStore";

export default function DeliveryCard() {
  const { missionPhase, targetName, targetDist, bearing, heading, parcel } = useGameStore((s) => s.shift);
  if (missionPhase === "none") return null;
  const rel = ((bearing - heading) * 180) / Math.PI;
  const km = targetDist >= 950;
  const distLabel = km ? `${(targetDist / 1000).toFixed(1)} km` : `${Math.round(targetDist / 10) * 10} m`;
  const phaseLabel = missionPhase === "pickup" ? "PICK UP" : "DELIVER";
  const accent = missionPhase === "pickup" ? "var(--saffron)" : "var(--peepal)";
  return (
    <PaperCard className="anim-in flex items-center gap-3 px-4 py-2.5">
      <div
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)]"
        style={{ background: accent }}
      >
        <span className="block text-2xl leading-none" style={{ transform: `rotate(${rel}deg)` }}>⮝</span>
      </div>
      <div className="min-w-0">
        <div className="font-ui text-[10px] font-bold uppercase tracking-widest opacity-60">
          {phaseLabel} · {parcel}
        </div>
        <div className="truncate font-ui text-base font-extrabold leading-tight">{targetName}</div>
      </div>
      <div className="ml-2 shrink-0 text-right">
        <div className="font-display text-xl leading-none">{distLabel}</div>
      </div>
    </PaperCard>
  );
}
