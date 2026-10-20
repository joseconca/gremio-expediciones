# Espadachín — arte original por acción

Carpeta de fuentes de arte por acción y sexo. Estos PNG todavía están separados del atlas de runtime.

## Idle

- `espadachin-m-idle.png`: cuatro fotogramas masculinos.
- `espadachin-f-idle.png`: cuatro fotogramas femeninos.
- Cada tira mide 256 × 128 px: cuatro celdas horizontales de 64 × 128 px.
- Orientación única, tres cuartos hacia la derecha.
- PNG indexado con alfa/transparencia real, 31 colores visibles como máximo más índice transparente.
- Sin armas dentro del cuerpo; las armas se compondrán como capas equipables en una fase posterior.
- Fuente de arte: `docs/espadachin-caminar-entrega/source/concept_walk.png`, filas Idle del personaje Espadachín completo. No se utiliza Novato como plantilla ni las antiguas filas de `assets/spritesheets/tier1/*-idle-row.png`.

## Generación y QA

El generador es `scripts/generar-idle-original-espadachin.py`; el workflow `.github/workflows/generar-idle-original-espadachin.yml` regenera y valida masculino y femenino, publicándolos en commits separados.

- Informe por sexo: `qa-report-m.json` y `qa-report-f.json`.
- Fotogramas individuales en `frames/m/` y `frames/f/`.
- Previsualizaciones ampliadas en `previews/`.
- QA: 256 × 128, cuatro celdas no vacías, cuatro fotogramas distintos, pies alineados y alfa real.

## Incidencia de las filas heredadas

El commit [80afc16](https://github.com/joseconca/gremio-expediciones/commit/80afc16ac5db88d7953e43ddc64743b0be6ffb91) copió por error las antiguas filas `assets/spritesheets/tier1/*-idle-row.png` a esta carpeta. Eso fue incorrecto: dichas filas son arte heredado y no deben considerarse maestros originales. Las rutas masculina y femenina de Idle se reemplazaron después con arte extraído del concepto de clase y validado por CI. No usar las filas heredadas como fuente ni sustituir todavía el atlas activo de runtime.

## Estado

Idle masculino y femenino están versionados y validados como fuentes de trabajo. Caminar y Recibir daño también tienen recursos fuente para ambos sexos, aunque Recibir daño sigue siendo un prototipo que requiere refinamiento de poses. Las hojas activas del juego permanecen intactas hasta que los tres estados estén revisados y se decida la integración.
