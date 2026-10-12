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
- Cada nivel Job obtenido en combate PvE concede un punto de habilidad para la profesión activa. Al alcanzar el Job máximo se registra el hito de maestría. Cada nivel Base ganado en combate concede tres puntos distribuibles de atributo.
- Las primeras habilidades específicas ya tienen costes de Energía o Maná y se aprenden mediante puntos Job. Las habilidades genéricas antiguas siguen disponibles mediante la Escuela y oro durante la transición.
- Las habilidades profesionales propias y heredadas permanecen visibles en la Escuela. Solo las habilidades genéricas mantienen ofertas rotatorias diarias.
- Cada clase declara categorías de armas y armaduras dominadas. El dominio aplica un multiplicador a la estadística de ataque del arma compatible y a la defensa de la armadura compatible. Equipar una categoría no dominada sigue siendo posible, pero no recibe ese bonus.
- Las seis estadísticas principales (Fuerza, Agilidad, Vitalidad, Inteligencia, Destreza y Suerte) alimentan `calcularEstadisticasDerivadasRpg`. Los coeficientes iniciales son valores de balance y están centralizados en ese módulo.
- Las habilidades marcadas con `tipoDano: "magico"` utilizan ataque y defensa mágicos. Los costes de Energía/Maná se validan y descuentan en la misma transacción que guarda la acción de combate; los recursos se regeneran por turno, sin superar el máximo calculado.
- Los endpoints de profesiones y atributos validan de nuevo requisitos, puntos disponibles y estado del personaje en el servidor; la UI no decide por sí sola si una acción está permitida.

## Endpoints incluidos

- `GET /api/profesiones`: devuelve el catálogo, progreso Job y requisitos pendientes del personaje.
- `POST /api/profesiones/desbloquear` con `{ "claseId": "espadachin" }`: crea el progreso Job cuando los requisitos de todas las clases están cumplidos.
- `POST /api/profesiones/cambiar` con `{ "claseId": "espadachin" }`: selecciona una profesión desbloqueada.
- `POST /api/jugador/atributos/asignar` con `{ "atributo": "fuerza" }`: consume un punto de atributo e incrementa el atributo validado hasta un máximo de 99.
- `GET /api/habilidades`, `POST /api/habilidades/aprender` y `POST /api/habilidades/equipar`: exponen, aprenden y equipan habilidades teniendo en cuenta la profesión y sus antecesoras.

La interfaz de profesiones está en `/base/profesiones`. La Escuela muestra nivel Job, puntos disponibles y costes de las habilidades; la base principal muestra el panel de atributos y Energía/Maná.

## Catálogo inicial

- Tier 0: Novato.
- Tier 1: Espadachín, Acólito, Arquero y Mago.
- Tier 2: Caballero/Duelista, Sacerdote/Monje, Cazador/Explorador y Elementalista/Brujo.
- Híbrida de ejemplo: Cruzado (Caballero Job 40 + Sacerdote Job 40).

Para ampliar el juego, se añade una definición a `CLASES` indicando `tier`, `nivelJobMaximo`, `requisitos`, dominios de equipo y bonuses. Para que una habilidad sea heredable, se define `claseId` con la profesión que la aprende; las clases descendientes con esa rama la heredan automáticamente.

## Migraciones de base de datos

Las migraciones de esta iteración añaden el modelo de progreso por profesión, atributos, Energía/Maná, puntos de atributos y snapshots de ataque/defensa mágicos de combate.

Después de actualizar la rama, ejecuta desde PowerShell en la raíz del proyecto:

```powershell
npx prisma migrate deploy
npx prisma generate
```

No se ha ejecutado esta migración en tu base PostgreSQL local desde aquí. Haz una copia de seguridad antes de aplicarla. Para una base nueva creada con `prisma db push`, revisa el estado de migraciones antes de mezclar ambos métodos; no alternes `db push` y migraciones en una base compartida sin comprobar el historial.

Las migraciones conservan los campos de progreso Base existentes. A personajes que no tenían progreso profesional se les crea un registro inicial de Novato; los personajes nuevos crean esa misma fila al reclutarse.
