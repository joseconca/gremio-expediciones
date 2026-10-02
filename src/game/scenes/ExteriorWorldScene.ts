import { Scene, type SceneConfig } from "./Scene";
import { Player } from "../entities/Characters/Player";
import { CampBuilding } from "../entities/Characters/CampBuilding";
import { WorldBaseMarker } from "../entities/WorldBaseMarker";
import { OverworldMonster } from "../entities/Characters/OverworldMonster";
import type { Interactable } from "../entities/Interactable";
import { SpriteSheet } from "../rendering/SpriteSheet";
import { Animator } from "../rendering/Animator";
import { MovementSystem } from "../systems/MovementSystem";
import { CollisionSystem } from "../systems/CollisionSystem";
import { InteractionSystem } from "../systems/InteractionSystem";
import { EncounterSystem } from "../systems/EncounterSystem";
import { World } from "../world/World";
import { Camera } from "../world/Camera";
import { TileMap } from "../world/TileMap";
import { CollisionMap } from "../world/CollisionMap";
import { exteriorCollision, exteriorMap } from "../data/world/exteriorMap";
import { RealWorldGroundRenderer } from "../rendering/RealWorldGroundRenderer";
import { campBuildingDefinition } from "../data/buildings/campBuilding";
import { heroAnimations } from "../data/heroAnimations";
import { campReturnDialogue } from "../data/dialogues/camp";
import { OVERWORLD_ENEMIES } from "../data/enemies/overworldEnemies";
import { createNoticeDialogue } from "../data/dialogues/notice";
import { LightingSystem } from "../lighting/LightingSystem";
import { ReturnCart } from "../entities/ReturnCart";
import {
  geographicToWorldPoint,
  isInsideWorldMap,
  WORLD_MAP_SIZE_PIXELS,
  type WorldBaseLocation,
  type WorldPoint,
} from "../world/WorldLocation";

export interface ExteriorWorldSceneConfig extends SceneConfig {
  selectedBase: WorldBaseLocation;
  otherBases: WorldBaseLocation[];
}

const CARDINAL_ARRIVAL_OFFSET = 32;
const INITIAL_WORLD_OFFSET = 32;

export class ExteriorWorldScene extends Scene {
  private readonly world: World;
  private readonly camera: Camera;
  private readonly collisionSystem: CollisionSystem;
  private readonly player: Player;
  private readonly interactionSystem: InteractionSystem;
  private readonly interactables: Interactable[] = [];
  private readonly homePoint: WorldPoint;
  private readonly basePoint: WorldBaseLocation;
  private readonly campBuilding: CampBuilding;
  private readonly encounterSystem: EncounterSystem;
  private cart: ReturnCart | null = null;

  constructor(config: ExteriorWorldSceneConfig) {
    super(config);
    this.basePoint = config.selectedBase;
    this.homePoint = geographicToWorldPoint(config.selectedBase, config.selectedBase);

    const tileMap = new TileMap(exteriorMap);
    const collisionMap = new CollisionMap(exteriorCollision);
    this.world = new World({
      width: WORLD_MAP_SIZE_PIXELS,
      height: WORLD_MAP_SIZE_PIXELS,
      tileMap,
      collisionMap,
      renderMarginTiles: 12,
      groundSurfaceRenderer: new RealWorldGroundRenderer(config.selectedBase),
      lighting: new LightingSystem({ dayNight: this.dayNightSystem }),
    });
    this.collisionSystem = new CollisionSystem(collisionMap);
    this.interactionSystem = new InteractionSystem(this.input);
    this.camera = new Camera({ width: this.canvas.width, height: this.canvas.height });

    const start = this.getSpawnPoint(config.spawnId);
    const heroSheet = new SpriteSheet({
      src: "/sprites/sheets/characters/hero.png",
      frameWidth: 32,
      frameHeight: 64,
    });
    const heroAnimator = new Animator(heroSheet, heroAnimations);
    heroAnimator.play(`idle-${start.direction}`);
    this.player = new Player({
      x: start.x,
      y: start.y,
      speed: 60,
      direction: start.direction,
      input: this.input,
      animator: heroAnimator,
      movement: new MovementSystem(this.collisionSystem),
      attributes: this.playerProgression.getState().attributes,
    });
    this.world.addObject(this.player);
    this.collisionSystem.addObject(this.player);
    if (this.initialLocation && !this.mobilityManager?.getSnapshot().journey &&
      !this.collisionSystem.canOccupy(this.player, this.player.x, this.player.y)) {
      this.player.x = this.homePoint.x;
      this.player.y = this.homePoint.y + INITIAL_WORLD_OFFSET;
    }

    this.campBuilding = new CampBuilding({
      x: this.homePoint.x - campBuildingDefinition.width / 2,
      y: this.homePoint.y,
      definition: campBuildingDefinition,
      dialogue: campReturnDialogue,
      dialogueManager: this.dialogueManager,
      onChoice: (eventId) => {
        if (eventId === "return-to-camp") {
          this.dialogueManager.close();
          this.sceneManager.changeScene("base", "world-base-arrival");
        }
      },
    });
    this.world.addObject(this.campBuilding);
    this.interactables.push(this.campBuilding);

    const monsters = this.createOverworldMonsters(collisionMap);
    for (const monster of monsters) this.world.addObject(monster);
    this.encounterSystem = new EncounterSystem(
      this.player,
      monsters,
      this.combatManager
    );

    for (const otherBase of config.otherBases) {
      const point = geographicToWorldPoint(otherBase, config.selectedBase);
      if (!isInsideWorldMap(point)) continue;

      const marker = new WorldBaseMarker({
        x: point.x,
        y: point.y,
        name: otherBase.name,
        onEnter: () => this.requestBaseVisit(otherBase),
      });
      this.world.addObject(marker);
      this.interactables.push(marker);
    }

  }

  private requestBaseVisit(base: WorldBaseLocation): void {
    const notice = (text: string) =>
      this.dialogueManager.start(createNoticeDialogue(base.name, text));

    if (!this.villageProgression.hasBuilding("embassy")) {
      notice("Necesitas una Embajada en tu base para visitar otros gremios.");
      return;
    }
    const latestBase = this.partyManager.getSnapshot().nearbyBases.find((other) => other.playerId === base.id);
    if (!(latestBase?.hasEmbassy ?? base.hasEmbassy)) {
      notice("Este gremio todavía no tiene Embajada, así que no recibe visitas.");
      return;
    }

    notice(
      "Ambas Embajadas permiten la visita. Entrar en bases ajenas llegará cuando exista su escena de visita."
    );
  }

  protected getSpawnPoint(spawnId?: string) {
    if (this.initialLocation) {
      const saved = this.initialLocation;
      return { id: "resume", x: saved.x, y: saved.y, direction: saved.direction };
    }
    if (!spawnId || spawnId === "from-base") {
      return {
        id: "from-base",
        x: this.homePoint.x,
        y: this.homePoint.y + INITIAL_WORLD_OFFSET,
        direction: "up" as const,
      };
    }

    if (spawnId === "from-north") {
      return { id: spawnId, x: this.homePoint.x, y: this.homePoint.y - CARDINAL_ARRIVAL_OFFSET, direction: "down" as const };
    }
    if (spawnId === "from-south") {
      return { id: spawnId, x: this.homePoint.x, y: this.homePoint.y + CARDINAL_ARRIVAL_OFFSET, direction: "up" as const };
    }
    if (spawnId === "from-east") {
      return { id: spawnId, x: this.homePoint.x + CARDINAL_ARRIVAL_OFFSET, y: this.homePoint.y, direction: "left" as const };
    }
    if (spawnId === "from-west") {
      return { id: spawnId, x: this.homePoint.x - CARDINAL_ARRIVAL_OFFSET, y: this.homePoint.y, direction: "right" as const };
    }

    throw new Error(`SpawnPoint "${spawnId}" no encontrado en ExteriorWorldScene`);
  }

  init(): void {}

  override getPlayerLocation() {
    return { x: this.player.x, y: this.player.y, direction: this.player.direction };
  }

  private createOverworldMonsters(collisionMap: CollisionMap): OverworldMonster[] {
    const seedText = `${this.basePoint.lat.toFixed(5)}:${this.basePoint.lng.toFixed(5)}`;
    let seed = 2166136261;
    for (let index = 0; index < seedText.length; index++) {
      seed = Math.imul(seed ^ seedText.charCodeAt(index), 16777619);
    }
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 0x100000000;
    };

    const monsters: OverworldMonster[] = [];
    const count = 6;
    for (let index = 0; index < count; index++) {
      const angle = ((index + random() * 0.7) / count) * Math.PI * 2;
      const radius = 180 + random() * 320;
      const x = this.homePoint.x + Math.cos(angle) * radius;
      const y = this.homePoint.y + Math.sin(angle) * radius;
      const definition = OVERWORLD_ENEMIES[
        Math.floor(random() * OVERWORLD_ENEMIES.length)
      ];
      const monster = new OverworldMonster({ x, y, definition });
      const dx = x - this.homePoint.x;
      const dy = y - this.homePoint.y;

      if (
        Math.hypot(dx, dy) < 160 ||
        collisionMap.isBlockedRect(x - 10, y - 12, 20, 12)
      ) {
        continue;
      }
      monsters.push(monster);
    }

    return monsters;
  }

  update(deltaTime: number): void {
    this.updateDebugMode();
    const dialogueWasActive = this.dialogueManager.isActive();
    const combatWasActive = this.combatManager.isEncounterOpen();
    const journey = this.mobilityManager?.getSnapshot().journey;
    this.player.setInputEnabled(!dialogueWasActive && !combatWasActive && !journey && !this.input.isBlocked());

    if (!dialogueWasActive && !combatWasActive && !journey && !this.input.isBlocked()) {
      this.interactionSystem.tryInteract(this.player, this.interactables);
      this.player.setInputEnabled(
        !this.dialogueManager.isActive() && !this.combatManager.isEncounterOpen()
      );
    }

    if (journey) {
      if (!this.cart) {
        this.world.removeObject(this.player);
        this.collisionSystem.removeObject(this.player);
        this.cart = new ReturnCart({ x: journey.fromX + 14, y: journey.fromY + 56 });
        this.world.addObject(this.cart);
      }
      const point = this.mobilityManager?.getJourneyPosition();
      if (point) {
        this.cart.x = point.x + 14;
        this.cart.y = point.y + 56;
        this.cart.setTravelDirection(journey.toX - journey.fromX, journey.toY - journey.fromY, point.progress < 1);
        this.player.x = point.x;
        this.player.y = point.y;
      }
    }
    this.world.update(deltaTime);
    if (!journey && !this.dialogueManager.isActive() && !this.input.isBlocked()) this.encounterSystem.update();
    this.camera.follow(this.player.x, this.player.y, 32, 64);

    if (dialogueWasActive && !journey) {
      if (this.input.wasDirectionPressed("up")) {
        this.dialogueManager.moveSelection(-1);
      } else if (this.input.wasDirectionPressed("down")) {
        this.dialogueManager.moveSelection(1);
      }

      if (this.input.isActionPressed("actionA")) {
        if (this.dialogueManager.getCurrentNode()?.choices?.length) {
          const choice = this.dialogueManager.selectChoice();
          if (choice?.eventId) this.campBuilding.handleChoice(choice.eventId);
        } else {
          this.dialogueManager.advance();
        }
      } else if (this.input.isActionPressed("actionB")) {
        this.dialogueManager.close();
      }
    }
  }

  render(): void {
    this.ctx.fillStyle = "#101a17";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const anchor = this.player.getGroundAnchor();
    const reference = {
      worldX: anchor.x,
      worldY: anchor.y,
      screenX: this.canvas.width / 2,
      screenY: this.canvas.height * 0.68,
    };
    this.world.render(this.ctx, this.camera, reference);

    if (this.debugMode) {
      this.world.renderDebug(this.ctx, reference);
      this.ctx.save();
      this.ctx.fillStyle = "#f8fafc";
      this.ctx.font = "bold 10px monospace";
      this.ctx.textBaseline = "top";
      this.ctx.fillText(`MAPA EXTERIOR · BASE ${this.basePoint.name}`, 6, 6);
      this.ctx.restore();
    }

    this.ctx.save();
    this.ctx.font = "9px sans-serif";
    this.ctx.textAlign = "right";
    this.ctx.textBaseline = "bottom";
    this.ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
    this.ctx.fillRect(4, this.canvas.height - 20, this.canvas.width - 8, 16);
    this.ctx.fillStyle = "#f8fafc";
    this.ctx.fillText(
      "© OpenStreetMap contributors",
      this.canvas.width - 8,
      this.canvas.height - 7
    );
    this.ctx.restore();
  }

  destroy(): void {}
}
