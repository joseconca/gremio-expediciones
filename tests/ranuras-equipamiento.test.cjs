require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { obtenerIdsObjetosEquipados, CAMPOS_EQUIPO_PERSISTIDO, estaInstanciaEquipadaPersistida } = require("../src/lib/equipamiento/ranuras.ts");

test("la venta y la forja consultan todas las ranuras persistidas con una sola función", () => {
  assert.equal(CAMPOS_EQUIPO_PERSISTIDO.length, 10);
  assert.equal(new Set(CAMPOS_EQUIPO_PERSISTIDO).size, 10);
  for (const campo of CAMPOS_EQUIPO_PERSISTIDO) {
    const equipo = { [campo]: "instancia-1" };
    assert.equal(estaInstanciaEquipadaPersistida(equipo, "instancia-1"), true, campo);
    assert.equal(estaInstanciaEquipadaPersistida(equipo, "otra"), false, campo);
  }
  assert.equal(estaInstanciaEquipadaPersistida(null, "instancia-1"), false);
  assert.equal(estaInstanciaEquipadaPersistida({}, "instancia-1"), false);
  for (const ruta of ["src/app/api/objetos/vender/route.ts", "src/app/api/objetos/mejorar/route.ts"]) {
    const fuente = fs.readFileSync(path.join(__dirname, "..", ruta), "utf8");
    assert.match(fuente, /estaInstanciaEquipadaPersistida/);
    assert.doesNotMatch(fuente, /const CAMPOS_EQUIPO = \[/);
  }
});

test("el equipo nulo o vacío no produce identificadores", () => {
  assert.deepEqual([...obtenerIdsObjetosEquipados(null)], []);
  assert.deepEqual([...obtenerIdsObjetosEquipados(undefined)], []);
  assert.deepEqual([...obtenerIdsObjetosEquipados({})], []);
});

test("las diez ranuras quedan contempladas sin duplicar instancias a dos manos", () => {
  const ranuras = ["arma", "manoSecundaria", "casco", "armadura", "pantalones",
    "botas", "guantes", "accesorio", "anillo1", "anillo2"];
  const equipo = Object.fromEntries(ranuras.map((ranura) => [ranura, { id: "instancia-" + ranura }]));
  assert.deepEqual([...obtenerIdsObjetosEquipados(equipo)], ranuras.map(x => "instancia-" + x));
  equipo.manoSecundaria = { id: "instancia-arma" };
  assert.equal(obtenerIdsObjetosEquipados(equipo).size, 9);
});

test("la consulta no muta equipo ni inventario, y solo acepta IDs de instancia", () => {
  const equipo = Object.freeze({ arma: Object.freeze({ id: "a" }), casco: null, anillo1: { id: 3 } });
  assert.deepEqual([...obtenerIdsObjetosEquipados(equipo)], ["a"]);
  assert.equal(equipo.arma.id, "a");
});

test("Armería, Herrería y Personaje reutilizan la misma consulta sin listar diez ranuras por separado", () => {
  for (const ruta of ["src/app/base/armeria/page.tsx", "src/app/base/herreria/page.tsx", "src/app/base/personaje/page.tsx"]) {
    const texto = fs.readFileSync(path.join(__dirname, "..", ruta), "utf8");
    assert.match(texto, /obtenerIdsObjetosEquipados\(datos(?:Objetos)?\?\.equipo\)/);
  }
});
