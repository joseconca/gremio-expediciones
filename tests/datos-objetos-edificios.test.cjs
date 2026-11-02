require("./load-typescript.cjs");

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");

// Simulación aislada de los tres estados y el efecto del hook: no requiere navegador.
let contextoActual;
const reactSimulado = {
  useState(inicial) {
    const indice = contextoActual.siguienteEstado++;
    const contexto = contextoActual;
    if (!(indice in contexto.estado)) contexto.estado[indice] = inicial;
    return [contexto.estado[indice], (valor) => { contexto.estado[indice] = valor; }];
  },
  useEffect(efecto, dependencias) {
    contextoActual.efecto = efecto;
    contextoActual.dependencias = dependencias;
  },
};

const cargaOriginal = Module._load;
let useDatosObjetosEdificio;
try {
  Module._load = function cargarModulo(request, parent, isMain) {
    if (request === "react" && parent?.filename?.endsWith("useDatosObjetosEdificio.ts")) {
      return reactSimulado;
    }
    return cargaOriginal.call(this, request, parent, isMain);
  };
  ({ useDatosObjetosEdificio } = require("../src/hooks/useDatosObjetosEdificio.ts"));
} finally {
  Module._load = cargaOriginal;
}

function renderizar(habilitado = true, claveCarga = "1") {
  contextoActual = { siguienteEstado: 0, estado: [], efecto: null, dependencias: null };
  const resultado = useDatosObjetosEdificio(habilitado, claveCarga);
  return { contexto: contextoActual, resultado };
}

const vaciarMicrotareas = () => new Promise((resolve) => setImmediate(resolve));

test("no consulta objetos si el edificio no está habilitado", async (t) => {
  const fetchAnterior = global.fetch;
  t.after(() => { global.fetch = fetchAnterior; });
  const peticiones = [];
  global.fetch = async (...args) => { peticiones.push(args); throw new Error("No debería consultar"); };
  const { contexto } = renderizar(false, "0");
  contexto.efecto();
  await vaciarMicrotareas();
  assert.equal(peticiones.length, 0);
  assert.equal(contexto.estado[1], true);
  assert.deepEqual(contexto.dependencias, [false, "0"]);
});

test("carga los datos sin caché, conservando estados y clave de nivel", async (t) => {
  const fetchAnterior = global.fetch;
  t.after(() => { global.fetch = fetchAnterior; });
  const peticiones = [];
  const inventario = { inventario: [{ id: "espada-1" }], equipo: {}, oro: 100 };
  global.fetch = async (ruta, opciones) => {
    peticiones.push([ruta, opciones]);
    return { ok: true, json: async () => inventario };
  };
  const { contexto } = renderizar(true, "2:3");
  contexto.efecto();
  await vaciarMicrotareas();
  assert.deepEqual(peticiones, [["/api/objetos", { cache: "no-store" }]]);
  assert.strictEqual(contexto.estado[0], inventario);
  assert.equal(contexto.estado[1], false);
  assert.equal(contexto.estado[2], null);
  assert.deepEqual(contexto.dependencias, [true, "2:3"]);
});

test("la carga inicial mantiene el error específico del servidor y el fallo de conexión genérico", async (t) => {
  const fetchAnterior = global.fetch;
  t.after(() => { global.fetch = fetchAnterior; });
  global.fetch = async () => ({ ok: false, json: async () => ({ error: "Sesión requerida." }) });
  const errorServidor = renderizar();
  errorServidor.contexto.efecto();
  await vaciarMicrotareas();
  assert.equal(errorServidor.contexto.estado[2], "Sesión requerida.");
  assert.equal(errorServidor.contexto.estado[1], false);
  global.fetch = async () => { throw new Error("No hay red"); };
  const errorRed = renderizar();
  errorRed.contexto.efecto();
  await vaciarMicrotareas();
  assert.equal(errorRed.contexto.estado[2], "No se pudieron cargar los objetos.");
  assert.equal(errorRed.contexto.estado[1], false);
});

test("la recarga conserva el booleano y los mensajes distintos de carga inicial", async (t) => {
  const fetchAnterior = global.fetch;
  t.after(() => { global.fetch = fetchAnterior; });
  const peticiones = [];
  global.fetch = async (ruta, opciones) => {
    peticiones.push([ruta, opciones]);
    return { ok: false, json: async () => ({ error: "No autorizado." }) };
  };
  const { contexto, resultado } = renderizar();
  assert.equal(await resultado.recargarObjetos(), false);
  assert.equal(contexto.estado[2], "No autorizado.");
  global.fetch = async () => { throw new Error("Red caída"); };
  assert.equal(await resultado.recargarObjetos(), false);
  assert.equal(contexto.estado[2], "No se pudieron actualizar los objetos.");
  const nuevosDatos = { inventario: [{ id: "anillo-1" }], equipo: {} };
  global.fetch = async () => ({ ok: true, json: async () => nuevosDatos });
  assert.equal(await resultado.recargarObjetos(), true);
  assert.strictEqual(contexto.estado[0], nuevosDatos);
  assert.deepEqual(peticiones, [["/api/objetos", { cache: "no-store" }]]);
});

test("las páginas mantienen sus acciones HTTP propias y reutilizan la carga", () => {
  const leer = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  const armeria = leer("src/app/base/armeria/page.tsx");
  const herreria = leer("src/app/base/herreria/page.tsx");
  for (const pagina of [armeria, herreria]) {
    assert.match(pagina, /useDatosObjetosEdificio\(/);
    assert.doesNotMatch(pagina, /fetch\("\/api\/objetos",/);
  }
  for (const endpoint of ["comprar", "vender", "recomprar"]) {
    assert.match(armeria, new RegExp("/api/objetos/" + endpoint));
  }
  assert.match(herreria, /\/api\/objetos\/mejorar/);
});
