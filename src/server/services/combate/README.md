# Servicios de combate individual y PvP

Este directorio orquesta **sesión, permisos, recursos, transacciones y persistencia**. Las fórmulas y mecánicas puras viven en `src/lib/expediciones/`, no aquí. Los combates de compañía se orquestan en `src/server/services/party/` y comparten las mismas reglas de `src/lib/`.

## Dónde encontrar cada responsabilidad

- `index.ts`: exportaciones públicas de los servicios de combate.
- Las rutas vigentes son `/api/combate/pve/accion` y `/api/combate/pvp/accion`; cada una utiliza su servicio correspondiente. El endpoint genérico y su dispatcher se eliminaron tras verificar que el cliente actual envía el modo de combate explícitamente.
- `accion-combate.ts`: preparación/autorización de acciones, obtención de personaje y combate, cobro de habilidades y regeneración de recursos. Sus operaciones con Prisma deben permanecer en servidor.
  - La petición JSON se lee aquí, pero `validarSolicitudAccionCombate` (`src/lib/expediciones/combate/contrato-accion-combate.ts`) valida acción e identificadores sin importar Prisma ni HTTP.
  - `calcularEstadisticasRecursosPersonaje` es un auxiliar interno compartido por pago y regeneración. **No** cambia el momento del cobro, la selección de columnas o las comprobaciones de concurrencia.
  - `gastarRecursosHabilidad`: separa la versión 2 (cobro/recuperación verificados con `updateMany` y lectura de máximos) de la versión heredada (descuento condicional y posterior recuperación); no modificar orden ni errores.
  - `regenerarRecursosPorTurno`: recarga del personaje después del turno del combate individual/PvP. La party usa `src/server/services/party/recursos-turno.ts` en su propia transacción; compartir la fórmula `src/lib/expediciones/combate/recursos-combate.ts` no hace equivalentes ambas operaciones.
  - `tests/recursos-habilidades.test.cjs` comprueba el pago v2, el control de concurrencia y el comportamiento legacy.
- `pve.ts`: ejecución y persistencia de turnos PvE, enemigos y recompensas.
- `pvp.ts`: ejecución y persistencia de turnos PvP/asedios; conserva sus reglas de quién actúa y el estado del defensor.
- `contexto-tactico.ts`: convierte personaje, equipo, habilidades equipadas e instantáneas del combate al `ContextoTecnicaTactica` que necesita el motor. Se consume desde PvE, PvP y party.
- `actualizar-combate-versionado.ts`: actualización protegida frente a concurrencia (`COMBATE_MODIFICADO`).
- `efectos-visualizacion.ts`: añade metadatos de pulsos de estados al resultado animado, sin decidir daño o curación.

## Reglas compartidas que **no deben duplicarse** aquí

- `src/lib/expediciones/combate.ts`: resolución y tipos de acciones de combate; ataques básicos en `combate/ataques-basicos.ts`.
- `src/lib/expediciones/combate/tacticas/mecanicas-habilidades.ts` y `src/lib/expediciones/combate/tacticas/preparacion-habilidades.ts`: operaciones tácticas, pasivas, preparación y reloj.
- `src/lib/expediciones/combate/cooldowns-habilidades.ts`: normalización, decremento y establecimiento de cooldowns. Los servicios importan directamente desde este módulo; no se mantienen reexportaciones puente.
- `src/lib/expediciones/combate/recursos-combate.ts`: regeneración numérica compartida.
- `src/lib/expediciones/combate/objetivos-combate.ts` e `src/lib/expediciones/combate/iniciativa-combate.ts`: selección de objetivos y orden de turnos.

## Invariantes al reorganizar

No cambiar las fórmulas ni el balance, el orden de turnos, el momento de aplicar el daño, los recursos, la selección de objetivos, el estado persistido, los cooldowns, los reportes o la entrega de recompensas. Mantener las transacciones y las comprobaciones de versión; no introducir reexportaciones de transición. Proteger cada movimiento con pruebas, `npm run test:progression`, `npm run test:party`, lint y build antes de darlo por validado.

Véanse `docs/mapa-codigo.md` y `docs/auditoria-src-lib.md` para el índice general.
