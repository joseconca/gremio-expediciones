BEGIN;

-- El inventario pasa de una fila por definición a una instancia por objeto.
ALTER TABLE "InventarioObjeto"
  ADD COLUMN "sufijoId" TEXT,
  ADD COLUMN "bonificaciones" JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE "Inventario"
  ADD COLUMN "ultimaVenta" JSONB;

DROP INDEX IF EXISTS "InventarioObjeto_inventarioId_objetoId_key";
CREATE INDEX IF NOT EXISTS "InventarioObjeto_inventarioId_objetoId_idx"
  ON "InventarioObjeto"("inventarioId", "objetoId");

ALTER TABLE "EquipoEquipado"
  ADD COLUMN "manoSecundariaInventarioId" TEXT,
  ADD COLUMN "cascoInventarioId" TEXT,
  ADD COLUMN "pantalonesInventarioId" TEXT,
  ADD COLUMN "botasInventarioId" TEXT,
  ADD COLUMN "guantesInventarioId" TEXT,
  ADD COLUMN "anillo1InventarioId" TEXT,
  ADD COLUMN "anillo2InventarioId" TEXT;

ALTER TABLE "EquipoEquipado"
  ADD CONSTRAINT "EquipoEquipado_manoSecundariaInventarioId_fkey"
    FOREIGN KEY ("manoSecundariaInventarioId") REFERENCES "InventarioObjeto"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "EquipoEquipado_cascoInventarioId_fkey"
    FOREIGN KEY ("cascoInventarioId") REFERENCES "InventarioObjeto"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "EquipoEquipado_pantalonesInventarioId_fkey"
    FOREIGN KEY ("pantalonesInventarioId") REFERENCES "InventarioObjeto"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "EquipoEquipado_botasInventarioId_fkey"
    FOREIGN KEY ("botasInventarioId") REFERENCES "InventarioObjeto"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "EquipoEquipado_guantesInventarioId_fkey"
    FOREIGN KEY ("guantesInventarioId") REFERENCES "InventarioObjeto"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "EquipoEquipado_anillo1InventarioId_fkey"
    FOREIGN KEY ("anillo1InventarioId") REFERENCES "InventarioObjeto"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "EquipoEquipado_anillo2InventarioId_fkey"
    FOREIGN KEY ("anillo2InventarioId") REFERENCES "InventarioObjeto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Conserva los anillos antiguos: migra el accesorio equipado al primer anillo.
UPDATE "EquipoEquipado" e
SET
  "anillo1InventarioId" = e."accesorioInventarioId",
  "accesorioInventarioId" = NULL
WHERE e."accesorioInventarioId" IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "InventarioObjeto" io
    WHERE io."id" = e."accesorioInventarioId"
      AND io."objetoId" LIKE 'anillo_%'
  );

-- Compensación única por el catálogo legado. Los objetos se conservan;
-- la migración solo acredita un 30 % de su valor catalogado por unidad.
WITH precios("objetoId", "precio") AS (
  VALUES
    ('pocion', 25),
    ('pocion_grande', 60),
    ('espada_madera', 100),
    ('espada_hierro', 1000),
    ('espada_acero', 12500),
    ('espada_runa', 146000),
    ('hacha_orca', 12000),
    ('tela_andrajosa', 100),
    ('armadura_cuero', 1100),
    ('armadura_hierro', 12500),
    ('armadura_acero', 146000),
    ('anillo_viajero', 20000),
    ('amuleto_vitalidad', 55000),
    ('anillo_maldito', 500000)
),
compensaciones AS (
  SELECT p."usuarioId", SUM(FLOOR(precios."precio" * 0.30)::bigint * GREATEST(io."cantidad", 1))::bigint AS oro
  FROM "InventarioObjeto" io
  JOIN "Inventario" i ON i."id" = io."inventarioId"
  JOIN "Personaje" p ON p."id" = i."personajeId"
  JOIN precios ON precios."objetoId" = io."objetoId"
  GROUP BY p."usuarioId"
)
UPDATE "Usuario" u
SET "oro" = u."oro" + compensaciones.oro
FROM compensaciones
WHERE u."id" = compensaciones."usuarioId";

COMMIT;
