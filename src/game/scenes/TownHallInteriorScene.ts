import { Scene, SceneConfig } from "./Scene";
import { Player } from "../entities/Characters/Player";
import { SpriteSheet } from "../rendering/SpriteSheet";
import { Animator } from "../rendering/Animator";
import { heroAnimations } from "../data/heroAnimations";
import { Collider } from "../entities/Collider";
import { SpawnPoint } from "../world/SpawnPoint";
import { MovementSystem } from "../systems/MovementSystem";
import { CollisionSystem } from "../systems/CollisionSystem";
import { CollisionMap } from "../world/CollisionMap";

export class TownHallInteriorScene extends Scene {
  private readonly spawnPoints: SpawnPoint[] = [
    {
      id: "main-entrance",
      x: 256,
      y: 400,
      direction: "down",
    },
  ];

  private player: Player;
  private movementSystem: MovementSystem;
  private collisionSystem: CollisionSystem;

  constructor(config: SceneConfig) {
    super(config);

    const spawn = this.getSpawnPoint(config.spawnId);

    const collisionMap = new CollisionMap({
      width: 32,
      height: 24,
      tileSize: 32,
      tiles: Array.from({ length: 24 }, (_, y) =>
        Array.from({ length: 32 }, (_, x) =>
          x === 0 || y === 0 || x === 31 || y === 23 ? 1 : 0
        )
      ),
    });

    this.collisionSystem = new CollisionSystem(collisionMap);

    this.movementSystem = new MovementSystem(this.collisionSystem);

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

    this.collisionSystem.addObject(this.player);
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
    this.player.update(deltaTime);
  }

  render(): void {
    this.ctx.fillStyle = "#222";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.player.render(this.ctx, this.player.x, this.player.y);
  }

  destroy(): void {}
}
