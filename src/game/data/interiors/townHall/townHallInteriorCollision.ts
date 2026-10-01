import { createSmallInterior } from "../createSmallInterior";
import { townHallInteriorTileset } from "./townHallInteriorTileset";

export const { collision: townHallInteriorCollision } =
  createSmallInterior(townHallInteriorTileset);
