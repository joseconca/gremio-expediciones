# Servicios de compañía

Esta carpeta contiene operaciones persistentes; las reglas puras y catálogos viven en `src/lib/party/`.

- `party-service.ts`: membresía, invitaciones y traslados entre bases.
- `expedicion-party-service.ts`: inicio, viaje y estado de las expediciones compartidas.
- `combate-party-service.ts`: consultas y representación persistida del combate.
- `combate-party-actions.ts`: acciones del **jugador**. Gestiona ataques, habilidades, consumibles, formación y huida sin cambiar los contratos de endpoints.
- `turno-enemigo.ts`: ejecución y persistencia del **turno enemigo**, con efectos, selección de objetivos, barreras, iniciativa y control de versión.
- `contexto-combate.ts`: validación de IDs, carga de combate dentro de la transacción y proyección de participantes. Compartido por ambos turnos.
- `recursos-turno.ts`: regeneración de energía/maná del personaje cuando le corresponde actuar, sin abrir nuevas transacciones.
- `liquidacion-recompensas.ts`: resolución de recompensas de victoria/derrota en la **misma transacción serializable** que el combate, sin abrir otra. Conserva marca de liquidación, comprobación de versión, reparto de oro, XP Base/Job, equipo, drops y log persistido.
- `regreso-combate.ts`: transición transaccional al regreso tras la victoria/derrota/huida; preserva la hora de llegada programada independientemente de cuándo se resuelve el combate.
- `inventario-recompensas.ts`: **solo** persistencia de objetos y botín al inventario durante la liquidación. Recibe el mismo `Prisma.TransactionClient`; no crea transacciones propias. Sus dependencias de catálogo y límite son explícitas para conservar el comportamiento y facilitar las pruebas.
- `errores.ts`: contrato único de `PartyServiceError` (status, code y mensaje), sin cargar el módulo de traslados. `index.ts` lo exporta como parte de la API de party; `party-service.ts` no lo reexporta.
- `consultas.ts`: selección Prisma compartida de personaje, habilidades, inventario y equipo; los servicios reutilizan exactamente el mismo `include`.
- `http.ts`, `index.ts`: entrada HTTP y exportaciones del servicio.

El reparto numérico, el RNG determinista y la normalización de recompensas se encuentran en `src/lib/party/recompensas.ts`. Las colas de iniciativa de party viven en `src/lib/party/iniciativa.ts`, que delega en la iniciativa común de `src/lib/expediciones/combate/iniciativa-combate.ts`. La lectura compatible de enemigos persistidos está en `src/lib/expediciones/combate/enemigos-combate.ts`. No duplicar estas reglas dentro de los servicios.

**Invariantes:** no resolver un combate ni entregar recompensas dos veces; mantener actualizaciones atómicas, límites de inventario, sufijos de objetos, experiencia individual y el reparto de oro. Cualquier extracción futura debe acompañarse de pruebas y de CI verde antes de continuar con la siguiente.
