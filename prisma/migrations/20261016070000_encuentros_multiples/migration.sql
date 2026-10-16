ALTER TABLE "CombateActivo"
ADD COLUMN "enemigos" JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "CombateParty"
ADD COLUMN "enemigos" JSONB NOT NULL DEFAULT '[]'::jsonb;
