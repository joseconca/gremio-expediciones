import type { EstadoEfectoHabilidad } from "../tiposJuego";
import { obtenerHabilidadPorId } from "../habilidades";

export function describirEstadoCombate(efecto: EstadoEfectoHabilidad): string {
  const numero = (n: number) => new Intl.NumberFormat("es", { maximumFractionDigits: 2 }).format(n);
  const valor = numero(efecto.valor);
  const porcentaje = numero(efecto.valor * 100);
  const textos: Record<EstadoEfectoHabilidad["tipo"], string> = {
    tactico: efecto.datosTacticos?.estados.filter(e=>!e.clave.startsWith("_")).map(e => {
      const nombre = obtenerHabilidadPorId(e.fuenteId)?.nombre??e.clave.replaceAll("_"," ");
      const descripcion = e.familia === "guardia" ? `absorbe hasta ${numero(e.valor)} de daño directo`
        : e.familia === "regeneracion" ? `${numero(e.valor)} de cura por turno propio`
          : e.familia === "herida" ? `${numero(e.valor)} de daño por turno propio`
            : e.familia === "exposicion" ? `reduce la defensa un ${numero(e.valor * 100)} % para un impacto`
              : e.familia === "precision" ? `${numero(e.valor)} puntos de precisión para un intento de ataque`
                : e.familia === "resistencia" ? `reduce un ${numero(e.valor*100)} % la potencia del siguiente perjuicio`
                  : e.familia === "acompanante" ? `${numero(e.valor)} de daño o protección por orden; ${e.cargas} órdenes restantes`
                    : `${e.cargas} ${e.cargas === 1 ? "carga preparada" : "cargas preparadas"}, consumible por una técnica compatible`;
      return `${nombre}: ${descripcion}. ${e.restantes} ${e.reloj === "ciclo" ? "ciclos" : "turnos propios"} restantes`;
    }).join("; ") || "Sin preparaciones activas",
    dano_progresivo: `${valor} de daño por turno`,
    curacion_progresiva: `${valor} de cura por turno`,
    bonus_defensa: `+${valor} de defensa física`,
    debuff_defensa: `−${valor} de defensa física`,
    bonus_ataque: `+${porcentaje} % de ataque físico`,
    debuff_ataque: `−${porcentaje} % de ataque físico y mágico`,
    bonus_ataque_magico: `+${porcentaje} % de ataque mágico`,
    bonus_precision: `+${valor} de precisión`,
    debuff_precision: `−${valor} de precisión`,
    bonus_evasion: `+${porcentaje} puntos porcentuales de evasión`,
    barrera: `Bloquea ${valor} ${efecto.valor === 1 ? "ataque directo" : "ataques directos"}`,
  };
  const turnos = Math.max(0, Math.floor(efecto.turnosRestantes));
  if (efecto.tipo === "tactico") return textos.tactico + ".";
  return `${textos[efecto.tipo]}. ${turnos} ${turnos === 1 ? "turno restante" : "turnos restantes"}.`;
}

export function describirBonificacionesComida(valor: unknown): string | null {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;
  const nombres: Record<string, string> = { ataque: "ataque físico", ataqueMagico: "ataque mágico", defensa: "defensa física", velocidad: "velocidad", probCritico: "puntos porcentuales de crítico" };
  const partes = Object.entries(valor).flatMap(([clave, n]) => typeof n === "number" && Number.isFinite(n) && n !== 0 && nombres[clave]
    ? [`+${new Intl.NumberFormat("es", { maximumFractionDigits: 2 }).format(clave === "probCritico" ? n * 100 : n)} de ${nombres[clave]}`] : []);
  return partes.length ? partes.join("; ") + ". Durante la expedición." : null;
}
