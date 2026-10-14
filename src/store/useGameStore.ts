import { create } from "zustand";
import type { AccionAnimadaCombate } from "@/lib/expediciones/combate";
import type { PosicionCombate } from "@/lib/expediciones/posicion-combate";
import { calcularCosteEdificio, CosteEdificio } from "@/lib/configuracionJuego";
import type {
  EquipoPersonaje,
  ObjetoInventario,
  ReporteExpedicion,
  ResultadoExpedicion,
  SlotHabilidad,
  Edificio,
  IdEdificio,
  RecompensaMision,
  TipoMision,
} from "@/lib/tiposJuego";
import { CONFIGURACION_EDIFICIOS } from "@/lib/tiposJuego";
import {
  calcularEstadisticasPersonaje,
  calcularModificadoresEquipo,
  type DesgloseEstadisticasPersonaje,
  type ModificadoresEstadisticas,
} from "@/lib/estadisticasPersonaje";
import { calcularAtributosClase } from "@/lib/progresion/atributos-clase";
import { obtenerObjetoPorId } from "@/lib/objetos";
import { obtenerHabilidadPorId } from "@/lib/habilidades";
import { obtenerNombreObjetoConSufijo, sanitizarBonificacionesObjeto } from "@/lib/sufijosObjetos";

const EDIFICIOS_BASE: Record<IdEdificio, Omit<Edificio, "nivel">> = {
  taberna: {
    id: "taberna",
    nombre: CONFIGURACION_EDIFICIOS.taberna.nombre,
    descripcion: CONFIGURACION_EDIFICIOS.taberna.descripcion,
    nivelMax: CONFIGURACION_EDIFICIOS.taberna.nivelMax,
  },
  armeria: {
    id: "armeria",
    nombre: CONFIGURACION_EDIFICIOS.armeria.nombre,
    descripcion: CONFIGURACION_EDIFICIOS.armeria.descripcion,
    nivelMax: CONFIGURACION_EDIFICIOS.armeria.nivelMax,
  },
  herreria: {
    id: "herreria",
    nombre: CONFIGURACION_EDIFICIOS.herreria.nombre,
    descripcion: CONFIGURACION_EDIFICIOS.herreria.descripcion,
    nivelMax: CONFIGURACION_EDIFICIOS.herreria.nivelMax,
  },
  mercado: {
    id: "mercado",
    nombre: CONFIGURACION_EDIFICIOS.mercado.nombre,
    descripcion: CONFIGURACION_EDIFICIOS.mercado.descripcion,
    nivelMax: CONFIGURACION_EDIFICIOS.mercado.nivelMax,
  },
  embajada: {
    id: "embajada",
    nombre: CONFIGURACION_EDIFICIOS.embajada.nombre,
    descripcion: CONFIGURACION_EDIFICIOS.embajada.descripcion,
    nivelMax: CONFIGURACION_EDIFICIOS.embajada.nivelMax,
  },
  escuelaCombate: {
    id: "escuelaCombate",
    nombre: CONFIGURACION_EDIFICIOS.escuelaCombate.nombre,
    descripcion: CONFIGURACION_EDIFICIOS.escuelaCombate.descripcion,
    nivelMax: CONFIGURACION_EDIFICIOS.escuelaCombate.nivelMax,
  },
  muralla: {
    id: "muralla",
    nombre: CONFIGURACION_EDIFICIOS.muralla.nombre,
    descripcion: CONFIGURACION_EDIFICIOS.muralla.descripcion,
    nivelMax: CONFIGURACION_EDIFICIOS.muralla.nivelMax,
  },
  almacen: {
    id: "almacen",
    nombre: CONFIGURACION_EDIFICIOS.almacen.nombre,
    descripcion: CONFIGURACION_EDIFICIOS.almacen.descripcion,
    nivelMax: CONFIGURACION_EDIFICIOS.almacen.nivelMax,
  },
};

function construirEdificios(
  datosEdificios: unknown
): Record<IdEdificio, Edificio> {
  const edificios =
    datosEdificios && typeof datosEdificios === "object"
      ? (datosEdificios as Record<string, unknown>)
      : {};

  const nivelEdificio = (id: IdEdificio, valorPorDefecto: number) =>
    typeof edificios[id] === "number" ? edificios[id] : valorPorDefecto;

  return {
    taberna: {
      ...EDIFICIOS_BASE.taberna,
      nivel: nivelEdificio("taberna", 1),
    },
    armeria: {
      ...EDIFICIOS_BASE.armeria,
      nivel: nivelEdificio("armeria", 0),
    },
    herreria: {
      ...EDIFICIOS_BASE.herreria,
      nivel: nivelEdificio("herreria", 0),
    },
    mercado: {
      ...EDIFICIOS_BASE.mercado,
      nivel: nivelEdificio("mercado", 0),
    },
    embajada: {
      ...EDIFICIOS_BASE.embajada,
      nivel: nivelEdificio("embajada", 0),
    },
    escuelaCombate: {
      ...EDIFICIOS_BASE.escuelaCombate,
      nivel: nivelEdificio("escuelaCombate", 0),
    },
    muralla: {
      ...EDIFICIOS_BASE.muralla,
      nivel: nivelEdificio("muralla", 0),
    },
    almacen: {
      ...EDIFICIOS_BASE.almacen,
      nivel: nivelEdificio("almacen", 0),
    },
  };
}

export interface HabilidadPersonaje {
  habilidadId: string;
  nivel: number;
  slot: SlotHabilidad | null;
}

export interface Personaje {
  // Datos persistentes
  id?: string;
  nombre: string;
  clase: string;
  profesionActivaId: string;
  sexo: "chico" | "chica";
  posicionCombate: PosicionCombate;
  fuerza: number;
  agilidad: number;
  vitalidad: number;
  inteligencia: number;
  destreza: number;
  suerte: number;
  energiaActual: number;
  manaActual: number;
  puntosAtributoDisponibles: number;
  nivelJob: number;
  experienciaJob: number;
  puntosHabilidadDisponibles: number;
  hpActual: number;
  estado: "ocioso" | "de_viaje" | "descansando" | "combatiendo";
  comidaPreparada: string | null;
  nivel: number;
  experiencia: number;

  velocidadMejoras: number;
  capacidadCarruajeMejoras: number;

  habilidades: HabilidadPersonaje[];

  inventario: ObjetoInventario[];
  equipo: EquipoPersonaje;

  // Desglose de procedencia calculado junto con las estadísticas.
  desgloseEstadisticas?: Pick<
    DesgloseEstadisticasPersonaje,
    "base" | "baseSinAtributos" | "mejoras" | "pasivas" | "equipo" | "combate" | "atributos" | "total"
  > & {
    pasivasPorHabilidad: {
      habilidadId: string;
      nombre: string;
      modificadores: ModificadoresEstadisticas;
    }[];
    equipoPorObjeto: {
      ranura: string;
      nombre: string;
      modificadores: ModificadoresEstadisticas;
    }[];
  };

  // Estadísticas calculadas
  hpMaximo: number;
  ataque: number;
  defensa: number;
  velocidad: number;
  capacidadCarruaje: number;
  probCritico: number;
  danoCritico: number;
  ataqueMagico: number;
  defensaMagica: number;
  precision: number;
  evasion: number;
  energiaMaxima: number;
  manaMaximo: number;
  regeneracionEnergiaPorTurno: number;
  regeneracionManaPorTurno: number;
}

export interface DatosReclutamiento {
  nombre: string;
  clase: string;
  sexo: "chico" | "chica";
}

export interface CombateActivo {
  id: string;
  version: number;

  expedicionId: string;

  fase: "activo" | "victoria" | "derrota" | "huida";
  ronda: number;
  turno: "atacante" | "defensor";
  jugadorPosicion?: PosicionCombate;
  enemigoPosicion?: PosicionCombate;
  rolUsuario?: "atacante" | "defensor";
  tipo: TipoMision;

  jugadorHp: number;
  jugadorHpMaximo: number;
  jugadorAtaque: number;
  jugadorDefensa: number;
  jugadorVelocidad: number;
  jugadorProbCritico: number;
  jugadorDanoCritico: number;
  jugadorPrecision?: number;
  jugadorEvasion?: number;
  jugadorNivel: number;

  enemigoHp: number;
  enemigoHpMaximo: number;
  enemigoAtaque: number;
  enemigoDefensa: number;
  enemigoVelocidad: number;
  enemigoProbCritico: number;
  enemigoDanoCritico: number;
  enemigoPrecision?: number;
  enemigoEvasion?: number;
  enemigoNivel: number;

  atacanteUsuarioId?: string | null;
  defensorUsuarioId?: string | null;
  atacanteNombre?: string | null;
  defensorNombre?: string | null;
  atacanteClase?: string | null;
  atacanteSexo?: string | null;
  defensorClase?: string | null;
  defensorSexo?: string | null;
  enemigoId?: string | null;
  enemigoNombre?: string | null;
  murallaNivel?: number | null;
  almacenNivel?: number | null;

  ganadorUsuarioId?: string | null;
  botinResuelto: boolean;

  oroGanado: number;
  experienciaGanada: number;

  cooldowns: Record<string, number>;
  efectos: unknown[];

  cooldownsDefensor: Record<string, number>;
  efectosDefensor: unknown[];

  ultimoTurnoEn: string;

  log: string[];

  creado: string;
  actualizado: string;

  estadoDefensorAnterior?: string | null;
  ultimaAccion?: AccionAnimadaCombate | null;
}
export type CombateVisible = CombatePve | CombateActivo;

export interface CombatePve {
  id: string;
  version: number;

  expedicionId: string;

  fase: "activo" | "victoria" | "derrota" | "huida";
  ronda: number;
  turno: "jugador" | "enemigo";
  jugadorPosicion?: PosicionCombate;
  enemigoPosicion?: PosicionCombate;
  tipo: TipoMision;

  jugadorHp: number;
  jugadorHpMaximo: number;
  jugadorAtaque: number;
  jugadorDefensa: number;
  jugadorVelocidad: number;
  jugadorProbCritico: number;
  jugadorDanoCritico: number;
  jugadorNivel: number;

  enemigoHp: number;
  enemigoHpMaximo: number;
  enemigoAtaque: number;
  enemigoDefensa: number;
  enemigoVelocidad: number;
  enemigoProbCritico: number;
  enemigoDanoCritico: number;
  enemigoNivel: number;

  enemigoId?: string | null;
  enemigoNombre?: string | null;

  ganadorUsuarioId?: string | null;

  oroGanado: number;
  experienciaGanada: number;

  cooldowns: Record<string, number>;
  efectos: unknown[];
  efectosDefensor?: unknown[];

  log: string[];

  creado: string;
  actualizado: string;
}

export interface ExpedicionActiva {
  id?: string;
  misionId: string;
  enemigoId?: string | null;
  nombre: string;
  recompensa: RecompensaMision;
  fechaLlegada: string;
  fechaSalida: string;
  dificultad: number;
  tipo: TipoMision;
  fase: "en_viaje" | "combatiendo" | "regresando";
  resultadoFinal?: ResultadoExpedicion | null;
  efectoComida?: string | null;
  hpPerdido: number;
  experienciaGanada: number;
  objetivoId?: string | null;
  destinoCoords: { lat: number; lng: number };
  combateActivo?: CombateVisible  | null;
}

export interface GameState {
  nombreGremio: string;
  oro: number;
  madera: number;
  piedra: number;
  metal: number;
  personaje: Personaje | null;
  expedicionActiva: ExpedicionActiva | null;
  edificios: Record<string, Edificio>;
  baseCoords: { lat: number; lng: number } | null;
  isLoading: boolean;
  sesionActiva: boolean;
  ultimaMisionElite: string | null;

  cargarJugador: () => Promise<void>;
  reclutarPersonaje: (personaje: DatosReclutamiento) => Promise<void>;

  llegarExpedicion: () => Promise<boolean>;
  completarExpedicion: () => Promise<ReporteExpedicion | null>;
  accionCombate: (
    accion: "atacar" | "usar_habilidad" | "usar_objeto",
    payload?: string,
    modo?: "pve" | "pvp"
  ) => Promise<AccionAnimadaCombate | null>;
  cancelarExpedicion: () => Promise<boolean>;

  prepararComida: (comidaId: string) => Promise<{ exito: boolean; error?: string }>;

  mejorarAtributo: (
    atributo: keyof Pick<Personaje, "velocidad" | "capacidadCarruaje">
  ) => Promise<boolean>;

  mejorarEdificio: (idEdificio: IdEdificio) => Promise<boolean>;
  obtenerCosteMejora: (idEdificio: IdEdificio) => CosteEdificio;
  establecerBase: (coords: { lat: number; lng: number }) => Promise<void>;

  comprarRecurso: (
    recurso: "madera" | "piedra" | "metal",
    cantidad: number
  ) => Promise<boolean>;
}

async function ejecutarAccion(
  accion: string,
  datos: Record<string, unknown> = {}
) {
  const respuesta = await fetch("/api/jugador/acciones", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accion, ...datos }),
  });
  const resultado = await respuesta.json();
  if (!respuesta.ok)
    throw new Error(resultado.error || "No se pudo completar la acción.");
  return resultado;
}

function construirObjetoInventario(
  datosObjeto: unknown
): ObjetoInventario | null {
  if (!datosObjeto || typeof datosObjeto !== "object") {
    return null;
  }

  const datos = datosObjeto as Record<string, unknown>;

  if (
    typeof datos.id !== "string" ||
    typeof datos.objetoId !== "string" ||
    typeof datos.cantidad !== "number" ||
    typeof datos.nivelMejora !== "number"
  ) {
    return null;
  }

  const objeto = obtenerObjetoPorId(datos.objetoId);

  if (!objeto) {
    console.warn(`Objeto no encontrado: ${datos.objetoId}`);
    return null;
  }

  const sufijoId = typeof datos.sufijoId === "string" ? datos.sufijoId : null;
  return {
    id: datos.id,
    objetoId: datos.objetoId,
    cantidad: datos.cantidad,
    nivelMejora: datos.nivelMejora,
    sufijoId,
    bonificaciones: sanitizarBonificacionesObjeto(datos.bonificaciones),
    objeto: { ...objeto, nombre: obtenerNombreObjetoConSufijo(objeto.nombre, sufijoId) },
  };
}

function construirPersonaje(datosPersonaje: unknown): Personaje | null {
  if (!datosPersonaje || typeof datosPersonaje !== "object") {
    return null;
  }

  const datos = datosPersonaje as Record<string, unknown>;

  if (
    typeof datos.nombre !== "string" ||
    typeof datos.clase !== "string" ||
    typeof datos.hpActual !== "number" ||
    typeof datos.nivel !== "number"
  ) {
    return null;
  }

  const habilidades: HabilidadPersonaje[] = Array.isArray(datos.habilidades)
    ? datos.habilidades
        .filter(
          (habilidad): habilidad is Record<string, unknown> =>
            !!habilidad && typeof habilidad === "object"
        )
        .filter((habilidad) => typeof habilidad.habilidadId === "string")
        .map((habilidad) => ({
          habilidadId: habilidad.habilidadId as string,
          nivel: typeof habilidad.nivel === "number" ? Math.max(1, Math.floor(habilidad.nivel)) : 1,
          slot:
            typeof habilidad.slot === "string"
              ? (habilidad.slot as SlotHabilidad)
              : null,
        }))
    : [];

  const habilidadesPasivasEquipadas = habilidades
    .filter(
      (habilidad) =>
        habilidad.slot === "pasiva_1" || habilidad.slot === "pasiva_2"
    )
    .map((habilidad) => ({ habilidadId: habilidad.habilidadId, nivel: habilidad.nivel }));

  const inventario: ObjetoInventario[] =
    datos.inventario &&
    typeof datos.inventario === "object" &&
    !Array.isArray(datos.inventario)
      ? (() => {
          const datosInventario = datos.inventario as Record<string, unknown>;

          if (!Array.isArray(datosInventario.objetos)) {
            return [];
          }

          return datosInventario.objetos
            .map(construirObjetoInventario)
            .filter((objeto): objeto is ObjetoInventario => objeto !== null);
        })()
      : [];

  const datosEquipo =
    datos.equipoEquipado &&
    typeof datos.equipoEquipado === "object" &&
    !Array.isArray(datos.equipoEquipado)
      ? (datos.equipoEquipado as Record<string, unknown>)
      : {};

  const buscarObjetoInventario = (valor: unknown): ObjetoInventario | null => {
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
      return null;
    }

    const datosObjeto = valor as Record<string, unknown>;

    if (typeof datosObjeto.id !== "string") {
      return null;
    }

    return inventario.find((objeto) => objeto.id === datosObjeto.id) ?? null;
  };

  const equipo: EquipoPersonaje = {
    arma: buscarObjetoInventario(datosEquipo.arma),
    manoSecundaria: buscarObjetoInventario(datosEquipo.manoSecundaria),
    casco: buscarObjetoInventario(datosEquipo.casco),
    armadura: buscarObjetoInventario(datosEquipo.armadura),
    pantalones: buscarObjetoInventario(datosEquipo.pantalones),
    botas: buscarObjetoInventario(datosEquipo.botas),
    guantes: buscarObjetoInventario(datosEquipo.guantes),
    accesorio: buscarObjetoInventario(datosEquipo.accesorio),
    anillo1: buscarObjetoInventario(datosEquipo.anillo1),
    anillo2: buscarObjetoInventario(datosEquipo.anillo2),
  };

  const profesionActivaId =
    typeof datos.profesionActivaId === "string" ? datos.profesionActivaId : "novato";
  const modificadoresEquipo = calcularModificadoresEquipo(equipo, profesionActivaId);
  const progresosClase = Array.isArray(datos.progresosClase)
    ? datos.progresosClase.filter((progreso): progreso is Record<string, unknown> => !!progreso && typeof progreso === "object")
    : [];
  const progresoActivo = progresosClase.find((progreso) => progreso.claseId === profesionActivaId && progreso.desbloqueada === true);
  const nivelJob = typeof progresoActivo?.nivelJob === "number" ? progresoActivo.nivelJob : 1;
  const atributos = calcularAtributosClase(profesionActivaId, datos.nivel, nivelJob);

  const datosEstadisticas = {
    clase: datos.clase,
    profesionActivaId,
    nivel: datos.nivel,
    nivelJob,
    progresosClase: progresosClase.map((progreso) => ({
      claseId: String(progreso.claseId),
      nivelJob: typeof progreso.nivelJob === "number" ? progreso.nivelJob : 1,
      desbloqueada: progreso.desbloqueada === true,
    })),
    ...atributos,
    velocidadMejoras:
      typeof datos.velocidadMejoras === "number" ? datos.velocidadMejoras : 0,
    capacidadCarruajeMejoras:
      typeof datos.capacidadCarruajeMejoras === "number"
        ? datos.capacidadCarruajeMejoras
        : 0,
  };

  const estadisticas = calcularEstadisticasPersonaje(
    datosEstadisticas,
    habilidadesPasivasEquipadas,
    modificadoresEquipo
  );

  const pasivasPorHabilidad = habilidadesPasivasEquipadas.map((habilidad) => ({
    habilidadId: habilidad.habilidadId,
    nombre: obtenerHabilidadPorId(habilidad.habilidadId)?.nombre ?? habilidad.habilidadId,
    modificadores: calcularEstadisticasPersonaje(
      datosEstadisticas,
      [habilidad],
      modificadoresEquipo
    ).pasivas,
  }));

  const ranurasConNombre = [
    { clave: "arma", nombre: "Arma" },
    { clave: "manoSecundaria", nombre: "Mano secundaria" },
    { clave: "casco", nombre: "Casco" },
    { clave: "armadura", nombre: "Armadura" },
    { clave: "pantalones", nombre: "Pantalones" },
    { clave: "botas", nombre: "Botas" },
    { clave: "guantes", nombre: "Guantes" },
    { clave: "accesorio", nombre: "Accesorio" },
    { clave: "anillo1", nombre: "Anillo I" },
    { clave: "anillo2", nombre: "Anillo II" },
  ] as const;

  const equipoPorObjeto = ranurasConNombre.flatMap(({ clave, nombre }) => {
    const pieza = equipo[clave];
    if (!pieza) return [];

    const equipoParcial = {
      arma: null,
      manoSecundaria: null,
      casco: null,
      armadura: null,
      pantalones: null,
      botas: null,
      guantes: null,
      accesorio: null,
      anillo1: null,
      anillo2: null,
      [clave]: pieza,
    } as EquipoPersonaje;

    return [{
      ranura: nombre,
      nombre: pieza.objeto.nombre,
      modificadores: calcularModificadoresEquipo(equipoParcial, profesionActivaId),
    }];
  });

  return {
    id: typeof datos.id === "string" ? datos.id : undefined,
    nombre: datos.nombre,
    clase: datos.clase,
    profesionActivaId,
    sexo: datos.sexo === "chica" ? "chica" : "chico",
    posicionCombate: typeof datos.posicionCombate === "string"
      ? (datos.posicionCombate as PosicionCombate)
      : "centro",
    ...atributos,
    energiaActual: Math.min(
      typeof datos.energiaActual === "number" ? datos.energiaActual : (estadisticas.total.energiaMaxima ?? 20),
      estadisticas.total.energiaMaxima ?? 20
    ),
    manaActual: Math.min(
      typeof datos.manaActual === "number" ? datos.manaActual : (estadisticas.total.manaMaximo ?? 10),
      estadisticas.total.manaMaximo ?? 10
    ),
    puntosAtributoDisponibles:
      typeof datos.puntosAtributoDisponibles === "number" ? datos.puntosAtributoDisponibles : 0,
    nivelJob: typeof progresoActivo?.nivelJob === "number" ? progresoActivo.nivelJob : 1,
    experienciaJob: typeof progresoActivo?.experienciaJob === "number" ? progresoActivo.experienciaJob : 0,
    puntosHabilidadDisponibles:
      typeof progresoActivo?.puntosHabilidadDisponibles === "number"
        ? progresoActivo.puntosHabilidadDisponibles
        : 0,
    hpActual: Math.min(datos.hpActual, estadisticas.total.hpMaximo),
    hpMaximo: estadisticas.total.hpMaximo,
    desgloseEstadisticas: {
      base: estadisticas.base,
      baseSinAtributos: estadisticas.baseSinAtributos,
      mejoras: estadisticas.mejoras,
      pasivas: estadisticas.pasivas,
      equipo: estadisticas.equipo,
      combate: estadisticas.combate,
      atributos: estadisticas.atributos,
      total: estadisticas.total,
      pasivasPorHabilidad,
      equipoPorObjeto,
    },
    estado:
      datos.estado === "de_viaje" ||
      datos.estado === "descansando" ||
      datos.estado === "combatiendo"
        ? datos.estado
        : "ocioso",
    ataque: estadisticas.total.ataque,
    defensa: estadisticas.total.defensa,
    velocidad: estadisticas.total.velocidad,
    capacidadCarruaje: estadisticas.total.capacidadCarruaje,
    probCritico: estadisticas.total.probCritico,
    danoCritico: estadisticas.total.danoCritico,
    ataqueMagico: estadisticas.total.ataqueMagico ?? 1,
    defensaMagica: estadisticas.total.defensaMagica ?? 0,
    precision: estadisticas.total.precision ?? 75,
    evasion: estadisticas.total.evasion ?? 0,
    energiaMaxima: estadisticas.total.energiaMaxima ?? 20,
    manaMaximo: estadisticas.total.manaMaximo ?? 10,
    regeneracionEnergiaPorTurno: estadisticas.total.regeneracionEnergiaPorTurno ?? 0,
    regeneracionManaPorTurno: estadisticas.total.regeneracionManaPorTurno ?? 0,
    velocidadMejoras:
      typeof datos.velocidadMejoras === "number" ? datos.velocidadMejoras : 0,
    capacidadCarruajeMejoras:
      typeof datos.capacidadCarruajeMejoras === "number"
        ? datos.capacidadCarruajeMejoras
        : 0,
    habilidades,
    inventario,
    equipo,
    comidaPreparada: typeof datos.comidaPreparada === "string" ? datos.comidaPreparada : null,
    nivel: datos.nivel,
    experiencia: typeof datos.experiencia === "number" ? datos.experiencia : 0,
  };
}

function aplicarDatosJugador(
  set: (state: Partial<GameState>) => void,
  datos: Record<string, unknown>
) {
  set({
    nombreGremio: typeof datos.nombre === "string" ? datos.nombre : "",
    oro: datos.oro as number,
    madera: datos.madera as number,
    piedra: datos.piedra as number,
    metal: datos.metal as number,
    personaje: construirPersonaje(datos.personaje),
    baseCoords: (datos.baseCoords as GameState["baseCoords"]) || null,
    expedicionActiva:
      (datos.expedicionActiva as ExpedicionActiva | null) || null,
    ultimaMisionElite: (datos.ultimaMisionElite as string | null) || null,
    edificios: construirEdificios(datos.edificios),
  });
}

// Evita que una respuesta de /api/jugador desactualizada sobreescriba una más reciente.
let solicitudJugadorId = 0;

export const useGameStore = create<GameState>((set, get) => ({
  nombreGremio: "",
  oro: 0,
  madera: 0,
  piedra: 0,
  metal: 0,
  personaje: null,
  expedicionActiva: null,
  edificios: {
    taberna: { ...EDIFICIOS_BASE.taberna, nivel: 1 },
    armeria: { ...EDIFICIOS_BASE.armeria, nivel: 0 },
    herreria: { ...EDIFICIOS_BASE.herreria, nivel: 0 },
    mercado: { ...EDIFICIOS_BASE.mercado, nivel: 0 },
    embajada: { ...EDIFICIOS_BASE.embajada, nivel: 0 },
    escuelaCombate: { ...EDIFICIOS_BASE.escuelaCombate, nivel: 0 },
  },
  baseCoords: null,
  isLoading: true,
  sesionActiva: false,
  ultimaMisionElite: null,

  cargarJugador: async () => {
    const idSolicitud = ++solicitudJugadorId;
    try {
      const respuesta = await fetch("/api/jugador", {
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      });
      const datos = await respuesta.json();

      // Ignora respuestas que lleguen desordenadas si hubo otra llamada más reciente.
      if (idSolicitud !== solicitudJugadorId) return;

      if (respuesta.status === 401) {
        set({
          isLoading: false,
          sesionActiva: false,
          personaje: null,
          baseCoords: null,
        });
        return;
      }

      if (!datos) {
        set({ isLoading: false });
        return;
      }

      set({
        sesionActiva: true,
        nombreGremio: typeof datos.nombre === "string" ? datos.nombre : "",
        oro: datos.oro as number,
        madera: datos.madera as number,
        piedra: datos.piedra as number,
        metal: datos.metal as number,
        edificios: construirEdificios(datos.edificios),
        personaje: construirPersonaje(datos.personaje),
        baseCoords: (datos.baseCoords as GameState["baseCoords"]) || null,
        expedicionActiva:
          (datos.expedicionActiva as ExpedicionActiva | null) || null,
        ultimaMisionElite: (datos.ultimaMisionElite as string | null) || null,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error al cargar la partida:", error);
      set({ isLoading: false });
    }
  },

  reclutarPersonaje: async (nuevoPersonaje) => {
    const datos = await ejecutarAccion("reclutar", {
      nombre: nuevoPersonaje.nombre,
      clase: nuevoPersonaje.clase,
      sexo: nuevoPersonaje.sexo,
    });
    aplicarDatosJugador(set, datos);
  },

  llegarExpedicion: async () => {
    try {
      const respuesta = await fetch("/api/expediciones/llegar", {
        method: "POST",
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error || "No se pudo iniciar el combate.");
      }

      if (datos.usuario) {
        aplicarDatosJugador(set, datos.usuario);
      }

      return true;
    } catch (error) {
      console.error("Error al iniciar el combate:", error);
      return false;
    }
  },

  accionCombate: async (
    accion: "atacar" | "usar_habilidad" | "usar_objeto",
    payload?: string,
    modo: "pve" | "pvp" = "pve"
  ) => {
    try {
      const definicionHabilidad = accion === "usar_habilidad" && payload
        ? obtenerHabilidadPorId(payload)
        : null;
      const objetivo = accion === "usar_objeto"
        ? "propio"
        : accion === "usar_habilidad" && definicionHabilidad?.efecto !== "dano"
          ? "propio"
          : "oponente";
      const respuesta = await fetch(`/api/combate/${modo}/accion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accion,
          objetivo,
          ...(accion === "usar_habilidad" && payload ? { habilidadId: payload } : {}),
          ...(accion === "usar_objeto" && payload ? { objetoInventarioId: payload } : {}),
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        if (
          respuesta.status === 409 &&
          datos.error ===
            "El combate ha cambiado mientras se procesaba la acción. La acción ya no es válida."
        ) {
          await get().cargarJugador();
        }

        throw new Error(datos.error || "No se pudo ejecutar la acción.");
      }

      if (datos.usuario) {
        aplicarDatosJugador(set, datos.usuario);
      } else if (datos.combate) {
        set((state) => ({
          expedicionActiva: state.expedicionActiva
            ? {
                ...state.expedicionActiva,
                combateActivo: datos.combate as CombateVisible,
              }
            : null,
        }));
      }

      // Energía y Maná cambian en cada acción; recargamos el estado autoritativo
      // para que los costes y la regeneración se reflejen inmediatamente en la UI.
      await get().cargarJugador();

      return (datos.accion as AccionAnimadaCombate) || null;
    } catch (error) {
      console.error("Error en acción de combate:", error);
      return null;
    }
  },

  completarExpedicion: async () => {
    try {
      const respuesta = await fetch("/api/expediciones/completar", {
        method: "POST",
      });

      const datos = await respuesta.json();

      if (!respuesta.ok)
        throw new Error(datos.error || "No se pudo completar la expedición.");

      aplicarDatosJugador(set, datos.usuario);

      return datos.resultado as ReporteExpedicion;
    } catch (error) {
      console.error(error);
      return null;
    }
  },

  cancelarExpedicion: async () => {
    try {
      const respuesta = await fetch("/api/expediciones/cancelar", {
        method: "POST",
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error || "No se pudo iniciar el regreso.");
      }

      aplicarDatosJugador(set, datos.usuario);

      return true;
    } catch (error) {
      console.error("Error al cancelar expedición:", error);
      return false;
    }
  },

  prepararComida: async (comidaId) => {
    try {
      const datos = await ejecutarAccion("prepararComida", { comidaId });
      aplicarDatosJugador(set, datos);
      return { exito: true };
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "No se pudo preparar la comida.";
      console.error("Error al preparar comida:", error);
      return { exito: false, error: mensaje };
    }
  },

  mejorarAtributo: async (atributo) => {
    try {
      const datos = await ejecutarAccion("mejorarAtributo", { atributo });
      aplicarDatosJugador(set, datos);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  },

  obtenerCosteMejora: (idEdificio): CosteEdificio => {
    const edificio = get().edificios[idEdificio];

    if (!edificio) {
      return {
        oro: Number.POSITIVE_INFINITY,
        madera: Number.POSITIVE_INFINITY,
        piedra: Number.POSITIVE_INFINITY,
        metal: Number.POSITIVE_INFINITY,
      };
    }

    return calcularCosteEdificio(idEdificio, edificio.nivel);
  },

  mejorarEdificio: async (idEdificio) => {
    try {
      const datos = await ejecutarAccion("mejorarEdificio", { idEdificio });
      aplicarDatosJugador(set, datos);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  },

  establecerBase: async (coords) => {
    const datos = await ejecutarAccion("establecerBase", { coords });
    aplicarDatosJugador(set, datos);
  },

  comprarRecurso: async (recurso, cantidad) => {
    try {
      const respuesta = await fetch("/api/mercado/comprar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recurso,
          cantidad,
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error || "No se pudo realizar la compra.");
      }

      aplicarDatosJugador(set, datos.usuario);

      return true;
    } catch (error) {
      console.error("Error al comprar en el mercado:", error);
      return false;
    }
  },
}));
