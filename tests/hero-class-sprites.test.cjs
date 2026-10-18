const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));

test("todas las clases jugables tienen sprite femenino, masculino y emblema provisional", () => {
  const clases = read("src/lib/progresion/clases.ts");
  const ids = [...clases.matchAll(/^\\s{2}([a-z][a-z0-9_]+): \\{\\n\\s*id: "\\1", nombre:/gm)]
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
  assert.match(config, /profesionActivaId && Object\\.prototype\\.hasOwnProperty\\.call\\(CLASES, profesionActivaId\\)/);
  assert.match(config, /Novato: "novato"/);
  assert.match(config, /Guerrero: "guerrero"/);
  assert.match(config, /Comerciante: "comerciante"/);
  assert.match(config, /\\/sprites\\/heroes\\/\\$\\{idClase\\}\\/\\$\\{idClase\\}-\\$\\{sufijoSexo\\}\\.png/);
  assert.match(config, /obtenerLogoClaseHeroe/);
});

test("el cartel de compañía y los participantes de expedición identifican la clase de cada aventurero", () => {
  const panel = read("src/components/base/PanelParty.tsx");
  const servicio = read("src/server/services/party/party-service.ts");
  assert.match(panel, /obtenerLogoClaseHeroe/);
  assert.match(panel, /obtenerNombreClaseHeroe/);
  assert.match(panel, /Líder de la compañía/);
  assert.match(panel, /profesionActivaId\\?: string \\| null/);
  assert.match(servicio, /profesionActivaId: true/);
});
