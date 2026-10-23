# Estado verificable de sprites v2

**Actualizado:** 2026-10-23  
**Rama:** `main`  
**Política de integración:** los paquetes v2 de Novato y Tier 1 están aprobados para las tres acciones principales. Las hojas de producción integran Idle, Caminar y Recibir daño; los retratos estáticos proceden de Idle.

## Integración de Tier 0, Tier 1 y Tier 2 — 2026-10-23

El commit [690640b](https://github.com/joseconca/gremio-expediciones/commit/690640b2533241d185fc342ce1d42d7842455de6) integra las tres acciones preparadas en los 26 atlas de producción y genera 26 retratos PNG a 128×256. El workflow [Integrar sprites runtime Tier 0-2](https://github.com/joseconca/gremio-expediciones/actions/runs/40035425339) validó 78 filas, transparencia y cuatro frames únicos y confirmó que las filas 3-14 permanecen intactas.

- Tier 0: Novato. Tier 1: Mago, Espadachín, Acólito y Arquero.
- Tier 2: Caballero, Duelista, Sacerdote, Monje, Cazador, Explorador, Elementalista y Brujo.
- Tier 2 usa canonical v2 para Caballero/Duelista/Sacerdote/Monje y rework-staging para Cazador/Explorador/Elementalista/Brujo.
- Los retratos se exportan desde el primer frame de Idle, 2× por vecino más cercano; las pantallas que usan obtenerSpriteHeroe ya los consumen. Los SVG de logotipo se preservan como emblemas de clase, no se usan como caras.
- Las acciones aún no rediseñadas siguen en las filas 3-14 y no se declaran aprobadas por esta integración.

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

## Arquero (Tier 1) — paquete generado

Másteres recortados: [femenino](../assets/spritesheets/originales/arquero/v2/source/arquero-f-core-3rows.webp) · [masculino](../assets/spritesheets/originales/arquero/v2/source/arquero-m-core-3rows.webp). Las seis tiras se integran en las hojas de producción y pasan la validación técnica.

| Personaje | Idle | Caminar | Recibir daño |
|---|---|---|---|
| Arquera | [PNG](../assets/spritesheets/originales/arquero/v2/idle/arquero-f-idle.png) · [preview](../assets/spritesheets/originales/arquero/v2/idle/previews/arquero-f-idle-preview.png) | [PNG](../assets/spritesheets/originales/arquero/v2/walk/arquero-f-walk.png) · [preview](../assets/spritesheets/originales/arquero/v2/walk/previews/arquero-f-walk-preview.png) | [PNG](../assets/spritesheets/originales/arquero/v2/hurt/arquero-f-hurt.png) · [preview](../assets/spritesheets/originales/arquero/v2/hurt/previews/arquero-f-hurt-preview.png) |
| Arquero | [PNG](../assets/spritesheets/originales/arquero/v2/idle/arquero-m-idle.png) · [preview](../assets/spritesheets/originales/arquero/v2/idle/previews/arquero-m-idle-preview.png) | [PNG](../assets/spritesheets/originales/arquero/v2/walk/arquero-m-walk.png) · [preview](../assets/spritesheets/originales/arquero/v2/walk/previews/arquero-m-walk-preview.png) | [PNG](../assets/spritesheets/originales/arquero/v2/hurt/arquero-m-hurt.png) · [preview](../assets/spritesheets/originales/arquero/v2/hurt/previews/arquero-m-hurt-preview.png) |

## Mago (Tier 1) — paquete generado

Másteres recortados: [femenino](../assets/spritesheets/originales/mago/v2/source/mago-f-core-3rows.webp) · [masculino](../assets/spritesheets/originales/mago/v2/source/mago-m-core-3rows.webp). Las seis tiras se integran en las hojas de producción y pasan la validación técnica.

| Personaje | Idle | Caminar | Recibir daño |
|---|---|---|---|
| Maga | [PNG](../assets/spritesheets/originales/mago/v2/idle/mago-f-idle.png) · [preview](../assets/spritesheets/originales/mago/v2/idle/previews/mago-f-idle-preview.png) | [PNG](../assets/spritesheets/originales/mago/v2/walk/mago-f-walk.png) · [preview](../assets/spritesheets/originales/mago/v2/walk/previews/mago-f-walk-preview.png) | [PNG](../assets/spritesheets/originales/mago/v2/hurt/mago-f-hurt.png) · [preview](../assets/spritesheets/originales/mago/v2/hurt/previews/mago-f-hurt-preview.png) |
| Mago | [PNG](../assets/spritesheets/originales/mago/v2/idle/mago-m-idle.png) · [preview](../assets/spritesheets/originales/mago/v2/idle/previews/mago-m-idle-preview.png) | [PNG](../assets/spritesheets/originales/mago/v2/walk/mago-m-walk.png) · [preview](../assets/spritesheets/originales/mago/v2/walk/previews/mago-m-walk-preview.png) | [PNG](../assets/spritesheets/originales/mago/v2/hurt/mago-m-hurt.png) · [preview](../assets/spritesheets/originales/mago/v2/hurt/previews/mago-m-hurt-preview.png) |

## Acólito (Tier 1) — integrado en producción

Se han restaurado los másteres v2 preparados para esta iteración: cuatro fotogramas nativos de 32×64 por fila, tres filas (Idle, Caminar y Recibir daño), transparencia alfa real y una paleta pixel-art conservada en WebP sin pérdida. El pipeline genera las tiras ampliadas de 64×128, los PNG nativos, previews y QA a partir de esos másteres. Las hojas de producción `public/sprites/heroes/acolito/` usan ya las seis tiras. Se sustituyó el máster masculino corrupto antes de la regeneración final y ambos workflows terminaron en verde.

| Personaje | Idle | Caminar | Recibir daño |
|---|---|---|---|
| Acólita | [PNG](../assets/spritesheets/originales/acolito/v2/idle/acolito-f-idle.png) · [preview](../assets/spritesheets/originales/acolito/v2/idle/previews/acolito-f-idle-preview.png) | [PNG](../assets/spritesheets/originales/acolito/v2/walk/acolito-f-walk.png) · [preview](../assets/spritesheets/originales/acolito/v2/walk/previews/acolito-f-walk-preview.png) | [PNG](../assets/spritesheets/originales/acolito/v2/hurt/acolito-f-hurt.png) · [preview](../assets/spritesheets/originales/acolito/v2/hurt/previews/acolito-f-hurt-preview.png) |
| Acólito | [PNG](../assets/spritesheets/originales/acolito/v2/idle/acolito-m-idle.png) · [preview](../assets/spritesheets/originales/acolito/v2/idle/previews/acolito-m-idle-preview.png) | [PNG](../assets/spritesheets/originales/acolito/v2/walk/acolito-m-walk.png) · [preview](../assets/spritesheets/originales/acolito/v2/walk/previews/acolito-m-walk-preview.png) | [PNG](../assets/spritesheets/originales/acolito/v2/hurt/acolito-m-hurt.png) · [preview](../assets/spritesheets/originales/acolito/v2/hurt/previews/acolito-m-hurt-preview.png) |

## Organización canónica y limpieza

Los paquetes canónicos por acción se mantienen en `assets/spritesheets/originales/<clase>/v2/`: másteres WebP, tiras PNG, frames nativos 32×64, previews e informes QA. Se han retirado de `assets/spritesheets/tier1/` las 24 tiras base antiguas de Idle/Caminar/Recibir daño que duplicaban la fuente v2. Se conservan los másteres de cuerpo, las acciones 3-14 y los anclajes de arma usados para componer las acciones de combate restantes. `public/sprites/heroes/` contiene los atlas y retratos activos.

## QA y límites

El pipeline valida la generación del atlas completo, alfa real, cuatro fotogramas distintos por tira y la coincidencia exacta de las filas runtime 0-2 con las fuentes v2. Si una fuente está corrupta, el job falla y no publica una promoción parcial.

- Novato, Espadachín, Arquero, Mago y Acólito tienen 30 tiras v2 integradas. Cada tira contiene cuatro fotogramas distintos y alfa real (0–255); los informes QA registran dimensiones y línea de pies.
- Los informes JSON incluyen hashes por fotograma, dimensiones de tira/celda y rutas a los PNG nativos de 32×64.
- `runtime_integrated: true` para Idle, Caminar y Recibir daño: el generador coloca las 30 tiras en las primeras tres filas de los diez atlas de producción y deriva los retratos de Idle.
- Las filas 3-14 (consumible, esquiva, bloqueo y ataques por arma) mantienen el sistema de producción modular previo; se renovarán al crear las animaciones correspondientes.
- Las armas siguen separadas del cuerpo para poder equiparlas en capas independientes.

La integración de los atlas y la validación de las tiras canónicas terminó correctamente en [GitHub Actions](https://github.com/joseconca/gremio-expediciones/actions/runs/39669763738). La regresión también pasó en [GitHub Actions](https://github.com/joseconca/gremio-expediciones/actions/runs/39669763789).
