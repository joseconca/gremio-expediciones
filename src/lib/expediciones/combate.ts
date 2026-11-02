import type { DefinicionHabilidad, PresentacionVisualCombate } from "@/lib/tiposJuego";
import { obtenerPresentacionProyectilHabilidad } from "./presentacion-combate";
import {
  d20,
  falloPorPrecision,
  calcularDanoMitigado,
  calcularProbabilidadImpacto,
} from "./ataques-basicos";

/** API de compatibilidad para los servicios y pruebas existentes. */
export {
  calcularDanoMitigado,
  calcularProbabilidadImpacto,
  resolverAtaqueJugador,
  resolverAtaqueEnemigo,
} from "./ataques-basicos";
import { aplicarBarreraAccion, aplicarResistenciaPerjuicio, calcularDefensaTactica } from "./estados-combate";
import { actualizarRelojContexto, aplicarMecanicasHabilidad, prepararHabilidadRedisenada } from "./mecanicas-habilidades";
import { resolverTecnicaAdicional, type ContextoTecnicaTactica } from "./adaptador-tactico";

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
  /** Visual hint only; it never participates in combat resolution. */
  accionSprite?: "use_consumable";

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

export function calcularBonusDefensaMuralla(
  murallaNivel: number | null | undefined
): number {
  const nivel = Math.max(0, murallaNivel ?? 0);
  if (nivel >= 1) {
    return 5 + nivel * 5;
  }
  return 0;
}

interface CombateParaHabilidad {
  baseCuracionHpMaximo?: number;
  contextoTactico?: ContextoTecnicaTactica;
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
  efectosEnemigo?: import("@/lib/tiposJuego").EstadoEfectoHabilidad[];
}

export interface ResultadoHabilidad {
  actorDefensaActualizada?: number;
  impactoBloqueado?: boolean;
  recursosRecuperados?: { energia: number; mana: number };
  efectosEnemigoActualizados?: import("@/lib/tiposJuego").EstadoEfectoHabilidad[];
  efectosActorActualizados?: import("@/lib/tiposJuego").EstadoEfectoHabilidad[];
  actorHpActualizado?: number;
  filaActorActualizada?: number;
  accion: AccionAnimadaCombate;
  jugadorHp: number;
  jugadorDefensa: number;
  enemigoDefensa: number;
  efectos: import("@/lib/tiposJuego").EstadoEfectoHabilidad[];
  efectosJugadorActualizados?: import("@/lib/tiposJuego").EstadoEfectoHabilidad[];
}

function resolverHabilidadBase(
  habilidad: DefinicionHabilidad,
  combate: CombateParaHabilidad,
): ResultadoHabilidad {
  if (habilidad.programaTactico) {
    if (!combate.contextoTactico) throw new Error("FALTA_CONTEXTO_TACTICO");
    const c = combate.contextoTactico;
    const r = resolverTecnicaAdicional(habilidad,c);
    const propios = r.efectosActor.map(e => ({ ...e, objetivo: "jugador" as const }));
    const delObjetivo = r.efectosObjetivo.map(e => ({ ...e, objetivo: c.objetivoAliado ? "jugador" as const : "enemigo" as const }));
    return {
      accion: r.accion,
      jugadorHp: c.objetivoAliado ? r.objetivoHp : r.actorHp,
      jugadorDefensa: combate.jugadorDefensa, enemigoDefensa: combate.enemigoDefensa, efectos: [],
      efectosActorActualizados: propios, actorHpActualizado: r.actorHp, filaActorActualizada: r.filaActor,
      ...(c.objetivoAliado ? { efectosJugadorActualizados: delObjetivo } : { efectosJugadorActualizados: propios, efectosEnemigoActualizados: delObjetivo }),
    };
  }
  if (!habilidad.efecto) throw new Error(`La habilidad ${habilidad.id} no tiene un efecto de combate definido.`);

  let jugadorHp = combate.jugadorHp;
  let jugadorDefensa = combate.jugadorDefensa;
  let enemigoDefensa = combate.enemigoDefensa;
  const efectos: import("@/lib/tiposJuego").EstadoEfectoHabilidad[] = [];
  const bonusCuracion = Math.max(0, combate.bonusCuracion ?? 0);
  const ataqueMagico = combate.jugadorAtaqueMagico ?? combate.jugadorAtaque;
  const escalado = habilidad.escaladoDano ?? habilidad.tipoDano;
  const ataqueEfectivo = escalado === "polivalente" ? combate.jugadorAtaque + ataqueMagico : escalado === "magico"
    ? ataqueMagico
    : escalado === "hibrido"
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
      valor = Math.max(1, Math.floor((combate.baseCuracionHpMaximo ?? combate.jugadorHpMaximo) * estado.valor * (1 + bonusCuracion)));
    } else if (estado.tipo === "bonus_defensa") {
      const defensaBase = objetivo === "jugador" ? jugadorDefensa : enemigoDefensa;
      valor = Math.max(1, Math.floor(defensaBase * estado.valor));
    } else if (estado.tipo === "debuff_defensa") {
      const defensaBase = objetivo === "jugador" ? jugadorDefensa : enemigoDefensa;
      valor = Math.max(1, Math.floor(defensaBase * estado.valor));
    }

    if(estado.tipo.startsWith("debuff_")||estado.tipo==="dano_progresivo")valor=aplicarResistenciaPerjuicio(valor,objetivo==="jugador"?(combate.efectosJugador??[]):(combate.efectosEnemigo??[]));
    if(estado.tipo==="dano_progresivo")valor=Math.max(1,Math.floor(valor));
    if (estado.tipo === "bonus_defensa" && objetivo === "jugador") jugadorDefensa += valor;
    if (estado.tipo === "bonus_defensa" && objetivo === "enemigo") enemigoDefensa += valor;
    if (estado.tipo === "debuff_defensa" && objetivo === "jugador") jugadorDefensa = Math.max(0, jugadorDefensa - valor);
    if (estado.tipo === "debuff_defensa" && objetivo === "enemigo") enemigoDefensa = Math.max(0, enemigoDefensa - valor);

    efectos.push({
      habilidadId: habilidad.id,
      creadorId: combate.contextoTactico?.actorId,
      ...(estado.tipo==="dano_progresivo"?{familia:["espadachin","berserker","saqueador"].includes(habilidad.claseId??"")?"sangrado":habilidad.claseId==="asesino"?"veneno":habilidad.disenoActiva?.elemento??habilidad.claseId}:{}),
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
      const defensaSinRuptura = habilidad.tipoDano === "magico"
        ? defensaMagica
        : habilidad.tipoDano === "hibrido"
          ? Math.floor((enemigoDefensa + defensaMagica) / 2)
          : enemigoDefensa;
      const defensa = calcularDefensaTactica(defensaSinRuptura,combate.efectosEnemigo??[]) * (1-(habilidad.rupturaDefensaTemporal??0));
      const danoBase = Math.floor(ataqueEfectivo * variacion * (habilidad.multiplicadorDano ?? 1));
      const danoNormal = calcularDanoMitigado(danoBase, defensa);
      const esCritico = dado === 20 || Math.random() < probabilidadCritico;
      const multiplicadorCritico = (combate.jugadorDanoCritico ?? 1.5) + (habilidad.multiplicadorCritico ?? 0);
      let dano = esCritico ? Math.max(1, Math.floor(danoNormal * multiplicadorCritico)) : danoNormal;
      const impacto = { dano, critico: esCritico, texto: "" };
      aplicarBarreraAccion(impacto, combate.efectosEnemigo ?? []);
      const bloqueado = impacto.dano === 0 && dano > 0;
      dano = impacto.dano;

      if ((habilidad.roboVida ?? 0) > 0) {
        const efectivo=habilidad.versionReglas===2?Math.min(dano,combate.contextoTactico?.objetivoHp??dano):dano;
        const robo = Math.min(habilidad.versionReglas===2?Math.floor(combate.jugadorHpMaximo*.08):Infinity,Math.max(0, Math.floor(efectivo * Math.min(habilidad.versionReglas===2?.2:1, habilidad.roboVida!) * (1 + bonusCuracion))));
        jugadorHp += Math.min(robo, Math.max(0, combate.jugadorHpMaximo - jugadorHp));
      }
      if (!bloqueado) agregarEstadosExtra();
      return {
        accion: presentarAccion(crearAccion({
          actor: "jugador", tipo: "habilidad",
          animacion: esCritico && habilidad.animacion === "ofensiva" ? "ofensiva_potenciada" : habilidad.animacion ?? "ofensiva",
          dano, critico: impacto.critico,
          curacion: jugadorHp > combate.jugadorHp ? jugadorHp - combate.jugadorHp : undefined,
          texto: bloqueado ? impacto.texto : esCritico
            ? `💥 ¡${habilidad.nombre} crítico! Infliges ${dano} de daño a ${combate.enemigoNombre}.`
            : `⚔️ Usas ${habilidad.nombre} e infliges ${dano} de daño a ${combate.enemigoNombre}.`,
        })),
        jugadorHp, jugadorDefensa, enemigoDefensa, efectos, impactoBloqueado:bloqueado,
      };
    }

    case "curacion": {
      const multiplicadorCritico = Math.max(1, habilidad.multiplicadorCritico ?? 1);
      const dado = multiplicadorCritico > 1 ? d20() : 0;
      const esCritico = multiplicadorCritico > 1 &&
        (dado === 20 || Math.random() < probabilidadCritico);
      const cantidadBase = habilidad.curacionPorcentaje !== undefined
        ? Math.floor((combate.baseCuracionHpMaximo ?? combate.jugadorHpMaximo) * habilidad.curacionPorcentaje)
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

    case "estado":
    case "bonus_ataque_magico": {
      agregarEstadosExtra();
      return {
        accion: presentarAccion(crearAccion({
          actor: "jugador", tipo: "habilidad", animacion: habilidad.animacion ?? "defensiva",
          texto: `✨ Usas ${habilidad.nombre}. ${habilidad.descripcion}`,
        })),
        jugadorHp, jugadorDefensa, enemigoDefensa, efectos,
      };
    }

    default:
      throw new Error(`El efecto ${habilidad.efecto} de la habilidad ${habilidad.id} no tiene una resolución definida.`);
  }
}

/** Punto único para los servicios individual, party y PvP. */
export function resolverHabilidadJugador(habilidad:DefinicionHabilidad, combate:CombateParaHabilidad):ResultadoHabilidad {
  if(habilidad.versionReglas!==2)return resolverHabilidadBase(habilidad,combate);
  const aliado=habilidad.objetivo?.equipo!=="enemigo"&&habilidad.efecto!=="dano";
  const contexto=combate.contextoTactico??{
    actorId:"actor",objetivoId:aliado?"actor":"objetivo",claseId:habilidad.claseId??"novato",ciclo:1,
    actorHp:combate.jugadorHp,actorHpMaximo:combate.jugadorHpMaximo,energia:100,energiaMaxima:100,mana:100,manaMaximo:100,
    ataque:combate.jugadorAtaque,ataqueMagico:combate.jugadorAtaqueMagico??combate.jugadorAtaque,
    defensaActor:combate.jugadorDefensa,defensaMagicaActor:combate.jugadorDefensaMagica??combate.jugadorDefensa,
    efectosActor:combate.efectosJugador??[],objetivoHp:aliado?combate.jugadorHp:1e9,objetivoHpMaximo:aliado?combate.jugadorHpMaximo:1e9,
    defensaObjetivo:aliado?combate.jugadorDefensa:combate.enemigoDefensa,defensaMagicaObjetivo:aliado?(combate.jugadorDefensaMagica??combate.jugadorDefensa):(combate.enemigoDefensaMagica??combate.enemigoDefensa),
    efectosObjetivo:aliado?(combate.efectosJugador??[]):(combate.efectosEnemigo??[]),objetivoAliado:aliado,filaActor:1,filaObjetivo:1,
  };
  const c=actualizarRelojContexto(contexto);
  const preparada=prepararHabilidadRedisenada(habilidad,c);
  const base=resolverHabilidadBase(preparada,{...combate,contextoTactico:c,efectosEnemigo:c.objetivoAliado?combate.efectosEnemigo:c.efectosObjetivo,baseCuracionHpMaximo:(c.numeroObjetivos??1)>1?c.actorHpMaximo:combate.baseCuracionHpMaximo});
  return aplicarMecanicasHabilidad(habilidad,c,base);
}
