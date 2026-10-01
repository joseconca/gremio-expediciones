"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";

import { Game } from "@/game/core/Game";
import GameControls from "@/components/game/GameControls";
import DialogueBox from "@/components/game/DialogueBox";

const GameBaseLocationPicker = dynamic(
  () => import("@/components/game/GameBaseLocationPicker"),
  {
    ssr: false,
    loading: () => <p className="text-amber-100">Cargando mapa...</p>,
  }
);

interface BaseLocation {
  lat: number;
  lng: number;
}

const EMPTY_DIALOGUE_STATE = {
  active: false,
  dialogue: null,
  currentNode: null,
  selectedChoiceIndex: 0,
};

const EMPTY_VILLAGE_VITALS = {
  gold: 0,
  playerHp: 0,
  playerMaxHp: 0,
};

export default function NewGamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [baseLocation, setBaseLocation] = useState<BaseLocation | null>(null);

  const [dialogueManager, setDialogueManager] = useState<
    Game["dialogueManager"] | null
  >(null);
  const [villageProgression, setVillageProgression] = useState<
    Game["villageProgression"] | null
  >(null);

  useEffect(() => {
    if (!baseLocation || !canvasRef.current) {
      return;
    }

    const game = new Game({
      canvas: canvasRef.current,
    });

    gameRef.current = game;

    setDialogueManager(game.dialogueManager);
    setVillageProgression(game.villageProgression);

    game.init();

    return () => {
      game.destroy();
      gameRef.current = null;
      setDialogueManager(null);
      setVillageProgression(null);
    };
  }, [baseLocation]);

  const dialogueState = useSyncExternalStore(
    dialogueManager
      ? (listener) => dialogueManager.subscribe(listener)
      : () => () => {},

    dialogueManager
      ? () => dialogueManager.getState()
      : () => EMPTY_DIALOGUE_STATE,

    () => EMPTY_DIALOGUE_STATE
  );

  const villageVitals = useSyncExternalStore(
    villageProgression
      ? (listener) => villageProgression.subscribe(() => listener())
      : () => () => {},
    villageProgression
      ? () => villageProgression.getVitalsSnapshot()
      : () => EMPTY_VILLAGE_VITALS,
    () => EMPTY_VILLAGE_VITALS
  );

  if (!baseLocation) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-900 p-4">
        <GameBaseLocationPicker onStart={setBaseLocation} />
      </main>
    );
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        width={240}
        height={360}
        className="h-full w-full [image-rendering:pixelated]"
      />

      {dialogueState.active && (
        <DialogueBox
          node={dialogueState.currentNode}
          selectedChoiceIndex={dialogueState.selectedChoiceIndex}
        />
      )}

      <div className="pointer-events-none absolute left-3 top-3 z-10 rounded bg-black/60 px-2 py-1 text-[10px] text-white/70">
        Base · {baseLocation.lat.toFixed(3)}, {baseLocation.lng.toFixed(3)}
      </div>

      <div className="pointer-events-none absolute right-3 top-3 z-10 flex gap-2 rounded bg-black/70 px-3 py-2 text-xs font-bold text-amber-100">
        <span>🪙 {villageVitals.gold}</span>
        <span>
          ❤️ {villageVitals.playerHp}/{villageVitals.playerMaxHp}
        </span>
      </div>

      <GameControls />
    </main>
  );
}
