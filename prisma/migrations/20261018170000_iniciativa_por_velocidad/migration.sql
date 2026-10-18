ALTER TABLE "CombateActivo"
ADD COLUMN "turnosPendientes" JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "CombateParty"
ADD COLUMN "turnosPendientes" JSONB NOT NULL DEFAULT '[]'::jsonb;
