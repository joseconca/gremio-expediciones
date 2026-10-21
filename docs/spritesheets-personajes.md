# Spritesheets de personajes

## Contrato técnico

- Formato PNG con canal alfa; sin fondo opaco.
- Cada fotograma mide 64 × 128 px.
- Hoja completa de 256 × 1920 px.
- Cuatro fotogramas por fila, en secuencia de izquierda a derecha.
- Quince filas de animación, siempre mirando hacia la derecha.
- El cuerpo se mantiene como capa base; equipo y armas se superpondrán mediante capas independientes en iteraciones posteriores.
- Los avatares estáticos se exportan desde el primer frame de Idle; el combate y los asedios usan `obtenerRutaSpritesheetHeroe` y reproducen Idle, Caminar y Recibir daño desde las tres primeras filas del atlas.

## Fase actual: refinamiento de Novato y Tier 1

La primera tanda de cinco clases se ha refinado con una dirección de RPG fantástico medieval: siluetas de perfil mirando a la derecha, contornos nítidos, sombreado por planos, reflejos puntuales, pliegues en las telas y textura de materiales. El rostro cambia por acción mediante cejas, párpados, iris y boca: calma/parpadeo en idle, concentración al caminar, gesto de dolor, bebida, alerta al esquivar, tensión al bloquear y esfuerzo durante el impacto. Cada clase conserva una firma facial discreta y una paleta propia para el iris.

- **Novato:** túnica corta de viaje, pantalón reforzado, botas con correas, pañuelo granate, bandolera con hebilla y bolsa lateral cosida al cinturón.
- **Espadachín:** coraza con biseles, placas de hombro, remaches, emblema esmaltado y capa azul ribeteada.
- **Acólito:** vestiduras claras, estola y cruces bordadas, dobladillo dorado y capucha con ribete.
- **Arquero:** ropa verde de explorador, jerkin de cuero, arnés cruzado, brazales y carcaj unido a la espalda.
- **Mago:** túnica índigo, sombrero puntiagudo con gema engastada, brocado, filigrana arcana y runas bordadas en el tejido.

Los detalles se dibujan como parte de cada prenda o silueta, en lugar de pegar piezas genéricas encima: cuero con costuras y desgaste para Novato, biseles y reflejos fríos para Espadachín, pliegues y bordados dorados para Acólito, grano de cuero y motivos vegetales para Arquero, y filigrana/ribetes arcanos para Mago. Las hojas de producción ya usan los másteres v2 para Idle, Caminar y Recibir daño; los retratos son el primer frame de Idle. En combate y asedios, Idle se reproduce en bucle, Caminar acompaña la anticipación ofensiva y Recibir daño se usa durante los impactos. Las filas 3-14 mantienen el pipeline actual mientras se preparan las siguientes acciones y el equipo modular.

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

## Integración completada

Las hojas de las 10 combinaciones clase/sexo integran las tiras v2 en las filas 0-2 y los retratos estáticos se derivan del primer frame de Idle. `SpriteHeroeAnimado` selecciona la fila adecuada con cuatro frames horizontales y respeta `prefers-reduced-motion`. Las filas 3-14 mantienen los recursos de ataque, esquiva, bloqueo y consumible existentes; la siguiente iteración de arte debe sustituirlas gradualmente por poses coherentes con los nuevos másteres.

El catálogo actual de clases se obtiene de `src/lib/progresion/clases.ts`, conservando además los identificadores antiguos `guerrero` y `comerciante` por compatibilidad.
