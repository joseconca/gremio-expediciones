# Spritesheets de personajes

## Contrato técnico

- Formato PNG con canal alfa; sin fondo opaco.
- Cada fotograma mide 64 × 128 px.
- Hoja completa de 256 × 1920 px.
- Cuatro fotogramas por fila, en secuencia de izquierda a derecha.
- Quince filas de animación, siempre mirando hacia la derecha.
- El cuerpo se mantiene como capa base; equipo y armas se superpondrán mediante capas independientes en iteraciones posteriores.
- Los avatares/retratos estáticos existentes mantienen la ruta de `obtenerSpriteHeroe`; para animación se usa `obtenerRutaSpritesheetHeroe`.

## Fase actual: refinamiento de Novato y Tier 1

La primera tanda de cinco clases se ha refinado con una dirección de RPG fantástico medieval: siluetas de perfil mirando a la derecha, contornos oscuros nítidos, luces cálidas, sombras en bloques de píxel y detalles de vestuario integrados en el cuerpo. Se busca evocar la lectura visual de RPG clásicos de fantasía —sin copiar personajes concretos— mediante materiales diferenciados y motivos de clase reconocibles.

- **Novato:** túnica corta de viaje, pantalón reforzado, botas con correas, pañuelo granate, bandolera con hebilla y bolsa lateral cosida al cinturón.
- **Espadachín:** coraza con biseles, placas de hombro, remaches, emblema esmaltado y capa azul ribeteada.
- **Acólito:** vestiduras claras, estola y cruces bordadas, dobladillo dorado y capucha con ribete.
- **Arquero:** ropa verde de explorador, jerkin de cuero, arnés cruzado, brazales y carcaj unido a la espalda.
- **Mago:** túnica índigo, sombrero puntiagudo con gema engastada, brocado, filigrana arcana y runas bordadas en el tejido.

Los detalles se dibujan como parte de cada prenda o silueta, en lugar de pegar piezas genéricas encima. Las armas no aparecen sujetas en las manos: las nueve filas de ataque preparan la pose corporal para que las futuras hojas de armas se acoplen como capas independientes. La reproducción temporal en combate y el equipo modular de arma/armadura quedan fuera de esta fase.

El generador reproducible es `scripts/generar-spritesheets-clases.py`: `--phase novato` genera Novato, `--phase tier1` genera Espadachín, Acólito, Arquero y Mago, y `--phase all` genera las cinco clases. El workflow serializa la escritura de PNG, valida dimensiones y transparencia y crea commits de recursos separados por fase.

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
