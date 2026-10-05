"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

import { Game } from "@/game/core/Game";
import GameControls from "@/components/game/GameControls";
import DialogueBox from "@/components/game/DialogueBox";
import GameHud from "@/components/game/GameHud";
import BattleOverlay from "@/components/game/BattleOverlay";
import GameMenu from "@/components/game/GameMenu";
import ExpeditionModal from "@/components/game/ExpeditionModal";
import EquipmentShop from "@/components/game/EquipmentShop";
import { EMPTY_EQUIPMENT } from "@/game/gameplay/EquipmentManager";
import type { ExpeditionState } from "@/game/gameplay/ExpeditionManager";
import { expeditionCombatSnapshot } from "@/game/gameplay/expeditionCombat";
import type { MenuSnapshot } from "@/game/gameplay/MenuManager";
import type { MobilityState } from "@/game/gameplay/MobilityManager";
import { BASE_RETURN_LOCATION, type MobilitySnapshot } from "@/shared/travel";
import type { CombatSnapshot } from "@/game/gameplay/CombatManager";
import type { PartySnapshot } from "@/game/gameplay/PartyManager";
import type { PlayerProgressionState } from "@/game/gameplay/PlayerProgression";
import {
  INITIAL_VILLAGE_RESOURCES,
} from "@/game/gameplay/VillageProgression";
import type { WorldBaseLocation } from "@/game/world/WorldLocation";
import type {
  CreatePlayerRequest,
  NearbyBaseDto,
  PlayerProfileDto,
  SavedBuilding,
  WorldSessionDto,
} from "@/shared/world";
import {
  createPlayer,
  loadSession,
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
  rewardRevision: number;
  mobility: MobilitySnapshot;
  progressToken: string;
  base: WorldBaseLocation;
  otherBases: WorldBaseLocation[];
  player: PlayerProfileDto;
  buildings: SavedBuilding[];
}

type Phase =
  | { kind: "loading" }
  | { kind: "unauthenticated" }
  | { kind: "unavailable"; message: string }
  | { kind: "picking" }
  | { kind: "playing"; start: GameStart };

function toNearbyLocation(base: NearbyBaseDto): WorldBaseLocation {
  return {
    id: base.playerId,
    name: base.baseName,
    lat: base.lat,
    lng: base.lng,
    hasEmbassy: base.hasEmbassy,
  };
}

function toGameStart(session: WorldSessionDto): GameStart {
  return {
    rewardRevision: session.rewardRevision,
    mobility: session.mobility,
    progressToken: session.progressToken,
    base: {
      id: session.player.id,
      name: session.base.name,
      lat: session.base.lat,
      lng: session.base.lng,
    },
    otherBases: session.nearbyBases.map(toNearbyLocation),
    player: session.player,
    buildings: session.base.buildings,
  };
}

const EMPTY_DIALOGUE_STATE = {
  active: false,
  dialogue: null,
  currentNode: null,
  selectedChoiceIndex: 0,
};

const EMPTY_SCENE_STATE = { sceneId: null };
const EMPTY_MENU: MenuSnapshot = { open: false, tab: "character", message: null, busy: false };
const EMPTY_EXPEDITION: ExpeditionState = { open: false, busy: false, error: null, data: null };
const EMPTY_MOBILITY: MobilityState = { location: BASE_RETURN_LOCATION, journey: null, saving: false, error: null, conflict: false };
const EMPTY_COMBAT_STATE: CombatSnapshot = {
  phase: "fled",
  menu: "root",
  enemy: null,
  party: [],
  log: "",
  revision: 0,
};
const EMPTY_PARTY_STATE: PartySnapshot = {
  syncStatus: "pending",
  syncMessage: null,
  nearbyBases: [],
  nearbyWorldPlayers: [],
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
  const [menuManager, setMenuManager] = useState<Game["menuManager"] | null>(null);
  const [mobilityManager, setMobilityManager] = useState<Game["mobilityManager"] | null>(null);
  const [expeditionManager, setExpeditionManager] = useState<Game["expeditionManager"] | null>(null);
  const [equipmentManager, setEquipmentManager] = useState<Game["equipmentManager"] | null>(null);
  const setModalOpen = useCallback((open: boolean) => {
    gameRef.current?.input.setBlocked(open);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const resolveSession = async () => {
      const lookup = await loadSession();
      if (cancelled) return;

      if (lookup.status === "unauthenticated") {
        setPhase({ kind: "unauthenticated" });
      } else if (lookup.status === "unavailable") {
        setPhase({ kind: "unavailable", message: lookup.message });
      } else if (lookup.session) {
        setPhase({ kind: "playing", start: toGameStart(lookup.session) });
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
      rewardRevision: start.rewardRevision,
      mobility: start.mobility,
      progressToken: start.progressToken,
      canvas: canvasRef.current,
      selectedBase: start.base,
      otherBases: start.otherBases,
      player: start.player,
      buildings: start.buildings,
      worldGateway,
    });

    gameRef.current = game;

    setDialogueManager(game.dialogueManager);
    setPlayerProgression(game.playerProgression);
    setVillageProgression(game.villageProgression);
    setSceneManager(game.sceneManager);
    setCombatManager(game.combatManager);
    setPartyManager(game.partyManager);
    setMenuManager(game.menuManager);
    setMobilityManager(game.mobilityManager);
    setExpeditionManager(game.expeditionManager);
    setEquipmentManager(game.equipmentManager);

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
      setMenuManager(null);
      setMobilityManager(null);
      setExpeditionManager(null);
      setEquipmentManager(null);
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

  const foundGuild = async (request: CreatePlayerRequest) => {
    setRegistering(true);
    setRegistrationError(null);

    const creation = await createPlayer(request);
    if (!creation.ok) {
      setRegistrationError(creation.message);
      setRegistering(false);
      return;
    }

    setPhase({ kind: "playing", start: toGameStart(creation.session) });
    setRegistering(false);
  };

  const menuState = useSyncExternalStore(menuManager?.subscribe ?? noopSubscribe,
    menuManager?.getSnapshot ?? (() => EMPTY_MENU), () => EMPTY_MENU);
  const mobilityState = useSyncExternalStore(mobilityManager?.subscribe ?? noopSubscribe,
    mobilityManager?.getSnapshot ?? (() => EMPTY_MOBILITY), () => EMPTY_MOBILITY);
  const expeditionState = useSyncExternalStore(expeditionManager?.subscribe ?? noopSubscribe,
    expeditionManager?.getSnapshot ?? (() => EMPTY_EXPEDITION), () => EMPTY_EXPEDITION);
  const equipmentState = useSyncExternalStore(equipmentManager?.subscribe ?? noopSubscribe,
    equipmentManager?.getSnapshot ?? (() => EMPTY_EQUIPMENT), () => EMPTY_EQUIPMENT);
  const expeditionActive = !expeditionState.data || (expeditionState.data.active && expeditionState.data.active.phase !== "completed");
  const expeditionBattle = expeditionState.battleOpen && expeditionState.data ? expeditionCombatSnapshot(expeditionState.data) : null;

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
            onStart={(request) => void foundGuild(request)}
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

      {!mobilityState.journey && !mobilityState.travelPending && <GameHud
        player={playerState}
        resources={villageResources}
        companions={partyState.companions}
        onModalChange={setModalOpen}
        isInVillage={
          sceneState.sceneId === "base" ||
          sceneState.sceneId === "town-hall-interior" ||
          sceneState.sceneId === "tavern-interior" ||
          sceneState.sceneId === "embassy-interior" ||
          sceneState.sceneId === "armory-interior" || sceneState.sceneId === "smithy-interior"
        }
      />}

      <GameControls disabled={!!mobilityState.journey || !!mobilityState.travelPending || mobilityState.conflict || !!expeditionActive}
        disabledMessage={mobilityState.conflict ? "Ubicación cambiada en otra sesión. Recarga para continuar."
          : expeditionActive ? expeditionState.data ? "Personaje en expedición. Consulta su estado en el tablón." : "Consultando expediciones guardadas…"
          : mobilityState.travelPending ? "Confirmando el carro con el servidor. El personaje permanece bloqueado."
          : undefined} />

      {expeditionManager && start && <ExpeditionModal manager={expeditionManager} snapshot={expeditionState} base={start.base} />}
      {expeditionManager && (expeditionActive || expeditionState.error) && !expeditionState.open && !expeditionState.battleOpen && (
        <button type="button" onClick={() => expeditionManager.openBoard()}
          className="absolute inset-x-4 bottom-20 z-30 rounded border border-amber-200/30 bg-stone-950/95 p-3 text-sm font-bold text-amber-100">
          {expeditionState.data?.active?.phase === "battle" ? "Resolver combate de expedición" : "Ver expedición y mapa"}
        </button>
      )}

      {mobilityState.journey && <p role="status" className="pointer-events-none absolute inset-x-3 top-3 rounded border border-amber-200/30 bg-stone-950/90 p-3 text-center text-sm text-amber-100">
        Regreso a tu poblado · Llegada prevista {new Date(mobilityState.journey.arrivalAt).toLocaleTimeString("es-ES")}
      </p>}

      {menuManager && partyManager && <GameMenu manager={menuManager} snapshot={menuState}
        equipmentManager={equipmentManager ?? undefined}
        player={playerState} resources={villageResources} party={partyState}
        partyManager={partyManager} mobility={mobilityState}
        hasEmbassy={!!villageProgression?.hasBuilding("embassy")}
        expeditionInventory={expeditionState.data?.inventory} />}
      {equipmentManager && <EquipmentShop manager={equipmentManager} snapshot={equipmentState} gold={playerState.gold} />}

      {mobilityState.error && <p role="alert" className="absolute inset-x-3 top-44 z-30 rounded bg-stone-950/90 p-2 text-xs text-red-200">
        {mobilityState.error}
      </p>}

      {partyState.syncStatus !== "saved" && (
        <p role="status" className="pointer-events-none absolute inset-x-3 top-32 z-30 rounded bg-stone-950/90 p-2 text-xs text-amber-200">
          {partyState.syncMessage ?? "Progreso pendiente: espera al guardado antes de recargar."}
        </p>
      )}

      {combatManager && combatState.enemy && (
        <BattleOverlay
          manager={combatManager}
          snapshot={combatState}
          potionCount={villageResources.potions}
          presentationNow={combatManager.getSimulationTime()}
        />
      )}
      {expeditionManager && expeditionBattle && <BattleOverlay manager={expeditionManager.battleController}
        snapshot={expeditionBattle} potionCount={0} serverControlled busy={expeditionState.busy}
        error={expeditionState.error} title="Combate de expedición" presentationNow={expeditionManager.serverNow()} />}
    </main>
  );
}
