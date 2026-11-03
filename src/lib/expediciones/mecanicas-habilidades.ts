import type { DefinicionHabilidad } from "../tiposJuego";
import type { ResultadoHabilidad } from "./combate";
import { convertirEstadosTacticos, exportarEstadosTacticos, type ContextoTecnicaTactica } from "./adaptador-tactico";
import { aplicarEstadoTactico, curarTactico, devolverRecursoTactico, ejecutarComandosTacticos } from "./combate/tacticas/motor-tactico";
import type { FamiliaTactica, MundoTactico, UnidadTactica } from "./combate/tacticas/tipos-tacticos";
import type { OperacionHabilidad, ReglaPasiva } from "../progresion/diseno-habilidades";
import { obtenerEstadosTacticos as tacticos } from "./preparacion-habilidades";

// Mantener la API de preparacion anterior para los importadores existentes.
export { actualizarRelojContexto, prepararHabilidadRedisenada } from "./preparacion-habilidades";

/** Verifica las condiciones tácticas de las pasivas; no modifica el mundo. */
function esCondicion(
  regla: ReglaPasiva,
  habilidad: DefinicionHabilidad,
  contexto: ContextoTecnicaTactica,
  resultado: ResultadoHabilidad,
  mundo: MundoTactico,
  limpiezas: number,
  disipaciones: number
): boolean {
  const operaciones = habilidad.disenoActiva?.operaciones ?? [];
  const hay = (tipo: OperacionHabilidad["tipo"]) => operaciones.some((op) => op.tipo === tipo);
  const anterior = tacticos(contexto.efectosActor).find((e) => e.clave === "_historial");
  const hostil = !contexto.objetivoAliado;
  const exito = resultado.accion.tipo !== "fallo";
  switch (regla.condicion) {
    case "ataque":
      return hostil&&resultado.accion.dano>0;
    case "apoyo":
      return contexto.objetivoAliado&&exito;
    case "cura_efectiva":
      return contexto.objetivoAliado&&(resultado.accion.curacion??0)>0;
    case "herida":
      return (!!habilidad.danoProgresivoPorcentaje&&resultado.accion.dano>0&&!resultado.impactoBloqueado)||operaciones.some(o=>o.tipo==="adelantar"&&o.familia==="herida")&&mundo.eventos.some(e=>e.tipo==="dano");
    case "regeneracion":
      return habilidad.efecto==="curacion_progresiva"||operaciones.some(o=>o.tipo==="adelantar"&&o.familia==="regeneracion");
    case "guardia":
      return hay("guardia_porcentaje")||hay("transferir")||!!habilidad.disenoActiva?.barrera;
    case "ruptura":
      return operaciones.some(o=>o.tipo==="consumir_preparacion"&&o.efecto==="ruptura")&&mundo.eventos.some(e=>e.tipo==="consumo");
    case "disipacion":
      return disipaciones>0;
    case "limpieza":
      return limpiezas>0;
    case "movilidad":
      return hay("mover");
    case "invocacion":
      return hay("invocar")&&mundo.unidades[0].estados.some(e=>e.familia==="acompanante"&&e.fuenteId===habilidad.id);
    case "orden":
      return hay("ordenar")&&mundo.unidades[0].limites.pulsoAcompanante===contexto.ciclo&&!contexto.efectosActor.some(e=>e.datosTacticos?.limites.pulsoAcompanante===contexto.ciclo);
    case "sacrificio":
      return hay("sacrificar")&&mundo.eventos.some(e=>e.tipo==="consumo");
    case "pacto":
      return hay("pacto")&&mundo.eventos.some(e=>e.tipo==="recurso"&&e.detalle==="vida_comprometida"&&e.cantidad>0);
    case "reaccion":
      return hay("reaccion")&&mundo.eventos.some(e=>e.tipo==="consumo");
    case "preparacion":
      return operaciones.some(o=>o.tipo==="estado"&&o.familia==="preparacion");
    case "consumo":
      return mundo.eventos.some(e=>e.tipo==="consumo");
    case "alternar":
      return !!anterior&&anterior.valor!==(hostil?1:0);
    case "cambiar_objetivo":
      return !!anterior&&anterior.destinatarioId!==contexto.objetivoId;
    case "objetivo_herido":
      return contexto.objetivoHp<contexto.objetivoHpMaximo*.5;
    case "vida_baja":
      return contexto.actorHp<contexto.actorHpMaximo*.3;
    case "enemigo_protegido":
      return hostil&&contexto.efectosObjetivo.some(e=>e.tipo==="barrera"||e.tipo==="bonus_defensa"||e.datosTacticos?.estados.some(s=>s.familia==="guardia"));
    case "objetivo_marcado":
      return tacticos(contexto.efectosObjetivo).some(e=>e.creadorId===contexto.actorId&&!e.clave.startsWith("_")&&["marca","sello"].includes(e.familia));
    case "energia_baja":
      return contexto.energia-(habilidad.costeEnergia??0)<contexto.energiaMaxima*.3;
    case "mana_bajo":
      return contexto.manaMaximo>0&&contexto.mana-(habilidad.costeMana??0)<contexto.manaMaximo*.3;
    case "coste_mixto":
      return !!habilidad.costeEnergia&&!!habilidad.costeMana;
    case "area":
      return (contexto.numeroObjetivos??1)>1;
    case "fila_propia":
      return contexto.objetivoAliado&&contexto.filaActor===contexto.filaObjetivo;
    case "sobrecuracion":
      return contexto.objetivoAliado&&habilidad.efecto==="curacion"&&contexto.objetivoHp<contexto.objetivoHpMaximo&&contexto.objetivoHp+(contexto.objetivoHpMaximo*(habilidad.curacionPorcentaje??0))>contexto.objetivoHpMaximo;
  }
}

/** Aplica las operaciones tácticas después de resolver la acción principal. */
export function aplicarMecanicasHabilidad(
  habilidad: DefinicionHabilidad,
  contexto: ContextoTecnicaTactica,
  resultadoBase: ResultadoHabilidad
): ResultadoHabilidad {
  for (const efecto of resultadoBase.efectos) efecto.creadorId = contexto.actorId;

  const propio = contexto.actorId === contexto.objetivoId;
  let efectosActor = resultadoBase.efectosActorActualizados ??
    (contexto.objetivoAliado && !propio
      ? contexto.efectosActor
      : (resultadoBase.efectosJugadorActualizados ?? contexto.efectosActor));
  let efectosObjetivo = resultadoBase.efectosEnemigoActualizados ??
    (contexto.objetivoAliado
      ? (resultadoBase.efectosJugadorActualizados ?? contexto.efectosObjetivo)
      : contexto.efectosObjetivo);

  if (propio) {
    // Actor y objetivo comparten los mismos efectos en las acciones propias.
    efectosActor = efectosObjetivo = [
      ...efectosActor,
      ...resultadoBase.efectos.filter((efecto) => efecto.objetivo !== "enemigo"),
    ];
  } else {
    efectosObjetivo = [
      ...efectosObjetivo,
      ...resultadoBase.efectos.filter((efecto) =>
        contexto.objetivoAliado ? efecto.objetivo !== "enemigo" : efecto.objetivo === "enemigo"
      ),
    ];
  }

  const crearUnidad = (esActor: boolean): UnidadTactica => {
    const efectos = esActor ? efectosActor : efectosObjetivo;
    const id = esActor ? contexto.actorId : contexto.objetivoId;
    return {
      id,
      equipo: esActor || contexto.objetivoAliado ? "aliado" : "enemigo",
      hp: esActor
        ? (resultadoBase.actorHpActualizado ??
          (contexto.objetivoAliado && !propio ? contexto.actorHp : resultadoBase.jugadorHp))
        : (contexto.objetivoAliado
          ? resultadoBase.jugadorHp
          : Math.max(0, contexto.objetivoHp - resultadoBase.accion.dano)),
      hpMaximo: esActor ? contexto.actorHpMaximo : contexto.objetivoHpMaximo,
      energia: esActor ? Math.max(0, contexto.energia - (habilidad.costeEnergia ?? 0)) : 0,
      energiaMaxima: esActor ? contexto.energiaMaxima : 100,
      mana: esActor ? Math.max(0, contexto.mana - (habilidad.costeMana ?? 0)) : 0,
      manaMaximo: esActor ? contexto.manaMaximo : 10,
      ataque: contexto.ataque,
      ataqueMagico: contexto.ataqueMagico,
      defensa: esActor ? contexto.defensaActor : contexto.defensaObjetivo,
      defensaMagica: esActor ? contexto.defensaMagicaActor : contexto.defensaMagicaObjetivo,
      fila: esActor ? contexto.filaActor : contexto.filaObjetivo,
      columna: 0,
      estados: convertirEstadosTacticos(efectos, id, contexto.actorId),
      limites: { ...efectos.find((efecto) => efecto.datosTacticos)?.datosTacticos?.limites },
    };
  };

  const actor = crearUnidad(true);
  const objetivo = propio ? actor : crearUnidad(false);
  if (habilidad.efecto === "dano") {
    actor.estados = actor.estados.filter((estado) => estado.familia !== "precision");
  }
  actor.limites._ciclo = contexto.ciclo;
  objetivo.limites._ciclo = contexto.ciclo;

  const mundo: MundoTactico = {
    version: 2,
    ciclo: contexto.ciclo,
    unidades: propio ? [actor] : [actor, objetivo],
    eventos: [],
  };
  const energiaAntes = actor.energia;
  const manaAntes = actor.mana;
  let limpiezas = 0;
  let disipaciones = 0;
  let defensaActor = contexto.defensaActor;
  const numeroObjetivos = Math.max(1, contexto.numeroObjetivos ?? 1);
  const fuente = habilidad.id;

  const agregarEstado = (
    destino: UnidadTactica,
    clave: string,
    familia: FamiliaTactica,
    valor: number,
    duracion = 2,
    origen = fuente
  ) =>
    aplicarEstadoTactico(mundo, destino.id, {
      id: `${contexto.actorId}:${origen}:${clave}`,
      fuenteId: origen,
      creadorId: contexto.actorId,
      familia,
      clave,
      valor,
      restantes: duracion,
      reloj: "turno",
      cargas: 1,
    });
  // Las acciones secundarias no consumen preparaciones ni aplican efectos propios.
  for (const operacion of habilidad.disenoActiva?.operaciones ?? []) {
    const dirigidaAlActor = "objetivo" in operacion && operacion.objetivo === "actor";
    if (resultadoBase.impactoBloqueado && !dirigidaAlActor) continue;
    if (
      contexto.principal === false &&
      (
        operacion.tipo === "consumir_preparacion" ||
        operacion.tipo === "invocar" ||
        operacion.tipo === "ordenar" ||
        operacion.tipo === "mover" ||
        operacion.tipo === "pacto" ||
        operacion.tipo === "sacrificar" ||
        dirigidaAlActor
      )
    ) continue;
    if (resultadoBase.accion.tipo === "fallo" && !dirigidaAlActor) continue;

    if (operacion.tipo === "disipar") {
      const esActor = operacion.objetivo === "actor";
      const efectos = esActor ? efectosActor : efectosObjetivo;
      const indice = efectos.findIndex((efecto) =>
        operacion.negativo
          ? ["dano_progresivo", "debuff_defensa", "debuff_ataque", "debuff_precision"].includes(efecto.tipo)
          : ["bonus_defensa", "bonus_ataque", "bonus_ataque_magico", "bonus_evasion", "bonus_precision", "barrera"].includes(efecto.tipo)
      );

      if (indice >= 0) {
        const [retirado] = efectos.splice(indice, 1);
        if (operacion.negativo) limpiezas++;
        else disipaciones++;

        const unidad = esActor ? actor : objetivo;
        unidad.estados = unidad.estados.filter((efecto) => efecto.fuenteId !== retirado.habilidadId);

        if (retirado.tipo === "debuff_defensa") {
          if (esActor || propio) defensaActor += retirado.valor;
          if (esActor ? (propio || !contexto.objetivoAliado) : contexto.objetivoAliado) {
            resultadoBase.jugadorDefensa += retirado.valor;
          } else if (!esActor) {
            resultadoBase.enemigoDefensa += retirado.valor;
          }
        }
        if (retirado.tipo === "bonus_defensa") {
          if (esActor || propio) defensaActor = Math.max(0, defensaActor - retirado.valor);
          if (esActor ? (propio || !contexto.objetivoAliado) : contexto.objetivoAliado) {
            resultadoBase.jugadorDefensa = Math.max(0, resultadoBase.jugadorDefensa - retirado.valor);
          } else if (!esActor) {
            resultadoBase.enemigoDefensa = Math.max(0, resultadoBase.enemigoDefensa - retirado.valor);
          }
        }
      } else {
        const unidad = esActor ? actor : objetivo;
        const estado = unidad.estados.find((efecto) =>
          operacion.negativo
            ? ["herida", "exposicion"].includes(efecto.familia)
            : ["guardia", "precision", "resistencia"].includes(efecto.familia)
        );
        if (estado) {
          unidad.estados = unidad.estados.filter((efecto) => efecto !== estado);
          if (operacion.negativo) limpiezas++;
          else disipaciones++;
        }
      }
    } else if (operacion.tipo === "consumir_preparacion") {
      const preparacion = actor.estados.find((estado) =>
        estado.clave === operacion.clave ||
        estado.clave === `enlace_residual:${habilidad.claseId}`
      );
      if (preparacion) {
        actor.estados = actor.estados.filter((estado) => estado !== preparacion);
        mundo.eventos.push({
          tipo: "consumo",
          actorId: actor.id,
          objetivoId: actor.id,
          fuenteId: habilidad.id,
          cantidad: 1,
        });
        if (operacion.efecto === "guardia") {
          agregarEstado(actor, "guardia_preparada", "guardia", actor.hpMaximo * 0.04, 2);
        }
        if (operacion.efecto === "cura") {
          curarTactico(
            mundo, actor.id,
            contexto.objetivoAliado ? objetivo.id : actor.id,
            habilidad.id, actor.hpMaximo * 0.04 / numeroObjetivos
          );
        }
      }
    } else if (operacion.tipo === "guardia_porcentaje") {
      agregarEstado(
        operacion.objetivo === "actor" ? actor : objetivo,
        `guardia:${habilidad.id}`,
        "guardia",
        Math.floor(actor.hpMaximo * operacion.porcentaje / numeroObjetivos),
        operacion.duracion
      );
    } else if (operacion.tipo === "invocar") {
      ejecutarComandosTacticos(mundo, actor.id, objetivo.id, habilidad.id, [{
        ...operacion,
        potencia: Math.max(1, Math.floor(Math.max(actor.ataque, actor.ataqueMagico) * operacion.potencia)),
      }]);
    } else if (operacion.tipo === "estado" && operacion.familia === "sello") {
      ejecutarComandosTacticos(mundo, actor.id, objetivo.id, habilidad.id, [{
        ...operacion,
        valor: Math.max(1, Math.floor(Math.max(actor.ataque, actor.ataqueMagico) * operacion.valor / numeroObjetivos)),
      }]);
    } else if (operacion.tipo === "recuperar_mana") {
      actor.mana = Math.min(actor.manaMaximo, actor.mana + operacion.cantidad);
    } else if (operacion.tipo !== "recurso" || operacion.recurso !== "energia") {
      ejecutarComandosTacticos(mundo, actor.id, objetivo.id, habilidad.id, [operacion]);
    }
  }
  if (contexto.principal !== false) {
    for (const pasiva of (contexto.pasivas ?? []).slice(0, 3)) {
      const regla = pasiva.reglaPasiva;
      if (!regla || !esCondicion(
        regla, habilidad, contexto, resultadoBase, mundo, limpiezas, disipaciones
      )) continue;

      // Las pasivas normales se activan una vez por ciclo; la de vida baja una sola vez.
      const limite = `pasiva:${pasiva.id}`;
      const reloj = regla.condicion === "vida_baja" ? -1 : contexto.ciclo;
      if (actor.limites[limite] === reloj) continue;
      actor.limites[limite] = reloj;

      const clave = `pasiva:${regla.ventaja}`;
      const estadoPasivo = (
        unidad: UnidadTactica,
        claveEstado: string,
        familia: FamiliaTactica,
        valor: number,
        duracion = 2
      ) => agregarEstado(unidad, claveEstado, familia, valor, duracion, pasiva.id);

      switch (regla.ventaja) {
        case "mana":
          devolverRecursoTactico(
            mundo, actor.id, pasiva.id, "mana", 5,
            habilidad.costeMana ?? 0, habilidad.id
          );
          break;
        case "energia":
          devolverRecursoTactico(
            mundo, actor.id, pasiva.id, "energia", 10,
            habilidad.costeEnergia ?? 0, habilidad.id
          );
          break;
        case "precision":
          estadoPasivo(actor, clave, "precision", 5, 2);
          break;
        case "guardia":
          estadoPasivo(actor, clave, "guardia", actor.hpMaximo * 0.03, 2);
          break;
        case "curacion": {
          const maximo = Math.floor(actor.hpMaximo * 0.06);
          const claveCura = `cura_pasiva:${contexto.ciclo}`;
          const usado = actor.limites[claveCura] ?? 0;
          const cantidad = Math.min(
            Math.floor(actor.hpMaximo * 0.02),
            Math.max(0, maximo - usado)
          );
          curarTactico(mundo, actor.id, actor.id, pasiva.id, cantidad);
          actor.limites[claveCura] = usado + cantidad;
          break;
        }
        case "regeneracion":
          estadoPasivo(actor, clave, "regeneracion", Math.max(1, Math.floor(actor.hpMaximo * 0.01)), 2);
          break;
        case "resistir":
          estadoPasivo(actor, clave, "resistencia", 0.15, 2);
          break;
        case "exponer":
          if (!contexto.objetivoAliado) estadoPasivo(objetivo, clave, "exposicion", 0.05, 2);
          break;
        case "estabilizar": {
          const herida = actor.estados.find((estado) => estado.familia === "herida");
          if (herida) herida.restantes--;
          actor.estados = actor.estados.filter((estado) => estado.restantes > 0);
          break;
        }
        case "limpiar_herida":
          actor.estados = actor.estados.filter(
            (estado, _indice, estados) => estado !== estados.find((otro) => otro.familia === "herida")
          );
          break;
        case "guardar_preparacion":
          estadoPasivo(actor, `enlace_residual:${pasiva.claseId}`, "preparacion", 0.5, 2);
          break;
      }
    }

    agregarEstado(actor, "_historial", "preparacion", contexto.objetivoAliado ? 0 : 1, 3);
    const historial = actor.estados.find((estado) => estado.clave === "_historial");
    if (historial) {
      historial.destinatarioId = contexto.objetivoId;
      historial.elemento = habilidad.tipoDano === "magico" ? "arcano" : "fisico";
    }
  }

  const propios = exportarEstadosTacticos(actor, efectosActor).map((efecto) => ({
    ...efecto,
    objetivo: "jugador" as const,
  }));
  const ajenos = exportarEstadosTacticos(objetivo, efectosObjetivo).map((efecto) => ({
    ...efecto,
    objetivo: contexto.objetivoAliado ? "jugador" as const : "enemigo" as const,
  }));
  const danoExtra = mundo.eventos
    .filter((evento) => evento.tipo === "dano" && evento.objetivoId === contexto.objetivoId)
    .reduce((total, evento) => total + evento.cantidad, 0);
  const curacionExtra = Math.max(
    0,
    actor.hp - (resultadoBase.actorHpActualizado ??
      (contexto.objetivoAliado && !propio ? contexto.actorHp : resultadoBase.jugadorHp))
  );

  return {
    ...resultadoBase,
    accion: {
      ...resultadoBase.accion,
      dano: Math.min(contexto.objetivoHp, resultadoBase.accion.dano + danoExtra),
      ...(curacionExtra > 0
        ? { curacion: (resultadoBase.accion.curacion ?? 0) + curacionExtra }
        : {}),
      texto: resultadoBase.accion.texto,
    },
    jugadorHp: contexto.objetivoAliado ? objetivo.hp : actor.hp,
    actorHpActualizado: actor.hp,
    actorDefensaActualizada: defensaActor,
    filaActorActualizada: actor.fila,
    efectos: [],
    efectosActorActualizados: propios,
    ...(contexto.objetivoAliado
      ? { efectosJugadorActualizados: ajenos }
      : { efectosJugadorActualizados: propios, efectosEnemigoActualizados: ajenos }),
    recursosRecuperados: {
      energia: Math.max(0, actor.energia - energiaAntes),
      mana: Math.max(0, actor.mana - manaAntes),
    },
  };
}
