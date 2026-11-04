#!/usr/bin/env node
/** Auditoría no destructiva de dependencias. No borra recursos ni modifica archivos.
 * Ejecutar: npm run audit:estructura
 * Candidatos sin imports no equivalen a archivos sin uso: comprobar rutas,
 * referencias dinámicas, tests, Prisma, scripts y assets antes de eliminar.
 */
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..");
const EXT = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"];
const SCAN = [path.join(ROOT, "src"), path.join(ROOT, "scripts"), path.join(ROOT, "tests")];
const candidates = [];
for (const root of SCAN) {
  if (!fs.existsSync(root)) continue;
  const visit = folder => {
    for (const dirent of fs.readdirSync(folder, { withFileTypes: true })) {
      if (["node_modules", ".next", "generated"].includes(dirent.name) && dirent.isDirectory()) continue;
      const abs = path.join(folder, dirent.name);
      if (dirent.isDirectory()) visit(abs);
      else if (/\.(tsx?|jsx?|mjs|cjs)$/.test(dirent.name)) candidates.push(abs);
    }
  };
  visit(root);
}

const incoming = new Map(candidates.map(f => [f, new Set()]));
const missing = [];
const edges = [];
const resolvePath = (from, imported) => {
  let base;
  if (imported.startsWith("@/")) base = path.join(ROOT, "src", imported.slice(2));
  else if (imported.startsWith(".")) base = path.resolve(path.dirname(from), imported);
  else if (imported.startsWith("src/")) base = path.join(ROOT, imported);
  else return null;
  const choices = [base, ...EXT.map(ext => base + ext),
                   ...EXT.map(ext => path.join(base, "index" + ext))];
  return choices.find(file => fs.existsSync(file) && fs.statSync(file).isFile()) ?? null;
};
for (const file of candidates) {
  const source = fs.readFileSync(file, "utf8");
  const imported = new Set(ts.preProcessFile(source, true, true).importedFiles.map(x => x.fileName));
  // Reúne además cargas CommonJS, importaciones dinámicas y cadenas "loadSource" de tests.
  const pattern = /(?:\brequire|\bimport|\bloadSource)\s*\(\s*["']([^"']+)["']\s*\)/g;
  for (const m of source.matchAll(pattern)) imported.add(m[1]);
  for (const name of imported) {
    const target = resolvePath(file, name);
    if (target) {
      if (incoming.has(target)) incoming.get(target).add(file);
      edges.push({ from: path.relative(ROOT, file), to: path.relative(ROOT, target) });
    } else if (name.startsWith("@/") || name.startsWith(".") || name.startsWith("src/")) {
      // Imports de paquetes externos no se consideran errores.
      missing.push({ from: path.relative(ROOT, file), import: name });
    }
  }
}
// Next.js, rutas HTTP y scripts de consola son puntos de entrada explícitos.
const isEntry = file => /^src[\\/]app[\\/]/.test(path.relative(ROOT, file))
  || /^scripts[\\/]/.test(path.relative(ROOT, file))
  || /^tests[\\/]/.test(path.relative(ROOT, file))
  || /src[\\/]middleware\.[cm]?[jt]s$/.test(path.relative(ROOT, file));
const srcOnly = candidates.filter(x => /^src[\\/]/.test(path.relative(ROOT, x)));
const orphanCandidates = srcOnly.filter(file => !isEntry(file) && incoming.get(file).size === 0)
  .map(file => path.relative(ROOT, file)).sort();
const result = {
  modules: candidates.length,
  sourceModules: srcOnly.length,
  staticEdges: edges.length,
  missingImportsToReview: missing,
  candidatesWithoutIncomingImports: orphanCandidates,
  note: "Informe orientativo, no prueba de código obsoleto. No se ha eliminado nada.",
};
if (process.argv.includes("--json")) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`Módulos analizados: ${result.modules}. Dependencias: ${result.staticEdges}.`);
  console.log(`Posibles referencias no resueltas: ${missing.length}.`);
  console.log(`Candidatos sin imports entrantes (${orphanCandidates.length}, NO borrar sin revisar):`);
  for (const f of orphanCandidates) console.log("  " + f);
}
