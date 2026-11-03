# Reglas y mecánicas de expediciones

Esta carpeta contiene **reglas y transformaciones reutilizables** de combate, encuentros, asedios y viajes. Los cálculos auxiliares de restauración, regeneración y reparto de curas están agrupados en `combate/`; las reglas de duración y liquidación de regreso viven en `viajes/`, evitando mezclar consumibles con la selección de destinos. No debe recibir nuevas consultas Prisma ni operaciones de persistencia.

- `combate.ts`: API pública del combate y resolución de habilidades; mantiene las exportaciones históricas de ataques básicos.
- `combate/ataques-basicos.ts`: tiradas, precisión, daño mitigado y resolución de ataques básicos de héroes y enemigos.
- `combate/tacticas/preparacion-habilidades.ts`: actualiza el reloj de contexto y prepara una copia local de la habilidad para el número de objetivos; sin modificar el catálogo.
- `combate/tacticas/mecanicas-habilidades.ts`: aplica el resultado básico en este orden: efectos y unidades, operaciones (incluidas disipaciones), ventajas pasivas, historial y resultado final. Conserva las exportaciones anteriores de preparación.
- `combate/tacticas/adaptador-tactico.ts`: traduce efectos persistidos (incluidos DoT/HoT anteriores) a estados tácticos y de vuelta; adapta la ejecución de técnicas adicionales. No accede a Prisma.
- `combate/tacticas/tipos-tacticos.ts`: contratos de estado, unidad, mundo y comando. `combate/tacticas/motor-tactico.ts` los sigue reexportando.
- `combate/tacticas/motor-tactico.ts`: motor puro de comandos, estados, pulsos, recursos y ciclos.
- `combate/estados-combate.ts`, `combate/objetivos-combate.ts`, `combate/iniciativa-combate.ts`, `combate/posicion-combate.ts`, `combate/formacion-party.ts`: estado, objetivos, iniciativa, posiciones tácticas y formación de party.
- `combate/contrato-accion-combate.ts`: valida acciones, identificadores de habilidad/objeto, objetivos y turnos sin dependencias de servidor. El servicio convierte los errores en respuestas HTTP.
- `combate/cooldowns-habilidades.ts`: carga/normalización de cooldowns persistidos, decremento por turno y establecimiento de tiempos de espera (incluidas las dos respiraciones). Los servicios conservan reexportaciones para importadores antiguos.
- `viajes/recompensas-regreso.ts`: normaliza los premios enteros recibidos al finalizar y calcula los recursos aceptados/perdidos por el límite de almacén; el oro no está limitado. No toca Prisma.
- `combate/presupuesto-curacion.ts`: asigna el peso proporcional de curación solo a miembros con vida faltante. Lo usa el servicio de combate de party; los objetivos sanos no consumen reserva.
- `combate/consumibles-combate.ts`: distingue pociones restauradoras y calcula la cantidad fija más porcentaje sobre el máximo del destinatario, respetando su vida/energía/maná faltante.
- `combate/recursos-combate.ts`: regeneración de energía y maná por turno con topes y resto fraccionario persistente, compartida por PvE y party.
- `encuentros/normal.ts`, `encuentros/elite.ts`, `combate/enemigos-combate.ts`, `encuentros/generador-misiones.ts`, `encuentros/dificultad.ts`, `viajes/tiempos.ts`: encuentros y expediciones.
  - Los pesos de dificultad mínima y rareza de `encuentros/normal.ts` son detalles privados del selector; las funciones de ponderación, composición y probabilidad del Mímico siguen públicas para sus consumidores y pruebas.
  - `viajes/tiempos.ts`: encuentro a mitad de viaje, vuelta programada del combate, mínimo de regreso comercial y multiplicadores de clima; reglas puras compartidas por los servicios.
- `asedios/asedio.ts`, `asedios/turno-pvp.ts`: reglas puras de asedio y turnos.
- `combate/ataque-basico-arma.ts`: regla para elegir entre ataque físico y mágico según el subtipo del arma, sin metadatos visuales.
- `presentacion/presentacion-combate.ts`: selección de proyectiles para ataques básicos y habilidades sin presentación explícita. No calcula daño ni aplica efectos.
- `presentacion/destinos-animacion-combate.ts`, `presentacion/descripciones-efectos.ts`: metadatos visuales y descripciones compartidas. No confundir con la representación React.

Los contratos de `combate/tacticas/tipos-tacticos.ts` se importan directamente desde adaptadores y catálogos, mientras `combate/tacticas/motor-tactico.ts` conserva sus reexportaciones públicas. No unificar por similitud las funciones que crean unidades en `combate/tacticas/adaptador-tactico.ts` y `combate/tacticas/mecanicas-habilidades.ts`: la primera carga estados persistidos para una técnica adicional y la segunda reconstruye unidades después de la resolución básica; sus reglas de HP, recursos y límites no son equivalentes. Las pruebas de esta frontera están en `tests/adaptador-tactico.test.cjs`.

La presentación (`presentacion/presentacion-combate.ts`), la selección física/mágica por subtipo (`combate/ataque-basico-arma.ts`) y la resolución real de los ataques (`combate/ataques-basicos.ts`) son responsabilidades distintas. `combate.ts` reexporta las funciones de ataque existentes para que los servicios PvE, PvP y party sigan funcionando sin cambios.

Las **operaciones con Prisma** viven en `src/server/services/`:

- `combate/actualizar-combate-versionado.ts`: actualización de combate protegida contra concurrencia.
- `asedios/procesar-llegada-asedio.ts`: preparar y persistir el asedio al llegar.
- `asedios/procesar-turno-asedio.ts`: persistir el turno automático.

El encaje visual y la escala de los sprites de combate pertenecen a `src/lib/sprites/escala-combate.ts` (no al motor de expediciones); el archivo antiguo `src/lib/expediciones/escala-combate.ts` se retiró al actualizar sus dos consumidores.

Los estilos de sombra pertenecen a `src/components/combate/estilo-sombra-combate.ts`. La auditoría completa está en [`docs/auditoria-src-lib.md`](../../../docs/auditoria-src-lib.md). Los catálogos editables están en `src/lib/catalogos/`.
