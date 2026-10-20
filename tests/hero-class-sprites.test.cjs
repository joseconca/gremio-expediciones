const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));

test("todas las clases jugables tienen sprite femenino, masculino y emblema provisional", () => {
  const clases = read("src/lib/progresion/clases.ts");
  const ids = [...clases.matchAll(/^\s{2}([a-z][a-z0-9_]+): \{\n\s*id: "\1", nombre:/gm)]
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
  const docs = read("docs/spritesheets-personajes.md");

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

test("el refinador mantiene un perfil visual por clase y procesa las 70 hojas una sola vez", () => {
  const script = read("scripts/refinar-spritesheets-clase.py");
  const docs = read("docs/spritesheets-personajes.md");
  const perfiles = script.match(/^    "[a-z_]+": \(/gm) ?? [];

  assert.equal(perfiles.length, 35, "Cada profesión y clase heredada debe tener perfil visual propio.");
  for (const id of ["novato", "mago", "arquero", "paladin", "archimago", "demonologo", "comerciante"]) {
    assert.ok(script.includes(\`"\${id}": (\`), \`Falta el perfil visual de \${id}.\`);
  }
  assert.match(script, /MARKER = ROOT \/ "\\.spritesheets-clase-refinados-v1"/);
  assert.match(script, /if MARKER\.exists\(\)/);
  assert.match(script, /len\(paths\)!=70/);
  assert.match(script, /Image\.Quantize\.FASTOCTREE/);
  assert.match(docs, /Identidad visual por clase/);
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
