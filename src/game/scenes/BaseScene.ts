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

import { townHallDefinitions } from "../data/buildings/townHall";
import { tavernDefinition } from "../data/buildings/tavern";
import { heroAnimations } from "../data/heroAnimations";
import { genericDoorDefinition } from "../data/doors/genericDoor1";
import { baseMap } from "../data/base/baseMap";
import { baseCollision } from "../data/base/baseCollision";

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
  private readonly spawnPoints: SpawnPoint[] = [];
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
    });

    this.collisionSystem = new CollisionSystem(this.world.collisionMap);
    this.sceneTransitionSystem = new SceneTransitionSystem();

    this.spawnPoints.push(
      {
        id: "default",
        x: 480,
        y: 688,
        direction: "down",
      },
      {
        id: "town-hall-exit",
        x: 480,
        y: 688,
        direction: "down",
      }
    );
    const townHallLevel = this.villageProgression.getState().townHallLevel;

    this.world.addObject(new Campfire({ x: 560, y: 800 }));
    this.world.addObject(
      new ResourceCart({ x: 320, y: 704 })
    );

    // Progression level 1 is the town-hall0 sprite and has no door yet.
    if (townHallLevel === 2) {
      const townHallDoor = new Door({
        x: 496,
        y: 704,
        definition: genericDoorDefinition,
      });
      this.world.addObject(townHallDoor);
      this.collisionSystem.addObject(townHallDoor);
      this.interactables.push(townHallDoor);
    }

    const townHallTransition = new SceneTransition({
      x: townHallLevel === 1 ? 456 : 480,
      y: townHallLevel === 1 ? 666 : 688,
      width: townHallLevel === 1 ? 70 : 32,
      height: 16,
      targetSceneId: "town-hall-interior",
      targetSpawnId: "main-entrance",
      sceneManager: this.sceneManager,
    });
    this.sceneTransitionSystem.addTransition(townHallTransition);
    this.debugTeleporters.push(townHallTransition);
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
          definition: townHallDefinitions[state.townHallLevel],
        });
      } else {
        object = new Building({
          x: placement.x,
          y: placement.y,
          definition: tavernDefinition,
        });
      }

      this.world.addObject(object);
      this.collisionSystem.addObject(object);
      this.villageObjects.push(object);

      if (placement.type === "tavern" && !placement.underConstruction) {
        const entranceX = placement.x + 64;
        const tavernDoor = new Door({
          x: entranceX,
          y: placement.y,
          definition: genericDoorDefinition,
        });
        const tavernTransition = new SceneTransition({
          x: entranceX - 16,
          y: placement.y - 16,
          width: 32,
          height: 32,
          targetSceneId: "tavern-interior",
          targetSpawnId: "tavern-entrance",
          sceneManager: this.sceneManager,
        });

        this.world.addObject(tavernDoor);
        this.collisionSystem.addObject(tavernDoor);
        this.interactables.push(tavernDoor);
        this.villageEntranceObjects.push(tavernDoor, tavernTransition);
        this.sceneTransitionSystem.addTransition(tavernTransition);
        this.debugTeleporters.push(tavernTransition);
      }
    }

    this.villageRevision = revision;
  }

  protected getSpawnPoint(spawnId?: string): SpawnPoint {
    const id = spawnId ?? "default";

    const spawnPoint = this.spawnPoints.find((point) => point.id === id);

    if (!spawnPoint) {
      throw new Error(`SpawnPoint "${id}" no encontrado en BaseScene`);
    }

    return spawnPoint;
  }

  init(): void {
    console.log("BaseScene iniciada");
  }

  update(deltaTime: number): void {
    this.updateDebugMode();
    this.syncVillageLayout();
    this.world.update(deltaTime);

    const construction = this.villageProgression.getState().construction;
    if (construction && this.constructionSite) {
      this.constructionSite.syncProgress(construction.elapsedSeconds);
    }

    this.camera.follow(this.player.x, this.player.y, 32, 64);

    this.interactionSystem.tryInteract(this.player, this.interactables);

    this.sceneTransitionSystem.update([this.player]);
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
