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


test("el turno enemigo espera antes de atacar tanto en solitario como en party", () => {
  const combate = read("src/components/combate/CombateModal.tsx");
  const party = read("src/components/base/PanelParty.tsx");
  const esperaMain = /Math\.random\(\) \* 1200 \+ 300/;
  assert.match(combate, esperaMain, "PvE debe conservar la pausa de main");
  assert.match(party, esperaMain, "party también debe pausar antes de resolver el turno enemigo");
  assert.match(party, /await new Promise<void>\(\(resolve\) => window\.setTimeout\(resolve, tiempoEsperaEnemigo\)\)/);
});

test("los ataques de varios enemigos se animan por separado con una pausa de un segundo", () => {
  const contrato = read("src/lib/expediciones/combate.ts");
  const pve = read("src/server/services/combate/pve.ts");
  const party = read("src/server/services/party/combate-party-actions.ts");
  const hook = read("src/components/combate/animaciones/useAnimacionesCombate.ts");

  assert.match(contrato, /impactosEnemigos\?:\s*\{/);
  assert.match(pve, /impactosEnemigos:\s*impactos\.map\(\(impacto\) => \(\{/);
  assert.match(party, /impactosEnemigos:\s*impactos\.map\(\(impacto\) => \(\{/);
  assert.match(hook, /if \(impactosEnemigos\.length > 1\)/);
  assert.match(hook, /PAUSA_ENTRE_ATAQUES_ENEMIGOS_MS = 1000/);
  assert.match(hook, /await esperar\(PAUSA_ENTRE_ATAQUES_ENEMIGOS_MS, temporizadoresRef\.current\)/);
  assert.match(hook, /setActoresAnimando\(\[impacto\.actorEnemigoId\]\)/);
});

test("el golpe terminal mantiene visible el impacto antes del resultado y el asedio no lo superpone inmediatamente", () => {
  const hook = read("src/components/combate/animaciones/useAnimacionesCombate.ts");
  const combate = read("src/components/combate/CombateModal.tsx");
  const asedio = read("src/components/combate/AsedioModal.tsx");
  assert.match(hook, /DURACION_IMPACTO_FINAL_EXTRA_MS = 550/);
  assert.match(hook, /opciones\.esResultadoTerminal\?\.\(\)/);
  assert.match(combate, /esResultadoTerminal: \(\) => faseCombateRef\.current !== "activo"/);
  assert.match(asedio, /const \[mostrarResultado, setMostrarResultado\] = useState\(false\)/);
  assert.match(asedio, /if \(faseCombateRef\.current !== "activo"\) setMostrarResultado\(true\)/);
});
