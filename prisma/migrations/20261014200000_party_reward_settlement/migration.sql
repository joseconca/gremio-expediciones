-- Marca la liquidación del botín compartido para impedir pagos duplicados.
ALTER TABLE "CombateParty"
  ADD COLUMN "recompensasResueltas" BOOLEAN NOT NULL DEFAULT FALSE;
