import type { DefinicionEnemigo } from "./tiposJuego";
import { ENEMIGOS_BASE, JEFES_ELITE_BASE, TABLAS_LOOT } from "./catalogos/enemigos";
import { obtenerRangoAmenaza } from "./expediciones/dificultad";

function prepararEnemigo(enemigo: DefinicionEnemigo, esJefe: boolean): DefinicionEnemigo {
  const rareza = enemigo.rareza ?? "comun";
  const tablaLoot = enemigo.tablaLoot?.length
    ? enemigo.tablaLoot
    : enemigo.objetoDropId
      ? [{ objetoId: enemigo.objetoDropId, peso: 1 }]
      : esJefe
        ? [
            { objetoId: "espada_runa", peso: 4 },
            { objetoId: "armadura_acero", peso: 4 },
            { objetoId: "hacha_orca", peso: 3 },
            { objetoId: "amuleto_vitalidad", peso: 2 },
            { objetoId: "anillo_maldito", peso: 1 },
            { objetoId: "espada_draconica", peso: 2 },
            { objetoId: "coraza_runica", peso: 2 },
            { objetoId: "hacha_berserker", peso: 2 },
            { objetoId: "grimorio_eclipse", peso: 2 },
            { objetoId: "arco_cazador", peso: 1 },
            { objetoId: "baston_runico", peso: 1 },
            { objetoId: "escudo_guardian", peso: 1 },
            { objetoId: "collar_fenix", peso: 1 },
            { objetoId: "anillo_arcanista", peso: 2 },
            { objetoId: "amuleto_ancestral", peso: 2 },
          ]
        : TABLAS_LOOT[rareza] ?? TABLAS_LOOT.comun;

  const probabilidadPorRareza: Record<string, number> = {
    comun: 0.08,
    poco_comun: 0.14,
    raro: 0.22,
    epico: 0.32,
    legendario: 0.42,
  };

  return {
    ...enemigo,
    esJefe,
    probabilidadBotin:
      enemigo.probabilidadBotin ?? (esJefe ? 0.7 : (probabilidadPorRareza[rareza] ?? 0.08)),
    tablaLoot,
  };
}

export const ENEMIGOS: DefinicionEnemigo[] = ENEMIGOS_BASE.map((enemigo) =>
  prepararEnemigo(enemigo, false)
);

export const JEFES_ELITE: DefinicionEnemigo[] = JEFES_ELITE_BASE.map((enemigo) =>
  prepararEnemigo(enemigo, true)
);

export function obtenerEnemigoPorId(id: string): DefinicionEnemigo | undefined {
  return [...ENEMIGOS, ...JEFES_ELITE].find((enemigo) => enemigo.id === id);
}

export function obtenerEnemigosPorDificultad(
  dificultad: number
): DefinicionEnemigo[] {
  const nivel = Number.isFinite(dificultad) ? Math.max(0, Math.floor(dificultad)) : 0;
  // El Mímico se sortea aparte con una probabilidad fija del 1 %.
  // El resto del catálogo conserva todos los enemigos desde difMin 0 hasta
  // la amenaza efectiva; los inferiores nunca desaparecen del sorteo.
  const candidatos = ENEMIGOS.filter((enemigo) => enemigo.id !== "mimic");
  const amenazaMaximaCatalogo = Math.max(
    ...candidatos.map((enemigo) => Math.max(0, enemigo.difMin))
  );
  const nivelCatalogo = Math.min(nivel, amenazaMaximaCatalogo);
  return candidatos.filter(
    (enemigo) => enemigo.difMin >= 0 && enemigo.difMin <= nivelCatalogo
  );
}


/**
 * Cada enemigo tiene una copia de su sprite dentro de la carpeta de su rango.
 * Los PNG originales en la raíz se conservan por compatibilidad con el mundo 2.5D.
 * Para enemigos nuevos sin arte propio, el archivo por ID contiene inicialmente
 * un sprite de referencia del rango y se puede sustituir sin tocar el código.
 */
export function obtenerRutaSpriteEnemigo(id?: string | null): string {
  if (!id) return "/sprites/enemies/I/slime_acido.png";
  const enemigo = obtenerEnemigoPorId(id);
  if (!enemigo) return "/sprites/enemies/I/slime_acido.png";
  const rango = obtenerRangoAmenaza(Math.max(1, enemigo.difMin));
  return `/sprites/enemies/${rango.id}/${id}.png`;
}
