require('../tests/load-typescript.cjs');
const fs = require('node:fs');
const { HABILIDADES } = require('../src/lib/habilidades.ts');
const { CLASES } = require('../src/lib/progresion/clases.ts');
const { nivelMaximoHabilidad } = require('../src/lib/progresion/niveles-habilidad.ts');
const filas = ['# Catálogo jugable de habilidades', '', 'Generado desde `HABILIDADES` por `node scripts/generar-catalogo-habilidades-v2.cjs`. Valores de rango 1. Estado: 29 de octubre de 2026.', '', '61 clases; 245 activas y 122 pasivas. Equipo máximo: cinco activas y tres pasivas de la clase actual y sus antecesoras. Los rasgos intrínsecos se revisarán después.', ''];
for (const clase of Object.values(CLASES)) {
  filas.push(`## ${clase.nombre}`, '', `Tier ${clase.tier}${clase.id === 'superNovato' ? '; clase secreta con objetivo de potencia de final de árbol' : ''}.`, '');
  for (const h of HABILIDADES.filter(h => h.claseId === clase.id)) {
    filas.push(`### ${h.nombre}`, '', `ID: \`${h.id}\`. ${h.tipo === 'activa' ? `Activa; ${h.costeEnergia ?? 0} EN, ${h.costeMana ?? 0} PM; CD ${h.cooldownTurnos ?? 0} ciclos; objetivo ${h.objetivo?.equipo}, ${h.objetivo?.patron}` : 'Pasiva'}. Job ${h.nivelJobRequerido ?? 1}; rango máximo ${nivelMaximoHabilidad(h.claseId, h)}.`, '', h.descripcion, '');
  }
}
fs.writeFileSync('docs/habilidades-v2-catalogo.md', filas.join('\n'));
