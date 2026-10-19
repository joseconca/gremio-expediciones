const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (relative) => fs.readFileSync(path.join(__dirname, "..", relative), "utf8");

test("Armería deja la gestión de equipo y mochila en Personaje, y Escuela conserva las secciones de aprendizaje", () => {
  const armeria = read("src/app/base/armeria/page.tsx");
  const escuela = read("src/app/base/escuela-batalla/page.tsx");
  assert.match(armeria, /Abrir Personaje/);
  assert.doesNotMatch(armeria, /EQUIPO · DISTRIBUCIÓN MMORPG/);
  assert.doesNotMatch(armeria, /Inventario de objetos/);
  assert.doesNotMatch(escuela, /Habilidades aprendidas/);
  assert.match(escuela, /Aprender habilidades/);
  assert.match(escuela, /Profesiones/);
  assert.match(escuela, /Tácticas/);
});

test("el botón global del aventurero y la navegación móvil abren Personaje", () => {
  const layout = read("src/app/base/layout.tsx");
  assert.match(layout, /onClick=\{\(\) => router\.push\("\/base\/personaje"\)\}/);
  assert.match(layout, /href="\/base\/personaje"/);
  assert.match(layout, /<span>Personaje<\/span>/);
  assert.match(layout, /grid-cols-5/);
});

test("la Botica forma parte del poblado y reutiliza el sprite del Mercado", () => {
  const configuracion = read("src/lib/tiposJuego.ts");
  const tienda = read("src/app/base/botica/page.tsx");
  const estado = read("src/store/useGameStore.ts");
  const panel = read("src/components/base/PanelEdificios.tsx");
  const compra = read("src/app/api/objetos/comprar/route.ts");
  const boticaSprite = path.join(__dirname, "..", "public/sprites/buildings/botica.png");
  const mercadoSprite = path.join(__dirname, "..", "public/sprites/buildings/mercado.png");

  assert.match(configuracion, /botica:\s*\{[\s\S]*?costeConstruccion: 900,[\s\S]*?costeMadera: 6,[\s\S]*?costePiedra: 5,[\s\S]*?costeMetal: 1,[\s\S]*?nivelMax: 3,[\s\S]*?ruta: "\/base\/botica"/);
  assert.match(estado, /EDIFICIOS_BASE\.botica/);
  assert.match(panel, /"botica"/);
  assert.match(tienda, /Mostrador del boticario/);
  assert.match(tienda, /OBJETOS[\s\S]*?vendibleEnBotica/);
  assert.match(compra, /nivelBotica/);
  assert.ok(fs.existsSync(boticaSprite), "Debe existir el sprite de la Botica.");
  assert.deepEqual(fs.readFileSync(boticaSprite), fs.readFileSync(mercadoSprite), "La Botica reutiliza el sprite temporal del Mercado.");
});

test("la Armería permite vender armas y armaduras y recomprar la última venta", () => {
  const pagina = read("src/app/base/armeria/page.tsx");
  assert.match(pagina, /calcularPrecioVentaObjeto/);
  assert.match(pagina, /item\.objeto\.tipo === "arma" \|\| item\.objeto\.tipo === "armadura"/);
  assert.match(pagina, /\/api\/objetos\/vender/);
  assert.match(pagina, /\/api\/objetos\/recomprar/);
  assert.match(pagina, /Recomprar " \+ ventaAnterior\.nombreObjeto/);
  assert.match(pagina, /idsEquipados\.has\(item\.id\)/);
  assert.match(pagina, /bloqueadoPorEstado/);
});

test("la Botica muestra solo el nivel desbloqueado y agrupa el catálogo en Pociones y Elixires", () => {
  const pagina = read("src/app/base/botica/page.tsx");
  assert.match(pagina, /objeto\.vendibleEnBotica && \(objeto\.nivelBoticaRequerido \?\? 1\) <= nivelBotica/);
  assert.match(pagina, /titulo: "Pociones"/);
  assert.match(pagina, /titulo: "Elixires"/);
  assert.match(pagina, /!objeto\.id\.startsWith\("elixir_"\)/);
  assert.match(pagina, /objeto\.id\.startsWith\("elixir_"\)/);
  assert.doesNotMatch(pagina, /Fórmulas de nivel/);
  assert.doesNotMatch(pagina, /Requiere Botica/);
});

test("la cabecera de Personaje ya no repite las cuatro estadísticas resumidas", () => {
  const pagina = read("src/app/base/personaje/page.tsx");
  const inicio = pagina.indexOf('<header className="mb-4');
  const fin = pagina.indexOf("</header>", inicio);
  const cabecera = pagina.slice(inicio, fin);

  assert.ok(inicio >= 0 && fin > inicio, "Debe existir la cabecera principal de Personaje.");
  for (const etiqueta of ["Vida máxima", "Ataque físico", "Defensa física", "Ataque mágico"]) {
    assert.ok(!cabecera.includes(etiqueta), `La cabecera no debe repetir ${etiqueta}.`);
  }
});

test("la pantalla de Personaje centraliza equipo, mochila por categorías y gestión de habilidades", () => {
  const pagina = read("src/app/base/personaje/page.tsx");
  assert.match(pagina, /Secciones del personaje/);
  assert.match(pagina, /useState<SeccionPersonaje>\("personaje"\)/);
  assert.match(pagina, /id: "personaje" as const, label: "Personaje"/);
  assert.match(pagina, /label: "Equipo"/);
  assert.match(pagina, /label: "Mochila"/);
  assert.match(pagina, /label: "Habilidades"/);
  assert.match(pagina, /Atributos principales/);
  assert.match(pagina, /Estadísticas de combate/);
  assert.match(pagina, /aria-label="Vista de equipamiento"/);
  assert.match(pagina, /grid-cols-\[minmax\(0,1fr\)_92px_minmax\(0,1fr\)\]/);
  assert.match(pagina, /sm:grid-cols-\[minmax\(0,1fr\)_148px_minmax\(0,1fr\)\]/);
  assert.match(pagina, /obtenerObjetosCompatiblesRanura/);
  assert.match(pagina, /No hay objetos compatibles en la mochila/);
  assert.match(pagina, /aria-expanded=\{ranuraSeleccionada === ranura\.clave\}/);
  assert.doesNotMatch(pagina, /Ver en equipo/);
  assert.match(pagina, /ranuraEquipada/);
  assert.match(pagina, /enviarAccionObjeto\("desequipar", undefined, ranuraEquipada\)/);
  assert.doesNotMatch(pagina, /Abrir mochila →/);
  assert.doesNotMatch(pagina, /Redistribuir ·/);
  assert.match(pagina, /Gestionar en Escuela de Batalla/);
  assert.match(pagina, /armaDosManosEquipada/);
  for (const categoria of ["Armas", "Armaduras", "Accesorios", "Consumibles", "Varios"]) {
    assert.ok(pagina.includes(categoria), `Falta la categoría de mochila ${categoria}`);
  }
  assert.match(pagina, /\/api\/objetos\/equipar/);
  assert.match(pagina, /\/api\/objetos\/desequipar/);
  assert.match(pagina, /\/api\/habilidades\/equipar/);
  assert.match(pagina, /\/api\/habilidades\/desequipar/);
  assert.doesNotMatch(pagina, /\/api\/habilidades\/mejorar/);
  const escuela = read("src/app/base/escuela-batalla/page.tsx");
  assert.match(escuela, /\/api\/habilidades\/mejorar/);
});

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


test("la Armería separa las armas, armaduras y accesorios en secciones independientes", () => {
  const pagina = read("src/app/base/armeria/page.tsx");
  assert.match(pagina, /titulo: "Armas"[\s\S]*?objeto\.tipo === "arma"/);
  assert.match(pagina, /titulo: "Armaduras y escudos"[\s\S]*?objeto\.tipo === "armadura"/);
  assert.match(pagina, /titulo: "Accesorios"[\s\S]*?objeto\.tipo === "accesorio"/);
  assert.match(pagina, /grupo\.objetos\.map\(\(objeto\) =>/);
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

test("la hoja de personaje agrupa las bonificaciones de todos los objetos en una sola fila Equipo", () => {
  const hoja = read("src/components/HojaPersonajeModal.tsx");
  assert.match(hoja, /nombre: "Equipo", valor: desglose\.equipo\[stat\.clave\]/);
  assert.doesNotMatch(hoja, /equipoPorObjeto \?\? \[\]\)\.map/);
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
