const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("the animated sprite viewport advances through exactly four aligned columns", () => {
  const component = read("src/components/combate/SpriteHeroeAnimado.tsx");
  const css = read("src/app/globals.css");

  assert.match(component, /backgroundSize: "400% 1500%"/);
  assert.match(component, /backgroundPosition: `0 ${desplazamientoVertical}`/);
  assert.match(component, /fila \/ \(FILAS_ANIMACION_SPRITESHEET_HEROE\.length - 1\)/);
  assert.match(component, /hero-sprite-four-frames ${duracion}ms linear ${repeticion}/);
  assert.doesNotMatch(component, /steps\(4,\s*end\)/);

  // With a 4-column background, the horizontal positioning range is only 3 viewport widths.
  // The frame-aligned positions are therefore 0, 1/3, 2/3 and 1—not 0, 1/4, 1/2, 3/4.
  assert.match(css, /0%\s*\{\s*background-position-x: 0%;/);
  assert.match(css, /25%\s*\{\s*background-position-x: 33\.333333%;\s*animation-timing-function: steps\(1, end\);/);
  assert.match(css, /50%\s*\{\s*background-position-x: 66\.666667%;\s*animation-timing-function: steps\(1, end\);/);
  assert.match(css, /75%\s*\{\s*background-position-x: 100%;\s*animation-timing-function: steps\(1, end\);/);
  assert.match(css, /100%\s*\{\s*background-position-x: 100%;/);
});
