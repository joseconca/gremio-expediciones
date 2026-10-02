"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

import { Game } from "@/game/core/Game";
import GameControls from "@/components/game/GameControls";
import DialogueBox from "@/components/game/DialogueBox";
import GameHud from "@/components/game/GameHud";
import BattleOverlay from "@/components/game/BattleOverlay";
import type { CombatSnapshot } from "@/game/gameplay/CombatManager";
import type { PartySnapshot } from "@/game/gameplay/PartyManager";
import type { PlayerProgressionState } from "@/game/gameplay/PlayerProgression";
import {
  INITIAL_VILLAGE_RESOURCES,
} from "@/game/gameplay/VillageProgression";
import type { WorldBaseLocation } from "@/game/world/WorldLocation";
import type { WorldPlayerDto } from "@/shared/world";
import {
  loadNearbyBases,
  loadOwnPlayer,
  registerBase,
  worldGateway,
} from "@/services/worldGateway";

const GameBaseLocationPicker = dynamic(
  () => import("@/components/game/GameBaseLocationPicker"),
  {
    ssr: false,
    loading: () => <p className="text-amber-100">Cargando mapa...</p>,
  }
);

interface GameStart {
  base: WorldBaseLocation;
  otherBases: WorldBaseLocation[];
}

type Phase =
  | { kind: "loading" }
  | { kind: "unauthenticated" }
  | { kind: "unavailable"; message: string }
  | { kind: "picking" }
  | { kind: "playing"; start: GameStart };

function toWorldBaseLocation(player: WorldPlayerDto): WorldBaseLocation {
  return {
    id: player.id,
    name: player.displayName,
    lat: player.baseLat,
    lng: player.baseLng,
    hasEmbassy: player.hasEmbassy,
  };
}

const EMPTY_DIALOGUE_STATE = {
  active: false,
  dialogue: null,
  currentNode: null,
  selectedChoiceIndex: 0,
};

const EMPTY_SCENE_STATE = { sceneId: null };
const EMPTY_COMBAT_STATE: CombatSnapshot = {
  phase: "fled",
  menu: "root",
  enemy: null,
  party: [],
  log: "",
  revision: 0,
};
const EMPTY_PARTY_STATE: PartySnapshot = {
  loaded: false,
  companions: [],
  isLeader: false,
  isFull: false,
  invitations: [],
  candidates: [],
};

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

const noopSubscribe = () => () => {};

export default function NewGamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);

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
  const [combatManager, setCombatManager] = useState<Game["combatManager"] | null>(null);
  const [partyManager, setPartyManager] = useState<Game["partyManager"] | null>(null);

  useEffect(() => {
    let cancelled = false;

    const resolveSession = async () => {
      const lookup = await loadOwnPlayer();
      if (cancelled) return;

      if (lookup.status === "unauthenticated") {
        setPhase({ kind: "unauthenticated" });
      } else if (lookup.status === "unavailable") {
        setPhase({ kind: "unavailable", message: lookup.message });
      } else if (lookup.player) {
        const otherBases = (await loadNearbyBases()).map(toWorldBaseLocation);
        if (!cancelled) {
          setPhase({
            kind: "playing",
            start: { base: toWorldBaseLocation(lookup.player), otherBases },
          });
        }
      } else {
        setPhase({ kind: "picking" });
      }
    };

    void resolveSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const start = phase.kind === "playing" ? phase.start : null;

  useEffect(() => {
    if (!start || !canvasRef.current) {
      return;
    }

    const game = new Game({
      canvas: canvasRef.current,
      selectedBase: start.base,
      otherBases: start.otherBases,
      worldGateway,
    });

    gameRef.current = game;

    setDialogueManager(game.dialogueManager);
    setPlayerProgression(game.playerProgression);
    setVillageProgression(game.villageProgression);
    setSceneManager(game.sceneManager);
    setCombatManager(game.combatManager);
    setPartyManager(game.partyManager);

    game.init();

    return () => {
      game.destroy();
      gameRef.current = null;
      setDialogueManager(null);
      setPlayerProgression(null);
      setVillageProgression(null);
      setSceneManager(null);
      setCombatManager(null);
      setPartyManager(null);
    };
  }, [start]);

  const dialogueState = useSyncExternalStore(
    dialogueManager
      ? (listener) => dialogueManager.subscribe(listener)
      : noopSubscribe,

    dialogueManager
      ? () => dialogueManager.getState()
      : () => EMPTY_DIALOGUE_STATE,

    () => EMPTY_DIALOGUE_STATE
  );

  const playerState = useSyncExternalStore(
    playerProgression
      ? (listener) => playerProgression.subscribe(listener)
      : noopSubscribe,
    playerProgression
      ? () => playerProgression.getState()
      : () => EMPTY_PLAYER_STATE,
    () => EMPTY_PLAYER_STATE
  );

  const villageResources = useSyncExternalStore(
    villageProgression
      ? (listener) => villageProgression.subscribe(() => listener())
      : noopSubscribe,
    villageProgression
      ? () => villageProgression.getResourcesSnapshot()
      : () => INITIAL_VILLAGE_RESOURCES,
    () => INITIAL_VILLAGE_RESOURCES
  );

  const sceneState = useSyncExternalStore(
    sceneManager
      ? (listener) => sceneManager.subscribe(() => listener())
      : noopSubscribe,
    sceneManager ? () => sceneManager.getState() : () => EMPTY_SCENE_STATE,
    () => EMPTY_SCENE_STATE
  );

  const combatState = useSyncExternalStore(
    combatManager?.subscribe ?? noopSubscribe,
    combatManager?.getSnapshot ?? (() => EMPTY_COMBAT_STATE),
    () => EMPTY_COMBAT_STATE
  );

  const partyState = useSyncExternalStore(
    partyManager?.subscribe ?? noopSubscribe,
    partyManager?.getSnapshot ?? (() => EMPTY_PARTY_STATE),
    () => EMPTY_PARTY_STATE
  );

  const foundGuild = async (location: { lat: number; lng: number }) => {
    setRegistering(true);
    setRegistrationError(null);

    const registration = await registerBase(location);
    if (!registration.ok) {
      setRegistrationError(registration.message);
      setRegistering(false);
      return;
    }

    const otherBases = (await loadNearbyBases()).map(toWorldBaseLocation);
    setPhase({
      kind: "playing",
      start: { base: toWorldBaseLocation(registration.player), otherBases },
    });
    setRegistering(false);
  };

  if (phase.kind !== "playing") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-900 p-4 text-amber-50">
        {phase.kind === "loading" && <p>Conectando con el mundo...</p>}
        {phase.kind === "unauthenticated" && (
          <p>
            Inicia sesi&oacute;n para jugar.{" "}
            <Link href="/login" className="font-bold text-amber-300 underline">
              Ir al inicio de sesi&oacute;n
            </Link>
          </p>
        )}
        {phase.kind === "unavailable" && <p role="alert">{phase.message}</p>}
        {phase.kind === "picking" && (
          <GameBaseLocationPicker
            busy={registering}
            errorMessage={registrationError}
            onStart={(location) => void foundGuild(location)}
          />
        )}
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
        companions={partyState.companions}
        isInVillage={
          sceneState.sceneId === "base" ||
          sceneState.sceneId === "town-hall-interior" ||
          sceneState.sceneId === "tavern-interior" ||
          sceneState.sceneId === "embassy-interior"
        }
      />

      <GameControls />

      {combatManager && combatState.enemy && (
        <BattleOverlay
          manager={combatManager}
          snapshot={combatState}
          potionCount={villageResources.potions}
        />
      )}
    </main>
  );
}
