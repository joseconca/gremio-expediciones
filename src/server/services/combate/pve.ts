import { velocidadConDanza } from "@/lib/expediciones/combate/danzas-combate";
import {
  cerrarAccionTier35, corteEntrePlanos, prepararCompas, resolverImpactosTier35Roster,
  registrarContraofensiva, registrarEsquivaTier35,
} from "@/lib/expediciones/combate/rasgos-tier35";
import {
  multiplicadorCriticoTier3, potenciaRetaguardia, cerrarAccionTier3, consumirHuellas, criticoTier3, defensaReducida, esDisparoTier3,
  marcarHuellas, potenciaVigia, precisionHuellas, resolverImpactosTier3Roster,
  marcarPresagio, golpeConLanza, ponerLineaLanzas,
  acortarPerjuicioAsceta, cargarLuzGuardia, cobrarAlma, expiraPresagio, registrarEsquivaTier3,
} from "@/lib/expediciones/combate/rasgos-tier3";
import { anotarProteccionTier3, crearRepresaliaRuptura, curaConsagracion } from "@/lib/expediciones/combate/protecciones-rasgos";
import {
  cerrarAccionHibrida, oroAbordaje, consumirSemillaSilvestre, curacionSemilla, instantaneaHostilHibrida,
  multiplicadorOrden, registrarEsquivaHibrida, resolverApoyoHibrido, resolverImpactosHibridosRoster,
} from "@/lib/expediciones/combate/rasgos-hibridos";
import {
  activarContraataque,
  activarDeudaOscura,
  activarSegundoAire,
  actualizarRachaSuperNovato,
  ajustarVidaAscension,
  aplicarAmparo,
  bonosContraObjetivo,
  cerrarRasgoAccion,
  consumirAbsolucion,
  consumirEstribillo,
  consumirNotaAlMargen,
  contarPerjuicios,
  hayMaldicionBrujo,
  limitarGolpeLetal,
  limitarVidaFueraCombate,
  marcarNotaAlMargen,
  multiplicadorAscension,
  multiplicadorAtaqueRasgo,
  multiplicadorDefensaRasgo,
  obtenerClaseRasgo,
  obtenerJobRasgo,
  penetrarResistenciaMagica,
  prepararEstribillo,
  purificarConCura,
  registrarObjetivoRasgo,
  resolverFlechasRasgo,
} from "@/lib/expediciones/combate/rasgos-clase";
import { adjuntarPulsosEstado } from "./efectos-visualizacion";
import { establecerCooldownHabilidad, reducirCooldowns } from "@/lib/expediciones/combate/cooldowns-habilidades";
import { consumirPrecisionTactica } from "@/lib/expediciones/combate/estados-combate";
import { crearContextoTecnicaTactica } from "@/server/services/combate/contexto-tactico";
import { aplicarBarreraAccion } from "@/lib/expediciones/combate/estados-combate";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calcularFechasRegresoProgramadas } from "@/lib/expediciones/viajes/tiempos";
import {
  avanzarSecuenciaTurnosVelocidad,
  crearSecuenciaTurnosVelocidad,
  normalizarSecuenciaTurnosVelocidad,
  type ActorTurnoVelocidad,
  type PasoTurnoVelocidad,
} from "@/lib/expediciones/combate/iniciativa-combate";

import { actualizarCombateVersionado } from "@/server/services/combate/actualizar-combate-versionado";
import { obtenerEnemigoPorId } from "@/lib/enemigos";
import { crearEnemigoLegacy, leerEnemigosEnCombate, type EnemigoEnCombate } from "@/lib/expediciones/combate/enemigos-combate";
import { obtenerReglaObjetivoHabilidad, resolverObjetivosHabilidad } from "@/lib/expediciones/combate/objetivos-combate";
import { obtenerObjetoPorId } from "@/lib/objetos";
import { tirarBotinEnemigo } from "@/lib/equipamiento/botin";
import { LIMITE_INVENTARIO_OBJETOS } from "@/lib/equipamiento/inventario";
import { obtenerNombreObjetoConSufijo } from "@/lib/equipamiento/sufijos";
import { calcularRecompensasParcialesDerrota } from "@/lib/expediciones/recompensas-derrota";
import { obtenerPresentacionAtaqueBasico } from "@/lib/expediciones/presentacion/presentacion-combate";
import { usaAtaqueMagicoBasico } from "@/lib/expediciones/combate/ataque-basico-arma";
import { experienciaParaNivel } from "@/lib/progresion/experiencia";
import {
  aplicarMultiplicadorRecompensa,
  calcularExperienciaBaseGanada,
  calcularOroEnemigo,
  CONFIGURACION_DIFICULTAD,
  esModoDificultad,
  registrarVictoriaRangoNormal,
} from "../../../lib/expediciones/encuentros/dificultad";
import { resolverAtaqueJugador, resolverAtaqueEnemigo } from "@/lib/expediciones/combate/ataques-basicos";
import { type AccionAnimadaCombate, resolverHabilidadJugador } from "@/lib/expediciones/combate";
import {
  calcularAtaqueModificado,
  calcularPrecisionModificada,
  calcularEvasionModificada,
  leerEfectosCombate,
  comenzarTurnoCombatiente,
} from "../../../lib/expediciones/combate/estados-combate";
import {
  prepararAccionCombate,
  manejarErrorAccionCombate,
  obtenerRecompensaMision,
  otorgarExperienciaJob,
  gastarRecursosHabilidad,
  regenerarRecursosPorTurno,
  type ContextoAccionCombate,
} from "./accion-combate";

// La respuesta de fin de combate se aplica directamente al store.
// Incluimos las relaciones que necesita construirPersonaje para no reiniciar
// temporalmente el Job a nivel 1 ni vaciar habilidades/equipo del personaje.
const incluirUsuarioTrasCombate = {
  personaje: {
    include: {
      habilidades: true,
      inventario: { include: { objetos: true } },
      equipoEquipado: {
        include: {
          arma: true,
          armadura: true,
          accesorio: true,
          manoSecundaria: true,
          casco: true,
          pantalones: true,
          botas: true,
          guantes: true,
          anillo1: true,
          anillo2: true,
        },
      },
      progresosClase: true,
    },
  },
  expedicionActiva: { include: { combateActivo: true } },
} satisfies Prisma.UsuarioInclude;

type CombateConIniciativaPve = {
  id: string;
  turno: string;
  ronda: number;
  turnosPendientes: unknown;
  jugadorVelocidad: number;
  jugadorHp: number;
};

function actoresVivosPve(
  combate: CombateConIniciativaPve,
  enemigos: EnemigoEnCombate[],
  jugadorHp = combate.jugadorHp,
): ActorTurnoVelocidad[] {
  return [
    ...(jugadorHp > 0
      ? [{ actorId: "jugador", equipo: "jugador" as const, velocidad: Math.max(1, combate.jugadorVelocidad) }]
      : []),
    ...enemigos
      .filter((enemigo) => enemigo.hp > 0)
      .map((enemigo) => ({ actorId: enemigo.id, equipo: "enemigo" as const, velocidad: enemigo.velocidad })),
  ];
}

function obtenerColaActualPve(
  combate: CombateConIniciativaPve,
  enemigos: EnemigoEnCombate[],
): PasoTurnoVelocidad[] {
  const actores = actoresVivosPve(combate, enemigos);
  const idsVivos = new Set(actores.map((actor) => actor.actorId));
  const guardada = normalizarSecuenciaTurnosVelocidad(combate.turnosPendientes);
  const primera = guardada[0];
  if (
    primera &&
    idsVivos.has(primera.actorId) &&
    (combate.turno === "jugador"
      ? primera.equipo === "jugador" && primera.actorId === "jugador"
      : primera.equipo === "enemigo")
  ) return guardada;

  // Compatibilidad con combates activos anteriores a la persistencia de la cola.
  const enemigoPreferido = actores
    .filter((actor) => actor.equipo === "enemigo")
    .sort((a, b) => b.velocidad - a.velocidad || a.actorId.localeCompare(b.actorId))[0];
  const preferido = combate.turno === "jugador" ? "jugador" : enemigoPreferido?.actorId;
  return crearSecuenciaTurnosVelocidad(
    actores,
    `pve:${combate.id}:ronda:${combate.ronda}`,
    preferido,
  );
}

export async function ejecutarAccionPve(request: Request) {
  const preparado = await prepararAccionCombate(request, "pve");
  if (!("contexto" in preparado)) return preparado;
  return ejecutarAccionPveConContexto(preparado.contexto);
}

export async function ejecutarAccionPveConContexto(contexto: ContextoAccionCombate) {
  const {
    accion,
    usuario,
    personaje,
    bonusCuracion,
    expedicion,
    combate,
    enemigos: enemigosContexto,
    enemigoObjetivoId,
    actor,
    habilidad,
  } = contexto;
  let {
    cooldowns,
    efectos,
    efectosDefensor,
    jugadorHp,
    jugadorDefensa,
    enemigoHp,
    enemigoDefensa,
  } = contexto;
  let maximoJugador = combate.jugadorHpMaximo;
  const { log, consumible } = contexto;
  let accionAnimada: AccionAnimadaCombate;
  let filaActorTactica: number | undefined;
  let premioAbordaje = 0;
  let recursosHabilidad: { energia: number; mana: number; fraccionEnergiaFaltante?: number } = { energia: 0, mana: 0 };
  const instantaneaActorTactico = () => ({ id: usuario.id, hp: jugadorHp, hpMaximo: maximoJugador, ataque: combate.jugadorAtaque, ataqueMagico: combate.jugadorAtaqueMagico ?? combate.jugadorAtaque, defensa: jugadorDefensa, defensaMagica: combate.jugadorDefensaMagica ?? jugadorDefensa, posicion: combate.jugadorPosicion, efectos });
  const enemigosLegados = leerEnemigosEnCombate(enemigosContexto);
  let enemigosEnCombate: EnemigoEnCombate[] = enemigosLegados.length > 0
    ? enemigosLegados
    : (crearEnemigoLegacy({
        enemigoId: combate.enemigoId,
        enemigoNombre: combate.enemigoNombre,
        enemigoHp: combate.enemigoHp,
        enemigoHpMaximo: combate.enemigoHpMaximo,
        enemigoAtaque: combate.enemigoAtaque,
        enemigoAtaqueMagico: combate.enemigoAtaqueMagico,
        enemigoDefensa: combate.enemigoDefensa,
        enemigoDefensaMagica: combate.enemigoDefensaMagica,
        enemigoVelocidad: combate.enemigoVelocidad,
        enemigoProbCritico: combate.enemigoProbCritico,
        enemigoDanoCritico: combate.enemigoDanoCritico,
        enemigoPrecision: combate.enemigoPrecision,
        enemigoEvasion: combate.enemigoEvasion,
        enemigoNivel: combate.enemigoNivel,
        enemigoPosicion: combate.enemigoPosicion,
        efectos: efectosDefensor,
      }) ? [crearEnemigoLegacy({
        enemigoId: combate.enemigoId,
        enemigoNombre: combate.enemigoNombre,
        enemigoHp: combate.enemigoHp,
        enemigoHpMaximo: combate.enemigoHpMaximo,
        enemigoAtaque: combate.enemigoAtaque,
        enemigoAtaqueMagico: combate.enemigoAtaqueMagico,
        enemigoDefensa: combate.enemigoDefensa,
        enemigoDefensaMagica: combate.enemigoDefensaMagica,
        enemigoVelocidad: combate.enemigoVelocidad,
        enemigoProbCritico: combate.enemigoProbCritico,
        enemigoDanoCritico: combate.enemigoDanoCritico,
        enemigoPrecision: combate.enemigoPrecision,
        enemigoEvasion: combate.enemigoEvasion,
        enemigoNivel: combate.enemigoNivel,
        enemigoPosicion: combate.enemigoPosicion,
        efectos: efectosDefensor,
      })!] : []);
  const colaTurnosActuales = obtenerColaActualPve(combate, enemigosEnCombate);
  const danoEnemigoPorId = new Map<string, number>();
  const efectosEnemigoPorId = new Map<string, { defensa: number; efectos: ReturnType<typeof leerEfectosCombate> }>();
  try {
      if (accion === "escapar") {
        const accionHuida: AccionAnimadaCombate = {
          actor: "jugador",
          tipo: "fallo",
          animacion: "defensiva",
          dano: 0,
          critico: false,
          texto: "🏃 Huyes del combate y regresas sin completar la misión.",
        };
        log.push(accionHuida.texto);
        const resultado = await prisma.$transaction(async (tx) => {
          const combateActualizado = await actualizarCombateVersionado(tx, combate.id, combate.version, {
            ...(filaActorTactica!==undefined?{jugadorPosicion:["mele","centro","retaguardia"][filaActorTactica]}:{}),
            jugadorHp: Math.max(1, jugadorHp),
            jugadorDefensa,
            enemigoHp,
            enemigoDefensa,
            enemigos: enemigosEnCombate as unknown as Prisma.InputJsonValue,
            cooldowns,
            efectos: efectos as unknown as Prisma.InputJsonValue,
            efectosDefensor: efectosDefensor as unknown as Prisma.InputJsonValue,
            fase: "huida",
            turno: "jugador",
            oroGanado: 0,
            experienciaGanada: 0,
            log,
            ultimaAccion: accionHuida,
          });
          await tx.expedicionActiva.update({
            where: { id: expedicion.id },
            data: {
              fase: "regresando",
              ...calcularFechasRegresoProgramadas(expedicion.fechaSalida, expedicion.fechaLlegada),
              recompensa: { oro: 0, madera: 0, piedra: 0, metal: 0 },
              resultadoFinal: "huida",
              hpPerdido: Math.max(0, maximoJugador - jugadorHp),
              experienciaGanada: 0,
            },
          });
          await tx.personaje.update({
            where: { id: personaje.id },
            data: { hpActual: Math.max(1, limitarVidaFueraCombate(jugadorHp, efectos)), estado: "de_viaje" },
          });
          const usuarioActualizado = await tx.usuario.findUnique({
            where: { id: usuario.id },
            include: incluirUsuarioTrasCombate,
          });
          return { combate: combateActualizado, usuario: usuarioActualizado };
        });
        const datosUsuario = resultado.usuario
          ? Object.fromEntries(Object.entries(resultado.usuario).filter(([clave]) => clave !== "password"))
          : null;
        return NextResponse.json({
          exito: true,
          combate: resultado.combate,
          usuario: datosUsuario,
          terminado: true,
          accion: accionHuida,
        });
      }

      const modoDificultad = esModoDificultad(expedicion.modoDificultad)
        ? expedicion.modoDificultad
        : "normal";

      const claseRasgo = obtenerClaseRasgo(personaje);
      if (claseRasgo === "rastreador") marcarHuellas(enemigosEnCombate);
      const previosHibridos = instantaneaHostilHibrida(claseRasgo, enemigosEnCombate);
      const jobRasgo = obtenerJobRasgo(personaje);
      const ataqueRasgo = (ataque: number) => ataque * multiplicadorAtaqueRasgo(claseRasgo, jugadorHp, maximoJugador, efectos, jobRasgo);
      const resistenciaRasgo = (defensa: number) => claseRasgo === "mago" ? penetrarResistenciaMagica(defensa, jobRasgo) : defensa;

      const bonoContra = (enemigo: EnemigoEnCombate) => {
        const bono = bonosContraObjetivo(claseRasgo, enemigo.id, enemigo.hp, enemigo.hpMaximo, efectos, jobRasgo);
        return { ...bono, precision: bono.precision + precisionHuellas(efectos, enemigo.efectos) };
      };
      const armaEquipadaId = personaje.equipoEquipado?.arma?.objetoId;
      const subtipoArma = armaEquipadaId ? obtenerObjetoPorId(armaEquipadaId)?.subtipo : undefined;
      const usarAtaqueMagico = usaAtaqueMagicoBasico(subtipoArma);
      const resolverBasico = (objetivo: EnemigoEnCombate, efectosObjetivo: ReturnType<typeof leerEfectosCombate>) => {
        const bono = bonoContra(objetivo);
        return resolverAtaqueJugador({
          efectosEnemigo: efectosObjetivo,
          jugadorAtaque: ataqueRasgo(calcularAtaqueModificado(combate.jugadorAtaque, efectos)) * bono.dano,
          jugadorAtaqueMagico: ataqueRasgo(calcularAtaqueModificado(combate.jugadorAtaqueMagico ?? combate.jugadorAtaque, efectos, true)) * bono.dano,
          usarMejorAtaqueMagico: usarAtaqueMagico,
        danoMagicoDesdeAtaqueFisico: corteEntrePlanos(claseRasgo, efectos, objetivo.defensa, objetivo.defensaMagica),
          multiplicadorDano: multiplicadorOrden(efectos) * potenciaVigia(claseRasgo, efectos, esDisparoTier3(null, subtipoArma)) * potenciaRetaguardia(claseRasgo, objetivo.posicion === "retaguardia"),
          jugadorNivel: combate.jugadorNivel,
          jugadorProbCritico: combate.jugadorProbCritico * multiplicadorAscension(efectos) + bono.critico + criticoTier3(claseRasgo, efectos, objetivo.id, esDisparoTier3(null, subtipoArma)),
          jugadorDanoCritico: combate.jugadorDanoCritico * multiplicadorAscension(efectos) * multiplicadorCriticoTier3(claseRasgo, efectos, objetivo.id),
          jugadorPrecision: calcularPrecisionModificada((combate.jugadorPrecision ?? 75) * multiplicadorAscension(efectos), efectos) + bono.precision,
          enemigoEvasion: calcularEvasionModificada(objetivo.evasion, efectosObjetivo),
          enemigoDefensa: claseRasgo === "verdugo" && defensaReducida(efectosObjetivo) ? objetivo.defensa * 0.5 : objetivo.defensa,
          enemigoDefensaMagica: resistenciaRasgo(objetivo.defensaMagica),
          enemigoNombre: objetivo.nombre,
        });
      };
      const perjuiciosAntes = contarPerjuicios(efectos);
      const estribilloPendiente = actor === "jugador" && consumirEstribillo(efectos);
      if (actor === "jugador") {
        jugadorHp -= habilidad?.costeVidaRasgo ?? 0;
        if (accion === "atacar") {
          const objetivo = enemigosEnCombate.find((enemigo) => enemigo.id === enemigoObjetivoId && enemigo.hp > 0)
            ?? enemigosEnCombate.find((enemigo) => enemigo.hp > 0);
          if (!objetivo) return NextResponse.json({ error: "No quedan enemigos vivos a los que atacar." }, { status: 409 });
          const efectosObjetivo = leerEfectosCombate(objetivo.efectos);
          accionAnimada = resolverBasico(objetivo, efectosObjetivo);
          aplicarBarreraAccion(accionAnimada,efectosObjetivo);
          consumirPrecisionTactica(efectos);
          efectosEnemigoPorId.set(objetivo.id,{defensa:objetivo.defensa,efectos:efectosObjetivo});
          accionAnimada = { ...accionAnimada, enemigoObjetivoId: objetivo.id };
          danoEnemigoPorId.set(objetivo.id, accionAnimada.dano);
          const presentacionArma = obtenerPresentacionAtaqueBasico(subtipoArma);
          if (presentacionArma) accionAnimada = { ...accionAnimada, presentacion: presentacionArma };
        } else if (accion === "usar_objeto") {
          if (!consumible) {
            return NextResponse.json({ error: "Objeto de combate no válido." }, { status: 400 });
          }
          const curacion = Math.min(consumible.curacion, maximoJugador - jugadorHp);
          if (curacion + consumible.energia + consumible.mana <= 0) {
            return NextResponse.json({ error: "Ya tienes la salud al máximo." }, { status: 400 });
          }
          jugadorHp += curacion;
          accionAnimada = {
            actor: "jugador",
            tipo: "habilidad",
            animacion: "curacion",
            dano: 0,
            curacion,
            critico: false,
            texto: `Usas ${consumible.nombre}: +${curacion} PV, +${consumible.energia} de energía y +${consumible.mana} de maná.`,
            accionSprite: "use_consumable",
          };
        } else {
          if (!habilidad) {
            return NextResponse.json({ error: "Habilidad no encontrada." }, { status: 404 });
          }

          const reglaObjetivo = obtenerReglaObjetivoHabilidad(habilidad);
          if (reglaObjetivo.equipo === "enemigo") {
            const seleccion = resolverObjetivosHabilidad({
              habilidad,
              actorId: personaje.id,
              objetivoId: enemigoObjetivoId,
              combatientes: [
                { id: personaje.id, nombre: personaje.nombre, equipo: "aliado", posicion: combate.jugadorPosicion, hpActual: jugadorHp, estado: jugadorHp > 0 ? "activo" : "caido" },
                ...enemigosEnCombate.map((enemigo) => ({
                  id: enemigo.id,
                  nombre: enemigo.nombre,
                  equipo: "enemigo" as const,
                  posicion: enemigo.posicion,
                  columna: enemigo.columna,
                  casilla: enemigo.casilla,
                  hpActual: enemigo.hp,
                  estado: enemigo.hp > 0 ? "activo" : "caido",
                })),
              ],
            });
            if (seleccion.error || seleccion.objetivos.length === 0) {
              return NextResponse.json({ error: "No hay enemigos válidos para esa habilidad." }, { status: 409 });
            }
            const resultados = seleccion.objetivos.map((seleccionado,indiceObjetivo) => {
              const enemigo = enemigosEnCombate.find((entrada) => entrada.id === seleccionado.id);
              if (!enemigo || enemigo.hp <= 0) {
                throw new Error("ENEMIGO_OBJETIVO_NO_ACTIVO");
              }
              const efectosObjetivo = leerEfectosCombate(enemigo.efectos);
              const bono = bonoContra(enemigo);
              const resultado = resolverHabilidadJugador(habilidad!, {
                contextoTactico: (habilidad?.programaTactico || habilidad?.versionReglas===2) ? crearContextoTecnicaTactica(personaje, 0, instantaneaActorTactico(), { id: enemigo.id, hp: enemigo.hp, hpMaximo: enemigo.hpMaximo, ataque: enemigo.ataque, ataqueMagico: enemigo.ataqueMagico, defensa: enemigo.defensa, defensaMagica: enemigo.defensaMagica, posicion: enemigo.posicion, efectos: efectosObjetivo }, false,{numeroObjetivos:seleccion.objetivos.length,principal:indiceObjetivo===0}) : undefined,
                jugadorAtaque: ataqueRasgo(calcularAtaqueModificado(combate.jugadorAtaque, efectos)) * bono.dano,
                jugadorAtaqueMagico: ataqueRasgo(calcularAtaqueModificado(combate.jugadorAtaqueMagico ?? combate.jugadorAtaque, efectos, true)) * bono.dano,
                jugadorProbCritico: combate.jugadorProbCritico * multiplicadorAscension(efectos) + bono.critico,
                jugadorDanoCritico: combate.jugadorDanoCritico * multiplicadorAscension(efectos),
                jugadorPrecision: calcularPrecisionModificada((combate.jugadorPrecision ?? 75) * multiplicadorAscension(efectos), efectos) + bono.precision,
                enemigoEvasion: calcularEvasionModificada(enemigo.evasion, efectosObjetivo),
                jugadorDefensa,
                jugadorDefensaMagica: combate.jugadorDefensaMagica ?? jugadorDefensa,
                jugadorNivel: combate.jugadorNivel,
                jugadorHp,
                jugadorHpMaximo: maximoJugador,
                enemigoDefensa: enemigo.defensa,
                enemigoDefensaMagica: resistenciaRasgo(enemigo.defensaMagica),
                enemigoNombre: enemigo.nombre,
                bonusCuracion,
                efectosJugador: efectos,
              });
              const efectosNuevos = resultado.efectosEnemigoActualizados ?? [
                ...efectosObjetivo.filter((efecto) => !resultado.efectos.some((nuevo) =>
                  nuevo.objetivo === "enemigo" && nuevo.habilidadId === efecto.habilidadId)),
                ...resultado.efectos.filter((efecto) => efecto.objetivo === "enemigo"),
              ];
              efectosEnemigoPorId.set(enemigo.id, {
                defensa: resultado.enemigoDefensa,
                efectos: efectosNuevos,
              });
              danoEnemigoPorId.set(enemigo.id, resultado.accion.dano);
              return { enemigo, resultado };
            });
            const primero = resultados[0];
            const danoTotal = resultados.reduce((total, entrada) => total + entrada.resultado.accion.dano, 0);
            accionAnimada = {
              ...primero.resultado.accion,
              dano: danoTotal,
              enemigoObjetivoId: primero.enemigo.id,
              objetivosEnemigoIds: resultados.map((entrada) => entrada.enemigo.id),
              ...(resultados.length > 1 ? {
                impactosMultiples: resultados.map((entrada) => ({
                  objetivoId: entrada.enemigo.id,
                  dano: entrada.resultado.accion.dano,
                  critico: entrada.resultado.accion.critico,
                })),
                texto: `${habilidad.nombre} afecta a ${resultados.length} enemigos.`,
              } : {}),
            };
            jugadorHp = primero.resultado.jugadorHp;
            filaActorTactica = primero.resultado.filaActorActualizada;
            recursosHabilidad = primero.resultado.recursosRecuperados ?? recursosHabilidad;
            jugadorDefensa = primero.resultado.jugadorDefensa;
            efectos = [
              ...efectos.filter((efecto) => !primero.resultado.efectosJugadorActualizados?.some((actualizado) =>
                actualizado.habilidadId === efecto.habilidadId && actualizado.objetivo === efecto.objetivo)),
              ...(primero.resultado.efectosJugadorActualizados ?? []),
              ...primero.resultado.efectos.filter((efecto) => efecto.objetivo === "jugador"),
            ];
          } else {
            const resultadoHabilidad = resolverHabilidadJugador(habilidad, {
              contextoTactico: (habilidad.programaTactico || habilidad.versionReglas===2) ? crearContextoTecnicaTactica(personaje, 0, instantaneaActorTactico(), instantaneaActorTactico(), true) : undefined,
              jugadorAtaque: ataqueRasgo(calcularAtaqueModificado(combate.jugadorAtaque, efectos)),
              jugadorAtaqueMagico: ataqueRasgo(calcularAtaqueModificado(combate.jugadorAtaqueMagico ?? combate.jugadorAtaque, efectos, true)),
              jugadorProbCritico: combate.jugadorProbCritico * multiplicadorAscension(efectos),
              jugadorDanoCritico: combate.jugadorDanoCritico * multiplicadorAscension(efectos),
              jugadorPrecision: calcularPrecisionModificada((combate.jugadorPrecision ?? 75) * multiplicadorAscension(efectos), efectos),
              enemigoEvasion: calcularEvasionModificada(combate.enemigoEvasion ?? 0, efectosDefensor),
              jugadorDefensa,
              jugadorDefensaMagica: combate.jugadorDefensaMagica ?? jugadorDefensa,
              jugadorNivel: combate.jugadorNivel,
              jugadorHp,
              jugadorHpMaximo: maximoJugador,
              enemigoDefensa,
              enemigoDefensaMagica: combate.enemigoDefensaMagica ?? enemigoDefensa,
              enemigoNombre: combate.enemigoNombre ?? "Enemigo",
              bonusCuracion,
              efectosJugador: efectos,
            });

            accionAnimada = resultadoHabilidad.accion;
            filaActorTactica = resultadoHabilidad.filaActorActualizada;
            recursosHabilidad = resultadoHabilidad.recursosRecuperados ?? recursosHabilidad;
            jugadorHp = resultadoHabilidad.jugadorHp;
            jugadorDefensa = resultadoHabilidad.jugadorDefensa;
            enemigoDefensa = resultadoHabilidad.enemigoDefensa;
            for (const estado of resultadoHabilidad.efectos) {
              if (estado.objetivo === "enemigo") efectosDefensor = [...efectosDefensor, estado];
              else efectos = [...efectos, estado];
            }
            if (resultadoHabilidad.efectosJugadorActualizados) efectos = resultadoHabilidad.efectosJugadorActualizados;
          }

          const cooldownTurnos = habilidad.cooldownTurnos ?? 0;

          if (cooldownTurnos > 0) {
            establecerCooldownHabilidad(cooldowns,habilidad);
          }
        }
      } else {
        const turnoEnemigoActual = colaTurnosActuales[0];
        if (!turnoEnemigoActual || turnoEnemigoActual.equipo !== "enemigo") {
          return NextResponse.json({ error: "La cola de iniciativa no apunta a un enemigo activo." }, { status: 409 });
        }
        const impactos: { enemigo: EnemigoEnCombate; dano: number; critico: boolean; objetivoId: string; hpAntes: number; hpDespues: number }[] = [];
        const textos: string[] = [];
        for (const enemigoInicial of [...enemigosEnCombate].filter((enemigo) => enemigo.id === turnoEnemigoActual.actorId)) {
          const enemigo = enemigosEnCombate.find((entrada) => entrada.id === enemigoInicial.id);
          if (!enemigo || enemigo.hp <= 0) continue;
          const efectosDelEnemigo = leerEfectosCombate(enemigo.efectos);
          const ticksEnemigo = comenzarTurnoCombatiente(
            efectosDelEnemigo,
            enemigo.hp,
            enemigo.hpMaximo,
            enemigo.defensa,
            enemigo.nombre,
          );
          log.push(...ticksEnemigo.mensajes.map((mensaje) => `${enemigo.nombre}: ${mensaje}`));
          const enemigoActualizado: EnemigoEnCombate = {
            ...enemigo,
            hp: ticksEnemigo.hp,
            defensa: ticksEnemigo.defensa,
            efectos: ticksEnemigo.efectos,
          };
          if (enemigoActualizado.hp > 0 && jugadorHp > 0) {
            const accionDelEnemigo = resolverAtaqueEnemigo({
              efectosJugador: efectos,
              enemigoAtaque: calcularAtaqueModificado(enemigoActualizado.ataque, enemigoActualizado.efectos),
              enemigoProbCritico: enemigoActualizado.probCritico,
              enemigoDanoCritico: enemigoActualizado.danoCritico,
              enemigoPrecision: calcularPrecisionModificada(enemigoActualizado.precision, enemigoActualizado.efectos),
              jugadorEvasion: calcularEvasionModificada((combate.jugadorEvasion ?? 0) * multiplicadorAscension(efectos), efectos),
              jugadorDefensa: jugadorDefensa * multiplicadorDefensaRasgo(claseRasgo, jugadorHp, maximoJugador, efectos),
              enemigoNombre: enemigoActualizado.nombre,
            });
            registrarEsquivaHibrida(claseRasgo, accionDelEnemigo, efectos);
            registrarEsquivaTier3(claseRasgo, accionDelEnemigo, efectos, enemigo.id);
            registrarEsquivaTier35(claseRasgo, accionDelEnemigo, efectos, enemigo.id);
            consumirNotaAlMargen(enemigoActualizado.efectos);
            aplicarBarreraAccion(accionDelEnemigo, efectos);
            if (accionDelEnemigo.proteccion?.contraofensiva === usuario.id) registrarContraofensiva(efectos, enemigo.id);
            limitarGolpeLetal(claseRasgo, jugadorHp, efectos, accionDelEnemigo);
            consumirPrecisionTactica(enemigoActualizado.efectos);
            const hpAntes = jugadorHp;
            jugadorHp = Math.max(0, jugadorHp - accionDelEnemigo.dano);
            cargarLuzGuardia(claseRasgo, accionDelEnemigo.proteccion?.mitigado ?? 0, maximoJugador, efectos);
            jugadorHp += curaConsagracion(accionDelEnemigo.proteccion, jugadorHp, maximoJugador);
            if (accionDelEnemigo.proteccion?.ruptura?.creadorId === usuario.id) recursosHabilidad.mana += accionDelEnemigo.proteccion.ruptura.mana;
            const represalia = crearRepresaliaRuptura(accionDelEnemigo.proteccion);
            enemigoActualizado.hp = Math.max(0, enemigoActualizado.hp - represalia.dano);
            accionDelEnemigo.texto += represalia.texto;
            impactos.push({
              enemigo: enemigoActualizado,
              dano: accionDelEnemigo.dano,
              critico: accionDelEnemigo.critico,
              objetivoId: "jugador",
              hpAntes,
              hpDespues: jugadorHp,
            });
            if (jugadorHp > 0 && activarDeudaOscura(claseRasgo, hayMaldicionBrujo(efectosDelEnemigo, usuario.id), efectos)) {
              jugadorHp = Math.min(maximoJugador, jugadorHp + Math.max(1, Math.floor(maximoJugador * 0.05)));
              recursosHabilidad.mana += 5;
              log.push("Deuda oscura restaura vida y maná.");
            }
            if (jugadorHp > 0 && enemigo.posicion !== "retaguardia" && activarContraataque(claseRasgo, accionDelEnemigo, efectos)) {
              const replica = resolverBasico(enemigoActualizado, enemigoActualizado.efectos);
              aplicarBarreraAccion(replica, enemigoActualizado.efectos);
              enemigoActualizado.hp = Math.max(0, enemigoActualizado.hp - replica.dano);
              log.push("Respuesta de acero: " + replica.texto);
            }
            if (jugadorHp > 0 && activarSegundoAire(claseRasgo, accionDelEnemigo.dano, efectos)) {
              recursosHabilidad.fraccionEnergiaFaltante = 0.15;
              log.push("Segundo aire restaura energía.");
            }
            textos.push(accionDelEnemigo.texto);
          } else if (enemigoActualizado.hp <= 0) {
            textos.push(`${enemigoActualizado.nombre} cae por los efectos acumulados.`);
            log.push(`☠️ ${enemigoActualizado.nombre} cae por los efectos acumulados.`);
          }
          if (enemigoActualizado.hp <= 0) cobrarAlma(claseRasgo, usuario.id, efectos, efectosDelEnemigo);
          efectosEnemigoPorId.set(enemigoActualizado.id, {
            defensa: enemigoActualizado.defensa,
            efectos: leerEfectosCombate(enemigoActualizado.efectos),
          });
          // Se conserva el HP del enemigo procesado tras sus estados.
          danoEnemigoPorId.set(`__hp__:${enemigoActualizado.id}`, enemigoActualizado.hp);
        }
        const danoTotal = impactos.reduce((total, impacto) => total + impacto.dano, 0);
        const primero = impactos[0];
        accionAnimada = impactos.length > 0 ? {
          actor: "enemigo",
          actorEnemigoId: primero.enemigo.id,
          actoresEnemigoIds: impactos.map((impacto) => impacto.enemigo.id),
          impactosEnemigos: impactos.map((impacto) => ({
            actorEnemigoId: impacto.enemigo.id,
            objetivoId: impacto.objetivoId,
            dano: impacto.dano,
            critico: impacto.critico,
            hpAntes: impacto.hpAntes,
            hpDespues: impacto.hpDespues,
          })),
          dano: danoTotal,
          critico: impactos.some((impacto) => impacto.critico),
          tipo: "ataque",
          animacion: "ofensiva",
          texto: impactos.length === 1
            ? textos[0]
            : `${impactos.length} enemigos atacan e infligen ${danoTotal} de daño total.`,
          ...(impactos.length > 1 ? {
            impactosMultiples: [{
              objetivoId: "jugador",
              dano: danoTotal,
              critico: impactos.some((impacto) => impacto.critico),
            }],
          } : {}),
        } : {
          actor: "enemigo",
          tipo: "fallo",
          animacion: "ofensiva",
          dano: 0,
          critico: false,
          texto: "Los enemigos restantes han caído o no pueden atacar.",
        };
      }

      if (actor === "jugador") {
        if (habilidad?.efecto === "curacion") {
          aplicarAmparo(claseRasgo, jobRasgo, contexto.jugadorHp, maximoJugador, accionAnimada, efectos, efectos);
          jugadorDefensa += purificarConCura(claseRasgo, accionAnimada, efectos, efectos, perjuiciosAntes);
        }
        const objetivoRasgo = enemigosEnCombate.find(enemigo => enemigo.id === accionAnimada.enemigoObjetivoId);
        registrarObjetivoRasgo(claseRasgo, objetivoRasgo?.id, efectos,
          !!objetivoRasgo && objetivoRasgo.hp > (danoEnemigoPorId.get(objetivoRasgo.id) ?? 0));
        if (objetivoRasgo) {
          const extra = efectosEnemigoPorId.get(objetivoRasgo.id);
          const ajenos = extra?.efectos ?? leerEfectosCombate(objetivoRasgo.efectos);
          if (habilidad?.efecto === "dano" && accionAnimada.tipo !== "fallo") marcarNotaAlMargen(claseRasgo, efectos, ajenos);
          const defensa = Math.max(0, (extra?.defensa ?? objetivoRasgo.defensa) - consumirAbsolucion(claseRasgo, accionAnimada, efectos, ajenos));
          efectosEnemigoPorId.set(objetivoRasgo.id, { defensa, efectos: ajenos });
        }
        if (estribilloPendiente) {
          recursosHabilidad.energia += 5;
          recursosHabilidad.mana += 3;
        }
        prepararEstribillo(claseRasgo, habilidad, efectos);
        resolverImpactosHibridosRoster(claseRasgo, usuario.id, subtipoArma, habilidad, efectos,
          combate.jugadorAtaqueMagico ?? combate.jugadorAtaque, enemigosEnCombate,
          previosHibridos, danoEnemigoPorId, efectosEnemigoPorId, accionAnimada);
        if (!accionAnimada.enemigoObjetivoId) {
          resolverApoyoHibrido(claseRasgo, habilidad, efectos, efectos);
          if (habilidad) {
            marcarPresagio(claseRasgo, habilidad, accionAnimada, usuario.id, efectos);
            anotarProteccionTier3(claseRasgo, usuario.id, habilidad, efectos);
          }
        }
        if (claseRasgo === "mariscal" && golpeConLanza(subtipoArma, habilidad, accionAnimada)) ponerLineaLanzas(efectos);
        const curaTier3 = resolverImpactosTier3Roster(claseRasgo, usuario.id, habilidad, efectos,
          enemigosEnCombate, previosHibridos, danoEnemigoPorId, efectosEnemigoPorId, accionAnimada);
        const curaAplicada = Math.max(0, Math.min(maximoJugador - jugadorHp, curaTier3));
        jugadorHp += curaAplicada;
        if (curaAplicada > 0) accionAnimada.texto += ` El rasgo restaura ${curaAplicada} PV.`;
        if (objetivoRasgo) consumirHuellas(efectos, objetivoRasgo.efectos);
        cerrarAccionTier3(claseRasgo, habilidad, accion === "atacar", subtipoArma, accionAnimada, efectos, objetivoRasgo?.id);
        const impactoTier35 = resolverImpactosTier35Roster({
          clase: claseRasgo, actorId: usuario.id, arma: subtipoArma, habilidad, propios: efectos, enemigos: enemigosEnCombate,
          previos: previosHibridos, danos: danoEnemigoPorId, estados: efectosEnemigoPorId, accion: accionAnimada, job: jobRasgo,
        });
        const drenajeEspectral = Math.min(Math.max(0, maximoJugador - jugadorHp), impactoTier35.cura);
        jugadorHp += drenajeEspectral;
        if (drenajeEspectral > 0) accionAnimada.texto += ` Disparo de ultratumba restaura ${drenajeEspectral} PV.`;
        recursosHabilidad.energia += impactoTier35.energia;
        prepararCompas(claseRasgo, habilidad, usuario.id, [{ efectos, hpMaximo: maximoJugador }], jobRasgo);
        const efectosAliadoTier35 = (id: string) => id === usuario.id ? efectos : undefined;
        cerrarAccionTier35({
          clase: claseRasgo, habilidad, basico: accion === "atacar", accion: accionAnimada, propios: efectos,
          actorId: usuario.id, hpGanado: jugadorHp - contexto.jugadorHp, efectosAliado: efectosAliadoTier35,
        });
        const energiaAbordaje = cerrarAccionHibrida(claseRasgo, habilidad, accion === "atacar", accionAnimada, efectos, jobRasgo, impactoTier35.energia > 0);
        recursosHabilidad.energia += energiaAbordaje;
        if (energiaAbordaje > 0 || impactoTier35.energia > 0) premioAbordaje = oroAbordaje(jobRasgo, claseRasgo);
        actualizarRachaSuperNovato(claseRasgo, efectos, habilidad);
        const vidaAscension = ajustarVidaAscension(efectos, jugadorHp, maximoJugador);
        jugadorHp = vidaAscension.hp;
        maximoJugador = vidaAscension.maximo;
        cerrarRasgoAccion(claseRasgo, efectos, habilidad);
        if (claseRasgo === "arquero" && (accion === "atacar" || habilidad?.efecto === "dano")) {
          const objetivo = enemigosEnCombate.find(enemigo => enemigo.id === accionAnimada.enemigoObjetivoId);
          if (objetivo) {
            const danoPrevio = danoEnemigoPorId.get(objetivo.id) ?? 0;
            const extras = efectosEnemigoPorId.get(objetivo.id);
            const efectosObjetivo = extras?.efectos ?? leerEfectosCombate(objetivo.efectos);
            const adicional = resolverFlechasRasgo(jobRasgo, objetivo.hp - danoPrevio, accionAnimada, efectosObjetivo, () =>
              resolverBasico({ ...objetivo, defensa: extras?.defensa ?? objetivo.defensa }, efectosObjetivo)
            );
            danoEnemigoPorId.set(objetivo.id, danoPrevio + adicional);
            efectosEnemigoPorId.set(objetivo.id, { defensa: extras?.defensa ?? objetivo.defensa, efectos: efectosObjetivo });
          }
        }
      }

      // La lista de enemigos es la fuente autoritativa. Los campos escalares se
      // conservan para compatibilidad con interfaces y registros antiguos.
      enemigosEnCombate = enemigosEnCombate.map((enemigo) => {
        const hpTick = danoEnemigoPorId.get(`__hp__:${enemigo.id}`);
        const extras = efectosEnemigoPorId.get(enemigo.id);
        const hpTrasImpacto = hpTick ?? enemigo.hp;
        return {
          ...enemigo,
          hp: Math.max(0, hpTrasImpacto - (danoEnemigoPorId.get(enemigo.id) ?? 0)),
          defensa: extras?.defensa ?? enemigo.defensa,
          efectos: extras?.efectos ?? enemigo.efectos,
        };
      });
      for (const enemigo of enemigosEnCombate) {
        if (enemigo.hp > 0 || !consumirSemillaSilvestre(enemigo.efectos)) continue;
        const cura = curacionSemilla(jugadorHp, maximoJugador);
        jugadorHp += cura;
        if (cura > 0) log.push(`Semilla silvestre restaura ${cura} PV a ${personaje.nombre}.`);
      }
      const enemigosVivos = enemigosEnCombate.filter((enemigo) => enemigo.hp > 0);
      const enemigoPrincipal = enemigosVivos[0] ?? enemigosEnCombate[0];
      enemigoHp = enemigosVivos.length > 0 ? enemigoPrincipal.hp : 0;
      enemigoDefensa = enemigoPrincipal.defensa;
      efectosDefensor = leerEfectosCombate(enemigoPrincipal.efectos);
      log.push(accionAnimada.texto);

      // ==========================================================
      // VICTORIA PVE
      // ==========================================================

      if (enemigoHp <= 0) {
        log.push(
          `🏆 ¡${combate.enemigoNombre ?? "El enemigo"} ha sido derrotado!`
        );

        const definicionesEnemigos = enemigosEnCombate.map((enemigo) => ({
          combate: enemigo,
          definicion: obtenerEnemigoPorId(enemigo.enemigoId),
        }));
        if (definicionesEnemigos.length === 0 || definicionesEnemigos.some((entrada) => !entrada.definicion)) {
          return NextResponse.json({ error: "No se pudieron resolver todas las criaturas derrotadas." }, { status: 500 });
        }

        const recompensaMision = obtenerRecompensaMision(expedicion.recompensa);
        const recompensaEnemigo = definicionesEnemigos.reduce(
          (total, entrada) => total + calcularOroEnemigo(entrada.definicion!.botin, entrada.combate.difMin),
          0,
        );
        const oroSinMultiplicar = recompensaMision.oro + recompensaEnemigo;
        const oroGanado = aplicarMultiplicadorRecompensa(oroSinMultiplicar, modoDificultad);
        const experienciaGanada = definicionesEnemigos.reduce(
          (total, entrada) => total + calcularExperienciaBaseGanada(
            entrada.combate.difMin,
            personaje.nivel,
            modoDificultad,
          ),
          0,
        );

        log.push(
          `💰 Recompensa base: ${recompensaMision.oro} 🪙 por la misión + ${recompensaEnemigo} 🪙 por ${definicionesEnemigos.length} ${definicionesEnemigos.length === 1 ? "enemigo" : "enemigos"} (según la amenaza de cada criatura). Modo ${CONFIGURACION_DIFICULTAD[modoDificultad].nombre}: cobras ${oroGanado} 🪙 en total.`
        );

        log.push(`⭐ Obtienes ${experienciaGanada} XP por derrotar al grupo enemigo.`);

        const experienciaActual = personaje.experiencia || 0;

        const nivelActual = personaje.nivel || 1;

        let nivelNuevo = nivelActual;
        let experienciaNueva = experienciaActual + experienciaGanada;

        let nivelesSubidos = 0;

        while (experienciaNueva >= experienciaParaNivel(nivelNuevo)) {
          experienciaNueva -= experienciaParaNivel(nivelNuevo);

          nivelNuevo += 1;
          nivelesSubidos += 1;
        }

        if (nivelesSubidos > 0) {
          log.push(`⬆️ ¡Subes al nivel ${nivelNuevo}!`);
        }

        const resultado = await prisma.$transaction(async (tx) => {
          await gastarRecursosHabilidad(tx, personaje.id, habilidad, recursosHabilidad, multiplicadorAscension(efectos));
          if (premioAbordaje > 0) await tx.usuario.update({ where: { id: usuario.id }, data: { oro: { increment: premioAbordaje } } });
          if (consumible) {
            const restaurado = await tx.personaje.updateMany({
              where: { id: personaje.id, energiaActual: personaje.energiaActual, manaActual: personaje.manaActual },
              data: { energiaActual: { increment: consumible.energia }, manaActual: { increment: consumible.mana } },
            });
            if (restaurado.count !== 1) throw new Error("RECURSO_COMBATE_MODIFICADO");
            const consumido = await tx.inventarioObjeto.updateMany({
              where: {
                id: consumible.inventarioObjetoId,
                inventarioId: personaje.inventario?.id,
                objetoId: consumible.id,
                cantidad: { gte: 1 },
              },
              data: { cantidad: { decrement: 1 } },
            });
            if (consumido.count !== 1) throw new Error("CONSUMIBLE_MODIFICADO");
            await tx.inventarioObjeto.deleteMany({
              where: { id: consumible.inventarioObjetoId, cantidad: { lte: 0 } },
            });
          }
          const progresoJob = await otorgarExperienciaJob(
            tx,
            personaje,
            expedicion.dificultad,
            personaje.nivel,
            modoDificultad
          );
          if (progresoJob && progresoJob.nivelesSubidos > 0) {
            log.push(`⬆️ Job de ${progresoJob.claseNombre}: nivel ${progresoJob.nivelJob}.`);
          }
          if (progresoJob?.maestriaCompletada) {
            log.push(`🏅 ¡Has completado la maestría de ${progresoJob.claseNombre}!`);
          }

          const combateActualizado = await actualizarCombateVersionado(tx, combate.id, combate.version, {
            ...(filaActorTactica!==undefined?{jugadorPosicion:["mele","centro","retaguardia"][filaActorTactica]}:{}),
            enemigoHp: 0,
            enemigos: enemigosEnCombate as unknown as Prisma.InputJsonValue,
            jugadorDefensa,
            cooldowns,
            efectos: efectos as unknown as Prisma.InputJsonValue,
            fase: "victoria",
            turno: "jugador",
            oroGanado,
            experienciaGanada,
            log,
            ultimaAccion: accionAnimada,
          });

          await tx.expedicionActiva.update({
            where: {
              id: expedicion.id,
            },
            data: {
              fase: "regresando",
              ...calcularFechasRegresoProgramadas(expedicion.fechaSalida, expedicion.fechaLlegada),
              recompensa: {
                oro: oroGanado,
                madera: recompensaMision.madera,
                piedra: recompensaMision.piedra,
                metal: recompensaMision.metal,
              },
              resultadoFinal: "exito",
              hpPerdido: Math.max(0, maximoJugador - jugadorHp),
              experienciaGanada,
            },
          });

          if (expedicion.tipo === "elite") {
            await tx.usuario.update({
              where: {
                id: usuario.id,
              },
              data: {
                ultimaMisionElite: new Date(),
              },
            });
          }

          await tx.personaje.update({
            where: {
              id: personaje.id,
            },
            data: {
              hpActual: Math.max(1, limitarVidaFueraCombate(jugadorHp, efectos)),
              nivel: nivelNuevo,
              experiencia: experienciaNueva,
              ...(expedicion.tipo === "normal" && modoDificultad === "normal"
                ? {
                    rangosAmenazaCompletados: registrarVictoriaRangoNormal(
                      personaje.rangosAmenazaCompletados,
                      expedicion.dificultad
                    ),
                  }
                : {}),
            },
          });

          const usuarioActualizado = await tx.usuario.findUnique({
            where: {
              id: usuario.id,
            },
            include: incluirUsuarioTrasCombate,
          });

          return {
            combate: combateActualizado,
            usuario: usuarioActualizado,
          };
        });

        const datosUsuario = resultado.usuario
          ? Object.fromEntries(
              Object.entries(resultado.usuario).filter(
                ([clave]) => clave !== "password"
              )
            )
          : null;

        return NextResponse.json({
          exito: true,
          combate: resultado.combate,
          usuario: datosUsuario,
          terminado: true,
          accion: accionAnimada,
        });
      }

      // ==========================================================
      // DERROTA PVE
      const avanceTurnos = avanzarSecuenciaTurnosVelocidad({
        turnosPendientes: colaTurnosActuales,
        actoresVivos: actoresVivosPve({
          ...combate,
          jugadorVelocidad: velocidadConDanza(combate.jugadorVelocidad, efectos) * (claseRasgo === "berserker"
            ? multiplicadorAtaqueRasgo(claseRasgo, jugadorHp, maximoJugador, efectos)
            : multiplicadorAscension(efectos)),
        }, enemigosEnCombate, jugadorHp),
        ronda: combate.ronda,
        semilla: `pve:${combate.id}:ronda`,
      });
      const siguienteTurno = avanceTurnos.turnoActual?.equipo ?? "jugador";
      const siguienteRonda = avanceTurnos.ronda;

      if (jugadorHp > 0 && enemigoHp > 0 && siguienteTurno === "jugador") {
        cooldowns = reducirCooldowns(cooldowns);
        efectos = efectos.filter(efecto => !expiraPresagio(efecto, usuario.id));
        acortarPerjuicioAsceta(claseRasgo, efectos);
        const efectosActualizados = comenzarTurnoCombatiente(
          efectos, jugadorHp, maximoJugador, jugadorDefensa, personaje.nombre
        );

        efectos = efectosActualizados.efectos;
        jugadorHp = efectosActualizados.hp;
        jugadorDefensa = efectosActualizados.defensa;
        accionAnimada = adjuntarPulsosEstado(accionAnimada, "jugador", efectosActualizados);
        log.push(...efectosActualizados.mensajes);
      }

      // ==========================================================

      if (jugadorHp <= 0) {
        log.push("💀 El aventurero cae derrotado.");

        if (!combate.enemigoId) {
          return NextResponse.json(
            { error: "El combate no tiene enemigo asociado." },
            { status: 500 },
          );
        }

        const enemigo = obtenerEnemigoPorId(combate.enemigoId);
        if (!enemigo) {
          return NextResponse.json(
            { error: "No se encontró el enemigo del combate." },
            { status: 500 },
          );
        }

        const recompensaMision = obtenerRecompensaMision(expedicion.recompensa);
        const liquidacion = calcularRecompensasParcialesDerrota({
          enemigos: enemigosEnCombate,
          recompensaMision,
          dificultadMision: expedicion.dificultad,
          nivelBase: personaje.nivel,
          modoDificultad,
        });
        const oroAsegurado = liquidacion.oro;
        const experienciaGanada = liquidacion.experiencia;
        const botinesTirados = liquidacion.enemigosDerrotados
          .map(({ snapshot, definicion }) => ({
            snapshot,
            botin: tirarBotinEnemigo(definicion, Math.random, personaje.profesionActivaId),
          }))
          .filter((entrada): entrada is {
            snapshot: EnemigoEnCombate;
            botin: NonNullable<ReturnType<typeof tirarBotinEnemigo>>;
          } => Boolean(entrada.botin));

        log.push(
          `💰 Aseguras ${liquidacion.oroConsolacion} 🪙 de la misión y ${liquidacion.oroPorEnemigos} 🪙 por las criaturas abatidas.`,
        );
        log.push(
          `⭐ Obtienes ${liquidacion.experienciaConsolacion} XP de la misión y ${liquidacion.experienciaPorEnemigos} XP por las criaturas abatidas (total: ${experienciaGanada} XP).`,
        );
        if (liquidacion.enemigosDerrotados.length > 0) {
          log.push(`⚔️ Criaturas abatidas: ${liquidacion.enemigosDerrotados.map(({ snapshot }) => snapshot.nombre).join(", ")}.`);
        } else {
          log.push("⚔️ No has logrado abatir a ninguna criatura.");
        }
        if (liquidacion.recompensa.madera > 0) log.push(`🪵 Aseguras ${liquidacion.recompensa.madera} de madera para el regreso.`);
        if (liquidacion.recompensa.piedra > 0) log.push(`🪨 Aseguras ${liquidacion.recompensa.piedra} de piedra para el regreso.`);
        if (liquidacion.recompensa.metal > 0) log.push(`⚙️ Aseguras ${liquidacion.recompensa.metal} de metal para el regreso.`);
        if (liquidacion.enemigosDerrotados.length > 0 && botinesTirados.length === 0) {
          log.push("🎒 Las criaturas abatidas no han soltado ningún objeto.");
        }

        const resultado = await prisma.$transaction(async (tx) => {
          await gastarRecursosHabilidad(tx, personaje.id, habilidad, recursosHabilidad, multiplicadorAscension(efectos));
          if (premioAbordaje > 0) await tx.usuario.update({ where: { id: usuario.id }, data: { oro: { increment: premioAbordaje } } });
          if (consumible) {
            const restaurado = await tx.personaje.updateMany({
              where: { id: personaje.id, energiaActual: personaje.energiaActual, manaActual: personaje.manaActual },
              data: { energiaActual: { increment: consumible.energia }, manaActual: { increment: consumible.mana } },
            });
            if (restaurado.count !== 1) throw new Error("RECURSO_COMBATE_MODIFICADO");
            const consumido = await tx.inventarioObjeto.updateMany({
              where: {
                id: consumible.inventarioObjetoId,
                inventarioId: personaje.inventario?.id,
                objetoId: consumible.id,
                cantidad: { gte: 1 },
              },
              data: { cantidad: { decrement: 1 } },
            });
            if (consumido.count !== 1) throw new Error("CONSUMIBLE_MODIFICADO");
            await tx.inventarioObjeto.deleteMany({
              where: { id: consumible.inventarioObjetoId, cantidad: { lte: 0 } },
            });
          }

          // La XP Job conserva la pequeña recompensa de consolación y además
          // reconoce cada criatura abatida, sin conceder XP por enemigos vivos.
          const progresoJobMision = await otorgarExperienciaJob(
            tx,
            personaje,
            expedicion.dificultad,
            personaje.nivel,
            modoDificultad,
            0.1,
          );
          let experienciaJobTotal = progresoJobMision?.experienciaJobGanada ?? 0;
          if (progresoJobMision && progresoJobMision.nivelesSubidos > 0) {
            log.push(`⬆️ Job de ${progresoJobMision.claseNombre}: nivel ${progresoJobMision.nivelJob}.`);
          }
          for (const { snapshot } of liquidacion.enemigosDerrotados) {
            const progresoJobEnemigo = await otorgarExperienciaJob(
              tx,
              personaje,
              snapshot.difMin,
              personaje.nivel,
              modoDificultad,
            );
            experienciaJobTotal += progresoJobEnemigo?.experienciaJobGanada ?? 0;
            if (progresoJobEnemigo && progresoJobEnemigo.nivelesSubidos > 0) {
              log.push(`⬆️ Job de ${progresoJobEnemigo.claseNombre}: nivel ${progresoJobEnemigo.nivelJob} tras abatir a ${snapshot.nombre}.`);
            }
          }
          if (experienciaJobTotal > 0) {
            log.push(`⭐ Job XP: ${experienciaJobTotal}.`);
          }

          // Las criaturas soltadas se entregan ahora. Los recursos y el oro de
          // expedición quedan asegurados en el informe y se ingresan al regresar.
          for (const { snapshot, botin } of botinesTirados) {
            const inventario = await tx.inventario.upsert({
              where: { personajeId: personaje.id },
              update: {},
              create: { personajeId: personaje.id },
            });
            const espaciosOcupados = await tx.inventarioObjeto.count({
              where: { inventarioId: inventario.id },
            });
            const nombreBotin = obtenerNombreObjetoConSufijo(botin.objeto.nombre, botin.sufijoId);
            if (espaciosOcupados >= LIMITE_INVENTARIO_OBJETOS) {
              log.push(`🎒 Botín perdido: ${nombreBotin} de ${snapshot.nombre}; el inventario está lleno.`);
              continue;
            }
            await tx.inventarioObjeto.create({
              data: {
                inventarioId: inventario.id,
                objetoId: botin.objeto.id,
                cantidad: 1,
                nivelMejora: 0,
                sufijoId: botin.sufijoId,
                bonificaciones: botin.bonificaciones as Prisma.InputJsonValue,
              },
            });
            log.push(`🎁 Botín obtenido: ${nombreBotin} (de ${snapshot.nombre}).`);
          }

          const experienciaActual = personaje.experiencia || 0;
          let nivelNuevo = personaje.nivel || 1;
          let experienciaNueva = experienciaActual + experienciaGanada;
          let nivelesSubidos = 0;
          while (experienciaNueva >= experienciaParaNivel(nivelNuevo)) {
            experienciaNueva -= experienciaParaNivel(nivelNuevo);
            nivelNuevo += 1;
            nivelesSubidos += 1;
          }
          if (nivelesSubidos > 0) {
            log.push(`⬆️ ¡Subes al nivel ${nivelNuevo}!`);
          }

          const combateActualizado = await actualizarCombateVersionado(tx, combate.id, combate.version, {
            ...(filaActorTactica!==undefined?{jugadorPosicion:["mele","centro","retaguardia"][filaActorTactica]}:{}),
            jugadorHp: 0,
            enemigos: enemigosEnCombate as unknown as Prisma.InputJsonValue,
            jugadorDefensa,
            enemigoHp,
            cooldowns,
            efectos: efectos as unknown as Prisma.InputJsonValue,
            fase: "derrota",
            turno: "jugador",
            oroGanado: oroAsegurado,
            experienciaGanada,
            botinResuelto: true,
            log,
            ultimaAccion: accionAnimada,
          });

          await tx.personaje.update({
            where: { id: personaje.id },
            data: {
              hpActual: 1,
              estado: "de_viaje",
              nivel: nivelNuevo,
              experiencia: experienciaNueva,
            },
          });

          await tx.expedicionActiva.update({
            where: { id: expedicion.id },
            data: {
              fase: "regresando",
              ...calcularFechasRegresoProgramadas(expedicion.fechaSalida, expedicion.fechaLlegada),
              recompensa: liquidacion.recompensa as unknown as Prisma.InputJsonValue,
              experienciaGanada,
              resultadoFinal: "derrota",
              hpPerdido: Math.max(0, maximoJugador - jugadorHp),
            },
          });

          const usuarioActualizado = await tx.usuario.findUnique({
            where: { id: usuario.id },
            include: incluirUsuarioTrasCombate,
          });

          return {
            combate: combateActualizado,
            usuario: usuarioActualizado,
          };
        });

        const datosUsuario = resultado.usuario
          ? Object.fromEntries(
              Object.entries(resultado.usuario).filter(([clave]) => clave !== "password"),
            )
          : null;

        return NextResponse.json({
          exito: true,
          combate: resultado.combate,
          usuario: datosUsuario,
          terminado: true,
          accion: accionAnimada,
        });
      }

      // ==========================================================
      // SIGUIENTE TURNO PVE
      // ==========================================================

      const combateActualizado = await prisma.$transaction(async (tx) => {
        await gastarRecursosHabilidad(tx, personaje.id, habilidad, recursosHabilidad, multiplicadorAscension(efectos));
        if (premioAbordaje > 0) await tx.usuario.update({ where: { id: usuario.id }, data: { oro: { increment: premioAbordaje } } });
        if (consumible) {
            const restaurado = await tx.personaje.updateMany({
              where: { id: personaje.id, energiaActual: personaje.energiaActual, manaActual: personaje.manaActual },
              data: { energiaActual: { increment: consumible.energia }, manaActual: { increment: consumible.mana } },
            });
            if (restaurado.count !== 1) throw new Error("RECURSO_COMBATE_MODIFICADO");
          const consumido = await tx.inventarioObjeto.updateMany({
            where: {
              id: consumible.inventarioObjetoId,
              inventarioId: personaje.inventario?.id,
              objetoId: consumible.id,
              cantidad: { gte: 1 },
            },
            data: { cantidad: { decrement: 1 } },
          });
          if (consumido.count !== 1) throw new Error("CONSUMIBLE_MODIFICADO");
          await tx.inventarioObjeto.deleteMany({
            where: {
              id: consumible.inventarioObjetoId,
              cantidad: { lte: 0 },
            },
          });
        }
        if (siguienteTurno === "jugador") {
          await regenerarRecursosPorTurno(tx, usuario.id, multiplicadorAscension(efectos));
        }

        return actualizarCombateVersionado(tx, combate.id, combate.version, {
            ...(filaActorTactica!==undefined?{jugadorPosicion:["mele","centro","retaguardia"][filaActorTactica]}:{}),
          jugadorHp,
          jugadorHpMaximo: maximoJugador,
          jugadorDefensa,
          enemigoHp,
          enemigoDefensa,
          enemigos: enemigosEnCombate as unknown as Prisma.InputJsonValue,
          ronda: siguienteRonda,
          turno: siguienteTurno,
          turnosPendientes: avanceTurnos.turnosPendientes as unknown as Prisma.InputJsonValue,
          cooldowns,
          efectos: efectos as unknown as Prisma.InputJsonValue,
          efectosDefensor: efectosDefensor as unknown as Prisma.InputJsonValue,
          ultimoTurnoEn: new Date(),
          log,
          ultimaAccion: accionAnimada,
        });
      });

      return NextResponse.json({
        exito: true,
        combate: combateActualizado,
        terminado: false,
        accion: accionAnimada,
      });
  } catch (error) {
    return manejarErrorAccionCombate(error);
  }
}
