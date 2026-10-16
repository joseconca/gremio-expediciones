require("./load-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  MAX_ENEMIGOS_COMBATE,
  indiceCasillaFormacion,
  posicionDesdeIndiceCasilla,
  obtenerReglaObjetivoHabilidad,
  resolverObjetivosHabilidad,
} = require("../src/lib/expediciones/objetivos-combate.ts");

function combatiente(id, equipo, posicion, columna, extra = {}) {
  return { id, nombre: id, equipo, posicion, columna, hpActual: 100, estado: "activo", ...extra };
}

const habilidad = (equipo, patron, incluirPropio) => ({
  objetivo: { equipo, patron, ...(incluirPropio === undefined ? {} : { incluirPropio }) },
});

test("la formación 3x3 traduce de forma reversible las nueve casillas", () => {
  assert.equal(indiceCasillaFormacion("mele", 0), 0);
  assert.equal(indiceCasillaFormacion("centro", 1), 4);
  assert.equal(indiceCasillaFormacion("retaguardia", 2), 8);
  for (let indice = 0; indice < 9; indice += 1) {
    const posicion = posicionDesdeIndiceCasilla(indice);
    assert.equal(indiceCasillaFormacion(posicion.posicion, posicion.columna), indice);
  }
  assert.equal(MAX_ENEMIGOS_COMBATE, 9);
});

test("por defecto, las habilidades de daño buscan al primer enemigo vivo y priorizan la primera fila", () => {
  assert.deepEqual(obtenerReglaObjetivoHabilidad({ efecto: "dano" }), {
    equipo: "enemigo", patron: "individual",
  });
  const r = resolverObjetivosHabilidad({
    habilidad: { efecto: "dano" },
    actorId: "jugador",
    combatientes: [
      combatiente("jugador", "aliado", "centro", 1),
      combatiente("enemigo-centro", "enemigo", "centro", 0),
      combatiente("enemigo-mele", "enemigo", "mele", 2),
    ],
  });
  assert.equal(r.objetivoPrincipal.id, "enemigo-mele");
  assert.deepEqual(r.objetivos.map((o) => o.id), ["enemigo-mele"]);
});

test("las curaciones y mejoras por defecto permiten seleccionar cualquier aliado, incluido el lanzador", () => {
  assert.deepEqual(obtenerReglaObjetivoHabilidad({ efecto: "curacion" }), {
    equipo: "aliado", patron: "individual", incluirPropio: true,
  });
  const aliados = [
    combatiente("a", "aliado", "mele", 0),
    combatiente("b", "aliado", "centro", 1),
    combatiente("c", "aliado", "retaguardia", 2),
  ];
  const r = resolverObjetivosHabilidad({
    habilidad: { efecto: "curacion" },
    actorId: "b",
    objetivoId: "c",
    combatientes: aliados,
  });
  assert.equal(r.objetivoPrincipal.id, "c");
  assert.deepEqual(r.objetivos.map((o) => o.id), ["c"]);
});

test("área de fila, columna y adyacentes se calcula sobre casillas ocupadas", () => {
  const enemies = [
    combatiente("center-left", "enemigo", "centro", 0),
    combatiente("center", "enemigo", "centro", 1),
    combatiente("center-right", "enemigo", "centro", 2),
    combatiente("melee-center", "enemigo", "mele", 1),
    combatiente("rear-center", "enemigo", "retaguardia", 1),
    combatiente("rear-right", "enemigo", "retaguardia", 2),
  ];
  const base = { actorId: "hero", combatientes: enemies };

  const fila = resolverObjetivosHabilidad({
    ...base, habilidad: habilidad("enemigo", "fila"), objetivoId: "center",
  });
  assert.deepEqual(fila.objetivos.map((o) => o.id), ["center-left", "center", "center-right"]);

  const columna = resolverObjetivosHabilidad({
    ...base, habilidad: habilidad("enemigo", "columna"), objetivoId: "center",
  });
  assert.deepEqual(columna.objetivos.map((o) => o.id), ["melee-center", "center", "rear-center"]);

  const adyacentes = resolverObjetivosHabilidad({
    ...base, habilidad: habilidad("enemigo", "adyacentes"), objetivoId: "center",
  });
  assert.deepEqual(adyacentes.objetivos.map((o) => o.id), ["melee-center", "center-left", "center", "center-right"]);
});

test("área total excluye combatientes caídos y los estados retirado/huido", () => {
  const r = resolverObjetivosHabilidad({
    actorId: "hero",
    habilidad: habilidad("enemigo", "todos"),
    combatientes: [
      combatiente("hero", "aliado", "centro", 1),
      combatiente("vivo", "enemigo", "mele", 0),
      combatiente("caido", "enemigo", "centro", 0, { hpActual: 0 }),
      combatiente("huido", "enemigo", "retaguardia", 0, { estado: "huyo" }),
    ],
  });
  assert.deepEqual(r.objetivos.map((o) => o.id), ["vivo"]);
});

test("el servidor puede rechazar objetivos ajenos al equipo y formaciones mayores de nueve", () => {
  const invalid = resolverObjetivosHabilidad({
    actorId: "hero",
    habilidad: habilidad("aliado", "individual", true),
    objetivoId: "enemy",
    combatientes: [
      combatiente("hero", "aliado", "centro", 1),
      combatiente("enemy", "enemigo", "mele", 0),
    ],
  });
  assert.equal(invalid.error, "objetivo_no_valido");

  const oversized = Array.from({ length: 10 }, (_, i) =>
    combatiente("e" + i, "enemigo", ["mele", "centro", "retaguardia"][Math.floor(i / 3)] || "retaguardia", i % 3),
  );
  const over = resolverObjetivosHabilidad({
    actorId: "hero",
    habilidad: habilidad("enemigo", "todos"),
    combatientes: [combatiente("hero", "aliado", "centro", 1), ...oversized],
  });
  assert.equal(over.error, "limite_formacion_excedido");
});
