import { Scene, SceneConfig } from "./Scene";

import { Player } from "../entities/Characters/Player";
import { SceneTransition } from "../entities/SceneTransition";
import { NPC } from "../entities/Characters/NPC";

import { SpriteSheet } from "../rendering/SpriteSheet";
import { Animator } from "../rendering/Animator";

import { MovementSystem } from "../systems/MovementSystem";
import { CollisionSystem } from "../systems/CollisionSystem";
import { SceneTransitionSystem } from "../systems/SceneTransitionSystem";
import { InteractionSystem } from "../systems/InteractionSystem";

import { World } from "../world/World";
import { Camera } from "../world/Camera";
import { TileMap } from "../world/TileMap";
import { CollisionMap } from "../world/CollisionMap";
import { SpawnPoint } from "../world/SpawnPoint";

import { heroAnimations } from "../data/heroAnimations";
import { townHallInteriorMap } from "../data/interiors/townHall/townHallInteriorMap";
import { townHallInteriorCollision } from "../data/interiors/townHall/townHallInteriorCollision";
import { Interactable } from "../entities/Interactable";

import { createAlcaldeDialogue } from "../data/dialogues/alcalde";

export class TownHallInteriorScene extends Scene {
  private world: World;
  private camera: Camera;

  private player: Player;

  private collisionSystem: CollisionSystem;
  private movementSystem: MovementSystem;
  private interactionSystem: InteractionSystem;
  private interactables: Interactable[] = [];

  private sceneTransitionSystem: SceneTransitionSystem;
  private readonly debugTeleporters: SceneTransition[] = [];

  private readonly spawnPoints: SpawnPoint[] = [
    {
      id: "main-entrance",
      x: 32 * 5,
      y: 32 * 8,
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
    this.interactionSystem = new InteractionSystem(this.input);

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
    });
    this.world.addObject(this.player);
    this.collisionSystem.addObject(this.player);

    const npcSpriteSheet = new SpriteSheet({
      src: "/sprites/sheets/characters/hero.png",
      frameWidth: 32,
      frameHeight: 64,
    });
    const npcAnimator = new Animator(npcSpriteSheet, heroAnimations);
    npcAnimator.play("idle-down");
    const testNpc = new NPC({
      x: 160,
      y: 52,
      speed: 0,
      direction: "down",
      animator: npcAnimator,
      dialogue: createAlcaldeDialogue(
        this.villageProgression.getState().townHallLevel,
        this.villageProgression.getAvailableConstructionPositions()
      ),
      dialogueManager: this.dialogueManager,
      interaction: {
        offsetX: 0,
        offsetY: 0,
        radius: 40,
      },
    });
    this.world.addObject(testNpc);
    this.collisionSystem.addObject(testNpc);
    this.interactables.push(testNpc);

    const exitTransition = new SceneTransition({
      x: 32 * 5,
      y: 32 * 10,

      width: 32,
      height: 24,

      targetSceneId: "base",

      targetSpawnId: "town-hall-exit",

      sceneManager: this.sceneManager,
    });

    this.sceneTransitionSystem.addTransition(exitTransition);
    this.debugTeleporters.push(exitTransition);
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
    this.updateDebugMode();
    const dialogueWasActive = this.dialogueManager.isActive();

    this.player.setInputEnabled(!dialogueWasActive);

    if (!dialogueWasActive) {
      this.interactionSystem.tryInteract(this.player, this.interactables);
      this.player.setInputEnabled(!this.dialogueManager.isActive());
    }

    this.world.update(deltaTime);

    this.camera.follow(this.player.x, this.player.y, 32, 64);

    if (dialogueWasActive) {
      if (this.input.wasDirectionPressed("up")) {
        this.dialogueManager.moveSelection(-1);
      } else if (this.input.wasDirectionPressed("down")) {
        this.dialogueManager.moveSelection(1);
      }

      if (this.input.isActionPressed("actionA")) {
        if (this.dialogueManager.getCurrentNode()?.choices?.length) {
          const choice = this.dialogueManager.selectChoice();
          if (choice?.eventId === "upgrade-town-hall") {
            this.villageProgression.upgradeTownHall();
          } else if (choice?.eventId?.startsWith("build-tavern-position:")) {
            const position = Number(
              choice.eventId.slice("build-tavern-position:".length)
            );
            if (!this.villageProgression.startTavernConstruction(position)) {
              this.dialogueManager.close();
            }
          }
        } else {
          this.dialogueManager.advance();
        }
      } else if (this.input.isActionPressed("actionB")) {
        this.dialogueManager.close();
      }
    }

    if (!dialogueWasActive && !this.dialogueManager.isActive()) {
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
      screenY: this.canvas.height * 0.72,
    };

    this.world.render(this.ctx, this.camera, groundReference);

    if (this.debugMode) {
      this.world.renderDebug(this.ctx, groundReference, this.debugTeleporters);
    }
  }

  destroy(): void {}
}
