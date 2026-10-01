import { InteriorScene, type InteriorSceneConfig } from "./InteriorScene";
import { createTaberneroDialogue } from "../data/dialogues/tabernero";
import { tavernInteriorMap } from "../data/interiors/tavern/tavernInteriorMap";
import { tavernInteriorCollision } from "../data/interiors/tavern/tavernInteriorCollision";

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
    super({
      ...config,
      tileMap: tavernInteriorMap,
      collisionMap: tavernInteriorCollision,
      exitSpawnId: "town-hall-exit",
      entranceSpawn: {
        id: "tavern-entrance",
        x: 64,
        y: 48,
        direction: "down",
      },
      exitPosition: { x: 64, y: 128, width: 32, height: 24 },
      npc: {
        x: 80,
        y: 16,
        spriteSrc: "/sprites/sheets/characters/tabernero.png",
        dialogue: () =>
          createTaberneroDialogue({
            canBuyWithGold: config.playerProgression.canBuyMealWithGold(),
            canUseFood: config.playerProgression.canUseFoodToHeal(),
          }),
        onChoice: (eventId) => {
          if (eventId === "buy-tavern-meal") {
            config.playerProgression.buyMealWithGold();
          } else if (eventId === "eat-food") {
            config.playerProgression.useFoodToHeal();
          }
        },
      },
    });
  }
}
