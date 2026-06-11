import { useGameStore } from "../../state/gameStore";

export default function ComboRing() {
  const { combo, comboLeft, chain } = useGameStore((s) => s.shift);
  const frac = Math.max(0, Math.min(1, comboLeft / 40));
  const hot = combo >= 2;
  const active = chain > 0 && comboLeft > 0;
  const ringColor = hot ? "var(--sindoor)" : "var(--marigold)";
  return (
    <div
      className={`relative grid h-16 w-16 place-items-center rounded-full ${active && hot ? "pulse-soft" : ""}`}
      style={{
        background: `conic-gradient(${ringColor} ${frac * 360}deg, rgba(247,237,217,0.15) 0deg)`,
        boxShadow: "0 4px 14px rgba(20,12,28,0.5)",
      }}
    >
      <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--dusk)] text-center">
        <div>
          <div className="font-display text-lg leading-none text-[var(--marigold)]">×{combo.toFixed(2).replace(/\.?0+$/, "")}</div>
          <div className="font-ui text-[8px] uppercase tracking-wider text-[var(--paper)] opacity-70">combo</div>
        </div>
      </div>
    </div>
  );
}
