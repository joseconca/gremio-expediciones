require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("hero shadows share the sprite-sheet row and frame timing with the actor", () => {
  const component = read("src/components/combate/SpriteHeroeAnimado.tsx");
  const combat = read("src/components/combate/CombateModal.tsx");
  const siege = read("src/components/combate/AsedioModal.tsx");

  assert.match(component, /sombra\?: boolean/);
  assert.ok(component.includes('backgroundImage: `url("${ruta}")`'));
  assert.ok(component.includes("animation: `hero-sprite-four-frames ${duracion}ms linear ${repeticion}`"));
  assert.match(component, /estiloSombraCombate\(contextoSombra\)/);
  for (const file of ["src/components/combate/SpriteHeroeHd.tsx", "src/components/combate/SpriteEnemigoAnimado.tsx"]) {
    assert.match(read(file), /estiloSombraCombate\(/);
  }
  assert.match(component, /bg-no-repeat brightness-0/);
  assert.match(component, /contextoSombra === "party" \? "opacity-45 blur-\[1px\]" : "opacity-60 blur-xs"/);
  assert.match(combat, /SOMBRA REFLEJADA: comparte acción y fotograma con el héroe/);
  assert.match(combat, /sombra\s*contextoSombra="party"/);
  assert.match(combat, /sombra\s*contextoSombra="hero"/);
  assert.match(siege, /sombra\s*contextoSombra="hero"/);
});

test("the animated sprite viewport advances through exactly four aligned columns", () => {
  const component = read("src/components/combate/SpriteHeroeAnimado.tsx");
  const css = read("src/app/globals.css");

  assert.match(component, /backgroundSize: "400% 1500%"/);
  assert.ok(component.includes("backgroundPosition: `0 ${desplazamientoVertical}`"));
  assert.match(component, /fila \/ \(FILAS_ANIMACION_SPRITESHEET_HEROE\.length - 1\)/);
  assert.ok(component.includes("hero-sprite-four-frames ${duracion}ms linear ${repeticion}"));
  assert.doesNotMatch(component, /steps\(4,\s*end\)/);

  // With a 4-column background, the horizontal positioning range is only 3 viewport widths.
  // The frame-aligned positions are therefore 0, 1/3, 2/3 and 1—not 0, 1/4, 1/2, 3/4.
  assert.match(css, /0%\s*\{\s*background-position-x: 0%;/);
  assert.match(css, /25%\s*\{\s*background-position-x: 33\.333333%;\s*animation-timing-function: steps\(1, end\);/);
  assert.match(css, /50%\s*\{\s*background-position-x: 66\.666667%;\s*animation-timing-function: steps\(1, end\);/);
  assert.match(css, /75%\s*\{\s*background-position-x: 100%;\s*animation-timing-function: steps\(1, end\);/);
  assert.match(css, /100%\s*\{\s*background-position-x: 100%;/);
});


test("the shadow stays attached to the feet, extends upward and preserves horizontal orientation", () => {
  const { estiloSombraCombate } = require("../src/lib/expediciones/sombra-combate.ts");
  for (const contexto of ["party", "hero"]) {
    const style = estiloSombraCombate(contexto);
    assert.equal(style.transformOrigin, "50% 100%");
    const [a,b,c,d,e,f] = style.transform.match(/matrix\(([^)]+)\)/)[1].split(",").map(Number);
    const project = (x,y) => ({ x: a*(x-90)+c*(y-180)+e+90, y: b*(x-90)+d*(y-180)+f+180 });
    assert.deepEqual(project(70,180), {x:70,y:180});
    assert.deepEqual(project(110,180), {x:110,y:180});
    assert.ok(project(90,20).y < 180, "The silhouette must extend behind the feet, not below them");
    assert.ok(project(70,20).x < project(110,20).x, "Left and right retain the actor's orientation");
    assert.ok(project(90,20).y > 20, "The silhouette is flattened onto the floor");
  }
});
