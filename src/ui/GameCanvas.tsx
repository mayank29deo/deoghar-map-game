import { useEffect, useRef } from "react";
import { GameApp } from "../game/GameApp";

export default function GameCanvas() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const app = new GameApp(ref.current!);
    return () => app.dispose();
  }, []);

  return <div ref={ref} className="relative h-full w-full" />;
}
