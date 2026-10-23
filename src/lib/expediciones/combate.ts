import type { DefinicionHabilidad, PresentacionVisualCombate } from "@/lib/tiposJuego";

export type AccionAnimadaCombate = {
  actor: "jugador" | "enemigo";
  tipo: "ataque" | "fallo" | "habilidad";
  animacion:
    | "ofensiva"
    | "ofensiva_potenciada"
    | "defensiva"
    | "escudo"
    | "curacion";
  dano: number;
  critico: boolean;
  curacion?: number;

  /**
   * Identidades visuales opcionales. En party, actorUsuarioId y objetivoUsuarioId
   * identifican al participante real; sin estos campos se conserva la semántica
   * heredada de jugador/enemigo.
   */
  actorUsuarioId?: string | null;
  objetivoUsuarioId?: string | null;
  objetivosUsuarioIds?: string[];

  /** Identidad del enemigo concreto que ataca o recibe el efecto. */
  actorEnemigoId?: string | null;
  actoresEnemigoIds?: string[];
  /** Impacto individual de cada enemigo dentro de una fase enemiga con varios atacantes. */
  impactosEnemigos?: {
    actorEnemigoId: string;
    objetivoId: string;
    dano: number;
    critico: boolean;
    hpAntes: number;
    hpDespues: number;
  }[];
  enemigoObjetivoId?: string | null;
  objetivosEnemigoIds?: string[];
  /** Resultados individuales para áreas y turnos con varios atacantes; el destino puede ser enemigo o aliado. */
  impactosMultiples?: { objetivoId: string; dano: number; critico: boolean }[];

  /** La presentación explícita tiene prioridad sobre el modo heredado de animacion. */
  presentacion?: PresentacionVisualCombate;

  /** Pulsos de daño/curación causados por estados durante esta acción. */
  pulsosEstado?: {
    objetivo: "jugador" | "enemigo";
    /** Identidad del miembro real si el pulso afecta a un participante de party. */
    objetivoUsuarioId?: string | null;
    tipo: "dano" | "curacion";
    cantidad: number;
  }[];
  texto: string;
};

function crearAccion(
  datos: Omit<AccionAnimadaCombate, "critico" | "dano"> & {
    dano?: number;
    critico?: boolean;
  }
): AccionAnimadaCombate {
  return {
    ...datos,
    dano: datos.dano ?? 0,
    critico: datos.critico ?? false,
  };
}

const d20 = () => Math.floor(Math.random() * 20) + 1;

export function calcularProbabilidadImpacto(precision = 75, evasionObjetivo = 0): number {
  const precisionSegura = Number.isFinite(precision) ? Math.max(1, Math.min(100, precision)) : 75;
  const evasionSegura = Number.isFinite(evasionObjetivo) ? Math.max(0, Math.min(0.6, evasionObjetivo)) : 0;
  return Math.max(0.1, Math.min(0.99, 0.95 + (precisionSegura - 75) * 0.005 - evasionSegura * 0.5));
}

function falloPorPrecision(actor: "jugador" | "enemigo", nombre: string): AccionAnimadaCombate {
  return {
    actor,
    tipo: "fallo",
    animacion: "ofensiva",
    dano: 0,
    critico: false,
    texto: actor === "jugador"
      ? "🎯 Fallas el ataque contra " + nombre + "; el objetivo esquiva o evita el golpe."
      : "🌀 " + nombre + " falla su ataque por falta de precisión.",
  };
}

const K_DEFENSA = 100;

/**
 * Fórmula única de mitigación para ataques básicos, habilidades y daño progresivo.
 * La defensa reduce el daño de forma decreciente, manteniendo al menos 1 punto.
 */
export function calcularDanoMitigado(danoBase: number, defensa: number): number {
  const danoBaseSeguro = Number.isFinite(danoBase) ? Math.max(0, danoBase) : 0;
  const defensaSegura = Number.isFinite(defensa) ? Math.max(0, defensa) : 0;
  const dano = (danoBaseSeguro * K_DEFENSA) / (defensaSegura + K_DEFENSA);

  return Math.max(1, Math.floor(dano));
}

export function calcularBonusDefensaMuralla(
  murallaNivel: number | null | undefined
): number {
  const nivel = Math.max(0, murallaNivel ?? 0);
  if (nivel >= 1) {
    return 5 + nivel * 5;
  }
  return 0;
}

export function resolverAtaqueJugador(combate: {
  jugadorAtaque: number;
  jugadorAtaqueMagico?: number;
  usarMejorAtaqueMagico?: boolean;
  jugadorNivel: number;
  jugadorProbCritico: number;
  jugadorDanoCritico: number;
  enemigoDefensa: number;
  enemigoDefensaMagica?: number;
  enemigoNombre: string;
  jugadorPrecision?: number;
  enemigoEvasion?: number;
}): AccionAnimadaCombate {
  const dado = d20();

  if (dado === 1) {
    return {
      actor: "jugador",
      tipo: "fallo",
      animacion: "ofensiva",
      dano: 0,
      critico: false,
      texto: `🤡 Pifia. Fallas tu ataque contra ${combate.enemigoNombre}.`,
    };
  }

  if (dado !== 20 && Math.random() > calcularProbabilidadImpacto(combate.jugadorPrecision, combate.enemigoEvasion)) {
    return falloPorPrecision("jugador", combate.enemigoNombre);
  }

  const variacion = 0.8 + Math.random() * 0.4;

  const ataqueMagico = combate.jugadorAtaqueMagico ?? 0;
  const usarAtaqueMagico =
    combate.usarMejorAtaqueMagico === true && ataqueMagico > combate.jugadorAtaque;
  const ataqueEfectivo = usarAtaqueMagico ? ataqueMagico : combate.jugadorAtaque;
  const defensaEfectiva = usarAtaqueMagico
    ? (combate.enemigoDefensaMagica ?? combate.enemigoDefensa)
    : combate.enemigoDefensa;
  const danoBase =
    Math.floor(ataqueEfectivo * variacion) + combate.jugadorNivel;

  const esCritico = Math.random() < combate.jugadorProbCritico || dado === 20;

  const danoAntesCritico = calcularDanoMitigado(danoBase, defensaEfectiva);

  const dano = esCritico
    ? Math.max(1, Math.floor(danoAntesCritico * combate.jugadorDanoCritico))
    : danoAntesCritico;

  return {
    actor: "jugador",
    tipo: "ataque",
    animacion: esCritico ? "ofensiva_potenciada" : "ofensiva",
    dano,
    critico: esCritico,
    texto: esCritico
      ? `💥 ¡Golpe crítico! Atacas a ${combate.enemigoNombre} e infliges ${dano} de daño.`
      : `⚔️ Atacas a ${combate.enemigoNombre} e infliges ${dano} de daño.`,
  };
}

export function resolverAtaqueEnemigo(combate: {
  enemigoAtaque: number;
  enemigoAtaqueMagico?: number;
  usarMejorAtaqueMagico?: boolean;
  enemigoProbCritico?: number;
  enemigoDanoCritico?: number;
  jugadorDefensa: number;
  jugadorDefensaMagica?: number;
  enemigoNombre: string;
  enemigoPrecision?: number;
  jugadorEvasion?: number;
}): AccionAnimadaCombate {
  const dado = d20();

  if (dado === 1) {
    return {
      actor: "enemigo",
      dano: 0,
      tipo: "fallo",
      animacion: "ofensiva",
      critico: false,
      texto: `🤡 ${combate.enemigoNombre} falla su ataque.`,
    };
  }

  if (dado !== 20 && Math.random() > calcularProbabilidadImpacto(combate.enemigoPrecision, combate.jugadorEvasion)) {
    return falloPorPrecision("enemigo", combate.enemigoNombre);
  }

  const variacion = 0.8 + Math.random() * 0.4;

  const ataqueMagico = combate.enemigoAtaqueMagico ?? 0;
  const usarAtaqueMagico =
    combate.usarMejorAtaqueMagico === true && ataqueMagico > combate.enemigoAtaque;
  const ataqueEfectivo = usarAtaqueMagico ? ataqueMagico : combate.enemigoAtaque;
  const defensaEfectiva = usarAtaqueMagico
    ? (combate.jugadorDefensaMagica ?? combate.jugadorDefensa)
    : combate.jugadorDefensa;
  const danoBase = Math.floor(ataqueEfectivo * variacion) + 1;

  const probCritico = combate.enemigoProbCritico ?? 0.1;
  const danoCritico = combate.enemigoDanoCritico ?? 1.5;

  const esCritico = Math.random() < probCritico || dado === 20;

  const danoAntesCritico = calcularDanoMitigado(danoBase, defensaEfectiva);

  const dano = esCritico
    ? Math.max(1, Math.floor(danoAntesCritico * danoCritico))
    : danoAntesCritico;

  return {
    actor: "enemigo",
    dano,
    tipo: "ataque",
    animacion: esCritico ? "ofensiva_potenciada" : "ofensiva",
    critico: esCritico,
    texto: esCritico
      ? `💥 ¡Golpe crítico! ${combate.enemigoNombre} inflige ${dano} de daño.`
      : `🩸 ${combate.enemigoNombre} golpea y causa ${dano} de daño.`,
  };
}

interface CombateParaHabilidad {
  jugadorAtaque: number;
  jugadorAtaqueMagico?: number;
  jugadorDefensa: number;
  jugadorDefensaMagica?: number;
  enemigoDefensaMagica?: number;
  jugadorNivel: number;
  jugadorHp: number;
  jugadorHpMaximo: number;
  jugadorProbCritico: number;
  jugadorDanoCritico: number;
  enemigoDefensa: number;
  enemigoNombre: string;
  jugadorPrecision?: number;
  enemigoEvasion?: number;
  bonusCuracion?: number;
  efectosJugador?: import("@/lib/tiposJuego").EstadoEfectoHabilidad[];
}

export interface ResultadoHabilidad {
  accion: AccionAnimadaCombate;
  jugadorHp: number;
  jugadorDefensa: number;
  enemigoDefensa: number;
  efectos: import("@/lib/tiposJuego").EstadoEfectoHabilidad[];
  efectosJugadorActualizados?: import("@/lib/tiposJuego").EstadoEfectoHabilidad[];
}

function obtenerPresentacionProyectilHabilidad(
  habilidad: DefinicionHabilidad,
): PresentacionVisualCombate | undefined {
  if (habilidad.efecto !== "dano" || habilidad.tipoDano !== "magico") return undefined;

  const referencia = `${habilidad.id} ${habilidad.claseId ?? ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (/(bola_fuego|fuego|llama|quemadura)/.test(referencia)) {
    return { modo: "proyectil", proyectil: "bola_fuego", elemento: "fuego", impacto: "explosion" };
  }
  if (/(hielo|escarcha|frio)/.test(referencia)) {
    return { modo: "proyectil", proyectil: "esquirla_hielo", elemento: "hielo", impacto: "escarcha" };
  }
  if (/(rayo|electri|tormenta)/.test(referencia)) {
    return { modo: "proyectil", proyectil: "rayo", elemento: "rayo", impacto: "destello" };
  }
  if (/(natur|raices|semilla|zarzas|druida)/.test(referencia)) {
    return { modo: "proyectil", proyectil: "semilla_natural", elemento: "naturaleza", impacto: "onda" };
  }
  if (/(sagrad|acolito|sacerdote|oraculo|hierofante|paladin|cruzado)/.test(referencia)) {
    return { modo: "proyectil", proyectil: "energia_sagrada", elemento: "sagrado", impacto: "sagrado" };
  }
  if (/(sombra|funebre|maldit|drenaje|necrom|nigrom|demon|brujo|abismo|pacto|infernal)/.test(referencia)) {
    return { modo: "proyectil", proyectil: "orbe_sombra", elemento: "sombras", impacto: "destello" };
  }

  return { modo: "proyectil", proyectil: "esfera_arcana", elemento: "arcano", impacto: "destello" };
}

export function resolverHabilidadJugador(
  habilidad: DefinicionHabilidad,
  combate: CombateParaHabilidad,
): ResultadoHabilidad {
  if (!habilidad.efecto) throw new Error(`La habilidad ${habilidad.id} no tiene un efecto de combate definido.`);

  let jugadorHp = combate.jugadorHp;
  let jugadorDefensa = combate.jugadorDefensa;
  let enemigoDefensa = combate.enemigoDefensa;
  const efectos: import("@/lib/tiposJuego").EstadoEfectoHabilidad[] = [];
  const bonusCuracion = Math.max(0, combate.bonusCuracion ?? 0);
  const ataqueMagico = combate.jugadorAtaqueMagico ?? combate.jugadorAtaque;
  const ataqueEfectivo = habilidad.tipoDano === "magico"
    ? ataqueMagico
    : habilidad.tipoDano === "hibrido"
      ? Math.floor((combate.jugadorAtaque + ataqueMagico) / 2)
      : combate.jugadorAtaque;

  const agregarEstado = (
    estado: NonNullable<DefinicionHabilidad["estadosSecundarios"]>[number],
  ) => {
    const objetivo = estado.objetivo ?? "enemigo";
    let valor = estado.valor;

    if (estado.tipo === "dano_progresivo") {
      const danoBruto = Math.max(1, Math.floor(ataqueEfectivo * estado.valor));
      const defensaFisica = objetivo === "jugador" ? jugadorDefensa : enemigoDefensa;
      const defensaMagica = objetivo === "jugador"
        ? (combate.jugadorDefensaMagica ?? jugadorDefensa)
        : (combate.enemigoDefensaMagica ?? enemigoDefensa);
      const defensaObjetivo = habilidad.tipoDano === "magico"
        ? defensaMagica
        : habilidad.tipoDano === "hibrido"
          ? Math.floor((defensaFisica + defensaMagica) / 2)
          : defensaFisica;
      // Usamos la misma mitigación de defensa que el daño directo; el daño
      // almacenado ya está mitigado para que cada pulso no vuelva a reducirlo.
      valor = calcularDanoMitigado(danoBruto, defensaObjetivo);
    } else if (estado.tipo === "curacion_progresiva") {
      valor = Math.max(1, Math.floor(combate.jugadorHpMaximo * estado.valor * (1 + bonusCuracion)));
    } else if (estado.tipo === "bonus_defensa") {
      const defensaBase = objetivo === "jugador" ? jugadorDefensa : enemigoDefensa;
      valor = Math.max(1, Math.floor(defensaBase * estado.valor));
    } else if (estado.tipo === "debuff_defensa") {
      const defensaBase = objetivo === "jugador" ? jugadorDefensa : enemigoDefensa;
      valor = Math.max(1, Math.floor(defensaBase * estado.valor));
    }

    if (estado.tipo === "bonus_defensa" && objetivo === "jugador") jugadorDefensa += valor;
    if (estado.tipo === "bonus_defensa" && objetivo === "enemigo") enemigoDefensa += valor;
    if (estado.tipo === "debuff_defensa" && objetivo === "jugador") jugadorDefensa = Math.max(0, jugadorDefensa - valor);
    if (estado.tipo === "debuff_defensa" && objetivo === "enemigo") enemigoDefensa = Math.max(0, enemigoDefensa - valor);

    efectos.push({
      habilidadId: habilidad.id,
      tipo: estado.tipo,
      valor,
      duracionTurnos: Math.max(1, Math.floor(estado.duracionTurnos)),
      turnosRestantes: Math.max(1, Math.floor(estado.duracionTurnos)),
      objetivo,
    });
  };

  const agregarEstadosExtra = () => {
    for (const estado of habilidad.estadosSecundarios ?? []) agregarEstado(estado);
    if ((habilidad.danoProgresivoPorcentaje ?? 0) > 0) {
      agregarEstado({
        tipo: "dano_progresivo",
        valor: habilidad.danoProgresivoPorcentaje!,
        duracionTurnos: habilidad.duracionTurnos ?? 2,
        objetivo: "enemigo",
      });
    }
  };

  const probabilidadCritico = Math.min(1, combate.jugadorProbCritico + (habilidad.probabilidadCritico ?? 0));
  const resultadoBasico = () => ({
    jugadorHp,
    jugadorDefensa,
    enemigoDefensa,
    efectos: [] as import("@/lib/tiposJuego").EstadoEfectoHabilidad[],
  });

  const presentarAccion = (accion: AccionAnimadaCombate): AccionAnimadaCombate => {
    const presentacion = habilidad.presentacionVisual ?? obtenerPresentacionProyectilHabilidad(habilidad);
    return presentacion ? { ...accion, presentacion } : accion;
  };

  switch (habilidad.efecto) {
    case "dano": {
      const dado = d20();
      if (dado === 1) {
        return {
          accion: presentarAccion(crearAccion({
            actor: "jugador", tipo: "fallo",
            animacion: habilidad.animacion === "ofensiva_potenciada" ? "ofensiva_potenciada" : "ofensiva",
            texto: `🤡 Pifia. Fallas ${habilidad.nombre} contra ${combate.enemigoNombre}.`,
          })),
          ...resultadoBasico(),
        };
      }
      if (dado !== 20 && Math.random() > calcularProbabilidadImpacto(combate.jugadorPrecision, combate.enemigoEvasion)) {
        return { accion: presentarAccion(falloPorPrecision("jugador", combate.enemigoNombre)), ...resultadoBasico() };
      }

      const variacion = 0.8 + Math.random() * 0.4;
      const defensaMagica = combate.enemigoDefensaMagica ?? enemigoDefensa;
      const defensa = habilidad.tipoDano === "magico"
        ? defensaMagica
        : habilidad.tipoDano === "hibrido"
          ? Math.floor((enemigoDefensa + defensaMagica) / 2)
          : enemigoDefensa;
      const danoBase = Math.floor(ataqueEfectivo * variacion * (habilidad.multiplicadorDano ?? 1));
      const danoNormal = calcularDanoMitigado(danoBase, defensa);
      const esCritico = dado === 20 || Math.random() < probabilidadCritico;
      const multiplicadorCritico = (combate.jugadorDanoCritico ?? 1.5) + (habilidad.multiplicadorCritico ?? 0);
      const dano = esCritico ? Math.max(1, Math.floor(danoNormal * multiplicadorCritico)) : danoNormal;

      if ((habilidad.roboVida ?? 0) > 0) {
        const robo = Math.max(0, Math.floor(dano * Math.min(1, habilidad.roboVida!) * (1 + bonusCuracion)));
        jugadorHp += Math.min(robo, Math.max(0, combate.jugadorHpMaximo - jugadorHp));
      }
      agregarEstadosExtra();
      return {
        accion: presentarAccion(crearAccion({
          actor: "jugador", tipo: "habilidad",
          animacion: esCritico && habilidad.animacion === "ofensiva" ? "ofensiva_potenciada" : habilidad.animacion ?? "ofensiva",
          dano, critico: esCritico,
          curacion: jugadorHp > combate.jugadorHp ? jugadorHp - combate.jugadorHp : undefined,
          texto: esCritico
            ? `💥 ¡${habilidad.nombre} crítico! Infliges ${dano} de daño a ${combate.enemigoNombre}.`
            : `⚔️ Usas ${habilidad.nombre} e infliges ${dano} de daño a ${combate.enemigoNombre}.`,
        })),
        jugadorHp, jugadorDefensa, enemigoDefensa, efectos,
      };
    }

    case "curacion": {
      const multiplicadorCritico = Math.max(1, habilidad.multiplicadorCritico ?? 1);
      const dado = multiplicadorCritico > 1 ? d20() : 0;
      const esCritico = multiplicadorCritico > 1 &&
        (dado === 20 || Math.random() < probabilidadCritico);
      const cantidadBase = habilidad.curacionPorcentaje !== undefined
        ? Math.floor(combate.jugadorHpMaximo * habilidad.curacionPorcentaje)
        : (habilidad.curacion ?? 0);
      const cantidadCritica = esCritico
        ? Math.floor(cantidadBase * multiplicadorCritico)
        : cantidadBase;
      const cantidad = Math.max(0, Math.floor(cantidadCritica * (1 + bonusCuracion)));
      const curado = Math.min(cantidad, Math.max(0, combate.jugadorHpMaximo - jugadorHp));
      jugadorHp += curado;
      agregarEstadosExtra();
      let efectosJugadorActualizados: import("@/lib/tiposJuego").EstadoEfectoHabilidad[] | undefined;
      if (habilidad.limpiarEstadosNegativos) {
        const efectosPrevios = combate.efectosJugador ?? [];
        const tiposNegativos = ["debuff_ataque", "debuff_defensa", "debuff_precision", "dano_progresivo"];
        const eliminados = efectosPrevios.filter((efecto) => tiposNegativos.includes(efecto.tipo));
        // Los debuffs de defensa se aplicaron al valor absoluto de defensa; al
        // purificarlos hay que revertir esa reducción, además de retirar el estado.
        jugadorDefensa += eliminados.reduce(
          (total, efecto) => total + (efecto.tipo === "debuff_defensa" ? efecto.valor : 0),
          0,
        );
        efectosJugadorActualizados = efectosPrevios.filter((efecto) => !tiposNegativos.includes(efecto.tipo));
      }
      return {
        accion: presentarAccion(crearAccion({
          actor: "jugador", tipo: "habilidad",
          animacion: habilidad.animacion ?? "curacion", critico: esCritico, curacion: curado,
          texto: `✨ Usas ${habilidad.nombre} y recuperas ${curado} HP.${habilidad.limpiarEstadosNegativos ? " Los perjuicios han sido purificados." : ""}`,
        })),
        jugadorHp, jugadorDefensa, enemigoDefensa, efectos, efectosJugadorActualizados,
      };
    }

    case "curacion_progresiva": {
      agregarEstado({
        tipo: "curacion_progresiva",
        valor: habilidad.curacionProgresivaPorcentaje ?? 0,
        duracionTurnos: habilidad.duracionTurnos ?? 1,
        objetivo: "jugador",
      });
      return {
        accion: presentarAccion(crearAccion({
          actor: "jugador", tipo: "habilidad", animacion: habilidad.animacion ?? "curacion",
          texto: `✨ Usas ${habilidad.nombre}; la curación progresiva durará ${habilidad.duracionTurnos ?? 1} turnos.`,
        })),
        jugadorHp, jugadorDefensa, enemigoDefensa, efectos,
      };
    }

    case "bonus_defensa": {
      const porcentaje = habilidad.bonusDefensaPorcentaje ?? 0;
      const bonus = porcentaje > 0
        ? Math.max(1, Math.floor(jugadorDefensa * porcentaje))
        : Math.max(0, habilidad.bonusDefensa ?? 0);
      jugadorDefensa += bonus;
      efectos.push({
        habilidadId: habilidad.id, tipo: "bonus_defensa", valor: bonus,
        duracionTurnos: Math.max(1, habilidad.duracionTurnos ?? 1),
        turnosRestantes: Math.max(1, habilidad.duracionTurnos ?? 1), objetivo: "jugador",
      });
      agregarEstadosExtra();
      return {
        accion: presentarAccion(crearAccion({
          actor: "jugador", tipo: "habilidad", animacion: habilidad.animacion ?? "defensiva",
          texto: `🛡️ Usas ${habilidad.nombre}. Tu defensa aumenta en ${bonus} durante ${habilidad.duracionTurnos ?? 1} turnos.`,
        })),
        jugadorHp, jugadorDefensa, enemigoDefensa, efectos,
      };
    }

    case "bonus_ataque_magico": {
      agregarEstadosExtra();
      return {
        accion: presentarAccion(crearAccion({
          actor: "jugador", tipo: "habilidad", animacion: habilidad.animacion ?? "defensiva",
          texto: `✨ Usas ${habilidad.nombre}. Tu poder mágico aumenta temporalmente.`,
        })),
        jugadorHp, jugadorDefensa, enemigoDefensa, efectos,
      };
    }

    default:
      throw new Error(`El efecto ${habilidad.efecto} de la habilidad ${habilidad.id} no tiene una resolución definida.`);
  }
}
