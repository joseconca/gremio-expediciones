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

La migración `20261012180000_reset_personajes_a_novato` adapta los personajes que ya existían al nuevo modelo: conserva exactamente `Personaje.nivel` y `Personaje.experiencia`, cambia la clase heredada a `Novato`, establece `profesionActivaId = "novato"` y reinicia su progreso Job de Novato a nivel 1 con 0 XP y 0 puntos Job. También elimina los progresos Job de otras profesiones para que se desbloqueen desde cero. Los atributos Base y los puntos de atributo no se reinician en esa migración.

La devolución de oro por los objetos del sistema antiguo **no forma parte de esta migración**. Se hará junto con el nuevo inventario/equipamiento, a partir de los objetos que cada personaje posea antes de retirarlos, registrando la compensación como una operación única para evitar pagos duplicados.

Antes de ejecutar SQL de migración sobre tu base local, haz una copia de seguridad y comprueba cómo se ha administrado el esquema desde el inicio. Esta iteración **no ha ejecutado ninguna migración en tu PostgreSQL local**.

Primero, desde PowerShell en la raíz del proyecto:

```powershell
npx prisma migrate status
npx prisma generate
```

Si Prisma confirma que la base utiliza el historial de migraciones y que las anteriores están aplicadas, puedes desplegar las pendientes con `npx prisma migrate deploy`. Si tu base se creó o actualizó con `prisma db push` y no tiene historial en `_prisma_migrations`, **no ejecutes `migrate deploy` a ciegas**: las migraciones anteriores podrían intentar volver a crear tablas o columnas existentes. En ese caso, primero hay que establecer una línea base coherente con el esquema real; la migración de reinicio de personajes debe ejecutarse exactamente una vez.

Las migraciones conservan `Personaje.nivel` y `Personaje.experiencia`. A personajes sin progreso profesional se les crea un registro inicial de Novato; los personajes nuevos crean esa misma fila al reclutarse.
