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

`factorAmenaza = 1 + 0,03 × max(0, nivelAmenaza − difMin)`

Vida, ataque y defensa se calculan como su estadística de catálogo por el factor de amenaza y por el factor del modo. Cada resultado se redondea hacia abajo y se aplica un mínimo razonable. El nivel Base no se suma otra vez al nivel de amenaza.

El catálogo de enemigos usa una ventana de amenazas próximas, con pesos por rareza; el Mímico de prueba está excluido de encuentros aleatorios para evitar usar sus estadísticas de 1 HP y botín de 500 como exploit. Por encima del mayor `difMin` del catálogo se reutiliza el grupo de monstruos superior y se escala según la amenaza real, de modo que el Rango V no se queda sin candidatos. Los sprites de combate/reportes se sirven desde `public/sprites/enemies/{I,II,III,IV,V}/`.

## Recompensas y ritmo de niveles

- Se conservan la curva Base existente y los pagos base por duración (30 minutos, 1, 3, 9 y 24 horas).
- El oro de misión aumenta un 2,5 % por nivel de amenaza por encima de 1, con factor máximo ×1,5. Encontrar materiales ya no reduce el oro base.
- El oro de enemigo aumenta un 2 % por nivel sobre su amenaza de referencia, con factor máximo ×1,5. Después, el oro total de victoria recibe un único modificador de modo.
- XP Base por victoria: se conserva la ecuación de requisitos `round(500 × nivel^1,55)`, pero la recompensa es `umbral × 0,25 / (1 + 0,45 × (nivelBase − 1))`, antes de aplicar los factores de amenaza y modo. En Normal contra una amenaza equivalente, el coste aproximado es de 4 victorias para Base 1→2, 6 para 2→3, 8 para 3→4, 10 para 4→5 y 12 para 5→6; los niveles posteriores siguen aumentando (el nivel 12 requiere unas 24 victorias para llegar a Base 13). El recorrido completo de Base 1 a 13 ronda las 172 victorias en esas condiciones, aunque el modo y la diferencia de amenaza lo alteran. Las amenazas muy inferiores penalizan el farmeo.
- Una derrota entrega el 20 % del oro de misión ajustado por modo y el 10 % de la XP Base de una victoria equivalente; no entrega los materiales ni los premios de desbloqueo.
- Job usa una curva independiente: `XPJobUmbral(nivel) = round(100 + 25 × nivel^1,5)`. Una victoria apropiada otorga el 75 % del umbral Job actual antes de los factores de amenaza y modo; una derrota otorga el 10 % de esa cantidad. Job progresa más rápido que Base, pero su recompensa se calcula por el nivel Job activo, no con toda la XP Base: cambiar a una profesión nueva a Base alto no permite subir de golpe muchos niveles Job.
- La suma de umbrales Job para llegar de Job 1 a Job 40 ronda las 102.000 XP; a la tasa prevista, Job 40 representa aproximadamente 50–60 victorias relevantes. Cada profesión guarda su propio progreso, por lo que las maestrías de varias ramas continúan siendo una meta de largo plazo.

Las cifras son valores iniciales de balance. Deben recalibrarse con pruebas representativas de equipos y arquetipos; los objetivos de tasa de victoria no se consideran garantizados sin simulación.

## Migración local

La iteración no aplica cambios automáticamente a PostgreSQL. Haz copia de seguridad y comprueba primero `npx prisma migrate status` y `npx prisma generate`. Si el esquema local fue evolucionando con `prisma db push` y no tiene un historial coherente en `_prisma_migrations`, no ejecutes `migrate deploy` a ciegas: primero debe establecerse una línea base de migraciones adecuada.
