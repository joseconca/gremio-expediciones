-- Añade datos persistentes para calcular el regreso compartido sin inferir velocidades.
ALTER TABLE "ExpedicionParty"
  ADD COLUMN "origenCoords" JSONB NOT NULL DEFAULT '{"lat":0,"lng":0}'::jsonb;

ALTER TABLE "ExpedicionPartyParticipante"
  ADD COLUMN "velocidadViajeKmh" DOUBLE PRECISION NOT NULL DEFAULT 6;
