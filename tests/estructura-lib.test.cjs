const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
require("./load-typescript.cjs");

const root = path.resolve(__dirname, "..");
const existen = (ruta) => fs.existsSync(path.join(root, ruta));

const trasladados = [
  ["expediciones", "combate/consumibles-combate.ts"],
  ["expediciones", "combate/recursos-combate.ts"],
  ["expediciones", "combate/enemigos-combate.ts"],
  ["expediciones", "combate/presupuesto-curacion.ts"],
  ["expediciones", "combate/iniciativa-combate.ts"],
  ["expediciones", "combate/posicion-combate.ts"],
  ["expediciones", "combate/objetivos-combate.ts"],
  ["expediciones", "combate/formacion-party.ts"],
  ["expediciones", "combate/estados-combate.ts"],
  ["expediciones", "combate/cooldowns-habilidades.ts"],
  ["expediciones", "combate/tacticas/motor-tactico.ts"],
  ["expediciones", "combate/tacticas/tipos-tacticos.ts"],
  ["expediciones", "combate/tacticas/adaptador-tactico.ts"],
  ["expediciones", "combate/tacticas/mecanicas-habilidades.ts"],
  ["expediciones", "combate/tacticas/preparacion-habilidades.ts"],
  ["expediciones", "combate/ataques-basicos.ts"],
  ["expediciones", "combate/ataque-basico-arma.ts"],
  ["expediciones", "combate/contrato-accion-combate.ts"],
  ["expediciones", "presentacion/presentacion-combate.ts"],
  ["expediciones", "presentacion/destinos-animacion-combate.ts"],
  ["expediciones", "presentacion/descripciones-efectos.ts"],
  ["expediciones", "viajes/tiempos.ts"],
  ["expediciones", "viajes/recompensas-regreso.ts"],
  ["expediciones", "encuentros/normal.ts"],
  ["expediciones", "encuentros/elite.ts"],
  ["expediciones", "encuentros/boss-diario.ts"],
  ["expediciones", "encuentros/dificultad.ts"],
  ["expediciones", "encuentros/generador-misiones.ts"],
  ["expediciones", "asedios/asedio.ts"],
  ["expediciones", "asedios/turno-pvp.ts"],
  ["progresion", "estadisticas/modificadores-estadisticas.ts"],
  ["progresion", "estadisticas/estadisticas-base-personaje.ts"],
  ["progresion", "habilidades/diseno-habilidades.ts"],
  ["progresion", "habilidades/catalogo-redisenado.ts"],
  ["progresion", "habilidades/tecnicas-adicionales.ts"],
  ["progresion", "habilidades/crear-habilidad.ts"],
  ["progresion", "habilidades/generar-habilidades.ts"],
  ["progresion", "habilidades/aprendizaje.ts"],
  ["progresion", "habilidades/equipo-habilidades.ts"],
  ["progresion", "habilidades/descripciones-habilidades.ts"],
  ["progresion", "habilidades/niveles-habilidad.ts"],
  ["progresion", "estadisticas/atributos-clase.ts"],
  ["progresion", "estadisticas/bonificaciones-equipo.ts"],
  ["progresion", "estadisticas/bonificaciones-pasivas.ts"],
  ["progresion", "estadisticas/estadisticas.ts"],
  ["progresion", "estadisticas/estadisticas-personaje.ts"],
];

test("las reglas trasladadas tienen un solo propietario y no quedan duplicados en la raíz", () => {
  for (const [dominio, archivo] of trasladados) {
    const destino = `src/lib/${dominio}/${archivo}`;
    const antiguo = `src/lib/${dominio}/${path.basename(archivo)}`;
    assert.ok(existen(destino), `No existe ${destino}`);
    assert.equal(existen(antiguo), false, `No debe quedar un archivo duplicado: ${antiguo}`);
  }
  for (const archivo of [
    "src/lib/catalogos/clases.ts",
    "src/lib/catalogos/habilidades.ts",
    "src/lib/expediciones/combate.ts",
    "src/lib/progresion/clases.ts",
  ]) assert.ok(existen(archivo), `Se ha perdido la API pública: ${archivo}`);
});

test("las reglas puras siguen importándose desde sus ubicaciones definitivas", () => {
  const { calcularRegeneracionRecursosTurno } = require("../src/lib/expediciones/combate/recursos-combate.ts");
  const { calcularPesosCuracion } = require("../src/lib/expediciones/combate/presupuesto-curacion.ts");
  const { calcularRestauracionConsumible } = require("../src/lib/expediciones/combate/consumibles-combate.ts");
  const { calcularFechasRegresoProgramadas } = require("../src/lib/expediciones/viajes/tiempos.ts");
  const { calcularRecompensaAlmacen } = require("../src/lib/expediciones/viajes/recompensas-regreso.ts");
  const { MODIFICADORES_VACIOS } = require("../src/lib/progresion/estadisticas/modificadores-estadisticas.ts");
  assert.equal(typeof calcularRegeneracionRecursosTurno, "function");
  assert.equal(typeof calcularPesosCuracion, "function");
  assert.equal(typeof calcularRestauracionConsumible, "function");
  assert.equal(typeof calcularFechasRegresoProgramadas, "function");
  assert.equal(typeof calcularRecompensaAlmacen, "function");
  assert.equal(MODIFICADORES_VACIOS.hpMaximo, 0);
  const niveles = require("../src/lib/progresion/habilidades/niveles-habilidad.ts");
  assert.equal(niveles.costeReinicioHabilidades(7), 700);
  assert.equal(niveles.nivelMaximoHabilidad("novato"), 3);
  const estadisticas = require("../src/lib/progresion/estadisticas/estadisticas.ts");
  const personaje = require("../src/lib/progresion/estadisticas/estadisticas-personaje.ts");
  assert.equal(typeof estadisticas.calcularEstadisticasDerivadasRpg, "function");
  assert.equal(typeof personaje.calcularEstadisticasPersonaje, "function");
});


test("las rutas antiguas no permanecen en código, scripts ni tests", () => {
  const extensiones = /\.(?:ts|tsx|js|cjs|mjs)$/;
  const buscar = (carpeta) => fs.readdirSync(carpeta, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = path.join(carpeta, entrada.name);
    return entrada.isDirectory()
      ? buscar(ruta)
      : extensiones.test(entrada.name) ? [ruta] : [];
  });
  // Solo la estructura nueva: no conservar fachadas sin implementación propia.
  const nombreFachada = ["configuracion", "Juego"].join("");
  assert.equal(existen(`src/lib/${nombreFachada}.ts`), false);
  const prohibidas = trasladados.map(([dominio, archivo]) =>
    `/${dominio}/${path.basename(archivo, ".ts")}`
  );
  // Un prefijo seguido de "/" pertenece a una subcarpeta y no a la ruta antigua.
  // Esto importa especialmente cuando módulo y carpeta comparten nombre.
  const referenciaExacta = (contenido, ruta) => {
    let inicio = contenido.indexOf(ruta);
    while (inicio !== -1) {
      const siguiente = contenido[inicio + ruta.length];
      if (siguiente === undefined || ["'", '"', "`", "."].includes(siguiente)) return true;
      inicio = contenido.indexOf(ruta, inicio + 1);
    }
    return false;
  };
  for (const archivo of ["src", "scripts", "tests"].flatMap((carpeta) => buscar(path.join(root, carpeta)))) {
    const contenido = fs.readFileSync(archivo, "utf8");
    assert.equal(contenido.includes(nombreFachada), false,
      `Importación obsoleta en ${path.relative(root, archivo)}`);
    for (const ruta of prohibidas) {
      assert.equal(
        referenciaExacta(contenido, ruta),
        false,
        `La referencia antigua ${ruta} sigue presente en ${path.relative(root, archivo)}`,
      );
    }
  }
});

test("las reglas tácticas movidas conservan sus exportaciones y se pueden importar juntas", () => {
  const { crearSecuenciaTurnosVelocidad } = require("../src/lib/expediciones/combate/iniciativa-combate.ts");
  const { aplicarModificadoresPosicion } = require("../src/lib/expediciones/combate/posicion-combate.ts");
  const { resolverObjetivosHabilidad } = require("../src/lib/expediciones/combate/objetivos-combate.ts");
  const { distribuirFormacionParty } = require("../src/lib/expediciones/combate/formacion-party.ts");
  const { obtenerCooldowns } = require("../src/lib/expediciones/combate/cooldowns-habilidades.ts");
  const { leerEfectosCombate } = require("../src/lib/expediciones/combate/estados-combate.ts");
  for (const funcion of [
    crearSecuenciaTurnosVelocidad,
    aplicarModificadoresPosicion,
    resolverObjetivosHabilidad,
    distribuirFormacionParty,
    obtenerCooldowns,
    leerEfectosCombate,
  ]) {
    assert.equal(typeof funcion, "function");
  }
});


test("todos los imports locales de src resuelven a archivos de la estructura actual", () => {
  const recorrer = (directorio) => fs.readdirSync(directorio, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = path.join(directorio, entrada.name);
    return entrada.isDirectory()
      ? recorrer(ruta)
      : /\.(ts|tsx)$/.test(entrada.name) ? [ruta] : [];
  });
  const fuentes = recorrer(path.join(root, "src"));
  // Cubre imports de valor/tipo, reexports, import("...") y require("...").
  // La auditoría anterior solo revisaba rutas relativas en tres subdirectorios.
  const referencias = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|\bimport\s+)["']((?:\.{1,2}\/|@\/)[^"']+)["']/g;
  const extensiones = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".d.ts", "/index.ts", "/index.tsx"];
  const faltantes = [];

  for (const fuente of fuentes) {
    const contenido = fs.readFileSync(fuente, "utf8");
    for (const coincidencia of contenido.matchAll(referencias)) {
      const importado = coincidencia[1];
      const destino = importado.startsWith("@/")
        ? path.join(root, "src", importado.slice(2))
        : path.resolve(path.dirname(fuente), importado);
      const encontrado = extensiones.some((ext) => {
        const archivo = destino + ext;
        return fs.existsSync(archivo) && fs.statSync(archivo).isFile();
      });
      if (!encontrado) {
        faltantes.push(`${path.relative(root, fuente)} → ${importado}`);
      }
    }
  }

  assert.deepEqual(faltantes, [], "Se han detectado imports obsoletos o rutas locales inexistentes");
});


test("edificios y contratos tácticos mantienen un propietario único, sin reexports antiguos", () => {
  const edificios = require("../src/lib/base/edificios.ts");
  const fuenteEdificios = fs.readFileSync(path.join(root, "src/lib/base/edificios.ts"), "utf8");
  const tipos = fs.readFileSync(path.join(root, "src/lib/tiposJuego.ts"), "utf8");
  const motor = fs.readFileSync(path.join(root, "src/lib/expediciones/combate/tacticas/motor-tactico.ts"), "utf8");
  assert.equal(edificios.CONFIGURACION_EDIFICIOS.taberna.nombre, "Taberna");
  assert.match(fuenteEdificios, /export interface Edificio\s*\{/);
  assert.match(fuenteEdificios, /export type IdEdificio\s*=/);
  assert.doesNotMatch(tipos, /export interface Edificio\s*\{/);
  assert.doesNotMatch(tipos, /export\s+(?:type\s+)?\{[^}]*\b(?:IdEdificio|CONFIGURACION_EDIFICIOS)\b[^}]*\}/);
  assert.doesNotMatch(motor, /export type\s*\{[^}]+\}\s*from\s*["']\.\/tipos-tacticos["']/);
});
