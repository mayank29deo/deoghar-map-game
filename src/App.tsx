import GameCanvas from "./ui/GameCanvas";

export default function App() {
  return (
    <div className="relative h-full w-full">
      <GameCanvas />
      <div className="pointer-events-none absolute left-3 top-3 rounded bg-black/40 px-3 py-1 font-mono text-xs tracking-widest text-amber-200">
        DEOGHAR DASH — world preview
      </div>
    </div>
  );
}
