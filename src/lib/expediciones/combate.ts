import type { DefinicionHabilidad } from "@/lib/tiposJuego";

export interface AccionAnimadaCombate {
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
  texto: string;
}

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
const d6 = () => Math.floor(Math.random() * 6) + 1;

export function resolverAtaqueJugador(combate: {
  jugadorAtaque: number;
  jugadorNivel: number;
  enemigoDefensa: number;
  enemigoNombre: string;
}): AccionAnimadaCombate {
  const dado = d20();

  if (dado === 20) {
    const dano = Math.max(
      1,
      (combate.jugadorAtaque + d6()) * 2 - combate.enemigoDefensa
    );

    return {
      actor: "jugador",
      tipo: "ataque",
      animacion: "ofensiva",
      dano,
      critico: true,
      texto: `💥 ¡Golpe crítico! Atacas a ${combate.enemigoNombre} e infliges ${dano} de daño.`,
    };
  }

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

  const umbralAcierto = 2;

  if (dado < umbralAcierto) {
    return {
      actor: "jugador",
      tipo: "fallo",
      animacion: "ofensiva",
      dano: 0,
      critico: false,
      texto: `💨 ${combate.enemigoNombre} esquiva tu ataque.`,
    };
  }

  const variacion = 0.8 + Math.random() * 0.4;

  const danoBase =
    Math.floor(combate.jugadorAtaque * variacion) + combate.jugadorNivel;

  const dano = Math.max(1, danoBase - Math.floor(combate.enemigoDefensa / 2));

  return {
    actor: "jugador",
    tipo: "ataque",
    animacion: "ofensiva",
    dano,
    critico: false,
    texto: `⚔️ Atacas a ${combate.enemigoNombre} e infliges ${dano} de daño.`,
  };
}

export function resolverAtaqueEnemigo(combate: {
  enemigoAtaque: number;
  jugadorDefensa: number;
  enemigoNombre: string;
}): AccionAnimadaCombate {
  const dado = d20();

  if (dado === 20) {
    const dano = Math.max(
      1,
      (combate.enemigoAtaque + d6()) * 2 - combate.jugadorDefensa
    );

    return {
      actor: "enemigo",
      dano,
      tipo: "ataque" as const,
      animacion: "ofensiva",
      critico: true,
      texto: `💥 ¡Golpe crítico! ${combate.enemigoNombre} inflige ${dano} de daño.`,
    };
  }

  if (dado === 1) {
    return {
      actor: "enemigo",
      dano: 0,
      tipo: "fallo" as const,
      animacion: "ofensiva",
      critico: false,
      texto: `🤡 ${combate.enemigoNombre} falla su ataque.`,
    };
  }

  const variacion = 0.8 + Math.random() * 0.4;

  const danoBase = Math.floor(combate.enemigoAtaque * variacion) + 1;

  const dano = Math.max(1, danoBase - Math.floor(combate.jugadorDefensa / 2));

  return {
    actor: "enemigo",
    dano,
    tipo: "ataque" as const,
    animacion: "ofensiva",
    critico: false,
    texto: `🩸 ${combate.enemigoNombre} golpea y causa ${dano} de daño.`,
  };
}

interface CombateParaHabilidad {
  jugadorAtaque: number;
  jugadorDefensa: number;
  jugadorNivel: number;
  jugadorHp: number;
  jugadorHpMaximo: number;
  enemigoDefensa: number;
  enemigoNombre: string;
}

export interface ResultadoHabilidad {
  accion: AccionAnimadaCombate;
  jugadorHp: number;
  jugadorDefensa: number;
  efecto?: {
    habilidadId: string;
    tipo: "bonus_defensa";
    valor: number;
    turnosRestantes: number;
  };
}

export function resolverHabilidadJugador(
  habilidad: DefinicionHabilidad,
  combate: CombateParaHabilidad
): ResultadoHabilidad {
  if (habilidad.id === "golpe_poderoso") {
    const dado = d20();

    if (dado === 20) {
      const multiplicador = habilidad.multiplicadorDano ?? 1;

      const danoBase = Math.floor(
        (combate.jugadorAtaque + d6()) * multiplicador
      );

      const dano = Math.max(1, danoBase * 2 - combate.enemigoDefensa);

      return {
        accion: {
          actor: "jugador",
          tipo: "habilidad",
          dano,
          animacion: "ofensiva_potenciada",
          critico: true,
          texto: `💥 ¡Golpe Poderoso crítico! Atacas a ${combate.enemigoNombre} e infliges ${dano} de daño.`,
        },
        jugadorHp: combate.jugadorHp,
        jugadorDefensa: combate.jugadorDefensa,
      };
    }

    if (dado === 1) {
      return {
        accion: {
          actor: "jugador",
          tipo: "fallo",
          animacion: "ofensiva",
          critico: false,
          dano: 0,
          texto: `🤡 Pifia. Fallas el Golpe Poderoso contra ${combate.enemigoNombre}.`,
        },
        jugadorHp: combate.jugadorHp,
        jugadorDefensa: combate.jugadorDefensa,
      };
    }

    const variacion = 0.8 + Math.random() * 0.4;

    const danoBase =
      Math.floor(
        combate.jugadorAtaque * variacion * (habilidad.multiplicadorDano ?? 1)
      ) + combate.jugadorNivel;

    const dano = Math.max(1, danoBase - Math.floor(combate.enemigoDefensa / 2));

    return {
      accion: {
        actor: "jugador",
        tipo: "habilidad",
        animacion: "ofensiva",
        critico: false,
        dano,
        texto: `⚔️ Usas Golpe Poderoso contra ${combate.enemigoNombre} e infliges ${dano} de daño.`,
      },
      jugadorHp: combate.jugadorHp,
      jugadorDefensa: combate.jugadorDefensa,
    };
  }

  if (habilidad.id === "golpe_preciso") {
    const dado = d20();

    if (dado === 1) {
      return {
        accion: {
          actor: "jugador",
          tipo: "fallo",
          animacion: "ofensiva",
          critico: false,
          dano: 0,
          texto: `🤡 Pifia. Fallas el Golpe Preciso contra ${combate.enemigoNombre}.`,
        },
        jugadorHp: combate.jugadorHp,
        jugadorDefensa: combate.jugadorDefensa,
      };
    }

    const esCritico =
      dado === 20 || Math.random() < (habilidad.probabilidad ?? 0);

    const variacion = 0.8 + Math.random() * 0.4;

    const danoBase =
      Math.floor(
        combate.jugadorAtaque * variacion * (habilidad.multiplicadorDano ?? 1)
      ) + combate.jugadorNivel;

    const dano = Math.max(1, danoBase - Math.floor(combate.enemigoDefensa / 2));

    if (esCritico) {
      const danoCritico = Math.max(1, dano * 2);

      return {
        accion: {
          actor: "jugador",
          tipo: "habilidad",
          animacion: "ofensiva_potenciada",
          critico: true,
          dano: danoCritico,
          texto: `🎯 ¡Golpe Preciso crítico! Infliges ${danoCritico} de daño a ${combate.enemigoNombre}.`,
        },
        jugadorHp: combate.jugadorHp,
        jugadorDefensa: combate.jugadorDefensa,
      };
    }

    return {
      accion: {
        actor: "jugador",
        tipo: "habilidad",
        animacion: "ofensiva",
        critico: false,
        dano,
        texto: `🎯 Usas Golpe Preciso e infliges ${dano} de daño a ${combate.enemigoNombre}.`,
      },
      jugadorHp: combate.jugadorHp,
      jugadorDefensa: combate.jugadorDefensa,
    };
  }

  if (habilidad.id === "ataque_devastador") {
    const dado = d20();

    if (dado === 1) {
      return {
        accion: {
          actor: "jugador",
          tipo: "fallo",
          dano: 0,
          animacion: "ofensiva",
          critico: false,
          texto: `🤡 Pifia. El Ataque Devastador falla contra ${combate.enemigoNombre}.`,
        },
        jugadorHp: combate.jugadorHp,
        jugadorDefensa: combate.jugadorDefensa,
      };
    }

    const variacion = 0.8 + Math.random() * 0.4;

    const danoBase =
      Math.floor(
        combate.jugadorAtaque * variacion * (habilidad.multiplicadorDano ?? 1)
      ) + combate.jugadorNivel;

    const danoNormal = Math.max(
      1,
      danoBase - Math.floor(combate.enemigoDefensa / 2)
    );

    const dano = dado === 20 ? Math.max(1, danoNormal * 1.5) : danoNormal;

    return {
      accion: {
        actor: "jugador",
        tipo: "habilidad",
        animacion: "ofensiva_potenciada",
        critico: dado === 20,
        dano,
        texto:
          dado === 20
            ? `💥 ¡Ataque Devastador crítico! Infliges ${dano} de daño a ${combate.enemigoNombre}.`
            : `💢 ¡Ataque Devastador! Infliges ${dano} de daño a ${combate.enemigoNombre}.`,
      },
      jugadorHp: combate.jugadorHp,
      jugadorDefensa: combate.jugadorDefensa,
    };
  }

  if (habilidad.id === "curacion" || habilidad.id === "segundo_aire") {
    const dado = d20();
    const critico = dado === 20;

    const cantidad = critico
      ? (habilidad.curacion ?? 0) * 1.5
      : habilidad.curacion ?? 0;

    const vidaNueva = Math.min(
      combate.jugadorHpMaximo,
      combate.jugadorHp + cantidad
    );

    const curado = vidaNueva - combate.jugadorHp;

    return {
      accion: {
        actor: "jugador",
        tipo: "habilidad",
        animacion: "curacion",
        critico: critico,
        dano: 0,
        curacion: curado,
        texto: `✨ Usas ${habilidad.nombre} y recuperas ${curado} HP.`,
      },
      jugadorHp: vidaNueva,
      jugadorDefensa: combate.jugadorDefensa,
    };
  }

  if (habilidad.id === "defensa_ferrea") {
    const bonus = habilidad.bonusDefensa ?? 0;
    const duracion = habilidad.duracionTurnos ?? 0;

    return {
      accion: {
        actor: "jugador",
        tipo: "habilidad",
        animacion: "defensiva",
        critico: false,
        dano: 0,
        texto: `🛡️ Usas Defensa Férrea. Tu defensa aumenta en ${bonus} durante ${duracion} turnos.`,
      },
      jugadorHp: combate.jugadorHp,
      jugadorDefensa: combate.jugadorDefensa + bonus,
      efecto: {
        habilidadId: habilidad.id,
        tipo: "bonus_defensa",
        valor: bonus,
        turnosRestantes: duracion,
      },
    };
  }

  throw new Error(
    `La habilidad ${habilidad.id} no tiene una resolución de combate definida.`
  );
}
