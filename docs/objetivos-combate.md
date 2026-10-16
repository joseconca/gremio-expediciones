# Selección de objetivos y encuentros con varios enemigos

## Contrato de una habilidad

La selección es una regla de combate validada en servidor, independiente de los metadatos de animación. La interfaz permite elegir destinatario, pero el servidor vuelve a comprobar el equipo, el estado vivo y el patrón. El cliente nunca puede añadir por su cuenta objetivos.

`DefinicionHabilidad.objetivo` es opcional para mantener compatibilidad con habilidades antiguas:

- `equipo`: `enemigo`, `aliado` o `propio`.
- `patron`: `individual`, `adyacentes`, `fila`, `columna` o `todos`.
- `incluirPropio`: para habilidades dirigidas a aliados, indica si el lanzador también es un objetivo elegible.

Sin metadatos explícitos, las habilidades de daño apuntan a un enemigo individual y el soporte apunta a un aliado individual. En party, el soporte selecciona inicialmente al propio lanzador, pero se puede elegir a cualquier miembro activo. Los objetos consumibles mantienen su regla propia de objetivo.

## Formación táctica 3×3

Cada enemigo persistido posee un ID estable durante el combate, una casilla, posición táctica, columna, HP, estadísticas y efectos activos. El estado del grupo se guarda en los campos JSON `enemigos` de `CombateActivo` y `CombateParty`; los campos escalares heredados del primer enemigo se conservan para compatibilidad con interfaces y registros antiguos.

La formación define tres filas tácticas y tres columnas:

| Posición | Índices de casilla |
| --- | --- |
| Melé | 0–2 |
| Centro | 3–5 |
| Retaguardia | 6–8 |

Una criatura ocupa una sola casilla. El resolvedor y la persistencia admiten hasta nueve enemigos por combate. Para encuentros iniciales, la formación coloca uno en el centro, dos en melé/centro y tres en melé/centro/retaguardia para que las reglas tácticas se entiendan visualmente.

## Patrones de objetivo

- **Individual**: un objetivo vivo y válido. Si la habilidad ofensiva no indica objetivo, se elige el enemigo vivo más adelantado: melé, centro y retaguardia; dentro de la fila, menor índice de columna.
- **Adyacentes**: objetivo ancla más casillas contiguas en vertical u horizontal; no incluye diagonales.
- **Fila**: objetivos vivos de la misma posición táctica que el objetivo ancla.
- **Columna**: objetivos vivos de la misma columna.
- **Todos**: todos los objetivos vivos del equipo permitido, sin requerir ancla.

Los combatientes con HP cero o estado caído, derrotado, muerto, huido o retirado no reciben efectos. Se rechaza una selección de otro equipo o un enemigo ya derrotado. La geometría usada por el resolvedor es la misma que la escena visual presenta.

## Composición aleatoria de expediciones normales

La composición se obtiene a partir de la amenaza objetivo y de si la expedición es individual o una party. Las probabilidades de referencia para amenaza suficiente para todos los patrones son:

| Composición del grupo | En party | En solitario |
| --- | ---: | ---: |
| 1 enemigo de la amenaza objetivo | 46% | 78% |
| 2 enemigos de la amenaza objetivo | 12% | 5% |
| 1 de amenaza objetivo + 1 inferior | 18% | 8% |
| 1 objetivo + 1 inferior + otro dos niveles inferior | 12% | 3% |
| 2 enemigos un nivel por debajo | 12% | 6% |

Las probabilidades suman 100%. Si la amenaza es demasiado baja para una composición (por ejemplo, no hay un nivel inferior a amenaza 0), el peso de esa composición se redistribuye al encuentro individual. En amenaza 0 aún existe una pequeña probabilidad de dos enemigos de amenaza 0; en amenaza 1 puede aparecer el grupo de dos enemigos de amenaza 0. El mímico sigue siendo un encuentro singular y conserva su probabilidad especial.

Aunque la generación normal actual tiene un máximo de tres enemigos por grupo, el modelo, la validación y la escena admiten hasta nueve, por lo que se puede ampliar más adelante la distribución sin otra migración de estado. Las misiones de élite siguen usando un enemigo singular asignado como jefe.

## Resolución de turno y recompensas

- Cada enemigo mantiene HP, defensa y efectos propios. Atacar o lanzar una habilidad ofensiva contra uno actualiza solo ese objetivo; las habilidades con patrón de área se resuelven por cada criatura alcanzada.
- Cada enemigo vivo actúa una vez durante la fase enemiga. En party, cada ataque elige al miembro activo más vulnerable; si cae, los enemigos restantes pueden seleccionar otro objetivo vivo.
- La victoria se produce únicamente cuando no quedan enemigos vivos. Los turnos y los estados periódicos se guardan junto con el grupo completo.
- Oro, experiencia y botín de party se calculan por enemigo, usando la amenaza de cada criatura para el oro/XP y una tirada de botín independiente por enemigo y participante. La recompensa fija de la misión se concede una sola vez.
- Los encuentros antiguos sin roster JSON se convierten en un grupo de un solo enemigo mediante un adaptador de compatibilidad.

## Habilidades de área y feedback

Bola de fuego declara el patrón de enemigos adyacentes y conserva su presentación visual de explosión. Los resultados de área guardan el daño individual por enemigo para que la interfaz muestre cada cantidad y resalte cada criatura impactada, sin concentrar el daño total en el primer objetivo. La misma regla de objetivo se puede declarar para futuras habilidades de fila, columna o todos.

El servicio de party también puede dirigir curaciones y mejoras a un aliado individual o a varios; la persistencia de estos efectos y la sincronización de HP del personaje se hacen dentro de la misma transacción.

## Validación y alcance conocido

Hay pruebas automatizadas para la distribución de composiciones, grupos de 1–3 enemigos, máximo de nueve, selección de objetivos y patrones de área, compatibilidad con combates antiguos y efectos individuales de party. La inspección visual manual en navegador para PC, móvil y PvP sigue siendo una tarea separada.

Los fallos de expectativas de rareza/forja (`test:base` y dos assertions de `test:progression`) pertenecen a los cambios económicos ya acordados para más adelante y no se ajustan en esta rama.
