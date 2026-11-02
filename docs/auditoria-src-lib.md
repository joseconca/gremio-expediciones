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
- `src/lib/expediciones/presentacion-combate.ts` combina interpretación del tipo de ataque básico y metadatos visuales. Requiere un análisis de dependencias antes de separar esos usos.
- `src/lib/expediciones/destinos-animacion-combate.ts` traduce metadatos de acciones para PvE, party y PvP. Que produzca datos visuales no significa que pueda moverse directamente a React: hay consumidores de servicios.
- `src/lib/progresion/diseno-habilidades.ts` define contratos tácticos, mientras `src/lib/catalogos/habilidades.ts` contiene sus datos. No confundir una declaración de tipo con duplicación de contenido.

## Siguiente orden de trabajo

1. Cerrar en verde la CI de Botica y los cambios de ubicación antes de tocar más lógica.
2. Verificar importadores reales de las fachadas y módulos sospechosos contra la **rama actual**, además de rutas API, pruebas y scripts. La búsqueda de código de GitHub puede indexar `main`, no necesariamente `reorganizacion-1`.
3. Revisar la concentración de responsabilidades en `expediciones/` y `progresion/` según casos de uso; crear carpetas de subdominio solo cuando simplifiquen encontrar el código y no obliguen a añadir capas artificiales.
4. Eliminar un archivo solo si sus referencias están identificadas, no existe carga dinámica y una prueba confirma que no se necesita. Mantener commits pequeños y sin cambios de balance.
