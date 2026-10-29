const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const page = fs.readFileSync(path.join(root, "src/app/base/escuela-batalla/page.tsx"), "utf8");
const personaje = fs.readFileSync(path.join(root,"src/app/base/personaje/page.tsx"),"utf8");

test("la redistribución de puntos se gestiona desde la Escuela de Batalla", () => {
  const claseActual = page.indexOf('aria-label="Profesión activa"');
  const puntosJob = page.indexOf("Puntos Job ·");
  const redistribuir = page.indexOf("Redistribuir puntos de habilidad");
  const navegacion = page.indexOf("{navegacion}");

  assert.ok(claseActual >= 0 && puntosJob >= 0 && redistribuir >= 0 && navegacion >= 0);
  assert.ok(claseActual < puntosJob && puntosJob < redistribuir && redistribuir < navegacion);
  assert.ok(page.includes("costeReinicioHabilidades(nivelJob)"));
  assert.ok(page.includes('fetch("/api/habilidades/reiniciar"'));
  assert.ok(page.includes("const reiniciarHabilidades = async"));
  assert.ok(page.includes("procesando !== null || habilidadesPropias.length === 0"));
  assert.ok(page.includes("costeReseteo} oro)"));
});

test("Escuela filtra el aprendizaje y la hoja de personaje filtra las habilidades aprendidas", () => {
  assert.ok(page.includes("const filtrosCatalogo = ("));
  assert.ok(page.includes('aria-label="Clase de las habilidades"'));
  assert.ok(page.includes("opcionesClaseCatalogo.map"));
  assert.ok(page.includes("Incluir habilidades de otras clases de mi rama"));
  assert.equal(page.split("{filtrosCatalogo}").length - 1, 1);
  assert.ok(personaje.includes('aria-label="Clase de las habilidades aprendidas"'));
  assert.ok(personaje.includes('aria-label="Buscar habilidad"'));
});

test("el selector filtra por clase de origen y permite mostrar habilidades aprendidas fuera de la clase activa", () => {
  assert.ok(page.includes('claseCatalogoSeleccionada !== "todas" && clasePropietariaId !== claseCatalogoSeleccionada'));
  assert.ok(personaje.includes("const habilidadesFiltradas = useMemo"));
  assert.ok(personaje.includes("clasesConHabilidadesAprendidas"));
  assert.ok(personaje.includes('claseHabilidadSeleccionada!=="todas"&&claseId!==claseHabilidadSeleccionada'));
  assert.ok(page.includes("cambiarClaseCatalogo"));
});
