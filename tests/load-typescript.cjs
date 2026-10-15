// Compile source in memory for Node's test runner; no generated files or runtime dependencies.
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

// Resolve the repository's "@/..." aliases when Node-based tests load real modules.
const resolverOriginal = Module._resolveFilename;
Module._resolveFilename = function resolveAlias(request, parent, isMain) {
  if (typeof request === "string" && request.startsWith("@/")) {
    const resolved = path.resolve(__dirname, "..", "src", request.slice(2));
    return resolverOriginal.call(this, resolved, parent, isMain);
  }
  return resolverOriginal.call(this, request, parent, isMain);
};