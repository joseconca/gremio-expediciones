# Espadachín Tier 1 — Recibir daño (revisión)

## Recursos

- Masculino: espadachin-m-hurt.png (256 × 128; cuatro celdas de 64 × 128).
- Femenino: espadachin-f-hurt.png (256 × 128; cuatro celdas de 64 × 128).
- Cada variante incluye los cuatro fotogramas fuente, un preview ampliado y el informe QA exportado desde GitHub Actions.

## Estado

Ambas tiras están versionadas en main, en carpetas de recursos originales y fuera del atlas activo. Los workflows de generación y QA terminaron correctamente. Son primeras pasadas de animación generadas de forma reproducible desde un fotograma de Caminar de la misma clase; no se añadieron armas dentro del cuerpo.

La copia de Idle masculino que está actualmente bajo assets/spritesheets/originales/espadachin/idle/ no se pudo abrir en GitHub Actions. Se ha documentado como pendiente de restaurar y verificar antes de ensamblar el atlas final.

## Siguiente acción del plan

Usar consumible masculino y después femenino. Antes de integrar en runtime se hará una revisión artística más fina de todas las filas.
