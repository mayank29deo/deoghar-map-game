import { useEffect, useState } from "react";
import { useGameStore } from "../../state/gameStore";

const KEY = import.meta.env.VITE_GMAPS_EMBED_KEY as string | undefined;

/** Real Google Street View of the spot you just delivered to (free Maps Embed API). */
export default function DeliveryPeek() {
  const last = useGameStore((s) => s.shift.lastDelivery);
  const ll = useGameStore((s) => s.shift.lastDeliveryLL);
  const [peek, setPeek] = useState<{ lat: number; lon: number; key: number } | null>(null);

  useEffect(() => {
    if (!KEY || !last || !ll) return;
    setPeek({ lat: ll.lat, lon: ll.lon, key: last.at });
    const id = setTimeout(() => setPeek(null), 8000);
    return () => clearTimeout(id);
  }, [last, ll]);

  if (!KEY || !peek) return null;
  return (
    <div key={peek.key} className="anim-in pointer-events-auto paper-card overflow-hidden p-1.5" style={{ width: 286 }}>
      <div className="font-ui flex items-center justify-between px-1 pb-1 text-[10px] font-bold uppercase tracking-widest opacity-70">
        <span>📍 delivered here — real street</span>
        <button onClick={() => setPeek(null)} className="text-sm leading-none opacity-60 hover:opacity-100">✕</button>
      </div>
      <iframe
        title="street view of delivery spot"
        width="270"
        height="160"
        style={{ border: 0, borderRadius: 6, display: "block" }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        src={`https://www.google.com/maps/embed/v1/streetview?key=${KEY}&location=${peek.lat.toFixed(6)},${peek.lon.toFixed(6)}&fov=85`}
      />
    </div>
  );
}
