import { InteriorScene, type InteriorSceneConfig } from "./InteriorScene";
import { createAlcaldeDialogue } from "../data/dialogues/alcalde";
import { townHallInteriorMap } from "../data/interiors/townHall/townHallInteriorMap";
import { townHallInteriorCollision } from "../data/interiors/townHall/townHallInteriorCollision";

export class TownHallInteriorScene extends InteriorScene {
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
      tileMap: townHallInteriorMap,
      collisionMap: townHallInteriorCollision,
      exitSpawnId: "town-hall-exit",
      entranceSpawn: {
        id: "main-entrance",
        x: 64,
        y: 48,
        direction: "down",
      },
      exitPosition: { x: 64, y: 128, width: 32, height: 24 },
      npc: {
        x: 80,
        y: 16,
        spriteSrc: "/sprites/sheets/characters/alcalde.png",
        dialogue: () =>
          createAlcaldeDialogue(
            config.villageProgression.getTownHallLevel(),
            {
              tavern:
                config.villageProgression.getAvailableConstructionPositions("tavern"),
              embassy:
                config.villageProgression.getAvailableConstructionPositions("embassy"),
            }
          ),
        onChoice: (eventId) => {
          if (eventId === "upgrade-town-hall") {
            config.villageProgression.upgradeTownHall();
            return;
          }

          if (eventId.startsWith("build:")) {
            const [, type, position] = eventId.split(":");
            if (type === "tavern" || type === "embassy") {
              config.villageProgression.startConstruction(type, Number(position));
            }
          }
        },
      },
    });
  }
}
