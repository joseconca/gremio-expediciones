require('./load-typescript.cjs');
const fs = require('node:fs');
const ts = require('typescript');
const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
require.extensions['.tsx'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: filename }).outputText, filename);
require.extensions['.css'] = module => { module.exports = {}; };
const Panel = require('../src/components/combate/PanelCombatientes.tsx').default;
const EstadoSobreActor = require('../src/components/combate/EstadoSobreActor.tsx').default;
const { CLASES } = require('../src/lib/progresion/clases.ts');
const ficha = { id: 'a', nombre: 'Heroína', hp: 51, hpMaximo: 100, energia: 0, energiaMaxima: 80, mana: 19, manaMaximo: 60 };
function render(claseId) { return renderToStaticMarkup(React.createElement(Panel, { aliados: [{ ...ficha, claseId }], enemigos: [{ id: 'e', nombre: 'Orco', hp: 40, hpMaximo: 50 }], onInfo() {} })); }
for (const clase of Object.values(CLASES)) {
  test(`${clase.id}: muestra los recursos de su clase, incluso agotados`, () => {
    const html = render(clase.id);
    assert.equal(html.includes('aria-label="Energía de Heroína"'), clase.recursoCombate !== 'mana');
    assert.equal(html.includes('aria-label="Maná de Heroína"'), clase.recursoCombate !== 'energia');
    assert.ok(html.includes('aria-label="Vida de Orco"'));
    assert.ok(!html.includes('aria-label="Maná de Orco"'));
    assert.ok(!html.includes('aria-label="Energía de Orco"'));
    const estado = renderToStaticMarkup(React.createElement(EstadoSobreActor, { ficha: { ...ficha, claseId: clase.id } }));
    assert.equal(estado.includes('aria-label="Energía de Heroína"'), clase.recursoCombate !== 'mana');
    assert.equal(estado.includes('aria-label="Maná de Heroína"'), clase.recursoCombate !== 'energia');
    assert.ok(estado.indexOf('data-fila-efectos') > estado.indexOf('</button>'), 'La fila reservada de iconos queda fuera del recuadro');
  });
}
test('mantiene ambos bandos y los estados de los participantes', () => {
  const html = renderToStaticMarkup(React.createElement(Panel, { aliados: [{ ...ficha, estado: 'huyo' }, { ...ficha, id: 'b', nombre: 'Caído', hp: 0 }], enemigos: [{ id: 'e', nombre: 'Jefe', hp: 900, hpMaximo: 1000 }], onInfo() {} }));
  assert.match(html, /Retirado/); assert.match(html, /Caído/); assert.match(html, /Información de Jefe/);
});
