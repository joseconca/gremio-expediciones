# Sistema de party: arquitectura, reglas y estado de implementación

> Documento de continuidad técnica para futuras sesiones y agentes. Describe el comportamiento comprobado del código, no solo el diseño deseado. Si este documento contradice el código, verifica primero el código y actualiza la documentación en el mismo cambio funcional.
>
> Revisión funcional de la rama `feature/party-fase-1-core`: 15-10-2026.

## Estado general

El sistema de party incorpora composición de grupo, visitas/aceptación, expediciones PvE compartidas, combate contra enemigo común, recompensas por participante, huida y regreso. Las retiradas/disoluciones deben conservar el historial; las expediciones previas no deben borrarse mediante cascadas.

El cambio incluye una migración para registrar el ciclo de vida de Party. Después de actualizar la rama, ejecutar `npx prisma migrate status` y aplicar las migraciones pendientes con `npx prisma migrate deploy`.

Pendientes ajenos a este cambio: la experiencia común se calcula usando el nivel del primer integrante por orden de turno (no el nivel medio propuesto); la API/UI no permite seleccionar aliados como objetivo; conviene seguir ampliando pruebas de concurrencia y recuperación.

## Principios que hay que conservar

- Una party tiene entre dos y tres integrantes durante su funcionamiento normal. El líder cuenta para el máximo.
- El líder es el propietario de la base de reunión. No se transfiere la propiedad del personaje, inventario, equipo, oro ni progresión de cada usuario.
- Cada usuario puede tener una sola membresía: `PartyMember.usuarioId` es único.
- El sistema party usa modelos y servicios propios. No se deben encajar tres usuarios dentro de `ExpedicionActiva` o `CombateActivo`, que pertenecen al flujo individual/PvP legado.
- El estado de cada personaje y de cada participante de combate es individual. El enemigo y el resultado de la expedición son compartidos.
- La validación autorizativa debe estar en servicios de servidor. La interfaz no sustituye las comprobaciones de propiedad, fase, turno, versión, disponibilidad ni límite de integrantes.
- Las operaciones que modifican estados críticos usan transacciones Prisma serializables y actualizaciones condicionales. Mantener la idempotencia frente a reintentos.
- PvP sigue fuera del motor de combate compartido de party.

## Modelos Prisma

Definidos en `prisma/schema.prisma`; las migraciones incluyen `20261014120000_party_core`, `20261014130000_party_expedition`, `20261014140000_party_combat_core`, `20261014150000_party_return_metadata`, `20261014200000_party_reward_settlement`, `20261014210000_party_reward_report` y `20261015120000_party_withdrawal_lifecycle`.

### `Party`

Representa la party actual y sirve también de vínculo de sus expediciones históricas. Incluye `estado` (`activa` o `disuelta`). Al disolver, se eliminan sus filas `PartyMember`, pero se conserva el registro de party porque `ExpedicionParty` mantiene una relación `onDelete: Restrict`. Si el líder crea un grupo nuevo, se reactiva la fila existente y se restaura su membresía.

### `PartyMember`

Une un usuario a una party y conserva `unidoEn`. La unicidad de `usuarioId` evita pertenecer a dos parties a la vez. El servicio garantiza que el dueño de la base de reunión sea líder y que él mismo aparezca como miembro.

### `PartyTransfer`

Persiste visitas y regresos entre bases. Guarda visitante, anfitrión, decisión, coordenadas de origen/destino y fechas de salida, llegada y resolución. No representa una expedición PvE.

Estados que aparecen en el flujo:
- Visita: `en_viaje` → `pendiente` → `aceptada`.
- Rechazo: `en_viaje`/`pendiente` → `regresando` → `rechazada`.
- Regreso voluntario del visitante: `pendiente` → `regresando` → `completada`, usando `decision = visitante_volver`. Solo se permite una vez confirmada la llegada y si el anfitrión todavía no ha aceptado ni rechazado.
- Salida voluntaria o disolución del líder: `regresando` → `completada`.

El propietario puede aceptar o rechazar cuando vence la hora estimada de llegada aunque el visitante todavía no haya abierto el juego para marcar la llegada. Antes de esa hora se rechaza la resolución.

### `ExpedicionParty` y `ExpedicionPartyParticipante`

La expedición conserva misión, destino, dificultad, recompensa, itinerario y participantes originales para fines históricos. Fases principales: `en_viaje` → `lista_para_combate` → `combatiendo` → `regresando` → `completada`; una disolución antes del resultado terminal puede marcarla `cancelada`. Los resultados finales son `exito`, `derrota` o `huida`.

Los estados de participante `huyo` y `retirado` son distintos: `huyo` deja al jugador fuera del combate, pero conserva su membresía y espera a que termine la party; `retirado` es un estado histórico que puede aparecer al disolver una expedición y ya no participa en el reparto. La salida voluntaria de la party se ejecuta explícitamente cuando no hay una expedición activa.

### `CombateParty` y `CombatePartyParticipante`

El combate mantiene un enemigo común, turnos ordenados, versión y liquidación idempotente. Fases: `activo`, `victoria`, `derrota`, `huida` y `cancelada`. `huyo` excluye al miembro de turnos posteriores y del botín del enemigo, pero no de su cuota de oro ni de las recompensas de misión. `jugadorPosicion` guarda `mele`, `centro` o `retaguardia` para la formación visual.

## Recorrido funcional actual

1. **Visitas y composición.** El dueño de la base acepta o rechaza la visita; el líder cuenta para el límite de tres miembros. Si el visitante ya llegó y sigue esperando, puede pulsar `Volver a mi base`: la visita pasa atómicamente a regreso, invirtiendo origen/destino. La aceptación, el rechazo y la cancelación del visitante son operaciones mutuamente excluyentes.
2. **Expedición compartida.** El líder inicia misiones PvE compatibles y cada jugador conserva su personaje, economía, inventario y progresión.
3. **Huida individual.** `HUIR` marca el combate como `huida`, inicia el regreso y entrega cero oro, XP y recompensas de misión/enemigo.
4. **Huida en party.** El participante pasa a `huyo`, ya no puede actuar ni ser seleccionado como objetivo del enemigo, pero continúa en la party esperando al resto. Si ganan, recibe su cuota de oro y su parte de los recursos/objetos de misión, pero no XP Base/Job ni botín individual del enemigo. Si todos huyen, no hay liquidación de victoria.
5. **Regreso tras el combate.** La party regresa junta a las coordenadas de origen de la expedición, que son las de la base del líder. Al completar la llegada, todos los personajes activos pasan a `ocioso`, pero se conservan las membresías y el liderazgo. El informe de recompensas permanece disponible tras recargar la página e incluye recursos, XP Base/Job, subidas de nivel, objetos de misión y drops del enemigo.
6. **Nueva expedición.** Solo el líder puede elegir e iniciar el siguiente contrato compartido. Los integrantes normales no reciben marcadores seleccionables en el mapa y el endpoint de expedición individual los rechaza mientras pertenezcan a la party.
7. **Salida voluntaria de la party.** El botón para abandonar se habilita cuando no hay expedición activa y el personaje está disponible en la base. Huir del combate no cambia la membresía.
8. **Disolución del líder.** Si existe una expedición activa, cada integrante que siga en ella recibe un traslado desde la posición actual a su propia base. Si el resultado todavía no está fijado, el viaje/combate se cancela sin recompensas de victoria; si ya estaba regresando con resultado fijado, se conserva el resultado. La party queda `disuelta`, conservando su historial y pudiendo reactivarse en el futuro.
7. **Regreso e informe.** Los traslados individuales se completan por la ruta existente y el informe histórico permanece disponible.

## Reglas de combate y economía implementadas

### Turnos y efectos

- Los turnos PvE de solitario y party comparten una cola de iniciativa persistida. Cada ciclo distribuye acciones en proporción a la velocidad relativa al más lento: velocidades 10/15/30 producen 1/2/3 acciones y 10/100 produce 1/10; no se impone un tope fijo de tres acciones. La cola intercala las acciones en orden temporal (por ejemplo, C, B, C, A, C, B) y prioriza la velocidad más alta al comenzar.
- Los empates de velocidad se resuelven mediante un hash determinista de la semilla del combate, el actor y la ronda: una misma semilla reproduce el mismo orden, y otra semilla puede cambiarlo. No se utiliza aleatoriedad nueva en cada petición.
- Cada acción enemiga se resuelve de forma individual. Los actores caídos, los enemigos derrotados y los miembros que han huido se eliminan de las acciones pendientes, sin conservar turnos extra.
- La cola se guarda en `CombateActivo.turnosPendientes` y `CombateParty.turnosPendientes`; el cambio de esquema está en `20261018170000_iniciativa_por_velocidad`.
- La victoria tiene prioridad cuando el HP de todos los enemigos llega a cero. La derrota se determina cuando ya no quedan aventureros vivos.
- HP y estados se sincronizan individualmente con `Personaje`.
- Cooldowns y efectos del personaje no se comparten con los demás participantes.
- La versión de combate y actualizaciones condicionales impiden confirmar dos veces la misma acción. El turno enemigo posterior a una victoria no debe volver a liquidar recompensas ni iniciar otro regreso.

### Huida y liquidación de victoria

La huida se permite en PvE, nunca en PvP. En solo se marca el combate como `huida`, se inicia el regreso y se entregan cero oro, recursos y XP. En party, quien huye conserva su parte del oro y de los recursos/objetos de misión si los compañeros vencen, pero no recibe XP Base/Job ni botín del enemigo. Si todos huyen, no hay liquidación de victoria.

La victoria liquida la recompensa completa y la derrota liquida recompensas parciales en una transacción serializable. `recompensasResueltas` y `version` protegen contra duplicados. En victoria, el oro enemigo y el de misión se suman y se reparten; los recursos y objetos de misión se reparten entre integrantes no retirados, incluidos quienes huyeron. En derrota, solo cuentan las criaturas abatidas: se reparte el oro parcial y los recursos de misión en proporción a los enemigos derrotados, y se concede XP Base/Job a los miembros que permanecieron combatiendo. Solo se tira botín de enemigos abatidos y no se entregan objetos de misión ni desbloqueos por derrota. Cada resumen se persiste en `recompensasResultado` para poder consultarlo después de recargar. La huida total no genera recompensas de victoria ni botín. La posición táctica es, por ahora, visual: cambiarla no consume el turno ni modifica el alcance o las estadísticas.


## Interfaz

La interfaz principal de party está en `src/components/base/PanelParty.tsx` y se integra completa dentro del tablón `party-expedition-slot` de `PanelMisiones`: roster y líder, traslados/visitas, solicitudes de aceptación, expedición compartida y resumen del combate aparecen en el mismo bloque de la base, no como panel independiente encima del tablón. Presenta también turno y HP por participante, una formación visual responsiva y un selector de posición `Melé`, `Centro` o `Retaguardia`. El líder se dibuja en la parte inferior y los demás progresivamente más arriba; la elección mueve al aventurero hacia el frente/centro/retaguardia. Tras volver, el informe presenta XP Base/Job, niveles subidos y objetos de misión con nombre. En el mapa de expediciones, los integrantes normales ven el contexto de la base del líder y el recorrido compartido, pero no pueden seleccionar contratos; al líder le aparecen de nuevo cuando no hay una expedición activa.

El panel obtiene su estado mediante `GET /api/party` y mantiene parte de la presentación en estado local de React; no todo el estado social se centraliza en Zustand. La selección de una base ajena se integra mediante el mapa existente.

La disolución del líder se permite desde la base o durante la fase de viaje hacia el contrato, siempre con confirmación explícita. Si se disuelve durante el viaje de ida, el contrato se cancela antes del combate y todos los integrantes, incluido el líder, reciben traslados individuales desde la posición actual a sus propias bases; se eliminan las membresías y la party queda disuelta. Desde que la expedición llega a la fase de preparación de combate, durante el combate y durante el regreso, no se puede disolver. Los miembros normales no pueden abandonar mientras haya una expedición activa. El informe de recompensas se muestra mientras la expedición está activa, pero desaparece al completar el regreso; los integrantes no líderes tampoco reciben el enlace para seleccionar contratos desde el panel de misiones. No existe todavía selección de aliado como objetivo de habilidades curativas: las curas se aplican al propio aventurero. El contrato de combate solo contempla un enemigo; las batallas con varios enemigos requieren modelar el conjunto de enemigos con HP/efectos individuales y añadir selección de objetivo, orden/turnos y resolución de victoria cuando todos caigan.

## Archivos relevantes

- Reglas de traslados y capacidad: `src/lib/party/reglas.ts`
- Reglas de expedición y velocidad: `src/lib/party/expedicion-reglas.ts`
- Reglas de iniciativa/resultado: `src/lib/party/combate-reglas.ts`
- Servicio social, visitas y membresía: `src/server/services/party/party-service.ts`
- Servicio de viaje, llegada y regreso: `src/server/services/party/expedicion-party-service.ts`
- Inicialización de combate: `src/server/services/party/combate-party-service.ts`
- Acciones, turnos y recompensas: `src/server/services/party/combate-party-actions.ts`
- Serialización de errores HTTP: `src/server/services/party/http.ts`
- Panel de interfaz: `src/components/base/PanelParty.tsx`
- Esquema: `prisma/schema.prisma`

Rutas API específicas:
- `GET /api/party`
- `POST /api/party/transfer`
- `POST /api/party/transfer/llegar`
- `POST /api/party/transfer/aceptar`
- `POST /api/party/transfer/rechazar`
- `POST /api/party/transfer/completar-regreso`
- `POST /api/party/abandonar`
- `POST /api/party/disolver`
- `POST /api/expediciones/party/iniciar`
- `POST /api/expediciones/party/llegar`
- `POST /api/expediciones/party/combate/iniciar`
- `POST /api/expediciones/party/combate/accion` (ataque, habilidad, objeto, huida y cambio de posición visual)
- `POST /api/expediciones/party/combate/turno-enemigo`
- `POST /api/expediciones/party/regreso`

## Pruebas y verificación

Pruebas de party:
- `tests/party-rules.test.cjs`
- `tests/party-service.test.cjs`
- `tests/party-expedition-rules.test.cjs`
- `tests/party-expedition.test.cjs`
- `tests/party-combat-rules.test.cjs`
- `tests/party-combat-service.test.cjs`
- `tests/party-combat-actions.test.cjs`

Ejecutar antes de declarar un cambio completo:
```bash
npm run test:party
npm run test:base
npm run test:progression
npm run lint
npm run build
```

La CI `.github/workflows/regression.yml` ejecuta estas cinco comprobaciones en la rama `feature/party-fase-1-core`. La referencia de CI que debe usarse para valorar estos cambios es la ejecución del nuevo commit, no la verde de la revisión anterior.

## Matriz del plan original

| Fase | Estado | Notas |
|---|---|---|
| 1. Modelo y gestión social | Implementada, pendiente de CI | Visitas, membresía y estado activa/disuelta. |
| 2. Interfaz y estado | Implementada en lo esencial | Roster, turnos, botones de huida/abandono/disolución e informes. |
| 3. Expedición compartida | Implementada en lo esencial | Viaje, llegada, retirada individual y regreso. |
| 4. Combate compartido | Implementada, pendiente de CI | Huida, turnos y liquidación grupal. |
| 5. Recompensas, abandono y regreso | Implementada, pendiente de CI | Oro para quien huyó; sin XP/botín enemigo; regreso a base propia al retirarse/disolver. |
| 6. Informe y estabilización | En verificación | La CI del nuevo commit debe terminar verde antes de probar en local. |

## Próximos pasos recomendados

1. Decidir si conviene calcular la XP compartida con el nivel medio del grupo.
2. Ampliar pruebas de concurrencia/reintentos en transiciones de abandono y disolución.
3. Si se añaden habilidades de apoyo a aliados, extender API, validación de objetivo, motor y UI con pruebas específicas.

## Instrucción para futuras sesiones/prompts

Antes de tocar party, leer este documento y revisar los servicios/tests enumerados. No asumir que los puntos marcados como pendientes están implementados. Al cambiar un modelo, fase, ruta, política de recompensa, regla de abandono o comportamiento de recuperación, actualizar este documento en el mismo cambio y ejecutar `npm run test:party`, `npm run test:base`, `npm run test:progression`, `npm run lint` y `npm run build`.
