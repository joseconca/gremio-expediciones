import { Scene, SceneConfig } from "./Scene";
import { Player } from "../entities/Player";
import { SpriteSheet } from "../rendering/SpriteSheet";
import { Animator } from "../rendering/Animator";
import { heroAnimations } from "../data/heroAnimations";
import { World } from "../world/World";
import { Camera } from "../world/Camera";
import { TileMap } from "../world/TileMap";
import { baseMap } from "../data/baseMap";
import { MovementSystem } from "../systems/MovementSystem";
import { CollisionMap } from "../world/CollisionMap";
import { baseCollision } from "../data/baseCollision";
import { Collider } from "../entities/Collider";
import { TownHall } from "../entities/TownHall";

export class BaseScene extends Scene {
  private world: World;
  private camera: Camera;
  private player: Player;

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
    
    const townHall = new TownHall({
      x: 432,
      y: 640,
      width: 96,
      height: 96,
    });

    this.world.addObject(townHall);

    const movement = new MovementSystem(this.world.collisionMap);

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

    heroAnimator.play("idle-down");

    this.player = new Player({
      x: 464,
      y: 688,
      speed: 60,
      direction: "down",
      input: this.input,
      animator: heroAnimator,
      movement,
      collider: new Collider({
        width: 16,
        height: 12,
        offsetX: 8,
        offsetY: 50,
      }),
    });

    this.world.addObject(this.player);
  }

  init(): void {
    console.log("BaseScene iniciada");
  }

  update(deltaTime: number): void {
    this.world.update(deltaTime);

    this.camera.follow(this.player.x, this.player.y, 32, 64);
  }

  render(): void {
    this.ctx.fillStyle = "#111";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.world.render(this.ctx, this.camera);
  }

  destroy(): void {}
}
