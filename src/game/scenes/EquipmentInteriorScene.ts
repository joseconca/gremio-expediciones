import { InteriorScene } from "./InteriorScene";
import type { SceneConfig } from "./Scene";
import { createSmallInterior } from "../data/interiors/createSmallInterior";
import { tavernInteriorTileset } from "../data/interiors/tavern/tavernInteriorTileset";

/** Reuses existing floor art explicitly; no invented blacksmith/NPC assets. */
export class EquipmentInteriorScene extends InteriorScene {
  private readonly interior: ReturnType<typeof createSmallInterior>;
  private readonly passageColumn: number;
  private connected: boolean;

  constructor(config: SceneConfig, type: "armory" | "smithy") {
    const interior = createSmallInterior(tavernInteriorTileset);
    const connected = config.villageProgression.hasBuilding("smithy");
    const right = type === "armory";
    if (connected) {
      interior.collision.tiles[2][right ? 4 : 0] = 0;
      interior.map.layers[1].tiles[2][right ? 4 : 0] = -1;
    }
    const other = right ? "smithy" : "armory";
    super({
      ...config, tileMap: interior.map, collisionMap: interior.collision,
      entranceSpawn: { id: `${type}-entrance`, x: 64, y: 48, direction: "down" },
      exitSpawnId: `${type}-exit`, exitPosition: { x: 64, y: 128, width: 32, height: 24 },
      passages: [{
        x: right ? 136 : 0, y: 64, width: 24, height: 32,
        targetSceneId: `${other}-interior`, targetSpawnId: `${other}-passage`,
        spawn: { id: `${type}-passage`, x: right ? 100 : 28, y: 24, direction: right ? "left" : "right" },
        canActivate: () => config.villageProgression.hasBuilding("armory") && config.villageProgression.hasBuilding("smithy"),
      }],
      npc: {
        x: 64, y: 0, spriteSrc: "/sprites/sheets/characters/hero.png",
        dialogue: {
          id: type, nodes: [{ id: "welcome", speaker: right ? "Armero" : "Herrero",
            text: right ? "Aquí vendo armas y armaduras. Puedes consultar tu equipo en el inventario." : "Mejoro únicamente los objetos que te pertenecen.",
            choices: [{ text: right ? "Ver mercancía" : "Mejorar mi equipo", eventId: `shop:${type}`, nextNodeId: "goodbye" }, { text: "Ahora no", nextNodeId: "goodbye" }],
          }, { id: "goodbye", speaker: right ? "Armero" : "Herrero", text: "Aquí estaré cuando me necesites.", nextNodeId: null }],
        },
        onChoice: (eventId) => {
          if (eventId === `shop:${type}`) {
            config.dialogueManager.close();
            config.equipmentManager?.open(type);
          }
        },
      },
    });
    this.interior = interior;
    this.passageColumn = right ? 4 : 0;
    this.connected = connected;
  }

  override update(deltaTime: number): void {
    const connected = this.villageProgression.hasBuilding("smithy") && this.villageProgression.hasBuilding("armory");
    if (connected !== this.connected) {
      // TileMap/CollisionMap retain these arrays; no scene/world recreation is needed.
      this.interior.collision.tiles[2][this.passageColumn] = connected ? 0 : 1;
      this.interior.map.layers[1].tiles[2][this.passageColumn] = connected ? -1 : this.passageColumn === 4 ? 11 : 10;
      this.connected = connected;
    }
    super.update(deltaTime);
  }
}