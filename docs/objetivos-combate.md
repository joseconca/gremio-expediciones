# Sistema de selección de objetivos del combate

## Objetivo del diseño

La selección de objetivos es una regla de juego del servidor, distinta de los metadatos de animación. La interfaz permite elegir el destinatario, pero el servidor vuelve a validar equipo, estado y patrón antes de aplicar efectos. Ningún objetivo enviado por el cliente se considera confiable.

El resolvedor compartido está en \`src/lib/expediciones/objetivos-combate.ts\`. No altera estadísticas; recibe combatientes y la regla lógica de una habilidad, y devuelve los objetivos vivos válidos o un error de validación.

## Contrato de una habilidad

\`DefinicionHabilidad.objetivo\` es opcional para mantener compatibilidad con habilidades existentes:

- \`equipo\`: \`enemigo\`, \`aliado\` o \`propio\`.
- \`patron\`: \`individual\`, \`adyacentes\`, \`fila\`, \`columna\` o \`todos\`.
- \`incluirPropio\`: para habilidades dirigidas a aliados, controla si el lanzador puede incluirse.

Si no se declara la regla, una habilidad con efecto \`dano\` apunta a un enemigo individual. Las curaciones, mejoras y demás efectos de soporte apuntan por defecto a un aliado individual y permiten seleccionarse a uno mismo. En party, la selección inicial de soporte favorece al propio lanzador; se puede escoger a otro compañero.

## Formación y patrones de área

La formación lógica admite hasta nueve casillas para enemigos. Usa tres filas tácticas y tres columnas por fila. La party actual mantiene su límite propio de tres participantes; compartir el esquema geométrico no eleva ese límite:

| Fila táctica | Índices de casilla |
| --- | --- |
| Melé | 0–2 |
| Centro | 3–5 |
| Retaguardia | 6–8 |

Las columnas son las posiciones 0, 1 y 2 de cada fila. \`indiceCasillaFormacion\` y \`posicionDesdeIndiceCasilla\` convierten entre posición/columna e índices de 0 a 8.

- **Individual**: un objetivo vivo de la familia permitida.
- **Adyacentes**: objetivo seleccionado y casillas ortogonales contiguas; no incluye diagonales.
- **Fila**: todos los objetivos vivos que ocupan la misma fila táctica que el objetivo elegido.
- **Columna**: todos los objetivos vivos que ocupan la misma columna.
- **Todos**: todos los objetivos vivos del equipo permitido, sin pedir una casilla de anclaje.

La elección por defecto para ofensiva individual prioriza melé, después centro y retaguardia; dentro de una fila, la columna más baja. Se omiten objetivos con HP cero o estado caído, derrotado, muerto, huido o retirado. Un objetivo enviado de otro equipo se rechaza en vez de redirigirse silenciosamente.

## Integración disponible

- La definición de habilidad ya puede declarar estas reglas sin depender de animaciones.
- El modal permite seleccionar la habilidad y su objetivo antes de ejecutarla.
- El endpoint de combate party recibe el ID del aliado seleccionado.
- El servicio de party valida la formación/objetivo y aplica curación o efectos defensivos a los aliados elegidos dentro de la transacción. Se sincroniza la vida con el personaje persistido cuando cambia.
- Las curaciones de área emiten pulsos individuales para que la interfaz identifique el destinatario real.
- Las pruebas cubren la formación 3×3, las nueve casillas, objetivos inválidos, aliados caídos/retirados y patrones de área, además de la persistencia de curaciones en party.

## Límite conocido antes de activar combates con varios enemigos

El modelo actual de \`CombateActivo\` y \`CombateParty\` conserva un enemigo en columnas escalares (\`enemigoHp\`, \`enemigoDefensa\`, etc.). Por tanto, el resolvedor y el límite de nueve están preparados, pero no se deben considerar implementadas todavía las batallas con varios enemigos. Antes de activar esa modalidad, habrá que introducir una colección persistida de enemigos con estado/efectos/casilla por enemigo y adaptar la resolución de daño, los turnos, las condiciones de victoria, la API de estado y la UI para aplicar y mostrar el resultado sobre todos los destinatarios. No se crean enemigos ficticios para llenar la formación.

El modo individual enemigo en party ya usa el resolvedor; las áreas contra enemigos se resolverán sobre todos los objetivos cuando la colección de enemigos se integre. Las habilidades actuales conservan su comportamiento hasta que cada habilidad declare explícitamente un patrón de área.
