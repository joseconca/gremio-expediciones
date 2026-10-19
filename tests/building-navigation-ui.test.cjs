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
  assert.ok(complejo.includes("h-11 items-center") && complejo.includes("sm:h-[52px]"));
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
  assert.ok(panel.includes("grid-cols-2") && panel.includes("md:grid-cols-3 lg:grid-cols-4"));
  assert.ok(!panel.includes("bg-[#1d2a1b]"));
  assert.doesNotMatch(panel, /radial-gradient/);
});

test("las ocho páginas de edificios muestran la descripción en la cabecera común", () => {
  const cabecera = read("src/components/base/CabeceraEdificio.tsx");
  assert.match(cabecera, /descripcion: string/);
  assert.match(cabecera, /\{descripcion\}/);
  const paginas = [
    "src/app/base/mercado/page.tsx",
    "src/app/base/taberna/page.tsx",
    "src/app/base/almacen/page.tsx",
    "src/app/base/muralla/page.tsx",
    "src/app/base/embajada/page.tsx",
    "src/app/base/escuela-batalla/page.tsx",
    "src/app/base/armeria/page.tsx",
    "src/app/base/herreria/page.tsx",
  ];
  for (const pagina of paginas) {
    const fuente = read(pagina);
    assert.match(fuente, /<CabeceraEdificio[\s\S]*?descripcion=/, pagina);
    assert.doesNotMatch(fuente, /ⓘ Sobre (el|la) (mercado|taberna)/, pagina);
  }
});

test("el Mercado tiene deslizador y control numérico para comprar y vender recursos", () => {
  const mercado = read("src/app/base/mercado/page.tsx");
  assert.match(mercado, /type="range"/);
  assert.match(mercado, /type="number"/);
  assert.match(mercado, /Comprar recursos/);
  assert.match(mercado, /Vender excedentes/);
  assert.match(mercado, /venderRecurso/);
  assert.match(mercado, /calcularPrecioVentaRecurso/);
});

test("los sprites y carteles de los edificios no crecen ni se iluminan al pasar el cursor", () => {
  const card = read("src/components/base/EdificioCard.tsx");
  const complejo = read("src/components/base/ComplejoArmeria.tsx");

  assert.doesNotMatch(card, /hover:scale-/);
  assert.doesNotMatch(card, /hover:border-amber/);
  assert.doesNotMatch(card, /hover:from-\[#956336\]|hover:to-\[#694325\]/);
  assert.doesNotMatch(complejo, /hover:scale-|hover:border-amber/);
  assert.doesNotMatch(complejo, /hover:bg-amber-300\/10|hover:text-amber-100/);
  assert.match(card, /focus-visible:ring-2/);
  assert.match(complejo, /focus-visible:ring-2/);
});
