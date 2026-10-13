import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { CLASES, puedeUsarHabilidadDeClase } from "@/lib/progresion/clases";
import { aplicarExperienciaJob } from "@/lib/progresion/experiencia";
import {
  calcularEstadisticasPersonaje,
  calcularModificadoresEquipo,
} from "@/lib/estadisticasPersonaje";
import { obtenerEquipoDesdePersonaje } from "@/lib/inventario";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { obtenerObjetoPorId } from "@/lib/objetos";
import { obtenerHabilidadPorId } from "@/lib/habilidades";
import type { DefinicionHabilidad, RecompensaMision, EstadoEfectoHabilidad } from "@/lib/tiposJuego";
import {
  leerEfectosCombate,
  procesarEfectosTurno,
  retirarEfectosHabilidad,
} from "../../../lib/expediciones/estados-combate";
import {
  calcularExperienciaJobGanada,
  type ModoDificultad,
} from "../../../lib/expediciones/dificultad";
import {
  validarObjetivoAccionCombate,
  validarTurnoAccionCombate,
} from "@/lib/expediciones/contrato-accion-combate";

type AccionCombate = "atacar" | "usar_habilidad" | "usar_objeto";
type EfectoCombate = EstadoEfectoHabilidad;

type AccionCombate = "atacar" | "usar_habilidad" | "usar_objeto";

type EfectoCombate = EstadoEfectoHabilidad;


export async function otorgarExperienciaJob(
  tx: Prisma.TransactionClient,
  personaje: { id: string; profesionActivaId: string },
  nivelAmenaza: number,
  nivelBase: number,
  modoDificultad: ModoDificultad,
  factorResultado = 1
) {
  const claseId = personaje.profesionActivaId || "novato";
  const definicion = CLASES[claseId];
  if (!definicion) return null;

  const progreso = await tx.progresoClase.findUnique({
    where: {
      personajeId_claseId: {
        personajeId: personaje.id,
        claseId,
      },
    },
  });

  if (!progreso || !progreso.desbloqueada) return null;

  const experienciaJobGanada = calcularExperienciaJobGanada(
    progreso.nivelJob,
    nivelAmenaza,
    nivelBase,
    modoDificultad,
    factorResultado
  );
  const actualizado = aplicarExperienciaJob(
    progreso,
    experienciaJobGanada,
    definicion.nivelJobMaximo
  );

  await tx.progresoClase.update({
    where: { id: progreso.id },
    data: {
      nivelJob: actualizado.nivelJob,
      experienciaJob: actualizado.experienciaJob,
      puntosHabilidadDisponibles: actualizado.puntosHabilidadDisponibles,
      maestriaCompletada: actualizado.maestriaCompletada,
    },
  });

  return {
    claseNombre: definicion.nombre,
    nivelAnterior: progreso.nivelJob,
    nivelJob: actualizado.nivelJob,
    nivelesSubidos: actualizado.nivelesSubidos,
    maestriaCompletada: actualizado.maestriaCompletada && !progreso.maestriaCompletada,
  };
}


async function recuperarEnergiaLimitada(
  tx: Prisma.TransactionClient,
  personajeId: string,
  cantidad: number,
) {
  if (cantidad <= 0) return;
  const personaje = await tx.personaje.findUnique({
    where: { id: personajeId },
    select: {
      id: true,
      clase: true,
      nivel: true,
      profesionActivaId: true,
      fuerza: true,
      agilidad: true,
      vitalidad: true,
      inteligencia: true,
      destreza: true,
      suerte: true,
      velocidadMejoras: true,
      capacidadCarruajeMejoras: true,
      energiaActual: true,
      habilidades: {
        where: { slot: { not: null } },
        select: { habilidadId: true },
      },
      progresosClase: { select: { claseId: true, nivelJob: true, desbloqueada: true } },
      equipoEquipado: {
        select: {
          arma: true, armadura: true, accesorio: true, manoSecundaria: true,
          casco: true, pantalones: true, botas: true, guantes: true, anillo1: true, anillo2: true,
        },
      },
    },
  });
  if (!personaje) return;

  const equipo = obtenerEquipoDesdePersonaje({ equipoEquipado: personaje.equipoEquipado });
  const modificadoresEquipo = calcularModificadoresEquipo(equipo, personaje.profesionActivaId);
  const progresoActivo = personaje.progresosClase.find(
    (progreso) => progreso.claseId === personaje.profesionActivaId && progreso.desbloqueada,
  );
  const estadisticas = calcularEstadisticasPersonaje({
    clase: personaje.clase,
    profesionActivaId: personaje.profesionActivaId,
    nivel: personaje.nivel,
    nivelJob: progresoActivo?.nivelJob ?? 1,
    progresosClase: personaje.progresosClase,
    fuerza: personaje.fuerza,
    agilidad: personaje.agilidad,
    vitalidad: personaje.vitalidad,
    inteligencia: personaje.inteligencia,
    destreza: personaje.destreza,
    suerte: personaje.suerte,
    velocidadMejoras: personaje.velocidadMejoras,
    capacidadCarruajeMejoras: personaje.capacidadCarruajeMejoras,
  }, personaje.habilidades.map((habilidad) => habilidad.habilidadId), modificadoresEquipo).total;
  const energiaNueva = Math.min(
    estadisticas.energiaMaxima ?? 20,
    personaje.energiaActual + Math.floor(cantidad),
  );
  const actualizado = await tx.personaje.updateMany({
    where: { id: personaje.id, energiaActual: personaje.energiaActual },
    data: { energiaActual: energiaNueva },
  });
  if (actualizado.count !== 1) throw new Error("RECURSO_COMBATE_MODIFICADO");
}

export async function gastarRecursosHabilidad(
  tx: Prisma.TransactionClient,
  personajeId: string,
  habilidad: DefinicionHabilidad | null
) {
  if (!habilidad) return;

  const costeEnergia = Math.max(0, Math.floor(habilidad.costeEnergia ?? 0));
  const costeMana = Math.max(0, Math.floor(habilidad.costeMana ?? 0));
  const recuperacionEnergia = Math.max(0, Math.floor(habilidad.recuperarEnergia ?? 0));
  if (costeEnergia === 0 && costeMana === 0) {
    await recuperarEnergiaLimitada(tx, personajeId, recuperacionEnergia);
    return;
  }

  const where: Prisma.PersonajeWhereInput = { id: personajeId };
  const data: Prisma.PersonajeUpdateManyMutationInput = {};
  if (costeEnergia > 0) {
    where.energiaActual = { gte: costeEnergia };
    data.energiaActual = { decrement: costeEnergia };
  }
  if (costeMana > 0) {
    where.manaActual = { gte: costeMana };
    data.manaActual = { decrement: costeMana };
  }

  const resultado = await tx.personaje.updateMany({ where, data });
  if (resultado.count !== 1) {
    throw new Error("RECURSO_HABILIDAD_INSUFICIENTE");
  }
  await recuperarEnergiaLimitada(tx, personajeId, recuperacionEnergia);
}

export async function regenerarRecursosPorTurno(
  tx: Prisma.TransactionClient,
  usuarioId: string
) {
  const personaje = await tx.personaje.findUnique({
    where: { usuarioId },
    select: {
      id: true,
      clase: true,
      nivel: true,
      profesionActivaId: true,
      progresosClase: { select: { claseId: true, nivelJob: true, desbloqueada: true } },
      fuerza: true,
      agilidad: true,
      vitalidad: true,
      inteligencia: true,
      destreza: true,
      suerte: true,
      velocidadMejoras: true,
      capacidadCarruajeMejoras: true,
      energiaActual: true,
      manaActual: true,
      habilidades: {
        where: { slot: { not: null } },
        select: { habilidadId: true },
      },
      equipoEquipado: {
        select: {
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
    },
  });
  if (!personaje) return;

  const equipoPersonaje = obtenerEquipoDesdePersonaje({
    equipoEquipado: personaje.equipoEquipado,
  });
  const modificadoresEquipo = calcularModificadoresEquipo(
    equipoPersonaje,
    personaje.profesionActivaId
  );
  const progresoActivo = personaje.progresosClase.find(
    (progreso) => progreso.claseId === personaje.profesionActivaId && progreso.desbloqueada
  );
  const estadisticas = calcularEstadisticasPersonaje({
    clase: personaje.clase,
    profesionActivaId: personaje.profesionActivaId,
    nivel: personaje.nivel,
    nivelJob: progresoActivo?.nivelJob ?? 1,
    progresosClase: personaje.progresosClase,
    fuerza: personaje.fuerza,
    agilidad: personaje.agilidad,
    vitalidad: personaje.vitalidad,
    inteligencia: personaje.inteligencia,
    destreza: personaje.destreza,
    suerte: personaje.suerte,
    velocidadMejoras: personaje.velocidadMejoras,
    capacidadCarruajeMejoras: personaje.capacidadCarruajeMejoras,
  }, personaje.habilidades.map((habilidad) => habilidad.habilidadId), modificadoresEquipo).total;

  const energiaMaxima = estadisticas.energiaMaxima ?? 20;
  const manaMaximo = estadisticas.manaMaximo ?? 10;
  const regeneracionEnergia = Math.max(1, Math.ceil(estadisticas.regeneracionEnergiaPorTurno ?? 0));
  const regeneracionMana = Math.max(1, Math.ceil(estadisticas.regeneracionManaPorTurno ?? 0));
  const energiaNueva = Math.min(
    energiaMaxima,
    personaje.energiaActual + regeneracionEnergia,
  );
  const manaNuevo = Math.min(
    manaMaximo,
    personaje.manaActual + regeneracionMana,
  );

  if (energiaNueva === personaje.energiaActual && manaNuevo === personaje.manaActual) return;

  const actualizado = await tx.personaje.updateMany({
    where: {
      id: personaje.id,
      energiaActual: personaje.energiaActual,
      manaActual: personaje.manaActual,
    },
    data: {
      energiaActual: energiaNueva,
      manaActual: manaNuevo,
    },
  });
  if (actualizado.count !== 1) {
    throw new Error("RECURSO_COMBATE_MODIFICADO");
  }
}

export function obtenerRecompensaMision(valor: unknown): RecompensaMision {
  if (
    typeof valor === "object" &&
    valor !== null &&
    "oro" in valor &&
    "madera" in valor &&
    "piedra" in valor &&
    "metal" in valor &&
    typeof valor.oro === "number" &&
    typeof valor.madera === "number" &&
    typeof valor.piedra === "number" &&
    typeof valor.metal === "number"
  ) {
    return {
      oro: Math.max(0, valor.oro),
      madera: Math.max(0, valor.madera),
      piedra: Math.max(0, valor.piedra),
      metal: Math.max(0, valor.metal),
    };
  }

  return {
    oro: 0,
    madera: 0,
    piedra: 0,
    metal: 0,
  };
}

export function obtenerCooldowns(valor: unknown): Record<string, number> {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
    return {};
  }

  const resultado: Record<string, number> = {};

  for (const [habilidadId, cooldown] of Object.entries(valor)) {
    if (
      typeof cooldown === "number" &&
      Number.isFinite(cooldown) &&
      cooldown > 0
    ) {
      resultado[habilidadId] = Math.floor(cooldown);
    }
  }

  return resultado;
}

export function reducirCooldowns(
  cooldowns: Record<string, number>
): Record<string, number> {
  const resultado: Record<string, number> = {};

  for (const [habilidadId, cooldown] of Object.entries(cooldowns)) {
    const nuevoCooldown = cooldown - 1;

    if (nuevoCooldown > 0) {
      resultado[habilidadId] = nuevoCooldown;
    }
  }

  return resultado;
}

export function obtenerEfectos(valor: unknown): EfectoCombate[] {
  return leerEfectosCombate(valor);
}

export function actualizarEfectosAlInicioTurnoJugador(
  efectos: EfectoCombate[],
  hpActual: number,
  hpMaximo: number,
  defensaActual: number,
  nombreObjetivo: string,
): {
  efectos: EfectoCombate[];
  hp: number;
  defensa: number;
  mensajes: string[];
} {
  return procesarEfectosTurno(efectos, hpActual, hpMaximo, defensaActual, nombreObjetivo);
}

export function manejarErrorAccionCombate(error: unknown) {
  if (error instanceof Error && error.message === "CONSUMIBLE_MODIFICADO") {
    return NextResponse.json(
      { error: "El objeto del inventario ha cambiado; actualiza e inténtalo de nuevo." },
      { status: 409 }
    );
  }
  if (error instanceof Error && error.message === "RECURSO_HABILIDAD_INSUFICIENTE") {
    return NextResponse.json(
      { error: "Ya no tienes suficiente Energía o Maná para ejecutar esa habilidad." },
      { status: 400 }
    );
  }
  if (error instanceof Error && error.message === "RECURSO_COMBATE_MODIFICADO") {
    return NextResponse.json(
      { error: "Los recursos del personaje han cambiado; actualiza el combate e inténtalo de nuevo." },
      { status: 409 }
    );
  }
  if (error instanceof Error && error.message === "COMBATE_MODIFICADO") {
    return NextResponse.json(
      { error: "El combate ha cambiado mientras se procesaba la acción. La acción ya no es válida." },
      { status: 409 }
    );
  }
  console.error("Error al ejecutar acción de combate:", error);
  return NextResponse.json(
    { error: "No se pudo ejecutar la acción de combate." },
    { status: 500 }
  );
}

export type ContextoAccionCombate = Record<string, any>;

export async function prepararAccionCombate(
  request: Request,
  tipoEsperado?: "pve" | "pvp",
): Promise<NextResponse | { contexto: ContextoAccionCombate }> {
  try {
      bodyJson = await request.json();
    } catch {
      return NextResponse.json(
        { error: "El cuerpo de la petición no contiene JSON válido." },
        { status: 400 }
      );
    }

    if (!bodyJson || typeof bodyJson !== "object" || Array.isArray(bodyJson)) {
      return NextResponse.json(
        { error: "El cuerpo de la petición no es válido." },
        { status: 400 }
      );
    }

    const body = bodyJson as Record<string, unknown>;

    const accionValor = body.accion;

    if (
      accionValor !== "atacar" &&
      accionValor !== "usar_habilidad" &&
      accionValor !== "usar_objeto"
    ) {
      return NextResponse.json(
        {
          error: "Acción de combate no válida.",
        },
        { status: 400 }
      );
    }

    const accion = accionValor as AccionCombate;

    let habilidadId: string | null = null;
    let objetoInventarioId: string | null = null;

    if (accion === "usar_objeto") {
      if (
        typeof body.objetoInventarioId !== "string" ||
        body.objetoInventarioId.trim() === ""
      ) {
        return NextResponse.json(
          { error: "Debes seleccionar un objeto del inventario." },
          { status: 400 }
        );
      }
      objetoInventarioId = body.objetoInventarioId;
    }

    if (accion === "usar_habilidad") {
      if (
        typeof body.habilidadId !== "string" ||
        body.habilidadId.trim() === ""
      ) {
        return NextResponse.json(
          {
            error: "Debes indicar una habilidad.",
          },
          { status: 400 }
        );
      }

      habilidadId = body.habilidadId;
    }

    // ============================================================
    // BUSCAR USUARIO
    // ============================================================

    const usuario = await prisma.usuario.findUnique({
      where: {
        id: usuarioSesion.id,
      },
      include: {
        personaje: {
          include: {
            inventario: { include: { objetos: true } },
            habilidades: {
              where: {
                slot: {
                  not: null,
                },
              },
            },
          },
        },
        expedicionActiva: {
          include: {
            combateActivo: {
              include: {
                expedicion: true,
              },
            },
          },
        },
      },
    });

    if (!usuario || !usuario.personaje) {
      return NextResponse.json(
        {
          error: "No se encontró el personaje.",
        },
        { status: 404 }
      );
    }

    const personaje = usuario.personaje;
    const bonusCuracion = personaje.habilidades.reduce((total, aprendida) => {
      if (!aprendida.slot?.startsWith("pasiva_")) return total;
      const definicion = obtenerHabilidadPorId(aprendida.habilidadId);
      if (!definicion || definicion.tipo !== "pasiva") return total;
      if (!puedeUsarHabilidadDeClase(personaje.profesionActivaId || "novato", definicion.claseId)) return total;
      return total + (definicion.bonusCuracion ?? 0);
    }, 0);

    // ============================================================
    // LOCALIZAR COMBATE
    // ============================================================

    let expedicion = usuario.expedicionActiva;
    let combate = expedicion?.combateActivo ?? null;

    // En PvP el defensor NO tiene expedición propia.
    // Buscamos el combate que tiene al usuario como defensor.
    if (!combate) {
      combate = await prisma.combateActivo.findFirst({
        where: {
          tipo: "pvp",
          defensorUsuarioId: usuario.id,
          fase: "activo",
        },
        include: {
          expedicion: {
            include: {
              combateActivo: true,
            },
          },
        },
      });

      if (combate) {
        expedicion = {
          ...combate.expedicion,
          combateActivo: combate,
        };
      }
    }

    if (!combate || !expedicion) {
      return NextResponse.json(
        {
          error: "No tienes ningún combate activo.",
        },
        { status: 409 }
      );
    }

    const esPvp = combate.tipo === "pvp";

    if (tipoEsperado && ((tipoEsperado === "pvp") !== esPvp)) {
      return NextResponse.json(
        { error: "El tipo de combate no coincide con esta ruta." },
        { status: 409 }
      );
    }

    // ============================================================
    // VALIDACIÓN DE EXPEDICIÓN
    // ============================================================

    if (!esPvp && expedicion.fase !== "combatiendo") {
      return NextResponse.json(
        {
          error: "La expedición no está en fase de combate.",
          fase: expedicion.fase,
        },
        { status: 409 }
      );
    }

    if (esPvp) {
      if (
        usuario.id !== combate.atacanteUsuarioId &&
        usuario.id !== combate.defensorUsuarioId
      ) {
        return NextResponse.json(
          {
            error: "No perteneces a este combate.",
          },
          { status: 403 }
        );
      }
    }

    if (combate.fase !== "activo") {
      return NextResponse.json(
        {
          error: "El combate ya ha terminado.",
          fase: combate.fase,
        },
        { status: 409 }
      );
    }

    // ============================================================
    // VALIDAR CAMPOS NECESARIOS DEL OPONENTE
    // ============================================================

    if (
      combate.enemigoHp === null ||
      combate.enemigoHpMaximo === null ||
      combate.enemigoAtaque === null ||
      combate.enemigoDefensa === null ||
      combate.enemigoVelocidad === null ||
      combate.enemigoProbCritico === null ||
      combate.enemigoDanoCritico === null ||
      combate.enemigoNivel === null
    ) {
      return NextResponse.json(
        {
          error: "El combate no contiene todos los datos del enemigo.",
        },
        { status: 500 }
      );
    }

    // ============================================================
    // DETERMINAR ACTOR
    // ============================================================

    const actor = combate.turno;

    const validacionTurno = validarTurnoAccionCombate({
      tipo: esPvp ? "pvp" : "pve",
      turno: actor,
      usuarioId: usuario.id,
      atacanteUsuarioId: combate.atacanteUsuarioId,
      defensorUsuarioId: combate.defensorUsuarioId,
      accion,
    });
    if (!validacionTurno.valido) {
      return NextResponse.json(
        { error: validacionTurno.error },
        { status: validacionTurno.estado }
      );
    }

    // ============================================================
    // HABILIDAD
    // ============================================================

    let habilidad: DefinicionHabilidad | null = null;

    let cooldowns = obtenerCooldowns(combate.cooldowns);
    let efectos = obtenerEfectos(combate.efectos);

    let cooldownsDefensor = obtenerCooldowns(combate.cooldownsDefensor);
    let efectosDefensor = obtenerEfectos(combate.efectosDefensor);

    if (accion === "usar_habilidad") {
      const slotsActivos = ["activa_1", "activa_2", "activa_3"];
      const habilidadAprendida = personaje.habilidades.find(
        (habilidadAprendida) =>
          habilidadAprendida.habilidadId === habilidadId &&
          slotsActivos.includes(habilidadAprendida.slot ?? "")
      );

      if (!habilidadAprendida) {
        return NextResponse.json(
          {
            error: "No tienes esa habilidad equipada en una ranura activa.",
          },
          { status: 403 }
        );
      }

      const habilidadEncontrada = obtenerHabilidadPorId(
        habilidadAprendida.habilidadId
      );

      if (!habilidadEncontrada) {
        return NextResponse.json(
          {
            error: "Habilidad no encontrada.",
          },
          { status: 404 }
        );
      }

      habilidad = habilidadEncontrada;

      if (!puedeUsarHabilidadDeClase(personaje.profesionActivaId || "novato", habilidad.claseId)) {
        return NextResponse.json(
          { error: "Tu profesión no puede utilizar esa habilidad; solo puedes usar habilidades de tu rama y sus antecesoras." },
          { status: 403 }
        );
      }

      if (habilidad.tipo !== "activa") {
        return NextResponse.json(
          {
            error:
              "Solo puedes utilizar habilidades activas durante el combate.",
          },
          { status: 400 }
        );
      }

      const cooldownsActor =
        esPvp && actor === "defensor" ? cooldownsDefensor : cooldowns;

      const cooldownRestante = cooldownsActor[habilidad.id] ?? 0;

      if (cooldownRestante > 0) {
        return NextResponse.json(
          {
            error: `Esta habilidad está en cooldown durante ${cooldownRestante} turno${
              cooldownRestante === 1 ? "" : "s"
            }.`,
          },
          { status: 409 }
        );
      }

      const costeEnergia = Math.max(0, Math.floor(habilidad.costeEnergia ?? 0));
      const costeMana = Math.max(0, Math.floor(habilidad.costeMana ?? 0));
      if ((personaje.energiaActual ?? 0) < costeEnergia) {
        return NextResponse.json(
          { error: `No tienes Energía suficiente. Necesitas ${costeEnergia}.` },
          { status: 400 }
        );
      }
      if ((personaje.manaActual ?? 0) < costeMana) {
        return NextResponse.json(
          { error: `No tienes Maná suficiente. Necesitas ${costeMana}.` },
          { status: 400 }
        );
      }
    }

    const validacionObjetivo = validarObjetivoAccionCombate({
      accion,
      objetivo: body.objetivo,
      efectoHabilidad: habilidad?.efecto,
      // La ruta antigua adapta peticiones sin objetivo al contrato explícito.
      permitirInferencia: tipoEsperado === undefined,
    });
    if (!validacionObjetivo.valido) {
      return NextResponse.json({ error: validacionObjetivo.error }, { status: 400 });
    }
    body.objetivo = validacionObjetivo.objetivo;

    // ============================================================
    // ESTADO ACTUAL
    // ============================================================

    let jugadorHp = combate.jugadorHp;
    let jugadorDefensa = combate.jugadorDefensa;

    let enemigoHp = combate.enemigoHp;
    let enemigoDefensa = combate.enemigoDefensa;

    const log = Array.isArray(combate.log)
      ? [...(combate.log as string[])]
      : [];

    let consumible: { id: string; nombre: string; curacion: number; inventarioObjetoId: string } | null = null;

    // Si se vuelve a usar la misma habilidad, retira sus efectos anteriores antes
    // de resolverla. Así se renueva la duración sin acumular bonificaciones ni
    // dejar la defensa alterada al expirar el estado.
    if (accion === "usar_habilidad" && habilidad) {
      if (!esPvp || actor === "atacante") {
        const propios = retirarEfectosHabilidad(efectos, habilidad.id, jugadorDefensa);
        efectos = propios.efectos;
        jugadorDefensa = propios.defensa;
        const objetivo = retirarEfectosHabilidad(efectosDefensor, habilidad.id, enemigoDefensa);
        efectosDefensor = objetivo.efectos;
        enemigoDefensa = objetivo.defensa;
      } else {
        const propios = retirarEfectosHabilidad(efectosDefensor, habilidad.id, enemigoDefensa);
        efectosDefensor = propios.efectos;
        enemigoDefensa = propios.defensa;
        const objetivo = retirarEfectosHabilidad(efectos, habilidad.id, jugadorDefensa);
        efectos = objetivo.efectos;
        jugadorDefensa = objetivo.defensa;
      }
    }

    if (accion === "usar_objeto") {
      if (esPvp) {
        return NextResponse.json(
          { error: "Los consumibles todavía no están habilitados en asedios PvP." },
          { status: 409 }
        );
      }
      const registroInventario = personaje.inventario?.objetos.find(
        (item) => item.id === objetoInventarioId
      );
      if (!registroInventario || registroInventario.cantidad < 1) {
        return NextResponse.json({ error: "No tienes ese objeto en el inventario." }, { status: 404 });
      }
      const definicion = obtenerObjetoPorId(registroInventario.objetoId);
      if (!definicion || definicion.tipo !== "consumible" || !Number.isFinite(definicion.curacion) || (definicion.curacion ?? 0) <= 0) {
        return NextResponse.json({ error: "Este objeto no se puede usar durante el combate." }, { status: 400 });
      }
      if (actor !== "jugador") {
        return NextResponse.json({ error: "Solo puedes usar objetos durante tu turno." }, { status: 409 });
      }
      if (combate.jugadorHp >= combate.jugadorHpMaximo) {
        return NextResponse.json({ error: "Ya tienes la salud al máximo." }, { status: 400 });
      }
      consumible = {
        id: definicion.id,
        nombre: definicion.nombre,
        curacion: Math.floor(definicion.curacion ?? 0),
        inventarioObjetoId: registroInventario.id,
      };
    }

    // ============================================================

    return {
      contexto: {
        accion,
        habilidadId,
        objetoInventarioId,
        usuario,
        personaje,
        bonusCuracion,
        expedicion,
        combate,
        esPvp,
        actor,
        habilidad,
        cooldowns,
        efectos,
        cooldownsDefensor,
        efectosDefensor,
        jugadorHp,
        jugadorDefensa,
        enemigoHp,
        enemigoDefensa,
        log,
        consumible,
        objetivo: body.objetivo,
      },
    };
  } catch (error) {
    return manejarErrorAccionCombate(error);
  }
}

      bodyJson = await request.json();
    } catch {
      return NextResponse.json(
        { error: "El cuerpo de la petición no contiene JSON válido." },
        { status: 400 }
      );
    }

    if (!bodyJson || typeof bodyJson !== "object" || Array.isArray(bodyJson)) {
      return NextResponse.json(
        { error: "El cuerpo de la petición no es válido." },
        { status: 400 }
      );
    }

    const body = bodyJson as Record<string, unknown>;

    const accionValor = body.accion;

    if (
      accionValor !== "atacar" &&
      accionValor !== "usar_habilidad" &&
      accionValor !== "usar_objeto"
    ) {
      return NextResponse.json(
        {
          error: "Acción de combate no válida.",
        },
        { status: 400 }
      );
    }

    const accion = accionValor as AccionCombate;

    let habilidadId: string | null = null;
    let objetoInventarioId: string | null = null;

    if (accion === "usar_objeto") {
      if (
        typeof body.objetoInventarioId !== "string" ||
        body.objetoInventarioId.trim() === ""
      ) {
        return NextResponse.json(
          { error: "Debes seleccionar un objeto del inventario." },
          { status: 400 }
        );
      }
      objetoInventarioId = body.objetoInventarioId;
    }

    if (accion === "usar_habilidad") {
      if (
        typeof body.habilidadId !== "string" ||
        body.habilidadId.trim() === ""
      ) {
        return NextResponse.json(
          {
            error: "Debes indicar una habilidad.",
          },
          { status: 400 }
        );
      }

      habilidadId = body.habilidadId;
    }

    // ============================================================
    // BUSCAR USUARIO
    // ============================================================

    const usuario = await prisma.usuario.findUnique({
      where: {
        id: usuarioSesion.id,
      },
      include: {
        personaje: {
          include: {
            inventario: { include: { objetos: true } },
            habilidades: {
              where: {
                slot: {
                  not: null,
                },
              },
            },
          },
        },
        expedicionActiva: {
          include: {
            combateActivo: {
              include: {
                expedicion: true,
              },
            },
          },
        },
      },
    });

    if (!usuario || !usuario.personaje) {
      return NextResponse.json(
        {
          error: "No se encontró el personaje.",
        },
        { status: 404 }
      );
    }

    const personaje = usuario.personaje;
    const bonusCuracion = personaje.habilidades.reduce((total, aprendida) => {
      if (!aprendida.slot?.startsWith("pasiva_")) return total;
      const definicion = obtenerHabilidadPorId(aprendida.habilidadId);
      if (!definicion || definicion.tipo !== "pasiva") return total;
      if (!puedeUsarHabilidadDeClase(personaje.profesionActivaId || "novato", definicion.claseId)) return total;
      return total + (definicion.bonusCuracion ?? 0);
    }, 0);

    // ============================================================
    // LOCALIZAR COMBATE
    // ============================================================

    let expedicion = usuario.expedicionActiva;
    let combate = expedicion?.combateActivo ?? null;

    // En PvP el defensor NO tiene expedición propia.
    // Buscamos el combate que tiene al usuario como defensor.
    if (!combate) {
      combate = await prisma.combateActivo.findFirst({
        where: {
          tipo: "pvp",
          defensorUsuarioId: usuario.id,
          fase: "activo",
        },
        include: {
          expedicion: {
            include: {
              combateActivo: true,
            },
          },
        },
      });

      if (combate) {
        expedicion = {
          ...combate.expedicion,
          combateActivo: combate,
        };
      }
    }

    if (!combate || !expedicion) {
      return NextResponse.json(
        {
          error: "No tienes ningún combate activo.",
        },
        { status: 409 }
      );
    }

    const esPvp = combate.tipo === "pvp";

    if (tipoEsperado && ((tipoEsperado === "pvp") !== esPvp)) {
      return NextResponse.json(
        { error: "El tipo de combate no coincide con esta ruta." },
        { status: 409 }
      );
    }

    // ============================================================
    // VALIDACIÓN DE EXPEDICIÓN
    // ============================================================

    if (!esPvp && expedicion.fase !== "combatiendo") {
      return NextResponse.json(
        {
          error: "La expedición no está en fase de combate.",
          fase: expedicion.fase,
        },
        { status: 409 }
      );
    }

    if (esPvp) {
      if (
        usuario.id !== combate.atacanteUsuarioId &&
        usuario.id !== combate.defensorUsuarioId
      ) {
        return NextResponse.json(
          {
            error: "No perteneces a este combate.",
          },
          { status: 403 }
        );
      }
    }

    if (combate.fase !== "activo") {
      return NextResponse.json(
        {
          error: "El combate ya ha terminado.",
          fase: combate.fase,
        },
        { status: 409 }
      );
    }

    // ============================================================
    // VALIDAR CAMPOS NECESARIOS DEL OPONENTE
    // ============================================================

    if (
      combate.enemigoHp === null ||
      combate.enemigoHpMaximo === null ||
      combate.enemigoAtaque === null ||
      combate.enemigoDefensa === null ||
      combate.enemigoVelocidad === null ||
      combate.enemigoProbCritico === null ||
      combate.enemigoDanoCritico === null ||
      combate.enemigoNivel === null
    ) {
      return NextResponse.json(
        {
          error: "El combate no contiene todos los datos del enemigo.",
        },
        { status: 500 }
      );
    }

    // ============================================================
    // DETERMINAR ACTOR
    // ============================================================

    const actor = combate.turno;

    const validacionTurno = validarTurnoAccionCombate({
      tipo: esPvp ? "pvp" : "pve",
      turno: actor,
      usuarioId: usuario.id,
      atacanteUsuarioId: combate.atacanteUsuarioId,
      defensorUsuarioId: combate.defensorUsuarioId,
      accion,
    });
    if (!validacionTurno.valido) {
      return NextResponse.json(
        { error: validacionTurno.error },
        { status: validacionTurno.estado }
      );
    }

    // ============================================================
    // HABILIDAD
    // ============================================================

    let habilidad: DefinicionHabilidad | null = null;

    let cooldowns = obtenerCooldowns(combate.cooldowns);
    let efectos = obtenerEfectos(combate.efectos);

    let cooldownsDefensor = obtenerCooldowns(combate.cooldownsDefensor);
    let efectosDefensor = obtenerEfectos(combate.efectosDefensor);

    if (accion === "usar_habilidad") {
      const slotsActivos = ["activa_1", "activa_2", "activa_3"];
      const habilidadAprendida = personaje.habilidades.find(
        (habilidadAprendida) =>
          habilidadAprendida.habilidadId === habilidadId &&
          slotsActivos.includes(habilidadAprendida.slot ?? "")
      );

      if (!habilidadAprendida) {
        return NextResponse.json(
          {
            error: "No tienes esa habilidad equipada en una ranura activa.",
          },
          { status: 403 }
        );
      }

      const habilidadEncontrada = obtenerHabilidadPorId(
        habilidadAprendida.habilidadId
      );

      if (!habilidadEncontrada) {
        return NextResponse.json(
          {
            error: "Habilidad no encontrada.",
          },
          { status: 404 }
        );
      }

      habilidad = habilidadEncontrada;

      if (!puedeUsarHabilidadDeClase(personaje.profesionActivaId || "novato", habilidad.claseId)) {
        return NextResponse.json(
          { error: "Tu profesión no puede utilizar esa habilidad; solo puedes usar habilidades de tu rama y sus antecesoras." },
          { status: 403 }
        );
      }

      if (habilidad.tipo !== "activa") {
        return NextResponse.json(
          {
            error:
              "Solo puedes utilizar habilidades activas durante el combate.",
          },
          { status: 400 }
        );
      }

      const cooldownsActor =
        esPvp && actor === "defensor" ? cooldownsDefensor : cooldowns;

      const cooldownRestante = cooldownsActor[habilidad.id] ?? 0;

      if (cooldownRestante > 0) {
        return NextResponse.json(
          {
            error: `Esta habilidad está en cooldown durante ${cooldownRestante} turno${
              cooldownRestante === 1 ? "" : "s"
            }.`,
          },
          { status: 409 }
        );
      }

      const costeEnergia = Math.max(0, Math.floor(habilidad.costeEnergia ?? 0));
      const costeMana = Math.max(0, Math.floor(habilidad.costeMana ?? 0));
      if ((personaje.energiaActual ?? 0) < costeEnergia) {
        return NextResponse.json(
          { error: `No tienes Energía suficiente. Necesitas ${costeEnergia}.` },
          { status: 400 }
        );
      }
      if ((personaje.manaActual ?? 0) < costeMana) {
        return NextResponse.json(
          { error: `No tienes Maná suficiente. Necesitas ${costeMana}.` },
          { status: 400 }
        );
      }
    }

    const validacionObjetivo = validarObjetivoAccionCombate({
      accion,
      objetivo: body.objetivo,
      efectoHabilidad: habilidad?.efecto,
      // La ruta antigua adapta peticiones sin objetivo al contrato explícito.
      permitirInferencia: tipoEsperado === undefined,
    });
    if (!validacionObjetivo.valido) {
      return NextResponse.json({ error: validacionObjetivo.error }, { status: 400 });
    }
    body.objetivo = validacionObjetivo.objetivo;

    // ============================================================
    // ESTADO ACTUAL
    // ============================================================

    let jugadorHp = combate.jugadorHp;
    let jugadorDefensa = combate.jugadorDefensa;

    let enemigoHp = combate.enemigoHp;
    let enemigoDefensa = combate.enemigoDefensa;

    const log = Array.isArray(combate.log)
      ? [...(combate.log as string[])]
      : [];

    let consumible: { id: string; nombre: string; curacion: number; inventarioObjetoId: string } | null = null;

    // Si se vuelve a usar la misma habilidad, retira sus efectos anteriores antes
    // de resolverla. Así se renueva la duración sin acumular bonificaciones ni
    // dejar la defensa alterada al expirar el estado.
    if (accion === "usar_habilidad" && habilidad) {
      if (!esPvp || actor === "atacante") {
        const propios = retirarEfectosHabilidad(efectos, habilidad.id, jugadorDefensa);
        efectos = propios.efectos;
        jugadorDefensa = propios.defensa;
        const objetivo = retirarEfectosHabilidad(efectosDefensor, habilidad.id, enemigoDefensa);
        efectosDefensor = objetivo.efectos;
        enemigoDefensa = objetivo.defensa;
      } else {
        const propios = retirarEfectosHabilidad(efectosDefensor, habilidad.id, enemigoDefensa);
        efectosDefensor = propios.efectos;
        enemigoDefensa = propios.defensa;
        const objetivo = retirarEfectosHabilidad(efectos, habilidad.id, jugadorDefensa);
        efectos = objetivo.efectos;
        jugadorDefensa = objetivo.defensa;
      }
    }

    if (accion === "usar_objeto") {
      if (esPvp) {
        return NextResponse.json(
          { error: "Los consumibles todavía no están habilitados en asedios PvP." },
          { status: 409 }
        );
      }
      const registroInventario = personaje.inventario?.objetos.find(
        (item) => item.id === objetoInventarioId
      );
      if (!registroInventario || registroInventario.cantidad < 1) {
        return NextResponse.json({ error: "No tienes ese objeto en el inventario." }, { status: 404 });
      }
      const definicion = obtenerObjetoPorId(registroInventario.objetoId);
      if (!definicion || definicion.tipo !== "consumible" || !Number.isFinite(definicion.curacion) || (definicion.curacion ?? 0) <= 0) {
        return NextResponse.json({ error: "Este objeto no se puede usar durante el combate." }, { status: 400 });
      }
      if (actor !== "jugador") {
        return NextResponse.json({ error: "Solo puedes usar objetos durante tu turno." }, { status: 409 });
      }
      if (combate.jugadorHp >= combate.jugadorHpMaximo) {
        return NextResponse.json({ error: "Ya tienes la salud al máximo." }, { status: 400 });
      }
      consumible = {
        id: definicion.id,
        nombre: definicion.nombre,
        curacion: Math.floor(definicion.curacion ?? 0),
        inventarioObjetoId: registroInventario.id,
      };
    }

    // ============================================================

    return {
      contexto: {
        accion,
        habilidadId,
        objetoInventarioId,
        usuario,
        personaje,
        bonusCuracion,
        expedicion,
        combate,
        esPvp,
        actor,
        habilidad,
        cooldowns,
        efectos,
        cooldownsDefensor,
        efectosDefensor,
        jugadorHp,
        jugadorDefensa,
        enemigoHp,
        enemigoDefensa,
        log,
        consumible,
        objetivo: body.objetivo,
      },
    };
  } catch (error) {
    return manejarErrorAccionCombate(error);
  }
}
