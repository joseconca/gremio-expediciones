import { GameLoop } from "./GameLoop";
import { InputManager } from "../input/InputManager";
import { SceneManager } from "../scenes/SceneManager";
import type { SceneConfig } from "../scenes/Scene";
import { BaseScene } from "../scenes/BaseScene";
import { TownHallInteriorScene } from "../scenes/TownHallInteriorScene";
import { TavernInteriorScene } from "../scenes/TavernInteriorScene";
import { EmbassyInteriorScene } from "../scenes/EmbassyInteriorScene";
import { ExteriorWorldScene } from "../scenes/ExteriorWorldScene";
import { DialogueManager } from "../dialogue/DialogueManager";
import { VillageProgression } from "../gameplay/VillageProgression";
import { PlayerProgression } from "../gameplay/PlayerProgression";
import { CombatManager } from "../gameplay/CombatManager";
import { PartyManager } from "../gameplay/PartyManager";
import type { WorldGateway } from "../gameplay/WorldGateway";
import { DayNightSystem } from "../lighting/DayNightSystem";
import type { WorldBaseLocation } from "../world/WorldLocation";
import type { PlayerProfileDto, SavedBuilding } from "../../shared/world";
import type { MobilitySnapshot, PlayerLocation } from "../../shared/travel";
import { MobilityManager } from "../gameplay/MobilityManager";
import { MenuManager } from "../gameplay/MenuManager";
import { ExpeditionManager } from "../gameplay/ExpeditionManager";

export interface GameConfig {
  mobility: MobilitySnapshot;
  progressToken: string;
  rewardRevision: number;
  canvas: HTMLCanvasElement;
  selectedBase: WorldBaseLocation;
  otherBases?: WorldBaseLocation[];
  player: PlayerProfileDto;
  buildings: SavedBuilding[];
  worldGateway: WorldGateway;
}

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  input: InputManager;
  sceneManager: SceneManager;
  dialogueManager: DialogueManager;
  villageProgression: VillageProgression;
  playerProgression: PlayerProgression;
  combatManager: CombatManager;
  partyManager: PartyManager;
  dayNightSystem: DayNightSystem;
  loop: GameLoop;
  mobilityManager: MobilityManager;
  menuManager: MenuManager;
  expeditionManager: ExpeditionManager;
  private readonly initialMobility: MobilitySnapshot;

  private readonly selectedBase: WorldBaseLocation;
  private readonly otherBases: WorldBaseLocation[];
  private readonly worldGateway: WorldGateway;

  constructor(config: GameConfig) {
    this.initialMobility = config.mobility;
    this.canvas = config.canvas;
    this.selectedBase = config.selectedBase;
    this.otherBases = config.otherBases ?? [];
    this.worldGateway = config.worldGateway;

    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("No se pudo obtener el contexto 2D del canvas");
    }
    this.ctx = ctx;

    this.input = new InputManager();
    this.dialogueManager = new DialogueManager();
    this.villageProgression = new VillageProgression(config.buildings);
    this.playerProgression = new PlayerProgression({
      name: config.player.name,
      characterClass: config.player.characterClass,
      level: config.player.level,
      experience: config.player.experience,
      gold: config.player.gold,
      currentHealth: config.player.currentHealth,
      maxHealth: config.player.maxHealth,
    });
    this.combatManager = new CombatManager(
      this.playerProgression,
      this.villageProgression
    );
    this.partyManager = new PartyManager(
      this.worldGateway,
      this.playerProgression,
      this.villageProgression,
      config.progressToken,
      () => !this.mobilityManager?.getSnapshot().journey && !this.mobilityManager?.getSnapshot().travelPending && !this.expeditionManager?.isActive(),
      config.rewardRevision
    );
    this.dayNightSystem = new DayNightSystem();
    this.sceneManager = new SceneManager();
    this.mobilityManager = new MobilityManager(this.worldGateway, config.mobility,
      () => this.sceneManager.getPlayerLocation(),
      (location) => {
        this.dialogueManager.close();
        this.sceneManager.changeScene(location.sceneId, undefined, location);
      }, undefined, () => !this.expeditionManager?.isActive());
    this.menuManager = new MenuManager(this.mobilityManager, () =>
      !this.combatManager.isEncounterOpen() && !this.dialogueManager.isActive() &&
      !this.mobilityManager.getSnapshot().journey && !this.mobilityManager.getSnapshot().travelPending && !this.mobilityManager.getSnapshot().conflict && !this.expeditionManager?.isActive());
    this.expeditionManager = new ExpeditionManager(this.worldGateway, this.partyManager, this.mobilityManager,
      () => this.sceneManager.getState().sceneId === "base" && !this.combatManager.isEncounterOpen() &&
        !this.mobilityManager.getSnapshot().journey && !this.mobilityManager.getSnapshot().travelPending && !this.mobilityManager.getSnapshot().conflict,
      config.rewardRevision);

    this.sceneManager.register(
      "base",
      (spawnId, initialLocation) => new BaseScene(this.createSceneConfig(spawnId, initialLocation))
    );
    this.sceneManager.register(
      "town-hall-interior",
      (spawnId, initialLocation) => new TownHallInteriorScene(this.createSceneConfig(spawnId, initialLocation))
    );
    this.sceneManager.register(
      "tavern-interior",
      (spawnId, initialLocation) => new TavernInteriorScene(this.createSceneConfig(spawnId, initialLocation))
    );
    this.sceneManager.register(
      "embassy-interior",
      (spawnId, initialLocation) => new EmbassyInteriorScene(this.createSceneConfig(spawnId, initialLocation))
    );
    this.sceneManager.register(
      "exterior-world",
      (spawnId, initialLocation) =>
        new ExteriorWorldScene({
          ...this.createSceneConfig(spawnId, initialLocation),
          selectedBase: this.selectedBase,
          otherBases: this.partyManager.getSnapshot().loaded
            ? this.partyManager.getSnapshot().nearbyBases.map((base) => ({
                id: base.playerId, name: base.baseName, lat: base.lat, lng: base.lng,
                hasEmbassy: base.hasEmbassy,
              }))
            : this.otherBases,
        })
    );

    this.loop = new GameLoop({
      update: (deltaTime) => {
        if (this.input.isRawActionPressed("start")) this.menuManager.toggle();
        if (this.menuManager.getSnapshot().open && this.input.isRawActionPressed("actionB")) this.menuManager.close();
        const mobility = this.mobilityManager.getSnapshot();
        this.input.setBlocker("menu", this.menuManager.getSnapshot().open);
        this.input.setBlocker("travel", !!mobility.journey || !!mobility.travelPending || mobility.conflict);
        this.input.setBlocker("expedition", this.expeditionManager.getSnapshot().open ||
          !!this.expeditionManager.getSnapshot().battleOpen || this.expeditionManager.isActive());
        this.villageProgression.update(deltaTime);
        this.dayNightSystem.update();
        this.partyManager.update(deltaTime);
        this.sceneManager.update(deltaTime);
        this.mobilityManager.update(deltaTime);
        this.expeditionManager.update(deltaTime);
        this.input.endFrame();
      },
      render: () => this.sceneManager.render(),
    });
  }

  init(): void {
    this.input.init();
    const saved = this.initialMobility;
    this.sceneManager.changeScene(saved.journey ? "exterior-world" : saved.location.sceneId, undefined, saved.location);
    this.loop.start();
  }

  destroy(): void {
    this.loop.stop();
    this.partyManager.destroy();
    this.mobilityManager.destroy();
    this.menuManager.destroy();
    this.expeditionManager.destroy();
    this.sceneManager.destroy();
    this.input.destroy();
  }

  private createSceneConfig(spawnId?: string, initialLocation?: PlayerLocation): SceneConfig {
    return {
      initialLocation,
      mobilityManager: this.mobilityManager,
      expeditionManager: this.expeditionManager,
      canvas: this.canvas,
      ctx: this.ctx,
      input: this.input,
      sceneManager: this.sceneManager,
      dialogueManager: this.dialogueManager,
      villageProgression: this.villageProgression,
      playerProgression: this.playerProgression,
      combatManager: this.combatManager,
      partyManager: this.partyManager,
      dayNightSystem: this.dayNightSystem,
      spawnId,
    };
  }
}
