import { InteriorScene, type InteriorSceneConfig } from "./InteriorScene";
import { createEmbajadorDialogue } from "../data/dialogues/embajador";
import { tavernInteriorMap } from "../data/interiors/tavern/tavernInteriorMap";
import { tavernInteriorCollision } from "../data/interiors/tavern/tavernInteriorCollision";

/** Temporarily reuses the tavern interior layout until embassy art exists. */
export class EmbassyInteriorScene extends InteriorScene {
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
      exitSpawnId: "embassy-exit",
      entranceSpawn: {
        id: "embassy-entrance",
        x: 64,
        y: 48,
        direction: "down",
      },
      exitPosition: { x: 64, y: 128, width: 32, height: 24 },
      npc: {
        x: 80,
        y: 16,
        spriteSrc: "/sprites/sheets/characters/embajador.png",
        dialogue: () => createEmbajadorDialogue(config.partyManager.getSnapshot()),
        onChoice: (eventId) => {
          const [action, argument] = eventId.split(":");
          if (action === "party-invite") void config.partyManager.invite(argument);
          else if (action === "party-accept") {
            void config.partyManager.respond(argument, true);
          } else if (action === "party-leave") void config.partyManager.leave();
        },
      },
    });
  }
}
