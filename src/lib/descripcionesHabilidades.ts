import type { DefinicionHabilidad, EstadoSecundarioHabilidad } from "@/lib/tiposJuego";

function porcentaje(valor: number): string {
  return `${Number((valor * 100).toFixed(2)).toLocaleString("es-ES")}%`;
}

function tieneEstado(habilidad: DefinicionHabilidad, tipo: EstadoSecundarioHabilidad["tipo"]): boolean {
  return Boolean(habilidad.estadosSecundarios?.some((estado) => estado.tipo === tipo));
}

/** Resumen breve y sin cifras para usar directamente en las tarjetas. */
export function descripcionSimpleHabilidad(habilidad: DefinicionHabilidad): string {
  if (habilidad.tipo === "pasiva") {
    const rasgos: string[] = [];
    if (habilidad.bonusEvasion) rasgos.push("Aumenta la evasión.");
    if (habilidad.bonusDefensa || habilidad.bonusDefensaMagica) rasgos.push("Aumenta la defensa.");
    if (habilidad.bonusAtaque || habilidad.bonusAtaqueMagico) rasgos.push("Aumenta el ataque.");
    if (habilidad.bonusHpMaximo || habilidad.bonusEnergiaMaxima || habilidad.bonusManaMaximo) rasgos.push("Aumenta los recursos máximos.");
    if (habilidad.probabilidadCritico) rasgos.push("Mejora los golpes críticos.");
    if (habilidad.bonusPrecision) rasgos.push("Aumenta la precisión.");
    if (habilidad.bonusVelocidad) rasgos.push("Aumenta la velocidad.");
    if (habilidad.bonusRegeneracionVida || habilidad.bonusRegeneracionEnergia || habilidad.bonusRegeneracionMana) rasgos.push("Mejora la regeneración.");
    return rasgos.length ? [...new Set(rasgos)].join(" ") : "Otorga una ventaja pasiva durante el combate.";
  }

  if (habilidad.efecto === "curacion" || habilidad.efecto === "curacion_progresiva" || habilidad.curacionPorcentaje || habilidad.curacionProgresivaPorcentaje) {
    return habilidad.curacionProgresivaPorcentaje || tieneEstado(habilidad, "curacion_progresiva")
      ? "Restaura vida de inmediato o gradualmente."
      : "Restaura vida.";
  }
  if (habilidad.efecto === "bonus_defensa" || habilidad.bonusDefensaPorcentaje || tieneEstado(habilidad, "bonus_defensa")) {
    return habilidad.multiplicadorDano
      ? "Inflige daño y aumenta la defensa durante varios turnos."
      : "Aumenta la defensa durante varios turnos.";
  }
  if (tieneEstado(habilidad, "bonus_evasion") || habilidad.bonusEvasion) {
    return habilidad.multiplicadorDano ? "Inflige daño y aumenta la evasión." : "Aumenta la evasión.";
  }
  if (habilidad.danoProgresivoPorcentaje || tieneEstado(habilidad, "dano_progresivo")) return "Inflige daño progresivo durante varios turnos.";
  if (habilidad.estadosSecundarios?.some((estado) => estado.tipo.startsWith("debuff_"))) {
    return habilidad.multiplicadorDano ? "Inflige daño y debilita al enemigo." : "Debilita al enemigo durante varios turnos.";
  }
  if (tieneEstado(habilidad, "bonus_ataque") || tieneEstado(habilidad, "bonus_ataque_magico")) {
    return habilidad.multiplicadorDano ? "Inflige daño y potencia tus ataques." : "Aumenta el poder de tus ataques.";
  }
  if (habilidad.efecto === "bonus_ataque_magico") return "Aumenta el poder mágico.";
  if (habilidad.limpiarEstadosNegativos) return "Elimina efectos negativos.";
  if (habilidad.roboVida) return "Inflige daño y recupera parte de tu vida.";
  return habilidad.multiplicadorDano ? "Inflige daño al enemigo." : habilidad.descripcion.replace(/\s*\d+(?:[.,]\d+)?\s*%?/g, "").trim();
}

/** Detalle numérico fiable construido a partir de los parámetros mecánicos. */
export function detalleNumericoHabilidad(habilidad: DefinicionHabilidad): string[] {
  const lineas: string[] = [];
  if (habilidad.tipoDano) {
    const tipoDano = habilidad.tipoDano === "magico" ? "mágico" : habilidad.tipoDano === "hibrido" ? "híbrido" : "físico";
    if (habilidad.multiplicadorDano) lineas.push(`Daño ${tipoDano}: multiplicador ×${habilidad.multiplicadorDano} del ataque.`);
  } else if (habilidad.multiplicadorDano) {
    lineas.push(`Daño físico: multiplicador ×${habilidad.multiplicadorDano} del ataque.`);
  }

  if (habilidad.curacionPorcentaje) lineas.push(`Curación inmediata: ${porcentaje(habilidad.curacionPorcentaje)} de la vida máxima.`);
  if (habilidad.curacionProgresivaPorcentaje) lineas.push(`Curación progresiva: ${porcentaje(habilidad.curacionProgresivaPorcentaje)} de la vida máxima por turno.`);
  if (habilidad.danoProgresivoPorcentaje) lineas.push(`Daño progresivo: ${porcentaje(habilidad.danoProgresivoPorcentaje)} del ataque efectivo por pulso.`);
  if (habilidad.roboVida) lineas.push(`Robo de vida: recuperas ${porcentaje(habilidad.roboVida)} del daño efectivo.`);
  if (habilidad.bonusDefensaPorcentaje) lineas.push(`Defensa aumentada: +${porcentaje(habilidad.bonusDefensaPorcentaje)}.`);
  if (habilidad.bonusAtaque) lineas.push(`Ataque físico: +${habilidad.bonusAtaque}.`);
  if (habilidad.bonusAtaqueMagico) lineas.push(`Ataque mágico: +${habilidad.bonusAtaqueMagico}.`);
  if (habilidad.bonusDefensa) lineas.push(`Defensa física: +${habilidad.bonusDefensa}.`);
  if (habilidad.bonusDefensaMagica) lineas.push(`Defensa mágica: +${habilidad.bonusDefensaMagica}.`);
  if (habilidad.bonusHpMaximo) lineas.push(`Vida máxima: +${habilidad.bonusHpMaximo}.`);
  if (habilidad.bonusEnergiaMaxima) lineas.push(`Energía máxima: +${habilidad.bonusEnergiaMaxima}.`);
  if (habilidad.bonusManaMaximo) lineas.push(`Maná máximo: +${habilidad.bonusManaMaximo}.`);
  if (habilidad.bonusPrecision) lineas.push(`Precisión: +${habilidad.bonusPrecision} puntos.`);
  if (habilidad.bonusEvasion) lineas.push(`Evasión: +${porcentaje(habilidad.bonusEvasion)}.`);
  if (habilidad.probabilidadCritico) lineas.push(`Probabilidad crítica adicional: +${porcentaje(habilidad.probabilidadCritico)}.`);
  if (habilidad.bonusVelocidad) lineas.push(`Velocidad: +${habilidad.bonusVelocidad}.`);
  if (habilidad.bonusRegeneracionVida) lineas.push(`Regeneración de vida: +${habilidad.bonusRegeneracionVida} por turno.`);
  if (habilidad.bonusRegeneracionEnergia) lineas.push(`Regeneración de Energía: +${habilidad.bonusRegeneracionEnergia} por turno.`);
  if (habilidad.bonusRegeneracionMana) lineas.push(`Regeneración de Maná: +${habilidad.bonusRegeneracionMana} por turno.`);
  if (habilidad.recuperarEnergia) lineas.push(`Recupera ${habilidad.recuperarEnergia} de Energía al usarla.`);
  if (habilidad.limpiarEstadosNegativos) lineas.push("Elimina los efectos negativos activos.");

  for (const estado of habilidad.estadosSecundarios ?? []) {
    const turnos = estado.duracionTurnos;
    switch (estado.tipo) {
      case "bonus_defensa": lineas.push(`Defensa aumentada en ${porcentaje(estado.valor)} durante ${turnos} turnos.`); break;
      case "debuff_defensa": lineas.push(`Defensa enemiga reducida en ${porcentaje(estado.valor)} durante ${turnos} turnos.`); break;
      case "bonus_ataque": lineas.push(`Ataque aumentado en ${porcentaje(estado.valor)} durante ${turnos} turnos.`); break;
      case "debuff_ataque": lineas.push(`Ataque enemigo reducido en ${porcentaje(estado.valor)} durante ${turnos} turnos.`); break;
      case "bonus_ataque_magico": lineas.push(`Ataque mágico aumentado en ${porcentaje(estado.valor)} durante ${turnos} turnos.`); break;
      case "bonus_evasion": lineas.push(`Evasión aumentada en ${porcentaje(estado.valor)} durante ${turnos} turnos.`); break;
      case "debuff_precision": lineas.push(`Precisión enemiga reducida en ${estado.valor} puntos durante ${turnos} turnos.`); break;
      case "curacion_progresiva": lineas.push(`Curación progresiva: ${porcentaje(estado.valor)} de la vida máxima por turno durante ${turnos} turnos.`); break;
      case "dano_progresivo": lineas.push(`Daño progresivo durante ${turnos} turnos.`); break;
    }
  }

  if (habilidad.duracionTurnos) lineas.push(`Duración: ${habilidad.duracionTurnos} turnos.`);
  if (habilidad.cooldownTurnos) lineas.push(`Reutilización: cada ${habilidad.cooldownTurnos} turnos.`);
  if (habilidad.costeEnergia) lineas.push(`Coste de combate: ${habilidad.costeEnergia} de Energía.`);
  if (habilidad.costeMana) lineas.push(`Coste de combate: ${habilidad.costeMana} de Maná.`);
  lineas.push(`Descripción: ${habilidad.descripcion}`);

  return [...new Set(lineas)];
}
