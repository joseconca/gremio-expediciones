-- Expedición compartida: un viaje común y un registro individual por aventurero.
CREATE TABLE "ExpedicionParty" (
  "id" TEXT NOT NULL,
  "partyId" TEXT NOT NULL,
  "liderUsuarioId" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "misionId" TEXT NOT NULL,
  "enemigoId" TEXT,
  "nombre" TEXT NOT NULL,
  "recompensa" JSONB NOT NULL,
  "dificultad" INTEGER NOT NULL,
  "modoDificultad" TEXT NOT NULL DEFAULT 'normal',
  "fase" TEXT NOT NULL DEFAULT 'en_viaje',
  "resultadoFinal" TEXT,
  "fechaSalida" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fechaLlegada" TIMESTAMP(3) NOT NULL,
  "origenCoords" JSONB NOT NULL,
  "destinoCoords" JSONB NOT NULL,
  "creado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizado" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExpedicionParty_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExpedicionPartyParticipante" (
  "id" TEXT NOT NULL,
  "expedicionPartyId" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "personajeId" TEXT NOT NULL,
  "estado" TEXT NOT NULL DEFAULT 'en_viaje',
  "hpInicio" INTEGER NOT NULL,
  "energiaInicio" INTEGER NOT NULL,
  "manaInicio" INTEGER NOT NULL,
  "efectoComida" TEXT,
  "creado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizado" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExpedicionPartyParticipante_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExpedicionParty_partyId_fase_idx"
  ON "ExpedicionParty"("partyId", "fase");
CREATE INDEX "ExpedicionParty_fase_fechaLlegada_idx"
  ON "ExpedicionParty"("fase", "fechaLlegada");
CREATE UNIQUE INDEX "ExpedicionPartyParticipante_expedicionPartyId_usuarioId_key"
  ON "ExpedicionPartyParticipante"("expedicionPartyId", "usuarioId");
CREATE UNIQUE INDEX "ExpedicionPartyParticipante_expedicionPartyId_personajeId_key"
  ON "ExpedicionPartyParticipante"("expedicionPartyId", "personajeId");
CREATE INDEX "ExpedicionPartyParticipante_usuarioId_estado_idx"
  ON "ExpedicionPartyParticipante"("usuarioId", "estado");
CREATE INDEX "ExpedicionPartyParticipante_personajeId_estado_idx"
  ON "ExpedicionPartyParticipante"("personajeId", "estado");

ALTER TABLE "ExpedicionParty"
  ADD CONSTRAINT "ExpedicionParty_partyId_fkey"
  FOREIGN KEY ("partyId") REFERENCES "Party"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ExpedicionParty_liderUsuarioId_fkey"
  FOREIGN KEY ("liderUsuarioId") REFERENCES "Usuario"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExpedicionPartyParticipante"
  ADD CONSTRAINT "ExpedicionPartyParticipante_expedicionPartyId_fkey"
  FOREIGN KEY ("expedicionPartyId") REFERENCES "ExpedicionParty"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ExpedicionPartyParticipante_usuarioId_fkey"
  FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ExpedicionPartyParticipante_personajeId_fkey"
  FOREIGN KEY ("personajeId") REFERENCES "Personaje"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
