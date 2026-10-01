"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";

import { Game } from "@/game/core/Game";
import GameControls from "@/components/game/GameControls";
import DialogueBox from "@/components/game/DialogueBox";
import GameHud from "@/components/game/GameHud";
import type { PlayerProgressionState } from "@/game/gameplay/PlayerProgression";
import {
  INITIAL_VILLAGE_RESOURCES,
} from "@/game/gameplay/VillageProgression";
import type { WorldBaseLocation } from "@/game/world/WorldLocation";
import type { BaseMapa } from "@/lib/tiposJuego";

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

function isBaseMapa(value: unknown): value is BaseMapa {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.nombre === "string" &&
    typeof candidate.lat === "number" &&
    typeof candidate.lng === "number"
  );
}

const EMPTY_DIALOGUE_STATE = {
  active: false,
  dialogue: null,
  currentNode: null,
  selectedChoiceIndex: 0,
};

const EMPTY_SCENE_STATE = { sceneId: null };

const EMPTY_PLAYER_STATE: PlayerProgressionState = {
  name: "Aventurero",
  characterClass: "Novato",
  characterLevel: 1,
  experience: 0,
  experienceToNextLevel: 100,
  classLevel: 1,
  classExperience: 0,
  classExperienceToNextLevel: 100,
  attributes: {
    currentHealth: 40,
    maxHealth: 100,
    physicalDefense: 5,
    physicalAttack: 8,
    criticalChance: 0.05,
    criticalDamage: 1.5,
    speed: 5,
    evasionChance: 0.05,
    magicDefense: 3,
    magicAttack: 3,
  },
  gold: 100,
};

export default function NewGamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [baseLocation, setBaseLocation] = useState<BaseLocation | null>(null);
  const [otherBases, setOtherBases] = useState<WorldBaseLocation[]>([]);

  const [dialogueManager, setDialogueManager] = useState<
    Game["dialogueManager"] | null
  >(null);
  const [playerProgression, setPlayerProgression] = useState<
    Game["playerProgression"] | null
  >(null);
  const [villageProgression, setVillageProgression] = useState<
    Game["villageProgression"] | null
  >(null);
  const [sceneManager, setSceneManager] = useState<Game["sceneManager"] | null>(null);

  useEffect(() => {
    if (!baseLocation || !canvasRef.current) {
      return;
    }

    const game = new Game({
      canvas: canvasRef.current,
      selectedBase: {
        id: "local-base",
        name: "Tu gremio",
        ...baseLocation,
      },
      otherBases,
    });

    gameRef.current = game;

    setDialogueManager(game.dialogueManager);
    setPlayerProgression(game.playerProgression);
    setVillageProgression(game.villageProgression);
    setSceneManager(game.sceneManager);

    game.init();

    return () => {
      game.destroy();
      gameRef.current = null;
      setDialogueManager(null);
      setPlayerProgression(null);
      setVillageProgression(null);
      setSceneManager(null);
    };
  }, [baseLocation, otherBases]);

  const dialogueState = useSyncExternalStore(
    dialogueManager
      ? (listener) => dialogueManager.subscribe(listener)
      : () => () => {},

    dialogueManager
      ? () => dialogueManager.getState()
      : () => EMPTY_DIALOGUE_STATE,

    () => EMPTY_DIALOGUE_STATE
  );

  const playerState = useSyncExternalStore(
    playerProgression
      ? (listener) => playerProgression.subscribe(listener)
      : () => () => {},
    playerProgression
      ? () => playerProgression.getState()
      : () => EMPTY_PLAYER_STATE,
    () => EMPTY_PLAYER_STATE
  );

  const villageResources = useSyncExternalStore(
    villageProgression
      ? (listener) => villageProgression.subscribe(() => listener())
      : () => () => {},
    villageProgression
      ? () => villageProgression.getResourcesSnapshot()
      : () => INITIAL_VILLAGE_RESOURCES,
    () => INITIAL_VILLAGE_RESOURCES
  );

  const sceneState = useSyncExternalStore(
    sceneManager
      ? (listener) => sceneManager.subscribe(() => listener())
      : () => () => {},
    sceneManager ? () => sceneManager.getState() : () => EMPTY_SCENE_STATE,
    () => EMPTY_SCENE_STATE
  );

  const startGameAtLocation = async (location: BaseLocation) => {
    try {
      const response = await fetch("/api/bases?todas=1", {
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        const data: { bases?: unknown } = await response.json();
        setOtherBases(
          Array.isArray(data.bases)
            ? data.bases.filter(isBaseMapa).map((base) => ({
                id: base.id,
                name: base.nombre,
                lat: base.lat,
                lng: base.lng,
              }))
            : []
        );
      } else {
        setOtherBases([]);
      }
    } catch {
      setOtherBases([]);
    }

    setBaseLocation(location);
  };

  if (!baseLocation) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-900 p-4">
        <GameBaseLocationPicker
          onStart={(location) => void startGameAtLocation(location)}
        />
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

      <GameHud
        player={playerState}
        resources={villageResources}
        isInVillage={
          sceneState.sceneId === "base" ||
          sceneState.sceneId === "town-hall-interior" ||
          sceneState.sceneId === "tavern-interior"
        }
      />

      <GameControls />
    </main>
  );
}
