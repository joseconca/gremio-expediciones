import type { Prisma } from "@prisma/client";
import type { AccionAnimadaCombate } from "./combate";

export type EfectoCombateAsedio = {
  habilidadId: string;
  tipo: "bonus_defensa";
  valor: number;
  turnosRestantes: number;
};

export interface Recursos {
  madera: number;
  piedra: number;
  metal: number;
}

export interface EdificiosDefensivos {
  muralla: number;
  almacen: number;
}
/**
 * Bonificación de defensa proporcionada por la Muralla.
 *
 * La bonificación se aplica sobre la defensa total del defensor
 * y queda congelada al comenzar el combate.
 */
export function calcularBonificacionMuralla(nivelMuralla: number): number {
  const nivel = Math.max(0, nivelMuralla);

  return nivel * 5;
}

/**
 * Capacidad máxima total de recursos del Almacén.
 */
export function calcularCapacidadAlmacen(nivelAlmacen: number): number {
  const nivel = Math.max(0, nivelAlmacen);

  return 25 + nivel * 25;
}

/**
 * Cantidad mínima de recursos que quedan protegidos
 * frente a un saqueo.
 *
 * Se calcula por recurso, no como una bolsa global.
 */
export function calcularRecursosProtegidos(nivelAlmacen: number): Recursos {
  const nivel = Math.max(0, nivelAlmacen);

  return {
    madera: 5 + nivel * 5,
    piedra: 5 + nivel * 5,
    metal: 5 + nivel * 5,
  };
}

/**
 * Calcula qué cantidad de cada recurso puede ser saqueada.
 */
export function calcularRecursosVulnerables(
  recursos: Recursos,
  protegidos: Recursos
): Recursos {
  return {
    madera: Math.max(0, recursos.madera - protegidos.madera),
    piedra: Math.max(0, recursos.piedra - protegidos.piedra),
    metal: Math.max(0, recursos.metal - protegidos.metal),
  };
}

/**
 * Calcula el total de recursos disponibles para saqueo.
 */
export function calcularTotalRecursos(recursos: Recursos): number {
  return recursos.madera + recursos.piedra + recursos.metal;
}

/**
 * Reparte el botín de forma proporcional entre los recursos vulnerables,
 * respetando la capacidad del carruaje.
 */
export function calcularBotinAsedio({
  recursos,
  recursosProtegidos,
  capacidadCarruaje,
}: {
  recursos: Recursos;
  recursosProtegidos: Recursos;
  capacidadCarruaje: number;
}): Recursos {
  const vulnerables = calcularRecursosVulnerables(recursos, recursosProtegidos);

  const totalVulnerable = calcularTotalRecursos(vulnerables);

  const capacidad = Math.max(0, Math.floor(capacidadCarruaje));

  if (totalVulnerable <= 0 || capacidad <= 0) {
    return {
      madera: 0,
      piedra: 0,
      metal: 0,
    };
  }

  // Si todo cabe en el carruaje, se saquea todo lo vulnerable.
  if (totalVulnerable <= capacidad) {
    return vulnerables;
  }

  /*
   * Reparto proporcional.
   *
   * Ejemplo:
   * 100 madera + 50 piedra + 50 metal = 200 vulnerables
   * capacidad = 100
   *
   * -> 50 madera
   * -> 25 piedra
   * -> 25 metal
   */
  const botin: Recursos = {
    madera: Math.floor((vulnerables.madera / totalVulnerable) * capacidad),
    piedra: Math.floor((vulnerables.piedra / totalVulnerable) * capacidad),
    metal: Math.floor((vulnerables.metal / totalVulnerable) * capacidad),
  };

  /*
   * Debido al redondeo hacia abajo puede quedar capacidad libre.
   * La repartimos entre los recursos que todavía tengan unidades
   * vulnerables disponibles.
   */
  let restante = capacidad - botin.madera - botin.piedra - botin.metal;

  const tipos: (keyof Recursos)[] = ["metal", "piedra", "madera"];

  while (restante > 0) {
    let añadido = false;

    for (const tipo of tipos) {
      if (botin[tipo] < vulnerables[tipo]) {
        botin[tipo] += 1;
        restante -= 1;
        añadido = true;

        if (restante <= 0) {
          break;
        }
      }
    }

    if (!añadido) {
      break;
    }
  }

  return botin;
}

/**
 * Determina quién comienza el combate PvP.
 *
 * Si tienen la misma velocidad, el atacante comienza.
 */
export function determinarPrimerTurnoAsedio({
  velocidadAtacante,
  velocidadDefensor,
}: {
  velocidadAtacante: number;
  velocidadDefensor: number;
}): "atacante" | "defensor" {
  if (velocidadDefensor > velocidadAtacante) {
    return "defensor";
  }

  return "atacante";
}

/**
 * Devuelve el siguiente turno de un combate PvP.
 */
export function siguienteTurnoAsedio(
  turnoActual: "atacante" | "defensor"
): "atacante" | "defensor" {
  return turnoActual === "atacante" ? "defensor" : "atacante";
}

/**
 * Determina el ganador según los HP restantes.
 */
export function determinarGanadorAsedio({
  hpAtacante,
  hpDefensor,
}: {
  hpAtacante: number;
  hpDefensor: number;
}): "atacante" | "defensor" | null {
  if (hpAtacante <= 0 && hpDefensor <= 0) {
    /*
     * En caso excepcional de doble KO, damos la victoria
     * al defensor para evitar generar botín.
     */
    return "defensor";
  }

  if (hpAtacante <= 0) {
    return "defensor";
  }

  if (hpDefensor <= 0) {
    return "atacante";
  }

  return null;
}

/**
 * Finaliza un combate de asedio y aplica todos sus efectos persistentes:
 *
 * - marca el combate como victoria/derrota
 * - resuelve el botín si gana el atacante
 * - descuenta el botín al defensor
 * - guarda el botín en la expedición del atacante
 * - pone la expedición del atacante en regreso
 * - guarda el HP final del atacante
 * - restaura el estado del defensor
 *
 * Debe ejecutarse dentro de una transacción Prisma.
 */
export async function finalizarAsedio({
  tx,
  combate,
  expedicionId,
  jugadorHp,
  enemigoHp,
  jugadorDefensa,
  enemigoDefensa,
  cooldowns,
  efectos,
  cooldownsDefensor,
  efectosDefensor,
  accion,
  log,
  ganador,
}: {
  tx: Prisma.TransactionClient;
  combate: {
    id: string;
    version: number;

    atacanteUsuarioId: string | null;
    defensorUsuarioId: string | null;

    jugadorHpMaximo: number;
    almacenNivel: number | null;
    capacidadCarruaje: number | null;

    estadoDefensorAnterior: string | null;
  };
  expedicionId: string;

  jugadorHp: number;
  enemigoHp: number;

  jugadorDefensa: number;
  enemigoDefensa: number;

  cooldowns: Record<string, number>;
  efectos: EfectoCombateAsedio[];
  cooldownsDefensor: Record<string, number>;
  efectosDefensor: EfectoCombateAsedio[];

  accion: AccionAnimadaCombate;
  log: string[];

  ganador: "atacante" | "defensor";
}) {
  if (!combate.atacanteUsuarioId || !combate.defensorUsuarioId) {
    throw new Error("COMBATE_PVP_SIN_USUARIOS");
  }

  const atacanteUsuarioId = combate.atacanteUsuarioId;
  const defensorUsuarioId = combate.defensorUsuarioId;

  const atacanteGana = ganador === "atacante";

  const faseFinal = atacanteGana ? "victoria" : "derrota";

  // ==========================================================
  // RESOLVER BOTÍN
  // ==========================================================

  let botin: Recursos = {
    madera: 0,
    piedra: 0,
    metal: 0,
  };

  if (atacanteGana) {
    const defensor = await tx.usuario.findUnique({
      where: {
        id: defensorUsuarioId,
      },
      select: {
        madera: true,
        piedra: true,
        metal: true,
      },
    });

    if (!defensor) {
      throw new Error("DEFENSOR_NO_ENCONTRADO");
    }

    const recursosProtegidos = calcularRecursosProtegidos(
      combate.almacenNivel ?? 0
    );

    botin = calcularBotinAsedio({
      recursos: {
        madera: defensor.madera,
        piedra: defensor.piedra,
        metal: defensor.metal,
      },
      recursosProtegidos,
      capacidadCarruaje: combate.capacidadCarruaje ?? 0,
    });

    await tx.usuario.update({
      where: {
        id: defensorUsuarioId,
      },
      data: {
        madera: {
          decrement: botin.madera,
        },
        piedra: {
          decrement: botin.piedra,
        },
        metal: {
          decrement: botin.metal,
        },
      },
    });

    const totalBotin = botin.madera + botin.piedra + botin.metal;

    if (totalBotin > 0) {
      log.push(
        `🎒 Saqueas ${botin.madera} 🪵, ${botin.piedra} 🪨 y ${botin.metal} ⚙️.`
      );
    } else {
      log.push("🎒 No encuentras recursos vulnerables que puedas saquear.");
    }
  }

  // ==========================================================
  // MARCAR COMBATE COMO TERMINADO
  // ==========================================================

  const actualizacionCombate = await tx.combateActivo.updateMany({
    where: {
      id: combate.id,
      version: combate.version,
      fase: "activo",
    },
    data: {
      jugadorHp,
      enemigoHp,
      jugadorDefensa,
      enemigoDefensa,

      fase: faseFinal,
      turno: ganador,
      ganadorUsuarioId:
        ganador === "atacante" ? atacanteUsuarioId : defensorUsuarioId,

      botinResuelto: true,

      cooldowns,
      efectos,
      cooldownsDefensor,
      efectosDefensor,

      ultimoTurnoEn: new Date(),

      ultimaAccion: accion,
      log,

      version: {
        increment: 1,
      },
    },
  });

  if (actualizacionCombate.count !== 1) {
    throw new Error("COMBATE_MODIFICADO");
  }

  const combateActualizado = await tx.combateActivo.findUniqueOrThrow({
    where: {
      id: combate.id,
    },
  });

  // ==========================================================
  // EXPEDICIÓN DEL ATACANTE
  // ==========================================================

  await tx.expedicionActiva.update({
    where: {
      id: expedicionId,
    },
    data: {
      fase: "regresando",

      resultadoFinal: atacanteGana ? "exito" : "derrota",

      recompensa: {
        oro: 0,
        madera: botin.madera,
        piedra: botin.piedra,
        metal: botin.metal,
      },

      hpPerdido: Math.max(0, combate.jugadorHpMaximo - jugadorHp),

      experienciaGanada: 0,
    },
  });

  // ==========================================================
  // HP FINAL DEL ATACANTE
  // ==========================================================

  await tx.personaje.update({
    where: {
      usuarioId: atacanteUsuarioId,
    },
    data: {
      hpActual: Math.max(1, jugadorHp),
    },
  });

  // ==========================================================
  // RESTAURAR ESTADO DEL DEFENSOR
  // ==========================================================

  await tx.personaje.update({
    where: {
      usuarioId: defensorUsuarioId,
    },
    data: {
      estado: combate.estadoDefensorAnterior!,
    },
  });

  return {
    combate: combateActualizado,
    botin,
  };
}
