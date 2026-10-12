# Progresión RPG escalable

Esta primera iteración integra el núcleo de progresión Base/Job, el catálogo de clases, habilidades profesionales, atributos derivados y costes de Energía/Maná. El catálogo está centralizado para ampliar profesiones y requisitos sin duplicar reglas en las rutas de API.

## Reglas activas

- Todos los personajes nuevos empiezan como **Novato**, Base 1 y Job 1. El servidor ignora cualquier clase enviada por el cliente al reclutar.
- El nivel y la experiencia Base se mantienen en `Personaje.nivel` y `Personaje.experiencia`. Cada profesión tiene su propio `ProgresoClase.nivelJob` y `experienciaJob`; cambiar de profesión no borra el progreso de ninguna otra.
- Job 10 de Novato permite desbloquear Tier 1: Espadachín, Acólito, Arquero o Mago.
- Tier 1 tiene Job máximo 40. Las ramas Tier 2 requieren la clase predecesora a Job 40.
- Cruzado es un ejemplo de clase híbrida Tier 3 y requiere Caballero Job 40 **y** Sacerdote Job 40.
- Las profesiones desbloqueadas se pueden seleccionar libremente fuera de expediciones y combates. Al cambiar, se desequipan las habilidades incompatibles, pero no se pierden las habilidades aprendidas ni el Job de otras profesiones.
- Los requisitos de clase están definidos en `src/lib/progresion/clases.ts`. `obtenerAncestrosClase` recorre el grafo; una clase hereda las habilidades de sí misma y de todas sus ramas antecesoras. Una híbrida hereda de ambas ramas.
- Cada nivel Job obtenido en combate PvE concede un punto de habilidad para la profesión activa. Al alcanzar el Job máximo se registra el hito de maestría.
- Los atributos se calculan automáticamente según el arquetipo y los niveles Base y Job: el jugador no los distribuye manualmente, y el progreso Job añade bonificaciones específicas a cada profesión.
- Las primeras habilidades específicas ya tienen costes de Energía o Maná y se aprenden mediante puntos Job. Las habilidades genéricas antiguas siguen disponibles mediante la Escuela y oro durante la transición.
- Las habilidades profesionales propias y heredadas permanecen visibles en la Escuela. Solo las habilidades genéricas mantienen ofertas rotatorias diarias.
- Cada clase declara categorías de armas y armaduras dominadas. El dominio aplica un multiplicador a la estadística de ataque del arma compatible y a la defensa de la armadura compatible. Equipar una categoría no dominada sigue siendo posible, pero no recibe ese bonus.
- Las seis estadísticas principales (Fuerza, Agilidad, Vitalidad, Inteligencia, Destreza y Suerte) alimentan `calcularEstadisticasDerivadasRpg`. Los coeficientes iniciales son valores de balance y están centralizados en ese módulo.
- Las habilidades marcadas con `tipoDano: "magico"` utilizan ataque y defensa mágicos. Los costes de Energía/Maná se validan y descuentan en la misma transacción que guarda la acción de combate; los recursos se regeneran por turno, sin superar el máximo calculado.
- Los endpoints de profesiones validan de nuevo requisitos y estado del personaje en el servidor; el catálogo solo expone clases desbloqueadas o alcanzables. Los atributos ya no admiten asignación manual.

## Endpoints incluidos

- `GET /api/profesiones`: devuelve el catálogo, progreso Job y requisitos pendientes del personaje.
- `POST /api/profesiones/desbloquear` con `{ "claseId": "espadachin" }`: crea el progreso Job cuando los requisitos de todas las clases están cumplidos.
- `POST /api/profesiones/cambiar` con `{ "claseId": "espadachin" }`: selecciona una profesión desbloqueada.
- `POST /api/jugador/atributos/asignar`: ruta retirada (HTTP 410); los atributos se calculan automáticamente.
- `GET /api/habilidades`, `POST /api/habilidades/aprender` y `POST /api/habilidades/equipar`: exponen, aprenden y equipan habilidades teniendo en cuenta la profesión y sus antecesoras.

Las profesiones y maestrías se gestionan desde una pestaña de la Escuela de Combate; `/base/profesiones` se mantiene como ruta directa. La base principal muestra atributos de solo lectura y Energía/Maná, y el HUD distingue las barras Base y Job.

## Catálogo inicial

- Tier 0: Novato.
- Tier 1: Espadachín, Acólito, Arquero y Mago.
- Tier 2: Caballero/Duelista, Sacerdote/Monje, Cazador/Explorador y Elementalista/Brujo.
- Híbrida de ejemplo: Cruzado (Caballero Job 40 + Sacerdote Job 40).

Para ampliar el juego, se añade una definición a `CLASES` indicando `tier`, `nivelJobMaximo`, `requisitos`, dominios de equipo y bonuses. Para que una habilidad sea heredable, se define `claseId` con la profesión que la aprende; las clases descendientes con esa rama la heredan automáticamente.

## Migraciones de base de datos

Las migraciones de esta iteración añaden el modelo de progreso por profesión, atributos, Energía/Maná, puntos de atributos y snapshots de ataque/defensa mágicos de combate.

La migración `20261012180000_reset_personajes_a_novato` adapta los personajes que ya existían al nuevo modelo: conserva exactamente `Personaje.nivel` y `Personaje.experiencia`, cambia la clase heredada a `Novato`, establece `profesionActivaId = "novato"` y reinicia su progreso Job de Novato a nivel 1 con 0 XP y 0 puntos Job. También elimina los progresos Job de otras profesiones para que se desbloqueen desde cero. Los atributos Base y los puntos de atributo no se reinician en esa migración.

La migración `20261012190000_objetos_instance_system` añade el inventario de instancias, las diez ranuras, los sufijos persistentes y la recompra de la última venta. Además, acredita una compensación única del 30 % del precio de catálogo por las unidades de objetos legacy incluidas en su tabla SQL. Los objetos no se borran ni se desmontan durante la migración. La compensación ocurre al aplicar esa migración y no se repite mediante operaciones normales de la aplicación.

Antes de ejecutar SQL de migración sobre tu base local, haz una copia de seguridad y comprueba cómo se ha administrado el esquema desde el inicio. Esta iteración **no ha ejecutado ninguna migración en tu PostgreSQL local**.

Primero, desde PowerShell en la raíz del proyecto:

```powershell
npx prisma migrate status
npx prisma generate
```

Si Prisma confirma que la base utiliza el historial de migraciones y que las anteriores están aplicadas, puedes desplegar las pendientes con `npx prisma migrate deploy`. Si tu base se creó o actualizó con `prisma db push` y no tiene historial en `_prisma_migrations`, **no ejecutes `migrate deploy` a ciegas**: las migraciones anteriores podrían intentar volver a crear tablas o columnas existentes. En ese caso, primero hay que establecer una línea base coherente con el esquema real; la migración de reinicio de personajes debe ejecutarse exactamente una vez.

Las migraciones conservan `Personaje.nivel` y `Personaje.experiencia`. A personajes sin progreso profesional se les crea un registro inicial de Novato; los personajes nuevos crean esa misma fila al reclutarse.


## Cambios de progresión por arquetipo

- La API de profesiones solo entrega clases ya desbloqueadas o para las que el personaje cumple todos los requisitos de acceso en ese momento; excluye la profesión activa de las opciones de cambio.
- El HUD global muestra niveles y barras de experiencia Base y Job por separado.
- Los atributos visibles y usados en los cálculos de combate se derivan del arquetipo de la profesión activa, del nivel Base y de su nivel Job. La antigua ruta de asignación manual de atributos devuelve HTTP 410.
- Profesiones y maestrías se gestionan desde una pestaña de la Escuela de Combate; la base principal conserva una vista de solo lectura de atributos y estadísticas.


## Auditoría de estadísticas de combate

- PvE calcula estadísticas a partir de la profesión activa, progreso Job, habilidades pasivas y equipo antes de crear el combate; después guarda un snapshot para resolver todos los turnos con los mismos valores.
- Los asedios PvP calculan de forma independiente las estadísticas completas del atacante y del defensor.
- Los ataques básicos utilizan ataque/defensa físicos; las habilidades con daño mágico usan ataque/defensa mágicos. Los críticos siguen utilizando la probabilidad y el multiplicador del snapshot.
- Precisión y evasión ahora participan en la resolución de ataques básicos y habilidades dañinas. Se congelan al iniciar PvE o PvP para ambos combatientes.
- La migración aditiva `20261012200000_combat_precision_evasion` añade cuatro columnas con valores por defecto para que los combates anteriores sean compatibles. Aplica las migraciones pendientes en la base local antes de ejecutar esta versión.


## Dificultad y progresión de expediciones

Las reglas de amenaza, dificultad por expedición, recompensas y ritmo Base/Job se documentan en [Dificultad de expediciones](dificultad-expediciones.md).

La migración `20261012210000_expedition_difficulty_progression` añade el modo de dificultad a las expediciones y el registro JSON de rangos superados en Personaje. Los personajes existentes reciben rangos previos equivalentes a su nivel Base para evitar retrocesos; los nuevos empiezan con Rango I. No modifica el nivel ni la experiencia Base existentes.

Job ahora usa su propia curva `round(100 + 25 × nivelJob^1,5)`. En una victoria apropiada se entrega normalmente el 75 % del umbral Job actual ajustado por amenaza/modo; en derrota se entrega el 10 % de esa cantidad. La experiencia Base conserva su umbral `round(500 × nivel^1,55)`, pero la recompensa por victoria decrece con el nivel mediante el divisor `1 + 0,45 × (nivelBase − 1)`. En Normal contra una amenaza equivalente hacen falta aproximadamente 4 victorias para Base 1→2, 10 para 4→5 y unas 172 victorias acumuladas para llegar de Base 1 a 13; los modos y la amenaza real alteran esas cifras. Así los rangos no se desbloquean en unas pocas semanas por mantener el mismo número de victorias por nivel. Esto hace que Job suba más deprisa por niveles, sin transferir a una profesión nueva toda la XP Base acumulada por un personaje veterano.

