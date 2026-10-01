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

import { Collider } from "../entities/Collider";
import { Building } from "../entities/Building";
import { Campfire } from "../entities/Campfire";
import { ResourceCart } from "../entities/ResourceCart";
import { Door } from "../entities/Door";
import type { Interactable } from "../entities/Interactable";
import { SceneTransition } from "../entities/SceneTransition";
import { Player } from "../entities/Characters/Player";

import { townHallDefinitions } from "../data/buildings/townHall";
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
    const townHallColliders =
      townHallLevel === 1
        ? [
            
            new Collider({ width: 72, height: 1, offsetX: 23, offsetY: -48 }),
            new Collider({ width: 1, height: 50, offsetX: 23, offsetY: -48 }),
            new Collider({ width: 1, height: 50, offsetX: 95, offsetY: -48 }),
          ]
        : [
            new Collider({ width: 36, height: 2, offsetX: 8, offsetY: -8 }),
            new Collider({ width: 36, height: 2, offsetX: 84, offsetY: -8 }),
            new Collider({ width: 128, height: 8, offsetX: 8, offsetY: -48 }),
            new Collider({ width: 2, height: 64, offsetX: 20, offsetY: -64 }),
            new Collider({ width: 2, height: 64, offsetX: 110, offsetY: -64 }),
          ];

    const townHall = new Building({
      x: 432,
      y: 704,
      definition: townHallDefinitions[townHallLevel],
      colliders: townHallColliders,
    });
    this.world.addObject(townHall);
    this.collisionSystem.addObject(townHall);

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
      colliders: [
        new Collider({
          width: 12,
          height: 6,
          offsetX: 8,
          offsetY: 50,
        }),
      ],
    });
    this.world.addObject(this.player);
    this.collisionSystem.addObject(this.player);
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
    this.world.update(deltaTime);

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
