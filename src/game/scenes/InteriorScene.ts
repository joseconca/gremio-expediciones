import { Scene, type SceneConfig } from "./Scene";
import { Player } from "../entities/Characters/Player";
import { NPC } from "../entities/Characters/NPC";
import { SceneTransition } from "../entities/SceneTransition";
import { SpriteSheet } from "../rendering/SpriteSheet";
import { Animator } from "../rendering/Animator";
import { MovementSystem } from "../systems/MovementSystem";
import { CollisionSystem } from "../systems/CollisionSystem";
import { SceneTransitionSystem } from "../systems/SceneTransitionSystem";
import { InteractionSystem } from "../systems/InteractionSystem";
import { World } from "../world/World";
import { Camera } from "../world/Camera";
import { TileMap, type TileMapConfig } from "../world/TileMap";
import { CollisionMap, type CollisionMapConfig } from "../world/CollisionMap";
import type { SpawnPoint } from "../world/SpawnPoint";
import type { Dialogue } from "../dialogue/Dialogue";
import { heroAnimations } from "../data/heroAnimations";
import { LightingSystem } from "../lighting/LightingSystem";

export interface InteriorSceneConfig extends SceneConfig {
  tileMap: TileMapConfig;
  collisionMap: CollisionMapConfig;
  exitSpawnId: string;
  entranceSpawn: SpawnPoint;
  exitPosition: { x: number; y: number; width: number; height: number };
  npc: {
    x: number;
    y: number;
    spriteSrc: string;
    dialogue: Dialogue | (() => Dialogue);
    onChoice?: (eventId: string) => void;
  };
}

/** Shared simulation/render/input infrastructure for compact building interiors. */
export class InteriorScene extends Scene {
  private readonly world: World;
  private readonly camera: Camera;
  private readonly player: Player;
  private readonly interactionSystem: InteractionSystem;
  private readonly interactables: NPC[] = [];
  private readonly sceneTransitionSystem = new SceneTransitionSystem();
  private readonly debugTeleporters: SceneTransition[] = [];
  private readonly onNpcChoice?: (eventId: string) => void;
  private readonly entranceSpawn: SpawnPoint;

  constructor(config: InteriorSceneConfig) {
    super(config);
    this.onNpcChoice = config.npc.onChoice;
    this.entranceSpawn = config.entranceSpawn;

    const tileMap = new TileMap(config.tileMap);
    const collisionMap = new CollisionMap(config.collisionMap);
    this.world = new World({
      width: tileMap.width * tileMap.tileSize,
      height: tileMap.height * tileMap.tileSize,
      tileMap,
      collisionMap,
      lighting: new LightingSystem(),
    });

    const collisionSystem = new CollisionSystem(collisionMap);
    const movementSystem = new MovementSystem(collisionSystem);
    this.interactionSystem = new InteractionSystem(this.input);
    this.camera = new Camera({ width: this.canvas.width, height: this.canvas.height });

    const spawn = this.getSpawnPoint(config.spawnId);
    const playerSprite = new SpriteSheet({
      src: "/sprites/sheets/characters/hero.png",
      frameWidth: 32,
      frameHeight: 64,
    });
    const playerAnimator = new Animator(playerSprite, heroAnimations);
    playerAnimator.play(`idle-${spawn.direction}`);
    this.player = new Player({
      x: spawn.x,
      y: spawn.y,
      speed: 60,
      direction: spawn.direction,
      input: this.input,
      animator: playerAnimator,
      movement: movementSystem,
      attributes: this.playerProgression.getState().attributes,
    });
    this.world.addObject(this.player);
    collisionSystem.addObject(this.player);

    const npcSprite = new SpriteSheet({
      src: config.npc.spriteSrc,
      frameWidth: 32,
      frameHeight: 64,
    });
    const npcAnimator = new Animator(npcSprite, heroAnimations);
    npcAnimator.play("idle-down");
    const npc = new NPC({
      x: config.npc.x,
      y: config.npc.y,
      speed: 0,
      direction: "down",
      animator: npcAnimator,
      dialogue: config.npc.dialogue,
      dialogueManager: this.dialogueManager,
      interaction: { offsetX: 0, offsetY: 0, radius: 44 },
    });
    this.world.addObject(npc);
    collisionSystem.addObject(npc);
    this.interactables.push(npc);

    const exit = new SceneTransition({
      ...config.exitPosition,
      targetSceneId: "base",
      targetSpawnId: config.exitSpawnId,
      sceneManager: this.sceneManager,
    });
    this.sceneTransitionSystem.addTransition(exit);
    this.debugTeleporters.push(exit);
  }

  protected getSpawnPoint(spawnId?: string): SpawnPoint {
    if (spawnId && spawnId !== this.entranceSpawn.id) {
      throw new Error(`SpawnPoint "${spawnId}" no encontrado en interior`);
    }

    return this.entranceSpawn;
  }

  init(): void {}

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
          if (choice?.eventId) {
            this.onNpcChoice?.(choice.eventId);
            this.player.attributes = this.playerProgression.getState().attributes;
          }
        } else {
          this.dialogueManager.advance();
        }
      } else if (this.input.isActionPressed("actionB")) {
        this.dialogueManager.close();
      }
    }

    if (!dialogueWasActive && !this.dialogueManager.isActive() && !this.input.isBlocked()) {
      this.sceneTransitionSystem.update([this.player]);
    }
  }

  render(): void {
    this.ctx.fillStyle = "#111";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const playerAnchor = this.player.getGroundAnchor();
    this.world.render(this.ctx, this.camera, {
      worldX: playerAnchor.x,
      worldY: playerAnchor.y,
      screenX: this.canvas.width / 2,
      screenY: this.canvas.height * 0.72,
    });

    if (this.debugMode) {
      this.world.renderDebug(
        this.ctx,
        {
          worldX: playerAnchor.x,
          worldY: playerAnchor.y,
          screenX: this.canvas.width / 2,
          screenY: this.canvas.height * 0.72,
        },
        this.debugTeleporters
      );
    }
  }

  destroy(): void {}
}
