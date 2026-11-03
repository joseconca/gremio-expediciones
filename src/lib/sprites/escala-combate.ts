import { escalaEnemigoEnEscena, type SpriteEnemigoHd } from "./enemigos";

/** Altura de referencia compartida por héroes y enemigos de estatura humana. */
export function alturaCombatiente(
  ancho: number,
  alto: number,
  enParty: boolean,
  filas = 1,
): number {
  return Math.max(
    0,
    Math.min(
      enParty ? 144 : 180,
      ancho * 0.34,
      Math.max(0, alto - 96) / (enParty ? 2 : 1.6),
      ancho < 768 && filas > 1
        ? Math.max(80, (alto - 30) / filas - 50)
        : Infinity,
    ),
  );
}

/** Normaliza la altura visible de cada atlas; los jefes conservan su multiplicador. */
export function limiteEscalaEnemigo(
  alturaHeroe: number,
  boss: boolean,
  alturaSprite = 170,
  factorBoss = 2.4,
): number {
  return (alturaHeroe / Math.max(1, alturaSprite)) * (boss ? factorBoss : 1);
}

/** Reubica combatientes de los bordes antes de reducir su tamaño visual. */
export function encajarEnemigo(
  sprite: SpriteEnemigoHd | undefined,
  ancho: number,
  alto: number,
  x: number,
  y: number,
  limite: number,
  margenInferior = 40,
) {
  if (!sprite) return { x, y, escala: limite };

  const [izquierda, arriba, derecha, abajo] = sprite.bounds;
  const radio = Math.max(
    sprite.anchor[0] - izquierda,
    derecha - sprite.anchor[0],
    1,
  );
  const superior = Math.max(
    sprite.anchor[1] - arriba - sprite.height / 2,
    sprite.height / 2,
    1,
  );
  const inferior = Math.max(
    abajo - sprite.anchor[1] + sprite.height / 2,
    1,
  );
  const escala = Math.max(
    0,
    Math.min(
      limite,
      (ancho - 32) / (radio * 2),
      (alto - 48 - margenInferior) / (superior + inferior),
    ),
  );
  const cx = Math.max(
    radio * escala + 16,
    Math.min(ancho - radio * escala - 16, (ancho * x) / 100),
  );
  const cy = Math.max(
    superior * escala + 48,
    Math.min(alto - inferior * escala - margenInferior, (alto * y) / 100),
  );
  return {
    x: (cx / Math.max(1, ancho)) * 100,
    y: (cy / Math.max(1, alto)) * 100,
    escala,
  };
}

/**
 * Distribución visual de enemigos: el mismo cálculo para solo, party y jefes.
 * No modifica el roster ni el estado del combate.
 */
export function calcularDisposicionEnemigoEnEscena(
  enemigo: { posicion: "mele" | "centro" | "retaguardia"; columna: number },
  indiceEnemigo: number,
  cantidadEnemigos: number,
  escena: { ancho: number; alto: number },
  anchoEnemigos: number,
  tamanoHeroe: number,
  spriteHd: SpriteEnemigoHd | undefined,
) {
    const escalaContenedor = cantidadEnemigos <= 1
      ? "w-[68%] max-w-[220px]"
      : cantidadEnemigos === 2
        ? "w-[48%] max-w-[164px]"
        : cantidadEnemigos === 3
          ? "w-[36%] max-w-[120px]"
          : "w-[30%] max-w-[98px]";
    const jefeUnico = cantidadEnemigos === 1 && spriteHd?.boss;
    const x = Math.max(22, Math.min(78, cantidadEnemigos <= 1
      ? jefeUnico ? 65 : 50
      : cantidadEnemigos === 2
        ? (indiceEnemigo === 0 ? 28 : 72)
        : (enemigo.posicion === "mele" ? 24 : enemigo.posicion === "centro" ? 50 : 76) + (enemigo.columna - 1) * 12));
    const minimoY = Math.min(48, (tamanoHeroe / 2 + 86) / Math.max(1, escena.alto) * 100);
    const maximoY = Math.max(minimoY, 100 - (tamanoHeroe / 2 + 18) / Math.max(1, escena.alto) * 100);
    const y = cantidadEnemigos <= 1 ? Math.max(55, minimoY)
      : enemigo.posicion === "mele" ? minimoY : enemigo.posicion === "retaguardia" ? maximoY : (minimoY + maximoY) / 2;
    const anchoDisponible = escena.ancho;
    const centroX = (escena.ancho - anchoEnemigos + anchoEnemigos * x / 100) / Math.max(1, escena.ancho) * 100;
    const posicionAjustada = encajarEnemigo(spriteHd, anchoDisponible, escena.alto, centroX, y,
      limiteEscalaEnemigo(tamanoHeroe, Boolean(spriteHd?.boss), spriteHd?.height, escena.ancho < 768 ? 1.6 : 2.4), 16);
    const xAjustada = (escena.ancho * posicionAjustada.x / 100 - (escena.ancho - anchoEnemigos)) / Math.max(1, anchoEnemigos) * 100;
    const unidadEnemigo = escalaEnemigoEnEscena(spriteHd, anchoDisponible, escena.alto,
      posicionAjustada.x, posicionAjustada.y, posicionAjustada.escala, 16);
  return { escalaContenedor, posicionAjustada, xAjustada, unidadEnemigo };
}
