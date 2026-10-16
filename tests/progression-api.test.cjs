require("./load-typescript.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function loadSource(relativePath, dependencies) {
  const filename = path.resolve(__dirname, "..", relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  });
  const loaded = { exports: {} };
  vm.runInThisContext("(function(require, module, exports) {" + outputText + "\n})", {
    filename,
  })(
    (name) => Object.hasOwn(dependencies, name) ? dependencies[name] : require(name),
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}

test("la API de asignación manual de atributos se retira explícitamente", async () => {
  const route = loadSource("src/app/api/jugador/atributos/asignar/route.ts", {
    "next/server": {
      NextResponse: {
        json(body, init = {}) {
          return { body, status: init.status ?? 200, headers: init.headers ?? {} };
        },
      },
    },
  });
  const response = await route.POST();
  assert.equal(response.status, 410);
  assert.match(response.body.error, /calculan automáticamente/i);
});
