# Spritesheets de personajes

## Contrato técnico

- Formato PNG con canal alfa; sin fondo opaco.
- Cada fotograma mide 64 × 128 px.
- Hoja completa de 256 × 1920 px.
- Cuatro fotogramas por fila, en secuencia de izquierda a derecha.
- Quince filas de animación, siempre mirando hacia la derecha.
- El cuerpo se mantiene como capa base; equipo y armas se superpondrán mediante capas independientes en iteraciones posteriores.
- Los avatares/retratos estáticos existentes mantienen la ruta de `obtenerSpriteHeroe`; para animación se usa `obtenerRutaSpritesheetHeroe`.

## Fase actual: Novato y Tier 1

Las primeras cinco clases se redibujan de forma integrada —sin escudos, armas ni objetos mágicos incrustados en las manos— para que las capas de equipo puedan añadirse en otra iteración. Novato lleva ropa sencilla de viaje; Espadachín usa un atuendo de combate con capa azul; Acólito, túnica clara y capucha; Arquero, prendas verdes con carcaj; y Mago, túnica azul y sombrero puntiagudo.

El generador reproducible es `scripts/generar-spritesheets-clases.py`. Se ejecuta por fases: `--phase novato` para Novato, `--phase tier1` para Espadachín, Acólito, Arquero y Mago, o `--phase all` para regenerar las cinco clases. El workflow valida los diez PNG de 256×1920 con transparencia alfa real y guarda los cambios gráficos en un commit independiente.

Esta primera entrega define los atuendos y prepara las poses de las nueve filas de ataque para alinear futuros sprites de armas. El movimiento de combate, las capas modulares de arma/armadura y el refinamiento artístico individual de las siguientes clases aún no están integrados.

## Índice de filas

| Fila (base 0) | Identificador | Acción |
| ---: | --- | --- |
| 0 | `idle` | Idle |
| 1 | `walk` | Caminar |
| 2 | `hurt` | Recibir daño |
| 3 | `use_consumable` | Usar objeto consumible |
| 4 | `dodge` | Esquivar |
| 5 | `block_shield` | Bloquear con escudo |
| 6 | `attack_sword` | Ataque con espada |
| 7 | `attack_axe` | Ataque con hacha |
| 8 | `attack_spear` | Ataque con lanza |
| 9 | `attack_dagger` | Ataque con daga |
| 10 | `attack_bow` | Ataque con arco |
| 11 | `attack_staff` | Ataque con bastón |
| 12 | `attack_mace` | Ataque con maza |
| 13 | `attack_book` | Ataque con libro |
| 14 | `attack_gloves` | Ataque con guantes |

## Integración prevista

La elección de fila y la reproducción temporal se implementarán en el sistema de animaciones de combate en una iteración posterior. Las hojas de armas independientes se alinearán sobre las poses de ataque; la armadura equipada también se compondrá como capa para conservar una silueta coherente.

El catálogo actual de clases se obtiene de `src/lib/progresion/clases.ts`, conservando además los identificadores antiguos `guerrero` y `comerciante` por compatibilidad.
