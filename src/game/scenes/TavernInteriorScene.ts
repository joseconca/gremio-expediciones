import { InteriorScene, type InteriorSceneConfig } from "./InteriorScene";
import { createTaberneroDialogue } from "../data/dialogues/tabernero";
import { tavernInteriorMap } from "../data/interiors/tavern/tavernInteriorMap";
import { tavernInteriorCollision } from "../data/interiors/tavern/tavernInteriorCollision";
import { TavernService } from "../gameplay/TavernService";
import { Prop } from "../entities/Prop";
import { getTavernProps } from "../data/interiors/tavern/tavernProps";

export class TavernInteriorScene extends InteriorScene {
  constructor(
    config: Omit<
      InteriorSceneConfig,
      | "tileMap"
      | "collisionMap"
      | "exitSpawnId"
      | "entranceSpawn"
      | "exitPosition"
      | "npc"
    >
  ) {
    const tavernService = new TavernService(
      config.villageProgression,
      config.playerProgression
    );

    // Obtener el nivel actual de la taberna (por defecto 1 si por algún motivo falla)
    const tavernLevel = config.villageProgression.getState().buildings.find(b => b.type === "tavern")?.level ?? 1;

    super({
      ...config,
      tileMap: tavernInteriorMap,
      collisionMap: tavernInteriorCollision,
      exitSpawnId: "tavern-exit",
      entranceSpawn: {
        id: "tavern-entrance",
        x: 64,
        y: 92,
        direction: "up",
      },
      exitPosition: { x: 64, y: 148, width: 32, height: 24 },
      npc: {
        x: 48,
        y: -16,
        spriteSrc: "/sprites/sheets/characters/tabernero.png",
        dialogue: () =>
          createTaberneroDialogue({
            canBuyWithGold: tavernService.canBuyWithGold(),
            canUseFood: tavernService.canUseFood(),
          }),
        onChoice: (eventId) => {
          if (eventId === "buy-tavern-meal") {
            tavernService.buyMealWithGold();
          } else if (eventId === "eat-food") {
            tavernService.useFood();
          }
        },
      },
      objects: getTavernProps(tavernLevel).map((propConfig) => new Prop(propConfig)),
    });
  }
}


