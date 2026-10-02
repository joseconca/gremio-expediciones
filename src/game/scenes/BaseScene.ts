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
import { LightingSystem } from "../lighting/LightingSystem";
import { heroAnimations } from "../data/heroAnimations";
import { genericDoorDefinition } from "../data/doors/genericDoor1";
import { baseMap } from "../data/base/baseMap";
import { baseCollision } from "../data/base/baseCollision";

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

    const tileMap = new TileMap(baseMap);
    const collisionMap = new CollisionMap(baseCollision);

    this.world = new World({
      width: baseMap.width * baseMap.tileSize,
      height: baseMap.height * baseMap.tileSize,
      tileMap: tileMap,
      collisionMap: collisionMap,
      lighting: new LightingSystem({ dayNight: this.dayNightSystem }),
    });

    this.collisionSystem = new CollisionSystem(this.world.collisionMap);
    this.sceneTransitionSystem = new SceneTransitionSystem();

    this.world.addObject(new Campfire({ x: 560, y: 800 }));
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

    for (const placement of placements) {
      let object: GameObject;

      if (placement.underConstruction) {
        const activeConstruction = state.construction;
        if (!activeConstruction) continue;

        const constructionSite = new ConstructionSite({
          x: placement.x,
          y: placement.y,
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
          definition: constructibleBuildings[placement.type].definition,
        });
      }

      this.world.addObject(object);
      this.collisionSystem.addObject(object);
      this.villageObjects.push(object);

      if (placement.type === "town-hall") {
        const level = this.villageProgression.getTownHallLevel();
        if (level === 2) {
          const door = new Door({ x: placement.x + 64, y: placement.y, definition: genericDoorDefinition });
          this.world.addObject(door);
          this.collisionSystem.addObject(door);
          this.interactables.push(door);
          this.villageEntranceObjects.push(door);
        }
        const transition = new SceneTransition({
          x: placement.x + (level === 1 ? 24 : 48),
          y: placement.y - (level === 1 ? 38 : 16),
          width: level === 1 ? 70 : 32,
          height: 16,
          targetSceneId: "town-hall-interior",
          targetSpawnId: "main-entrance",
          sceneManager: this.sceneManager,
        });
        this.sceneTransitionSystem.addTransition(transition);
        this.debugTeleporters.push(transition);
        this.villageEntranceObjects.push(transition);
      } else if (!placement.underConstruction) {
        const interior = constructibleBuildings[placement.type].interior;
        const entranceX = placement.x + 64;
        const buildingDoor = new Door({
          x: entranceX,
          y: placement.y,
          definition: genericDoorDefinition,
        });
        const buildingTransition = new SceneTransition({
          x: entranceX - 16,
          y: placement.y - 16,
          width: 32,
          height: 32,
          targetSceneId: interior.sceneId,
          targetSpawnId: interior.entranceSpawnId,
          sceneManager: this.sceneManager,
        });

        this.world.addObject(buildingDoor);
        this.collisionSystem.addObject(buildingDoor);
        this.interactables.push(buildingDoor);
        this.villageEntranceObjects.push(buildingDoor, buildingTransition);
        this.sceneTransitionSystem.addTransition(buildingTransition);
        this.debugTeleporters.push(buildingTransition);
      }
    }

    this.addExteriorGates();
    this.villageRevision = revision;
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
      baseMap.exteriorGates,
      baseMap.width * baseMap.tileSize
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
        return { id: spawnId ?? "default", x: hall.x + 48, y: hall.y - 16, direction: "down" };
      }
    }

    const exitedBuilding = this.villageProgression
      .getBuildingPlacements()
      .find(
        (building) =>
          building.type !== "town-hall" &&
          !building.underConstruction &&
          constructibleBuildings[building.type].interior.exitSpawnId === spawnId
      );
    if (spawnId && exitedBuilding) {
      return {
        id: spawnId,
        x: exitedBuilding.x + 64,
        y: exitedBuilding.y + 40,
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
