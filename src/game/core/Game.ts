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

export interface GameConfig {
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

  private readonly selectedBase: WorldBaseLocation;
  private readonly otherBases: WorldBaseLocation[];
  private readonly worldGateway: WorldGateway;

  constructor(config: GameConfig) {
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
    });
    this.combatManager = new CombatManager(
      this.playerProgression,
      this.villageProgression
    );
    this.partyManager = new PartyManager(
      this.worldGateway,
      this.playerProgression,
      this.villageProgression
    );
    this.dayNightSystem = new DayNightSystem();
    this.sceneManager = new SceneManager();

    this.sceneManager.register(
      "base",
      (spawnId) => new BaseScene(this.createSceneConfig(spawnId))
    );
    this.sceneManager.register(
      "town-hall-interior",
      (spawnId) => new TownHallInteriorScene(this.createSceneConfig(spawnId))
    );
    this.sceneManager.register(
      "tavern-interior",
      (spawnId) => new TavernInteriorScene(this.createSceneConfig(spawnId))
    );
    this.sceneManager.register(
      "embassy-interior",
      (spawnId) => new EmbassyInteriorScene(this.createSceneConfig(spawnId))
    );
    this.sceneManager.register(
      "exterior-world",
      (spawnId) =>
        new ExteriorWorldScene({
          ...this.createSceneConfig(spawnId),
          selectedBase: this.selectedBase,
          otherBases: this.otherBases,
        })
    );

    this.loop = new GameLoop({
      update: (deltaTime) => {
        this.villageProgression.update(deltaTime);
        this.dayNightSystem.update();
        this.partyManager.update(deltaTime);
        this.sceneManager.update(deltaTime);
        this.input.endFrame();
      },
      render: () => this.sceneManager.render(),
    });
  }

  init(): void {
    this.input.init();
    this.sceneManager.changeScene("base");
    this.loop.start();
  }

  destroy(): void {
    this.loop.stop();
    this.sceneManager.destroy();
    this.input.destroy();
  }

  private createSceneConfig(spawnId?: string): SceneConfig {
    return {
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
