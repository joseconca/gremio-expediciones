
//todo: llevar a tiposJuego.ts y a configuracionJuego.ts

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
export function calcularBonificacionMuralla(
  nivelMuralla: number
): number {
  const nivel = Math.max(0, nivelMuralla);

  // TODO: ajustar valores cuando definamos la progresión definitiva
  return nivel * 5;
}

/**
 * Capacidad máxima total de recursos del Almacén.
 */
export function calcularCapacidadAlmacen(
  nivelAlmacen: number
): number {
  const nivel = Math.max(0, nivelAlmacen);

  // Nivel 0 = 300
  // Cada nivel añade 300 de capacidad.
  return 25 + nivel * 25;
}

/**
 * Cantidad mínima de recursos que quedan protegidos
 * frente a un saqueo.
 *
 * Se calcula por recurso, no como una bolsa global.
 */
export function calcularRecursosProtegidos(
  nivelAlmacen: number
): Recursos {
  const nivel = Math.max(0, nivelAlmacen);

  return {
    madera: 5 +nivel * 5,
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
export function calcularTotalRecursos(
  recursos: Recursos
): number {
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
  const vulnerables = calcularRecursosVulnerables(
    recursos,
    recursosProtegidos
  );

  const totalVulnerable =
    calcularTotalRecursos(vulnerables);

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
    madera: Math.floor(
      (vulnerables.madera / totalVulnerable) * capacidad
    ),
    piedra: Math.floor(
      (vulnerables.piedra / totalVulnerable) * capacidad
    ),
    metal: Math.floor(
      (vulnerables.metal / totalVulnerable) * capacidad
    ),
  };

  /*
   * Debido al redondeo hacia abajo puede quedar capacidad libre.
   * La repartimos entre los recursos que todavía tengan unidades
   * vulnerables disponibles.
   */
  let restante =
    capacidad -
    botin.madera -
    botin.piedra -
    botin.metal;

  const tipos: (keyof Recursos)[] = [
    "metal",
    "piedra",
    "madera",
  ];

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
  return turnoActual === "atacante"
    ? "defensor"
    : "atacante";
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