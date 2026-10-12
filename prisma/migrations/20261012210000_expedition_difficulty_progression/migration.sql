ALTER TABLE "Personaje"
  ADD COLUMN "rangosAmenazaCompletados" JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "ExpedicionActiva"
  ADD COLUMN "modoDificultad" TEXT NOT NULL DEFAULT 'normal';

-- Conserva el acceso práctico de personajes existentes según su nivel Base.
-- Sus rangos anteriores quedan considerados superados para evitar regresiones.
UPDATE "Personaje"
SET "rangosAmenazaCompletados" = CASE
  WHEN "nivel" >= 13 THEN '["I", "II", "III", "IV"]'::jsonb
  WHEN "nivel" >= 10 THEN '["I", "II", "III"]'::jsonb
  WHEN "nivel" >= 7 THEN '["I", "II"]'::jsonb
  WHEN "nivel" >= 4 THEN '["I"]'::jsonb
  ELSE '[]'::jsonb
END;
