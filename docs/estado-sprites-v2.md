# Estado verificable de sprites v2

**Actualizado:** 2026-10-21  
**Rama:** `main`  
**Política de integración:** estas salidas son arte en revisión. Las hojas de producción no se sustituyen hasta aprobar visualmente cada paquete.

## Novato (Tier 0) — paquete generado

Los másteres [Novata](../assets/spritesheets/originales/novato/v2/source/novato-f-core-3rows.webp) y [Novato](../assets/spritesheets/originales/novato/v2/source/novato-m-core-3rows.webp) son recortes comunes de tres filas: Idle, Caminar y Recibir daño. Las seis tiras derivadas están en PNG de 256×128, con cuatro fotogramas de 64×128; también se exportan los fotogramas nativos de 32×64.

| Personaje | Idle | Caminar | Recibir daño |
|---|---|---|---|
| Novata | [PNG](../assets/spritesheets/originales/novato/v2/idle/novato-f-idle.png) · [preview](../assets/spritesheets/originales/novato/v2/idle/previews/novato-f-idle-preview.png) | [PNG](../assets/spritesheets/originales/novato/v2/walk/novato-f-walk.png) · [preview](../assets/spritesheets/originales/novato/v2/walk/previews/novato-f-walk-preview.png) | [PNG](../assets/spritesheets/originales/novato/v2/hurt/novato-f-hurt.png) · [preview](../assets/spritesheets/originales/novato/v2/hurt/previews/novato-f-hurt-preview.png) |
| Novato | [PNG](../assets/spritesheets/originales/novato/v2/idle/novato-m-idle.png) · [preview](../assets/spritesheets/originales/novato/v2/idle/previews/novato-m-idle-preview.png) | [PNG](../assets/spritesheets/originales/novato/v2/walk/novato-m-walk.png) · [preview](../assets/spritesheets/originales/novato/v2/walk/previews/novato-m-walk-preview.png) | [PNG](../assets/spritesheets/originales/novato/v2/hurt/novato-m-hurt.png) · [preview](../assets/spritesheets/originales/novato/v2/hurt/previews/novato-m-hurt-preview.png) |

## Espadachín (Tier 1) — paquete generado

Los másteres [Espadachina](../assets/spritesheets/originales/espadachin/v2/source/espadachin-f-core-3rows.webp) y [Espadachín](../assets/spritesheets/originales/espadachin/v2/source/espadachin-m-core-3rows.webp) también proceden de recortes de la lámina generada, conservando las tres acciones y cuatro fotogramas en cada fila.

| Personaje | Idle | Caminar | Recibir daño |
|---|---|---|---|
| Espadachina | [PNG](../assets/spritesheets/originales/espadachin/v2/idle/espadachin-f-idle.png) · [preview](../assets/spritesheets/originales/espadachin/v2/idle/previews/espadachin-f-idle-preview.png) | [PNG](../assets/spritesheets/originales/espadachin/v2/walk/espadachin-f-walk.png) · [preview](../assets/spritesheets/originales/espadachin/v2/walk/previews/espadachin-f-walk-preview.png) | [PNG](../assets/spritesheets/originales/espadachin/v2/hurt/espadachin-f-hurt.png) · [preview](../assets/spritesheets/originales/espadachin/v2/hurt/previews/espadachin-f-hurt-preview.png) |
| Espadachín | [PNG](../assets/spritesheets/originales/espadachin/v2/idle/espadachin-m-idle.png) · [preview](../assets/spritesheets/originales/espadachin/v2/idle/previews/espadachin-m-idle-preview.png) | [PNG](../assets/spritesheets/originales/espadachin/v2/walk/espadachin-m-walk.png) · [preview](../assets/spritesheets/originales/espadachin/v2/walk/previews/espadachin-m-walk-preview.png) | [PNG](../assets/spritesheets/originales/espadachin/v2/hurt/espadachin-m-hurt.png) · [preview](../assets/spritesheets/originales/espadachin/v2/hurt/previews/espadachin-m-hurt-preview.png) |

## QA y límites

- Las 12 tiras tienen cuatro fotogramas distintos por acción, transparencia alfa real (0–255), un único máster por sexo y línea de pies alineada.
- Los informes JSON incluyen hashes por fotograma, dimensiones de tira/celda y rutas a los PNG nativos de 32×64.
- `runtime_integrated: false`: no se han sustituido las hojas de producción de `public/sprites/heroes/`.
- `artistic_approval: pending visual review`: el QA técnico no sustituye la revisión visual. En la animación Idle de algunas fuentes hay cambios sutiles; se deben revisar junto al juego antes de promoverlas.
- Las armas siguen separadas del cuerpo para poder equiparlas en capas independientes.

La generación de los paquetes Novato y Espadachín terminó correctamente; el commit de arte más reciente es [`84c1713`](https://github.com/joseconca/gremio-expediciones/commit/84c17137dc5b4faad69bf5f86915b34abf86db15).

## Próximo bloque

Continuar con las demás clases de Tier 1 (Arquero, Mago y Acólito), priorizando másteres comunes y recortes individuales. El material legado de `assets/spritesheets/tier1/` no debe confundirse con estas nuevas entregas. Mantener el runtime intacto hasta que cada paquete se revise visualmente.
