import { InteriorScene, type InteriorSceneConfig } from "./InteriorScene";
import { createTaberneroDialogue } from "../data/dialogues/tabernero";
import { tavernInteriorMap } from "../data/interiors/tavern/tavernInteriorMap";
import { tavernInteriorCollision } from "../data/interiors/tavern/tavernInteriorCollision";
import { TavernService } from "../gameplay/TavernService";

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
        x: 80,
        y: 16,
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
    });
  }
}
