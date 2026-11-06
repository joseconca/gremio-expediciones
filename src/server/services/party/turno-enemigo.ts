import { velocidadConDanza } from "@/lib/expediciones/combate/danzas-combate";
import { registrarContraofensiva, registrarEsquivaTier35 } from "@/lib/expediciones/combate/rasgos-tier35";
import { cargarLuzGuardia, cobrarAlma, marcarHuellas, registrarEsquivaTier3 } from "@/lib/expediciones/combate/rasgos-tier3";
import { crearRepresaliaRuptura, curaConsagracion } from "@/lib/expediciones/combate/protecciones-rasgos";
import {
  consumirSemillaSilvestre, curacionSemilla, elegirReceptorSemilla, registrarEsquivaHibrida, registrarVotoAuxilio,
} from "@/lib/expediciones/combate/rasgos-hibridos";
import {
  activarContraataque,
  activarDeudaOscura,
  activarSegundoAire,
  consumirNotaAlMargen,
  guardarMarcaRasgo,
  hayMaldicionBrujo,
  leerMarcaRasgo,
  limitarGolpeLetal,
  limitarVidaFueraCombate,
  multiplicadorAscension,
  multiplicadorAtaqueRasgo,
  multiplicadorDefensaRasgo,
} from "@/lib/expediciones/combate/rasgos-clase";
import { obtenerTurnoPersonal } from "@/lib/expediciones/combate/estados-combate";
import { resolverAtaqueJugador } from "@/lib/expediciones/combate/ataques-basicos";
import { gastarRecursosHabilidad } from "@/server/services/combate/accion-combate";
import {
  consumirPrecisionTactica,
  calcularAtaqueModificado,
  calcularEvasionModificada,
  calcularPrecisionModificada,
  leerEfectosCombate,
  avanzarEfectosCombate,
  comenzarTurnoCombatiente,
  aplicarBarreraAccion,
} from "@/lib/expediciones/combate/estados-combate";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolverAtaqueEnemigo } from "@/lib/expediciones/combate/ataques-basicos";
import type { AccionAnimadaCombate } from "@/lib/expediciones/combate";
import type { EstadoEfectoHabilidad } from "@/lib/tiposJuego";
import { resolverResultadoCombateParty, obtenerLogCombateParty } from "@/lib/party/combate-reglas";
import type { PasoTurnoVelocidad } from "@/lib/expediciones/combate/iniciativa-combate";
import { obtenerColaActualParty, prepararSiguienteTurnoVelocidad } from "@/lib/party/iniciativa";
import { PartyServiceError } from "./errores";
import { reducirCooldownsSiguienteParty } from "./contexto-combate";
import { liquidarRecompensasParty } from "./liquidacion-recompensas";
import { iniciarRegresoParty } from "./regreso-combate";
import { regenerarRecursosTurnoParty } from "./recursos-turno";
import { validarExpedicionId, obtenerEstadoParticipantes, cargarCombateParty } from "./contexto-combate";
import { crearEnemigoLegacy, leerEnemigosEnCombate, type EnemigoEnCombate } from "@/lib/expediciones/combate/enemigos-combate";

const AISLAMIENTO = { isolationLevel: Prisma.TransactionIsolationLevel.Serializable } as const;

export async function ejecutarTurnoEnemigoParty(usuarioId: string, idDesconocido: unknown) {
  const expedicionPartyId = validarExpedicionId(idDesconocido);
  return prisma.$transaction(async (tx) => {
    const combate = await cargarCombateParty(tx, expedicionPartyId);
    if (!combate.participantes.some((p) => p.usuarioId === usuarioId)) {
      throw new PartyServiceError("No perteneces a este combate.", 403, "NO_ES_PARTICIPANTE");
    }
    if (combate.fase !== "activo") {
      return {
        expedicionPartyId,
        combatePartyId: combate.id,
        fase: combate.fase,
        yaTerminado: true,
      };
    }
    if (combate.faseTurno !== "enemigo") {
      throw new PartyServiceError("Todavía no corresponde el turno del enemigo.", 409, "NO_ES_TURNO_ENEMIGO");
    }

    const log = obtenerLogCombateParty(combate.log);
    const rosterGuardado = leerEnemigosEnCombate(combate.enemigos);
    const enemigoLegacy = crearEnemigoLegacy({
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
      efectos: combate.efectosEnemigo,
    });
    const enemigosEnCombate: EnemigoEnCombate[] = rosterGuardado.length > 0
      ? rosterGuardado
      : enemigoLegacy ? [enemigoLegacy] : [];
    if (enemigosEnCombate.length === 0) {
      throw new PartyServiceError("El combate no contiene enemigos válidos.", 500, "ROSTER_ENEMIGO_INVALIDO");
    }

    // Solo actúa el enemigo que encabeza la cola; los siguientes enemigos
    // esperan su propio turno según la velocidad relativa.
    let participantesActualizados = obtenerEstadoParticipantes(combate.participantes);
    const colaTurnosActuales = obtenerColaActualParty(
      combate,
      combate.participantes,
      enemigosEnCombate,
      participantesActualizados,
    );
    const turnoEnemigoActual = colaTurnosActuales[0];
    if (!turnoEnemigoActual || turnoEnemigoActual.equipo !== "enemigo") {
      throw new PartyServiceError("La cola de iniciativa no apunta a un enemigo activo.", 409, "TURNO_ENEMIGO_INICIATIVA_INVALIDA");
    }
    const profesiones = await tx.personaje.findMany({
      where: { id: { in: combate.participantes.map(miembro => miembro.personajeId) } },
      select: { id: true, profesionActivaId: true },
    });
    const clases = new Map(profesiones.map(p => [p.id, p.profesionActivaId ?? "novato"]));
    if (combate.ronda === 1 && combate.participantes.some(p => p.estado === "activo" && clases.get(p.personajeId) === "rastreador")) {
      marcarHuellas(enemigosEnCombate);
    }
    const estadosDerrotados: EstadoEfectoHabilidad[][] = [];
    const curacionPorUsuario = new Map<string, number>();
    const danoPorUsuario = new Map<string, number>();
    const barrerasConsumidas = new Map<string, EstadoEfectoHabilidad[]>();
    const impactos: { actorEnemigoId: string; objetivoUsuarioId: string; dano: number; critico: boolean; hpAntes: number; hpDespues: number }[] = [];
    const actoresEnemigoIds: string[] = [];
    for (const enemigoInicial of [...enemigosEnCombate].filter((enemigo) => enemigo.id === turnoEnemigoActual.actorId)) {
      const indiceEnemigo = enemigosEnCombate.findIndex((enemigo) => enemigo.id === enemigoInicial.id);
      let enemigo = enemigosEnCombate[indiceEnemigo];
      if (enemigo.hp <= 0) continue;

      const efectosIniciales = leerEfectosCombate(enemigo.efectos);
      const ticks = comenzarTurnoCombatiente(
        efectosIniciales,
        enemigo.hp,
        enemigo.hpMaximo,
        enemigo.defensa,
        enemigo.nombre,
      );
      enemigo = {
        ...enemigo,
        hp: ticks.hp,
        defensa: ticks.defensa,
        efectos: ticks.efectos,
      };
      log.push(...ticks.mensajes.map((mensaje) => enemigo.nombre + ": " + mensaje));
      if (enemigo.hp <= 0) {
        log.push(`☠️ ${enemigo.nombre} cae por los efectos acumulados.`);
        estadosDerrotados.push(efectosIniciales);
        enemigosEnCombate[indiceEnemigo] = enemigo;
        continue;
      }

      let objetivo = participantesActualizados
        .filter((p) => p.estado === "activo" && p.jugadorHp > 0)
        .map((p) => combate.participantes.find((miembro) => miembro.usuarioId === p.usuarioId)!)
        .sort((a, b) =>
          (a.jugadorHp - (danoPorUsuario.get(a.usuarioId) ?? 0)) / Math.max(1, a.jugadorHpMaximo) -
          (b.jugadorHp - (danoPorUsuario.get(b.usuarioId) ?? 0)) / Math.max(1, b.jugadorHpMaximo) ||
          a.ordenTurno - b.ordenTurno,
        )[0];
      if (!objetivo) break;

      const protegidoId = objetivo.usuarioId;
      const interpuesto = combate.participantes.find(miembro => {
        if (miembro.usuarioId === objetivo.usuarioId || miembro.estado !== "activo" || miembro.jugadorHp <= 0 ||
            !["caballero", "cruzado"].includes(clases.get(miembro.personajeId) ?? "") || miembro.jugadorPosicion !== objetivo.jugadorPosicion) return false;
        const efectos = leerEfectosCombate(miembro.efectos);
        return leerMarcaRasgo(efectos, "_interposicion")?.valor !== obtenerTurnoPersonal(efectos);
      });
      objetivo = interpuesto ?? objetivo;
      let claseObjetivo = clases.get(objetivo.personajeId) ?? "novato";
      let participanteHpActual = Math.max(0, objetivo.jugadorHp - (danoPorUsuario.get(objetivo.usuarioId) ?? 0));
      let efectosObjetivo = barrerasConsumidas.get(objetivo.usuarioId) ?? leerEfectosCombate(objetivo.efectos);
      if (interpuesto) guardarMarcaRasgo(efectosObjetivo, "_interposicion", obtenerTurnoPersonal(efectosObjetivo));
      const accionEnemiga = resolverAtaqueEnemigo({
        efectosJugador: efectosObjetivo,
        enemigoAtaque: calcularAtaqueModificado(enemigo.ataque, enemigo.efectos),
        enemigoProbCritico: enemigo.probCritico,
        enemigoDanoCritico: enemigo.danoCritico,
        enemigoPrecision: calcularPrecisionModificada(enemigo.precision, enemigo.efectos),
        jugadorEvasion: calcularEvasionModificada(objetivo.jugadorEvasion * multiplicadorAscension(efectosObjetivo), efectosObjetivo),
        jugadorDefensa: objetivo.jugadorDefensa * multiplicadorDefensaRasgo(claseObjetivo, participanteHpActual, objetivo.jugadorHpMaximo, efectosObjetivo),
        enemigoNombre: enemigo.nombre,
      });

      consumirNotaAlMargen(enemigo.efectos);
      aplicarBarreraAccion(accionEnemiga, efectosObjetivo);
      const objetivoProteccion = objetivo.usuarioId;
      const autorContraofensiva = accionEnemiga.proteccion?.contraofensiva;
      const senor = autorContraofensiva && combate.participantes.find(p => p.usuarioId === autorContraofensiva &&
        p.estado === "activo" && p.jugadorHp > 0 && clases.get(p.personajeId) === "senor_guerra");
      if (senor) {
        const efectosSenor = senor.usuarioId === objetivo.usuarioId ? efectosObjetivo
          : barrerasConsumidas.get(senor.usuarioId) ?? leerEfectosCombate(senor.efectos);
        registrarContraofensiva(efectosSenor, enemigo.id);
        barrerasConsumidas.set(senor.usuarioId, efectosSenor);
      }
      cargarLuzGuardia(claseObjetivo, accionEnemiga.proteccion?.mitigado ?? 0, objetivo.jugadorHpMaximo, efectosObjetivo);
      const ruptura = accionEnemiga.proteccion?.ruptura;
      const abjurador = ruptura && combate.participantes.find(p => p.usuarioId === ruptura.creadorId && p.estado === "activo");
      if (ruptura && abjurador && ruptura.mana > 0) {
        await gastarRecursosHabilidad(tx, abjurador.personajeId, null, { energia: 0, mana: ruptura.mana });
        log.push(`Ruptura controlada restaura ${ruptura.mana} de maná.`);
      }
      const represalia = crearRepresaliaRuptura(accionEnemiga.proteccion);
      if (represalia.dano > 0) {
        enemigo.hp = Math.max(0, enemigo.hp - represalia.dano);
        accionEnemiga.texto += represalia.texto;
        if (enemigo.hp <= 0) estadosDerrotados.push(efectosIniciales);
      }
      if (accionEnemiga.dano >= participanteHpActual) {
        const guardiaReal = combate.participantes.find(p =>
          p.usuarioId !== objetivo.usuarioId && p.estado === "activo" && p.jugadorHp > 0 &&
          clases.get(p.personajeId) === "guardian_real" &&
          !leerMarcaRasgo(barrerasConsumidas.get(p.usuarioId) ?? leerEfectosCombate(p.efectos), "_ultimoBastion"));
        if (guardiaReal) {
          barrerasConsumidas.set(objetivo.usuarioId, efectosObjetivo);
          objetivo = guardiaReal;
          claseObjetivo = "guardian_real";
          participanteHpActual = guardiaReal.jugadorHp;
          efectosObjetivo = barrerasConsumidas.get(guardiaReal.usuarioId) ?? leerEfectosCombate(guardiaReal.efectos);
          guardarMarcaRasgo(efectosObjetivo, "_ultimoBastion", 1);
          accionEnemiga.texto += " Último bastión redirige el golpe al Guardián real.";
        }
      }
      limitarGolpeLetal(claseObjetivo, participanteHpActual, efectosObjetivo, accionEnemiga);
      registrarEsquivaHibrida(claseObjetivo, accionEnemiga, efectosObjetivo);
      registrarEsquivaTier3(claseObjetivo, accionEnemiga, efectosObjetivo, enemigo.id);
      registrarEsquivaTier35(claseObjetivo, accionEnemiga, efectosObjetivo, enemigo.id);
      const cura = objetivoProteccion === objetivo.usuarioId
        ? curaConsagracion(accionEnemiga.proteccion, Math.max(0, participanteHpActual - accionEnemiga.dano), objetivo.jugadorHpMaximo) : 0;
      if (cura > 0) {
        curacionPorUsuario.set(objetivo.usuarioId, (curacionPorUsuario.get(objetivo.usuarioId) ?? 0) + cura);
        log.push(`Consagración restaura ${cura} PV.`);
      }
      if (interpuesto) {
        if (claseObjetivo === "cruzado" && accionEnemiga.dano > 0) registrarVotoAuxilio(efectosObjetivo, protegidoId);
        accionEnemiga.texto = (claseObjetivo === "cruzado" ? "Voto de auxilio. " : "Interposición. ") + accionEnemiga.texto;
      }
      if (enemigo.posicion !== "retaguardia" && activarContraataque(claseObjetivo, accionEnemiga, efectosObjetivo)) {
        const replica = resolverAtaqueJugador({
          jugadorAtaque: calcularAtaqueModificado(objetivo.jugadorAtaque, efectosObjetivo),
          jugadorNivel: objetivo.jugadorNivel,
          jugadorProbCritico: objetivo.jugadorProbCritico,
          jugadorDanoCritico: objetivo.jugadorDanoCritico,
          jugadorPrecision: objetivo.jugadorPrecision,
          enemigoEvasion: enemigo.evasion,
          enemigoDefensa: enemigo.defensa,
          enemigoNombre: enemigo.nombre,
        });
        aplicarBarreraAccion(replica, enemigo.efectos);
        enemigo.hp = Math.max(0, enemigo.hp - replica.dano);
        if (enemigo.hp <= 0) estadosDerrotados.push(efectosIniciales);
        log.push("Respuesta de acero: " + replica.texto);
      }
      if (participanteHpActual > accionEnemiga.dano && activarSegundoAire(claseObjetivo, accionEnemiga.dano, efectosObjetivo)) {
        await gastarRecursosHabilidad(tx, objetivo.personajeId, null, { energia: 0, mana: 0, fraccionEnergiaFaltante: 0.15 });
      }
      for (const brujo of combate.participantes) {
        if (brujo.estado !== "activo" || brujo.jugadorHp <= (danoPorUsuario.get(brujo.usuarioId) ?? 0) +
          (brujo.usuarioId === objetivo.usuarioId ? accionEnemiga.dano : 0)) continue;
        const efectosBrujo = brujo.usuarioId === objetivo.usuarioId ? efectosObjetivo :
          barrerasConsumidas.get(brujo.usuarioId) ?? leerEfectosCombate(brujo.efectos);
        if (!activarDeudaOscura(clases.get(brujo.personajeId) ?? "", hayMaldicionBrujo(efectosIniciales, brujo.usuarioId), efectosBrujo)) continue;
        barrerasConsumidas.set(brujo.usuarioId, efectosBrujo);
        curacionPorUsuario.set(brujo.usuarioId, Math.max(1, Math.floor(brujo.jugadorHpMaximo * 0.05)));
        await gastarRecursosHabilidad(tx, brujo.personajeId, null, { energia: 0, mana: 5 });
        log.push("Deuda oscura restaura vida y maná.");
      }
      barrerasConsumidas.set(objetivo.usuarioId, efectosObjetivo);
      consumirPrecisionTactica(enemigo.efectos);
      const hpFinalPrevisto = Math.max(0, participanteHpActual - accionEnemiga.dano);
      danoPorUsuario.set(objetivo.usuarioId, (danoPorUsuario.get(objetivo.usuarioId) ?? 0) + accionEnemiga.dano);
      actoresEnemigoIds.push(enemigo.id);
      impactos.push({
        actorEnemigoId: enemigo.id,
        objetivoUsuarioId: objetivo.usuarioId,
        dano: accionEnemiga.dano,
        critico: accionEnemiga.critico,
        hpAntes: participanteHpActual,
        hpDespues: hpFinalPrevisto,
      });
      log.push(accionEnemiga.texto);
      if (hpFinalPrevisto <= 0) {
        log.push(`💀 ${objetivo.usuarioId} cae ante ${enemigo.nombre}.`);
        // Los enemigos posteriores pueden dirigir sus ataques contra otros aliados vivos.
        participantesActualizados = participantesActualizados.map((p) =>
          p.usuarioId === objetivo.usuarioId ? { ...p, jugadorHp: 0, estado: "caido" } : p,
        );
      }

      const avances = avanzarEfectosCombate(enemigo.efectos, enemigo.defensa);
      enemigo = { ...enemigo, efectos: avances.efectos, defensa: avances.defensa };
      log.push(...avances.mensajes.map((mensaje) => enemigo.nombre + ": " + mensaje));
      enemigosEnCombate[indiceEnemigo] = enemigo;
    }

    const totalDanoEnemigos = impactos.reduce((total, impacto) => total + impacto.dano, 0);
    const primerImpacto = impactos[0];
    const impactosAgrupadosPorAliado = [...danoPorUsuario.entries()].map(([usuarioObjetivoId, dano]) => ({
      objetivoId: usuarioObjetivoId,
      dano,
      critico: impactos.some((impacto) => impacto.objetivoUsuarioId === usuarioObjetivoId && impacto.critico),
    }));
    const accion: AccionAnimadaCombate = impactos.length > 0 ? {
      actor: "enemigo",
      actorEnemigoId: primerImpacto.actorEnemigoId,
      actoresEnemigoIds,
      impactosEnemigos: impactos.map((impacto) => ({
        actorEnemigoId: impacto.actorEnemigoId,
        objetivoId: impacto.objetivoUsuarioId,
        dano: impacto.dano,
        critico: impacto.critico,
        hpAntes: impacto.hpAntes,
        hpDespues: impacto.hpDespues,
      })),
      objetivoUsuarioId: primerImpacto.objetivoUsuarioId,
      dano: totalDanoEnemigos,
      critico: impactos.some((impacto) => impacto.critico),
      tipo: "ataque",
      animacion: "ofensiva",
      ...(impactos.length > 1 ? { impactosMultiples: impactosAgrupadosPorAliado } : {}),
      texto: impactos.length === 1
        ? `Los enemigos atacan: ${primerImpacto.objetivoUsuarioId} recibe ${totalDanoEnemigos} de daño.`
        : `${impactos.length} enemigos atacan; el grupo recibe ${totalDanoEnemigos} de daño en total.`,
    } : {
      actor: "enemigo",
      tipo: "fallo",
      animacion: "ofensiva",
      dano: 0,
      critico: false,
      texto: "No quedan enemigos capaces de atacar.",
    };

    if (estadosDerrotados.length > 0) {
      for (const miembro of combate.participantes) {
        if (miembro.estado !== "activo" || clases.get(miembro.personajeId) !== "nigromante") continue;
        const efectos = barrerasConsumidas.get(miembro.usuarioId) ?? leerEfectosCombate(miembro.efectos);
        for (const derrotado of estadosDerrotados) cobrarAlma("nigromante", miembro.usuarioId, efectos, derrotado);
        barrerasConsumidas.set(miembro.usuarioId, efectos);
      }
    }
    for (const enemigo of enemigosEnCombate) {
      if (enemigo.hp > 0 || !consumirSemillaSilvestre(enemigo.efectos)) continue;
      const receptor = elegirReceptorSemilla(combate.participantes.filter(p => p.estado === "activo").map(p => ({
        miembro: p,
        hp: p.jugadorHp > (danoPorUsuario.get(p.usuarioId) ?? 0)
          ? Math.min(p.jugadorHpMaximo, p.jugadorHp - (danoPorUsuario.get(p.usuarioId) ?? 0) + (curacionPorUsuario.get(p.usuarioId) ?? 0))
          : 0,
        maximo: p.jugadorHpMaximo,
      })));
      if (!receptor) continue;
      const id = receptor.miembro.usuarioId;
      const cura = curacionSemilla(receptor.hp, receptor.maximo);
      curacionPorUsuario.set(id, (curacionPorUsuario.get(id) ?? 0) + cura);
      log.push(`Semilla silvestre restaura ${cura} PV a ${id}.`);
    }

    for (const miembro of combate.participantes) {
      const dano = danoPorUsuario.get(miembro.usuarioId) ?? 0;
      if ((dano <= 0 && !barrerasConsumidas.has(miembro.usuarioId) && !curacionPorUsuario.has(miembro.usuarioId)) || miembro.estado !== "activo" || miembro.jugadorHp <= 0) continue;
      const nuevoHp = Math.min(miembro.jugadorHpMaximo, Math.max(0, miembro.jugadorHp - dano) + (curacionPorUsuario.get(miembro.usuarioId) ?? 0));
      const caido = nuevoHp <= 0;
      const actualizadoParticipante = await tx.combatePartyParticipante.updateMany({
        where: {
          id: miembro.id,
          combatePartyId: combate.id,
          estado: "activo",
          jugadorHp: miembro.jugadorHp,
        },
        data: {
          jugadorHp: nuevoHp,
          estado: caido ? "caido" : "activo",
          ...(barrerasConsumidas.has(miembro.usuarioId) ? { efectos: barrerasConsumidas.get(miembro.usuarioId)! as unknown as Prisma.InputJsonValue } : {}),
        },
      });
      if (actualizadoParticipante.count !== 1) {
        throw new PartyServiceError("El estado del aventurero cambió durante el turno enemigo.", 409, "PARTICIPANTE_PARTY_MODIFICADO");
      }
      const personajeActualizado = await tx.personaje.updateMany({
        where: {
          id: miembro.personajeId,
          usuarioId: miembro.usuarioId,
          estado: "combatiendo",
        },
        data: { hpActual: limitarVidaFueraCombate(nuevoHp, barrerasConsumidas.get(miembro.usuarioId) ?? leerEfectosCombate(miembro.efectos)) },
      });
      if (personajeActualizado.count !== 1) {
        throw new PartyServiceError("El personaje ya no está disponible para recibir el resultado del turno enemigo.", 409, "PERSONAJE_MODIFICADO");
      }
      participantesActualizados = participantesActualizados.map((p) =>
        p.usuarioId === miembro.usuarioId
          ? { ...p, jugadorHp: nuevoHp, estado: caido ? "caido" : "activo", ...(barrerasConsumidas.has(miembro.usuarioId) ? { efectos: barrerasConsumidas.get(miembro.usuarioId)! } : {}) }
          : p,
      );
    }

    const hayEnemigosVivos = enemigosEnCombate.some((enemigo) => enemigo.hp > 0);
    const enemigoPrincipalTrasTurno = enemigosEnCombate.find((enemigo) => enemigo.hp > 0) ?? enemigosEnCombate[0];
    const enemigoHp = hayEnemigosVivos ? enemigoPrincipalTrasTurno.hp : 0;
    const enemigoDefensa = enemigoPrincipalTrasTurno.defensa;
    const efectosEnemigo = leerEfectosCombate(enemigoPrincipalTrasTurno.efectos);
    const resultado = resolverResultadoCombateParty(enemigoHp, participantesActualizados);
    let fase = "activo";
    let faseTurno: "jugador" | "enemigo" = "jugador";
    let turnoActualUsuarioId: string | null = null;
    let ronda = combate.ronda;
    let turnosPendientes: PasoTurnoVelocidad[] = [];

    if (resultado === "victoria") {
      fase = "victoria";
      faseTurno = "enemigo";
      log.push("🏆 ¡Has derrotado a todos los enemigos del grupo!");
    } else if (resultado === "derrota") {
      fase = "derrota";
      faseTurno = "enemigo";
      log.push("💀 Todos los aventureros han caído.");
    } else if (resultado === "huida") {
      fase = "huida";
      faseTurno = "enemigo";
      log.push("🏃 Todos los aventureros han abandonado el combate.");
    } else {
      const siguiente = prepararSiguienteTurnoVelocidad(
        combate,
        combate.participantes.map(miembro => {
          const hp = participantesActualizados.find(p => p.usuarioId === miembro.usuarioId)?.jugadorHp ?? miembro.jugadorHp;
          const efectos = barrerasConsumidas.get(miembro.usuarioId) ?? leerEfectosCombate(miembro.efectos);
          const factor = clases.get(miembro.personajeId) === "berserker"
            ? multiplicadorAtaqueRasgo("berserker", hp, miembro.jugadorHpMaximo, efectos)
            : multiplicadorAscension(efectos);
          return { ...miembro, jugadorVelocidad: velocidadConDanza(miembro.jugadorVelocidad, efectos) * factor };
        }),
        enemigosEnCombate,
        participantesActualizados,
        colaTurnosActuales,
      );
      faseTurno = siguiente.faseTurno;
      turnoActualUsuarioId = siguiente.turnoActualUsuarioId;
      ronda = siguiente.ronda;
      turnosPendientes = siguiente.turnosPendientes;
    }

    if (
      fase === "activo" &&
      faseTurno === "jugador" &&
      turnoActualUsuarioId !== null
    ) {
      const siguienteMiembro = participantesActualizados.find(
        (miembro) => miembro.usuarioId === turnoActualUsuarioId && miembro.estado === "activo" && miembro.jugadorHp > 0,
      );
      if (siguienteMiembro) {
        const miembroOriginal = combate.participantes.find((miembro) => miembro.usuarioId === siguienteMiembro.usuarioId);
        if (miembroOriginal) {
          await regenerarRecursosTurnoParty(tx, miembroOriginal.personajeId, miembroOriginal.usuarioId,
            multiplicadorAscension(barrerasConsumidas.get(miembroOriginal.usuarioId) ?? leerEfectosCombate(miembroOriginal.efectos)));
        }
      }
    }

    await reducirCooldownsSiguienteParty(tx, combate.participantes, turnoActualUsuarioId);

    const actualizado = await tx.combateParty.updateMany({
      where: {
        id: combate.id,
        version: combate.version,
        fase: "activo",
        faseTurno: "enemigo",
      },
      data: {
        version: { increment: 1 },
        fase,
        faseTurno,
        turnoActualUsuarioId,
        ronda,
        turnoInicialEnemigo: false,
        turnosPendientes: turnosPendientes as unknown as Prisma.InputJsonValue,
        enemigoHp,
        enemigoDefensa,
        enemigos: enemigosEnCombate as unknown as Prisma.InputJsonValue,
        efectosEnemigo: efectosEnemigo as unknown as Prisma.InputJsonValue,
        log: log as unknown as Prisma.InputJsonValue,
        ultimaAccion: {
          ...accion,
          enemigoObjetivoId: accion.enemigoObjetivoId ?? null,
        } as unknown as Prisma.InputJsonValue,
      },
    });
    if (actualizado.count !== 1) {
      throw new PartyServiceError("El turno enemigo ya se procesó en otra petición.", 409, "COMBATE_PARTY_MODIFICADO");
    }

    const recompensas = fase === "victoria" || fase === "derrota"
      ? await liquidarRecompensasParty(tx, expedicionPartyId, combate.id, fase)
      : null;
    const regreso = fase === "victoria" || fase === "derrota" || fase === "huida"
      ? await iniciarRegresoParty(tx, expedicionPartyId, fase === "victoria" ? "exito" : fase === "huida" ? "huida" : "derrota")
      : null;

    return {
      expedicionPartyId,
      combatePartyId: combate.id,
      fase,
      ronda,
      faseTurno,
      turnoActualUsuarioId,
      enemigoHp,
      objetivoUsuarioId: primerImpacto?.objetivoUsuarioId ?? null,
      enemigos: enemigosEnCombate,
      ...(recompensas ? { recompensas } : {}),
      ...(regreso ? { regreso } : {}),
      accion,
    };
  }, AISLAMIENTO);
}
