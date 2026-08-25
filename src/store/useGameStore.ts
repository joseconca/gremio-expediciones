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
}

export const useGameStore = create<GameState>((set, get) => ({
  oro: 10,
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
}));
