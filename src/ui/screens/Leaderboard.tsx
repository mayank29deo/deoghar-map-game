import { useEffect, useState } from "react";
import { BigButton, Bunting, PaperCard, rupees, VEHICLE_EMOJI } from "../bits";
import { leaderboard, type BoardEntry } from "../../services/leaderboard";
import { useGameStore } from "../../state/gameStore";

export default function Leaderboard() {
  const [rows, setRows] = useState<BoardEntry[] | null>(null);
  const setScreen = useGameStore((s) => s.setScreen);
  const handle = useGameStore((s) => s.handle);

  useEffect(() => {
    leaderboard.top(50).then(setRows).catch(() => setRows([]));
  }, []);

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-[rgba(43,27,61,0.7)] p-4">
      <PaperCard className="anim-in flex max-h-[86vh] w-[28rem] max-w-[94vw] flex-col px-5 py-4">
        <Bunting className="mb-3" />
        <div className="text-center">
          <h2 className="font-display text-3xl">TOP COURIERS</h2>
          <div className="font-hindi text-sm font-bold text-[var(--sindoor)]">देवघर के सबसे तेज़</div>
        </div>
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
          {rows === null && <div className="font-ui py-6 text-center text-sm opacity-60">loading…</div>}
          {rows !== null && rows.length === 0 && (
            <div className="font-ui py-6 text-center text-sm opacity-60">no shifts yet — be the first on the board!</div>
          )}
          {rows?.map((e, i) => {
            const mine = e.handle === handle;
            return (
              <div
                key={`${e.handle}-${e.createdAt}-${i}`}
                className={`mb-1 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${
                  mine ? "border-[var(--saffron)] bg-[rgba(255,153,51,0.16)]" : "border-[rgba(43,33,24,0.18)]"
                }`}
              >
                <span className={`font-display w-8 text-lg ${i < 3 ? "text-[var(--sindoor)]" : "opacity-50"}`}>
                  {i + 1}
                </span>
                <span className="font-ui min-w-0 flex-1 truncate text-sm font-extrabold">{e.handle}</span>
                <span className="text-base">{VEHICLE_EMOJI[e.vehicle] ?? "🛵"}</span>
                <span className="font-ui w-10 text-right text-[11px] opacity-60">{e.deliveries} del</span>
                <span className="font-display w-20 text-right text-base">{rupees(e.earnings)}</span>
              </div>
            );
          })}
        </div>
        <BigButton className="mt-3 text-base" onClick={() => setScreen("home")}>Back</BigButton>
      </PaperCard>
    </div>
  );
}
