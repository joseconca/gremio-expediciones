# Monje — Tier 2 (paquete raster v2)

## Fuentes maestras
- `source/monje-m-core-3rows.webp` — máster raster masculino.
- `source/monje-f-core-3rows.webp` — máster raster femenino.

Los másteres se extrajeron del panel de Monje de la referencia gráfica Tier 2. Las acciones están ordenadas en filas: Idle, Caminar y Recibir daño; cada fila contiene cuatro celdas nativas de 32×64.

## Paquete generado
- 6 tiras PNG de 256×128, cuatro fotogramas de 64×128.
- 24 frames nativos PNG de 32×64.
- 6 previews e informes QA JSON.
- El personaje aparece sin armas: puños, vendas y vestimenta forman el cuerpo; armas futuras serán capas independientes.

**Estado:** paquete generado y QA técnico verde; revisión visual pendiente. El máster procede de un póster de referencia y puede conservar restos de fondo/recorte. No está integrado en runtime.


## Runtime integration — 2026-10-23

Runtime integration (commit 690640b): rows 0-2 use the canonical v2 Idle/Walk/Hurt strips for both sexes. Rows 3-14 are unchanged; remaining action work is non-blocking for these three cycles.
