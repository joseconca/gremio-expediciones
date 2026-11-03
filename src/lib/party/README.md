# Reglas de compañía (sin persistencia)

Este dominio reúne cálculos y decisiones puros, reutilizables por los servicios y pruebas:

- `reglas.ts`: tamaño máximo, validación de coordenadas, viajes entre bases y permisos.
- `expedicion-reglas.ts`: reglas de expedición compartida y sus tiempos.
- `combate-reglas.ts`: participantes vivos, resolución del encuentro (victoria, derrota o huida) y límite del historial. No mantiene otra cola de turnos.
- `iniciativa.ts`: único planificador de party, con actores vivos, recuperación de la cola persistida y avance por velocidad; reutiliza `../expediciones/combate/iniciativa-combate.ts`.
- `recompensas.ts`: saneamiento de recompensas, reparto exacto de unidades, RNG determinista y agregación del botín.

**No añadir aquí acceso a Prisma, rutas HTTP o estados React.** Las operaciones transaccionales permanecen en `src/server/services/party/`; la lectura de enemigos persistidos está en `src/lib/expediciones/combate/enemigos-combate.ts`.

Las pruebas principales son `tests/party-combat-rules.test.cjs`, `tests/party-rules.test.cjs`, `tests/party-combat-actions.test.cjs` y `tests/enemigos-combate.test.cjs`.
