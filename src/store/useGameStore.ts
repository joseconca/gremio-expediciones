import { create } from 'zustand';

export interface Personaje {
  nombre: string;
  clase: string;
  hpActual: number;
  hpMaximo: number;
  estado: 'ocioso' | 'en_mision' | 'descansando';
}

interface GameState {
  oro: number;
  personaje: Personaje | null;
  reclutarPersonaje: (personaje: Personaje) => void;
  gastarOro: (cantidad: number) => boolean;
  ganarOro: (cantidad: number) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  oro: 10,
  personaje: null,
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
  reclutarPersonaje: (nuevoPersonaje) => set({ personaje: nuevoPersonaje }),
}));