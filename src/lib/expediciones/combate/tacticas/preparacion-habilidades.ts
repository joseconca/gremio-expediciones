import type { DefinicionHabilidad, EstadoEfectoHabilidad } from "../../../tiposJuego";
import type { ContextoTecnicaTactica } from "./adaptador-tactico";

/** Extrae los estados tácticos sin modificar los efectos originales. */
export const obtenerEstadosTacticos = (efectos: readonly EstadoEfectoHabilidad[]) =>
  efectos.flatMap((efecto) => efecto.datosTacticos?.estados ?? []);

/** Actualiza sólo los límites y estados que dependen del ciclo actual. */
export function actualizarRelojContexto(
  contexto: ContextoTecnicaTactica
): ContextoTecnicaTactica {
  const actualizar = (efectos: EstadoEfectoHabilidad[]) =>
    efectos.map((efecto) => {
      if (!efecto.datosTacticos) return { ...efecto };

      const datos = efecto.datosTacticos;
      const diferencia = contexto.relojPersonal ? 0 :
        Math.max(0, contexto.ciclo - (datos.limites._ciclo ?? contexto.ciclo));
      const limites = Object.fromEntries(
        Object.entries(datos.limites).filter(
          ([clave]) =>
            (!clave.startsWith("pago:") && !clave.startsWith("cura_pasiva:")) ||
            clave.startsWith(`pago:${contexto.ciclo}:`) ||
            clave === `cura_pasiva:${contexto.ciclo}`
        )
      );

      return {
        ...efecto,
        datosTacticos: {
          ...datos,
          limites: { ...limites, _ciclo: contexto.ciclo },
          estados: datos.estados.map(estado => ({
            ...estado, restantes: estado.restantes - (estado.reloj === "ciclo" ? diferencia : 0),
          })).filter(estado => estado.restantes > 0),
        },
      };
    });

  return {
    ...contexto,
    efectosActor: actualizar(contexto.efectosActor),
    efectosObjetivo: actualizar(contexto.efectosObjetivo),
  };
}

function buscarPreparacion(
  contexto: ContextoTecnicaTactica,
  habilidad: DefinicionHabilidad,
  clave: string
) {
  const estados = obtenerEstadosTacticos(contexto.efectosActor);
  return (
    estados.find(
      (estado) =>
        estado.clave === clave &&
        estado.creadorId === contexto.actorId &&
        estado.restantes > 0
    ) ??
    estados.find(
      (estado) =>
        estado.clave === `enlace_residual:${habilidad.claseId}` &&
        estado.creadorId === contexto.actorId &&
        estado.restantes > 0
    )
  );
}

/** Ajusta una copia local; el catálogo global nunca se modifica por un combate. */
export function prepararHabilidadRedisenada(
  habilidad: DefinicionHabilidad,
  contexto: ContextoTecnicaTactica
): DefinicionHabilidad {
  const diseno = habilidad.disenoActiva;
  const numeroObjetivos = Math.max(1, Math.min(9, contexto.numeroObjetivos ?? 1));
  const copia = { ...habilidad };

  if (habilidad.id === "superNovato_leccion") {
    const ultima = obtenerEstadosTacticos(contexto.efectosActor).find(
      (estado) => estado.clave === "_historial"
    );
    copia.tipoDano = ultima?.elemento === "arcano" ? "magico" : "fisico";
    copia.escaladoDano = "polivalente";
  }

  let potencia = 0;
  let ruptura = 0;
  for (const operacion of diseno?.operaciones ?? []) {
    if (operacion.tipo !== "consumir_preparacion" || contexto.principal === false) {
      continue;
    }
    const carga = buscarPreparacion(contexto, habilidad, operacion.clave);
    if (carga) {
      if (operacion.efecto === "potencia") potencia += operacion.factor * carga.valor;
      else if (operacion.efecto === "ruptura") ruptura += operacion.factor * carga.valor;
    }
  }

  if (copia.multiplicadorDano) {
    copia.multiplicadorDano =
      (copia.multiplicadorDano * (1 + Math.min(0.25, potencia))) / numeroObjetivos;
  }
  if (copia.danoProgresivoPorcentaje) {
    copia.danoProgresivoPorcentaje /= numeroObjetivos;
  }
  if (copia.curacionPorcentaje) {
    copia.curacionPorcentaje *= contexto.pesoCuracion ?? 1 / numeroObjetivos;
  }
  if (copia.curacionProgresivaPorcentaje) {
    copia.curacionProgresivaPorcentaje /= numeroObjetivos;
  }

  // El resolver aplica esta ruptura a la defensa sólo durante esta acción.
  copia.rupturaDefensaTemporal = Math.min(0.3, ruptura);
  return copia;
}
