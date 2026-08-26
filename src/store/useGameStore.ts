import { create } from "zustand";

const EDIFICIOS_BASE: Record<string, Omit<Edificio, "nivel">> = {
  taberna: {
    id: "taberna",
    nombre: "Taberna",
    costeBase: 100,
    descripcion: "Cura a tu personaje",
    nivelMax: 1,
  },
  herreria: {
    id: "herreria",
    nombre: "Herrería",
    costeBase: 200,
    descripcion: "Mejora atributos",
    nivelMax: 3,
  },
  mercado: {
    id: "mercado",
    nombre: "Mercado",
    costeBase: 500,
    descripcion: "Comercio",
    nivelMax: 2,
  },
};

export interface Personaje {
  id?: string;
  nombre: string;
  clase: string;
  hpActual: number;
  hpMaximo: number;
  estado: "ocioso" | "en_mision" | "descansando";
  ataque: number;
  defensa: number;
  velocidad: number;
  capacidadCarruaje: number;
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
  dificultad: number;
  destinoCoords: { lat: number; lng: number };
}

export interface GameState {
  oro: number;
  personaje: Personaje | null;
  expedicionActiva: ExpedicionActiva | null;
  edificios: Record<string, Edificio>;
  baseCoords: { lat: number; lng: number } | null;
  isLoading: boolean;

  cargarJugador: () => Promise<void>;
  reclutarPersonaje: (personaje: Personaje) => void;
  iniciarExpedicion: (expedicion: ExpedicionActiva) => void;
  finalizarExpedicion: (hpPerdido: number, oroGanado: number) => void;
  curarPersonaje: (costeOro: number, curaHp: number) => boolean;
  gastarOro: (cantidad: number) => boolean;
  ganarOro: (cantidad: number) => void;
  mejorarAtributo: (
    atributo: keyof Pick<
      Personaje,
      "ataque" | "defensa" | "velocidad" | "capacidadCarruaje"
    >,
    coste: number,
    cantidad: number
  ) => boolean;
  mejorarEdificio: (idEdificio: string) => boolean;
  obtenerCosteMejora: (idEdificio: string) => number;
  establecerBase: (coords: { lat: number; lng: number }) => void;
}

const sincronizarConBD = async (state: GameState) => {
  try {
    const nivelesEdificios = {
      taberna: state.edificios.taberna.nivel,
      herreria: state.edificios.herreria.nivel,
      mercado: state.edificios.mercado.nivel,
    };
    await fetch("/api/jugador", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        oro: state.oro,
        edificios: nivelesEdificios,
        personaje: state.personaje,
        baseCoords: state.baseCoords,
        expedicionActiva: state.expedicionActiva,
      }),
    });
  } catch (error) {
    console.error("Error al sincronizar con la BBDD:", error);
    // todo: Revertir el estado si falla
  }
};

export const useGameStore = create<GameState>((set, get) => ({
  oro: 0,
  personaje: null,
  expedicionActiva: null,
  edificios: {
    taberna: { ...EDIFICIOS_BASE.taberna, nivel: 1 },
    herreria: { ...EDIFICIOS_BASE.herreria, nivel: 0 },
    mercado: { ...EDIFICIOS_BASE.mercado, nivel: 0 },
  },
  baseCoords: null,
  isLoading: true,

  cargarJugador: async () => {
    try {
      const respuesta = await fetch("/api/jugador");
      const datos = await respuesta.json();

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
      };

      let expedicionCargada = null;
      if (datos.expedicionActiva) {
        expedicionCargada = {
          idMision: datos.expedicionActiva.misionId,
          nombre: datos.expedicionActiva.nombre,
          recompensa: datos.expedicionActiva.recompensa,
          dificultad: datos.expedicionActiva.dificultad,
          fechaLlegada: datos.expedicionActiva.fechaLlegada,
          destinoCoords: datos.expedicionActiva.destinoCoords,
        };
      }

      set({
        oro: datos.oro,
        edificios: edificiosCompletos,
        personaje: datos.personaje,
        baseCoords: datos.baseCoords || null,
        expedicionActiva: datos.expedicionActiva,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error al cargar la partida:", error);
      set({ isLoading: false });
    }
  },

  reclutarPersonaje: (nuevoPersonaje) => {
    set({ personaje: nuevoPersonaje });
    sincronizarConBD(get());
  },

  iniciarExpedicion: (expedicion) => {
    set((state) => ({
      expedicionActiva: expedicion,
      personaje: state.personaje
        ? { ...state.personaje, estado: "en_mision" }
        : null,
    }));
    sincronizarConBD(get());
  },

  curarPersonaje: (costeOro, curaHp) => {
    const state = get();
    const nivelTaberna = state.edificios.taberna.nivel;
    const descuento = 1 - (nivelTaberna - 1) * 0.1;
    const costeFinal = Math.max(1, Math.floor(costeOro * descuento));

    if (!state.personaje || state.oro < costeOro) return false;
    const { hpActual, hpMaximo } = state.personaje;
    if (hpActual >= hpMaximo) return false;

    const nuevoHp = Math.min(hpMaximo, hpActual + curaHp);

    set({
      oro: state.oro - costeFinal,
      personaje: {
        ...state.personaje,
        hpActual: nuevoHp,
        estado: "ocioso",
      },
    });
    sincronizarConBD(get());
    return true;
  },

  finalizarExpedicion: (hpPerdido, oroGanado) => {
    const state = get();
    if (!state.personaje) return;

    const nuevoHp = Math.max(0, state.personaje.hpActual - hpPerdido);

    set({
      oro: state.oro + oroGanado,
      expedicionActiva: null,
      personaje: {
        ...state.personaje,
        hpActual: nuevoHp,
        estado: nuevoHp > 0 ? "ocioso" : "descansando",
      },
    });
    sincronizarConBD(get());
  },

  gastarOro: (cantidad) => {
    const oroActual = get().oro;
    if (oroActual >= cantidad) {
      set({ oro: oroActual - cantidad });
      sincronizarConBD(get());
      return true;
    }
    return false;
  },

  ganarOro: (cantidad) => {
    set((state) => ({ oro: state.oro + cantidad }));
    sincronizarConBD(get());
  },

  mejorarAtributo: (atributo, coste, cantidad) => {
    const state = get();
    if (!state.personaje || state.oro < coste) return false;

    set({
      oro: state.oro - coste,
      personaje: {
        ...state.personaje,
        [atributo]: state.personaje[atributo] + cantidad,
      },
    });

    sincronizarConBD(get());
    return true;
  },

  obtenerCosteMejora: (idEdificio) => {
    const ed = get().edificios[idEdificio];
    return Math.floor(ed.costeBase * (ed.nivel + 1) * 1.5);
  },

  mejorarEdificio: (idEdificio) => {
    const state = get();
    const coste = state.obtenerCosteMejora(idEdificio);
    const edificio = state.edificios[idEdificio];

    if (edificio.nivel < edificio.nivelMax && state.oro >= coste) {
      set({
        oro: state.oro - coste,
        edificios: {
          ...state.edificios,
          [idEdificio]: { ...edificio, nivel: edificio.nivel + 1 },
        },
      });
      sincronizarConBD(get());
      return true;
    }
    return false;
  },

  establecerBase: (coords) => {
    set({ baseCoords: coords });
    sincronizarConBD(get());
  },
}));
