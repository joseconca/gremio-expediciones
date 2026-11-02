require("./load-typescript.cjs");
const fs = require("node:fs");
const test = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

require.extensions[".tsx"] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(outputText, filename);
};
const HabilidadesPersonaje = require("../src/components/personaje/HabilidadesPersonaje.tsx").default;
const base = {
  datos: { profesionNombre: "Novato", aprendidas: [] },
  cargando: false, nombreClaseActual: "Novato", escuelaNivel: 1,
  procesando: null, bloqueado: false, busqueda: "", claseSeleccionada: "todas",
  onBusqueda() {}, onClaseSeleccionada() {}, onAccion: async () => {},
};

test("el grimorio conserva las ranuras y los accesos a la escuela sin habilidades", () => {
  const html = renderToStaticMarkup(React.createElement(HabilidadesPersonaje, base));
  for (const nombre of ["Ranuras preparadas", "Todas las aprendidas", "Escuela de Batalla", "Aún no has aprendido habilidades", "Buscar habilidad", "Clase de las habilidades aprendidas"]) {
    assert.ok(html.includes(nombre), nombre);
  }
  assert.equal((html.match(/Ranura vacía/g) || []).length, 8);
});

test("la ranura equipada conserva Retirar y lo desactiva cuando el personaje está bloqueado", () => {
  const habilidad = { id: "h1", habilidadId: "primeros_auxilios", nivel: 2, nivelMaximo: 3,
    slot: "activa_1", habilidad: { nombre: "Primeros auxilios", tipo: "activa", claseId: "novato" } };
  const html = renderToStaticMarkup(React.createElement(HabilidadesPersonaje, {
    ...base, datos: { profesionNombre: "Novato", aprendidas: [habilidad] }, bloqueado: true,
  }));
  assert.match(html, /Primeros auxilios/);
  assert.match(html, /Nv\. 2\/3/);
  assert.match(html, /Todas tus habilidades están equipadas/);
  assert.match(html, /<button[^>]*disabled=""[^>]*>Retirar<\/button>/);
});

test("la vista conserva el mensaje de carga y el aviso de escuela no construida", () => {
  const html = renderToStaticMarkup(React.createElement(HabilidadesPersonaje, { ...base, cargando: true, escuelaNivel: 0 }));
  assert.match(html, /Revisando el grimorio/);
  assert.match(html, /Construye la Escuela de Batalla/);
});
