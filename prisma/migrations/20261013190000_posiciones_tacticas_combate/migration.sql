ALTER TABLE "Personaje"
  ADD COLUMN "posicionCombate" TEXT NOT NULL DEFAULT 'centro';

ALTER TABLE "CombateActivo"
  ADD COLUMN "jugadorPosicion" TEXT NOT NULL DEFAULT 'centro',
  ADD COLUMN "enemigoPosicion" TEXT NOT NULL DEFAULT 'centro';
