# Servicios de compañía

Esta carpeta contiene operaciones persistentes; las reglas puras y catálogos viven en `src/lib/party/`.

- `party-service.ts`: membresía, invitaciones y traslados entre bases.
- `expedicion-party-service.ts`: inicio, viaje y estado de las expediciones compartidas.
- `combate-party-service.ts`: consultas y representación persistida del combate.
- `combate-party-actions.ts`: acciones de jugador/enemigo, secuencia de turnos, liquidación y control de concurrencia.
- `inventario-recompensas.ts`: **solo** persistencia de objetos y botín al inventario durante la liquidación. Recibe el mismo `Prisma.TransactionClient`; no crea transacciones propias. Sus dependencias de catálogo y límite son explícitas para conservar el comportamiento y facilitar las pruebas.
- `http.ts`, `index.ts`: entrada HTTP y exportaciones del servicio.

El reparto numérico, el RNG determinista y la normalización de recompensas se encuentran en `src/lib/party/recompensas.ts`. No duplicar estas reglas dentro de los servicios.

**Invariantes:** no resolver un combate ni entregar recompensas dos veces; mantener actualizaciones atómicas, límites de inventario, sufijos de objetos, experiencia individual y el reparto de oro. Cualquier extracción futura debe acompañarse de pruebas y de CI verde antes de continuar con la siguiente.
