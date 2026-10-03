import { Collider } from "../../../entities/Collider";
import type { PropConfig } from "../../../entities/Prop";

export function getTavernProps(level: number): PropConfig[] {
  const props: PropConfig[] = [];

  // Elementos comunes al nivel 1 o superior
  if (level >= 1) {
    props.push({
      x: 32,
      y: 64,
      width: 96,
      height: 32,
      spriteSrc: "/sprites/buildings/tavern/barra1.png",
      colliders: [
        new Collider({ width: 96, height: 20, offsetX: 0, offsetY: 12 }),
      ],
    });
  }

  // Si en el futuro añadimos nivel 2 a la taberna, podemos añadir mesas, barriles, etc.
  // if (level >= 2) {
  //   props.push({ ... decoración del nivel 2 ... });
  // }

  return props;
}

