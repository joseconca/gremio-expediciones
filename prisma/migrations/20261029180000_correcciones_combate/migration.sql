ALTER TABLE "Personaje" ALTER COLUMN "energiaActual" SET DEFAULT 100;
ALTER TABLE "Personaje" ADD COLUMN "manaRegeneracionPendiente" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "CombateActivo" ADD COLUMN "bonificacionesComida" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "CombatePartyParticipante" ADD COLUMN "bonificacionesComida" JSONB NOT NULL DEFAULT '{}';
