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
  jugadorProbCritico: number;
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
  if (!habilidad.efecto) {
    throw new Error(
      `La habilidad ${habilidad.id} no tiene un efecto de combate definido.`
    );
  }
  //calcular diferencias de nivel para aumentar prob critico o pifia, no daño directo
  const probabilidadCritico = Math.min(
    1,
    combate.jugadorProbCritico + (habilidad.probabilidadCritico ?? 0)
  );

  switch (habilidad.efecto) {
    case "dano": {
      const dado = d20();

      if (dado === 1) {
        const animacion =
          habilidad.animacion === "ofensiva_potenciada"
            ? "ofensiva_potenciada"
            : "ofensiva";

        return {
          accion: crearAccion({
            actor: "jugador",
            tipo: "fallo",
            animacion,
            texto: `🤡 Pifia. Fallas ${habilidad.nombre} contra ${combate.enemigoNombre}.`,
          }),
          jugadorHp: combate.jugadorHp,
          jugadorDefensa: combate.jugadorDefensa,
        };
      }

      const variacion = 0.8 + Math.random() * 0.4;

      const danoBase = Math.floor(
        combate.jugadorAtaque * variacion * (habilidad.multiplicadorDano ?? 1)
      );

      const danoNormal = Math.max(
        1,
        danoBase - Math.floor(combate.enemigoDefensa / 2)
      );

      const esCritico = dado === 20 || Math.random() < probabilidadCritico;

      const multiplicadorCritico = habilidad.multiplicadorCritico ?? 2;

      const dano = esCritico
        ? Math.max(1, Math.floor(danoNormal * multiplicadorCritico))
        : danoNormal;

      const animacion =
        esCritico && habilidad.animacion === "ofensiva"
          ? "ofensiva_potenciada"
          : habilidad.animacion ?? "ofensiva";

      return {
        accion: crearAccion({
          actor: "jugador",
          tipo: "habilidad",
          animacion,
          dano,
          critico: esCritico,
          texto: esCritico
            ? `💥 ¡${habilidad.nombre} crítico! Infliges ${dano} de daño a ${combate.enemigoNombre}.`
            : `⚔️ Usas ${habilidad.nombre} e infliges ${dano} de daño a ${combate.enemigoNombre}.`,
        }),
        jugadorHp: combate.jugadorHp,
        jugadorDefensa: combate.jugadorDefensa,
      };
    }

    case "curacion": {
      const dado = d20();
      const esCritico = dado === 20 || Math.random() < probabilidadCritico;

      const cantidadBase = habilidad.curacion ?? 0;

      const multiplicadorCritico = habilidad.multiplicadorCritico ?? 1.5;

      const cantidad = esCritico
        ? Math.floor(cantidadBase * multiplicadorCritico)
        : cantidadBase;

      const vidaNueva = Math.min(
        combate.jugadorHpMaximo,
        combate.jugadorHp + cantidad
      );

      const curado = vidaNueva - combate.jugadorHp;

      return {
        accion: crearAccion({
          actor: "jugador",
          tipo: "habilidad",
          animacion: habilidad.animacion ?? "curacion",
          critico: esCritico,
          curacion: curado,
          texto: esCritico
            ? `✨ ¡${habilidad.nombre} crítico! Recuperas ${curado} HP.`
            : `✨ Usas ${habilidad.nombre} y recuperas ${curado} HP.`,
        }),
        jugadorHp: vidaNueva,
        jugadorDefensa: combate.jugadorDefensa,
      };
    }

    case "bonus_defensa": {
      const bonus = habilidad.bonusDefensa ?? 0;
      const duracion = habilidad.duracionTurnos ?? 0;

      return {
        accion: crearAccion({
          actor: "jugador",
          tipo: "habilidad",
          animacion: habilidad.animacion ?? "defensiva",
          texto: `🛡️ Usas ${habilidad.nombre}. Tu defensa aumenta en ${bonus} durante ${duracion} turnos.`,
        }),
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

    default:
      throw new Error(
        `El efecto ${habilidad.efecto} de la habilidad ${habilidad.id} no tiene una resolución definida.`
      );
  }
}
