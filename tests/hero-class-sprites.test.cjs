const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));

test("todas las clases jugables tienen sprite femenino, masculino y emblema provisional", () => {
  const clases = read("src/lib/progresion/clases.ts");
  const ids = [...clases.matchAll(/^\s{2}([a-z][a-z0-9_]+): \{\n\s*id: "\1",\s*nombre:/gm)]
    .map((coincidencia) => coincidencia[1]);
  assert.ok(ids.length >= 30, `Se esperaban las clases jugables actuales; detectadas: ${ids.length}`);
  for (const id of [...new Set([...ids, "guerrero", "comerciante"])]) {
    assert.ok(exists(`public/sprites/heroes/${id}/${id}-m.png`), `Falta el sprite masculino de ${id}`);
    assert.ok(exists(`public/sprites/heroes/${id}/${id}-f.png`), `Falta el sprite femenino de ${id}`);
    assert.ok(exists(`public/sprites/heroes/${id}/${id}-logo.svg`), `Falta el emblema de ${id}`);
  }
});

test("los sprites priorizan la profesión activa y mantienen el fallback de las clases antiguas", () => {
  const config = read("src/lib/configuracionJuego.ts");
  assert.match(config, /profesionActivaId && Object\.prototype\.hasOwnProperty\.call\(CLASES, profesionActivaId\)/);
  assert.match(config, /Novato: "novato"/);
  assert.match(config, /claseLegacy && \(!profesionActivaId \|\| profesionActivaId === "novato"\)/);
  assert.match(config, /Guerrero: "guerrero"/);
  assert.match(config, /Comerciante: "comerciante"/);
  assert.match(config, /\/sprites\/heroes\/\$\{idClase\}\/\$\{idClase\}-\$\{sufijoSexo\}\.png/);
  assert.match(config, /obtenerLogoClaseHeroe/);
});

test("el contrato de spritesheets define las 15 filas y resuelve rutas por clase y sexo", () => {
  const config = read("src/lib/configuracionJuego.ts");
  const docs = read("docs/plan-spritesheets-hd-128x256.md");

  assert.match(config, /FILAS_ANIMACION_SPRITESHEET_HEROE = \[/);
  const filas = config.match(/\{ id: "attack_[a-z]+", nombre:/g) ?? [];
  assert.equal(filas.length, 9, "Deben existir nueve filas de ataque, una por cada arma definida.");
  assert.match(config, /id: "use_consumable", nombre: "Usar consumible", fila: 3/);
  assert.match(config, /id: "block_shield", nombre: "Bloquear con escudo", fila: 5/);
  assert.match(config, /width: 64|64 × 128/);
  assert.match(config, /\$\{idClase\}-\$\{sufijoSexo\}-sheet\.png/);
  assert.match(config, /const sufijoSexo = sexo === "chica" \? "f" : "m"/);
  assert.match(docs, /256 × 1920 px/);
  assert.match(docs, /Quince filas de animación/);
  assert.match(docs, /attack_gloves/);
});



test("la animación horizontal encuadra cuatro fotogramas completos sin deriva", () => {
  const component = read("src/components/combate/SpriteHeroeAnimado.tsx");
  const css = read("src/app/globals.css");
  assert.ok(component.includes('backgroundSize: "400% 1500%"'), "El atlas debe seguir mostrando 4 columnas y 15 filas.");
  assert.ok(component.includes('hero-sprite-four-frames ${duracion}ms linear ${repeticion}'), "Las posiciones del CSS controlan el paso por frame.");
  assert.match(css, /0%\s*\{\s*background-position-x: 0%;/);
  assert.match(css, /25%\s*\{\s*background-position-x: 33\.333333%;/);
  assert.match(css, /50%\s*\{\s*background-position-x: 66\.666667%;/);
  assert.match(css, /75%\s*\{\s*background-position-x: 100%;/);
  assert.match(css, /animation-timing-function: steps\(1, end\)/);
  assert.match(component, /fila \/ \(FILAS_ANIMACION_SPRITESHEET_HEROE\.length - 1\)/);
});

test("el cartel de compañía y los participantes de expedición identifican la clase de cada aventurero", () => {
  const panel = read("src/components/base/PanelParty.tsx");
  const servicio = read("src/server/services/party/party-service.ts");
  assert.match(panel, /obtenerLogoClaseHeroe/);
  assert.match(panel, /obtenerNombreClaseHeroe/);
  assert.match(panel, /Líder de la compañía/);
  assert.match(panel, /profesionActivaId\?: string \| null/);
  assert.match(servicio, /profesionActivaId: true/);
});






test("el validador de Tier 0/1 acepta retratos 2x derivados de Idle", () => {
  const validator = read("scripts/validar-integracion-sprites-v2.py");
  assert.ok(validator.includes("PORTRAIT = (128, 256)"));
  assert.ok(validator.includes("frames[0].resize(PORTRAIT, Image.Resampling.NEAREST)"));
});
