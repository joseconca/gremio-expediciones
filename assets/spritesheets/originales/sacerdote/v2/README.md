# Sacerdote — Tier 2 (paquete raster v2)

## Fuentes maestras
- `source/sacerdote-m-core-3rows.webp` — máster masculino raster, lossless.
- `source/sacerdote-f-core-3rows.webp` — máster femenino raster, lossless.

Los másteres se prepararon a partir de las láminas de personaje compartidas el 22-10-2026. Cada uno tiene tres filas (Idle, Caminar, Recibir daño) y cuatro celdas nativas de 32×64 por fila. Se conservaron las poses y los detalles del diseño; puede quedar residuo de fondo/halo en bordes, aceptado para una pasada de limpieza posterior.

## Paquete generado
- 6 tiras PNG, 256×128, cuatro fotogramas de 64×128.
- 24 frames nativos PNG de 32×64.
- 6 previews e informes QA JSON.
- Sin armas integradas en el cuerpo: bastón, símbolos y equipo se componen como capas independientes en el juego.

**Estado:** paquete generado; revisión visual pendiente. No integrado en runtime.


## Runtime integration — 2026-10-23

Runtime integration (commit 690640b): rows 0-2 use the canonical v2 Idle/Walk/Hurt strips for both sexes. Rows 3-14 are unchanged; remaining action work is non-blocking for these three cycles.
