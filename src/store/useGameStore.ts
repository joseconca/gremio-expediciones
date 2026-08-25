import { create } from "zustand";

export interface Personaje {
  nombre: string;
  clase: string;
  hpActual: number;
  hpMaximo: number;
  estado: "ocioso" | "en_mision" | "descansando";
  armaEquipada?: Arma | null;
}

export interface Arma {
  nombre: string;
  bonoAtaque: number;
  bonoDano: number;
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
}

export interface GameState {
  oro: number;
  personaje: Personaje | null;
  expedicionActiva: ExpedicionActiva | null;

  reclutarPersonaje: (personaje: Personaje) => void;

  iniciarExpedicion: (expedicion: ExpedicionActiva) => void;
  finalizarExpedicion: (hpPerdido: number, oroGanado: number) => void;

  curarPersonaje: (costeOro: number, curaHp: number) => boolean;

  gastarOro: (cantidad: number) => boolean;
  ganarOro: (cantidad: number) => void;

  comprarArma: (arma: Arma, costeOro: number) => boolean;

  edificios: Record<string, Edificio>;
  mejorarEdificio: (idEdificio: string) => boolean;
  obtenerCosteMejora: (idEdificio: string) => number;
}

export const useGameStore = create<GameState>((set, get) => ({
  oro: 50,
  personaje: null,
  expedicionActiva: null,

  reclutarPersonaje: (nuevoPersonaje) => set({ personaje: nuevoPersonaje }),

  iniciarExpedicion: (expedicion) =>
    set((state) => ({
      expedicionActiva: expedicion,
      personaje: state.personaje
        ? { ...state.personaje, estado: "en_mision" }
        : null,
    })),

  curarPersonaje: (costeOro, curaHp) => {
    const state = get();

    const nivelTaberna = state.edificios.taberna.nivel;
    const descuento = 1 - (nivelTaberna - 1) * 0.1;
    const costeFinal = Math.max(1, Math.floor(costeOro * descuento));

    if (!state.personaje || state.oro < costeOro) return false;

    const hpActual = state.personaje.hpActual;
    const hpMaximo = state.personaje.hpMaximo;

    if (hpActual >= hpMaximo) return false;

    const nuevoHp = Math.min(hpMaximo, hpActual + curaHp);

    set({
      oro: state.oro - costeOro,
      personaje: {
        ...state.personaje,
        hpActual: nuevoHp,
        estado: "ocioso",
      },
    });

    return true;
  },

  finalizarExpedicion: (hpPerdido, oroGanado) =>
    set((state) => {
      if (!state.personaje) return state;

      const nuevoHp = Math.max(0, state.personaje.hpActual - hpPerdido);

      return {
        oro: state.oro + oroGanado,
        expedicionActiva: null,
        personaje: {
          ...state.personaje,
          hpActual: nuevoHp,
          estado: nuevoHp > 0 ? "ocioso" : "descansando",
        },
      };
    }),

  gastarOro: (cantidad) => {
    const oroActual = get().oro;
    if (oroActual >= cantidad) {
      set({ oro: oroActual - cantidad });
      return true;
    }
    return false;
  },

  ganarOro: (cantidad) => {
    set((state) => ({ oro: state.oro + cantidad }));
  },

  comprarArma: (arma, costeOro) => {
    const state = get();
    if (!state.personaje || state.oro < costeOro) return false;

    set({
      oro: state.oro - costeOro,
      personaje: {
        ...state.personaje,
        armaEquipada: arma,
      },
    });
    return true;
  },

  edificios: {
    taberna: {
      id: "taberna",
      nombre: "Taberna del Jabalí",
      nivel: 1,
      costeBase: 50,
      descripcion: "Reduce el coste de curación un 10% por nivel.",
      nivelMax: 3,
    },
    forja: {
      id: "forja",
      nombre: "Forja Enana",
      nivel: 0,
      costeBase: 100,
      descripcion: "Permite comprar armamento. A más nivel, mejores armas.",
      nivelMax: 3,
    },
    gremio: {
      id: "gremio",
      nombre: "Gremio de Aventureros",
      nivel: 0,
      costeBase: 150,
      descripcion: "Otorga un +10% de oro extra en misiones por nivel.",
      nivelMax: 3,
    },
  },

  obtenerCosteMejora: (idEdificio) => {
    const ed = get().edificios[idEdificio];
    return Math.floor(ed.costeBase * (ed.nivel + 1) * 1.5);
  },

  mejorarEdificio: (idEdificio) => {
    const state = get();
    const coste = state.obtenerCosteMejora(idEdificio);
    const edificio = state.edificios[idEdificio];
    const nivelActual = edificio.nivel;
    const nivelMax = edificio.nivelMax;
    if (nivelActual <= nivelMax) {
      if (state.oro >= coste) {
        set({
          oro: state.oro - coste,
          edificios: {
            ...state.edificios,
            [idEdificio]: { ...edificio, nivel: edificio.nivel + 1 },
          },
        });
        return true;
      }
    }
    return false;
  },
}));
