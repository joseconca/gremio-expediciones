# Spritesheets de personajes

## Contrato técnico

- Formato PNG con canal alfa; sin fondo opaco.
- Cada fotograma mide 64 × 128 px.
- Hoja completa de 256 × 1920 px.
- Cuatro fotogramas por fila, en secuencia de izquierda a derecha.
- Quince filas de animación, siempre mirando hacia la derecha.
- El cuerpo se mantiene como capa base; equipo y armas se superpondrán mediante capas independientes en iteraciones posteriores.
- Los avatares/retratos estáticos existentes mantienen la ruta de `obtenerSpriteHeroe`; para animación se usa `obtenerRutaSpritesheetHeroe`.

## Identidad visual por clase

Cada profesión tiene un perfil visual propio: paleta de vestuario, tocado o capucha y emblema; los arquetipos también añaden detalles específicos como placas de hombro, carcaj, vendas, astas o faldones. Se conserva el arte base detallado para no cambiar las proporciones de las animaciones, y los detalles se añaden sin incluir armas sujetas al personaje.

La regeneración única de este primer tratamiento se encuentra en `scripts/refinar-spritesheets-clase.py`. El workflow de GitHub aplica el tratamiento una vez, valida que existan las 70 hojas y crea un commit con los PNG actualizados; el marcador `.spritesheets-clase-refinados-v1` evita que se superpongan los adornos en una segunda ejecución.

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
