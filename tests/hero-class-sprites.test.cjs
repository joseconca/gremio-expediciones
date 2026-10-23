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
    assert.ok(script.includes('"' + id + '": ('), "Falta el perfil visual de " + id + ".");
  }
  assert.match(script, /MARKER = ROOT \/ "\\.spritesheets-clase-refinados-v1"/);
  assert.match(script, /if MARKER\.exists\(\)/);
  assert.match(script, /len\(paths\)!=70/);
  assert.match(script, /Image\.Quantize\.FASTOCTREE/);
  assert.match(docs, /Identidad visual por clase/);
});

test("los paquetes v2 son fuente canónica de las filas Idle, Caminar y Recibir daño", () => {
  const generator = read("scripts/generar-spritesheets-clases.py");
  const workflow = read(".github/workflows/generar-spritesheets-clases.yml");
  const component = read("src/components/combate/SpriteHeroeAnimado.tsx");
  const validator = read("scripts/validar-integracion-sprites-v2.py");
  const combat = read("src/components/combate/CombateModal.tsx");
  const siege = read("src/components/combate/AsedioModal.tsx");
  assert.ok(generator.includes("integrar_filas_sprites_v2(cid, sex, sheet)"));
  assert.ok(generator.includes("idle_first_frame.save(avatar"));
  assert.ok(workflow.includes("scripts/validar-integracion-sprites-v2.py"));
  assert.ok(validator.includes("production row {action} differs from canonical v2"));
  assert.ok(component.includes('backgroundSize: "400% 1500%"'));
  assert.ok(component.includes("hero-sprite-four-frames"));
  assert.ok(component.includes("hero-sprite-animated"));
  assert.ok(combat.includes("SpriteHeroeAnimado"));
  assert.ok(siege.includes("SpriteHeroeAnimado"));
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


test("el contrato de integración prioriza rework-staging de Tier 2 y exporta retratos desde Idle", () => {
  const integration = read("scripts/integrar-sprites-tier0-tier2.py");
  const workflow = read(".github/workflows/integrar-sprites-tier0-tier2.yml");
  assert.match(integration, /STAGING_CLASSES = frozenset\(\("elementalista", "brujo", "cazador", "explorador"\)\)/);
  assert.match(integration, /rework-staging/);
  assert.match(integration, /ACTIONS = \("idle", "walk", "hurt"\)/);
  assert.match(integration, /PORTRAIT_SIZE = \(128, 256\)/);
  assert.match(integration, /filas 3-14/i);
  assert.match(workflow, /sprites-tier0-tier2-runtime-report/);
  assert.match(workflow, /git push origin HEAD:main/);
});


test("los informes Tier 2 reflejan la fuente seleccionada para runtime", () => {
  const auditor = read("scripts/auditar-paquetes-tier2.py");
  const repair = read("scripts/reparar-staging-tier2.py");
  const atlasBuilder = read("scripts/generar-spritesheets-clases.py");
  assert.ok(auditor.includes('"runtime_integrated": class_id not in STAGING_CLASSES'));
  assert.ok(auditor.includes("runtimeApproved=true"));
  assert.ok(repair.includes('"runtimeApproved": runtime_approved'));
  assert.ok(atlasBuilder.includes("resize((128, 256), Image.Resampling.NEAREST)"));
});


test("el validador de Tier 0/1 acepta retratos 2x derivados de Idle", () => {
  const validator = read("scripts/validar-integracion-sprites-v2.py");
  assert.ok(validator.includes("PORTRAIT = (128, 256)"));
  assert.ok(validator.includes("frames[0].resize(PORTRAIT, Image.Resampling.NEAREST)"));
});
