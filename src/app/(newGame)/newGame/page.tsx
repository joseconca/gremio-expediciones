"use client";

import { useEffect, useRef } from "react";
import { Game } from "@/game/core/Game";

export default function NewGamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const game = new Game({
      canvas: canvasRef.current,
    });

    game.init();

    return () => {
      game.destroy();
    };
  }, []);

  return (
    <main className="fixed inset-0 overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        width={240}
        height={360}
        className="h-full w-full [image-rendering:pixelated]"
      />
    </main>
  );
}