BEGIN;

-- Reinicia la profesión activa de todos los personajes que ya existían al aplicar
-- esta migración, sin alterar su nivel ni experiencia Base.
UPDATE "Personaje"
SET
  "clase" = 'Novato',
  "profesionActivaId" = 'novato';

-- El nuevo modelo empieza cada personaje desde Novato Job 1. Se limpian
-- las profesiones de prueba/anteriores para que deban desbloquearse de nuevo.
DELETE FROM "ProgresoClase"
WHERE "claseId" <> 'novato';

UPDATE "ProgresoClase"
SET
  "nivelJob" = 1,
  "experienciaJob" = 0,
  "puntosHabilidadDisponibles" = 0,
  "desbloqueada" = TRUE,
  "maestriaCompletada" = FALSE,
  "actualizado" = CURRENT_TIMESTAMP
WHERE "claseId" = 'novato';

-- Protección para personajes sin fila Novato (por ejemplo, si una instalación
-- anterior aplicó solo parte del modelo de progresión antes de restaurarse).
INSERT INTO "ProgresoClase" (
  "id",
  "personajeId",
  "claseId",
  "nivelJob",
  "experienciaJob",
  "puntosHabilidadDisponibles",
  "desbloqueada",
  "maestriaCompletada",
  "creado",
  "actualizado"
)
SELECT
  'novato-' || p."id",
  p."id",
  'novato',
  1,
  0,
  0,
  TRUE,
  FALSE,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Personaje" p
WHERE NOT EXISTS (
  SELECT 1
  FROM "ProgresoClase" pc
  WHERE pc."personajeId" = p."id"
    AND pc."claseId" = 'novato'
)
ON CONFLICT ("personajeId", "claseId") DO NOTHING;

COMMIT;
