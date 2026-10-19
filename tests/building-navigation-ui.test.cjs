const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (relative) => fs.readFileSync(path.join(__dirname, "..", relative), "utf8");

test("los edificios individuales se abren desde el rótulo y el sprite, sin botón Entrar ni descripción fija", () => {
  const card = read("src/components/base/EdificioCard.tsx");
  assert.match(card, /<Link\s+href=\{configuracion\.ruta\}[\s\S]*?aria-describedby=\{"descripcion-edificio-" \+ edificio\.id\}/);
  assert.match(card, /role="tooltip"/);
  assert.match(card, /title=\{edificio\.descripcion\}/);
  assert.match(card, /data-world-layer="building"[\s\S]*?href=\{configuracion\.ruta\}/);
  assert.doesNotMatch(card, /Entrar\s*<span aria-hidden/);
  assert.doesNotMatch(card, /<p[^>]*>\s*\{edificio\.descripcion\}\s*<\/p>/);
});

test("el complejo Armería y Herrería permite entrar desde cada nombre y desde su zona del sprite", () => {
  const complejo = read("src/components/base/ComplejoArmeria.tsx");
  assert.match(complejo, /href=\{CONFIGURACION_EDIFICIOS\.armeria\.ruta\}/);
  assert.match(complejo, /href=\{CONFIGURACION_EDIFICIOS\.herreria\.ruta\}/);
  assert.match(complejo, /title=\{armeria\.descripcion\}/);
  assert.match(complejo, /title=\{herreria\.descripcion\}/);
  assert.match(complejo, /w-1\/2[\s\S]*?CONFIGURACION_EDIFICIOS\.herreria\.ruta/);
  assert.doesNotMatch(complejo, /Sin herrería/);
  assert.doesNotMatch(complejo, /<p[^>]*>\s*\{armeria\.descripcion\}\s*<\/p>/);
  assert.doesNotMatch(complejo, /<p[^>]*>\s*\{herreria\.descripcion\}\s*<\/p>/);
  assert.doesNotMatch(complejo, /Armería\s*<span aria-hidden/);
  assert.doesNotMatch(complejo, /Herrería\s*<span aria-hidden/);
});
