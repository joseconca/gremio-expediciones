import { Scene, SceneConfig } from "./Scene";

import { SpriteSheet } from "../rendering/SpriteSheet";
import { Animator } from "../rendering/Animator";

import { SceneTransitionSystem } from "../systems/SceneTransitionSystem";
import { MovementSystem } from "../systems/MovementSystem";
import { CollisionSystem } from "../systems/CollisionSystem";
import { InteractionSystem } from "../systems/InteractionSystem";

import { World } from "../world/World";
import { Camera } from "../world/Camera";
import { TileMap } from "../world/TileMap";
import { SpawnPoint } from "../world/SpawnPoint";
import { CollisionMap } from "../world/CollisionMap";

import { Building } from "../entities/Building";
import { Campfire } from "../entities/Campfire";
import { ConstructionSite } from "../entities/ConstructionSite";
import { ResourceCart } from "../entities/ResourceCart";
import { MissionBoard, MISSION_BOARD_POSITION } from "../entities/MissionBoard";
import type { GameObject } from "../entities/GameObject";
import { Door } from "../entities/Door";
import type { Interactable } from "../entities/Interactable";
import { SceneTransition } from "../entities/SceneTransition";
import { Player } from "../entities/Characters/Player";
import {
  calculateVillageExteriorGates,
} from "../gameplay/VillageGateLayout";

import { townHallDefinitions } from "../data/buildings/townHall";
import { constructibleBuildings } from "../data/buildings/constructibleBuildings";
import { equipmentBuilding } from "../data/buildings/armory";
import { LightingSystem } from "../lighting/LightingSystem";
import { heroAnimations } from "../data/heroAnimations";
import { villageGateConfig, createVillageMap } from "../data/base/baseMap";
import { createVillageCollision } from "../data/base/baseCollision";
import type { VillageBuildingPlacement } from "../gameplay/VillageProgression";
import type { BuildingDefinition } from "../data/buildings/BuildingDefinition";

// Must stay clear of the south exit trigger, or arrival re-triggers the transition.
const WORLD_BASE_ARRIVAL: SpawnPoint = {
  id: "world-base-arrival",
  x: 480,
  y: 768,
  direction: "up",
};

export class BaseScene extends Scene {
  private world: World;
  private camera: Camera;
  private player: Player;

  private collisionSystem: CollisionSystem;
  private movementSystem: MovementSystem;
  private interactionSystem: InteractionSystem;
  private interactables: Interactable[] = [];
  private sceneTransitionSystem: SceneTransitionSystem;
  private readonly debugTeleporters: SceneTransition[] = [];
  private readonly villageObjects: GameObject[] = [];
  private readonly villageEntranceObjects: GameObject[] = [];
  private constructionSite: ConstructionSite | null = null;
  private villageRevision = -1;

  constructor(config: SceneConfig) {
    super(config);

    const buildingCount = this.villageProgression.getBuildingPlacements().filter((building) => building.type !== "smithy").length;
    const tileMap = new TileMap(createVillageMap(buildingCount));
    const collisionMap = new CollisionMap(createVillageCollision(buildingCount));

    this.world = new World({
      width: tileMap.width * tileMap.tileSize,
      height: tileMap.height * tileMap.tileSize,
      tileMap: tileMap,
      collisionMap: collisionMap,
      lighting: new LightingSystem({ dayNight: this.dayNightSystem }),
    });

    this.collisionSystem = new CollisionSystem(this.world.collisionMap);
    this.sceneTransitionSystem = new SceneTransitionSystem();

    this.world.addObject(new Campfire({ x: 560, y: 800 }));
    const board = new MissionBoard({ ...MISSION_BOARD_POSITION,
      onInteract: () => this.expeditionManager?.openBoard() });
    this.world.addObject(board);
    this.collisionSystem.addObject(board);
    this.interactables.push(board);
    this.world.addObject(
      new ResourceCart({ x: 320, y: 704 })
    );

    this.movementSystem = new MovementSystem(this.collisionSystem);
    this.interactionSystem = new InteractionSystem(this.input);

    this.camera = new Camera({
      width: this.canvas.width,
      height: this.canvas.height,
    });

    const heroSpriteSheet = new SpriteSheet({
      src: "/sprites/sheets/characters/hero.png",
      frameWidth: 32,
      frameHeight: 64,
    });
    const heroAnimator = new Animator(heroSpriteSheet, heroAnimations);

    const spawn = this.getSpawnPoint(this.spawnId);
    heroAnimator.play(`idle-${spawn.direction}`);
    this.player = new Player({
      x: spawn.x,
      y: spawn.y,
      speed: 60,
      direction: spawn.direction,
      input: this.input,
      animator: heroAnimator,
      movement: this.movementSystem,
      attributes: this.playerProgression.getState().attributes,
    });
    this.world.addObject(this.player);
    this.collisionSystem.addObject(this.player);

    this.syncVillageLayout();
  }

  private syncVillageLayout(): void {
    const revision = this.villageProgression.getRevision();
    if (revision === this.villageRevision) return;

    for (const object of this.villageObjects) {
      this.world.removeObject(object);
      this.collisionSystem.removeObject(object);
    }
    for (const object of this.villageEntranceObjects) {
      this.world.removeObject(object);
      this.collisionSystem.removeObject(object);
      if (object instanceof SceneTransition) {
        this.sceneTransitionSystem.removeTransition(object);
        const debugIndex = this.debugTeleporters.indexOf(object);
        if (debugIndex >= 0) this.debugTeleporters.splice(debugIndex, 1);
      }
      if (object instanceof Door) {
        const interactableIndex = this.interactables.indexOf(object);
        if (interactableIndex >= 0) this.interactables.splice(interactableIndex, 1);
      }
    }
    this.villageObjects.length = 0;
    this.villageEntranceObjects.length = 0;
    this.constructionSite = null;

    const state = this.villageProgression.getState();
    const placements = this.villageProgression.getBuildingPlacements();
    const plotCount = placements.filter((building) => building.type !== "smithy").length;
    this.world.tileMap.resize(createVillageMap(plotCount));
    this.world.collisionMap.resize(createVillageCollision(plotCount));

    for (const placement of placements) {
      let object: GameObject;

      if (placement.type === "smithy" && !placement.underConstruction) {
        this.addBuildingEntrance(placement);
        continue; // The armory renders/collides the single composite asset.
      }

      if (placement.underConstruction) {
        const activeConstruction = state.construction;
        if (!activeConstruction) continue;

        const constructionSite = new ConstructionSite({
          // Keep the existing armory and its entrance usable during annex work.
          x: placement.x + (placement.type === "smithy" ? 74 : 0),
          y: placement.y,
          ...(placement.type === "smithy" ? {
            footprint: { width: 44, height: 48 },
            colliders: [{ offsetX: 12, offsetY: -30, width: 24, height: 28 }],
          } : {}),
          durationSeconds: activeConstruction.durationSeconds,
          elapsedSeconds: activeConstruction.elapsedSeconds,
        });
        this.constructionSite = constructionSite;
        object = constructionSite;
      } else if (placement.type === "town-hall") {
        object = new Building({
          x: placement.x,
          y: placement.y,
          definition: townHallDefinitions[
            this.villageProgression.getTownHallLevel()
          ],
        });
      } else {
        object = new Building({
          x: placement.x,
          y: placement.y,
          definition: this.getBuildingDefinition(placement),
        });
      }

      this.world.addObject(object);
      this.collisionSystem.addObject(object);
      this.villageObjects.push(object);

      if (!placement.underConstruction) this.addBuildingEntrance(placement);
    }

    this.addExteriorGates();
    this.villageRevision = revision;
    this.ensurePlayerCanOccupy();
  }

  private ensurePlayerCanOccupy(): void {
    if (this.collisionSystem.canOccupy(this.player, this.player.x, this.player.y)) return;
    // Completing/recentering a building must not trap the local character.
    if (this.collisionSystem.canOccupy(this.player, WORLD_BASE_ARRIVAL.x, WORLD_BASE_ARRIVAL.y)) {
      this.player.x = WORLD_BASE_ARRIVAL.x;
      this.player.y = WORLD_BASE_ARRIVAL.y;
      return;
    }
    const map = this.world.tileMap;
    for (let y = map.originY; y < map.originY + this.world.height; y += map.tileSize) {
      for (let x = map.originX; x < map.originX + this.world.width; x += map.tileSize) {
        if (!this.collisionSystem.canOccupy(this.player, x, y)) continue;
        this.player.x = x;
        this.player.y = y;
        return;
      }
    }
  }

  private getBuildingDefinition(placement: VillageBuildingPlacement): BuildingDefinition {
    if (placement.type === "armory") return equipmentBuilding("armory", this.villageProgression.hasBuilding("smithy"));
    return placement.type === "town-hall"
      ? townHallDefinitions[this.villageProgression.getTownHallLevel()]
      : constructibleBuildings[placement.type].definition;
  }

  private addBuildingEntrance(placement: VillageBuildingPlacement): void {
    const entrance = this.getBuildingDefinition(placement).entrance;
    if (!entrance) return;
    const door = entrance.door ? new Door({
      x: placement.x + entrance.door.offsetX, y: placement.y + entrance.door.offsetY,
      definition: entrance.door.definition,
    }) : null;
    if (door) {
      this.world.addObject(door);
      this.collisionSystem.addObject(door);
      this.interactables.push(door);
      this.villageEntranceObjects.push(door);
    }
    const transition = new SceneTransition({
      x: placement.x + entrance.trigger.offsetX, y: placement.y + entrance.trigger.offsetY,
      width: entrance.trigger.width, height: entrance.trigger.height,
      targetSceneId: entrance.interior.sceneId, targetSpawnId: entrance.interior.entranceSpawnId,
      sceneManager: this.sceneManager, canActivate: () => !door || door.isOpen(),
    });
    this.sceneTransitionSystem.addTransition(transition);
    this.debugTeleporters.push(transition);
    this.villageEntranceObjects.push(transition);
  }

  private addExteriorGates(): void {
    const gates = this.getExteriorGatePositions();

    for (const gate of gates) {
      const transition = new SceneTransition({
        x: gate.x - 16,
        y: gate.y - 8,
        width: 32,
        height: 16,
        targetSceneId: "exterior-world",
        targetSpawnId: `from-${gate.direction}`,
        sceneManager: this.sceneManager,
      });
      this.sceneTransitionSystem.addTransition(transition);
      this.debugTeleporters.push(transition);
      this.villageEntranceObjects.push(transition);
    }
  }

  private getExteriorGatePositions() {
    return calculateVillageExteriorGates(
      this.villageProgression.getBuildingPlacements(),
      villageGateConfig,
      this.world.width,
      this.world.tileMap.originX
    );
  }

  protected getSpawnPoint(spawnId?: string): SpawnPoint {
    if (this.initialLocation) {
      const saved = this.initialLocation;
      if (!this.world.collisionMap.isBlockedRect(saved.x + 8, saved.y + 50, 12, 6)) {
        return { id: "resume", x: saved.x, y: saved.y, direction: saved.direction };
      }
    }
    if (spawnId === "world-base-arrival") {
      return WORLD_BASE_ARRIVAL;
    }
    if (!spawnId || spawnId === "default" || spawnId === "town-hall-exit") {
      const hall = this.villageProgression.getBuildingPlacements().find((building) => building.type === "town-hall");
      if (hall) {
        const exit = this.getBuildingDefinition(hall).entrance!.exit;
        return { id: spawnId ?? "default", x: hall.x + exit.offsetX, y: hall.y + exit.offsetY, direction: "down" };
      }
    }

    const exitedBuilding = this.villageProgression
      .getBuildingPlacements()
      .find(
        (building) =>
          building.type !== "town-hall" &&
          !building.underConstruction &&
            constructibleBuildings[building.type].definition.entrance?.interior.exitSpawnId === spawnId
      );
    if (spawnId && exitedBuilding) {
      const exit = this.getBuildingDefinition(exitedBuilding).entrance!.exit;
      return {
        id: spawnId,
        x: exitedBuilding.x + exit.offsetX,
        y: exitedBuilding.y + exit.offsetY,
        direction: "down",
      };
    }

    throw new Error(`SpawnPoint "${spawnId ?? "default"}" no encontrado en BaseScene`);
  }

  init(): void {
    console.log("BaseScene iniciada");
  }

  override getPlayerLocation() {
    return { x: this.player.x, y: this.player.y, direction: this.player.direction };
  }

  update(deltaTime: number): void {
    this.updateDebugMode();
    this.syncVillageLayout();
    const dialogueActive = this.dialogueManager.isActive();
    this.player.setInputEnabled(!dialogueActive && !this.input.isBlocked());
    this.world.update(deltaTime);

    const construction = this.villageProgression.getState().construction;
    if (construction && this.constructionSite) {
      this.constructionSite.syncProgress(construction.elapsedSeconds);
    }

    this.camera.follow(this.player.x, this.player.y, 32, 64);

    if (dialogueActive) {
      if (this.input.isActionPressed("actionB")) this.dialogueManager.close();
      else if (this.input.isActionPressed("actionA")) this.dialogueManager.advance();
    } else if (!this.input.isBlocked()) {
      this.interactionSystem.tryInteract(this.player, this.interactables);
      this.sceneTransitionSystem.update([this.player]);
    }
  }

  render(): void {
    this.ctx.fillStyle = "#111";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const playerAnchor = this.player.getGroundAnchor();
    
    const groundReference = {
      worldX: playerAnchor.x,
      worldY: playerAnchor.y,

      screenX: this.canvas.width / 2,
      screenY: this.canvas.height * 0.65,
    };

    this.world.render(this.ctx, this.camera, groundReference);

    if (this.debugMode) {
      this.world.renderDebug(this.ctx, groundReference, this.debugTeleporters);
    }
  }
  destroy(): void {}
}
