import { PaperCard, rupees } from "../bits";
import { useGameStore } from "../../state/gameStore";

export default function OfferToasts() {
  const offers = useGameStore((s) => s.shift.offers);
  const phase = useGameStore((s) => s.shift.missionPhase);
  const accept = useGameStore((s) => s.acceptOffer);
  if (phase !== "none") return null;
  return (
    <div className="flex flex-col gap-2">
      {offers.map((o) => (
        <PaperCard key={o.id} className="anim-in flex items-center gap-3 px-3 py-2">
          <div className="min-w-0">
            <div className="font-ui text-[10px] font-bold uppercase tracking-widest opacity-60">{o.parcel}</div>
            <div className="truncate font-ui text-sm font-extrabold">{o.pickup.name} → {o.drop.name}</div>
            <div className="font-ui text-[11px] opacity-70">{(o.distM / 1000).toFixed(1)} km · est {rupees(o.estPay)}</div>
          </div>
          <button
            onClick={() => accept(o.id)}
            className="btn-big ml-auto shrink-0 rounded-md px-3 py-1.5 text-sm"
          >
            Accept
          </button>
        </PaperCard>
      ))}
    </div>
  );
}
