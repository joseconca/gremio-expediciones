ALTER TABLE "Personaje"
  ADD COLUMN "puntosAtributoDisponibles" INTEGER NOT NULL DEFAULT 0;

-- Los personajes existentes reciben puntos de atributo por los niveles Base ya alcanzados.
-- Sus seis atributos comienzan en 1; la migración no modifica sus estadísticas históricas.
UPDATE "Personaje"
SET "puntosAtributoDisponibles" = GREATEST(0, ("nivel" - 1) * 3);
