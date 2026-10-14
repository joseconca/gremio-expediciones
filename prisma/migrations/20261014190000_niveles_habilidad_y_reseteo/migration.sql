-- Las habilidades aprendidas guardan su nivel de mejora; las existentes empiezan en nivel 1.
ALTER TABLE "HabilidadAprendida"
ADD COLUMN "nivel" INTEGER NOT NULL DEFAULT 1;
