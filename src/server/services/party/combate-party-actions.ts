import { establecerCooldownHabilidad } from "@/lib/expediciones/combate/cooldowns-habilidades";
import { calcularPesosCuracion } from "@/lib/expediciones/combate/presupuesto-curacion";
import { consumirPrecisionTactica } from "@/lib/expediciones/combate/estados-combate";
import { crearContextoTecnicaTactica } from "@/server/services/combate/contexto-tactico";
import { esConsumibleRestaurador, calcularRestauracionConsumible } from "@/lib/expediciones/combate/consumibles-combate";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  resolverAtaqueJugador,
  resolverHabilidadJugador,
  type AccionAnimadaCombate,
} from "@/lib/expediciones/combate";
import { obtenerHabilidadPorId } from "@/lib/habilidades";
import { obtenerObjetoPorId } from "@/lib/objetos";
import { calcularEstadisticasPersonaje, calcularModificadoresEquipo } from "@/lib/progresion/estadisticas-personaje";
import { obtenerEquipoDesdePersonaje } from "@/lib/equipamiento/inventario";
import { obtenerPresentacionAtaqueBasico } from "@/lib/expediciones/presentacion-combate";
import { usaAtaqueMagicoBasico } from "@/lib/expediciones/combate/ataque-basico-arma";
import { ajustarHabilidadPorNivel } from "@/lib/progresion/niveles-habilidad";
import { puedeUsarHabilidadDeClase } from "@/lib/progresion/clases";
import type { DefinicionHabilidad, EstadoEfectoHabilidad } from "@/lib/tiposJuego";
import {
  calcularAtaqueModificado,
  calcularEvasionModificada,
  calcularPrecisionModificada,
  leerEfectosCombate,
  procesarEfectosTurno,
  aplicarBarreraAccion,
  retirarEfectosHabilidad,
} from "@/lib/expediciones/combate/estados-combate";
import {
  resolverResultadoCombateParty,
  obtenerLogCombateParty,
} from "@/lib/party/combate-reglas";
import type { PasoTurnoVelocidad } from "@/lib/expediciones/combate/iniciativa-combate";
import { obtenerColaActualParty, prepararSiguienteTurnoVelocidad } from "@/lib/party/iniciativa";
import { PartyServiceError } from "./errores";
import { gastarRecursosHabilidad } from "@/server/services/combate/accion-combate";
import { reducirCooldowns, obtenerCooldowns } from "@/server/services/combate/accion-combate";
import { obtenerReglaObjetivoHabilidad, resolverObjetivosHabilidad } from "@/lib/expediciones/combate/objetivos-combate";
import { liquidarRecompensasParty } from "./liquidacion-recompensas";
import { iniciarRegresoParty } from "./regreso-combate";
import { regenerarRecursosTurnoParty } from "./recursos-turno";
import { validarExpedicionId, obtenerEstadoParticipantes, cargarCombateParty } from "./contexto-combate";
import { crearEnemigoLegacy, leerEnemigosEnCombate, obtenerEnemigoVivoPorId, leerRosterEnemigosParty, type EnemigoEnCombate } from "@/lib/expediciones/combate/enemigos-combate";

const AISLAMIENTO = { isolationLevel: Prisma.TransactionIsolationLevel.Serializable } as const;



function obtenerEfectos(valor: unknown) {
  return leerEfectosCombate(valor);
}



async function cargarPersonajeAccionParty(tx: Prisma.TransactionClient, usuarioId: string) {
  const personaje = await tx.personaje.findUnique({
    where: { usuarioId },
    select: {
      id: true, clase: true, nivel: true, velocidadMejoras: true, capacidadCarruajeMejoras: true,
      progresosClase: { select: { claseId: true, nivelJob: true, desbloqueada: true } },
      profesionActivaId: true,
      energiaActual: true,
      manaActual: true,
      manaRegeneracionPendiente: true,
      habilidades: { select: { habilidadId: true, nivel: true, slot: true } },
      inventario: { select: { id: true, objetos: { select: { id: true, objetoId: true, cantidad: true } } } },
      equipoEquipado: { include: { arma: true, armadura: true, accesorio: true, manoSecundaria: true, casco: true, pantalones: true, botas: true, guantes: true, anillo1: true, anillo2: true } },
    },
  });
  if (!personaje) {
    throw new PartyServiceError("No se encontró tu personaje.", 404, "PERSONAJE_NO_ENCONTRADO");
  }
  return personaje;
}


function convertirEfectos(valor: unknown): EstadoEfectoHabilidad[] {
  return obtenerEfectos(valor) as EstadoEfectoHabilidad[];
}

function validarCostesHabilidad(personaje: { energiaActual: number; manaActual: number }, habilidad: DefinicionHabilidad) {
  const costeEnergia = Math.max(0, Math.floor(habilidad.costeEnergia ?? 0));
  const costeMana = Math.max(0, Math.floor(habilidad.costeMana ?? 0));
  if (personaje.energiaActual < costeEnergia) {
    throw new PartyServiceError(`No tienes Energía suficiente. Necesitas ${costeEnergia}.`, 409, "ENERGIA_INSUFICIENTE");
  }
  if (personaje.manaActual < costeMana) {
    throw new PartyServiceError(`No tienes Maná suficiente. Necesitas ${costeMana}.`, 409, "MANA_INSUFICIENTE");
  }
}


export async function ejecutarAccionCombateParty(
  usuarioId: string,
  idDesconocido: unknown,
  accionDesconocida: unknown,
  payload?: { habilidadId?: unknown; objetivoId?: unknown; enemigoObjetivoId?: unknown; objetoInventarioId?: unknown; posicion?: unknown },
) {
  const expedicionPartyId = validarExpedicionId(idDesconocido);
  if (accionDesconocida !== "atacar" && accionDesconocida !== "usar_habilidad" && accionDesconocida !== "usar_objeto" && accionDesconocida !== "escapar" && accionDesconocida !== "cambiar_posicion") {
    throw new PartyServiceError("Acción de combate no válida.", 400, "ACCION_PARTY_NO_DISPONIBLE");
  }

  return prisma.$transaction(async (tx) => {
    const combate = await cargarCombateParty(tx, expedicionPartyId);
    if (combate.fase !== "activo") {
      throw new PartyServiceError("El combate ya ha terminado.", 409, "COMBATE_PARTY_TERMINADO");
    }
    const esHuida = accionDesconocida === "escapar";
    const esTurnoDelUsuario = combate.faseTurno === "jugador" && combate.turnoActualUsuarioId === usuarioId;
    // Huir es una acción de emergencia disponible para cualquier miembro activo.
    // El resto de acciones sigue estrictamente limitado al turno correspondiente.
    if (!esHuida && !esTurnoDelUsuario) {
      throw new PartyServiceError("No es tu turno de combate.", 409, "NO_ES_TU_TURNO");
    }

    const participante = combate.participantes.find((p) => p.usuarioId === usuarioId);
    if (!participante || participante.estado !== "activo" || participante.jugadorHp <= 0) {
      throw new PartyServiceError("Tu aventurero no puede actuar en este combate.", 409, "PARTICIPANTE_NO_ACTIVO");
    }

    if (accionDesconocida === "cambiar_posicion") {
      const posiciones = ["mele", "centro", "retaguardia"];
      if (typeof payload?.posicion !== "string" || !posiciones.includes(payload.posicion)) {
        throw new PartyServiceError("La posición debe ser melé, centro o retaguardia.", 400, "POSICION_PARTY_INVALIDA");
      }
      if (participante.jugadorPosicion === payload.posicion) {
        throw new PartyServiceError("Ya estás en esa posición.", 409, "POSICION_PARTY_SIN_CAMBIOS");
      }
      const log = obtenerLogCombateParty(combate.log);
      const etiquetas: Record<string, string> = { mele: "melé", centro: "centro", retaguardia: "retaguardia" };
      log.push(`↔️ ${usuarioId} cambia a la posición de ${etiquetas[payload.posicion]}.`);
      const actualizado = await tx.combateParty.updateMany({
        where: { id: combate.id, version: combate.version, fase: "activo", faseTurno: "jugador", turnoActualUsuarioId: usuarioId },
        data: { version: { increment: 1 }, log: log as unknown as Prisma.InputJsonValue },
      });
      if (actualizado.count !== 1) throw new PartyServiceError("El combate cambió al guardar la formación.", 409, "COMBATE_PARTY_MODIFICADO");
      const actualizadoPosicion = await tx.combatePartyParticipante.updateMany({
        where: { id: participante.id, estado: "activo" },
        data: { jugadorPosicion: payload.posicion },
      });
      if (actualizadoPosicion.count !== 1) throw new PartyServiceError("No se pudo guardar la posición del aventurero.", 409, "PARTICIPANTE_PARTY_MODIFICADO");
      return {
        expedicionPartyId,
        combatePartyId: combate.id,
        fase: combate.fase,
        faseTurno: combate.faseTurno,
        turnoActualUsuarioId: combate.turnoActualUsuarioId,
        ronda: combate.ronda,
        jugadorPosicion: payload.posicion,
      };
    }

    if (accionDesconocida === "escapar") {
      const enemigosParaHuida = leerRosterEnemigosParty(combate);
      const colaAntesDeHuida = obtenerColaActualParty(combate, combate.participantes, enemigosParaHuida);
      const estadoParticipantes = obtenerEstadoParticipantes(combate.participantes).map((p) =>
        p.usuarioId === usuarioId ? { ...p, estado: "huyo" } : p,
      );
      const resultadoTerminal = resolverResultadoCombateParty(combate.enemigoHp, estadoParticipantes);
      const log = obtenerLogCombateParty(combate.log);
      log.push(`🏃 ${usuarioId} huye del combate. Si sus compañeros vencen, conservará su parte del oro, pero no recibirá XP ni botín del enemigo.`);
      const terminal = resultadoTerminal !== "activo";
      const huyeEnSuTurno = combate.faseTurno === "jugador" && combate.turnoActualUsuarioId === usuarioId;
      let faseTurno: "jugador" | "enemigo" = terminal
        ? "enemigo"
        : combate.faseTurno as "jugador" | "enemigo";
      let turnoActualUsuarioId: string | null = terminal ? null : combate.turnoActualUsuarioId;
      let ronda = combate.ronda;
      let turnosPendientes: PasoTurnoVelocidad[] = terminal ? [] : colaAntesDeHuida;

      if (!terminal && huyeEnSuTurno) {
        // Si era su turno, consume esa acción y omite las demás acciones que tuviera pendientes.
        const siguiente = prepararSiguienteTurnoVelocidad(
          combate,
          combate.participantes,
          enemigosParaHuida,
          estadoParticipantes,
          colaAntesDeHuida,
        );
        faseTurno = siguiente.faseTurno;
        turnoActualUsuarioId = siguiente.turnoActualUsuarioId;
        ronda = siguiente.ronda;
        turnosPendientes = siguiente.turnosPendientes;
        if (siguiente.nuevaRonda) {
          // Huir consume el turno actual; si con ello termina el ciclo,
          // los cooldowns avanzan igual que con cualquier otra acción.
          for (const miembro of combate.participantes) {
            const bruto = miembro.cooldowns && typeof miembro.cooldowns === "object" && !Array.isArray(miembro.cooldowns)
              ? Object.fromEntries(Object.entries(miembro.cooldowns).filter(([, valor]) => typeof valor === "number" && Number.isFinite(valor) && valor > 0))
              : {};
            const guardado = await tx.combatePartyParticipante.updateMany({
              where: { id: miembro.id, combatePartyId: combate.id },
              data: { cooldowns: reducirCooldowns(bruto as Record<string, number>) as unknown as Prisma.InputJsonValue },
            });
            if (guardado.count !== 1) {
              throw new PartyServiceError("No se pudieron actualizar los cooldowns al cerrar el ciclo de iniciativa.", 409, "PARTICIPANTE_PARTY_MODIFICADO");
            }
          }
        }
      } else if (!terminal) {
        // La huida fuera de turno no consume la acción que ya correspondía a otro actor.
        turnosPendientes = colaAntesDeHuida.filter((paso) => paso.actorId !== usuarioId);
      } else if (terminal) {
        log.push(
          resultadoTerminal === "victoria"
            ? `🏆 ${combate.enemigoNombre} ya había caído.`
            : resultadoTerminal === "huida"
              ? "🏃 Toda la party ha abandonado el combate."
              : "💀 No quedan aventureros capaces de continuar.",
        );
      }
      const actualizado = await tx.combateParty.updateMany({
        // Se valida fase+versión, pero no el turno: la huida puede ocurrir
        // cuando actúa otro aliado o durante el turno de los enemigos.
        where: { id: combate.id, version: combate.version, fase: "activo" },
        data: {
          version: { increment: 1 },
          fase: terminal ? resultadoTerminal : "activo",
          faseTurno,
          turnoActualUsuarioId,
          ronda,
          turnosPendientes: turnosPendientes as unknown as Prisma.InputJsonValue,
          log: log as unknown as Prisma.InputJsonValue,
          ultimaAccion: { actor: "jugador", actorUsuarioId: usuarioId, tipo: "fallo", animacion: "defensiva", dano: 0, critico: false, texto: "Huyes del combate." } as unknown as Prisma.InputJsonValue,
        },
      });
      if (actualizado.count !== 1) throw new PartyServiceError("El combate cambió al procesar la huida.", 409, "COMBATE_PARTY_MODIFICADO");
      await tx.combatePartyParticipante.updateMany({
        where: { id: participante.id, estado: "activo" },
        data: { estado: "huyo" },
      });
      await tx.expedicionPartyParticipante.updateMany({
        where: { expedicionPartyId, usuarioId, estado: { not: "retirado" } },
        data: { estado: "huyo" },
      });
      const recompensas = terminal && resultadoTerminal === "victoria"
        ? await liquidarRecompensasParty(tx, expedicionPartyId, combate.id)
        : null;
      const regreso = terminal
        ? await iniciarRegresoParty(
            tx,
            expedicionPartyId,
            resultadoTerminal === "victoria" ? "exito" : resultadoTerminal === "huida" ? "huida" : "derrota",
          )
        : null;
      return {
        expedicionPartyId,
        combatePartyId: combate.id,
        fase: terminal ? resultadoTerminal : "activo",
        ronda,
        faseTurno,
        turnoActualUsuarioId,
        enemigoHp: combate.enemigoHp,
        jugadorHp: participante.jugadorHp,
        ...(recompensas ? { recompensas } : {}),
        ...(regreso ? { regreso } : {}),
        accion: { actor: "jugador", tipo: "fallo", animacion: "defensiva", dano: 0, critico: false, texto: "Huyes del combate." },
      };
    }

    const personaje = await cargarPersonajeAccionParty(tx, usuarioId);
    const bonusCuracion = personaje.habilidades.reduce((total, h) => {
      const definicion = obtenerHabilidadPorId(h.habilidadId);
      return h.slot?.startsWith("pasiva_") && definicion?.tipo === "pasiva" && puedeUsarHabilidadDeClase(personaje.profesionActivaId || "novato", definicion.claseId)
        ? total + (ajustarHabilidadPorNivel(definicion, h.nivel).bonusCuracion ?? 0) : total;
    }, 0);
    let efectosJugador = convertirEfectos(participante.efectos);
    let cooldowns = obtenerCooldowns(participante.cooldowns);
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
    let enemigosEnCombate: EnemigoEnCombate[] = rosterGuardado.length > 0
      ? rosterGuardado
      : enemigoLegacy ? [enemigoLegacy] : [];
    if (enemigosEnCombate.length === 0) {
      throw new PartyServiceError("El combate no contiene enemigos válidos.", 500, "ROSTER_ENEMIGO_INVALIDO");
    }
    const colaTurnosActuales = obtenerColaActualParty(combate, combate.participantes, enemigosEnCombate);
    const idEnemigoSolicitado = typeof payload?.enemigoObjetivoId === "string"
      ? payload.enemigoObjetivoId
      : typeof payload?.objetivoId === "string" && payload.objetivoId.startsWith("enemigo-")
        ? payload.objetivoId
        : null;
    const enemigoSeleccionado = obtenerEnemigoVivoPorId(enemigosEnCombate, idEnemigoSolicitado);
    if (!enemigoSeleccionado) {
      throw new PartyServiceError("El enemigo seleccionado ya no está disponible.", 409, "ENEMIGO_OBJETIVO_NO_ACTIVO");
    }
    let efectosEnemigo = obtenerEfectos(enemigoSeleccionado.efectos);
    let enemigoHp = enemigoSeleccionado.hp;
    const estadoInicioTurno = procesarEfectosTurno(
      efectosJugador,
      participante.jugadorHp,
      participante.jugadorHpMaximo,
      participante.jugadorDefensa,
      personaje.id,
    );
    let jugadorHp = estadoInicioTurno.hp;
    let jugadorDefensa = estadoInicioTurno.defensa;
    efectosJugador = estadoInicioTurno.efectos;
    let enemigoDefensa = enemigoSeleccionado.defensa;
    if (estadoInicioTurno.mensajes.length > 0) {
      efectosJugador = estadoInicioTurno.efectos;
    }
    let habilidad: DefinicionHabilidad | null = null;
    let objetoConsumible: { inventarioObjetoId: string; objetoId: string; curacion: number; energia: number; mana: number; nombre: string } | null = null;
    let accion: AccionAnimadaCombate;
    let filaActorTactica: number | undefined;
    let recursosHabilidad = { energia:0,mana:0 };
    const instantaneaActorTactico = () => ({ id: usuarioId, hp: jugadorHp, hpMaximo: participante.jugadorHpMaximo, ataque: participante.jugadorAtaque, ataqueMagico: participante.jugadorAtaqueMagico, defensa: jugadorDefensa, defensaMagica: participante.jugadorDefensaMagica, posicion: participante.jugadorPosicion, efectos: efectosJugador });
    const danoEnemigoPorId = new Map<string, number>();
    const efectosEnemigoPorId = new Map<string, { defensa: number; efectos: ReturnType<typeof obtenerEfectos> }>();
    const objetivosAliadosModificados = new Map<string, {
      usuarioId: string;
      participanteId: string;
      personajeId: string;
      hpOriginal: number;
      hp: number;
      defensa: number;
      efectos: ReturnType<typeof obtenerEfectos>;
    }>();

    if (accionDesconocida === "atacar") {
      const armaEquipadaId = personaje.equipoEquipado?.arma?.objetoId;
      const subtipoArma = armaEquipadaId ? obtenerObjetoPorId(armaEquipadaId)?.subtipo : undefined;
      const usarAtaqueMagico = usaAtaqueMagicoBasico(subtipoArma);
      accion = resolverAtaqueJugador({
        efectosEnemigo,
        jugadorAtaque: calcularAtaqueModificado(participante.jugadorAtaque, efectosJugador),
        jugadorAtaqueMagico: calcularAtaqueModificado(participante.jugadorAtaqueMagico, efectosJugador, true),
        usarMejorAtaqueMagico: usarAtaqueMagico,
        jugadorNivel: participante.jugadorNivel,
        jugadorProbCritico: participante.jugadorProbCritico,
        jugadorDanoCritico: participante.jugadorDanoCritico,
        jugadorPrecision: calcularPrecisionModificada(participante.jugadorPrecision, efectosJugador),
        enemigoEvasion: calcularEvasionModificada(enemigoSeleccionado.evasion, efectosEnemigo),
        enemigoDefensa,
        enemigoDefensaMagica: enemigoSeleccionado.defensaMagica,
        enemigoNombre: enemigoSeleccionado.nombre,
      });
      aplicarBarreraAccion(accion,efectosEnemigo);
      consumirPrecisionTactica(efectosJugador);
      efectosEnemigoPorId.set(enemigoSeleccionado.id,{defensa:enemigoSeleccionado.defensa,efectos:efectosEnemigo});
      accion = { ...accion, enemigoObjetivoId: enemigoSeleccionado.id };
      danoEnemigoPorId.set(enemigoSeleccionado.id, accion.dano);
      const presentacionArma = obtenerPresentacionAtaqueBasico(subtipoArma);
      if (presentacionArma) accion = { ...accion, presentacion: presentacionArma };
    } else if (accionDesconocida === "usar_habilidad") {
      if (typeof payload?.habilidadId !== "string" || !payload.habilidadId.trim()) {
        throw new PartyServiceError("Debes indicar una habilidad.", 400, "HABILIDAD_ID_REQUERIDO");
      }
      const habilidadAprendida = personaje.habilidades.find(
        (aprendida) =>
          aprendida.habilidadId === payload.habilidadId &&
          ["activa_1", "activa_2", "activa_3", "activa_4", "activa_5"].includes(aprendida.slot ?? ""),
      );
      if (!habilidadAprendida) {
        throw new PartyServiceError("No tienes esa habilidad equipada en una ranura activa.", 403, "HABILIDAD_NO_EQUIPADA");
      }
      const definicion = obtenerHabilidadPorId(habilidadAprendida.habilidadId);
      if (!definicion) {
        throw new PartyServiceError("No se encontró la definición de la habilidad.", 404, "HABILIDAD_NO_ENCONTRADA");
      }
      habilidad = ajustarHabilidadPorNivel(definicion, habilidadAprendida.nivel);
      if (habilidad.tipo !== "activa") {
        throw new PartyServiceError("Solo puedes utilizar habilidades activas durante el combate.", 400, "HABILIDAD_NO_ACTIVA");
      }
      if (!puedeUsarHabilidadDeClase(personaje.profesionActivaId || "novato", habilidad.claseId)) {
        throw new PartyServiceError("Tu profesión no puede utilizar esa habilidad.", 403, "HABILIDAD_CLASE_NO_VALIDA");
      }
      if ((cooldowns[habilidad.id] ?? 0) > 0) {
        throw new PartyServiceError(`Esta habilidad está en cooldown durante ${cooldowns[habilidad.id]} turno(s).`, 409, "HABILIDAD_EN_COOLDOWN");
      }
      validarCostesHabilidad(personaje, habilidad);

      const reglaObjetivo = obtenerReglaObjetivoHabilidad(habilidad);
      const seleccionObjetivos = resolverObjetivosHabilidad({
        habilidad,
        actorId: usuarioId,
        objetivoId: reglaObjetivo.equipo === "enemigo"
          ? idEnemigoSolicitado
          : typeof payload?.objetivoId === "string" ? payload.objetivoId : null,
        combatientes: [
          ...combate.participantes.map((p) => ({
            id: p.usuarioId,
            nombre: p.usuarioId,
            equipo: "aliado" as const,
            posicion: p.jugadorPosicion,
            columna: p.ordenTurno % 3,
            hpActual: p.jugadorHp,
            estado: p.estado,
          })),
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
      if (seleccionObjetivos.error || seleccionObjetivos.objetivos.length === 0) {
        throw new PartyServiceError(
          seleccionObjetivos.error === "objetivo_no_valido"
            ? "El objetivo seleccionado no pertenece al grupo válido de la habilidad."
            : seleccionObjetivos.error === "limite_formacion_excedido"
              ? "La formación excede el límite de nueve combatientes por equipo."
              : "No hay objetivos válidos para esta habilidad.",
          400,
          "OBJETIVO_COMBATE_INVALIDO",
        );
      }

      if (reglaObjetivo.equipo === "aliado" || reglaObjetivo.equipo === "propio") {
        const resultados = [];
        const objetivosAliados = seleccionObjetivos.objetivos.filter((objetivo) => objetivo.equipo === "aliado");
        const pesos=calcularPesosCuracion(objetivosAliados.map(o=>{const p=combate.participantes.find(p=>p.usuarioId===o.id)!;return {id:o.id,hp:o.id===usuarioId?jugadorHp:p.jugadorHp,hpMaximo:p.jugadorHpMaximo};}));
        for (const [indiceObjetivo,objetivo] of objetivosAliados.entries()) {
          const aliado = combate.participantes.find((p) => p.usuarioId === objetivo.id);
          if (!aliado || aliado.estado !== "activo" || aliado.jugadorHp <= 0) {
            throw new PartyServiceError("El aliado seleccionado ya no puede recibir esa habilidad.", 409, "OBJETIVO_ALIADO_NO_ACTIVO");
          }
          const esPropio = aliado.usuarioId === usuarioId;
          const hpAliado = esPropio ? jugadorHp : aliado.jugadorHp;
          const previos = retirarEfectosHabilidad(esPropio ? efectosJugador : obtenerEfectos(aliado.efectos), habilidad.id, esPropio ? jugadorDefensa : aliado.jugadorDefensa);
          const efectosDelObjetivo = previos.efectos;
          const resultadoObjetivo = resolverHabilidadJugador(habilidad, {
            contextoTactico: (habilidad.programaTactico || habilidad.versionReglas===2) ? crearContextoTecnicaTactica(personaje, combate.ronda, instantaneaActorTactico(), { id: aliado.usuarioId, hp: hpAliado, hpMaximo: aliado.jugadorHpMaximo, ataque: aliado.jugadorAtaque, ataqueMagico: aliado.jugadorAtaqueMagico, defensa: previos.defensa, defensaMagica: aliado.jugadorDefensaMagica, posicion: aliado.jugadorPosicion, efectos: efectosDelObjetivo }, true,{numeroObjetivos:objetivosAliados.length,principal:indiceObjetivo===0,...(habilidad.versionReglas===2&&habilidad.efecto==="curacion"&&habilidad.objetivo?.patron!=="individual"?{pesoCuracion:pesos[objetivo.id]}:{})}) : undefined,
            bonusCuracion,
            jugadorAtaque: calcularAtaqueModificado(participante.jugadorAtaque, efectosJugador),
            jugadorAtaqueMagico: calcularAtaqueModificado(participante.jugadorAtaqueMagico, efectosJugador, true),
            jugadorProbCritico: participante.jugadorProbCritico,
            jugadorDanoCritico: participante.jugadorDanoCritico,
            jugadorPrecision: calcularPrecisionModificada(participante.jugadorPrecision, efectosJugador),
            enemigoEvasion: calcularEvasionModificada(combate.enemigoEvasion, efectosEnemigo),
            jugadorDefensa: previos.defensa,
            jugadorDefensaMagica: aliado.jugadorDefensaMagica,
            jugadorNivel: participante.jugadorNivel,
            jugadorHp: hpAliado,
            jugadorHpMaximo: aliado.jugadorHpMaximo,
            enemigoDefensa,
            enemigoDefensaMagica: combate.enemigoDefensaMagica,
            enemigoNombre: combate.enemigoNombre,
            efectosJugador: efectosDelObjetivo,
          });
          if(resultadoObjetivo.efectosActorActualizados) efectosJugador = resultadoObjetivo.efectosActorActualizados;
          if(resultadoObjetivo.actorHpActualizado !== undefined) jugadorHp = resultadoObjetivo.actorHpActualizado;
          if(resultadoObjetivo.actorDefensaActualizada !== undefined) jugadorDefensa = resultadoObjetivo.actorDefensaActualizada;
          if(indiceObjetivo===0) recursosHabilidad = resultadoObjetivo.recursosRecuperados ?? recursosHabilidad;
          const efectosNuevosAliado = [
            ...(resultadoObjetivo.efectosJugadorActualizados ?? efectosDelObjetivo),
            ...resultadoObjetivo.efectos.filter((efecto) => efecto.objetivo === "jugador"),
          ];
          objetivosAliadosModificados.set(aliado.usuarioId, {
            usuarioId: aliado.usuarioId,
            participanteId: aliado.id,
            personajeId: aliado.personajeId,
            hpOriginal: aliado.jugadorHp,
            hp: resultadoObjetivo.jugadorHp,
            defensa: resultadoObjetivo.jugadorDefensa,
            efectos: efectosNuevosAliado,
          });
          if (aliado.usuarioId === usuarioId) {
            jugadorHp = resultadoObjetivo.jugadorHp;
            jugadorDefensa = resultadoObjetivo.jugadorDefensa;
            efectosJugador = efectosNuevosAliado;
          }
          for (const estado of resultadoObjetivo.efectos.filter((efecto) => efecto.objetivo === "enemigo")) {
            efectosEnemigo = [
              ...efectosEnemigo.filter((existente) => existente.habilidadId !== estado.habilidadId || existente.objetivo !== estado.objetivo),
              estado,
            ];
          }
          resultados.push({
            objetivoUsuarioId: aliado.usuarioId,
            resultado: resultadoObjetivo,
            curacion: Math.max(0, resultadoObjetivo.jugadorHp - hpAliado),
          });
        }
        if (resultados.length === 0) {
          throw new PartyServiceError("No hay aliados vivos en el área de esa habilidad.", 409, "SIN_ALIADOS_OBJETIVO");
        }
        const primera = resultados[0];


        filaActorTactica = primera.resultado.filaActorActualizada;
        const curacionTotal = resultados.reduce((total, resultado) => total + resultado.curacion, 0);
        const danoTotal = resultados.reduce((total, resultado) => total + resultado.resultado.accion.dano, 0);
        const accionBase = { ...primera.resultado.accion };
        if (resultados.length > 1) delete accionBase.curacion;
        accion = {
          ...accionBase,
          dano: danoTotal,
          ...(resultados.length === 1 && curacionTotal > 0 ? { curacion: curacionTotal } : {}),
          objetivoUsuarioId: primera.objetivoUsuarioId,
          objetivosUsuarioIds: resultados.map((resultado) => resultado.objetivoUsuarioId),
          ...(resultados.length > 1
            ? {
                pulsosEstado: resultados
                  .filter((resultado) => resultado.curacion > 0)
                  .map((resultado) => ({
                    objetivo: "jugador" as const,
                    objetivoUsuarioId: resultado.objetivoUsuarioId,
                    tipo: "curacion" as const,
                    cantidad: resultado.curacion,
                  })),
              }
            : {}),
          texto: resultados.length > 1
            ? habilidad.nombre + " afecta a " + resultados.length + " aliados."
            : primera.resultado.accion.texto,
        };
      } else {
        const objetivosEnemigos = seleccionObjetivos.objetivos.filter((objetivo) => objetivo.equipo === "enemigo");
        if (objetivosEnemigos.length === 0) {
          throw new PartyServiceError("La habilidad ofensiva no tiene enemigos válidos.", 409, "SIN_ENEMIGOS_OBJETIVO");
        }
        const resultados = objetivosEnemigos.map((objetivo,indiceObjetivo) => {
          const enemigo = enemigosEnCombate.find((entrada) => entrada.id === objetivo.id);
          if (!enemigo || enemigo.hp <= 0) {
            throw new PartyServiceError("Uno de los enemigos elegidos ya no está activo.", 409, "ENEMIGO_OBJETIVO_NO_ACTIVO");
          }
          const efectosDelEnemigo = obtenerEfectos(enemigo.efectos);
          const resultado = resolverHabilidadJugador(habilidad!, {
            contextoTactico: (habilidad?.programaTactico || habilidad?.versionReglas===2) ? crearContextoTecnicaTactica(personaje, combate.ronda, instantaneaActorTactico(), { id: enemigo.id, hp: enemigo.hp, hpMaximo: enemigo.hpMaximo, ataque: enemigo.ataque, ataqueMagico: enemigo.ataqueMagico, defensa: enemigo.defensa, defensaMagica: enemigo.defensaMagica, posicion: enemigo.posicion, efectos: efectosDelEnemigo }, false,{numeroObjetivos:objetivosEnemigos.length,principal:indiceObjetivo===0}) : undefined,
            bonusCuracion,
            efectosEnemigo: efectosDelEnemigo,
            jugadorAtaque: calcularAtaqueModificado(participante.jugadorAtaque, efectosJugador),
            jugadorAtaqueMagico: calcularAtaqueModificado(participante.jugadorAtaqueMagico, efectosJugador, true),
            jugadorProbCritico: participante.jugadorProbCritico,
            jugadorDanoCritico: participante.jugadorDanoCritico,
            jugadorPrecision: calcularPrecisionModificada(participante.jugadorPrecision, efectosJugador),
            enemigoEvasion: calcularEvasionModificada(enemigo.evasion, efectosDelEnemigo),
            jugadorDefensa,
            jugadorDefensaMagica: participante.jugadorDefensaMagica,
            jugadorNivel: participante.jugadorNivel,
            jugadorHp,
            jugadorHpMaximo: participante.jugadorHpMaximo,
            enemigoDefensa: enemigo.defensa,
            enemigoDefensaMagica: enemigo.defensaMagica,
            enemigoNombre: enemigo.nombre,
            efectosJugador,
          });
          const nuevosEfectosEnemigo = resultado.efectosEnemigoActualizados ?? [
            ...efectosDelEnemigo.filter((efecto) => !resultado.efectos.some((nuevo) =>
              nuevo.objetivo === "enemigo" && nuevo.habilidadId === efecto.habilidadId)),
            ...resultado.efectos.filter((efecto) => efecto.objetivo === "enemigo"),
          ];
          efectosEnemigoPorId.set(enemigo.id, {
            defensa: resultado.enemigoDefensa,
            efectos: nuevosEfectosEnemigo,
          });
          danoEnemigoPorId.set(enemigo.id, resultado.accion.dano);
          return { enemigo, resultado };
        });
        const primero = resultados[0];
        const danoTotal = resultados.reduce((total, entrada) => total + entrada.resultado.accion.dano, 0);
        const accionBase = { ...primero.resultado.accion };
        accion = {
          ...accionBase,
          dano: danoTotal,
          enemigoObjetivoId: primero.enemigo.id,
          objetivosEnemigoIds: resultados.map((entrada) => entrada.enemigo.id),
          ...(resultados.length > 1 ? {
            impactosMultiples: resultados.map((entrada) => ({
              objetivoId: entrada.enemigo.id,
              dano: entrada.resultado.accion.dano,
              critico: entrada.resultado.accion.critico,
            })),
            texto: habilidad.nombre + " afecta a " + resultados.length + " enemigos.",
          } : {}),
        };
        jugadorHp = primero.resultado.jugadorHp;
        filaActorTactica = primero.resultado.filaActorActualizada;
        recursosHabilidad = primero.resultado.recursosRecuperados ?? recursosHabilidad;
        jugadorDefensa = primero.resultado.jugadorDefensa;
        efectosJugador = [
          ...efectosJugador.filter((efecto) => !primero.resultado.efectosJugadorActualizados?.some((actualizado) =>
            actualizado.habilidadId === efecto.habilidadId && actualizado.objetivo === efecto.objetivo)),
          ...(primero.resultado.efectosJugadorActualizados ?? []),
          ...primero.resultado.efectos.filter((efecto) => efecto.objetivo === "jugador"),
        ];
        const enemigoActual = enemigosEnCombate.find((enemigo) => enemigo.id === primero.enemigo.id);
        enemigoDefensa = enemigoActual?.defensa ?? enemigoDefensa;
      }
      establecerCooldownHabilidad(cooldowns,habilidad);
      await gastarRecursosHabilidad(tx, personaje.id, habilidad, recursosHabilidad);
    } else {
      if (typeof payload?.objetoInventarioId !== "string" || !payload.objetoInventarioId.trim()) {
        throw new PartyServiceError("Debes seleccionar una poción del inventario.", 400, "OBJETO_ID_REQUERIDO");
      }
      const item = personaje.inventario?.objetos.find((entrada) => entrada.id === payload.objetoInventarioId);
      if (!item || item.cantidad < 1) {
        throw new PartyServiceError("No tienes ese objeto en el inventario.", 404, "OBJETO_NO_DISPONIBLE");
      }
      const definicion = obtenerObjetoPorId(item.objetoId);
      if (!definicion || !esConsumibleRestaurador(definicion)) {
        throw new PartyServiceError("Solo se pueden usar consumibles de vida, energía o maná durante el combate.", 400, "OBJETO_NO_USABLE");
      }
      const equipo = obtenerEquipoDesdePersonaje({ equipoEquipado: personaje.equipoEquipado });
      const stats = calcularEstadisticasPersonaje({ ...personaje, nivelJob: personaje.progresosClase?.find((p) => p.claseId === personaje.profesionActivaId)?.nivelJob ?? 1 },
        personaje.habilidades.filter((h) => h.slot?.startsWith("pasiva_")), calcularModificadoresEquipo(equipo, personaje.profesionActivaId)).total;
      const restauracion = calcularRestauracionConsumible(definicion, {
        hp: jugadorHp, hpMaximo: participante.jugadorHpMaximo,
        energia: personaje.energiaActual, energiaMaxima: stats.energiaMaxima ?? 100,
        mana: personaje.manaActual, manaMaximo: stats.manaMaximo ?? 10,
      });
      const { curacion } = restauracion;
      if (curacion + restauracion.energia + restauracion.mana <= 0) {
        throw new PartyServiceError("Los recursos que restaura este objeto ya están al máximo.", 409, "RECURSOS_AL_MAXIMO");
      }
      objetoConsumible = { inventarioObjetoId: item.id, objetoId: item.objetoId, ...restauracion, nombre: definicion.nombre };
      jugadorHp += curacion;
      accion = {
        actor: "jugador",
        tipo: "habilidad",
        animacion: "curacion",
        dano: 0,
        curacion,
        critico: false,
        texto: `Usas ${definicion.nombre}: +${curacion} PV, +${restauracion.energia} de energía y +${restauracion.mana} de maná.`,
        accionSprite: "use_consumable",
      };
    }

    enemigosEnCombate = enemigosEnCombate.map((enemigo) => {
      const dano = danoEnemigoPorId.get(enemigo.id) ?? 0;
      const extras = efectosEnemigoPorId.get(enemigo.id);
      return {
        ...enemigo,
        hp: Math.max(0, enemigo.hp - dano),
        defensa: extras?.defensa ?? enemigo.defensa,
        efectos: extras?.efectos ?? enemigo.efectos,
      };
    });
    const enemigosVivosTrasAccion = enemigosEnCombate.filter((enemigo) => enemigo.hp > 0);
    const enemigoPrincipalTrasAccion = enemigosVivosTrasAccion[0] ?? enemigosEnCombate[0];
    enemigoHp = enemigosVivosTrasAccion.length > 0 ? enemigoPrincipalTrasAccion.hp : 0;
    enemigoDefensa = enemigoPrincipalTrasAccion.defensa;
    efectosEnemigo = obtenerEfectos(enemigoPrincipalTrasAccion.efectos);
    const estadoParticipantes = obtenerEstadoParticipantes(combate.participantes).map((p) =>
      p.usuarioId === usuarioId ? { ...p, jugadorHp, estado: jugadorHp > 0 ? "activo" : "caido" } : p,
    );
    const resultadoTerminal = resolverResultadoCombateParty(enemigoHp, estadoParticipantes);
    const log = obtenerLogCombateParty(combate.log);
    log.push(...estadoInicioTurno.mensajes);
    log.push(accion.texto);

    let faseTurno: "jugador" | "enemigo" = "enemigo";
    let turnoActualUsuarioId: string | null = null;
    let ronda = combate.ronda;
    let turnosPendientes: PasoTurnoVelocidad[] = [];
    let nuevaRonda = false;
    let fase = "activo";
    if (resultadoTerminal === "victoria") {
      fase = "victoria";
      log.push("🏆 ¡Has derrotado a todos los enemigos del grupo!");
    } else if (resultadoTerminal === "derrota") {
      fase = "derrota";
      log.push("💀 Todos los aventureros han caído.");
    } else if (resultadoTerminal === "huida") {
      fase = "huida";
      log.push("🏃 Todos los aventureros han abandonado el combate.");
    } else {
      const siguiente = prepararSiguienteTurnoVelocidad(
        combate,
        combate.participantes,
        enemigosEnCombate,
        estadoParticipantes,
        colaTurnosActuales,
      );
      faseTurno = siguiente.faseTurno;
      turnoActualUsuarioId = siguiente.turnoActualUsuarioId;
      ronda = siguiente.ronda;
      turnosPendientes = siguiente.turnosPendientes;
      nuevaRonda = siguiente.nuevaRonda;
    }

    if (nuevaRonda) {
      // Un cooldown avanza al completarse todo el ciclo, con independencia
      // de qué equipo haya ejecutado la última acción.
      cooldowns = reducirCooldowns(cooldowns);
      for (const miembro of combate.participantes) {
        if (miembro.usuarioId === usuarioId) continue;
        const valor = miembro.cooldowns;
        const bruto = valor && typeof valor === "object" && !Array.isArray(valor)
          ? Object.fromEntries(Object.entries(valor).filter(([, n]) => typeof n === "number" && Number.isFinite(n) && n > 0))
          : {};
        const guardado = await tx.combatePartyParticipante.updateMany({
          where: { id: miembro.id, combatePartyId: combate.id },
          data: { cooldowns: reducirCooldowns(bruto as Record<string, number>) as unknown as Prisma.InputJsonValue },
        });
        if (guardado.count !== 1) {
          throw new PartyServiceError("No se pudieron actualizar los cooldowns de la party.", 409, "PARTICIPANTE_PARTY_MODIFICADO");
        }
      }
    }

    // Todos los cambios de recursos/inventario y el avance del turno son atómicos.
    const actualizado = await tx.combateParty.updateMany({
      where: {
        id: combate.id,
        version: combate.version,
        fase: "activo",
        faseTurno: "jugador",
        turnoActualUsuarioId: usuarioId,
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
        ultimaAccion: { ...accion, actorUsuarioId: usuarioId } as unknown as Prisma.InputJsonValue,
      },
    });
    if (actualizado.count !== 1) {
      throw new PartyServiceError("El combate ha cambiado mientras se resolvía tu acción. Actualiza e inténtalo de nuevo.", 409, "COMBATE_PARTY_MODIFICADO");
    }

    const participanteActualizado = await tx.combatePartyParticipante.updateMany({
      where: { id: participante.id, jugadorHp: participante.jugadorHp },
      data: {
        jugadorHp,
        jugadorDefensa,
        ...(filaActorTactica !== undefined ? { jugadorPosicion: ["mele", "centro", "retaguardia"][filaActorTactica] } : {}),
        estado: jugadorHp > 0 ? "activo" : "caido",
        efectos: efectosJugador as unknown as Prisma.InputJsonValue,
        cooldowns: cooldowns as unknown as Prisma.InputJsonValue,
      },
    });
    if (participanteActualizado.count !== 1) {
      throw new PartyServiceError("El estado individual del aventurero cambió durante la acción.", 409, "PARTICIPANTE_PARTY_MODIFICADO");
    }

    // Las habilidades de soporte de área se aplican a todos los aliados elegidos
    // dentro de la misma transacción. El propio actor ya se ha guardado arriba.
    for (const objetivoAliado of objetivosAliadosModificados.values()) {
      if (objetivoAliado.usuarioId === usuarioId) continue;

      const aliadoActualizado = await tx.combatePartyParticipante.updateMany({
        where: {
          id: objetivoAliado.participanteId,
          jugadorHp: objetivoAliado.hpOriginal,
          estado: "activo",
        },
        data: {
          jugadorHp: objetivoAliado.hp,
          jugadorDefensa: objetivoAliado.defensa,
          estado: objetivoAliado.hp > 0 ? "activo" : "caido",
          efectos: objetivoAliado.efectos as unknown as Prisma.InputJsonValue,
        },
      });
      if (aliadoActualizado.count !== 1) {
        throw new PartyServiceError(
          "El estado de un aliado cambió mientras se aplicaba la habilidad.",
          409,
          "OBJETIVO_ALIADO_MODIFICADO",
        );
      }

      if (objetivoAliado.hp !== objetivoAliado.hpOriginal) {
        const personajeAliadoActualizado = await tx.personaje.updateMany({
          where: {
            id: objetivoAliado.personajeId,
            estado: "combatiendo",
          },
          data: { hpActual: objetivoAliado.hp },
        });
        if (personajeAliadoActualizado.count !== 1) {
          throw new PartyServiceError(
            "No se pudo sincronizar la salud del aliado afectado.",
            409,
            "SALUD_OBJETIVO_ALIADO_NO_SINCRONIZADA",
          );
        }
      }
    }

    const personajeActualizado = await tx.personaje.updateMany({
      where: { id: personaje.id, usuarioId, estado: "combatiendo" },
      data: { hpActual: jugadorHp },
    });
    if (personajeActualizado.count !== 1) {
      throw new PartyServiceError("No se pudo sincronizar la salud del aventurero.", 409, "PERSONAJE_PARTY_MODIFICADO");
    }

    if (objetoConsumible) {
      const restaurado = await tx.personaje.updateMany({
        where: { id: personaje.id, energiaActual: personaje.energiaActual, manaActual: personaje.manaActual },
        data: { energiaActual: { increment: objetoConsumible.energia }, manaActual: { increment: objetoConsumible.mana } },
      });
      if (restaurado.count !== 1) throw new PartyServiceError("Los recursos cambiaron durante la acción.", 409, "RECURSOS_COMBATE_MODIFICADOS");
      const consumido = await tx.inventarioObjeto.updateMany({
        where: { id: objetoConsumible.inventarioObjetoId, cantidad: { gte: 1 } },
        data: { cantidad: { decrement: 1 } },
      });
      if (consumido.count !== 1) {
        throw new PartyServiceError("El consumible ya no está disponible.", 409, "OBJETO_PARTY_MODIFICADO");
      }
      await tx.inventarioObjeto.deleteMany({ where: { id: objetoConsumible.inventarioObjetoId, cantidad: { lte: 0 } } });
    }

    if (
      fase === "activo" &&
      faseTurno === "jugador" &&
      turnoActualUsuarioId !== null
    ) {
      const siguienteMiembro = combate.participantes.find((miembro) => miembro.usuarioId === turnoActualUsuarioId);
      if (siguienteMiembro && siguienteMiembro.estado === "activo" && siguienteMiembro.jugadorHp > 0) {
        await regenerarRecursosTurnoParty(tx, siguienteMiembro.personajeId, siguienteMiembro.usuarioId);
      }
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
      jugadorHp,
      ...(recompensas ? { recompensas } : {}),
      ...(regreso ? { regreso } : {}),
      accion,
    };
  }, AISLAMIENTO);
}

/** API histórica mantenida para los endpoints de combate grupal. */
export { ejecutarTurnoEnemigoParty } from "./turno-enemigo";
