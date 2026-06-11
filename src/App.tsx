import GameCanvas from "./ui/GameCanvas";
import Home from "./ui/screens/Home";
import Garage from "./ui/screens/Garage";
import Results from "./ui/screens/Results";
import Leaderboard from "./ui/screens/Leaderboard";
import Hud from "./ui/hud/Hud";
import { useGameStore } from "./state/gameStore";

export default function App() {
  const screen = useGameStore((s) => s.screen);
  return (
    <div className="relative h-full w-full">
      <GameCanvas />
      {screen === "home" && <Home />}
      {screen === "garage" && <Garage />}
      {screen === "driving" && <Hud />}
      {screen === "results" && <Results />}
      {screen === "leaderboard" && <Leaderboard />}
    </div>
  );
}
