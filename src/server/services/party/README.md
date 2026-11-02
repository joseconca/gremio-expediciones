# Servicios de compañía

Esta carpeta contiene operaciones persistentes; las reglas puras y catálogos viven en `src/lib/party/`.

- `party-service.ts`: membresía, invitaciones y traslados entre bases.
- `expedicion-party-service.ts`: inicio, viaje y estado de las expediciones compartidas.
- `combate-party-service.ts`: consultas y representación persistida del combate.
- `combate-party-actions.ts`: acciones de jugador/enemigo, liquidación y control de concurrencia. Invoca las reglas puras de `src/lib/party/iniciativa.ts` para preparar los turnos.
- `inventario-recompensas.ts`: **solo** persistencia de objetos y botín al inventario durante la liquidación. Recibe el mismo `Prisma.TransactionClient`; no crea transacciones propias. Sus dependencias de catálogo y límite son explícitas para conservar el comportamiento y facilitar las pruebas.
- `errores.ts`: contrato único de `PartyServiceError` (status, code y mensaje), sin cargar el módulo de traslados. `party-service.ts` mantiene la reexportación antigua.
- `consultas.ts`: selección Prisma compartida de personaje, habilidades, inventario y equipo; los servicios reutilizan exactamente el mismo `include`.
- `http.ts`, `index.ts`: entrada HTTP y exportaciones del servicio.

El reparto numérico, el RNG determinista y la normalización de recompensas se encuentran en `src/lib/party/recompensas.ts`. Las colas de iniciativa de party viven en `src/lib/party/iniciativa.ts`, que delega en la iniciativa común de `src/lib/expediciones/iniciativa-combate.ts`. La lectura compatible de enemigos persistidos está en `src/lib/expediciones/enemigos-combate.ts`. No duplicar estas reglas dentro de los servicios.

**Invariantes:** no resolver un combate ni entregar recompensas dos veces; mantener actualizaciones atómicas, límites de inventario, sufijos de objetos, experiencia individual y el reparto de oro. Cualquier extracción futura debe acompañarse de pruebas y de CI verde antes de continuar con la siguiente.
