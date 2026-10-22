# Duelista — Tier 2 (fuente raster v2, no integrado)

## Fuentes maestras

- `source/duelista-f-core-3rows.webp` — máster raster femenino procedente de la lámina 4×3.
- `source/duelista-m-core-3rows.webp` — máster raster masculino procedente de la lámina 4×3.

Los másteres tienen 128×192 píxeles: cuatro fotogramas nativos de 32×64 por fila, con tres filas (Idle, Caminar y Recibir daño), transparencia real y paleta pixel-art reducida. No se dibujan armas en el cuerpo; armas y escudos se montarán como capas independientes. Los antiguos másteres SVG y los PNG rasterizados desde SVG se han retirado.

## Paquete generado

- 6 tiras PNG: Idle, Caminar y Recibir daño para ambos sexos; 256×128 px, cuatro fotogramas de 64×128.
- 24 frames nativos de 32×64 px.
- 6 previews e informes QA JSON.
- El workflow valida alfa real, cuatro frames diferentes por fila y consistencia de las dimensiones.

La preview de revisión no forma parte de las tiras fuente. La regeneración desde los másteres raster es reproducible mediante `build-tier2-class-v2.yml`.

**Estado:** requiere revisión visual; aún no se integra en `public/sprites/heroes` ni en el runtime.
