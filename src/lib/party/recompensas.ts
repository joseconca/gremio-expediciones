/** Reglas puras del reparto de recompensas de combate de comitiva.
 * No consulta Prisma ni modifica el estado del combate.
 * Se conserva el mismo algoritmo para que el botín siga siendo determinista.
 */
type RecompensaRecursosParty = {
  oro: number;
  madera: number;
  piedra: number;
  metal: number;
  objetos: { objetoId: string; cantidad: number }[];
};

export function leerRecompensaParty(valor: unknown): RecompensaRecursosParty {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
    return { oro: 0, madera: 0, piedra: 0, metal: 0, objetos: [] };
  }
  const record = valor as Record<string, unknown>;
  const cantidad = (key: string) =>
    typeof record[key] === "number" && Number.isFinite(record[key])
      ? Math.max(0, Math.floor(record[key] as number))
      : 0;
  const objetos = Array.isArray(record.objetos)
    ? record.objetos.flatMap((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return [];
        const objeto = item as Record<string, unknown>;
        if (
          typeof objeto.objetoId !== "string" ||
          !objeto.objetoId.trim() ||
          typeof objeto.cantidad !== "number" ||
          !Number.isFinite(objeto.cantidad) ||
          objeto.cantidad <= 0
        ) return [];
        return [{ objetoId: objeto.objetoId.trim(), cantidad: Math.floor(objeto.cantidad) }].filter((x) => x.cantidad > 0);
      })
    : [];
  return { oro: cantidad("oro"), madera: cantidad("madera"), piedra: cantidad("piedra"), metal: cantidad("metal"), objetos };
}

export function repartirCantidadEntera(total: number, numeroMiembros: number, indice: number): number {
  if (numeroMiembros <= 0) return 0;
  const cantidad = Math.max(0, Math.floor(total));
  const base = Math.floor(cantidad / numeroMiembros);
  const resto = cantidad % numeroMiembros;
  return base + (indice < resto ? 1 : 0);
}

function hashDeterminista(texto: string): number {
  let hash = 2166136261;
  for (let indice = 0; indice < texto.length; indice += 1) {
    hash ^= texto.charCodeAt(indice);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function crearRngDeterminista(semillaInicial: string): () => number {
  let estado = hashDeterminista(semillaInicial);
  return () => {
    estado = (estado + 0x6D2B79F5) >>> 0;
    let valor = estado;
    valor = Math.imul(valor ^ (valor >>> 15), valor | 1);
    valor ^= valor + Math.imul(valor ^ (valor >>> 7), valor | 61);
    return ((valor ^ (valor >>> 14)) >>> 0) / 4294967296;
  };
}

export function registrarObjetoRecompensa(
  lista: { objetoId: string; cantidad: number }[],
  objetoId: string,
  cantidad: number,
) {
  if (cantidad <= 0) return;
  const existente = lista.find((objeto) => objeto.objetoId === objetoId);
  if (existente) existente.cantidad += cantidad;
  else lista.push({ objetoId, cantidad });
}
