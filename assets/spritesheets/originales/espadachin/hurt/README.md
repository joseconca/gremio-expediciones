# Espadachín Tier 1 — Recibir daño

## Recursos versionados

- Masculino: `espadachin-m-hurt.png` — commit [0b1b36d](https://github.com/joseconca/gremio-expediciones/commit/0b1b36d92c553df42ef905a60a38c7d816127c16).
- Femenino: `espadachin-f-hurt.png` — commit [59eeb8d](https://github.com/joseconca/gremio-expediciones/commit/59eeb8d3548ee82f6df2d64f26797f668711e2cc).
- Cada tira mide 256 × 128 px: 4 celdas horizontales de 64 × 128 px.
- RGBA, transparencia real, cuatro fotogramas distintos y pies alineados.
- Fuentes separadas en `frames/m/` y `frames/f/`; previsualizaciones ampliadas en `previews/`; informes en `qa-report.json` y `qa-report-f.json`.

## Método y estado

La primera iteración crea una reacción genérica al daño utilizando el primer fotograma de Caminar de la misma clase como referencia de cuerpo, con retroceso, descenso y recuperación progresivos. No usa la base de Novato ni otra clase y no pinta armas dentro del cuerpo: las armas seguirán siendo capas equipables.

Los workflows de generación masculina y femenina completaron sus validaciones técnicas. Es una **primera pasada de animación fuente** que todavía requiere revisión artística fina antes de considerarla definitiva. Estas tiras no se han integrado en las hojas activas de runtime.

## Incidencia pendiente

El PNG de Idle masculino de `assets/spritesheets/originales/espadachin/idle/` no pudo abrirse en GitHub Actions. Antes de montar el atlas final hay que restaurar y comprobar los PNG maestros de Idle masculino y femenino, cotejando las dimensiones, alfa y hashes con sus originales íntegros.
