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

## Organización canónica y limpieza

Se retiraron las salidas v1 duplicadas de `assets/spritesheets/originales/novato/{idle,walk,hurt}/` y `assets/spritesheets/originales/espadachin/{idle,walk,hurt}/`: los paquetes de revisión vigentes son los ubicados en `v2/`. También se eliminan las fuentes por acción que duplicaban los másteres v2, los PNG de respaldo y las copias de fotogramas ampliados de 64×128; se conservan los fotogramas individuales nativos de 32×64, las tiras de 256×128, los másteres WebP, las previews y los informes QA. Se retiraron los scripts/workflows que regeneraban paquetes v1. `assets/spritesheets/tier1/` y `public/sprites/heroes/` se mantienen porque son entradas y recursos de producción usados por el generador de hojas completas.

## QA y límites

- Las 12 tiras tienen cuatro fotogramas distintos por acción, transparencia alfa real (0–255), un único máster por sexo y línea de pies alineada.
- Los informes JSON incluyen hashes por fotograma, dimensiones de tira/celda y rutas a los PNG nativos de 32×64.
- `runtime_integrated: false`: no se han sustituido las hojas de producción de `public/sprites/heroes/`.
- `artistic_approval: pending visual review`: el QA técnico no sustituye la revisión visual. En la animación Idle de algunas fuentes hay cambios sutiles; se deben revisar junto al juego antes de promoverlas.
- Las armas siguen separadas del cuerpo para poder equiparlas en capas independientes.

La generación de los paquetes Novato y Espadachín terminó correctamente; ver las [ejecuciones de Novato](https://github.com/joseconca/gremio-expediciones/actions/runs/39619092000) y [Espadachín](https://github.com/joseconca/gremio-expediciones/actions/runs/39622303006). La limpieza no integra los recursos en runtime.

## Arquero (Tier 1) — en generación

Se han incorporado los dos másteres transparentes de 128×192 (cuatro fotogramas nativos de 32×64 por fila) en `assets/spritesheets/originales/arquero/v2/source/`. El workflow generará Idle, Caminar y Recibir daño para ambos sexos, con tira ampliada, frames nativos, preview y QA. Se admite hasta 4 px de variación en la línea inferior de Caminar (2 px en la fuente nativa), y hasta 2 px en Idle/Recibir daño.

## Tier 1 restante — flujo preparado

Se ha añadido `scripts/build-tier1-class-v2.py` y su workflow. El workflow solo genera una clase cuando ambos másteres masculinos y femeninos están versionados; publica seis tiras por clase (Idle, Caminar y Recibir daño para ambos sexos), frames nativos 32×64, previews y QA, con un commit de arte por clase. Los recursos de `assets/spritesheets/tier1/` permanecen intactos porque los usa el generador de atlas y equipo. Los nuevos paquetes seguirán marcados como pendientes de aprobación visual y no se conectarán al runtime.
