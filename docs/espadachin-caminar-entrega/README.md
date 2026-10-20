# Espadachín Tier 1 — Caminar (revisión)

Este paquete contiene la siguiente iteración de arte para el juego: Caminar masculino y femenino, aislados en tiras de cuatro fotogramas.

## Recursos

- `sprites/espadachin-m-walk.png` — 256 × 128 px, cuatro celdas de 64 × 128.
- `sprites/espadachin-f-walk.png` — 256 × 128 px, cuatro celdas de 64 × 128.
- `sprites/espadachin-{m,f}-walk-01..04.png` — fotogramas independientes en RGBA.
- `previews/` — ampliaciones nearest-neighbor de las tiras finales, sobre damero de visualización (el damero no está dentro de los PNG de juego).
- `source/concept_walk.png` — imagen fuente original usada para aislar las poses.
- `scripts/` — extracción, normalización de celdas y validación.
- `qa-report.json` — dimensiones, alfa, márgenes, diferencias entre frames y SHA-256.

## Contrato artístico y técnico

Diseño original de Espadachín de fantasía medieval, tres cuartos hacia la derecha. Sin arma dibujada en el cuerpo: las armas equipadas se renderizarán en una capa independiente. Se conserva un lienzo final de 256 × 128 para esta acción, dividido en cuatro celdas de 64 × 128.

## Estado de publicación

Los PNG pasan las validaciones locales de tamaño, transparencia y variación entre fotogramas. **Todavía no se han publicado como archivos binarios en GitHub ni se han conectado a las hojas activas**, porque el SHA del blob devuelto por el conector no coincidía con el SHA del PNG local. En `assets/spritesheets/originales/espadachin/walk/README.md` del repositorio se dejó un checkpoint con los hashes para recuperar la publicación sin aceptar un recurso potencialmente corrupto.

Orden de trabajo posterior: publicar y verificar los binarios, cerrar Caminar, luego trabajar Recibir daño. No avanzar a la siguiente acción hasta que la fase actual esté versionada correctamente.
