import {
  prepararAccionCombate,
} from "./accion-combate";
import { ejecutarAccionPveConContexto } from "./pve";
import { ejecutarAccionPvpConContexto } from "./pvp";

/**
 * Adaptador de compatibilidad. Las rutas nuevas usan orquestadores específicos;
 * esta ruta antigua detecta el tipo desde el combate y conserva los clientes
 * que todavía envían acciones sin el campo objetivo.
 */
export async function adaptarAccionCombate(request: Request) {
  const preparado = await prepararAccionCombate(request);
  if (!("contexto" in preparado)) return preparado;
  return preparado.contexto.esPvp
    ? ejecutarAccionPvpConContexto(preparado.contexto)
    : ejecutarAccionPveConContexto(preparado.contexto);
}
