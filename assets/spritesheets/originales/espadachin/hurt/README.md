# Espadachín Tier 1 — Recibir daño

## Recursos versionados

- Masculino: `espadachin-m-hurt.png` — [commit de arte](https://github.com/joseconca/gremio-expediciones/commit/0b1b36d92c553df42ef905a60a38c7d816127c16).
- Femenino: `espadachin-f-hurt.png` — [commit de arte](https://github.com/joseconca/gremio-expediciones/commit/59eeb8d3548ee82f6df2d64f26797f668711e2cc).
- Cada tira mide 256 × 128 px: cuatro celdas horizontales de 64 × 128 px.
- RGBA con transparencia real; cuatro fotogramas diferentes y pies alineados.
- Fuentes en `frames/m/` y `frames/f/`; previsualizaciones en `previews/`; informes en `qa-report.json` y `qa-report-f.json`.

## Procedencia, QA y estado artístico

Las dos tiras parten del primer fotograma de Caminar del **mismo Espadachín** y aplican retroceso, descenso y recuperación. No usan Novato como plantilla ni superponen piezas de armadura de otra clase. Las armas no están dibujadas en el cuerpo.

Los workflows de generación y QA pasaron las comprobaciones técnicas de tamaño, alfa y fotogramas. **Estado: prototipo técnico, pendiente de refinamiento artístico.** El movimiento se ha obtenido mediante transformaciones sobre la fuente, por lo que todavía hay que redibujar poses de impacto más naturales antes de aprobarlas para runtime.

## Integración

Estas tiras están aisladas en la carpeta de fuentes. No se han integrado en los atlas activos. La incidencia de Idle mencionada en versiones anteriores de esta documentación está corregida: los Idle masculino y femenino se regeneraron desde el concepto original y ya no utilizan las filas heredadas de Tier 1.
