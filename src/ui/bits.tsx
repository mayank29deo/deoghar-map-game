import { useEffect, useRef, useState, type ReactNode } from "react";

export function PaperCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`paper-card font-ui ${className}`}>{children}</div>;
}

export function BigButton({ children, onClick, className = "", disabled = false }: { children: ReactNode; onClick?: () => void; className?: string; disabled?: boolean }) {
  return (
    <button disabled={disabled} onClick={onClick} className={`btn-big rounded-lg px-6 py-3 text-xl ${className}`}>
      {children}
    </button>
  );
}

export function Bunting({ className = "" }: { className?: string }) {
  return <div className={`bunting w-full ${className}`} />;
}

/** animated ₹ count-up — eases toward target, ticks fast on change */
export function useCountUp(target: number, speed = 8): number {
  const [shown, setShown] = useState(target);
  const ref = useRef(target);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const diff = target - ref.current;
      if (Math.abs(diff) < 0.5) { ref.current = target; setShown(target); return; }
      ref.current += diff * Math.min(1, speed / 60);
      setShown(Math.round(ref.current));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, speed]);
  return shown;
}

export const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export const VEHICLE_EMOJI: Record<string, string> = { scooty: "🛵", bike: "🏍️", auto: "🛺", sedan: "🚗", suv: "🚙" };

const CONFETTI_COLORS = ["#ff9933", "#ffb703", "#2a9d8f", "#e63946", "#d4a017"];

export function ConfettiBurst({ seed }: { seed: number }) {
  const pieces = Array.from({ length: 26 }, (_, i) => {
    const left = ((seed * 37 + i * 53) % 100);
    const delay = ((seed * 13 + i * 29) % 40) / 100;
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    return <div key={i} className="confetti" style={{ left: `${left}%`, animationDelay: `${delay}s`, background: color }} />;
  });
  return <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">{pieces}</div>;
}
