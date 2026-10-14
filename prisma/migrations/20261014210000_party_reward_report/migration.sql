-- Persiste el resumen estructurado de la liquidación para que todos los miembros puedan consultarlo tras recargar.
ALTER TABLE "CombateParty"
  ADD COLUMN "recompensasResultado" JSONB;
