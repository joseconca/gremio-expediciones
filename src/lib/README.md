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
| Tiempo de expedición, regreso y límites del almacén | `expediciones/viajes/` |
| Encuentros normales, élite, dificultad, jefes diarios y generación de misiones | `expediciones/encuentros/` |
| Comercio, asedio y turnos PvP | `expediciones/` (agrupación interna **pendiente**) |
| Progresión de clases, experiencia y habilidades aprendidas | `progresion/` |
| Cálculos base y contratos de estadísticas RPG | `progresion/estadisticas/` |
| Compañías, iniciativa y recompensas de party | `party/` |
| Índices de sprites publicados (no editar a mano) | `generated/` |

`src/lib/habilidades.ts`, `objetos.ts`, `enemigos.ts` y `configuracionJuego.ts` son APIs o fachadas existentes: **no son segundos catálogos**. `tiposJuego.ts` reúne contratos entre sistemas.

## Criterio para seguir ordenando

Mantener nombres expresivos y pocos puntos de entrada. No mover funciones de una en una ni crear carpetas para un único archivo sin motivo. Migrar módulos completos con sus imports, consumidores y pruebas. No eliminar recursos artísticos usados por los generadores. La planificación y el estado real están en `docs/reorganizacion-1.md`.
