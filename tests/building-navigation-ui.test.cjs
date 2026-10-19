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
  assert.match(card, /data-world-layer="building"/);
  assert.match(card, /href=\{configuracion\.ruta\}/);
  assert.doesNotMatch(card, /Entrar\s*<span aria-hidden/);
  assert.doesNotMatch(card, /<p[^>]*>\s*\{edificio\.descripcion\}\s*<\/p>/);
  assert.match(card, /h-11 items-center[\s\S]*?sm:h-\[52px\]/);
  assert.match(card, /whitespace-nowrap text-\[11px\]/);
});

test("los rótulos de Armería/Herrería comparten altura y mantienen nombres en una línea", () => {
  const complejo = read("src/components/base/ComplejoArmeria.tsx");
  assert.match(complejo, /h-11 items-center[\\s\\S]*?sm:h-\\[52px\\]/);
  assert.match(complejo, /whitespace-nowrap/);
});

test("el complejo Armería y Herrería permite entrar desde cada nombre y desde su zona del sprite", () => {
  const complejo = read("src/components/base/ComplejoArmeria.tsx");
  assert.match(complejo, /href=\{CONFIGURACION_EDIFICIOS\.armeria\.ruta\}/);
  assert.match(complejo, /href=\{CONFIGURACION_EDIFICIOS\.herreria\.ruta\}/);
  assert.match(complejo, /aria-describedby="descripcion-armeria"/);
  assert.match(complejo, /aria-describedby="descripcion-herreria"/);
  assert.match(complejo, /id="descripcion-armeria" role="tooltip"/);
  assert.match(complejo, /id="descripcion-herreria" role="tooltip"/);
  assert.match(complejo, /title=\{armeria\.descripcion\}/);
  assert.match(complejo, /title=\{herreria\.descripcion\}/);
  assert.match(complejo, /w-1\/2[\s\S]*?CONFIGURACION_EDIFICIOS\.herreria\.ruta/);
  assert.doesNotMatch(complejo, /Sin herrería/);
  assert.doesNotMatch(complejo, /<p[^>]*>\s*\{armeria\.descripcion\}\s*<\/p>/);
  assert.doesNotMatch(complejo, /<p[^>]*>\s*\{herreria\.descripcion\}\s*<\/p>/);
  assert.doesNotMatch(complejo, /Armería\s*<span aria-hidden/);
  assert.doesNotMatch(complejo, /Herrería\s*<span aria-hidden/);
});


test("el poblado usa todo el ancho, elimina el panel verde común y añade una cuarta columna en escritorio", () => {
  const panel = read("src/components/base/PanelEdificios.tsx");
  assert.match(panel, /className="w-full"/);
  assert.match(panel, /grid-cols-2[\\s\\S]*?md:grid-cols-3 lg:grid-cols-4/);
  assert.doesNotMatch(panel, /bg-\\[#1d2a1b\\]/);
  assert.doesNotMatch(panel, /radial-gradient/);
});
