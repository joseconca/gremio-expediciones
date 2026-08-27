import { create } from "zustand";

const EDIFICIOS_BASE: Record<string, Omit<Edificio, "nivel">> = {
  taberna: {
    id: "taberna",
    nombre: "Taberna",
    costeBase: 100,
    descripcion: "Descansa tras una expedición.",
    nivelMax: 1,
  },
  herreria: {
    id: "herreria",
    nombre: "Herrería",
    costeBase: 200,
    descripcion: "Mejora tus equipajes.",
    nivelMax: 3,
  },
  mercado: {
    id: "mercado",
    nombre: "Mercado",
    costeBase: 500,
    descripcion: "Repara las botas y ese carruaje.",
    nivelMax: 2,
  },
};

export interface Personaje {
  id?: string;
  nombre: string;
  clase: string;
  hpActual: number;
  hpMaximo: number;
  estado: "ocioso" | "de_viaje" | "descansando";
  ataque: number;
  defensa: number;
  velocidad: number;
  capacidadCarruaje: number;
  regeneracionDeVida: number;
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
  horaMisiones: number;
  misionesCompletadasEstaHora: number;

  cargarJugador: () => Promise<void>;
  reclutarPersonaje: (personaje: Personaje) => void;
  iniciarExpedicion: (expedicion: ExpedicionActiva) => void;
  finalizarExpedicion: (hpPerdido: number, oroGanado: number) => void;

  calcularCosteCura: () => InfoCura;
  curarPersonaje: () => boolean;
  aplicarRegeneracion: () => void;

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
        oro: datos.oro,
        edificios: edificiosCompletos,
        personaje: datos.personaje,
        baseCoords: datos.baseCoords || null,
        expedicionActiva: datos.expedicionActiva || null,
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
        ? { ...state.personaje, estado: "de_viaje" }
        : null,
    }));
    sincronizarConBD(get());
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

  curarPersonaje: () => {
    const state = get();
    const { coste, hpCurado } = state.calcularCosteCura();
    const personaje = state.personaje;

    if (!personaje || coste === 0 || hpCurado === 0) return false;

    const nuevoHp = Math.min(personaje.hpMaximo, personaje.hpActual + hpCurado);

    set({
      oro: state.oro - coste,
      personaje: {
        ...personaje,
        hpActual: nuevoHp,
        estado: nuevoHp >= personaje.hpMaximo ? "ocioso" : "descansando",
      },
    });
    sincronizarConBD(get());
    return true;
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
