import type { Prisma } from "@prisma/client";
import { PartyServiceError } from "./errores";
import { obtenerEnemigoPorId } from "@/lib/enemigos";
import { tirarBotinEnemigo } from "@/lib/equipamiento/botin";
import { LIMITE_INVENTARIO_OBJETOS } from "@/lib/equipamiento/inventario";
import { obtenerObjetoPorId } from "@/lib/objetos";
import { experienciaParaNivel } from "@/lib/progresion/experiencia";
import {
  aplicarMultiplicadorRecompensa,
  calcularExperienciaBaseGanada,
  calcularOroEnemigo,
  esModoDificultad,
  registrarVictoriaRangoNormal,
} from "@/lib/expediciones/encuentros/dificultad";
import { otorgarExperienciaJob } from "@/server/services/combate/accion-combate";
import { calcularRecompensasParcialesDerrota } from "@/lib/expediciones/recompensas-derrota";
import { obtenerLogCombateParty } from "@/lib/party/combate-reglas";
import { leerRecompensaParty, repartirCantidadEntera, crearRngDeterminista, registrarObjetoRecompensa } from "@/lib/party/recompensas";
import { agregarObjetoAlInventario, agregarInstanciaBotinAlInventario } from "./inventario-recompensas";
import { crearEnemigoLegacy, leerEnemigosEnCombate, type EnemigoEnCombate } from "@/lib/expediciones/combate/enemigos-combate";

const dependenciasInventarioRecompensas = {
  existeObjeto: (objetoId: string) => Boolean(obtenerObjetoPorId(objetoId)),
  limiteInventario: LIMITE_INVENTARIO_OBJETOS,
};

/** Liquida una victoria compartida exactamente una vez dentro de la transacción serializable. */
export async function liquidarRecompensasParty(
  tx: Prisma.TransactionClient,
  expedicionPartyId: string,
  combatePartyId: string,
  faseResultado: "victoria" | "derrota" = "victoria",
) {
  const combate = await tx.combateParty.findUnique({
    where: { id: combatePartyId },
    include: { participantes: { orderBy: { ordenTurno: "asc" } } },
  });
  if (!combate) {
    throw new PartyServiceError("No se encontró el combate para liquidar las recompensas.", 404, "COMBATE_PARTY_NO_ENCONTRADO");
  }
  if (combate.fase !== faseResultado) {
    throw new PartyServiceError("La fase del combate no coincide con la liquidación de recompensas.", 409, "COMBATE_PARTY_RESULTADO_NO_COINCIDE");
  }
  if (combate.recompensasResueltas) {
    return { liquidacionYaResuelta: true, recompensas: [] as unknown[] };
  }

  const expedicion = await tx.expedicionParty.findUnique({
    where: { id: expedicionPartyId },
    include: {
      participantes: {
        orderBy: { creado: "asc" },
        include: {
          usuario: { select: { id: true } },
          personaje: {
            select: {
              id: true,
              usuarioId: true,
              nivel: true,
              experiencia: true,
              profesionActivaId: true,
              rangosAmenazaCompletados: true,
              inventario: { select: { id: true } },
            },
          },
        },
      },
    },
  });
  if (!expedicion || expedicion.fase !== "combatiendo") {
    throw new PartyServiceError("La expedición no está disponible para liquidar la victoria.", 409, "EXPEDICION_PARTY_NO_COMBATIENDO");
  }
  const porUsuario = new Map(combate.participantes.map((p) => [p.usuarioId, p]));
  const participantes = expedicion.participantes
    .filter((p) => p.estado !== "retirado")
    .sort((a, b) => (porUsuario.get(a.usuarioId)?.ordenTurno ?? 999) - (porUsuario.get(b.usuarioId)?.ordenTurno ?? 999));
  if (participantes.length < 1 || participantes.length > 3) {
    throw new PartyServiceError("La party no tiene integrantes activos para recibir las recompensas de misión.", 409, "NUMERO_MIEMBROS_INVALIDO");
  }
  if (participantes.some((p) => !porUsuario.has(p.usuarioId))) {
    throw new PartyServiceError("La composición del combate no coincide con la expedición.", 409, "PARTY_COMBAT_PARTICIPANTS_MISMATCH");
  }

  const recompensaMision = leerRecompensaParty(expedicion.recompensa);
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
  const enemigosDelCombate = rosterGuardado.length > 0 ? rosterGuardado : enemigoLegacy ? [enemigoLegacy] : [];
  const definicionesEnemigos = enemigosDelCombate
    .map((snapshot) => ({ snapshot, definicion: obtenerEnemigoPorId(snapshot.enemigoId) }))
    .filter((entrada): entrada is { snapshot: EnemigoEnCombate; definicion: NonNullable<ReturnType<typeof obtenerEnemigoPorId>> } => Boolean(entrada.definicion));
  if (definicionesEnemigos.length === 0) {
    throw new PartyServiceError("No se pudieron resolver las criaturas del combate para las recompensas.", 500, "RECOMPENSAS_ENEMIGOS_INVALIDOS");
  }
  const modoDificultad = esModoDificultad(expedicion.modoDificultad) ? expedicion.modoDificultad : "normal";
  const totalMiembros = participantes.length;
  const primerPersonaje = (participantes.find((p) => porUsuario.get(p.usuarioId)?.estado !== "huyo") ?? participantes[0])?.personaje;
  if (!primerPersonaje) {
    throw new PartyServiceError("Uno de los integrantes ya no tiene personaje.", 409, "PERSONAJE_NO_ENCONTRADO");
  }
  const liquidacionDerrota = faseResultado === "derrota"
    ? calcularRecompensasParcialesDerrota({
        enemigos: enemigosDelCombate,
        recompensaMision,
        dificultadMision: expedicion.dificultad,
        nivelBase: primerPersonaje.nivel,
        modoDificultad,
      })
    : null;
  const definicionesRecompensables = faseResultado === "derrota"
    ? definicionesEnemigos.filter((entrada) => entrada.snapshot.hp <= 0)
    : definicionesEnemigos;
  const oroEnemigo = definicionesRecompensables.reduce(
    (total, entrada) => total + calcularOroEnemigo(entrada.definicion.botin, entrada.snapshot.difMin),
    0,
  );
  const oroTotal = liquidacionDerrota?.oro ?? aplicarMultiplicadorRecompensa(recompensaMision.oro + oroEnemigo, modoDificultad);
  const recompensaRecursos = liquidacionDerrota?.recompensa ?? recompensaMision;
  // En derrota solo se concede la consolación y las recompensas de los enemigos realmente abatidos.
  // Las recompensas Base/Job son iguales para los miembros que no huyeron.
  const experienciaBaseComun = liquidacionDerrota?.experiencia ?? definicionesRecompensables.reduce(
    (total, entrada) => total + calcularExperienciaBaseGanada(
      entrada.snapshot.difMin,
      primerPersonaje.nivel,
      modoDificultad,
    ),
    0,
  );
  const logLiquidacion = obtenerLogCombateParty(combate.log);
  if (faseResultado === "derrota") {
    const abatidos = definicionesRecompensables.map((entrada) => entrada.snapshot.nombre);
    logLiquidacion.push(abatidos.length
      ? `⚔️ Criaturas abatidas antes de caer: ${abatidos.join(", ")}.`
      : "⚔️ La party no había abatido ninguna criatura antes de caer.");
    logLiquidacion.push(`💰 Oro parcial total de la party: ${oroTotal} 🪙.`);
    logLiquidacion.push(`⭐ XP Base parcial por aventurero activo: ${experienciaBaseComun}.`);
    if (recompensaRecursos.madera > 0) logLiquidacion.push(`🪵 Madera parcial asegurada: ${recompensaRecursos.madera}.`);
    if (recompensaRecursos.piedra > 0) logLiquidacion.push(`🪨 Piedra parcial asegurada: ${recompensaRecursos.piedra}.`);
    if (recompensaRecursos.metal > 0) logLiquidacion.push(`⚙️ Metal parcial asegurado: ${recompensaRecursos.metal}.`);
  }

  const versionEsperadaLiquidada = combate.version + 1;
  const liquidado = await tx.combateParty.updateMany({
    where: {
      id: combatePartyId,
      fase: faseResultado,
      version: combate.version,
      recompensasResueltas: false,
    },
    data: {
      recompensasResueltas: true,
      version: { increment: 1 },
    },
  });
  if (liquidado.count !== 1) {
    const estadoActual = await tx.combateParty.findUnique({
      where: { id: combatePartyId },
      select: { recompensasResueltas: true },
    });
    if (estadoActual?.recompensasResueltas) {
      return { liquidacionYaResuelta: true, recompensas: [] as unknown[] };
    }
    throw new PartyServiceError("El estado de liquidación cambió; no se duplicarán las recompensas.", 409, "RECOMPENSA_PARTY_MODIFICADA");
  }

  const detalle: {
    usuarioId: string;
    oro: number;
    madera: number;
    piedra: number;
    metal: number;
    experiencia: number;
    experienciaJob: number;
    nivelesBaseSubidos: number;
    nivelesJobSubidos: number;
    objetos: { objetoId: string; cantidad: number }[];
  }[] = [];
  for (let indice = 0; indice < participantes.length; indice += 1) {
    const miembro = participantes[indice];
    const personaje = miembro.personaje;
    if (!personaje) {
      throw new PartyServiceError("Uno de los integrantes ya no tiene personaje.", 409, "PERSONAJE_NO_ENCONTRADO");
    }

    const combateParticipante = porUsuario.get(miembro.usuarioId);
    const huyo = combateParticipante?.estado === "huyo" || miembro.estado === "huyo";
    const oro = repartirCantidadEntera(oroTotal, totalMiembros, indice);
    const madera = repartirCantidadEntera(recompensaRecursos.madera, totalMiembros, indice);
    const piedra = repartirCantidadEntera(recompensaRecursos.piedra, totalMiembros, indice);
    const metal = repartirCantidadEntera(recompensaRecursos.metal, totalMiembros, indice);
    const experiencia = huyo ? 0 : experienciaBaseComun;
    const experienciaActual = Math.max(0, Math.floor(personaje.experiencia ?? 0));
    let nivel = Math.max(1, Math.floor(personaje.nivel ?? 1));
    let experienciaNueva = experienciaActual + experiencia;
    let nivelesSubidos = 0;
    while (experienciaNueva >= experienciaParaNivel(nivel)) {
      experienciaNueva -= experienciaParaNivel(nivel);
      nivel += 1;
      nivelesSubidos += 1;
    }
    const rangosAmenazaCompletados =
      faseResultado === "victoria" && expedicion.tipo === "normal" && modoDificultad === "normal"
        ? registrarVictoriaRangoNormal(personaje.rangosAmenazaCompletados, expedicion.dificultad)
        : undefined;

    await tx.usuario.update({
      where: { id: miembro.usuarioId },
      data: {
        oro: { increment: oro },
        madera: { increment: madera },
        piedra: { increment: piedra },
        metal: { increment: metal },
        ...(faseResultado === "victoria" && expedicion.tipo === "elite" && !huyo
          ? { ultimaMisionElite: new Date() }
          : {}),
      },
    });
    const personajeActualizado = await tx.personaje.updateMany({
      where: { id: personaje.id, usuarioId: miembro.usuarioId },
      data: {
        nivel,
        experiencia: experienciaNueva,
        ...(rangosAmenazaCompletados ? { rangosAmenazaCompletados } : {}),
      },
    });
    if (personajeActualizado.count !== 1) {
      throw new PartyServiceError("No se pudo actualizar la progresión de un aventurero.", 409, "PERSONAJE_RECOMPENSA_MODIFICADO");
    }

    const progresoJob = huyo ? null : await otorgarExperienciaJob(
      tx,
      { id: personaje.id, profesionActivaId: personaje.profesionActivaId || "novato" },
      expedicion.dificultad,
      personaje.nivel,
      modoDificultad,
      faseResultado === "derrota" ? 0.1 : undefined,
    );
    let experienciaJobTotal = progresoJob?.experienciaJobGanada ?? 0;
    let nivelesJobTotal = progresoJob?.nivelesSubidos ?? 0;
    if (faseResultado === "derrota" && !huyo) {
      for (const entradaEnemigo of definicionesRecompensables) {
        const progresoJobEnemigo = await otorgarExperienciaJob(
          tx,
          { id: personaje.id, profesionActivaId: personaje.profesionActivaId || "novato" },
          entradaEnemigo.snapshot.difMin,
          personaje.nivel,
          modoDificultad,
        );
        experienciaJobTotal += progresoJobEnemigo?.experienciaJobGanada ?? 0;
        nivelesJobTotal += progresoJobEnemigo?.nivelesSubidos ?? 0;
        if (progresoJobEnemigo?.nivelesSubidos) {
          logLiquidacion.push(`⬆️ Job de ${progresoJobEnemigo.claseNombre}: nivel ${progresoJobEnemigo.nivelJob} tras abatir a ${entradaEnemigo.snapshot.nombre} para ${miembro.usuarioId}.`);
        }
      }
    }
    const mensajesJob = experienciaJobTotal > 0
      ? ` Job +${experienciaJobTotal} XP.`
      : "";
    const mensajesBase = nivelesSubidos > 0 ? ` Base +${nivelesSubidos} nivel(es).` : "";

    const objetosRepartidos: { objetoId: string; cantidad: number }[] = [];
    for (const objeto of (faseResultado === "victoria" ? recompensaMision.objetos : [])) {
      const cantidad = repartirCantidadEntera(objeto.cantidad, totalMiembros, indice);
      if (cantidad <= 0) continue;
      const agregado = await agregarObjetoAlInventario(tx, personaje.id, objeto.objetoId, cantidad, dependenciasInventarioRecompensas);
      if (agregado) {
        registrarObjetoRecompensa(objetosRepartidos, objeto.objetoId, cantidad);
      } else {
        logLiquidacion.push(
          `🎒 ${miembro.usuarioId} no ha podido recibir ${objeto.objetoId} ×${cantidad} de la misión porque su inventario está lleno o el objeto ya no existe.`,
        );
      }
    }
    detalle.push({
      usuarioId: miembro.usuarioId,
      oro,
      madera,
      piedra,
      metal,
      experiencia,
      experienciaJob: experienciaJobTotal,
      nivelesBaseSubidos: nivelesSubidos,
      nivelesJobSubidos: nivelesJobTotal,
      objetos: objetosRepartidos,
    });
    logLiquidacion.push(
      `🎁 ${miembro.usuarioId}: +${oro} oro, +${madera} madera, +${piedra} piedra, +${metal} metal y +${experiencia} XP.${mensajesBase}${mensajesJob}`,
    );
  }

  const dropsEnemigo: {
    usuarioId: string;
    objetoId: string;
    nombre: string;
    cantidad: number;
    sufijoId: string | null;
  }[] = [];
  for (const entradaEnemigo of definicionesRecompensables) {
    for (let indice = 0; indice < participantes.length; indice += 1) {
      const miembro = participantes[indice];
      if (porUsuario.get(miembro.usuarioId)?.estado === "huyo" || miembro.estado === "huyo") continue;
      const drop = tirarBotinEnemigo(
        entradaEnemigo.definicion,
        crearRngDeterminista(`${combate.id}:${entradaEnemigo.snapshot.id}:botin:${miembro.usuarioId}`),
        miembro.personaje.profesionActivaId,
      );
      if (!drop) continue;

      const agregado = await agregarInstanciaBotinAlInventario(tx, miembro.personaje.id, drop, dependenciasInventarioRecompensas);
      if (!agregado) {
        logLiquidacion.push(
          `🎒 El botín de ${entradaEnemigo.snapshot.nombre} para ${miembro.usuarioId} se ha perdido porque su inventario está lleno.`,
        );
        continue;
      }

      dropsEnemigo.push({
        usuarioId: miembro.usuarioId,
        objetoId: drop.objeto.id,
        nombre: drop.objeto.nombre,
        cantidad: 1,
        sufijoId: drop.sufijoId,
      });
      logLiquidacion.push(
        `🎲 Botín de ${entradaEnemigo.snapshot.nombre}: ${drop.objeto.nombre}${drop.sufijoId ? ` (${drop.sufijoId})` : ""} para ${miembro.usuarioId}.`,
      );
    }
  }

  const resultadoRecompensas = {
    liquidacionYaResuelta: false,
    resultadoFinal: faseResultado,
    oroTotal,
    enemigosDerrotados: definicionesRecompensables.map((entrada) => ({
      id: entrada.snapshot.id,
      nombre: entrada.snapshot.nombre,
    })),
    dropsEnemigo,
    experienciaPorMiembro: detalle.map((d) => ({
      usuarioId: d.usuarioId,
      experiencia: d.experiencia,
      experienciaJob: d.experienciaJob,
    })),
    recompensas: detalle,
  };

  const logGuardado = await tx.combateParty.updateMany({
    where: {
      id: combatePartyId,
      recompensasResueltas: true,
      version: versionEsperadaLiquidada,
    },
    data: {
      log: logLiquidacion as unknown as Prisma.InputJsonValue,
      recompensasResultado: resultadoRecompensas as unknown as Prisma.InputJsonValue,
    },
  });
  if (logGuardado.count !== 1) {
    throw new PartyServiceError("No se pudo registrar el resumen de recompensas.", 409, "COMBATE_PARTY_MODIFICADO");
  }

  return resultadoRecompensas;
}
