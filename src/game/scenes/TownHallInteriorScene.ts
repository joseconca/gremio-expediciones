import { Scene, SceneConfig } from "./Scene";

import { Player } from "../entities/Characters/Player";
import { Collider } from "../entities/Collider";
import { SceneTransition } from "../entities/SceneTransition";

import { SpriteSheet } from "../rendering/SpriteSheet";
import { Animator } from "../rendering/Animator";

import { MovementSystem } from "../systems/MovementSystem";
import { CollisionSystem } from "../systems/CollisionSystem";
import { SceneTransitionSystem } from "../systems/SceneTransitionSystem";

import { World } from "../world/World";
import { Camera } from "../world/Camera";
import { TileMap } from "../world/TileMap";
import { CollisionMap } from "../world/CollisionMap";
import { SpawnPoint } from "../world/SpawnPoint";

import { heroAnimations } from "../data/heroAnimations";
import { townHallInteriorMap } from "../data/interiors/townHall/townHallInteriorMap";
import { townHallInteriorCollision } from "../data/interiors/townHall/townHallInteriorCollision";

export class TownHallInteriorScene extends Scene {
  private world: World;
  private camera: Camera;

  private player: Player;

  private collisionSystem: CollisionSystem;
  private movementSystem: MovementSystem;

  private sceneTransitionSystem: SceneTransitionSystem;

  private readonly spawnPoints: SpawnPoint[] = [
    {
      id: "main-entrance",
      x: 32*5,
      y: 32*8,
      direction: "down",
    },
  ];

  constructor(config: SceneConfig) {
    super(config);

    const tileMap = new TileMap(townHallInteriorMap);

    const collisionMap = new CollisionMap(townHallInteriorCollision);

    this.world = new World({
      width: townHallInteriorMap.width * townHallInteriorMap.tileSize,

      height: townHallInteriorMap.height * townHallInteriorMap.tileSize,

      tileMap,
      collisionMap,
    });

    this.collisionSystem = new CollisionSystem(this.world.collisionMap);

    this.movementSystem = new MovementSystem(this.collisionSystem);

    this.sceneTransitionSystem = new SceneTransitionSystem();

    this.camera = new Camera({
      width: this.canvas.width,
      height: this.canvas.height,
    });

    const spawn = this.getSpawnPoint(this.spawnId);

    const heroSpriteSheet = new SpriteSheet({
      src: "/sprites/sheets/characters/hero.png",
      frameWidth: 32,
      frameHeight: 64,
    });

    const heroAnimator = new Animator(heroSpriteSheet, heroAnimations);

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
          width: 16,
          height: 12,
          offsetX: 8,
          offsetY: 50,
        }),
      ],
    });

    this.world.addObject(this.player);

    this.collisionSystem.addObject(this.player);

    const exitTransition = new SceneTransition({
      x: 32*5,
      y: 32*10,

      width: 32,
      height: 24,

      targetSceneId: "base",

      targetSpawnId: "town-hall-exit",

      sceneManager: this.sceneManager,
    });

    this.sceneTransitionSystem.addTransition(exitTransition);
  }

  protected getSpawnPoint(spawnId?: string): SpawnPoint {
    const id = spawnId ?? "main-entrance";

    const spawnPoint = this.spawnPoints.find((point) => point.id === id);

    if (!spawnPoint) {
      throw new Error(
        `SpawnPoint "${id}" no encontrado en TownHallInteriorScene`
      );
    }

    return spawnPoint;
  }

  init(): void {
    console.log("TownHallInteriorScene iniciada");
  }

  update(deltaTime: number): void {
    this.world.update(deltaTime);

    this.camera.follow(this.player.x, this.player.y, 32, 64);

    this.sceneTransitionSystem.update([this.player]);
  }

  render(): void {
    this.ctx.fillStyle = "#111";

    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.world.render(this.ctx, this.camera);
  }

  destroy(): void {}
}
