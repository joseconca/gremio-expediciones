# Sistema de party: arquitectura, reglas y estado de implementación

> Documento de continuidad técnica para futuras sesiones y agentes. Describe el comportamiento comprobado del código, no solo el diseño deseado. Si este documento contradice el código, verifica primero el código y actualiza la documentación en el mismo cambio funcional.
>
> Auditoría de referencia: rama `feature/party-fase-1-core`, commit de código `170fd40f939eb0c7dfb90cd008c885bd3d8c7742` (14-10-2026, antes de añadir este documento).

## Estado general

El sistema ya implementa visitas entre bases, aceptación/rechazo, composición de grupos, expediciones PvE compartidas, combate contra un enemigo común, recompensas individuales, regreso y consulta de informes históricos. La ruta de regresión de la rama estaba verde en el commit auditado.

**No debe considerarse cerrado al 100 % respecto al plan original.** Los principales pendientes funcionales identificados son:

1. El miembro no puede abandonar la party durante una expedición activa. El líder tampoco puede disolverla para cancelar el viaje o combate y ordenar el regreso del grupo.
2. La XP base es idéntica entre participantes, pero se calcula usando el nivel del primer participante ordenado por turno, no el nivel medio del grupo propuesto inicialmente.
3. La API/UI de combate no permite seleccionar a un aliado como objetivo de habilidad o consumible; las habilidades y pociones se resuelven sobre el aventurero que actúa y/o el enemigo.
4. La cobertura de pruebas no demuestra todavía todas las transiciones de abandono/disolución, en particular mientras el grupo está de viaje o combatiendo.

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

Definidos en `prisma/schema.prisma`; migraciones del sistema en `prisma/migrations/20261014120000_party_core/`, `20261014130000_party_expedition/`, `20261014140000_party_combat_core/`, `20261014150000_party_return_metadata/`, `20261014200000_party_reward_settlement/` y `20261014210000_party_reward_report/`.

### `Party`

Representa el grupo activo. Guarda `liderUsuarioId`, fecha de creación/actualización y la relación a sus miembros y expediciones. La disolución elimina el registro de party; no existe actualmente un estado histórico de party disuelta en este modelo.

### `PartyMember`

Une un usuario a una party y conserva `unidoEn`. La unicidad de `usuarioId` evita pertenecer a dos parties a la vez. El servicio garantiza que el dueño de la base de reunión sea líder y que él mismo aparezca como miembro.

### `PartyTransfer`

Persiste visitas y regresos entre bases. Guarda visitante, anfitrión, decisión, coordenadas de origen/destino y fechas de salida, llegada y resolución. No representa una expedición PvE.

Estados que aparecen en el flujo:
- Visita: `en_viaje` → `pendiente` → `aceptada`.
- Rechazo: `en_viaje`/`pendiente` → `regresando` → `rechazada`.
- Salida voluntaria o disolución del líder: `regresando` → `completada`.

El propietario puede aceptar o rechazar cuando vence la hora estimada de llegada aunque el visitante todavía no haya abierto el juego para marcar la llegada. Antes de esa hora se rechaza la resolución.

### `ExpedicionParty` y `ExpedicionPartyParticipante`

`ExpedicionParty` guarda la misión/destino común, dificultad, recompensa de misión, coordenadas, fechas, fase y resultado final. Cada participante conserva usuario/personaje y datos propios del viaje (HP, Energía, Maná, efecto de comida y velocidad de viaje).

Fases principales de expedición:
`en_viaje` → `lista_para_combate` → `combatiendo` → `regresando` → `completada`.

El resultado final del viaje se registra como `exito` o `derrota`. La creación de expedición valida que no exista ya una expedición activa para esa party. Para iniciar se requieren dos o tres personajes disponibles, sin expedición individual ni traslado incompatible.

El flujo compartido está limitado a misiones PvE normales y de élite compatibles. La llegada es común al grupo y utiliza la velocidad mínima registrada entre participantes para calcular la duración del viaje.

### `CombateParty` y `CombatePartyParticipante`

`CombateParty` guarda un enemigo común, su estado y efectos, ronda, fase/turno, usuario cuyo turno corresponde, versión, log, última acción y liquidación de recompensas.

Fases de combate: `activo`, `victoria`, `derrota`. El turno alterna entre `jugador` y `enemigo`.

`CombatePartyParticipante` mantiene por aventurero la iniciativa/orden de turno, HP máximo y actual, snapshot de atributos de combate, estado, posición, efectos y cooldowns. Energía/Maná e inventario se leen/escriben en el personaje del propio usuario cuando ejecuta habilidades u objetos.

## Recorrido funcional actual

1. **Visita a otra base.** `POST /api/party/transfer` crea el traslado y pone al personaje en estado de viaje. El usuario no puede visitar su propia base, formar parte ya de otra party ni tener una actividad incompatible.
2. **Llegada y decisión del anfitrión.** `POST /api/party/transfer/llegar` marca la visita como pendiente cuando vence la fecha. `POST /api/party/transfer/aceptar` incorpora al visitante a la party o crea una party con el anfitrión como líder. `POST /api/party/transfer/rechazar` inicia el regreso a la base de origen.
3. **Gestión de la party.** `GET /api/party` devuelve la membresía, traslados, expedición activa y último resultado que corresponda al usuario. `POST /api/party/abandonar` permite al no líder salir si su personaje está ocioso. `POST /api/party/disolver` permite al líder enviar a los integrantes a sus bases si todo el grupo está disponible en base; después elimina la party.
4. **Inicio de expedición.** `POST /api/expediciones/party/iniciar` lo puede invocar solo el líder. Registra la composición de participantes y un viaje compartido.
5. **Llegada e inicialización del combate.** `POST /api/expediciones/party/llegar` hace avanzar el viaje cuando vence la fecha. `POST /api/expediciones/party/combate/iniciar` inicializa el enemigo y snapshots de participantes; una petición repetida reutiliza el combate ya creado.
6. **Acciones y turno enemigo.** `POST /api/expediciones/party/combate/accion` permite `atacar`, `usar_habilidad` y `usar_objeto` cuando le corresponde al jugador. `POST /api/expediciones/party/combate/turno-enemigo` resuelve el turno del enemigo. Ambos caminos controlan fase, usuario, estado de participante y versión.
7. **Resultado y regreso.** Una victoria liquida recompensas y luego prepara el regreso; una derrota prepara el regreso sin recompensas de victoria. `POST /api/expediciones/party/regreso` completa la llegada de regreso cuando vence la fecha. Las transiciones están protegidas por actualizaciones condicionales.
8. **Informe histórico.** El resumen estructurado de la victoria se persiste en `CombateParty.recompensasResultado`. El servicio permite recuperar el último resultado compartido a quienes participaron en esa expedición, y la interfaz lo restaura tras recargar.

## Reglas de combate y economía implementadas

### Turnos y efectos

- Los turnos del jugador siguen el orden persistido en los participantes; los aventureros caídos se saltan.
- La victoria tiene prioridad cuando el HP del enemigo llega a cero. La derrota se determina cuando ya no quedan aventureros vivos.
- HP y estados se sincronizan individualmente con `Personaje`.
- Cooldowns y efectos del personaje no se comparten con los demás participantes.
- La versión de combate y actualizaciones condicionales impiden confirmar dos veces la misma acción. El turno enemigo posterior a una victoria no debe volver a liquidar recompensas ni iniciar otro regreso.

### Liquidación de victoria

La liquidación corre dentro de una transacción y comprueba la fase, la versión y `recompensasResueltas`. Si no puede cerrar el estado esperado, aborta; no debe distribuir parcialmente ni repetir los pagos.

- **Oro:** suma la recompensa de oro de la misión y el oro del enemigo, aplica el multiplicador de dificultad y reparte el total entre los participantes registrados.
- **Madera, piedra y metal:** se reparten desde la recompensa de misión.
- **Redondeos:** `repartirCantidadEntera` asigna las unidades enteras de forma determinista según el índice en la lista ordenada de participantes.
- **XP Base:** todos los participantes reciben la misma cantidad calculada una vez para el resultado. Actualmente se usa el nivel del primer personaje ordenado por turno, no el promedio de niveles del grupo del diseño inicial. Después, cada personaje progresa con sus propios niveles y experiencia.
- **XP Job:** se otorga por personaje usando su profesión activa y el sistema de progresión existente.
- **Objetos de misión:** las cantidades se distribuyen entre participantes; un aventurero puede recibir cero unidades si la cantidad no alcanza a todos.
- **Botín enemigo:** se tira por separado para cada usuario. La semilla determinista incluye combate, enemigo y usuario, evitando que un reintento cambie el resultado de una liquidación.
- **Inventario lleno/objeto inválido:** el objeto que no se puede añadir se pierde y se deja constancia en el log. El informe estructurado incluye los objetos que sí se entregaron; consulta el log si necesitas auditar una entrega fallida.
- **Derrota:** no se abonan las recompensas de victoria.

## Interfaz

La interfaz principal de party está en `src/components/base/PanelParty.tsx`. Presenta roster y líder, traslados/visitas, acciones de aceptar/rechazar, expedición compartida, estado de combate, acciones disponibles en el turno propio, HP por participante e informe de recompensas.

El panel obtiene su estado mediante `GET /api/party` y mantiene parte de la presentación en estado local de React; no todo el estado social se centraliza en Zustand. La selección de una base ajena se integra mediante el mapa existente.

La salida de party en la interfaz está deshabilitada mientras el personaje está ocupado. Esta restricción coincide con el servicio y es una de las diferencias con el plan original. La interfaz de combate no envía `objetivoUsuarioId` ni otro selector de aliado: no hay selección de objetivo aliado implementada en este contrato de API.

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
- `POST /api/expediciones/party/combate/accion`
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

La CI `.github/workflows/regression.yml` ejecuta estas cinco comprobaciones en la rama `feature/party-fase-1-core`. En la auditoría base, la ejecución del commit `170fd40f939eb0c7dfb90cd008c885bd3d8c7742` terminó con éxito.

## Matriz del plan original

| Fase | Estado actual | Diferencias o trabajo que queda |
|---|---|---|
| 1. Modelo y gestión social | Implementada en lo principal | Añadir/confirmar pruebas para abandono y disolución; comprobar carreras de aceptación y capacidad máxima. |
| 2. Interfaz y estado | Funcional, con diferencias de diseño | El panel presenta el grupo y las visitas, pero no toda la información social vive en Zustand. Revisar si se quiere una representación visual de los visitantes junto al sprite dentro de la base; el roster del panel sí existe. |
| 3. Expedición compartida | Implementada en lo principal | Mantener las restricciones de misión compartida documentadas y ampliar pruebas de transiciones. |
| 4. Combate compartido | Implementada en lo principal | Sin selección de objetivo aliado en API/UI. Añadir solo si hay habilidades que necesiten curar/proteger a otro miembro. |
| 5. Recompensas, abandono y regreso | Parcial | La liquidación y el regreso normal están implementados; falta salida voluntaria durante el viaje/combate y cancelación/disolución activa del líder. La XP no usa el nivel medio propuesto. |
| 6. Informe y estabilización | Parcialmente cubierta | El informe persiste y se restaura; faltan pruebas de las transiciones críticas indicadas arriba. CI verde en el commit auditado. |

## Próximos pasos recomendados

1. Diseñar y probar las transiciones de abandono de un miembro durante viaje/combate: retirar su elegibilidad si el resultado aún no se ha fijado, sacarlo del turno y devolverlo a su base sin bloquear al resto.
2. Diseñar y probar la disolución por el líder durante viaje/combate: cancelar la expedición activa y enviar a cada integrante a su propia base; si el resultado ya está fijado, conservar las recompensas y organizar el regreso.
3. Decidir expresamente si se mantiene XP basada en el primer participante o se cambia a nivel medio. No modificar esa economía sin actualizar tests y este documento.
4. Añadir pruebas de regresión para: rechazo/abandono/disolución en cada fase; usuario ajeno; reintentos y concurrencia; coherencia de estados de personajes y participantes.
5. Si se añaden habilidades de apoyo a aliados, extender el contrato de API, el servicio, la validación de objetivo y la interfaz con pruebas específicas.

## Instrucción para futuras sesiones/prompts

Antes de tocar party, leer este documento y revisar los servicios/tests enumerados. No asumir que los puntos marcados como pendientes están implementados. Al cambiar un modelo, fase, ruta, política de recompensa, regla de abandono o comportamiento de recuperación, actualizar este documento en el mismo cambio y ejecutar `npm run test:party`, `npm run test:base`, `npm run test:progression`, `npm run lint` y `npm run build`.
