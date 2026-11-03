# Servicios de combate individual y PvP

Este directorio orquesta **sesión, permisos, recursos, transacciones y persistencia**. Las fórmulas y mecánicas puras viven en `src/lib/expediciones/`, no aquí. Los combates de compañía se orquestan en `src/server/services/party/` y comparten las mismas reglas de `src/lib/`.

## Dónde encontrar cada responsabilidad

- `index.ts`: exportaciones públicas de los servicios de combate.
- `dispatcher.ts`: entrada de **compatibilidad**. Prepara una acción y la dirige a PvE o PvP según el contexto del combate; no eliminar mientras haya clientes antiguos.
- `accion-combate.ts`: preparación/autorización de acciones, obtención de personaje y combate, cobro de habilidades, regeneración de recursos y utilidades de compatibilidad. Sus operaciones con Prisma deben permanecer en servidor.
- `pve.ts`: ejecución y persistencia de turnos PvE, enemigos y recompensas.
- `pvp.ts`: ejecución y persistencia de turnos PvP/asedios; conserva sus reglas de quién actúa y el estado del defensor.
- `contexto-tactico.ts`: convierte personaje, equipo, habilidades equipadas e instantáneas del combate al `ContextoTecnicaTactica` que necesita el motor. Se consume desde PvE, PvP y party.
- `actualizar-combate-versionado.ts`: actualización protegida frente a concurrencia (`COMBATE_MODIFICADO`).
- `efectos-visualizacion.ts`: añade metadatos de pulsos de estados al resultado animado, sin decidir daño o curación.

## Reglas compartidas que **no deben duplicarse** aquí

- `src/lib/expediciones/combate.ts`: fachada de las resoluciones del combate; ataques básicos en `ataques-basicos.ts`.
- `src/lib/expediciones/mecanicas-habilidades.ts` y `preparacion-habilidades.ts`: operaciones tácticas, pasivas, preparación y reloj.
- `src/lib/expediciones/cooldowns-habilidades.ts`: normalización, decremento y establecimiento de cooldowns. `accion-combate.ts` reexporta `obtenerCooldowns` y `reducirCooldowns` para los consumidores existentes.
- `src/lib/expediciones/recursos-combate.ts`: regeneración numérica compartida.
- `src/lib/expediciones/objetivos-combate.ts` e `iniciativa-combate.ts`: selección de objetivos y orden de turnos.

## Invariantes al reorganizar

No cambiar las fórmulas ni el balance, el orden de turnos, el momento de aplicar el daño, los recursos, la selección de objetivos, el estado persistido, los cooldowns, los reportes o la entrega de recompensas. Mantener las transacciones, las comprobaciones de versión y las reexportaciones de compatibilidad. Proteger cada movimiento con pruebas, `npm run test:progression`, `npm run test:party`, lint y build antes de darlo por validado.

Véanse `docs/mapa-codigo.md` y `docs/auditoria-src-lib.md` para el índice general.
