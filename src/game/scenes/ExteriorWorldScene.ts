import { Scene, type SceneConfig } from "./Scene";
import { Player } from "../entities/Characters/Player";
import { CampBuilding } from "../entities/Characters/CampBuilding";
import { WorldBaseMarker } from "../entities/WorldBaseMarker";
import { OverworldMonster } from "../entities/Characters/OverworldMonster";
import { RemotePlayer } from "../entities/Characters/RemotePlayer";
import type { Interactable } from "../entities/Interactable";
import { SpriteSheet } from "../rendering/SpriteSheet";
import { Animator } from "../rendering/Animator";
import { MovementSystem } from "../systems/MovementSystem";
import { CollisionSystem } from "../systems/CollisionSystem";
import { InteractionSystem } from "../systems/InteractionSystem";
import { EncounterSystem } from "../systems/EncounterSystem";
import { OverworldEncounterSpawner } from "../systems/OverworldEncounterSpawner";
import { World } from "../world/World";
import { Camera } from "../world/Camera";
import { TileMap } from "../world/TileMap";
import { CollisionMap } from "../world/CollisionMap";
import { exteriorCollision, exteriorMap } from "../data/world/exteriorMap";
import { RealWorldGroundRenderer } from "../rendering/RealWorldGroundRenderer";
import { campBuildingDefinition } from "../data/buildings/campBuilding";
import { heroAnimations } from "../data/heroAnimations";
import { campReturnDialogue } from "../data/dialogues/camp";
import { createNoticeDialogue } from "../data/dialogues/notice";
import { LightingSystem } from "../lighting/LightingSystem";
import { ReturnCart } from "../entities/ReturnCart";
import { expeditionPosition } from "../../shared/expeditions";
import { worldPositionToGeographic } from "../../shared/worldPosition";
import {
  geographicToWorldPoint,
  isInsideWorldMap,
  WORLD_MAP_SIZE_PIXELS,
  type WorldBaseLocation,
  type WorldPoint,
} from "../world/WorldLocation";
import type { NearbyWorldPlayerDto } from "../../shared/world";

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
  private readonly encounterMonsters: OverworldMonster[] = [];
  private readonly encounterSpawner: OverworldEncounterSpawner;
  private readonly remotePlayers = new Map<string, RemotePlayer>();
  private lastRemotePresence: readonly NearbyWorldPlayerDto[] | null = null;
  private cart: ReturnCart | null = null;
  private expeditionCart: ReturnCart | null = null;

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
      speed: 100,
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

    this.encounterSpawner = new OverworldEncounterSpawner(collisionMap, this.encounterMonsters,
      `${this.basePoint.lat}:${this.basePoint.lng}:${start.x}:${start.y}:${Date.now()}`,
      () => this.playerProgression.getState().characterLevel);
    const initialFeet = this.player.getGroundAnchor();
    const initialEncounters = this.encounterSpawner.update(2, {
      x: initialFeet.x, y: initialFeet.y, level: this.playerProgression.getState().characterLevel,
      partySize: this.partyManager.getSnapshot().companions.length + 1,
    });
    for (const monster of initialEncounters.added) this.world.addObject(monster);
    this.encounterSystem = new EncounterSystem(
      this.player,
      this.encounterMonsters,
      this.worldCombatManager,
      (monster) => this.worldCombatManager.startEncounter(
        worldPositionToGeographic({ x: monster.x, y: monster.y }, this.basePoint)),
      (monster) => monster.markDefeated()
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

  private syncRemotePlayers(): void {
    const presence = this.partyManager.getSnapshot().nearbyWorldPlayers;
    if (presence === this.lastRemotePresence) return;
    this.lastRemotePresence = presence;
    const seen = new Set<string>();
    for (const remote of presence) {
      const point = geographicToWorldPoint(remote, this.basePoint);
      if (!isInsideWorldMap(point)) continue;
      seen.add(remote.playerId);
      let entity = this.remotePlayers.get(remote.playerId);
      if (!entity) {
        const sheet = new SpriteSheet({ src: "/sprites/sheets/characters/hero.png", frameWidth: 32, frameHeight: 64 });
        const animator = new Animator(sheet, heroAnimations);
        animator.play(`idle-${remote.direction}`);
        entity = new RemotePlayer({ x: point.x, y: point.y, direction: remote.direction, animator,
          playerId: remote.playerId, displayName: remote.displayName, observedAt: remote.lastSeenAt });
        this.remotePlayers.set(remote.playerId, entity);
        this.world.addObject(entity);
      } else {
        entity.receivePosition(point.x, point.y, remote.direction, remote.lastSeenAt);
      }
    }
    for (const [playerId, entity] of this.remotePlayers) {
      if (seen.has(playerId)) continue;
      this.world.removeObject(entity);
      this.remotePlayers.delete(playerId);
    }
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

  update(deltaTime: number): void {
    this.updateDebugMode();
    const dialogueWasActive = this.dialogueManager.isActive();
    const combatWasActive = this.combatManager.isEncounterOpen() || this.worldCombatManager.isBusyOrActive();
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
    this.syncRemotePlayers();
    if (!journey && !this.mobilityManager?.getSnapshot().travelPending && !this.expeditionManager?.blocksPlayer() &&
      !this.combatManager.isEncounterOpen() && !this.worldCombatManager.isBusyOrActive()) {
      const feet = this.player.getGroundAnchor();
      const encounters = this.encounterSpawner.update(deltaTime, {
        x: feet.x, y: feet.y, level: this.playerProgression.getState().characterLevel,
        partySize: this.partyManager.getSnapshot().companions.length + 1,
      });
      for (const monster of encounters.removed) this.world.removeObject(monster);
      for (const monster of encounters.added) this.world.addObject(monster);
    }
    this.world.update(deltaTime);
    const missionState = this.expeditionManager?.getSnapshot().data;
    const expedition = missionState?.active;
    if (expedition && expedition.phase !== "completed" && missionState) {
      if (!this.expeditionCart) {
        this.expeditionCart = new ReturnCart({ x: this.homePoint.x, y: this.homePoint.y });
        this.world.addObject(this.expeditionCart);
      }
      const position = expeditionPosition(expedition, this.expeditionManager!.serverNow());
      const point = geographicToWorldPoint(position, this.basePoint);
      const previousX = this.expeditionCart.x;
      const previousY = this.expeditionCart.y;
      this.expeditionCart.x = point.x;
      this.expeditionCart.y = point.y;
      this.expeditionCart.setTravelDirection(point.x - previousX, point.y - previousY, expedition.phase !== "battle");
    } else if (this.expeditionCart) {
      this.world.removeObject(this.expeditionCart);
      this.expeditionCart = null;
    }
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
