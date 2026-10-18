import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcularDistanciaKm } from "@/lib/utils";
import { resolverComercio } from "@/lib/expediciones/comercio";
import {
  calcularEstadisticasPersonaje,
  calcularModificadoresEquipo,
} from "@/lib/estadisticasPersonaje";
import { obtenerEquipoDesdePersonaje, LIMITE_INVENTARIO_OBJETOS } from "@/lib/inventario";
import { obtenerEnemigoPorId } from "@/lib/enemigos";
import { leerEnemigosEnCombate } from "@/lib/expediciones/enemigos-combate";
import { tirarBotinEnemigo } from "@/lib/lootObjetos";
import { obtenerNombreObjetoConSufijo } from "@/lib/sufijosObjetos";
import { calcularCapacidadAlmacen } from "@/lib/expediciones/asedio";
import type { RecompensaMision, TipoMision } from "@/lib/tiposJuego";

function leerArrayStrings(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((entrada): entrada is string => typeof entrada === "string") : [];
}

function leerCampoObjeto(valor: unknown, campo: string): unknown {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return undefined;
  return (valor as Record<string, unknown>)[campo];
}

function leerLogGuardadoComercio(valor: unknown): string[] {
  return leerArrayStrings(leerCampoObjeto(valor, "logComercio"));
}

function leerDuracionGuardada(valor: unknown): number | undefined {
  const duracion = leerCampoObjeto(valor, "duracionSegundos");
  return typeof duracion === "number" && Number.isFinite(duracion) && duracion >= 0
    ? Math.floor(duracion)
    : undefined;
}

function obtenerExperienciaJobDelLog(log: string[]): number {
  return log.reduce((total, linea) => {
    const coincidencia = linea.match(/Job XP:\s*(\d+)/i);
    return total + (coincidencia ? Number(coincidencia[1]) : 0);
  }, 0);
}

function obtenerTipoMisionReporte(valor: string): TipoMision | undefined {
  return ["normal", "elite", "comercio", "boss", "asedio"].includes(valor)
    ? valor as TipoMision
    : undefined;
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
      oro: Math.max(0, Math.trunc(valor.oro)),
      madera: Math.max(0, Math.trunc(valor.madera)),
      piedra: Math.max(0, Math.trunc(valor.piedra)),
      metal: Math.max(0, Math.trunc(valor.metal)),
    };
  }

  return {
    oro: 0,
    madera: 0,
    piedra: 0,
    metal: 0,
  };
}

export async function completarExpedicion() {
  try {
    const usuarioSesion = await getAuthenticatedUser();

    if (!usuarioSesion) {
      return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioSesion.id },
      include: {
        personaje: {
          include: {
            habilidades: true,
            progresosClase: true,
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
          },
        },
        expedicionActiva: {
          include: {
            combateActivo: true,
          },
        },
      },
    });

    const expedicion = usuario?.expedicionActiva;

    if (!usuario?.personaje || !expedicion) {
      return NextResponse.json(
        { error: "No hay una expedición activa." },
        { status: 400 }
      );
    }

    // ============================================================
    // COMPROBAR QUE LA EXPEDICIÓN HAYA LLEGADO
    // ============================================================
    if (expedicion.fechaLlegada > new Date()) {
      return NextResponse.json(
        { error: "La expedición todavía está en curso." },
        { status: 409 }
      );
    }

    // ============================================================
    // RECIBIR AL AVENTURERO AL REGRESAR
    // ============================================================
    if (expedicion.fase === "regresando") {
      const recompensa = obtenerRecompensaMision(expedicion.recompensa);
      const resultadoFinal = expedicion.resultadoFinal;

      if (!resultadoFinal) {
        return NextResponse.json(
          {
            error: "La expedición no tiene un resultado final registrado.",
          },
          { status: 409 }
        );
      }

      const exito = resultadoFinal === "exito";
      const combate = expedicion.combateActivo;
      const enemigoDerrotado = obtenerEnemigoPorId(
        expedicion.enemigoId ?? combate?.enemigoId ?? ""
      );
      const botinTirado =
        exito && expedicion.tipo !== "comercio"
          ? tirarBotinEnemigo(enemigoDerrotado)
          : null;

      // CAPACIDAD DEL ALMACÉN
      const edificios = usuario.edificios as Record<string, unknown> | null;
      const nivelAlmacen =
        typeof edificios?.almacen === "number"
          ? Math.max(0, Math.trunc(edificios.almacen))
          : 0;

      const capacidadAlmacen = calcularCapacidadAlmacen(nivelAlmacen);

      const maderaRecibida = Math.max(
        0,
        Math.min(
          recompensa.madera,
          Math.max(0, capacidadAlmacen - usuario.madera)
        )
      );

      const piedraRecibida = Math.max(
        0,
        Math.min(
          recompensa.piedra,
          Math.max(0, capacidadAlmacen - usuario.piedra)
        )
      );

      const metalRecibido = Math.max(
        0,
        Math.min(
          recompensa.metal,
          Math.max(0, capacidadAlmacen - usuario.metal)
        )
      );

      const maderaPerdida = recompensa.madera - maderaRecibida;
      const piedraPerdida = recompensa.piedra - piedraRecibida;
      const metalPerdido = recompensa.metal - metalRecibido;

      const recompensaRecibida: RecompensaMision = {
        oro: recompensa.oro,
        madera: maderaRecibida,
        piedra: piedraRecibida,
        metal: metalRecibido,
      };

      let logRegreso: string[];

      if (resultadoFinal === "exito") {
        logRegreso = [
          `🏠 ${usuario.personaje.nombre} regresa al gremio con el botín asegurado.`,
        ];

        if (recompensaRecibida.oro > 0) {
          logRegreso.push(
            `💰 Recibes ${recompensaRecibida.oro} 🪙 por la expedición.`
          );
        }
        if (recompensaRecibida.madera > 0) {
          logRegreso.push(
            `🪵 Recibes ${recompensaRecibida.madera} de madera por la expedición.`
          );
        }
        if (recompensaRecibida.piedra > 0) {
          logRegreso.push(
            `🪨 Recibes ${recompensaRecibida.piedra} de piedra por la expedición.`
          );
        }
        if (recompensaRecibida.metal > 0) {
          logRegreso.push(
            `⚙️ Recibes ${recompensaRecibida.metal} de metal por la expedición.`
          );
        }
      } else if (resultadoFinal === "derrota") {
        logRegreso = [
          `💀 ${usuario.personaje.nombre} regresa al gremio tras ser derrotado.`,
        ];
      } else if (resultadoFinal === "huida") {
        logRegreso = [
          `🏃 ${usuario.personaje.nombre} huye del combate y regresa sin completar la misión.`,
        ];
      } else {
        logRegreso = [
          `↩️ ${usuario.personaje.nombre} regresa al gremio tras cancelar la expedición.`,
        ];
      }

      let recursosPerdidos = "";
      if (maderaPerdida > 0) {
        recursosPerdidos += `${maderaPerdida} 🪵, `;
      }
      if (piedraPerdida > 0) {
        recursosPerdidos += `${piedraPerdida} 🪨, `;
      }
      if (metalPerdido > 0) {
        recursosPerdidos += `${metalPerdido} ⚙️, `;
      }
      recursosPerdidos = recursosPerdidos.replace(/, $/, "");

      if (recursosPerdidos !== "") {
        logRegreso.push(
          `📦 El almacén no tenía espacio suficiente y se pierden ` +
            recursosPerdidos +
            `.`
        );
      }

      const actualizado = await prisma.$transaction(async (tx) => {
        let botinEntregado: {
          id: string;
          objetoId: string;
          nombre: string;
          sufijoId: string | null;
          bonificaciones: Record<string, number>;
        } | null = null;
        let botinPerdidoPorInventarioLleno = false;

        if (botinTirado && usuario.personaje?.id) {
          const inventario = await tx.inventario.upsert({
            where: { personajeId: usuario.personaje.id },
            update: {},
            create: { personajeId: usuario.personaje.id },
          });
          const espaciosOcupados = await tx.inventarioObjeto.count({
            where: { inventarioId: inventario.id },
          });

          if (espaciosOcupados < LIMITE_INVENTARIO_OBJETOS) {
            const objetoCreado = await tx.inventarioObjeto.create({
              data: {
                inventarioId: inventario.id,
                objetoId: botinTirado.objeto.id,
                cantidad: 1,
                nivelMejora: 0,
                sufijoId: botinTirado.sufijoId,
                bonificaciones: botinTirado.bonificaciones,
              },
            });
            botinEntregado = {
              id: objetoCreado.id,
              objetoId: objetoCreado.objetoId,
              nombre: obtenerNombreObjetoConSufijo(
                botinTirado.objeto.nombre,
                botinTirado.sufijoId
              ),
              sufijoId: botinTirado.sufijoId,
              bonificaciones: botinTirado.bonificaciones,
            };
          } else {
            botinPerdidoPorInventarioLleno = true;
          }
        }

        const asedioEntrante = await tx.combateActivo.findFirst({
          where: {
            tipo: "pvp",
            defensorUsuarioId: usuario.id,
            fase: "activo",
          },
          select: {
            id: true,
          },
        });

        await tx.expedicionActiva.delete({
          where: { id: expedicion.id },
        });

        await tx.personaje.update({
          where: { usuarioId: usuario.id },
          data: {
            // Los recursos agotados no obligan a descansar en la base:
            // vuelven al máximo al iniciar una nueva expedición.
            estado: asedioEntrante ? "combatiendo" : "ocioso",
          },
        });

        let afinidad = 0;

        if (expedicion.tipo === "comercio" && expedicion.objetivoId) {
          await tx.usuario.update({
            where: { id: expedicion.objetivoId },
            data: {
              oro: {
                increment: Math.floor(recompensa.oro * 0.25),
              },
            },
          });

          const relacion = await tx.afinidadComercial.upsert({
            where: {
              jugador1Id_jugador2Id: {
                jugador1Id: usuario.id,
                jugador2Id: expedicion.objetivoId,
              },
            },
            create: {
              jugador1Id: usuario.id,
              jugador2Id: expedicion.objetivoId,
              intercambios: 1,
              afinidad: 1,
            },
            update: {
              intercambios: { increment: 1 },
              afinidad: { increment: 1 },
            },
          });

          afinidad = relacion.afinidad;
        }

        const usuarioActualizado = await tx.usuario.update({
          where: { id: usuario.id },
          data: {
            oro: {
              increment: recompensaRecibida.oro,
            },
            madera: {
              increment: recompensaRecibida.madera,
            },
            piedra: {
              increment: recompensaRecibida.piedra,
            },
            metal: {
              increment: recompensaRecibida.metal,
            },
          },
          include: {
            personaje: {
              include: {
                habilidades: true,
                inventario: {
                  include: {
                    objetos: true,
                  },
                },
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
              },
            },
            expedicionActiva: true,
          },
        });

        return {
          usuario: usuarioActualizado,
          afinidad,
          botinEntregado,
          botinPerdidoPorInventarioLleno,
        };
      }, { isolationLevel: "Serializable" });

      if (actualizado.botinEntregado) {
        logRegreso.push(`🎁 Encuentras ${actualizado.botinEntregado.nombre}.`);
      } else if (actualizado.botinPerdidoPorInventarioLleno) {
        logRegreso.push("🎒 El inventario está lleno y el objeto encontrado se ha perdido.");
      }

      const datosRegreso = Object.fromEntries(
        Object.entries(actualizado.usuario).filter(
          ([clave]) => clave !== "password"
        )
      );

      const logCombateOriginal = combate && Array.isArray(combate.log)
        ? (combate.log as string[]).filter((linea): linea is string => typeof linea === "string")
        : [];
      const logComercioGuardado = leerLogGuardadoComercio(expedicion.recompensa);
      const logCombate = expedicion.tipo === "comercio" ? logComercioGuardado : logCombateOriginal;
      const enemigosDerrotados = leerEnemigosEnCombate(combate?.enemigos)
        .filter((enemigo) => enemigo.hp <= 0)
        .map((enemigo) => enemigo.nombre);
      if (enemigosDerrotados.length === 0 && resultadoFinal === "exito" && combate?.enemigoNombre) {
        enemigosDerrotados.push(combate.enemigoNombre);
      }
      const objetivoReporte = expedicion.tipo === "comercio" && expedicion.objetivoId
        ? await prisma.usuario.findUnique({ where: { id: expedicion.objetivoId }, select: { nombre: true } })
        : null;
      const duracionSegundos = leerDuracionGuardada(expedicion.recompensa)
        ?? Math.max(0, Math.round((expedicion.fechaLlegada.getTime() - expedicion.fechaSalida.getTime()) * 2 / 1000));
      const experienciaJobGanada = obtenerExperienciaJobDelLog(logCombate);

      let reporte;

      if (expedicion.tipo === "comercio") {
        reporte = {
          exito,
          resultadoFinal,
          hpPerdido: expedicion.hpPerdido,
          oroGanado: recompensaRecibida.oro,
          recompensa: recompensaRecibida,
          experienciaGanada: expedicion.experienciaGanada,
          tipo: "comercio" as const,
          tipoMision: "comercio" as const,
          amenaza: expedicion.dificultad,
          duracionSegundos,
          objetivoNombre: objetivoReporte?.nombre,
          experienciaJobGanada,
          afinidad: actualizado.afinidad,
          objetosObtenidos: actualizado.botinEntregado ? [{ ...actualizado.botinEntregado, cantidad: 1 }] : [],
          logCombate: [...logCombate, ...logRegreso],
        };
      } else if (resultadoFinal === "cancelada" || resultadoFinal === "huida") {
        reporte = {
          exito,
          resultadoFinal,
          hpPerdido: expedicion.hpPerdido,
          oroGanado: recompensaRecibida.oro,
          recompensa: recompensaRecibida,
          experienciaGanada: expedicion.experienciaGanada,
          tipo: "combate" as const,
          tipoMision: obtenerTipoMisionReporte(expedicion.tipo),
          amenaza: expedicion.dificultad,
          duracionSegundos,
          experienciaJobGanada,
          logCombate: [...logCombate, ...logRegreso],
        };
      } else {
        reporte = {
          exito,
          resultadoFinal,
          hpPerdido: expedicion.hpPerdido,
          oroGanado: recompensaRecibida.oro,
          recompensa: recompensaRecibida,
          experienciaGanada: expedicion.experienciaGanada,
          tipo: "combate" as const,
          tipoMision: obtenerTipoMisionReporte(expedicion.tipo),
          amenaza: expedicion.dificultad,
          duracionSegundos,
          experienciaJobGanada,
          enemigosDerrotados,
          enemigo: combate?.enemigoNombre ?? "Enemigo",
          enemigoId: combate?.enemigoId ?? "goblin",
          rondas: combate?.ronda ?? 0,
          poderHeroe: combate
            ? combate.jugadorAtaque + combate.jugadorDefensa
            : 0,
          objetosObtenidos: actualizado.botinEntregado ? [{ ...actualizado.botinEntregado, cantidad: 1 }] : [],
          logCombate: [...logCombate, ...logRegreso],
        };
      }

      return NextResponse.json({
        resultado: reporte,
        usuario: datosRegreso,
      });
    }

    // ============================================================
    // EL COMBATE POR SU API
    // ============================================================
    if (expedicion.fase === "combatiendo") {
      return NextResponse.json(
        {
          error: "La expedición se encuentra en combate.",
          combate: expedicion.combateActivo,
        },
        { status: 409 }
      );
    }

    if (expedicion.tipo !== "comercio") {
      return NextResponse.json(
        {
          error:
            "Las expediciones de combate deben iniciarse mediante el sistema de combate.",
        },
        { status: 409 }
      );
    }

    if (!expedicion.objetivoId) {
      return NextResponse.json(
        {
          error: "La expedición comercial no tiene un gremio de destino.",
        },
        { status: 400 }
      );
    }

    // ============================================================
    // OBTENER GREMIO DE DESTINO
    // ============================================================
    const objetivo = await prisma.usuario.findUnique({
      where: {
        id: expedicion.objetivoId,
      },
      select: {
        id: true,
        nombre: true,
        edificios: true,
      },
    });

    if (!objetivo) {
      return NextResponse.json(
        {
          error: "El gremio de destino ya no existe.",
        },
        { status: 404 }
      );
    }

    // ============================================================
    // VALIDAR COORDENADAS
    // ============================================================
    const origenCoords = usuario.baseCoords as {
      lat?: unknown;
      lng?: unknown;
    } | null;

    const destinoCoords = expedicion.destinoCoords as {
      lat?: unknown;
      lng?: unknown;
    };

    if (
      typeof origenCoords?.lat !== "number" ||
      typeof origenCoords.lng !== "number" ||
      typeof destinoCoords.lat !== "number" ||
      typeof destinoCoords.lng !== "number"
    ) {
      return NextResponse.json(
        { error: "La ruta comercial no tiene coordenadas válidas." },
        { status: 400 }
      );
    }

    // ============================================================
    // OBTENER AFINIDAD ACTUAL
    // ============================================================
    const afinidad = await prisma.afinidadComercial.findUnique({
      where: {
        jugador1Id_jugador2Id: {
          jugador1Id: usuario.id,
          jugador2Id: objetivo.id,
        },
      },
    });

    const afinidadActual = afinidad?.afinidad ?? 0;

    // ============================================================
    // NIVEL DEL MERCADO
    // ============================================================
    const mercado = objetivo.edificios as Record<string, unknown> | null;

    const nivelMercado =
      typeof mercado?.mercado === "number" ? mercado.mercado : 0;

    // ============================================================
    // RESOLVER COMERCIO
    // ============================================================
    const distanciaKm = calcularDistanciaKm(
      origenCoords.lat,
      origenCoords.lng,
      destinoCoords.lat,
      destinoCoords.lng
    );

    const equipo = obtenerEquipoDesdePersonaje(usuario.personaje);
    const modificadoresEquipo = calcularModificadoresEquipo(
      equipo,
      usuario.personaje!.profesionActivaId
    );

    const estadisticasPersonaje = calcularEstadisticasPersonaje(
      usuario.personaje,
      usuario.personaje.habilidades.filter((habilidad) => habilidad.slot !== null).map((habilidad) => ({ habilidadId: habilidad.habilidadId, nivel: habilidad.nivel })),
      modificadoresEquipo
    );

    const personajeComercio = {
      nombre: usuario.personaje.nombre,
      clase: usuario.personaje.clase,
      hpActual: usuario.personaje.hpActual,
      hpMaximo: estadisticasPersonaje.total.hpMaximo,
      ataque: estadisticasPersonaje.total.ataque,
      defensa: estadisticasPersonaje.total.defensa,
      capacidadCarruaje: estadisticasPersonaje.total.capacidadCarruaje,
      nivel: usuario.personaje.nivel,
    };

    const resultado = resolverComercio(
      personajeComercio,
      distanciaKm,
      nivelMercado,
      afinidadActual,
      objetivo.nombre
    );

    const oroGanado =
      typeof resultado.oroGanado === "number" &&
      Number.isFinite(resultado.oroGanado)
        ? Math.max(0, resultado.oroGanado)
        : 0;

    // ============================================================
    // CALCULAR REGRESO
    // ============================================================
    const duracionIda = Math.max(
      60_000,
      expedicion.fechaLlegada.getTime() - expedicion.fechaSalida.getTime()
    );

    const fechaSalidaRegreso = expedicion.fechaLlegada;

    const fechaLlegadaRegreso = new Date(
      fechaSalidaRegreso.getTime() + duracionIda
    );

    // ============================================================
    // GUARDAR RESULTADO Y COMENZAR REGRESO
    // ============================================================
    const actualizado = await prisma.$transaction(async (tx) => {
      await tx.personaje.update({
        where: {
          usuarioId: usuario.id,
        },
        data: {
          hpActual: Math.max(
            1,
            usuario.personaje!.hpActual - resultado.hpPerdido
          ),
          estado: "de_viaje",
        },
      });

      await tx.expedicionActiva.update({
        where: { id: expedicion.id },
        data: {
          fase: "regresando",
          fechaSalida: fechaSalidaRegreso,
          fechaLlegada: fechaLlegadaRegreso,
          recompensa: {
            oro: oroGanado,
            madera: 0,
            piedra: 0,
            metal: 0,
            logComercio: resultado.logCombate,
            duracionSegundos: Math.max(0, Math.round(duracionIda * 2 / 1000)),
          },
          resultadoFinal: resultado.exito ? "exito" : "derrota",
          hpPerdido: resultado.hpPerdido,
          experienciaGanada: resultado.experienciaGanada,
        },
      });

      await tx.registroAccion.create({
        data: {
          usuarioId: usuario.id,
          tipo: "EXPEDICION_TERMINADA",
          detalle: `${expedicion.nombre}: ${
            resultado.exito ? "éxito" : "fracaso"
          }`,
        },
      });

      return tx.usuario.update({
        where: { id: usuario.id },
        data: {
          oro: {
            increment: 0,
          },
        },
        include: {
          personaje: {
            include: {
              habilidades: true,
              inventario: {
                include: {
                  objetos: true,
                },
              },
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
            },
          },
          expedicionActiva: true,
        },
      });
    });

    const datos = Object.fromEntries(
      Object.entries(actualizado).filter(([clave]) => clave !== "password")
    );

    return NextResponse.json({
      resultado: {
        ...resultado,
        oroGanado,
      },
      usuario: datos,
    });
  } catch (error) {
    console.error("Error al completar expedición:", error);

    return NextResponse.json(
      { error: "No se pudo completar la expedición." },
      { status: 500 }
    );
  }
}
