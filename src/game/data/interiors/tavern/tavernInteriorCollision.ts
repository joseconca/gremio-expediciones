import { createSmallInterior } from "../createSmallInterior";
import { tavernInteriorTileset } from "./tavernInteriorTileset";

export const { collision: tavernInteriorCollision } =
  createSmallInterior(tavernInteriorTileset);
