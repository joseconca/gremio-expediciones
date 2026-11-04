/* Prueba de persistencia real: solo se ejecuta contra una BD efímera de test. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { PrismaClient, Prisma } = require("@prisma/client");

const url = process.env.DATABASE_URL;
assert.ok(url, "DATABASE_URL es necesaria para la prueba de integración");
const database = new URL(url);
assert.ok(["localhost", "127.0.0.1"].includes(database.hostname),
  "La integración no puede ejecutarse contra un servidor remoto");
assert.equal(database.pathname, "/gremio_test",
  "La integración solo admite la base temporal gremio_test");

const prisma = new PrismaClient();
test.after(async () => {
  await prisma.$disconnect();
});

test("PostgreSQL: relaciones RPG, control de versión y rollback transaccional", async () => {
  const token = randomUUID().replace(/-/g, "");
  const email = "prueba-" + token + "@example.test";
  const nombre = "Integracion-" + token;
  const rollback = new Error("ROLLBACK_DE_INTEGRACION");

  await assert.rejects(
    prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: { email, nombre, password: "solo-prueba" },
      });
      const personaje = await tx.personaje.create({
        data: { usuarioId: usuario.id, clase: "novato", nombre, hpActual: 100 },
      });
      await tx.progresoClase.create({
        data: { personajeId: personaje.id, claseId: "novato", desbloqueada: true },
      });
      await tx.habilidadAprendida.create({
        data: { personajeId: personaje.id, habilidadId: "habilidad-prueba", nivel: 1, slot: "slot-prueba" },
      });
      const inventario = await tx.inventario.create({ data: { personajeId: personaje.id } });
      const objeto = await tx.inventarioObjeto.create({
        data: { inventarioId: inventario.id, objetoId: "arma-prueba", cantidad: 1 },
      });
      await tx.equipoEquipado.create({
        data: { personajeId: personaje.id, armaInventarioId: objeto.id },
      });

      const party = await tx.party.create({ data: { liderUsuarioId: usuario.id } });
      await tx.partyMember.create({ data: { partyId: party.id, usuarioId: usuario.id } });
      const expedicion = await tx.expedicionParty.create({
        data: {
          partyId: party.id,
          liderUsuarioId: usuario.id,
          tipo: "normal",
          misionId: "mision-prueba",
          nombre: "Expedición de integración",
          recompensa: { oro: 0 },
          dificultad: 0,
          fechaLlegada: new Date(Date.now() + 3600000),
          origenCoords: { lat: 28.0, lng: -15.0 },
          destinoCoords: { lat: 28.1, lng: -15.1 },
        },
      });
      await tx.expedicionPartyParticipante.create({
        data: {
          expedicionPartyId: expedicion.id,
          usuarioId: usuario.id,
          personajeId: personaje.id,
          hpInicio: 100,
          energiaInicio: 100,
          manaInicio: 10,
        },
      });
      const combate = await tx.combateParty.create({
        data: {
          expedicionPartyId: expedicion.id,
          enemigoId: "enemigo-prueba",
          enemigoNombre: "Muñeco de prueba",
          enemigoHp: 20,
          enemigoHpMaximo: 20,
          enemigoAtaque: 5,
          enemigoAtaqueMagico: 1,
          enemigoDefensa: 1,
          enemigoDefensaMagica: 1,
          enemigoVelocidad: 5,
          enemigoProbCritico: 0,
          enemigoDanoCritico: 1.5,
          enemigoNivel: 1,
        },
      });
      await tx.combatePartyParticipante.create({
        data: {
          combatePartyId: combate.id,
          usuarioId: usuario.id,
          personajeId: personaje.id,
          ordenTurno: 0,
          jugadorHp: 100,
          jugadorHpMaximo: 100,
          jugadorAtaque: 12,
          jugadorDefensa: 8,
          jugadorVelocidad: 10,
          jugadorProbCritico: 0,
          jugadorDanoCritico: 1.5,
          jugadorNivel: 1,
        },
      });

      const ver = await tx.combateParty.findUniqueOrThrow({
        where: { id: combate.id },
        include: { participantes: true, expedicionParty: { include: { participantes: true } } },
      });
      assert.equal(ver.participantes.length, 1);
      assert.equal(ver.expedicionParty.participantes[0].personajeId, personaje.id);
      assert.deepEqual(ver.turnosPendientes, []);
      assert.deepEqual(ver.participantes[0].cooldowns, {});

      const filtro = { id: combate.id, version: 0, recompensasResueltas: false };
      const primera = await tx.combateParty.updateMany({
        where: filtro,
        data: { version: { increment: 1 }, recompensasResueltas: true },
      });
      const segunda = await tx.combateParty.updateMany({
        where: filtro,
        data: { version: { increment: 1 }, recompensasResueltas: true },
      });
      assert.equal(primera.count, 1, "La primera liquidación debe ganar la versión");
      assert.equal(segunda.count, 0, "La misma versión no puede liquidarse dos veces");
      throw rollback;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
    (error) => error === rollback,
  );

  assert.equal(await prisma.usuario.findUnique({ where: { email } }), null,
    "El rollback debe deshacer personaje, party, combate e inventario");
});
