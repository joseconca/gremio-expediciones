import type { EstadoEfectoHabilidad } from "../tiposJuego";

export function describirEstadoCombate(efecto: EstadoEfectoHabilidad): string {
  const numero = (n: number) => new Intl.NumberFormat("es", { maximumFractionDigits: 2 }).format(n);
  const valor = numero(efecto.valor);
  const porcentaje = numero(efecto.valor * 100);
  const textos: Record<EstadoEfectoHabilidad["tipo"], string> = {
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
  return `${textos[efecto.tipo]}. ${turnos} ${turnos === 1 ? "turno restante" : "turnos restantes"}.`;
}

export function describirBonificacionesComida(valor: unknown): string | null {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;
  const nombres: Record<string, string> = { ataque: "ataque físico", ataqueMagico: "ataque mágico", defensa: "defensa física", velocidad: "velocidad", probCritico: "puntos porcentuales de crítico" };
  const partes = Object.entries(valor).flatMap(([clave, n]) => typeof n === "number" && Number.isFinite(n) && n !== 0 && nombres[clave]
    ? [`+${new Intl.NumberFormat("es", { maximumFractionDigits: 2 }).format(clave === "probCritico" ? n * 100 : n)} de ${nombres[clave]}`] : []);
  return partes.length ? partes.join("; ") + ". Durante la expedición." : null;
}
