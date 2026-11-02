#!/usr/bin/env node
/**
 * Una orden para localizar la ficha de una profesión y sus archivos fuente.
 * npm run clase -- berserker
 */
require("../tests/load-typescript.cjs");
const { CLASES } = require("../src/lib/progresion/clases.ts");
const { obtenerFichaProfesion } = require("../src/lib/progresion/catalogos/fichas-profesion.ts");
const { BIBLIOTECA_SPRITES_HD } = require("../src/lib/sprites-heroes-hd.ts");

function obtenerFuentes(id) {
  if (!CLASES[id]) return [];
  return [
    "src/lib/progresion/catalogos/clases.ts",
    "src/lib/progresion/catalogos/habilidades.ts",
  ];
}

function obtenerResumen(id) {
  const ficha = obtenerFichaProfesion(id);
  if (!ficha) return null;
  return {
    clase: ficha.clase.id,
    nombre: ficha.clase.nombre,
    tier: ficha.clase.tier,
    jobMaximo: ficha.clase.nivelJobMaximo,
    arquetipo: ficha.clase.arquetipo,
    recurso: ficha.clase.recursoCombate,
    requisitos: ficha.clase.requisitos,
    habilidades: ficha.habilidades.map(h => ({
      id: h.id, nombre: h.nombre, tipo: h.tipo, job: h.nivelJobRequerido,
    })),
    disenoV2: ficha.diseno !== null,
    spritesHD: {
      atlas: BIBLIOTECA_SPRITES_HD.availableSexes?.[id] ?? [],
      retratos: BIBLIOTECA_SPRITES_HD.availablePortraits?.[id] ?? [],
    },
    fuentes: obtenerFuentes(id),
  };
}

if (require.main === module) {
  const [id] = process.argv.slice(2);
  if (!id || id === "--help") {
    console.log("Uso: npm run clase -- <id>   Ejemplos: berserker, mago, novato");
    process.exit(id ? 0 : 1);
  }
  const resultado = obtenerResumen(id);
  if (!resultado) {
    console.error(`Clase '${id}' desconocida. IDs disponibles: ${Object.keys(CLASES).join(", ")}`);
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(resultado, null, 2));
  }
}
module.exports = { obtenerFuentes, obtenerResumen };
