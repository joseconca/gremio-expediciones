# Reglas de compañía (sin persistencia)

Este dominio reúne cálculos y decisiones puros, reutilizables por los servicios y pruebas:

- `reglas.ts`: tamaño máximo, validación de coordenadas, viajes entre bases y permisos.
- `expedicion-reglas.ts`: reglas de expedición compartida y sus tiempos.
- `combate-reglas.ts`: ciclo de participantes, turnos antiguos y resultado del encuentro.
- `iniciativa.ts`: actores vivos, recuperación de la cola persistida y avance por velocidad; reutiliza `../expediciones/iniciativa-combate.ts`.
- `recompensas.ts`: saneamiento de recompensas, reparto exacto de unidades, RNG determinista y agregación del botín.

**No añadir aquí acceso a Prisma, rutas HTTP o estados React.** Las operaciones transaccionales permanecen en `src/server/services/party/`; el snapshot de enemigos y la compatibilidad legacy están en `src/lib/expediciones/enemigos-combate.ts`.

Las pruebas principales son `tests/party-combat-rules.test.cjs`, `tests/party-rules.test.cjs`, `tests/party-combat-actions.test.cjs` y `tests/enemigos-combate.test.cjs`.
