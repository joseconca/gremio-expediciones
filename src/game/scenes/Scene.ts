import type { InputManager } from "../input/InputManager";
import { SpawnPoint } from "../world/SpawnPoint";
import type { SceneManager } from "./SceneManager";
import type { DialogueManager } from "../dialogue/DialogueManager";
import type { VillageProgression } from "../gameplay/VillageProgression";
import type { PlayerProgression } from "../gameplay/PlayerProgression";
import type { CombatManager } from "../gameplay/CombatManager";
import type { PartyManager } from "../gameplay/PartyManager";
import type { DayNightSystem } from "../lighting/DayNightSystem";
import type { PlayerLocation } from "../../shared/travel";
import type { MobilityManager } from "../gameplay/MobilityManager";

export interface SceneConfig {
  initialLocation?: PlayerLocation;
  mobilityManager?: MobilityManager;
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
  spawnId?: string;
}

export abstract class Scene {
  protected readonly initialLocation?: PlayerLocation;
  protected readonly mobilityManager?: MobilityManager;
  protected canvas: HTMLCanvasElement;
  protected ctx: CanvasRenderingContext2D;
  protected input: InputManager;
  protected sceneManager: SceneManager;
  protected readonly dialogueManager: DialogueManager;
  protected readonly villageProgression: VillageProgression;
  protected readonly playerProgression: PlayerProgression;
  protected readonly combatManager: CombatManager;
  protected readonly partyManager: PartyManager;
  protected readonly dayNightSystem: DayNightSystem;
  protected debugMode = false;
  protected spawnId?: string;

  constructor(config: SceneConfig) {
    this.initialLocation = config.initialLocation;
    this.mobilityManager = config.mobilityManager;
    this.canvas = config.canvas;
    this.ctx = config.ctx;
    this.input = config.input;
    this.sceneManager = config.sceneManager;
    this.dialogueManager = config.dialogueManager;
    this.villageProgression = config.villageProgression;
    this.playerProgression = config.playerProgression;
    this.combatManager = config.combatManager;
    this.partyManager = config.partyManager;
    this.dayNightSystem = config.dayNightSystem;
    this.spawnId = config.spawnId;
  }

  protected abstract getSpawnPoint(spawnId?: string): SpawnPoint;

  getPlayerLocation(): { x: number; y: number; direction: PlayerLocation["direction"] } | null {
    return null;
  }

  protected updateDebugMode(): void {
    if (this.input.wasDebugTogglePressed()) {
      this.debugMode = !this.debugMode;
    }
  }

  abstract init(): void;

  abstract update(deltaTime: number): void;

  abstract render(): void;

  abstract destroy(): void;
}
