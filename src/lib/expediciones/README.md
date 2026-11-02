# Reglas y mecánicas de expediciones

Esta carpeta contiene **reglas y transformaciones reutilizables** de combate, encuentros, asedios y viajes. No debe recibir nuevas consultas Prisma ni operaciones de persistencia.

- `combate.ts`, `mecanicas-habilidades.ts`, `estados-combate.ts`, `objetivos-combate.ts`, `iniciativa-combate.ts`: reglas de la batalla.
- `normal.ts`, `elite.ts`, `enemigos-combate.ts`, `generador-misiones.ts`, `dificultad.ts`, `tiempos.ts`: encuentros y expediciones.
- `asedio.ts`, `turno-pvp.ts`: reglas puras de asedio y turnos.
- `presentacion-combate.ts`, `destinos-animacion-combate.ts`, `descripciones-efectos.ts`: metadatos visuales y descripciones compartidas. No confundir con la representación React.

Las **operaciones con Prisma** viven en `src/server/services/`:

- `combate/actualizar-combate-versionado.ts`: actualización de combate protegida contra concurrencia.
- `asedios/procesar-llegada-asedio.ts`: preparar y persistir el asedio al llegar.
- `asedios/procesar-turno-asedio.ts`: persistir el turno automático.

Los estilos de sombra pertenecen a `src/components/combate/estilo-sombra-combate.ts`. La auditoría completa está en [`docs/auditoria-src-lib.md`](../../../docs/auditoria-src-lib.md). Los catálogos editables están en `src/lib/catalogos/`.
