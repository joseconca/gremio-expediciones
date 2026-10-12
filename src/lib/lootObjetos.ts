import type { DefinicionEnemigo, DefinicionObjeto } from "./tiposJuego";
import { obtenerObjetoPorId } from "./objetos";
import { generarSufijoObjeto } from "./sufijosObjetos";

export interface BotinObjeto {
  objeto: DefinicionObjeto;
  sufijoId: string | null;
  bonificaciones: Record<string, number>;
}

/** Ejecuta una tirada usando la tabla y las probabilidades configuradas en el enemigo. */
export function tirarBotinEnemigo(
  enemigo: DefinicionEnemigo | null | undefined,
  rng: () => number = Math.random
): BotinObjeto | null {
  if (!enemigo || !enemigo.tablaLoot?.length) return null;

  const probabilidad = Math.max(0, Math.min(1, enemigo.probabilidadBotin ?? 0));
  if (rng() >= probabilidad) return null;

  const opciones = enemigo.tablaLoot.filter(
    (entrada) => entrada.peso > 0 && obtenerObjetoPorId(entrada.objetoId)
  );
  const pesoTotal = opciones.reduce((total, entrada) => total + entrada.peso, 0);
  if (pesoTotal <= 0) return null;

  let tirada = Math.max(0, Math.min(0.999999, rng())) * pesoTotal;
  let elegida = opciones[opciones.length - 1];
  for (const opcion of opciones) {
    tirada -= opcion.peso;
    if (tirada < 0) {
      elegida = opcion;
      break;
    }
  }

  const objeto = obtenerObjetoPorId(elegida.objetoId);
  if (!objeto) return null;

  const sufijo = generarSufijoObjeto(objeto, enemigo.esJefe === true, rng);
  return {
    objeto,
    sufijoId: sufijo.sufijoId,
    bonificaciones: sufijo.bonificaciones,
  };
}
