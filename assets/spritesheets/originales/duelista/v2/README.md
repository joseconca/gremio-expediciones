# Duelista — Tier 2 (v2 generado, no integrado)

## Fuentes maestras
- `source/duelista-f-core-3rows.svg` — máster vectorial editable femenino.
- `source/duelista-m-core-3rows.svg` — máster vectorial editable masculino.
- Las versiones PNG `*-core-3rows.png` las rasteriza automáticamente `scripts/rasterize-tier2-svg-masters.py`.

## Paquete generado
- 6 tiras PNG: Idle, Caminar y Recibir daño para ambos sexos; 256×128 px, cuatro fotogramas de 64×128.
- 24 frames nativos de 32×64 px.
- 6 previews e informes QA JSON.
- Alfa real, 4 frames distintos por tira y deriva de pies registrada de 2 px.

La animación se refinó moviendo el grupo de piernas y botas, no el sprite completo, para mantener el torso y la cabeza alineados. Las manos quedan vacías: armas y escudos se añadirán como capas independientes. La preview usa una cuadrícula oscura solo para revisión; no forma parte de las tiras PNG fuente.

**Estado:** requiere revisión visual y no se ha integrado a `public/sprites/heroes` ni al runtime.