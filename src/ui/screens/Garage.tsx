import { BigButton, PaperCard, rupees, VEHICLE_EMOJI } from "../bits";
import { useGameStore } from "../../state/gameStore";
import { VEHICLES } from "../../game/vehicles/specs";

function Bar({ label, frac, color = "var(--saffron)" }: { label: string; frac: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="font-ui w-20 text-[10px] font-bold uppercase tracking-wider opacity-60">{label}</div>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[rgba(43,33,24,0.15)]">
        <div className="h-full rounded-full" style={{ width: `${Math.round(frac * 100)}%`, background: color }} />
      </div>
    </div>
  );
}

export default function Garage() {
  const idx = useGameStore((s) => s.selectedIdx);
  const select = useGameStore((s) => s.selectVehicle);
  const setScreen = useGameStore((s) => s.setScreen);
  const career = useGameStore((s) => s.careerEarnings);
  const spec = VEHICLES[idx];
  const locked = career < spec.unlockAt;
  const prev = () => select((idx + VEHICLES.length - 1) % VEHICLES.length);
  const next = () => select((idx + 1) % VEHICLES.length);

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-end bg-[linear-gradient(90deg,rgba(43,27,61,0.06)_38%,rgba(43,27,61,0.85)_72%)] p-6">
      <button onClick={prev} className="btn-big fixed left-5 top-1/2 z-30 -translate-y-1/2 rounded-full px-4 py-2 text-2xl">‹</button>
      <button onClick={next} className="btn-big fixed left-20 top-1/2 z-30 -translate-y-1/2 rounded-full px-4 py-2 text-2xl">›</button>

      <div className="flex w-[24rem] max-w-[88vw] flex-col gap-3">
        <PaperCard className="anim-in px-5 py-4" key={spec.key}>
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-3xl">{VEHICLE_EMOJI[spec.key]} {spec.label.toUpperCase()}</h2>
            <span className="font-ui rounded-full border border-[var(--ink)] px-2 py-0.5 text-[10px] font-bold uppercase">pay ×{spec.payoutMult}</span>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <Bar label="Speed" frac={spec.topSpeed / 22} />
            <Bar label="Pickup" frac={spec.accel / 11} />
            <Bar label="Handling" frac={spec.steerRate / 2.9} />
            <Bar label="Off-road" frac={spec.offroadFactor / 0.75} color="var(--peepal)" />
          </div>
          <div className="font-ui mt-3 flex gap-2 text-[10px] font-bold uppercase tracking-wide">
            <span className={`rounded-full px-2 py-0.5 ${spec.galiAllowed ? "bg-[var(--peepal)] text-white" : "bg-[rgba(43,33,24,0.12)] opacity-60"}`}>
              {spec.galiAllowed ? "✓ fits in galis" : "✗ too wide for galis"}
            </span>
          </div>
          {locked && (
            <div className="mt-3 rounded-lg border-2 border-[var(--sindoor)] bg-[rgba(230,57,70,0.08)] p-2 text-center">
              <div className="font-display text-xl text-[var(--sindoor)]">🔒 UNLOCK AT {rupees(spec.unlockAt)}</div>
              <div className="font-ui text-[11px] opacity-70">career earnings {rupees(career)} / {rupees(spec.unlockAt)}</div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-[rgba(43,33,24,0.15)]">
                <div className="h-full bg-[var(--sindoor)]" style={{ width: `${Math.min(100, (career / spec.unlockAt) * 100)}%` }} />
              </div>
            </div>
          )}
        </PaperCard>

        <div className="anim-in flex gap-3">
          <BigButton className="flex-1 text-xl" disabled={locked} onClick={() => setScreen("driving")}>
            {locked ? "Locked" : "Drive this"}
          </BigButton>
          <BigButton className="!bg-[var(--marigold)] px-4 text-base" onClick={() => setScreen("home")}>Back</BigButton>
        </div>
      </div>
    </div>
  );
}
