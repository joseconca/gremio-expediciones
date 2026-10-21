# Estado verificable de sprites v2

**Actualizado:** 2026-10-21  
**Rama:** `main`  
**Regla de seguridad:** los recursos v2 son arte en revisión. No sustituyen las hojas de runtime hasta superar revisión visual.

## Qué se ha generado realmente

| Personaje | Acción | Archivo de juego | Estado |
|---|---|---|---|
| Novata | Idle | [PNG 256×128](../assets/spritesheets/originales/novato/v2/idle/novato-f-idle.png) · [preview ampliada](../assets/spritesheets/originales/novato/v2/idle/previews/novato-f-idle-preview.png) | Hay una tira v2 previa; el paquete común se regenerará para revisión |
| Novata | Caminar | [PNG 256×128](../assets/spritesheets/originales/novato/v2/walk/novato-f-walk.png) · [preview ampliada](../assets/spritesheets/originales/novato/v2/walk/previews/novato-f-walk-preview.png) | Hay una tira v2 previa; el paquete común se regenerará para revisión |
| Novata | Recibir daño | — | Falta en v2 |
| Novato | Idle | — | Falta en v2 |
| Novato | Caminar | — | Falta en v2 |
| Novato | Recibir daño | — | Falta en v2 |
| Espadachín | Idle, Caminar, Recibir daño | Hay entregas previas en las carpetas de arte original, pero aún deben revisarse juntas con la referencia final de Novato | No marcar el conjunto como cerrado |

Las carpetas antiguas `assets/spritesheets/originales/novato/idle`, `walk` y `hurt` contienen recursos de versiones anteriores; no deben confundirse con el bloque nuevo `v2`. Los PNG de producción en `public/sprites/heroes/novato/` siguen intactos.

## Qué validan las pruebas automáticas

- Tira de 256×128 píxeles, cuatro celdas de 64×128.
- Transparencia real (alfa 0–255), cuatro fotogramas distintos y línea de pies alineada.
- La paleta de salida se aumentó de 15 a 63 colores para evitar el aspecto excesivamente reducido en color.
- QA genera previews ampliadas y JSON de hashes, geometría y transparencia.
- El QA técnico **no** confirma la calidad artística; los informes conservan `artistic_approval: pending visual review`.
- Las armas no van pintadas en el cuerpo: se reservarán para capas equipables independientes.

## Commits y ejecuciones que merece la pena revisar

1. [Aumentar la paleta a 63 colores](https://github.com/joseconca/gremio-expediciones/commit/500060f28fdd0f235f6b8af4d1187a34bb3bc0de): corrección visual del generador.
2. [Generar Novata Idle v2](https://github.com/joseconca/gremio-expediciones/commit/c76b26916014e115ae3e30fc9d4512323a9081fc): PNG, frames, preview y QA de esa acción.
3. [Generar Novata Caminar v2](https://github.com/joseconca/gremio-expediciones/commit/27d1278e03c7c5710bbee483e3b273cf40ddaa4e): PNG, frames, preview y QA de esa acción.
4. [Workflow de sprites v2 — ejecución verde](https://github.com/joseconca/gremio-expediciones/actions/runs/39595518630): confirma la generación y el versionado de las salidas anteriores.
5. [Regression general — ejecución fallida](https://github.com/joseconca/gremio-expediciones/actions/runs/39595518566): es un workflow distinto. No se debe describir el CI global como verde.

Los commits de código y workflow preparan automatización; los commits de arte deben contener PNG/preview/QA visibles. Para revisar el arte, empieza por los enlaces de preview de la primera tabla, no por los commits de infraestructura.

## Próxima entrega

## Paquete Novato v2: completado técnicamente

Los másteres `novato-f-core-3rows.webp` y `novato-m-core-3rows.webp` proceden de recortes de la lámina generada, con tres filas (Idle/Caminar/Recibir daño) y cuatro fotogramas por fila. El workflow publica seis tiras 256×128, las celdas ampliadas y nativas de 32×64, previews y QA. La última generación que usa esos másteres terminó en verde: [ejecución de Novato v2](https://github.com/joseconca/gremio-expediciones/actions/runs/39619092000). `runtime_integrated` se mantiene en `false` y `artistic_approval` en `pending visual review`; falta la revisión visual final antes de reemplazar sprites de producción.

## Siguiente bloque: Tier 1 — Espadachín

Se está preparando el mismo flujo para `espadachin-f-core-3rows.webp` y `espadachin-m-core-3rows.webp`: recortes individuales de la lámina generada, un máster común por sexo, tiras Idle/Caminar/Recibir daño, frames nativos 32×64, previews y QA. Los recursos existentes bajo `assets/spritesheets/tier1/` son material legado y no se confundirán con esta nueva entrega. El runtime seguirá intacto hasta revisar los nuevos recortes.
