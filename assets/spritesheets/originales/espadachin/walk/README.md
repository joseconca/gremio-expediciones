# Espadachín Tier 1 — Caminar

## Recursos versionados

- Masculino: `espadachin-m-walk.png`.
- Femenino: `espadachin-f-walk.png`.
- Cada tira mide 256 × 128 px: cuatro celdas horizontales de 64 × 128 px.
- Fotogramas RGBA individuales en `frames/m/` y `frames/f/`; vistas previas dentro de `previews/`.
- Informe de control técnico: `qa-report.json`.

## Fuente y contrato visual

Las tiras se extraen del concepto original `docs/espadachin-caminar-entrega/source/concept_walk.png`, que contiene el cuerpo completo y propio del Espadachín. No usan la base de Novato ni las filas heredadas de Tier 1 con armaduras superpuestas. El personaje mira tres cuartos hacia la derecha y no lleva armas dibujadas dentro del cuerpo; las armas equipadas se componen como capas independientes.

## QA

Ambas tiras pasan las validaciones de 256 × 128, cuatro celdas 64 × 128, transparencia real y cuatro fotogramas diferentes por sexo. Los hashes SHA-256 se registran en `qa-report.json`. Esta es una fuente de arte separada, no una sustitución parcial del atlas de runtime.

## Estado

Caminar masculino y femenino están versionados. Recibir daño también está versionado, pero sigue siendo un prototipo con deformaciones transformadas desde Caminar; necesita refinamiento manual de poses antes de aprobarse artísticamente.
