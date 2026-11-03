# Auditoría de `src/lib/` — reorganización-1

Esta revisión es **estructural**: su objetivo es reducir duplicaciones, distinguir reglas de operaciones con base de datos y localizar responsabilidades. **No se eliminan funciones por parecer antiguas**, ni se cambian las mecánicas del juego.

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

## Estado y siguiente orden de trabajo

1. La regresión completa de `cf2fb4a` terminó correctamente. Los archivos de progresión y sus contratos públicos se han separado por responsabilidad sin alterar fórmulas.
2. La presentación visual de ataques y habilidades y las reglas numéricas de básicos ya tienen ubicaciones distintas. Esperar la CI de esta reorganización antes de darla por validada.
3. Continuar revisando las dependencias y responsabilidades de `motor-tactico.ts`, `combate.ts` y los servicios. **No dividir más por el mero tamaño** ni reunir las dos fórmulas de murallas, cuyos resultados no coinciden: verificar antes sus consumidores y su uso contextual.
4. Comprobar importadores contra la **rama actual** (la búsqueda GitHub puede indexar `main`). Eliminar código solo con evidencia de ausencia de consumidores y pruebas suficientes. Mantener commits pequeños y sin cambiar balance.
