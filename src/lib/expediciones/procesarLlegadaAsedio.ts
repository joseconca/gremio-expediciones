import { prisma } from "@/lib/prisma";

import {
  calcularBonificacionMuralla,
  determinarPrimerTurnoAsedio,
} from "@/lib/expediciones/asedio";

import {
  calcularEstadisticasPersonaje,
  calcularModificadoresEquipo,
} from "@/lib/estadisticasPersonaje";

import { obtenerEquipoDesdePersonaje } from "@/lib/inventario";
import { aplicarEfectoComida, comidaOtorgaIniciativa, obtenerComidaTaberna } from "@/lib/comidasTaberna";

export async function procesarLlegadaAsedio(expedicionId: string) {
  const expedicion = await prisma.expedicionActiva.findUnique({
    where: {
      id: expedicionId,
    },
    include: {
      usuario: {
        include: {
          personaje: {
            include: {
              habilidades: true,
              progresosClase: true,
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
        },
      },
    },
  });

  if (!expedicion) {
    throw new Error("EXPEDICION_NO_ENCONTRADA");
  }

  if (expedicion.tipo !== "asedio") {
    throw new Error("EXPEDICION_NO_ES_ASEDIO");
  }

  /*
   * Si ya ha sido procesada, comprobamos si existe su combate.
   *
   * Esto hace que llamar dos veces a esta función no genere
   * un error innecesario si la primera llamada ya terminó.
   */
  if (expedicion.fase !== "en_viaje") {
    const combateExistente = await prisma.combateActivo.findUnique({
      where: {
        expedicionId: expedicion.id,
      },
    });

    if (combateExistente) {
      return combateExistente;
    }

    throw new Error("EXPEDICION_NO_PUEDE_INICIAR_ASEDIO");
  }

  const ahora = new Date();

  if (expedicion.fechaLlegada > ahora) {
    throw new Error("EXPEDICION_AUN_NO_HA_LLEGADO");
  }

  if (!expedicion.objetivoId) {
    throw new Error("ASEDIO_SIN_OBJETIVO");
  }

  if (!expedicion.usuario?.personaje) {
    throw new Error("ATACANTE_SIN_PERSONAJE");
  }

  const atacante = expedicion.usuario;
  const personajeAtacante = atacante.personaje;

  if (!personajeAtacante) {
    throw new Error("PERSONAJE_ATACANTE_NO_ENCONTRADO");
  }

  const defensor = await prisma.usuario.findUnique({
    where: {
      id: expedicion.objetivoId,
    },
    include: {
      personaje: {
        include: {
          habilidades: true,
          progresosClase: true,
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

  if (!defensor?.personaje) {
    throw new Error("DEFENSOR_NO_ENCONTRADO");
  }

  /*
   * No permitimos que un personaje participe en dos combates
   * PvP simultáneos.
   */
  const combateDefensor = await prisma.combateActivo.findFirst({
    where: {
      tipo: "pvp",
      defensorUsuarioId: defensor.id,
      fase: "activo",
    },
  });

  if (
    combateDefensor ||
    defensor.expedicionActiva?.combateActivo ||
    defensor.personaje.estado === "combatiendo"
  ) {
    throw new Error("DEFENSOR_YA_PARTICIPA_EN_COMBATE");
  }

  // ============================================================
  // ESTADÍSTICAS DEL ATACANTE
  // ============================================================

  const equipoAtacante = obtenerEquipoDesdePersonaje(personajeAtacante);

  const modificadoresEquipoAtacante = calcularModificadoresEquipo(
    equipoAtacante,
    personajeAtacante.profesionActivaId
  );

  const estadisticasAtacante = calcularEstadisticasPersonaje(
    personajeAtacante,
    personajeAtacante.habilidades.filter((habilidad) => habilidad.slot !== null).map((habilidad) => habilidad.habilidadId),
    modificadoresEquipoAtacante
  );

  // ============================================================
  // ESTADÍSTICAS DEL DEFENSOR
  // ============================================================

  const personajeDefensor = defensor.personaje;

  const equipoDefensor = obtenerEquipoDesdePersonaje(personajeDefensor);

  const modificadoresEquipoDefensor = calcularModificadoresEquipo(
    equipoDefensor,
    personajeDefensor.profesionActivaId
  );

  const estadisticasDefensor = calcularEstadisticasPersonaje(
    personajeDefensor,
    personajeDefensor.habilidades.filter((habilidad) => habilidad.slot !== null).map((habilidad) => habilidad.habilidadId),
    modificadoresEquipoDefensor
  );

  // ============================================================
  // EDIFICIOS DEFENSIVOS
  // ============================================================

  const edificiosDefensor = defensor.edificios as Record<
    string,
    unknown
  > | null;

  const nivelMuralla =
    typeof edificiosDefensor?.muralla === "number"
      ? Math.max(0, Math.trunc(edificiosDefensor.muralla))
      : 0;

  const nivelAlmacen =
    typeof edificiosDefensor?.almacen === "number"
      ? Math.max(0, Math.trunc(edificiosDefensor.almacen))
      : 0;

  /*
   * La Muralla se congela al comenzar el combate.
   *
   * Su bonificación se aplica posteriormente cuando se
   * resuelva cada ataque del atacante.
   */
  const bonificacionMuralla = calcularBonificacionMuralla(nivelMuralla);

  /*
   * Se calcula para dejar explícita la congelación del valor
   * al comenzar el asedio.
   *
   * La defensa almacenada en enemigoDefensa NO incluye
   * esta bonificación, ya que se suma al resolver cada
   * ataque del atacante.
   */
  void bonificacionMuralla;

  // ============================================================
  // ESTADÍSTICAS CONGELADAS DEL COMBATE
  // ============================================================

  const jugadorHpMaximo = estadisticasAtacante.total.hpMaximo;

  const jugadorHp = jugadorHpMaximo;

  const atributosConComida = aplicarEfectoComida(
    {
      ataque: estadisticasAtacante.total.ataque,
      ataqueMagico: estadisticasAtacante.total.ataqueMagico ?? estadisticasAtacante.total.ataque,
      defensa: estadisticasAtacante.total.defensa,
      velocidad: estadisticasAtacante.total.velocidad,
      probCritico: estadisticasAtacante.total.probCritico,
    },
    expedicion.efectoComida
  );

  const jugadorAtaque = atributosConComida.ataque;
  const jugadorAtaqueMagico = atributosConComida.ataqueMagico;

  const jugadorDefensa = atributosConComida.defensa;
  const jugadorDefensaMagica = estadisticasAtacante.total.defensaMagica ?? jugadorDefensa;

  const jugadorVelocidad = atributosConComida.velocidad;

  const jugadorNivel = personajeAtacante.nivel;

  const jugadorProbCritico = atributosConComida.probCritico;
  const jugadorPrecision = estadisticasAtacante.total.precision ?? 75;
  const jugadorEvasion = estadisticasAtacante.total.evasion ?? 0;

  const jugadorDanoCritico = estadisticasAtacante.total.danoCritico;

  const capacidadCarruaje = estadisticasAtacante.total.capacidadCarruaje;

  const enemigoHpMaximo = estadisticasDefensor.total.hpMaximo;

  const enemigoHp = enemigoHpMaximo;

  const enemigoAtaque = estadisticasDefensor.total.ataque;
  const enemigoAtaqueMagico = estadisticasDefensor.total.ataqueMagico ?? enemigoAtaque;

  const enemigoDefensa = estadisticasDefensor.total.defensa;
  const enemigoDefensaMagica = estadisticasDefensor.total.defensaMagica ?? enemigoDefensa;

  const enemigoVelocidad = estadisticasDefensor.total.velocidad;

  const enemigoNivel = personajeDefensor.nivel;

  const enemigoProbCritico = estadisticasDefensor.total.probCritico;
  const enemigoPrecision = estadisticasDefensor.total.precision ?? 75;
  const enemigoEvasion = estadisticasDefensor.total.evasion ?? 0;

  const enemigoDanoCritico = estadisticasDefensor.total.danoCritico;

  // ============================================================
  // INICIATIVA
  // ============================================================

  const primerTurno = comidaOtorgaIniciativa(expedicion.efectoComida)
    ? "atacante"
    : determinarPrimerTurnoAsedio({
        velocidadAtacante: jugadorVelocidad,
        velocidadDefensor: enemigoVelocidad,
      });

  const comidaActiva = obtenerComidaTaberna(expedicion.efectoComida);
  const mensajeInicioCombate =
    primerTurno === "atacante"
      ? `⚔️ ${personajeAtacante.nombre} tiene la iniciativa y comienza el asedio.`
      : `⚔️ ${personajeDefensor.nombre} tiene la iniciativa y defiende el gremio.`;
  const logInicial = [
    ...(comidaActiva
      ? [`🍲 ${comidaActiva.nombre}: ${comidaActiva.descripcion}`]
      : []),
    mensajeInicioCombate,
  ];

  // ============================================================
  // CREAR COMBATE Y CAMBIAR ESTADOS
  // ============================================================

  const resultado = await prisma.$transaction(async (tx) => {
    /*
     * IMPORTANTE:
     *
     * Reclamamos la expedición mediante un updateMany
     * condicionado a fase = "en_viaje".
     *
     * Si otra petición (por ejemplo el botón manual y el
     * proceso automático) ya la ha procesado, count será 0
     * y no crearemos un segundo combate.
     */
    const expedicionReclamada = await tx.expedicionActiva.updateMany({
      where: {
        id: expedicion.id,
        fase: "en_viaje",
      },
      data: {
        fase: "combatiendo",
      },
    });

    if (expedicionReclamada.count !== 1) {
      const combateExistente = await tx.combateActivo.findUnique({
        where: {
          expedicionId: expedicion.id,
        },
      });

      if (combateExistente) {
        return {
          combate: combateExistente,
          yaExistia: true,
        };
      }

      throw new Error("ASEDIO_YA_PROCESADO");
    }

    /*
     * Volvemos a comprobar dentro de la transacción que
     * el defensor no haya entrado en otro combate entre
     * la lectura inicial y este punto.
     */
    const combateDefensorActual = await tx.combateActivo.findFirst({
      where: {
        tipo: "pvp",
        defensorUsuarioId: defensor.id,
        fase: "activo",
      },
    });

    if (combateDefensorActual) {
      throw new Error("DEFENSOR_YA_PARTICIPA_EN_COMBATE");
    }

    /*
     * El estado anterior se congela aquí, justo antes de
     * poner al defensor en "combatiendo".
     */
    const estadoDefensorAnterior = personajeDefensor.estado;

    const nuevoCombate = await tx.combateActivo.create({
      data: {
        expedicionId: expedicion.id,

        fase: "activo",
        ronda: 1,
        turno: primerTurno,
        ultimoTurnoEn: new Date(),

        tipo: "pvp",

        atacanteUsuarioId: atacante.id,
        defensorUsuarioId: defensor.id,
        enemigoUsuarioId: defensor.id,

        atacanteNombre: personajeAtacante.nombre,

        defensorNombre: personajeDefensor.nombre,

        atacanteClase: personajeAtacante.clase,

        atacanteSexo: personajeAtacante.sexo,

        defensorClase: personajeDefensor.clase,

        defensorSexo: personajeDefensor.sexo,

        estadoDefensorAnterior,

        capacidadCarruaje,
        murallaNivel: nivelMuralla,
        almacenNivel: nivelAlmacen,

        enemigoId: null,
        enemigoNombre: personajeDefensor.nombre,

        enemigoHp,
        enemigoHpMaximo,

        enemigoAtaque,
        enemigoAtaqueMagico,
        enemigoDefensa,
        enemigoDefensaMagica,
        enemigoVelocidad,
        enemigoProbCritico,
        enemigoDanoCritico,
        enemigoPrecision,
        enemigoEvasion,
        enemigoNivel,

        jugadorHp,
        jugadorHpMaximo,

        jugadorAtaque,
        jugadorAtaqueMagico,
        jugadorDefensa,
        jugadorDefensaMagica,
        jugadorVelocidad,
        jugadorProbCritico,
        jugadorDanoCritico,
        jugadorPrecision,
        jugadorEvasion,
        jugadorNivel,

        ganadorUsuarioId: null,
        botinResuelto: false,

        oroGanado: 0,
        experienciaGanada: 0,

        cooldowns: {},
        efectos: [],

        cooldownsDefensor: {},
        efectosDefensor: [],

        log: logInicial,
      },
    });

    await tx.personaje.update({
      where: {
        id: personajeDefensor.id,
      },
      data: {
        estado: "combatiendo",
        hpActual: enemigoHpMaximo,
        energiaActual: Math.max(0, Math.floor(estadisticasDefensor.total.energiaMaxima ?? 20)),
        manaActual: Math.max(0, Math.floor(estadisticasDefensor.total.manaMaximo ?? 10)),
      },
    });

    return {
      combate: nuevoCombate,
      yaExistia: false,
    };
  });

  return resultado.combate;
}
