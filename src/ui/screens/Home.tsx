import { BigButton, Bunting, PaperCard, rupees } from "../bits";
import { useGameStore } from "../../state/gameStore";

export default function Home() {
  const handle = useGameStore((s) => s.handle);
  const setHandle = useGameStore((s) => s.setHandle);
  const setScreen = useGameStore((s) => s.setScreen);
  const career = useGameStore((s) => s.careerEarnings);
  const best = useGameStore((s) => s.bestShift);
  const canDrive = handle.trim().length >= 2;

  return (
    <div className="fixed inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-[radial-gradient(ellipse_at_center,rgba(43,27,61,0.25)_0%,rgba(43,27,61,0.78)_78%)] px-4">
      <div className="anim-in text-center">
        <Bunting className="mb-3 w-72 md:w-96" />
        <h1 className="font-display text-6xl leading-none tracking-wide text-[var(--paper)] drop-shadow-[0_5px_0_rgba(20,12,28,0.85)] md:text-8xl">
          DEOGHAR <span className="text-[var(--saffron)]">DASH</span>
        </h1>
        <div className="font-hindi mt-1 text-lg font-bold text-[var(--marigold)]">देवघर डैश · बाबा नगरी की गलियों में</div>
      </div>

      <PaperCard className="anim-in w-72 px-4 py-3 text-center" >
        <div className="font-ui text-[10px] font-bold uppercase tracking-widest opacity-60">Courier ID</div>
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value.toUpperCase().replace(/[^A-Z0-9_ ]/g, ""))}
          placeholder="YOUR NAME"
          maxLength={16}
          className="font-display w-full bg-transparent text-center text-2xl tracking-widest text-[var(--ink)] outline-none placeholder:opacity-30"
        />
        {(career > 0 || best > 0) && (
          <div className="font-ui mt-1 text-[11px] opacity-70">career {rupees(career)} · best shift {rupees(best)}</div>
        )}
      </PaperCard>

      <div className="anim-in flex flex-col items-center gap-3">
        <BigButton className="w-64 text-2xl" disabled={!canDrive} onClick={() => setScreen("driving")}>
          ▶ Drive
        </BigButton>
        <div className="flex gap-3">
          <BigButton className="w-[7.6rem] !bg-[var(--peepal)] text-base" onClick={() => setScreen("garage")}>Garage</BigButton>
          <BigButton className="w-[7.6rem] !bg-[var(--marigold)] text-base" onClick={() => setScreen("leaderboard")}>Top 50</BigButton>
        </div>
        {!canDrive && <div className="font-ui text-xs text-[var(--paper)] opacity-70">enter a courier name (2+ letters) to drive</div>}
      </div>

      <div className="font-ui absolute bottom-3 text-center text-[10px] uppercase tracking-widest text-[var(--paper)] opacity-50">
        real streets of Deoghar 814112 · WASD drive · Space handbrake
      </div>
    </div>
  );
}
