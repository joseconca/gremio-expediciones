import { create } from "zustand";
import type { ResultadoCombate } from "@/lib/resolucionCombate";
import { CONFIGURACION_EDIFICIOS } from "@/lib/configuracionJuego";

const EDIFICIOS_BASE: Record<string, Omit<Edificio, "nivel">> = {
  taberna: {
    id: "taberna",
    nombre: CONFIGURACION_EDIFICIOS.taberna.nombre,
    costeBase: CONFIGURACION_EDIFICIOS.taberna.costeConstruccion,
    descripcion: CONFIGURACION_EDIFICIOS.taberna.descripcion,
    nivelMax: CONFIGURACION_EDIFICIOS.taberna.nivelMax,
  },
  herreria: {
    id: "herreria",
    nombre: CONFIGURACION_EDIFICIOS.herreria.nombre,
    costeBase: CONFIGURACION_EDIFICIOS.herreria.costeConstruccion,
    descripcion: CONFIGURACION_EDIFICIOS.herreria.descripcion,
    nivelMax: CONFIGURACION_EDIFICIOS.herreria.nivelMax,
  },
  mercado: {
    id: "mercado",
    nombre: CONFIGURACION_EDIFICIOS.mercado.nombre,
    costeBase: CONFIGURACION_EDIFICIOS.mercado.costeConstruccion,
    descripcion: CONFIGURACION_EDIFICIOS.mercado.descripcion,
    nivelMax: CONFIGURACION_EDIFICIOS.mercado.nivelMax,
  },
  embajada: {
    id: "embajada",
    nombre: CONFIGURACION_EDIFICIOS.embajada.nombre,
    costeBase: CONFIGURACION_EDIFICIOS.embajada.costeConstruccion,
    descripcion: CONFIGURACION_EDIFICIOS.embajada.descripcion,
    nivelMax: CONFIGURACION_EDIFICIOS.embajada.nivelMax,
  },
};

export interface Personaje {
  id?: string;
  nombre: string;
  clase: string;
  sexo: "chico" | "chica";
  hpActual: number;
  hpMaximo: number;
  estado: "ocioso" | "de_viaje" | "descansando";
  ataque: number;
  defensa: number;
  velocidad: number;
  capacidadCarruaje: number;
  regeneracionDeVida: number;
  nivel: number;
  experiencia: number;
}

export interface Edificio {
  id: string;
  nombre: string;
  nivel: number;
  costeBase: number;
  descripcion: string;
  nivelMax: number;
}

export interface ExpedicionActiva {
  idMision: number;
  nombre: string;
  recompensa: number;
  fechaLlegada: string;
  fechaSalida?: string;
  dificultad: number;
  fase?: string;
  destinoCoords: { lat: number; lng: number };
}

export interface InfoCura {
  coste: number;
  hpCurado: number;
  aTope: boolean;
}

export interface GameState {
  oro: number;
  personaje: Personaje | null;
  expedicionActiva: ExpedicionActiva | null;
  edificios: Record<string, Edificio>;
  baseCoords: { lat: number; lng: number } | null;
  isLoading: boolean;
  sesionActiva: boolean;
  horaMisiones: number;
  misionesCompletadasEstaHora: number;

  cargarJugador: () => Promise<void>;
  reclutarPersonaje: (personaje: Personaje) => Promise<void>;
  iniciarExpedicion: (expedicion: ExpedicionActiva) => void;
  completarExpedicion: () => Promise<ResultadoCombate | null>;

  calcularCosteCura: () => InfoCura;
  curarPersonaje: () => Promise<boolean>;
  aplicarRegeneracion: () => void;

  mejorarAtributo: (
    atributo: keyof Pick<
      Personaje,
      "ataque" | "defensa" | "velocidad" | "capacidadCarruaje"
    >,
    coste: number,
    cantidad: number
  ) => Promise<boolean>;
  mejorarEdificio: (idEdificio: string) => Promise<boolean>;
  obtenerCosteMejora: (idEdificio: string) => number;
  establecerBase: (coords: { lat: number; lng: number }) => Promise<void>;
}

async function ejecutarAccion(accion: string, datos: Record<string, unknown> = {}) {
  const respuesta = await fetch("/api/jugador/acciones", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accion, ...datos }),
  });
  const resultado = await respuesta.json();
  if (!respuesta.ok) throw new Error(resultado.error || "No se pudo completar la acción.");
  return resultado;
}

function aplicarDatosJugador(
  set: (state: Partial<GameState>) => void,
  datos: Record<string, unknown>
) {
  const edificios = (datos.edificios as Record<string, unknown> | undefined) || {};
  const nivelEdificio = (id: string, valorPorDefecto: number) =>
    typeof edificios[id] === "number" ? edificios[id] as number : valorPorDefecto;
  set({
    oro: datos.oro as number,
    personaje: (datos.personaje as Personaje | null) || null,
    baseCoords: (datos.baseCoords as GameState["baseCoords"]) || null,
    expedicionActiva: (datos.expedicionActiva as ExpedicionActiva | null) || null,
    edificios: {
      taberna: { ...EDIFICIOS_BASE.taberna, nivel: nivelEdificio("taberna", 1) },
      herreria: { ...EDIFICIOS_BASE.herreria, nivel: nivelEdificio("herreria", 0) },
      mercado: { ...EDIFICIOS_BASE.mercado, nivel: nivelEdificio("mercado", 0) },
      embajada: { ...EDIFICIOS_BASE.embajada, nivel: nivelEdificio("embajada", 0) },
    },
  });
}

// Evita que una respuesta de /api/jugador desactualizada sobreescriba una más reciente.
let solicitudJugadorId = 0;

export const useGameStore = create<GameState>((set, get) => ({
  oro: 0,
  personaje: null,
  expedicionActiva: null,
  edificios: {
    taberna: { ...EDIFICIOS_BASE.taberna, nivel: 1 },
    herreria: { ...EDIFICIOS_BASE.herreria, nivel: 0 },
    mercado: { ...EDIFICIOS_BASE.mercado, nivel: 0 },
    embajada: { ...EDIFICIOS_BASE.embajada, nivel: 0 },
  },
  baseCoords: null,
  isLoading: true,
  sesionActiva: false,
  horaMisiones: 0,
  misionesCompletadasEstaHora: 0,

  registrarMisionCompletada: () => {
    const horaActual = Math.floor(Date.now() / 3600000); // Horas desde 1970
    set((state) => {
      if (state.horaMisiones !== horaActual) {
        return { horaMisiones: horaActual, misionesCompletadasEstaHora: 1 };
      }
      return { misionesCompletadasEstaHora: state.misionesCompletadasEstaHora + 1 };
    });
  },

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
        set({ isLoading: false, sesionActiva: false, personaje: null, baseCoords: null });
        return;
      }

      if (!datos) {
        set({ isLoading: false });
        return;
      }

      const edificiosCompletos = {
        taberna: {
          ...EDIFICIOS_BASE.taberna,
          nivel: datos.edificios?.taberna ?? 1,
        },
        herreria: {
          ...EDIFICIOS_BASE.herreria,
          nivel: datos.edificios?.herreria ?? 0,
        },
        mercado: {
          ...EDIFICIOS_BASE.mercado,
          nivel: datos.edificios?.mercado ?? 0,
        },
        embajada: {
          ...EDIFICIOS_BASE.embajada,
          nivel: datos.edificios?.embajada ?? 0,
        },
      };

      /*let expedicionCargada = null;
      if (datos.expedicionActiva) {
        expedicionCargada = {
          idMision: datos.expedicionActiva.misionId,
          nombre: datos.expedicionActiva.nombre,
          recompensa: datos.expedicionActiva.recompensa,
          dificultad: datos.expedicionActiva.dificultad,
          fechaLlegada: datos.expedicionActiva.fechaLlegada,
          destinoCoords: datos.expedicionActiva.destinoCoords,
        };
      }*/

      set({
        sesionActiva: true,
        oro: datos.oro as number,
        edificios: edificiosCompletos,
        personaje: datos.personaje,
        baseCoords: (datos.baseCoords as GameState["baseCoords"]) || null,
        expedicionActiva: (datos.expedicionActiva as ExpedicionActiva | null) || null,
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

  iniciarExpedicion: (expedicion) => {
    set((state) => ({
      expedicionActiva: expedicion,
      personaje: state.personaje
        ? { ...state.personaje, estado: "de_viaje" }
        : null,
    }));
  },

  completarExpedicion: async () => {
    try {
      const respuesta = await fetch("/api/expediciones/completar", { method: "POST" });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error || "No se pudo completar la expedición.");
      aplicarDatosJugador(set, datos.usuario);
      return datos.resultado as ResultadoCombate;
    } catch (error) {
      console.error(error);
      return null;
    }
  },

  calcularCosteCura: () => {
    const state = get();
    const personaje = state.personaje;
    if (!personaje || personaje.hpActual >= personaje.hpMaximo)
      return { coste: 0, hpCurado: 0, aTope: true };

    const CURA_POR_ORO = 2;
    const multiplicador = 1 + (state.edificios.taberna.nivel - 1) * 0.1;
    const curaEfectivaPorOro = CURA_POR_ORO * multiplicador;

    const hpFaltante = personaje.hpMaximo - personaje.hpActual;
    const costeMaximo = Math.ceil(hpFaltante / curaEfectivaPorOro);

    if (state.oro >= costeMaximo) {
      return { coste: costeMaximo, hpCurado: hpFaltante, aTope: true };
    } else {
      return {
        coste: state.oro,
        hpCurado: Math.floor(state.oro * curaEfectivaPorOro),
        aTope: false,
      };
    }
  },

  curarPersonaje: async () => {
    try {
      const datos = await ejecutarAccion("curar");
      aplicarDatosJugador(set, datos);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  },

  aplicarRegeneracion: () => {
    const state = get();
    const personaje = state.personaje;
    
    if (!personaje || personaje.estado === "de_viaje" || personaje.hpActual >= personaje.hpMaximo) return;

    const nuevoHp = Math.min(personaje.hpMaximo, personaje.hpActual + personaje.regeneracionDeVida);
    
    set({
      personaje: {
        ...personaje,
        hpActual: nuevoHp,
        estado: nuevoHp >= personaje.hpMaximo ? "ocioso" : personaje.estado,
      }
    });
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

  obtenerCosteMejora: (idEdificio) => {
    const ed = get().edificios[idEdificio];
    const configuracion = CONFIGURACION_EDIFICIOS[idEdificio as keyof typeof CONFIGURACION_EDIFICIOS];
    if (!configuracion) return Number.POSITIVE_INFINITY;
    return ed.nivel === 0 ? configuracion.costeConstruccion : configuracion.costeNivel2;
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
}));
