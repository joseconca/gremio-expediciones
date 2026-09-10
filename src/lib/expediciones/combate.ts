export interface AccionAnimadaCombate {
  actor: "jugador" | "enemigo";
  tipo: "ataque" | "fallo" | "critico";
  dano: number;
  texto: string;
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
      dano,
      tipo: "critico" as const,
      texto: `💥 ¡Golpe crítico! Atacas a ${combate.enemigoNombre} e infliges ${dano} de daño.`,
    };
  }

  if (dado === 1) {
    return {
      actor: "jugador",
      dano: 0,
      tipo: "fallo" as const,
      texto: `🤡 Pifia. Fallas tu ataque contra ${combate.enemigoNombre}.`,
    };
  }

  const umbralAcierto = 2;

  if (dado < umbralAcierto) {
    return {
      actor: "jugador",
      dano: 0,
      tipo: "fallo" as const,
      texto: `💨 ${combate.enemigoNombre} esquiva tu ataque.`,
    };
  }

  const variacion = 0.8 + Math.random() * 0.4;

  const danoBase =
    Math.floor(combate.jugadorAtaque * variacion) + combate.jugadorNivel;

  const dano = Math.max(1, danoBase - Math.floor(combate.enemigoDefensa / 2));

  return {
    actor: "jugador",
    dano,
    tipo: "ataque" as const,
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
      tipo: "critico" as const,
      texto: `💥 ¡Golpe crítico! ${combate.enemigoNombre} inflige ${dano} de daño.`,
    };
  }

  if (dado === 1) {
    return {
      actor: "enemigo",
      dano: 0,
      tipo: "fallo" as const,
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
    texto: `🩸 ${combate.enemigoNombre} golpea y causa ${dano} de daño.`,
  };
}
