import { createSmallInterior } from "../createSmallInterior";
import { embassyInteriorTileset } from "./embassyInteriorTileset";

export const { collision: embassyInteriorCollision } =
  createSmallInterior(embassyInteriorTileset);
