ALTER TABLE "Personaje"
  ADD COLUMN "profesionActivaId" TEXT NOT NULL DEFAULT 'novato',
  ADD COLUMN "fuerza" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "agilidad" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "vitalidad" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "inteligencia" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "destreza" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "suerte" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "energiaActual" INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN "manaActual" INTEGER NOT NULL DEFAULT 10;

CREATE TABLE "ProgresoClase" (
  "id" TEXT NOT NULL,
  "personajeId" TEXT NOT NULL,
  "claseId" TEXT NOT NULL,
  "nivelJob" INTEGER NOT NULL DEFAULT 1,
  "experienciaJob" INTEGER NOT NULL DEFAULT 0,
  "puntosHabilidadDisponibles" INTEGER NOT NULL DEFAULT 0,
  "desbloqueada" BOOLEAN NOT NULL DEFAULT false,
  "maestriaCompletada" BOOLEAN NOT NULL DEFAULT false,
  "creado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizado" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProgresoClase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProgresoClase_personajeId_claseId_key"
  ON "ProgresoClase"("personajeId", "claseId");
CREATE INDEX "ProgresoClase_personajeId_desbloqueada_idx"
  ON "ProgresoClase"("personajeId", "desbloqueada");
CREATE INDEX "ProgresoClase_claseId_nivelJob_idx"
  ON "ProgresoClase"("claseId", "nivelJob");

ALTER TABLE "ProgresoClase"
  ADD CONSTRAINT "ProgresoClase_personajeId_fkey"
  FOREIGN KEY ("personajeId") REFERENCES "Personaje"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Mantiene intactos los campos legados "clase", "nivel" y "experiencia".
INSERT INTO "ProgresoClase" (
  "id", "personajeId", "claseId", "nivelJob", "experienciaJob",
  "puntosHabilidadDisponibles", "desbloqueada", "maestriaCompletada",
  "creado", "actualizado"
)
SELECT
  'novato-' || p."id", p."id", 'novato', 1, 0, 0, TRUE, FALSE,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Personaje" p
ON CONFLICT ("personajeId", "claseId") DO NOTHING;
