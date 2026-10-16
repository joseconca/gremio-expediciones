const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");

test("todos los tipos de proyectil tienen una ruta a un asset existente", () => {
  const tipos = read("src/lib/tiposJuego.ts");
  const componente = read("src/components/combate/animaciones/CapaEfectosCombate.tsx");
  const bloqueTipo = tipos.match(/export type TipoProyectilCombate =([\s\S]*?);/);
  const bloqueRutas = componente.match(/const RUTAS_PROYECTIL:[\s\S]*?= \{([\s\S]*?)\n\};/);
  assert.ok(bloqueTipo, "TipoProyectilCombate debe existir");
  assert.ok(bloqueRutas, "RUTAS_PROYECTIL debe existir");
  const tiposDefinidos = [...bloqueTipo[1].matchAll(/"([a-z_]+)"/g)].map((match) => match[1]).sort();
  const rutas = [...bloqueRutas[1].matchAll(/^\s*([a-z_]+): "(\/[^"]+)"[,]?\s*$/gm)]
    .map((match) => ({ tipo: match[1], ruta: match[2] }));
  assert.deepEqual(rutas.map((ruta) => ruta.tipo).sort(), tiposDefinidos);
  for (const { ruta } of rutas) {
    const archivo = path.join(ROOT, "public", ruta.replace(/^\//, ""));
    assert.ok(fs.existsSync(archivo), `No existe el asset de proyectil ${ruta}`);
  }
});

test("los proyectiles tienen fallback y el overlay calcula la trayectoria con anclas reales", () => {
  const componente = read("src/components/combate/animaciones/CapaEfectosCombate.tsx");
  assert.match(componente, /onError=\{\(\) => setFalloCarga\(true\)\}/);
  assert.match(componente, /if \(falloCarga\) return <span/);
  assert.match(componente, /getBoundingClientRect\(\)/);
  assert.match(componente, /capa\.parentElement\?\.querySelectorAll/);
  assert.match(componente, /idsActuales = new Set\(proyectiles\.map/);
  assert.match(componente, /posicionados\.filter\(\(proyectil\) => idsActuales\.has\(proyectil\.id\)\)/);
});

test("PvE, party y asedio montan la capa con anclas de todos los combatientes", () => {
  const pveParty = read("src/components/combate/CombateModal.tsx");
  const asedio = read("src/components/combate/AsedioModal.tsx");
  for (const contenido of [pveParty, asedio]) {
    assert.match(contenido, /<CapaEfectosCombate proyectiles=\{proyectilesVisibles\} \/>/);
    assert.match(contenido, /data-combate-ancla="jugador"/);
  }
  assert.match(pveParty, /data-combate-ancla=\{enemigo\.id\}/, "cada enemigo debe aportar su propia ancla");
  assert.match(asedio, /data-combate-ancla="enemigo"/, "el asedio PvP conserva su ancla singular");
  assert.match(pveParty, /data-combate-ancla=\{participante\.usuarioId\}/);
});

test("las animaciones nuevas respetan prefers-reduced-motion", () => {
  const css = read("src/app/globals.css");
  const reduccion = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.notEqual(reduccion, css, "Debe existir un bloque prefers-reduced-motion");
  assert.match(reduccion, /\.combate-numero-curacion[\s\S]*?animation: none !important;/);
  assert.match(reduccion, /\.combate-proyectil-vuelo[\s\S]*?animation-duration: 1ms !important;/);
});

test("el controlador cancela temporizadores obsoletos y muestra daño y curación como señales independientes", () => {
  const hook = read("src/components/combate/animaciones/useAnimacionesCombate.ts");
  assert.match(hook, /secuenciaRef\.current === secuencia/);
  assert.match(hook, /for \(const cancelar of temporizadores\.values\(\)\) cancelar\(\)/);
  assert.match(hook, /if \(dano > 0\) \{\s*setDanioVisible/);
  assert.match(hook, /if \(curacion > 0\) \{\s*setCuracionVisible/);
});

test("la defensa y cada pulso periódico tienen feedback visual y variante sin movimiento reducido", () => {
  const css = read("src/app/globals.css");
  const pveParty = read("src/components/combate/CombateModal.tsx");
  const asedio = read("src/components/combate/AsedioModal.tsx");
  assert.match(css, /@keyframes combate-defensa-resplandor/);
  assert.match(css, /@keyframes combate-estado-pulso/);
  assert.match(pveParty, /combate-defensa-resplandor/);
  assert.match(asedio, /combate-defensa-resplandor/);
  assert.match(pveParty, /combate-estado-pulso/);
  assert.match(asedio, /combate-estado-pulso/);
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reduced, /\.combate-defensa-resplandor\s*\{\s*animation: none !important;/);
  assert.match(reduced, /\.combate-estado-pulso/);
});
