import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { CLASES } from "@/lib/progresion/clases";
import {
  aplicarExperienciaJob,
  PUNTOS_ATRIBUTO_POR_NIVEL_BASE,
} from "@/lib/progresion/experiencia";
import { calcularEstadisticasDerivadasRpg } from "@/lib/progresion/estadisticas";
import { mapearBonificacionesEquipoRpg } from "@/lib/progresion/bonificaciones-equipo";
import { calcularModificadoresEquipo } from "@/lib/estadisticasPersonaje";
import { obtenerEquipoDesdePersonaje } from "@/lib/inventario";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { obtenerEnemigoPorId } from "@/lib/enemigos";
import { obtenerObjetoPorId } from "@/lib/objetos";
import { obtenerNombreObjetoConSufijo } from "@/lib/sufijosObjetos";
import { experienciaParaNivel } from "@/lib/configuracionJuego";
import {
  calcularBonusDefensaMuralla,
  resolverAtaqueJugador,
  resolverAtaqueEnemigo,
  type AccionAnimadaCombate,
  resolverHabilidadJugador,
} from "@/lib/expediciones/combate";
import { obtenerHabilidadPorId } from "@/lib/habilidades";
import { puedeUsarHabilidadDeClase } from "@/lib/progresion/clases";
import {
  determinarGanadorAsedio,
  determinarPrimerTurnoAsedio,
  siguienteTurnoAsedio,
  finalizarAsedio,
} from "@/lib/expediciones/asedio";
import type { DefinicionHabilidad, RecompensaMision } from "@/lib/tiposJuego";

type AccionCombate = "atacar" | "usar_habilidad" | "usar_objeto";

type EfectoCombate = {
  habilidadId: string;
  tipo: "bonus_defensa";
  valor: number;
  turnosRestantes: number;
};


async function otorgarExperienciaJob(
  tx: Prisma.TransactionClient,
  personaje: { id: string; profesionActivaId: string },
  experienciaGanada: number
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

  const actualizado = aplicarExperienciaJob(
    progreso,
    experienciaGanada,
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


async function gastarRecursosHabilidad(
  tx: Prisma.TransactionClient,
  personajeId: string,
  habilidad: DefinicionHabilidad | null
) {
  if (!habilidad) return;

  const costeEnergia = Math.max(0, Math.floor(habilidad.costeEnergia ?? 0));
  const costeMana = Math.max(0, Math.floor(habilidad.costeMana ?? 0));
  if (costeEnergia === 0 && costeMana === 0) return;

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
}

async function regenerarRecursosPorTurno(
  tx: Prisma.TransactionClient,
  usuarioId: string
) {
  const personaje = await tx.personaje.findUnique({
    where: { usuarioId },
    select: {
      id: true,
      nivel: true,
      profesionActivaId: true,
      fuerza: true,
      agilidad: true,
      vitalidad: true,
      inteligencia: true,
      destreza: true,
      suerte: true,
      energiaActual: true,
      manaActual: true,
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
  const bonificacionesEquipo = mapearBonificacionesEquipoRpg(modificadoresEquipo);

  const maximos = calcularEstadisticasDerivadasRpg({
    fuerza: personaje.fuerza,
    agilidad: personaje.agilidad,
    vitalidad: personaje.vitalidad,
    inteligencia: personaje.inteligencia,
    destreza: personaje.destreza,
    suerte: personaje.suerte,
  }, personaje.nivel, bonificacionesEquipo);

  const energiaNueva = Math.min(
    maximos.energiaMaxima,
    personaje.energiaActual + Math.max(1, Math.ceil(maximos.regeneracionEnergiaPorTurno))
  );
  const manaNuevo = Math.min(
    maximos.manaMaximo,
    personaje.manaActual + Math.max(1, Math.ceil(maximos.regeneracionManaPorTurno))
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

function obtenerRecompensaMision(valor: unknown): RecompensaMision {
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

function obtenerOroRecompensa(valor: unknown): number {
  return obtenerRecompensaMision(valor).oro;
}

function obtenerCooldowns(valor: unknown): Record<string, number> {
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

function reducirCooldowns(
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

function obtenerEfectos(valor: unknown): EfectoCombate[] {
  if (!Array.isArray(valor)) {
    return [];
  }

  return valor.filter((efecto): efecto is EfectoCombate => {
    if (!efecto || typeof efecto !== "object") {
      return false;
    }

    const registro = efecto as Record<string, unknown>;

    return (
      typeof registro.habilidadId === "string" &&
      registro.tipo === "bonus_defensa" &&
      typeof registro.valor === "number" &&
      typeof registro.turnosRestantes === "number" &&
      registro.turnosRestantes > 0
    );
  });
}

function actualizarEfectosAlInicioTurnoJugador(
  efectos: EfectoCombate[],
  defensaActual: number
): {
  efectos: EfectoCombate[];
  defensa: number;
} {
  let defensa = defensaActual;
  const nuevosEfectos: EfectoCombate[] = [];

  for (const efecto of efectos) {
    const turnosRestantes = efecto.turnosRestantes - 1;

    if (turnosRestantes > 0) {
      nuevosEfectos.push({
        ...efecto,
        turnosRestantes,
      });

      continue;
    }

    if (efecto.tipo === "bonus_defensa") {
      defensa = Math.max(0, defensa - efecto.valor);
    }
  }

  return {
    efectos: nuevosEfectos,
    defensa,
  };
}

export async function POST(request: Request) {
  try {
    const usuarioSesion = await getAuthenticatedUser();

    if (!usuarioSesion) {
      return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
    }

    let bodyJson: unknown;

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

    if (esPvp) {
      const usuarioEsAtacante = usuario.id === combate.atacanteUsuarioId;

      const usuarioEsDefensor = usuario.id === combate.defensorUsuarioId;

      if (actor !== "atacante" && actor !== "defensor") {
        return NextResponse.json(
          {
            error: "Turno de combate PvP no válido.",
          },
          { status: 409 }
        );
      }

      if (
        (actor === "atacante" && !usuarioEsAtacante) ||
        (actor === "defensor" && !usuarioEsDefensor)
      ) {
        return NextResponse.json(
          {
            error: "No es tu turno de combate.",
          },
          { status: 409 }
        );
      }
    } else {
      if (actor !== "jugador" && actor !== "enemigo") {
        return NextResponse.json(
          {
            error: "Turno de combate no válido.",
          },
          { status: 409 }
        );
      }

      if (
        (accion === "usar_habilidad" || accion === "usar_objeto") &&
        actor !== "jugador"
      ) {
        return NextResponse.json(
          {
            error: "Solo puedes usar habilidades u objetos durante tu turno.",
          },
          { status: 409 }
        );
      }
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
      const habilidadAprendida = personaje.habilidades.find(
        (habilidadAprendida) => habilidadAprendida.habilidadId === habilidadId
      );

      if (!habilidadAprendida) {
        return NextResponse.json(
          {
            error: "No tienes esa habilidad equipada.",
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

    let accionAnimada: AccionAnimadaCombate;
    let consumible: { id: string; curacion: number; inventarioObjetoId: string } | null = null;

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
        curacion: Math.floor(definicion.curacion ?? 0),
        inventarioObjetoId: registroInventario.id,
      };
    }

    // ============================================================
    // PVE
    // ============================================================

    if (!esPvp) {
      if (actor === "jugador") {
        if (accion === "atacar") {
          accionAnimada = resolverAtaqueJugador({
            jugadorAtaque: combate.jugadorAtaque,
            jugadorNivel: combate.jugadorNivel,
            jugadorProbCritico: combate.jugadorProbCritico,
            jugadorDanoCritico: combate.jugadorDanoCritico,
            enemigoDefensa,
            enemigoNombre: combate.enemigoNombre ?? "Enemigo",
          });

          enemigoHp = Math.max(0, enemigoHp - accionAnimada.dano);
        } else if (accion === "usar_objeto") {
          if (!consumible) {
            return NextResponse.json({ error: "Objeto de combate no válido." }, { status: 400 });
          }
          const curacion = Math.min(consumible.curacion, combate.jugadorHpMaximo - jugadorHp);
          if (curacion <= 0) {
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
            texto: `Usas ${obtenerObjetoPorId(consumible.id)?.nombre ?? "un consumible"} y recuperas ${curacion} puntos de vida.`,
          };
        } else {
          if (!habilidad) {
            return NextResponse.json(
              {
                error: "Habilidad no encontrada.",
              },
              { status: 404 }
            );
          }

          const resultadoHabilidad = resolverHabilidadJugador(habilidad, {
            jugadorAtaque: combate.jugadorAtaque,
            jugadorAtaqueMagico: combate.jugadorAtaqueMagico,
            jugadorProbCritico: combate.jugadorProbCritico,
            jugadorDanoCritico: combate.jugadorDanoCritico,
            jugadorDefensa,
            jugadorNivel: combate.jugadorNivel,
            jugadorHp,
            jugadorHpMaximo: combate.jugadorHpMaximo,
            enemigoDefensa,
            enemigoDefensaMagica: combate.enemigoDefensaMagica ?? enemigoDefensa,
            enemigoNombre: combate.enemigoNombre ?? "Enemigo",
          });

          accionAnimada = resultadoHabilidad.accion;

          jugadorHp = resultadoHabilidad.jugadorHp;
          jugadorDefensa = resultadoHabilidad.jugadorDefensa;

          enemigoHp = Math.max(0, enemigoHp - accionAnimada.dano);

          if (resultadoHabilidad.efecto) {
            efectos = [...efectos, resultadoHabilidad.efecto];
          }

          const cooldownTurnos = habilidad.cooldownTurnos ?? 0;

          if (cooldownTurnos > 0) {
            cooldowns[habilidad.id] = cooldownTurnos;
          }
        }
      } else {
        accionAnimada = resolverAtaqueEnemigo({
          enemigoAtaque: combate.enemigoAtaque,
          jugadorDefensa,
          enemigoNombre: combate.enemigoNombre ?? "Enemigo",
        });

        jugadorHp = Math.max(0, jugadorHp - accionAnimada.dano);
      }

      log.push(accionAnimada.texto);

      // ==========================================================
      // VICTORIA PVE
      // ==========================================================

      if (enemigoHp <= 0) {
        log.push(
          `🏆 ¡${combate.enemigoNombre ?? "El enemigo"} ha sido derrotado!`
        );

        if (!combate.enemigoId) {
          return NextResponse.json(
            {
              error: "El combate no tiene enemigo asociado.",
            },
            { status: 500 }
          );
        }

        const enemigo = obtenerEnemigoPorId(combate.enemigoId);

        if (!enemigo) {
          return NextResponse.json(
            {
              error: "No se encontró el enemigo derrotado.",
            },
            { status: 500 }
          );
        }

        const recompensaMision = obtenerRecompensaMision(expedicion.recompensa);

        const recompensaEnemigo =
          expedicion.tipo === "elite"
            ? Math.trunc(
                Math.max(
                  0,
                  enemigo.botin *
                    (1 + (expedicion.dificultad + personaje.nivel) * 2)
                )
              )
            : Math.trunc(
                Math.max(
                  0,
                  enemigo.botin *
                    (1 + (expedicion.dificultad + personaje.nivel) * 0.8)
                )
              );
        const oroGanado = recompensaMision.oro + recompensaEnemigo;

        const experienciaGanada =
          expedicion.tipo === "elite"
            ? 250 +
              Math.max(0, expedicion.dificultad * (1 + enemigo.difMin)) * 500
            : 25 +
              Math.max(0, expedicion.dificultad * (1 + enemigo.difMin)) * 50;

        log.push(
          `💰 Consigues ${recompensaMision.oro} 🪙 de recompensa por la misión y ${recompensaEnemigo} 🪙 por derrotar al enemigo.`
        );

        log.push(`⭐ Obtienes ${experienciaGanada} XP.`);

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
          await gastarRecursosHabilidad(tx, personaje.id, habilidad);
          if (consumible) {
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
            experienciaGanada
          );
          if (progresoJob && progresoJob.nivelesSubidos > 0) {
            log.push(`⬆️ Job de ${progresoJob.claseNombre}: nivel ${progresoJob.nivelJob}.`);
          }
          if (progresoJob?.maestriaCompletada) {
            log.push(`🏅 ¡Has completado la maestría de ${progresoJob.claseNombre}!`);
          }

          const actualizacionCombate = await tx.combateActivo.updateMany({
            where: {
              id: combate.id,
              version: combate.version,
            },
            data: {
              enemigoHp: 0,
              jugadorDefensa,
              cooldowns,
              efectos,
              fase: "victoria",
              turno: "jugador",
              oroGanado,
              experienciaGanada,
              log,
              ultimaAccion: accionAnimada,
              version: {
                increment: 1,
              },
            },
          });

          if (actualizacionCombate.count !== 1) {
            throw new Error("COMBATE_MODIFICADO");
          }

          const combateActualizado = await tx.combateActivo.findUniqueOrThrow({
            where: {
              id: combate.id,
            },
          });

          await tx.expedicionActiva.update({
            where: {
              id: expedicion.id,
            },
            data: {
              fase: "regresando",
              recompensa: {
                oro: oroGanado,
                madera: recompensaMision.madera,
                piedra: recompensaMision.piedra,
                metal: recompensaMision.metal,
              },
              resultadoFinal: "exito",
              hpPerdido: Math.max(0, combate.jugadorHpMaximo - jugadorHp),
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
              hpActual: Math.max(1, jugadorHp),
              nivel: nivelNuevo,
              experiencia: experienciaNueva,
              puntosAtributoDisponibles: {
                increment: nivelesSubidos * PUNTOS_ATRIBUTO_POR_NIVEL_BASE,
              },
            },
          });

          const usuarioActualizado = await tx.usuario.findUnique({
            where: {
              id: usuario.id,
            },
            include: {
              personaje: true,
              expedicionActiva: {
                include: {
                  combateActivo: true,
                },
              },
            },
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
      // ==========================================================

      if (jugadorHp <= 0) {
        log.push("💀 El aventurero cae derrotado.");

        if (!combate.enemigoId) {
          return NextResponse.json(
            {
              error: "El combate no tiene enemigo asociado.",
            },
            { status: 500 }
          );
        }

        const enemigo = obtenerEnemigoPorId(combate.enemigoId);

        if (!enemigo) {
          return NextResponse.json(
            {
              error: "No se encontró el enemigo del combate.",
            },
            { status: 500 }
          );
        }

        const oroTotalPosible =
          obtenerOroRecompensa(expedicion.recompensa) +
          Math.max(0, Math.floor(enemigo.botin));

        const oroAsegurado = Math.floor(oroTotalPosible / 5);

        const experienciaTotalPosible =
          25 + Math.max(0, expedicion.dificultad * (1 + enemigo.difMin)) * 20;

        const experienciaGanada = Math.floor(experienciaTotalPosible / 10);

        log.push(`💰 Antes de caer, consigues asegurar ${oroAsegurado} 🪙.`);

        log.push(`⭐ Obtienes ${experienciaGanada} XP.`);

        const resultado = await prisma.$transaction(async (tx) => {
          await gastarRecursosHabilidad(tx, personaje.id, habilidad);
          if (consumible) {
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
          const actualizacionCombate = await tx.combateActivo.updateMany({
            where: {
              id: combate.id,
              version: combate.version,
            },
            data: {
              jugadorHp: 0,
              jugadorDefensa,
              enemigoHp,
              cooldowns,
              efectos,
              fase: "derrota",
              turno: "jugador",
              oroGanado: oroAsegurado,
              experienciaGanada,
              log,
              ultimaAccion: accionAnimada,
              version: {
                increment: 1,
              },
            },
          });

          if (actualizacionCombate.count !== 1) {
            throw new Error("COMBATE_MODIFICADO");
          }

          const combateActualizado = await tx.combateActivo.findUniqueOrThrow({
            where: {
              id: combate.id,
            },
          });

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

          await tx.personaje.update({
            where: {
              id: personaje.id,
            },
            data: {
              hpActual: 1,
              estado: "de_viaje",
              nivel: nivelNuevo,
              experiencia: experienciaNueva,
              puntosAtributoDisponibles: {
                increment: nivelesSubidos * PUNTOS_ATRIBUTO_POR_NIVEL_BASE,
              },
            },
          });

          await tx.expedicionActiva.update({
            where: {
              id: expedicion.id,
            },
            data: {
              fase: "regresando",
              recompensa: {
                oro: oroAsegurado,
                madera: 0,
                piedra: 0,
                metal: 0,
              },
              experienciaGanada,
              resultadoFinal: "derrota",
              hpPerdido: Math.max(0, combate.jugadorHpMaximo - jugadorHp),
            },
          });

          const usuarioActualizado = await tx.usuario.findUnique({
            where: {
              id: usuario.id,
            },
            include: {
              personaje: true,
              expedicionActiva: {
                include: {
                  combateActivo: true,
                },
              },
            },
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
      // SIGUIENTE TURNO PVE
      // ==========================================================

      const jugadorEsPrimero =
        combate.jugadorVelocidad >= combate.enemigoVelocidad;

      let siguienteTurno: "jugador" | "enemigo";

      let siguienteRonda = combate.ronda;

      if (actor === "jugador") {
        if (jugadorEsPrimero) {
          siguienteTurno = "enemigo";
        } else {
          siguienteRonda += 1;
          siguienteTurno = "enemigo";
        }
      } else {
        if (jugadorEsPrimero) {
          siguienteRonda += 1;
          siguienteTurno = "jugador";
        } else {
          siguienteTurno = "jugador";
        }
      }

      if (actor === "enemigo" && siguienteTurno === "jugador") {
        cooldowns = reducirCooldowns(cooldowns);

        const efectosActualizados = actualizarEfectosAlInicioTurnoJugador(
          efectos,
          jugadorDefensa
        );

        efectos = efectosActualizados.efectos;
        jugadorDefensa = efectosActualizados.defensa;
      }

      const combateActualizado = await prisma.$transaction(async (tx) => {
        await gastarRecursosHabilidad(tx, personaje.id, habilidad);
        if (consumible) {
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
          await regenerarRecursosPorTurno(tx, usuario.id);
        }

        const actualizado = await tx.combateActivo.updateMany({
          where: {
            id: combate.id,
            version: combate.version,
          },
          data: {
            jugadorHp,
            jugadorDefensa,
            enemigoHp,
            ronda: siguienteRonda,
            turno: siguienteTurno,
            cooldowns,
            efectos,
            ultimoTurnoEn: new Date(),
            log,
            ultimaAccion: accionAnimada,
            version: {
              increment: 1,
            },
          },
        });

        if (actualizado.count !== 1) {
          throw new Error("COMBATE_MODIFICADO");
        }

        return tx.combateActivo.findUniqueOrThrow({
          where: { id: combate.id },
        });
      });

      return NextResponse.json({
        exito: true,
        combate: combateActualizado,
        terminado: false,
        accion: accionAnimada,
      });
    }

    // ============================================================
    // PVP
    // ============================================================

    if (!combate.atacanteUsuarioId || !combate.defensorUsuarioId) {
      return NextResponse.json(
        {
          error: "El combate PvP no tiene atacante y defensor válidos.",
        },
        { status: 500 }
      );
    }

    const atacanteUsuarioId = combate.atacanteUsuarioId;

    const defensorUsuarioId = combate.defensorUsuarioId;

    const atacanteEsUsuario = usuario.id === atacanteUsuarioId;

    const defensorEsUsuario = usuario.id === defensorUsuarioId;

    if (!atacanteEsUsuario && !defensorEsUsuario) {
      return NextResponse.json(
        {
          error: "No perteneces a este combate.",
        },
        { status: 403 }
      );
    }

    // En PvP:
    //
    // jugadorHp      = HP del atacante
    // enemigoHp      = HP del defensor
    //
    // jugadorAtaque  = ataque del atacante
    // enemigoAtaque  = ataque del defensor
    //
    // jugadorDefensa = defensa del atacante
    // enemigoDefensa = defensa del defensor

    if (actor === "atacante") {
      if (!atacanteEsUsuario) {
        return NextResponse.json(
          {
            error: "No es tu turno.",
          },
          { status: 409 }
        );
      }

      if (accion === "atacar") {
        accionAnimada = resolverAtaqueJugador({
          jugadorAtaque: combate.jugadorAtaque,
          jugadorNivel: combate.jugadorNivel,
          jugadorProbCritico: combate.jugadorProbCritico,
          jugadorDanoCritico: combate.jugadorDanoCritico,
          enemigoDefensa:
            combate.enemigoDefensa +
            calcularBonusDefensaMuralla(combate.murallaNivel),
          enemigoNombre: combate.enemigoNombre ?? "Defensor",
        });

        enemigoHp = Math.max(0, enemigoHp - accionAnimada.dano);
      } else {
        if (!habilidad) {
          return NextResponse.json(
            {
              error: "Habilidad no encontrada.",
            },
            { status: 404 }
          );
        }

        const resultadoHabilidad = resolverHabilidadJugador(habilidad, {
          jugadorAtaque: combate.jugadorAtaque,
          jugadorAtaqueMagico: combate.jugadorAtaqueMagico,
          jugadorProbCritico: combate.jugadorProbCritico,
          jugadorDanoCritico: combate.jugadorDanoCritico,
          jugadorDefensa,
          jugadorNivel: combate.jugadorNivel,
          jugadorHp,
          jugadorHpMaximo: combate.jugadorHpMaximo,
          enemigoDefensa:
            combate.enemigoDefensa +
            calcularBonusDefensaMuralla(combate.murallaNivel),
          enemigoDefensaMagica:
            (combate.enemigoDefensaMagica ?? combate.enemigoDefensa) +
            calcularBonusDefensaMuralla(combate.murallaNivel),
          enemigoNombre: combate.enemigoNombre ?? "Defensor",
        });

        accionAnimada = resultadoHabilidad.accion;

        jugadorHp = resultadoHabilidad.jugadorHp;

        jugadorDefensa = resultadoHabilidad.jugadorDefensa;

        enemigoHp = Math.max(0, enemigoHp - accionAnimada.dano);

        if (resultadoHabilidad.efecto) {
          efectos = [...efectos, resultadoHabilidad.efecto];
        }

        const cooldownTurnos = habilidad.cooldownTurnos ?? 0;

        if (cooldownTurnos > 0) {
          cooldowns[habilidad.id] = cooldownTurnos;
        }
      }
    } else if (actor === "defensor") {
      if (!defensorEsUsuario) {
        return NextResponse.json(
          {
            error: "No es tu turno.",
          },
          { status: 409 }
        );
      }

      if (accion === "atacar") {
        accionAnimada = resolverAtaqueEnemigo({
          enemigoAtaque: combate.enemigoAtaque,
          jugadorDefensa,
          enemigoNombre: personaje.nombre,
        });

        jugadorHp = Math.max(0, jugadorHp - accionAnimada.dano);
      } else {
        if (!habilidad) {
          return NextResponse.json(
            {
              error: "Habilidad no encontrada.",
            },
            { status: 404 }
          );
        }

        const resultadoHabilidad = resolverHabilidadJugador(habilidad, {
          jugadorAtaque: combate.enemigoAtaque,
          jugadorAtaqueMagico: combate.enemigoAtaqueMagico ?? combate.enemigoAtaque,
          jugadorProbCritico: combate.enemigoProbCritico,
          jugadorDanoCritico: combate.enemigoDanoCritico,
          jugadorDefensa: enemigoDefensa,
          jugadorNivel: combate.enemigoNivel,
          jugadorHp: enemigoHp,
          jugadorHpMaximo: combate.enemigoHpMaximo,
          enemigoDefensa: jugadorDefensa,
          enemigoDefensaMagica: combate.jugadorDefensaMagica,
          enemigoNombre: "Atacante",
        });

        accionAnimada = resultadoHabilidad.accion;

        enemigoHp = resultadoHabilidad.jugadorHp;
        enemigoDefensa = resultadoHabilidad.jugadorDefensa;

        jugadorHp = Math.max(0, jugadorHp - accionAnimada.dano);

        if (resultadoHabilidad.efecto) {
          efectosDefensor = [...efectosDefensor, resultadoHabilidad.efecto];
        }

        const cooldownTurnos = habilidad.cooldownTurnos ?? 0;

        if (cooldownTurnos > 0) {
          cooldownsDefensor[habilidad.id] = cooldownTurnos;
        }
      }
    } else {
      return NextResponse.json(
        {
          error: "Turno de combate PvP no válido.",
        },
        { status: 409 }
      );
    }

    log.push(accionAnimada.texto);

    // ============================================================
    // DETERMINAR GANADOR PVP
    // ============================================================

    const ganador = determinarGanadorAsedio({
      hpAtacante: jugadorHp,
      hpDefensor: enemigoHp,
    });

    if (ganador) {
      const atacanteGana = ganador === "atacante";

      if (atacanteGana) {
        log.push(
          `🏆 ¡${combate.enemigoNombre ?? "El defensor"} ha sido derrotado!`
        );
      } else {
        log.push(`🏆 ¡El atacante ha sido derrotado!`);
      }

      const resultado = await prisma.$transaction(async (tx) => {
        await gastarRecursosHabilidad(tx, personaje.id, habilidad);
        return finalizarAsedio({
          tx,

          combate: {
            id: combate.id,
            version: combate.version,

            atacanteUsuarioId: combate.atacanteUsuarioId,
            defensorUsuarioId: combate.defensorUsuarioId,

            jugadorHpMaximo: combate.jugadorHpMaximo,

            almacenNivel: combate.almacenNivel,
            capacidadCarruaje: combate.capacidadCarruaje,

            estadoDefensorAnterior: combate.estadoDefensorAnterior,
          },

          expedicionId: expedicion.id,

          jugadorHp,
          enemigoHp,

          jugadorDefensa,
          enemigoDefensa,

          cooldowns,
          efectos,
          cooldownsDefensor,
          efectosDefensor,

          accion: accionAnimada,
          log,

          ganador,
        });
      });

      return NextResponse.json({
        exito: true,
        combate: resultado.combate,
        terminado: true,
        accion: accionAnimada,
        botin: resultado.botin,
      });
    }

    // ============================================================
    // SIGUIENTE TURNO PVP
    // ============================================================

    const siguienteTurno = siguienteTurnoAsedio(actor);

    let siguienteRonda = combate.ronda;

    // El inicio de la ronda siguiente se produce
    // cuando vuelve el turno al participante que
    // comenzó la ronda.
    const primerTurno = determinarPrimerTurnoAsedio({
      velocidadAtacante: combate.jugadorVelocidad,
      velocidadDefensor: combate.enemigoVelocidad,
    });

    if (siguienteTurno === primerTurno) {
      siguienteRonda += 1;
    }

    if (siguienteTurno === "atacante") {
      cooldowns = reducirCooldowns(cooldowns);

      const efectosActualizados = actualizarEfectosAlInicioTurnoJugador(
        efectos,
        jugadorDefensa
      );

      efectos = efectosActualizados.efectos;
      jugadorDefensa = efectosActualizados.defensa;
    }

    if (siguienteTurno === "defensor") {
      cooldownsDefensor = reducirCooldowns(cooldownsDefensor);

      const efectosActualizados = actualizarEfectosAlInicioTurnoJugador(
        efectosDefensor,
        enemigoDefensa
      );

      efectosDefensor = efectosActualizados.efectos;
      enemigoDefensa = efectosActualizados.defensa;
    }

    const combateActualizado = await prisma.$transaction(async (tx) => {
      await gastarRecursosHabilidad(tx, personaje.id, habilidad);
      const siguienteUsuarioId =
        siguienteTurno === "atacante" ? atacanteUsuarioId : defensorUsuarioId;
      await regenerarRecursosPorTurno(tx, siguienteUsuarioId);

      const actualizado = await tx.combateActivo.updateMany({
        where: {
          id: combate.id,
          version: combate.version,
        },
        data: {
          jugadorHp,
          enemigoHp,
          jugadorDefensa,
          enemigoDefensa,
          ronda: siguienteRonda,
          turno: siguienteTurno,
          cooldowns,
          efectos,
          cooldownsDefensor,
          efectosDefensor,
          ultimoTurnoEn: new Date(),
          log,
          ultimaAccion: accionAnimada,
          version: {
            increment: 1,
          },
        },
      });

      if (actualizado.count !== 1) {
        throw new Error("COMBATE_MODIFICADO");
      }

      return tx.combateActivo.findUniqueOrThrow({
        where: { id: combate.id },
      });
    });

    return NextResponse.json({
      exito: true,
      combate: combateActualizado,
      terminado: false,
      accion: accionAnimada,
    });
  } catch (error) {
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
        {
          error:
            "El combate ha cambiado mientras se procesaba la acción. La acción ya no es válida.",
        },
        { status: 409 }
      );
    }

    console.error("Error al ejecutar acción de combate:", error);

    return NextResponse.json(
      {
        error: "No se pudo ejecutar la acción de combate.",
      },
      { status: 500 }
    );
  }
}
