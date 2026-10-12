ALTER TABLE "CombateActivo"
  ADD COLUMN "jugadorAtaqueMagico" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "jugadorDefensaMagica" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "enemigoAtaqueMagico" INTEGER,
  ADD COLUMN "enemigoDefensaMagica" INTEGER;
