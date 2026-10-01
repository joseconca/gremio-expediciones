"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Game } from "@/game/core/Game";
import GameControls from "@/components/game/GameControls";
import DialogueBox from "@/components/game/DialogueBox";

const EMPTY_DIALOGUE_STATE = {
  active: false,
  dialogue: null,
  currentNode: null,
};

export default function NewGamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);

  const [dialogueManager, setDialogueManager] = useState<
    Game["dialogueManager"] | null
  >(null);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const game = new Game({
      canvas: canvasRef.current,
    });

    gameRef.current = game;

    setDialogueManager(game.dialogueManager);

    game.init();

    return () => {
      game.destroy();
      gameRef.current = null;
      setDialogueManager(null);
    };
  }, []);

  const dialogueState = useSyncExternalStore(
    dialogueManager
      ? (listener) => dialogueManager.subscribe(listener)
      : () => () => {},

    dialogueManager
      ? () => dialogueManager.getState()
      : () => EMPTY_DIALOGUE_STATE,

    () => EMPTY_DIALOGUE_STATE
  );

  return (
    <main className="fixed inset-0 overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        width={240}
        height={360}
        className="h-full w-full [image-rendering:pixelated]"
      />

      {dialogueState.active && <DialogueBox node={dialogueState.currentNode} />}

      <GameControls />
    </main>
  );
}
