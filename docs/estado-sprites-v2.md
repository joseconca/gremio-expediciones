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

El workflow acepta PNG o WebP como máster de tres filas. Si falta tanto el máster como una fuente por acción, extrae solo la fila de esa acción del atlas de Novato existente, sin tocar el runtime. **Este fallback no es arte nuevo ni aprobación artística**; se conserva para completar la revisión técnica, mientras las tiras v2 existentes de Novata Idle/Caminar se preservan. Idle acepta un ciclo de al menos dos poses distintas si el origen repite fotogramas; caminar y recibir daño siguen exigiendo cuatro. Los PNG, frames, previews y QA se versionan en un único commit automático. Tras revisar Novato visualmente, continuar con Tier 1.
