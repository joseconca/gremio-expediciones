const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createElement } = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const ts = require("typescript");

require("./load-typescript.cjs");
require.extensions[".tsx"] = (module, filename) => module._compile(
  ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText,
  filename,
);
require.extensions[".css"] = (module) => { module.exports = {}; };

const PanelEdificios = require("../src/components/base/PanelEdificios.tsx").default;
const { trazarPoblado } = require("../src/components/base/plano-poblado.ts");
const { calcularLuzPoblado } = require("../src/components/base/luz-poblado.ts");
const { CONFIGURACION_EDIFICIOS } = require("../src/lib/base/edificios.ts");

const read = (relative) => fs.readFileSync(path.join(__dirname, "..", relative), "utf8");
const edificio = (id, nivel = 1) => ({ id, nivel, ...CONFIGURACION_EDIFICIOS[id] });
const renderPoblado = (...edificios) => renderToStaticMarkup(createElement(PanelEdificios, { edificios }));

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

test("la Botica forma parte del poblado y conserva su sprite propio", () => {
  const configuracion = read("src/lib/base/edificios.ts");
  const tienda = read("src/app/base/botica/page.tsx");
  const estado = read("src/store/useGameStore.ts");
  const panel = renderPoblado(edificio("botica"));
  const compra = read("src/app/api/objetos/comprar/route.ts");
  const boticaSprite = path.join(__dirname, "..", "public/sprites/buildings/botica.png");
  const mercadoSprite = path.join(__dirname, "..", "public/sprites/buildings/mercado.png");

  assert.match(configuracion, /botica:\s*\{[\s\S]*?costeConstruccion: 900,[\s\S]*?costeMadera: 6,[\s\S]*?costePiedra: 5,[\s\S]*?costeMetal: 1,[\s\S]*?nivelMax: 3,[\s\S]*?ruta: "\/base\/botica"/);
  assert.match(estado, /EDIFICIOS_BASE\.botica/);
  assert.match(panel, /data-edificio="botica"/);
  assert.match(panel, /src="\/sprites\/buildings\/botica\.png"/);
  assert.match(tienda, /Mostrador del boticario/);
  assert.match(tienda, /OBJETOS[\s\S]*?vendibleEnBotica/);
  assert.match(compra, /nivelBotica/);
  assert.ok(fs.existsSync(boticaSprite), "Debe existir el sprite de la Botica.");
  const png = fs.readFileSync(boticaSprite);
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", "El sprite de la Botica debe ser un PNG válido.");
  assert.ok(png.readUInt32BE(16) > 0 && png.readUInt32BE(20) > 0);
  assert.notDeepEqual(png, fs.readFileSync(mercadoSprite), "La Botica conserva su diseño propio en lugar del antiguo recurso temporal.");
});

test("Personaje y Botica usan la navegación común y Botica incluye solo la mochila de consumibles", () => {
  const personaje = read("src/app/base/personaje/page.tsx");
  const botica = read("src/app/base/botica/page.tsx");

  assert.match(personaje, /href="\/base" className="shrink-0 rounded-lg bg-slate-800[\s\S]*?← Volver/);
  assert.doesNotMatch(personaje, /← Volver a la base/);
  assert.match(botica, /<CabeceraEdificio/);
  assert.doesNotMatch(botica, /href="\/base\/personaje"/);
  assert.doesNotMatch(botica, /href="\/base"[^>]*>← Volver a la base/);
  assert.match(botica, /<MochilaBotica/);
  assert.match(read("src/components/botica/MochilaBotica.tsx"), /Mochila · Consumibles/);
  assert.match(botica, /datos\.inventario\.filter\(\(item\) => item\.objeto\.tipo === "consumible"\)/);
  assert.match(read("src/components/botica/MochilaBotica.tsx"), /consumibles\.map\(\(item\) =>/);
  assert.match(botica, /await Promise\.all\(\[cargarJugador\(\), cargarMochila\(\)\]\)/);
});

test("la Armería permite vender armas y armaduras y recomprar la última venta", () => {
  const pagina = read("src/app/base/armeria/page.tsx");
  assert.match(read("src/components/armeria/VentaArmeria.tsx"), /calcularPrecioVentaObjeto/);
  assert.match(pagina, /item\.objeto\.tipo === "arma" \|\| item\.objeto\.tipo === "armadura"/);
  assert.match(pagina, /\/api\/objetos\/vender/);
  assert.match(pagina, /\/api\/objetos\/recomprar/);
  assert.match(read("src/components/armeria/VentaArmeria.tsx"), /Recomprar " \+ ventaAnterior\.nombreObjeto/);
  assert.match(read("src/components/armeria/VentaArmeria.tsx"), /idsEquipados\.has\(item\.id\)/);
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
  // La presentación de atributos y estadísticas pertenece ahora a RegistroAventurero.
  assert.match(pagina, /<RegistroAventurero personaje=\{personaje\}/);
  const registro = read("src/components/personaje/RegistroAventurero.tsx");
  assert.match(registro, /Atributos principales/);
  assert.match(registro, /Estadísticas de combate/);
  const equipo = read("src/components/personaje/EquipoPersonaje.tsx");
  assert.match(pagina, /<EquipoPersonaje/);
  assert.match(equipo, /aria-label="Vista de equipamiento"/);
  assert.match(equipo, /grid-cols-\[minmax\(0,1fr\)_92px_minmax\(0,1fr\)\]/);
  assert.match(equipo, /sm:grid-cols-\[minmax\(0,1fr\)_148px_minmax\(0,1fr\)\]/);
  assert.match(equipo, /obtenerObjetosCompatiblesRanura/);
  assert.match(equipo, /No hay objetos compatibles en la mochila/);
  assert.match(equipo, /aria-expanded=\{ranuraSeleccionada === ranura\.clave\}/);
  assert.doesNotMatch(pagina, /Ver en equipo/);
  const mochila = read("src/components/personaje/MochilaPersonaje.tsx");
  assert.match(pagina, /<MochilaPersonaje/);
  assert.match(mochila, /ranuraEquipada/);
  assert.match(mochila, /onAccionObjeto\("desequipar", undefined, ranuraEquipada\)/);
  assert.doesNotMatch(pagina, /Abrir mochila →/);
  assert.doesNotMatch(pagina, /Redistribuir ·/);
  assert.match(pagina, /<HabilidadesPersonaje/);
  const habilidades = read("src/components/personaje/HabilidadesPersonaje.tsx");
  assert.match(habilidades, /Gestionar en Escuela de Batalla/);
  assert.match(habilidades, /Ranuras preparadas/);
  assert.match(habilidades, /Todas las aprendidas/);
  assert.match(equipo, /armaDosManosEquipada/);
  for (const categoria of ["Armas", "Armaduras", "Accesorios", "Consumibles", "Varios"]) {
    assert.ok(mochila.includes(categoria), `Falta la categoría de mochila ${categoria}`);
  }
  assert.match(pagina, /\/api\/objetos\/equipar/);
  assert.match(pagina, /\/api\/objetos\/desequipar/);
  assert.match(pagina, /\/api\/habilidades\/equipar/);
  assert.match(pagina, /\/api\/habilidades\/desequipar/);
  assert.doesNotMatch(pagina, /\/api\/habilidades\/mejorar/);
  const escuela = read("src/app/base/escuela-batalla/page.tsx");
  assert.match(escuela, /\/api\/habilidades\/mejorar/);
});

test("cada edificio construido tiene un solo enlace con su rótulo y descripción", () => {
  const panel = renderPoblado(edificio("taberna"), edificio("botica", 0));
  assert.match(panel, /data-world-layer="building" data-edificio="taberna"/);
  assert.match(panel, /<a aria-label="Entrar en Taberna" title="[^"]+" href="\/base\/taberna"><span>Taberna<\/span><\/a>/);
  assert.equal((panel.match(/href="\/base\/taberna"/g) || []).length, 1);
  assert.doesNotMatch(panel, /data-edificio="botica"|\/base\/botica/);
});

test("Armería y Herrería comparten parcela con accesos independientes solo si se construyen ambas", () => {
  const armeria = edificio("armeria");
  const parcial = renderPoblado(armeria, edificio("herreria", 0));
  assert.match(parcial, /src="\/sprites\/buildings\/armeria\.png"/);
  assert.doesNotMatch(parcial, /\/base\/herreria|armeria-herreria\.png/);

  const complejo = renderPoblado(armeria, edificio("herreria"));
  assert.match(complejo, /src="\/sprites\/buildings\/armeria-herreria\.png"/);
  assert.match(complejo, /aria-label="Entrar en Armería"[^>]+href="\/base\/armeria"/);
  assert.match(complejo, /aria-label="Entrar en Herrería"[^>]+href="\/base\/herreria"/);
  assert.equal((complejo.match(/data-world-layer="building"/g) || []).length, 1);

  const heredado = renderPoblado(edificio("armeria", 0), edificio("herreria"));
  assert.match(heredado, /src="\/sprites\/buildings\/herreria\.png"/);
  assert.doesNotMatch(heredado, /\/base\/armeria/);
});


test("la Armería separa las armas, armaduras y accesorios en secciones independientes", () => {
  const pagina = read("src/components/armeria/CatalogoArmeria.tsx");
  assert.match(pagina, /titulo: "Armas"[\s\S]*?objeto\.tipo === "arma"/);
  assert.match(pagina, /titulo: "Armaduras y escudos"[\s\S]*?objeto\.tipo === "armadura"/);
  assert.match(pagina, /titulo: "Accesorios"[\s\S]*?objeto\.tipo === "accesorio"/);
  assert.match(pagina, /grupo\.objetos\.map\(\(objeto\) =>/);
  assert.match(read("src/app/base/armeria/page.tsx"), /<CatalogoArmeria/);
});

test("el camino del poblado crece y cada ramal une un cruce con una entrada construida", () => {
  const taberna = edificio("taberna");
  const mercado = edificio("mercado");
  const botica = edificio("botica");
  const pequeno = trazarPoblado([taberna, mercado, { ...botica, nivel: 0 }]);
  const grande = trazarPoblado([botica, mercado, taberna]);
  assert.ok(grande.alto > pequeno.alto);
  assert.equal(pequeno.parcelas.length, 2);
  assert.equal(grande.parcelas.length, 3);

  const [principal, ...ramales] = grande.caminos;
  assert.deepEqual(principal.slice(0, 2), [{ x: grande.ancho / 2, y: 0 }, { x: grande.ancho / 2, y: 50 }]);
  assert.deepEqual(ramales.map((ramal) => ramal[0]), principal.slice(2));
  assert.deepEqual(ramales.map((ramal) => ramal.at(-1)), grande.parcelas.map((parcela) => parcela.entrada));
  assert.match(renderPoblado(taberna, mercado, botica), /data-world-layer="paths"[^>]*>[\s\S]*<path d="M 500 0 L 500 50/);
  assert.doesNotMatch(renderPoblado(edificio("taberna", 0)), /data-world-layer="paths"/);
});

test("la muralla no ocupa una parcela ni altera las entradas del poblado", () => {
  const taberna = edificio("taberna");
  assert.deepEqual(trazarPoblado([taberna, edificio("muralla")]), trazarPoblado([taberna]));
  assert.deepEqual(trazarPoblado([edificio("muralla")]).caminos, []);
  assert.doesNotMatch(renderPoblado(taberna, edificio("muralla")), /data-edificio="muralla"/);
});

test("la luz local recorre la escena de este a oeste y se apaga de noche", () => {
  const manana = calcularLuzPoblado(7.5);
  const mediodia = calcularLuzPoblado(12);
  const atardecer = calcularLuzPoblado(18.5);
  assert.ok(manana.posicionX > mediodia.posicionX && atardecer.posicionX < mediodia.posicionX);
  assert.ok(manana.posicionY > mediodia.posicionY && atardecer.posicionY > mediodia.posicionY);
  assert.ok(manana.sombraX < 0 && atardecer.sombraX > 0);
  assert.equal(mediodia.sombraX, 0);
  assert.ok(manana.inclinacionSombra < 0 && atardecer.inclinacionSombra > 0);
  assert.equal(mediodia.inclinacionSombra, 0);
  assert.ok(manana.largoSombra > mediodia.largoSombra);
  assert.ok(manana.solDirecto > atardecer.solDirecto);
  assert.equal(mediodia.solDirecto, 1);
  assert.ok(manana.calidez > mediodia.calidez && atardecer.calidez > mediodia.calidez);
  assert.equal(mediodia.claridad, 1);
  assert.equal(calcularLuzPoblado(3).claridad, 0);
  assert.equal(calcularLuzPoblado(22).claridad, 0);
  assert.equal(calcularLuzPoblado(22).solDirecto, 0);
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

test("el foco de teclado identifica el acceso sin agrandar los sprites ni los rótulos", () => {
  const estilos = read("src/components/base/PanelEdificios.module.css");
  assert.match(estilos, /\.acceso:focus-visible\s*\{[^}]*outline:/);
  assert.doesNotMatch(estilos, /:hover/);
});
