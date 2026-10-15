# Dificultad y progresión de expediciones

## Separación de conceptos

- **Nivel de amenaza**: número de la misión, utilizado para elegir enemigos y escalar sus estadísticas.
- **Rango de amenaza**: banda de niveles disponible para el personaje.
- **Modo de dificultad**: Fácil, Normal o Difícil, elegido al aceptar cada expedición PvE normal o de élite.

El servidor valida el identificador de misión, el rango desbloqueado y el modo. Los multiplicadores nunca se aceptan desde el cliente.

## Rangos

| Rango | Amenaza | Nivel Base mínimo | Desbloqueo |
|---|---:|---:|---|
| I | 1–3 | 1 | Disponible al empezar |
| II | 4–6 | 4 | Victoria en Normal en I |
| III | 7–9 | 7 | Victoria en Normal en II |
| IV | 10–12 | 10 | Victoria en Normal en III |
| V | 13+ | 13 | Victoria en Normal en IV |

Para desbloquear el siguiente rango se requieren el nivel Base mínimo de ese rango y una victoria en Normal en el rango anterior. El rango V escala su techo de amenaza con Base + 4. Los rangos anteriores siguen accesibles para misiones más seguras.

El catálogo normal ofrece una misión por cada nivel de amenaza desde 0 hasta el máximo desbloqueado, en cada duración disponible (30 minutos, 1, 3, 9 y 24 horas). La amenaza 0 es una opción segura fuera de los rangos I–V: una victoria en ella no acredita la victoria Normal necesaria para desbloquear el siguiente rango.

Para evitar regresiones de personajes existentes, la migración `20261012210000_expedition_difficulty_progression` marca los rangos anteriores como superados según el nivel Base actual. Los personajes nuevos comienzan con el JSON por defecto vacío.

## Modos

| Modo | Vida enemiga | Ataque enemigo | Defensa enemiga | Oro y XP de victoria |
|---|---:|---:|---:|---:|
| Fácil | ×0,80 | ×0,85 | ×0,90 | ×0,85 |
| Normal | ×1,00 | ×1,00 | ×1,00 | ×1,00 |
| Difícil | ×1,25 | ×1,15 | ×1,10 | ×1,25 |

Velocidad e iniciativa no se modifican por modo. El modo se guarda en la expedición y se aplica una sola vez al crear el snapshot de combate. Normal es el único modo que acredita el hito de rango. Comercio y asedios PvP conservan sus reglas propias.

## Estadísticas de enemigos

La rareza decide principalmente la frecuencia de aparición y el botín, no un multiplicador oculto de estadísticas.

`factorAmenaza = 1 + 0,30 × max(0, nivelAmenaza)`

La amenaza 0 conserva exactamente las estadísticas base del catálogo. Cada nivel de amenaza añade un 30 % lineal a vida, ataque y defensa, independientemente del `difMin` del monstruo; `difMin` solo condiciona qué enemigos pueden aparecer. Por ejemplo, amenaza 6 aplica ×2,80 y amenaza 10 aplica ×4,00 antes del modo. Cada resultado se redondea hacia abajo y se aplica un mínimo razonable. El nivel Base no se suma otra vez al nivel de amenaza.

La mitigación compartida de daño usa `daño × 100 / (defensa + 100)`: 100 puntos de defensa reducen el daño a la mitad antes del redondeo. La misma fórmula se aplica a ataques básicos, habilidades directas y pulsos de daño progresivo.

La selección normal considera todos los enemigos con `difMin` entre 0 y la amenaza efectiva (o todos los existentes si la amenaza supera el máximo del catálogo). Primero elige el nivel `difMin` con peso `3^difMin`: cada nivel pesa exactamente tres veces el anterior, sin eliminar la probabilidad de niveles inferiores. Dentro de ese nivel se sortea la rareza por peso relativo (común 70, poco común 50, raro 35, épico 20, legendario 1) y finalmente una especie de esa rareza. En el 1 % de los encuentros normales se elige el Mímico de forma independiente, sin importar la amenaza o rareza; su botín base de 500 monedas también escala con la amenaza de la misión. Los sprites de combate/reportes se sirven desde `public/sprites/enemies/{I,II,III,IV,V}/`.

## Recompensas y ritmo de niveles

- La experiencia Base usa la curva polinómica `umbral(n) = round(500 × n^1,83)`; se mantienen los pagos base por duración (30 minutos, 1, 3, 9 y 24 horas).
- El oro de misión aumenta un 2,5 % por nivel de amenaza por encima de 1, con factor máximo ×1,5. Encontrar materiales ya no reduce el oro base.
- El oro de enemigo aumenta un 2 % por nivel de amenaza de la misión, con factor máximo ×1,5, independientemente del `difMin` del enemigo. Esto también se aplica al botín del Mímico. Después, el oro total de victoria recibe un único modificador de modo.
- XP necesaria por nivel Base: `umbral(n) = round(500 × n^1,83)`. Cada enemigo otorga `round(45 × nivelAmenaza^1,05)` XP antes del modificador del modo. La recompensa se basa en el nivel de amenaza del enemigo, no en la diferencia respecto al nivel actual del jugador: el mismo enemigo siempre da la misma XP. En Normal contra amenazas equivalentes y conservando el exceso de XP, hacen falta aproximadamente 12 victorias para Base 1→2, 19 para 2→3, 26 para 3→4, 33 para 4→5 y 39 para 5→6. Base 6→7 requiere unas 45 victorias; Base 12→13, unas 77. Llegar de Base 1 a 13 supone unas 559 victorias en esas condiciones. Las recompensas de los modos Fácil/Difícil y la amenaza de los enemigos cambian las cifras.
- Una derrota entrega el 20 % del oro de misión ajustado por modo y el 10 % de la XP Base de una victoria equivalente; no entrega los materiales ni los premios de desbloqueo.
- Job usa `umbralJob(n) = round(100 + 0,5 × n^1,83)`: comparte el exponente de Base, pero su escala es mucho menor. La recompensa Job se calcula por amenaza (`round(23 × nivelAmenaza^1,05))), no como porcentaje del umbral actual; se reduce al combatir amenazas muy inferiores al Base y aplica el modificador de dificultad. Una derrota recibe el 10 % de la recompensa de victoria.
- En la simulación de referencia, Novato Job 1→10 y después una profesión Tier 1 Job 1→40 requieren unas 126 victorias en total contra amenazas equivalentes al Base y en dificultad Normal. La primera maestría Tier 1 llega con Base 5 y alrededor del 93 % del umbral hacia Base 6. Cada profesión guarda su propio progreso, sin transferir experiencia Job al cambiar de clase, de modo que las maestrías de otras ramas siguen siendo objetivos independientes.

Las cifras son valores iniciales de balance. Deben recalibrarse con pruebas representativas de equipos y arquetipos; los objetivos de tasa de victoria no se consideran garantizados sin simulación.

## Migración local

La iteración no aplica cambios automáticamente a PostgreSQL. Haz copia de seguridad y comprueba primero `npx prisma migrate status` y `npx prisma generate`. Si el esquema local fue evolucionando con `prisma db push` y no tiene un historial coherente en `_prisma_migrations`, no ejecutes `migrate deploy` a ciegas: primero debe establecerse una línea base de migraciones adecuada.
