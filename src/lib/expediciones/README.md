# Reglas y mecánicas de expediciones

Esta carpeta contiene **reglas y transformaciones reutilizables** de combate, encuentros, asedios y viajes. No debe recibir nuevas consultas Prisma ni operaciones de persistencia.

- `combate.ts`: API pública del combate y resolución de habilidades; mantiene las exportaciones históricas de ataques básicos.
- `ataques-basicos.ts`: tiradas, precisión, daño mitigado y resolución de ataques básicos de héroes y enemigos.
- `mecanicas-habilidades.ts`, `estados-combate.ts`, `objetivos-combate.ts`, `iniciativa-combate.ts`: reglas tácticas y estados.
- `normal.ts`, `elite.ts`, `enemigos-combate.ts`, `generador-misiones.ts`, `dificultad.ts`, `tiempos.ts`: encuentros y expediciones.
- `asedio.ts`, `turno-pvp.ts`: reglas puras de asedio y turnos.
- `ataque-basico-arma.ts`: regla para elegir entre ataque físico y mágico según el subtipo del arma, sin metadatos visuales.
- `presentacion-combate.ts`: selección de proyectiles para ataques básicos y habilidades sin presentación explícita. No calcula daño ni aplica efectos.
- `destinos-animacion-combate.ts`, `descripciones-efectos.ts`: metadatos visuales y descripciones compartidas. No confundir con la representación React.

La presentación (`presentacion-combate.ts`), la selección física/mágica por subtipo (`ataque-basico-arma.ts`) y la resolución real de los ataques (`ataques-basicos.ts`) son responsabilidades distintas. `combate.ts` reexporta las funciones de ataque existentes para que los servicios PvE, PvP y party sigan funcionando sin cambios.

Las **operaciones con Prisma** viven en `src/server/services/`:

- `combate/actualizar-combate-versionado.ts`: actualización de combate protegida contra concurrencia.
- `asedios/procesar-llegada-asedio.ts`: preparar y persistir el asedio al llegar.
- `asedios/procesar-turno-asedio.ts`: persistir el turno automático.

Los estilos de sombra pertenecen a `src/components/combate/estilo-sombra-combate.ts`. La auditoría completa está en [`docs/auditoria-src-lib.md`](../../../docs/auditoria-src-lib.md). Los catálogos editables están en `src/lib/catalogos/`.
