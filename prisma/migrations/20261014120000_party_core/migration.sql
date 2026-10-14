-- Sistema de parties: grupos persistentes, membresía activa y traslados entre bases.
CREATE TABLE "Party" (
  "id" TEXT NOT NULL,
  "liderUsuarioId" TEXT NOT NULL,
  "creado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizado" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartyMember" (
  "id" TEXT NOT NULL,
  "partyId" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "unidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartyMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartyTransfer" (
  "id" TEXT NOT NULL,
  "visitanteUsuarioId" TEXT NOT NULL,
  "anfitrionUsuarioId" TEXT NOT NULL,
  "estado" TEXT NOT NULL DEFAULT 'en_viaje',
  "decision" TEXT,
  "fechaSalida" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fechaLlegada" TIMESTAMP(3) NOT NULL,
  "fechaResolucion" TIMESTAMP(3),
  "origenCoords" JSONB NOT NULL,
  "destinoCoords" JSONB NOT NULL,
  "creado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizado" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PartyTransfer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PartyTransfer_no_self_transfer_check"
    CHECK ("visitanteUsuarioId" <> "anfitrionUsuarioId")
);

CREATE UNIQUE INDEX "Party_liderUsuarioId_key"
  ON "Party"("liderUsuarioId");
CREATE UNIQUE INDEX "PartyMember_usuarioId_key"
  ON "PartyMember"("usuarioId");
CREATE INDEX "PartyMember_partyId_unidoEn_idx"
  ON "PartyMember"("partyId", "unidoEn");
CREATE INDEX "PartyTransfer_visitanteUsuarioId_estado_idx"
  ON "PartyTransfer"("visitanteUsuarioId", "estado");
CREATE INDEX "PartyTransfer_anfitrionUsuarioId_estado_fechaLlegada_idx"
  ON "PartyTransfer"("anfitrionUsuarioId", "estado", "fechaLlegada");

-- Solo puede existir un traslado en curso por visitante. Los estados terminales
-- se conservan como historial sin impedir que vuelva a solicitar otra visita.
CREATE UNIQUE INDEX "PartyTransfer_visitante_activo_key"
  ON "PartyTransfer"("visitanteUsuarioId")
  WHERE "estado" IN ('en_viaje', 'pendiente', 'regresando');

ALTER TABLE "Party"
  ADD CONSTRAINT "Party_liderUsuarioId_fkey"
  FOREIGN KEY ("liderUsuarioId") REFERENCES "Usuario"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PartyMember"
  ADD CONSTRAINT "PartyMember_partyId_fkey"
  FOREIGN KEY ("partyId") REFERENCES "Party"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PartyMember_usuarioId_fkey"
  FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PartyTransfer"
  ADD CONSTRAINT "PartyTransfer_visitanteUsuarioId_fkey"
  FOREIGN KEY ("visitanteUsuarioId") REFERENCES "Usuario"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PartyTransfer_anfitrionUsuarioId_fkey"
  FOREIGN KEY ("anfitrionUsuarioId") REFERENCES "Usuario"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
