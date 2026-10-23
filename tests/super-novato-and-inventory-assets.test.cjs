require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");
const { CLASES, obtenerClasesHabilidadDisponibles } = require("../src/lib/progresion/clases.ts");
const { obtenerHabilidadesDisponiblesParaClase } = require("../src/lib/habilidades.ts");
const {
  obtenerIconoObjeto,
  obtenerObjetosPorTipo,
  obtenerObjetoPorId,
  obtenerSpriteObjeto,
} = require("../src/lib/objetos.ts");

test("Super Novato hereda el catálogo de habilidades de las cuatro clases de Tier 1", () => {
  const tier1 = ["espadachin", "acolito", "arquero", "mago"];
  const disponibles = obtenerClasesHabilidadDisponibles("superNovato");
  for (const claseId of tier1) {
    assert.equal(CLASES[claseId].tier, 1);
    assert.ok(disponibles.includes(claseId), `Falta la rama Tier 1: ${claseId}`);
  }
  const habilidades = obtenerHabilidadesDisponiblesParaClase("superNovato");
  const clasesConHabilidades = new Set(habilidades.map((habilidad) => habilidad.claseId));
  for (const claseId of tier1) {
    assert.ok(clasesConHabilidades.has(claseId), `No se exponen habilidades de ${claseId}`);
  }
  for (const id of ["estocada_espadachin", "luz_acolito", "disparo_arquero", "chispa_mago"]) {
    assert.ok(habilidades.some((habilidad) => habilidad.id === id), `No aparece ${id}`);
  }
});

test("la API y la Escuela de Batalla activan las habilidades Tier 1 para Super Novato", () => {
  const api = read("src/app/api/habilidades/route.ts");
  const escuela = read("src/app/base/escuela-batalla/page.tsx");
  assert.match(api, /profesionActivaId === "superNovato"/);
  assert.match(escuela, /const esSuperNovato = profesionId === "superNovato"/);
  assert.match(escuela, /checked={incluirCatalogoDeRama}/);
  assert.match(escuela, /disabled={esSuperNovato}/);
});

test("las miniaturas devueltas para consumibles apuntan a assets existentes y los demás tienen icono temático", () => {
  const consumibles = obtenerObjetosPorTipo("consumible");
  assert.ok(consumibles.length > 0);
  for (const objeto of consumibles) {
    const sprite = obtenerSpriteObjeto(objeto);
    if (sprite) {
      assert.ok(
        fs.existsSync(path.join(ROOT, "public", sprite.replace(/^\//, ""))),
        `El sprite de ${objeto.id} no existe: ${sprite}`,
      );
    } else {
      assert.notEqual(obtenerIconoObjeto(objeto), "🎒", `Falta un icono de consumible para ${objeto.id}`);
    }
  }
  for (const id of ["pocion", "pocion_grande", "pocion_vida_menor", "pocion_vida_mediana", "pocion_vida_mayor", "pocion_mana_basica", "pocion_energia", "pocion_suprema"]) {
    const objeto = obtenerObjetoPorId(id);
    assert.ok(objeto, `No existe consumible ${id}`);
    assert.equal(obtenerSpriteObjeto(objeto), "/sprites/items/consumables/pocion.png");
  }
  assert.equal(obtenerIconoObjeto(obtenerObjetoPorId("ceniza_fenix")), "🔥");
  assert.equal(obtenerIconoObjeto(obtenerObjetoPorId("elixir_guerrero")), "⚗️");
  assert.match(read("src/app/base/personaje/page.tsx"), /obtenerIconoObjeto\(objeto\)/);
});

test("el retrato pequeño del layout usa un zoom más moderado y encuadre desplazado hacia abajo", () => {
  const layout = read("src/app/base/layout.tsx");
  const css = read("src/app/globals.css");
  assert.match(layout, /className="avatar-face-image-layout/);
  assert.match(css, /\.avatar-face-image-layout\s*\{[^}]*object-position:\s*center 0%;[^}]*transform:\s*scale\(1\.65\)/);
});
