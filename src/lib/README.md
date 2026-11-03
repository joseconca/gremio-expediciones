# Dónde está cada cosa en src/lib

Este directorio contiene **reglas compartidas y cálculos del juego**. Las llamadas a Prisma, transacciones y operaciones HTTP se realizan en `src/server/services/` y en las rutas de `src/app/api/`.

| Quiero modificar… | Dónde buscar |
|---|---|
| Datos de clases, habilidades, objetos o enemigos | `catalogos/{clases,habilidades,objetos,enemigos}.ts` — un catálogo por tema |
| Edificios, escuela, taberna y mejoras de base | `base/` |
| Inventario, equipo, botín, sufijos y tiendas | `equipamiento/` |
| Mercado y precios | `economia/` |
| Sprites de héroes/enemigos y su escala de combate | `sprites/` |
| Combate, enemigos durante la batalla, consumibles y curación | `expediciones/combate/` (mecánicas auxiliares y roster) y `expediciones/combate.ts` (API principal) |
| Motor táctico, estados, ejecución y preparación de habilidades | `expediciones/combate/tacticas/` (sin cambiar el punto de entrada `combate.ts`) |
| Presentación del combate: proyectiles, objetivos visuales y descripciones | `expediciones/presentacion/` |
| Tiempo de expedición, regreso y límites del almacén | `expediciones/viajes/` |
| Encuentros normales, élite, dificultad, jefes diarios y generación de misiones | `expediciones/encuentros/` |
| Asedios y límite de turno PvP | `expediciones/asedios/` |
| Reglas de comercio | `expediciones/comercio.ts` (un módulo: sin subcarpeta innecesaria) |
| Progresión de clases, experiencia y habilidades aprendidas | `progresion/` |
| Diseño, catálogo adaptado y técnicas adicionales | `progresion/habilidades/` (catálogo editable único en `catalogos/habilidades.ts`) |
| Coeficientes RPG, estadísticas finales, bases y modificadores | `progresion/estadisticas/` (sin módulos duplicados en `progresion/`) |
| Compañías, iniciativa y recompensas de party | `party/` |
| Índices de sprites publicados (no editar a mano) | `generated/` |

`src/lib/habilidades.ts`, `objetos.ts` y `enemigos.ts` son APIs de consulta de los catálogos canónicos. `configuracionJuego.ts` se retiró y los importadores utilizan directamente el propietario de cada regla. `tiposJuego.ts` reúne contratos entre sistemas.

## Criterio para seguir ordenando

Mantener nombres expresivos y pocos puntos de entrada. No mover funciones de una en una ni crear carpetas para un único archivo sin motivo. Migrar módulos completos con sus imports, consumidores y pruebas. No eliminar recursos artísticos usados por los generadores. La planificación y el estado real están en `docs/reorganizacion-1.md`.
