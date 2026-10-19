const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const page = fs.readFileSync(path.join(root, "src/app/base/escuela-batalla/page.tsx"), "utf8");

test("la navegación de la Escuela de Batalla aparece después de la clase actual y del reinicio", () => {
  const navegacion = page.indexOf("{navegacion}");
  const claseActual = page.indexOf('aria-label="Profesión activa"');
  const redistribuir = page.indexOf("Redistribuir habilidades de");

  assert.ok(claseActual >= 0 && redistribuir >= 0 && navegacion >= 0);
  assert.ok(claseActual < redistribuir && redistribuir < navegacion);
});

test("el catálogo ofrece buscador, selector de clase y filtro de rama en ambas vistas", () => {
  assert.ok(page.includes("const filtrosCatalogo = ("));
  assert.ok(page.includes('aria-label="Clase de las habilidades"'));
  assert.ok(page.includes("opcionesClaseCatalogo.map"));
  assert.ok(page.includes("Incluir habilidades de otras clases de mi rama"));
  assert.equal(page.split("{filtrosCatalogo}").length - 1, 2);
});

test("el selector filtra por clase de origen y permite mostrar habilidades aprendidas fuera de la clase activa", () => {
  assert.ok(page.includes('claseCatalogoSeleccionada !== "todas" && clasePropietariaId !== claseCatalogoSeleccionada'));
  assert.ok(page.includes("const habilidadesNoEquipadasVisibles = useMemo"));
  assert.ok(page.includes("clasesConHabilidadesAprendidas"));
  assert.ok(page.includes("cambiarClaseCatalogo"));
});
