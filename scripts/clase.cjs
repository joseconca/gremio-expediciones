#!/usr/bin/env node
/**
 * Una orden para localizar la ficha de una profesión y sus archivos fuente.
 * npm run clase -- berserker
 */
require("../tests/load-typescript.cjs");
const { CLASES } = require("../src/lib/progresion/clases.ts");
const { CLASES_BASE } = require("../src/lib/progresion/catalogos/clases-base.ts");
const { CLASES_NUEVAS } = require("../src/lib/progresion/catalogos/clases-avanzadas.ts");
const { HABILIDADES_NUEVAS } = require("../src/lib/habilidades-nuevas.ts");
const { HABILIDADES_TRONCALES } = require("../src/lib/progresion/catalogos/habilidades-troncales.ts");
const { HABILIDADES_EVOLUCIONES } = require("../src/lib/progresion/catalogos/habilidades-evoluciones.ts");
const { HABILIDADES_ADICIONALES } = require("../src/lib/progresion/tecnicas-adicionales.ts");
const { HABILIDADES_SUPER_NOVATO } = require("../src/lib/progresion/habilidades-super-novato.ts");
const { obtenerFichaProfesion } = require("../src/lib/progresion/catalogos/fichas-profesion.ts");
const { BIBLIOTECA_SPRITES_HD } = require("../src/lib/sprites-heroes-hd.ts");

function obtenerFuentes(id) {
  const fuentes = [];
  if (CLASES_BASE[id]) fuentes.push("src/lib/progresion/catalogos/clases-base.ts");
  if (CLASES_NUEVAS[id]) fuentes.push("src/lib/progresion/catalogos/clases-avanzadas.ts");
  const catalogos = [
    ["src/lib/progresion/catalogos/habilidades-troncales.ts", HABILIDADES_TRONCALES],
    ["src/lib/progresion/catalogos/habilidades-evoluciones.ts", HABILIDADES_EVOLUCIONES],
    ["src/lib/habilidades-nuevas.ts", HABILIDADES_NUEVAS],
    ["src/lib/progresion/tecnicas-adicionales.ts", HABILIDADES_ADICIONALES],
    ["src/lib/progresion/habilidades-super-novato.ts", HABILIDADES_SUPER_NOVATO],
  ];
  for (const [ruta, habilidades] of catalogos) {
    if (habilidades.some(h => h.claseId === id)) fuentes.push(ruta);
  }
  fuentes.push("src/lib/progresion/diseno-habilidades.ts");
  return fuentes;
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
