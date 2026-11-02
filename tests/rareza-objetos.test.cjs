require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { nombreRareza, estiloRareza, NOMBRES_RAREZA_OBJETO } = require("../src/components/objetos/resumen-objeto.ts");
const { NOMBRES_RAREZA_OBJETO: NOMBRES_RAREZA_DETALLES, obtenerDetallesObjeto } = require("../src/components/objetos/detalles-objeto.ts");
const read = (relative) => fs.readFileSync(path.join(__dirname, "..", relative), "utf8");

const rarezas = [
  ["basico", "Básico", "border-neutral-500/60 bg-[#34383a] text-[#ddd8cf]", "border-neutral-500/60 bg-[#34383a] text-[#ddd8cf]", "border-neutral-500/60 bg-neutral-900/60 text-neutral-300"],
  ["comun", "Común", "border-green-700/60 bg-[#233329] text-green-300", "border-green-700/60 bg-[#233329] text-green-400", "border-emerald-700/60 bg-emerald-950/40 text-emerald-300"],
  ["poco_comun", "Poco común", "border-sky-600/60 bg-[#21333d] text-sky-300", "border-sky-600/60 bg-[#21333d] text-sky-300", "border-sky-700/60 bg-sky-950/40 text-sky-300"],
  ["raro", "Raro", "border-amber-600/60 bg-[#40351f] text-amber-300", "border-amber-600/60 bg-[#40351f] text-amber-300", "border-amber-700/60 bg-amber-950/40 text-amber-300"],
  ["epico", "Épico", "border-fuchsia-700/60 bg-[#392538] text-fuchsia-300", "border-fuchsia-700/60 bg-[#392538] text-fuchsia-300", "border-fuchsia-700/60 bg-fuchsia-950/40 text-fuchsia-300"],
  ["legendario", "Legendario", "border-red-700/60 bg-[#402322] text-red-300", "border-red-700/60 bg-[#402322] text-red-300", "border-red-700/60 bg-red-950/40 text-red-300"],
];

test("las seis rarezas mantienen sus nombres y sus colores anteriores en las tres vistas", () => {
  for (const [id, etiqueta, aventurero, tienda, botica] of rarezas) {
    assert.equal(nombreRareza(id), etiqueta);
    assert.equal(estiloRareza(id), aventurero);
    assert.equal(estiloRareza(id, "aventurero"), aventurero);
    assert.equal(estiloRareza(id, "tienda"), tienda);
    assert.equal(estiloRareza(id, "botica"), botica);
  }
});

test("Armería, Herrería y Botica usan el mismo catálogo con su variante visual propia", () => {
  for (const ruta of ["src/app/base/armeria/page.tsx", "src/app/base/herreria/page.tsx"]) {
    const pagina = read(ruta);
    assert.match(pagina, /import \{ nombreRareza, estiloRareza \} from "@\/components\/objetos\/resumen-objeto"/);
    assert.match(pagina, /estiloRareza\(objeto\.rareza, "tienda"\)/);
    assert.doesNotMatch(pagina, /function nombreRareza\(/);
    assert.doesNotMatch(pagina, /function estiloRareza\(/);
  }
  const botica = read("src/app/base/botica/page.tsx");
  assert.match(botica, /estiloRareza\(objeto\.rareza, "botica"\)/);
  assert.doesNotMatch(botica, /function nombreRareza\(/);
  assert.doesNotMatch(botica, /function estiloRareza\(/);
});

test("las ventanas de detalles utilizan el mismo catálogo de nombres de rareza", () => {
  assert.strictEqual(NOMBRES_RAREZA_DETALLES, NOMBRES_RAREZA_OBJETO);
  for (const [id, nombre] of rarezas.map(([id, nombre]) => [id, nombre])) {
    assert.equal(NOMBRES_RAREZA_OBJETO[id], nombre);
    const detalles = obtenerDetallesObjeto({ id: "objeto_prueba", tipo: "arma", rareza: id, nombre: "Arma", descripcion: "Prueba" });
    assert.ok(detalles.includes("Rareza: " + nombre + "."));
  }
});
