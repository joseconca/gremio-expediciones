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
import { CollisionSystem } from "../systems/CollisionSystem";
import { CollisionMap } from "../world/CollisionMap";
import { baseCollision } from "../data/baseCollision";
import { Collider } from "../entities/Collider";
import { Building } from "../entities/Building";
import { townHallDefinition } from "../data/buildings/townHall";
import { InteractionSystem } from "../systems/InteractionSystem";
import { Door } from "../entities/Door";
import { genericDoorDefinition } from "../data/doors/genericDoor1";
import type { Interactable } from "../entities/Interactable";

export class BaseScene extends Scene {
  private world: World;
  private camera: Camera;
  private player: Player;

  private collisionSystem: CollisionSystem;
  private movementSystem: MovementSystem;
  private interactionSystem: InteractionSystem;
  private interactables: Interactable[] = [];

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

    const townHall = new Building({
      x: 432,
      y: 704,

      definition: townHallDefinition,

      colliders: [
        new Collider({
          width: 36,
          height: 2,
          offsetX: 8,
          offsetY: -8,
        }),

        new Collider({
          width: 36,
          height: 2,
          offsetX: 84,
          offsetY: -8,
        }),

        new Collider({
          width: 128,
          height: 8,
          offsetX: 8,
          offsetY: -48,
        }),

        new Collider({
          width: 2,
          height: 64,
          offsetX: 20,
          offsetY: -64,
        }),

        new Collider({
          width: 2,
          height: 64,
          offsetX: 110,
          offsetY: -64,
        }),
      ],
    });
    this.world.addObject(townHall);
    this.collisionSystem.addObject(townHall);
    const townHallDoor = new Door({
      x: 496,
      y: 704,
      definition: genericDoorDefinition,
    });
    this.world.addObject(townHallDoor);
    this.collisionSystem.addObject(townHallDoor);
    this.interactables.push(townHallDoor);

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

    heroAnimator.play("idle-down");

    this.player = new Player({
      x: 464,
      y: 688,
      speed: 60,
      direction: "down",
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
  }

  init(): void {
    console.log("BaseScene iniciada");
  }

  update(deltaTime: number): void {
    this.world.update(deltaTime);

    this.camera.follow(this.player.x, this.player.y, 32, 64);

    this.interactionSystem.tryInteract(this.player, this.interactables);
  }

  render(): void {
    this.ctx.fillStyle = "#111";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.world.render(this.ctx, this.camera);
  }

  destroy(): void {}
}
