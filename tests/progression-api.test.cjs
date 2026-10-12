require("./load-typescript.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

class PrismaClientKnownRequestError extends Error {
  constructor(message, { code }) {
    super(message);
    this.code = code;
  }
}
const PrismaStub = {
  PrismaClientKnownRequestError,
  TransactionIsolationLevel: { Serializable: "Serializable" },
};
const NextResponse = {
  json(body, init = {}) {
    return { body, status: init.status ?? 200, headers: init.headers ?? {} };
  },
};

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

function matches(record, where) {
  if (!record) return false;
  for (const [key, expected] of Object.entries(where ?? {})) {
    const actual = record[key];
    if (expected && typeof expected === "object" && !Array.isArray(expected)) {
      if (Object.hasOwn(expected, "gte") && !(actual >= expected.gte)) return false;
      if (Object.hasOwn(expected, "lt") && !(actual < expected.lt)) return false;
    } else if (actual !== expected) {
      return false;
    }
  }
  return true;
}

function applyData(record, data) {
  for (const [key, value] of Object.entries(data ?? {})) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (Object.hasOwn(value, "increment")) record[key] += value.increment;
      else if (Object.hasOwn(value, "decrement")) record[key] -= value.decrement;
    } else {
      record[key] = value;
    }
  }
}

function makeRoute({ points = 1, force = 1, expedition = null, authenticated = true } = {}) {
  let state = {
    character: {
      id: "p1",
      usuarioId: "u1",
      estado: "ocioso",
      fuerza: force,
      agilidad: 1,
      vitalidad: 1,
      inteligencia: 1,
      destreza: 1,
      suerte: 1,
      puntosAtributoDisponibles: points,
    },
    expedition,
  };
  let tail = Promise.resolve();
  let txOptions;

  const prisma = {
    $transaction: async (work, options) => {
      let release;
      const previous = tail;
      tail = new Promise((resolve) => { release = resolve; });
      await previous;
      txOptions = options;
      const before = structuredClone(state);
      const tx = {
        personaje: {
          findUnique: async ({ where, select }) => {
            if (state.character.usuarioId !== where.usuarioId) return null;
            const result = {};
            for (const key of Object.keys(select ?? {})) result[key] = state.character[key];
            return structuredClone(result);
          },
          updateMany: async ({ where, data }) => {
            if (!matches(state.character, where)) return { count: 0 };
            applyData(state.character, data);
            return { count: 1 };
          },
        },
        expedicionActiva: {
          findUnique: async ({ where }) =>
            where.usuarioId === "u1" && state.expedition
              ? structuredClone(state.expedition)
              : null,
        },
      };
      try {
        return await work(tx);
      } catch (error) {
        state = before;
        throw error;
      } finally {
        release();
      }
    },
  };

  const route = loadSource("src/app/api/jugador/atributos/asignar/route.ts", {
    "next/server": { NextResponse },
    "@prisma/client": { Prisma: PrismaStub },
    "@/lib/auth": { getAuthenticatedUser: async () => authenticated ? { id: "u1" } : null },
    "@/lib/prisma": { prisma },
  });

  return {
    POST: route.POST,
    getState: () => structuredClone(state),
    getTransactionOptions: () => txOptions,
  };
}

function request(body) {
  return { json: async () => body };
}

test("la API de asignación manual de atributos se retira explícitamente", async () => {
  const route = loadSource("src/app/api/jugador/atributos/asignar/route.ts", {
    "next/server": { NextResponse },
  });
  const response = await route.POST();
  assert.equal(response.status, 410);
  assert.match(response.body.error, /calculan automáticamente/i);
});
