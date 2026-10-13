-- La recuperación de los recursos se realiza al comenzar una expedición;
-- no existe regeneración pasiva mientras el personaje permanece en la base.
ALTER TABLE "Personaje"
  DROP COLUMN IF EXISTS "regeneracionDeVida",
  DROP COLUMN IF EXISTS "ultimaRegeneracion";

ALTER TABLE "Personaje"
  ADD COLUMN "comidaPreparada" TEXT;

ALTER TABLE "ExpedicionActiva"
  ADD COLUMN "efectoComida" TEXT;
