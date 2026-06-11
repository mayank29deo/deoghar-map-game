import { useEffect, useState } from "react";
import { BigButton, Bunting, PaperCard, rupees, useCountUp, VEHICLE_EMOJI } from "../bits";
import { useGameStore } from "../../state/gameStore";

function Row({ label, value, delay, show }: { label: string; value: string; delay: number; show: boolean }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!show) return;
    const id = setTimeout(() => setOn(true), delay);
    return () => clearTimeout(id);
  }, [show, delay]);
  return (
    <div className={`flex justify-between border-b border-dashed border-[rgba(43,33,24,0.25)] py-1.5 transition-opacity duration-300 ${on ? "opacity-100" : "opacity-0"}`}>
      <span className="font-ui text-sm font-semibold uppercase tracking-wide opacity-70">{label}</span>
      <span className="font-ui text-sm font-extrabold">{value}</span>
    </div>
  );
}

export default function Results() {
  const r = useGameStore((s) => s.results);
  const setScreen = useGameStore((s) => s.setScreen);
  const [revealTotal, setRevealTotal] = useState(false);
  const total = useCountUp(revealTotal && r ? r.earnings : 0, 6);
  useEffect(() => {
    const id = setTimeout(() => setRevealTotal(true), 1500);
    return () => clearTimeout(id);
  }, []);
  if (!r) return null;

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-[rgba(43,27,61,0.66)] p-4">
      <PaperCard className="anim-in w-[26rem] max-w-[92vw] px-6 py-5">
        <Bunting className="mb-3" />
        <div className="text-center">
          <div className="font-ui text-[10px] font-bold uppercase tracking-[0.3em] opacity-60">Deoghar Dash · delivery receipt</div>
          <h2 className="font-display mt-1 text-3xl">SHIFT OVER!</h2>
        </div>
        <div className="mt-4">
          <Row show label="Vehicle" value={`${VEHICLE_EMOJI[r.vehicleKey]} ${r.vehicleKey}`} delay={200} />
          <Row show label="Deliveries" value={`${r.deliveries}`} delay={500} />
          <Row show label="Speed bonuses" value={`${r.speedBonuses} × ₹30`} delay={800} />
          <Row show label="Best combo" value={`×${r.bestCombo.toFixed(2).replace(/\.?0+$/, "")}`} delay={1100} />
        </div>
        <div className="mt-4 text-center">
          <div className="font-ui text-[10px] font-bold uppercase tracking-widest opacity-60">Total earned</div>
          <div className="font-display text-6xl text-[var(--saffron)] drop-shadow-[0_3px_0_rgba(43,33,24,0.5)]">{rupees(total)}</div>
          {r.isRecord && revealTotal && (
            <div className="pulse-soft font-display mt-1 text-lg text-[var(--sindoor)]">★ NEW PERSONAL BEST ★</div>
          )}
          {r.rank !== null && revealTotal && (
            <div className="font-ui mt-1 text-sm font-bold">#{r.rank} on the Deoghar board</div>
          )}
        </div>
        <div className="mt-5 flex gap-2">
          <BigButton className="flex-1 text-lg" onClick={() => setScreen("driving")}>Drive again</BigButton>
          <BigButton className="!bg-[var(--peepal)] px-3 text-sm" onClick={() => setScreen("garage")}>Garage</BigButton>
          <BigButton className="!bg-[var(--marigold)] px-3 text-sm" onClick={() => setScreen("leaderboard")}>Board</BigButton>
        </div>
        <button onClick={() => setScreen("home")} className="font-ui mt-3 w-full text-center text-xs uppercase tracking-widest opacity-60 hover:opacity-100">home</button>
      </PaperCard>
    </div>
  );
}
