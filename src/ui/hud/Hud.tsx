import { useEffect, useState } from "react";
import { ConfettiBurst, rupees, useCountUp } from "../bits";
import { useGameStore } from "../../state/gameStore";
import ComboRing from "./ComboRing";
import DeliveryCard from "./DeliveryCard";
import Minimap from "./Minimap";
import OfferToasts from "./OfferToast";

function Timer() {
  const t = useGameStore((s) => s.shift.timeLeft);
  const m = Math.floor(t / 60), sec = Math.floor(t % 60);
  const danger = t <= 30;
  return (
    <div className={`glass-dusk rounded-xl px-4 py-2 ${danger ? "pulse-soft" : ""}`}>
      <div className={`font-display text-3xl tracking-wide ${danger ? "text-[var(--sindoor)]" : "text-[var(--paper)]"}`}>
        {m}:{sec.toString().padStart(2, "0")}
      </div>
    </div>
  );
}

function Earnings() {
  const earnings = useGameStore((s) => s.shift.earnings);
  const shown = useCountUp(earnings, 10);
  return (
    <div className="glass-dusk rounded-xl px-4 py-2 text-right">
      <div className="font-display text-2xl text-[var(--marigold)]">{rupees(shown)}</div>
      <div className="font-ui text-[9px] uppercase tracking-widest text-[var(--paper)] opacity-60">earned</div>
    </div>
  );
}

function DeliveryFlash() {
  const last = useGameStore((s) => s.shift.lastDelivery);
  const [burst, setBurst] = useState<{ amount: number; key: number } | null>(null);
  useEffect(() => {
    if (last) setBurst({ amount: last.amount, key: last.at });
  }, [last]);
  useEffect(() => {
    if (!burst) return;
    const id = setTimeout(() => setBurst(null), 1700);
    return () => clearTimeout(id);
  }, [burst]);
  if (!burst) return null;
  return (
    <>
      <ConfettiBurst seed={burst.key % 97} />
      <div key={burst.key} className="floatup pointer-events-none fixed left-1/2 top-1/2 z-50 -translate-x-1/2">
        <span className="font-display text-5xl text-[var(--marigold)] drop-shadow-[0_3px_0_rgba(43,33,24,0.8)]">
          +{rupees(burst.amount)}
        </span>
      </div>
    </>
  );
}

export default function Hud() {
  const combo = useGameStore((s) => s.shift.combo);
  const chainAlive = useGameStore((s) => s.shift.comboLeft > 0);
  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      {combo >= 2 && chainAlive && <div className="combo-edge" />}
      <div className="absolute left-4 top-4"><Timer /></div>
      <div className="absolute right-4 top-4 flex items-start gap-3">
        <Earnings />
        <ComboRing />
      </div>
      <div className="pointer-events-auto absolute bottom-4 left-4 w-72 max-w-[42vw]"><OfferToasts /></div>
      <div className="absolute bottom-4 left-1/2 w-[26rem] max-w-[60vw] -translate-x-1/2"><DeliveryCard /></div>
      <div className="absolute bottom-4 right-4"><Minimap /></div>
      <DeliveryFlash />
    </div>
  );
}
