-- Combate PvE de party: estado del enemigo compartido y estado propio por aventurero.
CREATE TABLE "CombateParty" (
  "id" TEXT NOT NULL,
  "expedicionPartyId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 0,
  "fase" TEXT NOT NULL DEFAULT 'activo',
  "ronda" INTEGER NOT NULL DEFAULT 1,
  "faseTurno" TEXT NOT NULL DEFAULT 'jugador',
  "turnoActualUsuarioId" TEXT,
  "enemigoId" TEXT NOT NULL,
  "enemigoNombre" TEXT NOT NULL,
  "enemigoHp" INTEGER NOT NULL,
  "enemigoHpMaximo" INTEGER NOT NULL,
  "enemigoAtaque" INTEGER NOT NULL,
  "enemigoAtaqueMagico" INTEGER NOT NULL,
  "enemigoDefensa" INTEGER NOT NULL,
  "enemigoDefensaMagica" INTEGER NOT NULL,
  "enemigoVelocidad" INTEGER NOT NULL,
  "enemigoProbCritico" DOUBLE PRECISION NOT NULL,
  "enemigoDanoCritico" DOUBLE PRECISION NOT NULL,
  "enemigoPrecision" DOUBLE PRECISION NOT NULL DEFAULT 75,
  "enemigoEvasion" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "enemigoNivel" INTEGER NOT NULL,
  "efectosEnemigo" JSONB NOT NULL DEFAULT '[]',
  "log" JSONB NOT NULL DEFAULT '[]',
  "ultimaAccion" JSONB,
  "creado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizado" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CombateParty_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CombatePartyParticipante" (
  "id" TEXT NOT NULL,
  "combatePartyId" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "personajeId" TEXT NOT NULL,
  "ordenTurno" INTEGER NOT NULL,
  "estado" TEXT NOT NULL DEFAULT 'activo',
  "jugadorPosicion" TEXT NOT NULL DEFAULT 'centro',
  "jugadorHp" INTEGER NOT NULL,
  "jugadorHpMaximo" INTEGER NOT NULL,
  "jugadorAtaque" INTEGER NOT NULL,
  "jugadorAtaqueMagico" INTEGER NOT NULL DEFAULT 1,
  "jugadorDefensa" INTEGER NOT NULL,
  "jugadorDefensaMagica" INTEGER NOT NULL DEFAULT 0,
  "jugadorVelocidad" INTEGER NOT NULL,
  "jugadorProbCritico" DOUBLE PRECISION NOT NULL,
  "jugadorDanoCritico" DOUBLE PRECISION NOT NULL,
  "jugadorPrecision" DOUBLE PRECISION NOT NULL DEFAULT 75,
  "jugadorEvasion" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "jugadorNivel" INTEGER NOT NULL,
  "cooldowns" JSONB NOT NULL DEFAULT '{}',
  "efectos" JSONB NOT NULL DEFAULT '[]',
  "creado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizado" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CombatePartyParticipante_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CombateParty_expedicionPartyId_key"
  ON "CombateParty"("expedicionPartyId");
CREATE INDEX "CombateParty_fase_actualizado_idx"
  ON "CombateParty"("fase", "actualizado");
CREATE INDEX "CombateParty_faseTurno_turnoActualUsuarioId_idx"
  ON "CombateParty"("faseTurno", "turnoActualUsuarioId");
CREATE UNIQUE INDEX "CombatePartyParticipante_combatePartyId_usuarioId_key"
  ON "CombatePartyParticipante"("combatePartyId", "usuarioId");
CREATE UNIQUE INDEX "CombatePartyParticipante_combatePartyId_personajeId_key"
  ON "CombatePartyParticipante"("combatePartyId", "personajeId");
CREATE UNIQUE INDEX "CombatePartyParticipante_combatePartyId_ordenTurno_key"
  ON "CombatePartyParticipante"("combatePartyId", "ordenTurno");
CREATE INDEX "CombatePartyParticipante_usuarioId_estado_idx"
  ON "CombatePartyParticipante"("usuarioId", "estado");
CREATE INDEX "CombatePartyParticipante_personajeId_estado_idx"
  ON "CombatePartyParticipante"("personajeId", "estado");

ALTER TABLE "CombateParty"
  ADD CONSTRAINT "CombateParty_expedicionPartyId_fkey"
  FOREIGN KEY ("expedicionPartyId") REFERENCES "ExpedicionParty"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CombatePartyParticipante"
  ADD CONSTRAINT "CombatePartyParticipante_combatePartyId_fkey"
  FOREIGN KEY ("combatePartyId") REFERENCES "CombateParty"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CombatePartyParticipante_usuarioId_fkey"
  FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CombatePartyParticipante_personajeId_fkey"
  FOREIGN KEY ("personajeId") REFERENCES "Personaje"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
