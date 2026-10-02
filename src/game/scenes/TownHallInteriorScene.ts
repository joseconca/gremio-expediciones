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
              armory: config.villageProgression.getAvailableConstructionPositions("armory"),
              smithy: config.villageProgression.getAvailableConstructionPositions("smithy"),
            }
          ),
        onChoice: (eventId) => {
          if (eventId === "upgrade-town-hall") {
            config.villageProgression.upgradeTownHall();
            return;
          }

          if (eventId.startsWith("build:")) {
            const [, type, position] = eventId.split(":");
            if (type === "smithy") {
              const pendingDialogue = { id: "smithy-order-pending", nodes: [{
                id: "pending", speaker: "Alcalde",
                text: "Estoy comprobando que la Armería terminada esté guardada antes de autorizar su ampliación…",
                nextNodeId: null,
              }] };
              config.dialogueManager.start(pendingDialogue);
              void config.partyManager.flush().then((saved) => {
                const started = saved && config.villageProgression.startConstruction("smithy", Number(position));
                if (config.dialogueManager.getState().dialogue !== pendingDialogue) return;
                config.dialogueManager.start({ id: "smithy-order-result", nodes: [{
                  id: "result", speaker: "Alcalde", nextNodeId: null,
                  text: started ? "La ampliación de la Herrería ha empezado junto a la Armería. Estará lista en 60 segundos activos."
                    : config.partyManager.getSnapshot().syncMessage ?? "No se pudo autorizar la ampliación. Comprueba el guardado y vuelve a hablar conmigo.",
                }] });
              }).catch(() => {
                if (config.dialogueManager.getState().dialogue !== pendingDialogue) return;
                config.dialogueManager.start({ id: "smithy-order-error", nodes: [{ id: "error", speaker: "Alcalde",
                  text: "No se pudo confirmar el guardado. La obra no ha comenzado; vuelve a intentarlo.", nextNodeId: null }] });
              });
            } else if (type === "tavern" || type === "embassy" || type === "armory") {
              config.villageProgression.startConstruction(type, Number(position));
            }
          }
        },
      },
    });
  }
}
