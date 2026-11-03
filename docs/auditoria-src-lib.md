# Auditoría de `src/lib/` — reorganización-1

Esta revisión es **estructural**: su objetivo es reducir duplicaciones, distinguir reglas de operaciones con base de datos y localizar responsabilidades. **No se eliminan funciones por parecer antiguas**, ni se cambian las mecánicas del juego.

## Avance aproximado de la reorganización (3 de noviembre de 2026)

El avance es **orientativo: ~65% (±10 puntos)**; mide objetivos del plan y no volumen de cambios, número de commits ni líneas. La aprobación de una CI no significa por sí sola que la auditoría global esté terminada.

| Fase | Peso orientativo | Avance estimado | Evidencia / pendiente |
| --- | ---: | ---: | --- |
| Simplificar herramientas y publicación de sprites | 20% | 80% | Flujo y rutas más claros; quedan comprobaciones de recursos y el validador HD independiente |
| Unificar catálogos (clases, habilidades, objetos, enemigos) | 20% | 90% | Fuentes editables en `catalogos/`; revisar consumidores de fachadas heredadas |
| Organizar funcionalidades, componentes y servicios | 40% | 60% | Dominios y servicios localizados; auditar los orquestadores grandes sin dividirlos arbitrariamente |
| Identificar y retirar obsoletos con evidencia | 20% | 35% | Auditoría iniciada; comprobar importaciones, runtime y regresiones antes de borrar |
| **Total ponderado estimado** | **100%** | **65%** | **No equivale a calidad o funcionalidad medida automáticamente** |

**Criterios de cierre:** rutas del código fáciles de localizar, fuentes editables únicas, interfaces y reglas de cada servicio claras, importadores actualizados, código obsoleto confirmado y retirado con pruebas, CI de regresión verde. El validador HD separado debe analizarse sin confundirlo con fallos de combate.

## Inventario revisado

La rama contenía 86 archivos bajo `src/lib/` al comenzar esta etapa, incluidos tres generados. Las concentraciones principales eran `expediciones/` (33), `progresion/` (16), `equipamiento/` (6), `party/` (6), `catalogos/` (5) y `base/` (5).

| Área | Dónde debe estar | Estado |
| --- | --- | --- |
| Clases, habilidades, objetos y enemigos editables | `src/lib/catalogos/` | Conservar la fuente única |
| Fórmulas y reglas de combate, progreso, economía y equipo | `src/lib/` por dominio | Conservar; no duplicar en React |
| Operaciones Prisma, transacciones y concurrencia | `src/server/services/` | Separación de responsabilidades aplicada a los casos siguientes |
| Componentes y detalles visuales | `src/components/` | Separación aplicada a sombras y pantallas de objetos |
| Artefactos `src/lib/generated/` | Producción automática | **No editar ni borrar manualmente** |

## Cambios de ubicación comprobables

- `src/lib/expediciones/sombra-combate.ts` → `src/components/combate/estilo-sombra-combate.ts`. Únicamente genera un objeto CSS de transformación de sprites. Actualizadas las importaciones de tres componentes y la prueba geométrica.
- `src/lib/expediciones/actualizar-combate-versionado.ts` → `src/server/services/combate/actualizar-combate-versionado.ts`. Usa una transacción Prisma con escritura versionada, por lo que pertenece a los servicios de servidor. Se conservan `COMBATE_MODIFICADO` y el contrato de actualización.
- `src/lib/expediciones/procesarLlegadaAsedio.ts` → `src/server/services/asedios/procesar-llegada-asedio.ts`. Consulta y actualiza expediciones y combates mediante Prisma; importadores actualizados en la llegada de expediciones y el endpoint de asedios.
- `src/lib/expediciones/procesarTurnoAsedio.ts` → `src/server/services/asedios/procesar-turno-asedio.ts`. Consulta y persiste turnos. Las importaciones relativas de `turno-pvp` y `estados-combate` apuntan ahora explícitamente a las reglas de `src/lib/expediciones/`.

Las rutas externas y las reglas de juego no cambian. Los movimientos solo se darán por validados tras pasar las regresiones de GitHub Actions.

## Candidatos que **no** deben borrarse sin comprobar consumidores

- `src/lib/configuracionJuego.ts` actúa como **fachada de compatibilidad**. Redirige exports de edificios, progresión y sprites; su aspecto antiguo no implica que sea código muerto.
- `src/lib/habilidades.ts` construye el registro que consumen las APIs y los combates. `progresion/generar-habilidades.ts`, `catalogo-redisenado.ts` y `tecnicas-adicionales.ts` son transformaciones del catálogo, no catálogos editables alternativos.
- `src/lib/enemigos.ts` adapta los datos del catálogo de enemigos para dificultad, botín y selección; no sustituirlo por el JSON generado de sprites.
- `src/lib/expediciones/presentacion-combate.ts` solo resuelve metadatos visuales: básicos y proyectiles de habilidades. `ataque-basico-arma.ts` decide la selección física/mágica del arma y `ataques-basicos.ts` contiene la resolución numérica, precisión y críticos. `combate.ts` conserva sus exportaciones previas. Las pruebas de `tests/combat-presentacion.test.cjs` protegen presentación, daño y API histórica.
- `src/lib/expediciones/destinos-animacion-combate.ts` traduce metadatos de acciones para PvE, party y PvP. Que produzca datos visuales no significa que pueda moverse directamente a React: hay consumidores de servicios.
- `src/lib/expediciones/preparacion-habilidades.ts` reúne el reloj y la preparación de acciones; `mecanicas-habilidades.ts` aplica operaciones y pasivas. `motor-tactico.ts` conserva intactas sus funciones; sus contratos se editarán en `tipos-tacticos.ts` y se reexportan para mantener compatibles a adaptadores y técnicas adicionales. Las pruebas cubren preparación de área, caducidad y reserva de efectos.
- `src/lib/expediciones/adaptador-tactico.ts` es la frontera con los efectos persistidos, no un segundo motor: convierte los estados tácticos, los DoT/HoT históricos y los límites de ciclo. El código ahora explicita cada transformación sin cambiar las estructuras. `tests/adaptador-tactico.test.cjs` caracteriza la ida/vuelta y el contrato de una técnica adicional; `progresion/tecnicas-adicionales.ts` y las mecánicas importan contratos directamente de `tipos-tacticos.ts` (sin dependencia de tipos a través del motor).
- `src/lib/progresion/diseno-habilidades.ts` define contratos tácticos, mientras `src/lib/catalogos/habilidades.ts` contiene sus datos. No confundir una declaración de tipo con duplicación de contenido.

### Frontera transaccional de las expediciones individuales

- En `llegar-expedicion.ts` la transición `en_viaje` → `combatiendo` usa `updateMany` con fase y fecha esperadas dentro de la misma transacción que crea el combate; se preserva la respuesta de un combate existente. La relación de combate ya tiene restricción única por expedición.
- En `completar-expedicion.ts` el comercio reclama `en_viaje` → `regresando` antes de modificar al personaje; una solicitud desactualizada obtiene conflicto 409. No se alteran recompensa, afinidad, tiempo de viaje ni el orden transaccional de la recepción final.
- `tests/expedition-lifecycle.test.cjs` prueba ambas carreras simuladas con la lógica real del servicio y dobles de Prisma, sin dependencia de base de datos; está incorporado a `test:progression`.
- Siguiente revisión: casos de errores de transacción, límites de inventario y efectos de los servicios de economía. No asumir que las pruebas con dobles sustituyen una prueba de integración PostgreSQL.

## Estado y siguiente orden de trabajo

1. La regresión de `154cdfb` terminó correctamente, incluyendo las pruebas de motor y adaptador tácticos. Los catálogos y los contratos públicos ya tienen entradas reconocibles. Las nuevas pruebas de recursos deben superar también su propia CI.
2. `src/server/services/combate/` tiene mapa por funciones; la normalización y el decremento de cooldowns están en `src/lib/expediciones/cooldowns-habilidades.ts` con reexportaciones compatibles. El cobro de recursos conserva las ramas v2 y legacy y la escritura optimista.
3. Seguir por los servicios de combate, expediciones y economía buscando **duplicaciones semánticas verificables**; no dividir funciones ni crear archivos sólo por su tamaño. Los servicios de recursos PvE y party no deben fusionarse sin comparar sus transacciones y contratos.
4. Auditar las dependencias reales y fachadas heredadas; eliminar recursos y código sólo tras comprobar uso en runtime y pruebas. No reunir las dos fórmulas de murallas sin revisar sus consumidores. Mantener commits pequeños, `main` intacta y las regresiones en verde antes de considerar finalizado un bloque.
