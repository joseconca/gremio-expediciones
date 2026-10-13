BEGIN;

-- Keep only skills that belong to the reworked class/job progression system.
-- The legacy generic abilities remain in the source catalogue for compatibility,
-- but existing learned copies are removed from all characters.
DELETE FROM "HabilidadAprendida"
WHERE "habilidadId" NOT IN (
  'estocada_espadachin',
  'luz_acolito',
  'disparo_arquero',
  'chispa_mago',
  'guardia_caballero',
  'bendicion_sacerdote',
  'golpe_cruzado'
);

-- Keep only items introduced for the new equipment-slot model.
-- FK constraints on EquipoEquipado use ON DELETE SET NULL, so deleted items
-- are automatically unequipped from all ten character slots.
DELETE FROM "InventarioObjeto"
WHERE "objetoId" NOT IN (
  'escudo_madera',
  'casco_cuero',
  'pantalones_cuero',
  'botas_cuero',
  'guantes_cuero',
  'collar_cobre',
  'anillo_resistencia'
);

-- A legacy item must not be recoverable from the single-sale buyback snapshot.
UPDATE "Inventario"
SET "ultimaVenta" = NULL
WHERE "ultimaVenta" IS NOT NULL
  AND COALESCE("ultimaVenta"->>'objetoId', '') NOT IN (
    'escudo_madera',
    'casco_cuero',
    'pantalones_cuero',
    'botas_cuero',
    'guantes_cuero',
    'collar_cobre',
    'anillo_resistencia'
  );

-- Remove legacy objects from pending expedition rewards as well, preventing
-- an already-started expedition from reintroducing an item after this cleanup.
UPDATE "ExpedicionActiva" AS ea
SET "recompensa" = jsonb_set(
  ea."recompensa",
  '{objetos}',
  COALESCE(
    (
      SELECT jsonb_agg(objeto)
      FROM jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(ea."recompensa"->'objetos') = 'array'
            THEN ea."recompensa"->'objetos'
          ELSE '[]'::jsonb
        END
      ) AS objeto
      WHERE objeto->>'objetoId' IN (
        'escudo_madera',
        'casco_cuero',
        'pantalones_cuero',
        'botas_cuero',
        'guantes_cuero',
        'collar_cobre',
        'anillo_resistencia'
      )
    ),
    '[]'::jsonb
  ),
  true
)
WHERE jsonb_typeof(ea."recompensa"->'objetos') = 'array';

COMMIT;
