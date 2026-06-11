import { useEffect, useRef, useState } from "react";
import { touch } from "../../game/engine/touch";

const COARSE = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;

export default function TouchControls() {
  const [visible] = useState(COARSE);
  const zone = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const pid = useRef<number | null>(null);

  useEffect(() => {
    if (!visible) return;
    touch.active = true;
    return () => { touch.active = false; touch.steer = 0; touch.brake = false; };
  }, [visible]);

  if (!visible) return null;

  const onDown = (e: React.PointerEvent) => {
    pid.current = e.pointerId;
    startX.current = e.clientX;
    zone.current?.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (pid.current !== e.pointerId) return;
    touch.steer = Math.max(-1, Math.min(1, (e.clientX - startX.current) / 70));
  };
  const onUp = (e: React.PointerEvent) => {
    if (pid.current !== e.pointerId) return;
    pid.current = null;
    touch.steer = 0;
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-30 select-none">
      {/* steer zone: left half */}
      <div
        ref={zone}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="pointer-events-auto absolute bottom-0 left-0 top-1/3 w-1/2"
        style={{ touchAction: "none" }}
      >
        <div className="glass-dusk absolute bottom-24 left-6 rounded-full px-4 py-2">
          <span className="font-ui text-xs uppercase tracking-widest text-[var(--paper)] opacity-80">◄ drag to steer ►</span>
        </div>
      </div>
      {/* brake + horn: right side */}
      <div className="pointer-events-auto absolute bottom-24 right-5 flex flex-col items-end gap-3" style={{ touchAction: "none" }}>
        <button
          className="btn-big h-16 w-16 rounded-full text-2xl"
          onPointerDown={(e) => { e.preventDefault(); touch.hornQueued = true; }}
        >
          📯
        </button>
        <button
          className="btn-big !bg-[var(--sindoor)] h-20 w-20 rounded-full text-base !text-[var(--paper)]"
          onPointerDown={(e) => { e.preventDefault(); touch.brake = true; }}
          onPointerUp={() => { touch.brake = false; }}
          onPointerCancel={() => { touch.brake = false; }}
        >
          BRAKE
        </button>
      </div>
    </div>
  );
}
