import { InteriorScene, type InteriorSceneConfig } from "./InteriorScene";
import { createEmbajadorDialogue } from "../data/dialogues/embajador";
import { embassyInteriorMap } from "../data/interiors/embassy/embassyInteriorMap";
import { embassyInteriorCollision } from "../data/interiors/embassy/embassyInteriorCollision";
import { createNoticeDialogue } from "../data/dialogues/notice";

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
      tileMap: embassyInteriorMap,
      collisionMap: embassyInteriorCollision,
      exitSpawnId: "embassy-exit",
      entranceSpawn: {
        id: "embassy-entrance",
        x: 64,
        y: 100,
        direction: "up",
      },
      exitPosition: { x: 64, y: 156, width: 32, height: 2 },
      npc: {
        x: 80,
        y: 16,
        spriteSrc: "/sprites/sheets/characters/embajador.png",
        dialogue: () => createEmbajadorDialogue(config.partyManager.getSnapshot()),
        onChoice: (eventId) => {
          const [action, argument] = eventId.split(":");
          const pendingDialogue = config.dialogueManager.getState().dialogue;
          const operation = action === "party-invite"
            ? config.partyManager.invite(argument)
            : action === "party-accept" || action === "party-reject"
              ? config.partyManager.respond(argument, action === "party-accept")
              : action === "party-leave" ? config.partyManager.leave() : null;
          if (!operation) return;
          const success: Record<string, string> = {
            "party-invite": "Invitación enviada. Verás al compañero cuando la acepte.",
            "party-accept": "Te has unido a la party.",
            "party-reject": "Has rechazado la invitación.",
            "party-leave": "Has abandonado la party.",
          };
          void operation.then((result) => {
            // Never reopen a dialog the player has already closed or replaced.
            if (config.dialogueManager.getState().dialogue !== pendingDialogue) return;
            config.dialogueManager.start(createNoticeDialogue("Embajador", result.ok ? success[action] : result.message));
          }).catch(() => {
            if (config.dialogueManager.getState().dialogue === pendingDialogue) {
              config.dialogueManager.start(createNoticeDialogue("Embajador", "Sin conexión. No se pudo completar la acción."));
            }
          });
        },
      },
    });
  }
}
