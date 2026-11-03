# Auditoría de `src/lib/` — reorganización-1

Esta revisión es **estructural**: su objetivo es reducir duplicaciones, distinguir reglas de operaciones con base de datos y localizar responsabilidades. **No se eliminan funciones por parecer antiguas**, ni se cambian las mecánicas del juego.

## Avance aproximado de la reorganización (3 de noviembre de 2026)

El avance es **orientativo: ~65% (±10 puntos)**; mide objetivos del plan y no volumen de cambios, número de commits ni líneas. La aprobación de una CI no significa por sí sola que la auditoría global esté terminada.

| Fase | Peso orientativo | Avance estimado | Evidencia / pendiente |
| --- | ---: | ---: | --- |
| Simplificar herramientas y publicación de sprites | 20% | 80% | Flujo y rutas más claros; quedan comprobaciones de recursos y el validador HD independiente |
| Unificar catálogos (clases, habilidades, objetos, enemigos) | 20% | 90% | Fuentes editables en `catalogos/`; revisar consumidores de fachadas heredadas |
| Organizar funcionalidades, componentes y servicios | 40% | 60% | Dominios y servicios localizados; auditar los orquestadores grandes sin dividirlos arbitrariamente |
| Identificar y retirar obsoletos con evidencia | 20% | 35% | Auditoría iniciada; comprobar importaciones, runtime y regresiones antes de borrar |
| **Total ponderado estimado** | **100%** | **65%** | **No equivale a calidad o funcionalidad medida automáticamente** |

**Criterios de cierre:** rutas del código fáciles de localizar, fuentes editables únicas, interfaces y reglas de cada servicio claras, importadores actualizados, código obsoleto confirmado y retirado con pruebas, CI de regresión verde. El validador HD separado debe analizarse sin confundirlo con fallos de combate.

## Inventario revisado

La rama contenía 86 archivos bajo `src/lib/` al comenzar esta etapa, incluidos tres generados. Las concentraciones principales eran `expediciones/` (33), `progresion/` (16), `equipamiento/` (6), `party/` (6), `catalogos/` (5) y `base/` (5).

| Área | Dónde debe estar | Estado |
| --- | --- | --- |
| Clases, habilidades, objetos y enemigos editables | `src/lib/catalogos/` | Conservar la fuente única |
| Fórmulas y reglas de combate, progreso, economía y equipo | `src/lib/` por dominio | Conservar; no duplicar en React |
| Operaciones Prisma, transacciones y concurrencia | `src/server/services/` | Separación de responsabilidades aplicada a los casos siguientes |
| Componentes y detalles visuales | `src/components/` | Separación aplicada a sombras y pantallas de objetos |
| Artefactos `src/lib/generated/` | Producción automática | **No editar ni borrar manualmente** |

## Cambios de ubicación comprobables

- `src/lib/expediciones/sombra-combate.ts` → `src/components/combate/estilo-sombra-combate.ts`. Únicamente genera un objeto CSS de transformación de sprites. Actualizadas las importaciones de tres componentes y la prueba geométrica.
- `src/lib/expediciones/actualizar-combate-versionado.ts` → `src/server/services/combate/actualizar-combate-versionado.ts`. Usa una transacción Prisma con escritura versionada, por lo que pertenece a los servicios de servidor. Se conservan `COMBATE_MODIFICADO` y el contrato de actualización.
- `src/lib/expediciones/procesarLlegadaAsedio.ts` → `src/server/services/asedios/procesar-llegada-asedio.ts`. Consulta y actualiza expediciones y combates mediante Prisma; importadores actualizados en la llegada de expediciones y el endpoint de asedios.
- `src/lib/expediciones/procesarTurnoAsedio.ts` → `src/server/services/asedios/procesar-turno-asedio.ts`. Consulta y persiste turnos. Las importaciones relativas de `turno-pvp` y `estados-combate` apuntan ahora explícitamente a las reglas de `src/lib/expediciones/`.

Las rutas externas y las reglas de juego no cambian. Los movimientos solo se darán por validados tras pasar las regresiones de GitHub Actions.

## Candidatos que **no** deben borrarse sin comprobar consumidores

- `src/lib/configuracionJuego.ts` actúa como **fachada de compatibilidad**. Redirige exports de edificios, progresión y sprites; su aspecto antiguo no implica que sea código muerto.
- `src/lib/habilidades.ts` construye el registro que consumen las APIs y los combates. `progresion/generar-habilidades.ts`, `catalogo-redisenado.ts` y `tecnicas-adicionales.ts` son transformaciones del catálogo, no catálogos editables alternativos.
- `src/lib/enemigos.ts` adapta los datos del catálogo de enemigos para dificultad, botín y selección; no sustituirlo por el JSON generado de sprites.
- `src/lib/expediciones/presentacion-combate.ts` solo resuelve metadatos visuales: básicos y proyectiles de habilidades. `ataque-basico-arma.ts` decide la selección física/mágica del arma y `ataques-basicos.ts` contiene la resolución numérica, precisión y críticos. `combate.ts` conserva sus exportaciones previas. Las pruebas de `tests/combat-presentacion.test.cjs` protegen presentación, daño y API histórica.
- `src/lib/expediciones/destinos-animacion-combate.ts` traduce metadatos de acciones para PvE, party y PvP. Que produzca datos visuales no significa que pueda moverse directamente a React: hay consumidores de servicios.
- `src/lib/expediciones/preparacion-habilidades.ts` reúne el reloj y la preparación de acciones; `mecanicas-habilidades.ts` aplica operaciones y pasivas. `motor-tactico.ts` conserva intactas sus funciones; sus contratos se editarán en `tipos-tacticos.ts` y se reexportan para mantener compatibles a adaptadores y técnicas adicionales. Las pruebas cubren preparación de área, caducidad y reserva de efectos.
- `src/lib/expediciones/adaptador-tactico.ts` es la frontera con los efectos persistidos, no un segundo motor: convierte los estados tácticos, los DoT/HoT históricos y los límites de ciclo. El código ahora explicita cada transformación sin cambiar las estructuras. `tests/adaptador-tactico.test.cjs` caracteriza la ida/vuelta y el contrato de una técnica adicional; `progresion/tecnicas-adicionales.ts` y las mecánicas importan contratos directamente de `tipos-tacticos.ts` (sin dependencia de tipos a través del motor).
- `src/lib/progresion/diseno-habilidades.ts` define contratos tácticos, mientras `src/lib/catalogos/habilidades.ts` contiene sus datos. No confundir una declaración de tipo con duplicación de contenido.

### Frontera transaccional de las expediciones individuales

- En `llegar-expedicion.ts` la transición `en_viaje` → `combatiendo` usa `updateMany` con fase y fecha esperadas dentro de la misma transacción que crea el combate; se preserva la respuesta de un combate existente. La relación de combate ya tiene restricción única por expedición.
- En `completar-expedicion.ts` el comercio reclama `en_viaje` → `regresando` antes de modificar al personaje; una solicitud desactualizada obtiene conflicto 409. No se alteran recompensa, afinidad, tiempo de viaje ni el orden transaccional de la recepción final.
- `tests/expedition-lifecycle.test.cjs` prueba ambas carreras simuladas con la lógica real del servicio y dobles de Prisma, sin dependencia de base de datos; está incorporado a `test:progression`.
- Siguiente revisión: casos de errores de transacción, límites de inventario y efectos de los servicios de economía. No asumir que las pruebas con dobles sustituyen una prueba de integración PostgreSQL.

### Premios de regreso e inventario

- `src/lib/expediciones/recompensas-regreso.ts` concentra reglas puras: lectura de premios enteros de la vuelta, oro completo y límites independientes por madera, piedra y metal. La transacción, tirada de botín e informes siguen en `completar-expedicion.ts`. El lector de combate conserva decimales y **no** se ha fusionado con el de regreso.
- `src/lib/equipamiento/inventario.ts` expone `hayHuecoInventario` para la comprobación común en regreso individual y en la party; el límite habitual sigue siendo 30 objetos. La gestión de stacks e instancias sigue separada según su comportamiento.
- `tests/expedition-lifecycle.test.cjs` prueba las recompensas, capacidad de almacén y las transiciones. `tests/objetos-system.test.cjs` protege el límite del inventario.
- La recepción final sigue borrando la expedición en una transacción serializable, por lo que los cambios de reparto se deben comprobar contra una PostgreSQL real antes de una modificación adicional. Las pruebas con dobles no bastan para certificar carreras de base de datos.

### Mercado y construcción de edificios

- `src/lib/economia/mercado.ts` conserva precios de compra, venta del 25 % (sin descuento) y las dos fórmulas diferentes de venta/recompra de objetos. `validarSolicitudMercado` elimina la duplicación del JSON, recurso y cantidad en las rutas de compra y venta. Las operaciones `updateMany` condicionadas permanecen en cada ruta para evitar gastos o ventas simultáneas sobre saldos obsoletos.
- `src/lib/base/edificios.ts` conserva el catálogo único, la fórmula de costes y `prepararMejoraEdificio`, que reúne las comprobaciones de nivel máximo, prerrequisitos y saldo. `src/app/api/jugador/acciones/route.ts` sigue aplicando el descuento y la mejora del JSON de edificios dentro de su transacción serializable.
- `tests/economy-balance.test.cjs` comprueba contratos puros y los costes auténticos de construcción; `tests/base-economic-routes.test.cjs` mantiene la protección de las rutas con dobles de Prisma. Los errores HTTP y el orden de comprobaciones no cambian.
- No mezclar esta lógica de construcción con los descuentos del Mercado, los costes de forja o las bonificaciones de murallas solo por usar oro y materiales.

### Consolidación de operaciones de objetos (Armería, Botica y Herrería)

- `src/lib/equipamiento/ranuras.ts` declara las **diez ranuras persistidas** y `estaInstanciaEquipadaPersistida`. Venta y mejora usan la misma regla; la Herrería vuelve a comprobar dentro de su transacción que la instancia sigue equipada.
- `src/lib/equipamiento/inventario.ts` contiene `hayHuecoInventario`, usado por **compra, recompra, expediciones y party**. No se cambia el límite de 30 instancias ni se convierten las compras en stacks.
- `src/lib/equipamiento/ultima-venta.ts` contiene `crearUltimaVenta` y `leerUltimaVenta`, con el mismo recibo, sufijos, mejoras, bonificaciones y precios del 35 %/70 %. La venta lo persiste en `inventario.ultimaVenta`; la recompra relee el recibo dentro de una transacción serializable, restaura la instancia original y borra el recibo.
- Las rutas `src/app/api/objetos/{comprar,vender,recomprar,mejorar}/route.ts` mantienen por separado sus controles de permisos, respuestas HTTP y cobros. En especial, los drops con sufijo, las copias compradas y los consumibles de Botica **no** se fusionan con el apilamiento de party.
- Regresiones: `tests/objetos-system.test.cjs` prueba el ciclo de venta/recompra, carreras concurrentes y recibos; `tests/ranuras-equipamiento.test.cjs` protege las diez ranuras; `tests/base-economic-routes.test.cjs` comprueba compras, límites y mejora de forja.

### Auditoría de duplicados y fachadas públicas

- **Duplicado confirmado y eliminado:** `ObjetoEnVenta` estaba declarado dos veces en `src/lib/equipamiento/tienda.ts` y `datos-objetos.ts`. Ahora solo se define en `datos-objetos.ts`; `tienda.ts` mantiene un reexport de tipos para no romper importadores. `inventario.ts` conserva sus funciones, pero sus importaciones han quedado reunidas en la cabecera.
- **Importadores migrados sin cambiar cálculos:** `src/store/useGameStore.ts` usa `src/lib/base/edificios.ts` para el catálogo y los costes; `src/app/api/jugador/acciones/route.ts` usa `src/lib/base/mejoras.ts` para atributos. Su doble de pruebas se ha actualizado para interceptar el módulo real. La fachada `configuracionJuego.ts` sigue reexportando el contrato anterior.
- **Compatibilidad comprobable:** `tests/economy-balance.test.cjs` valida que los exports de costes y mejoras de `configuracionJuego.ts` son las mismas funciones y valores que sus módulos de origen. No hay una segunda fuente de reglas.
- **Legibilidad sin cambios de comportamiento:** `src/lib/expediciones/presupuesto-curacion.ts` deja de estar comprimido; `tests/habilidades-v2.test.cjs` caracteriza curación con miembros sanos, sobrecurados, heridos y grupos vacíos.
- **No eliminar módulos completos sin prueba de consumidores:** `habilidades.ts` es el registro ejecutable, `enemigos.ts` resuelve loot y dificultad, `progresion/crear-habilidad.ts` normaliza definiciones y `presupuesto-curacion.ts` lo usa combate de party. Los archivos pequeños no son necesariamente obsoletos; la auditoría continúa.

### Progresión y encuentros: reducción de superficie pública y legibilidad

- `src/lib/progresion/generar-habilidades.ts`: las cinco habilidades generadas por escuela (ataque, táctica, pasiva, avanzada, maestría) se leen ahora por bloques. No se ha creado otro catálogo; los costes y técnicas siguen viniendo de `catalogos/habilidades.ts`. `tests/habilidades-v2.test.cjs` comprueba orden, coste y animación de cada escuela.
- `src/lib/progresion/catalogo-redisenado.ts`: separa visiblemente transformación de pasivas, adaptación de técnicas activas, limpieza de campos anteriores y excepciones históricas. También se han expandido las tablas de textos y las operaciones tácticas. Hay pruebas nuevas para excepciones y descripciones de preparaciones y estados.
- `src/lib/habilidades.ts`: se han retirado `obtenerHabilidadesActivas` y `obtenerHabilidadesPasivas`, dos filtros públicos sin consumidores localizados en la búsqueda del repositorio. Se mantienen `HABILIDADES_BASE` (usado por herramientas de iconos), `HABILIDADES`, `obtenerHabilidadPorId` y `obtenerHabilidadesDisponiblesParaClase`. Los nombres eliminados no forman parte de los contratos HTTP.
- `src/lib/expediciones/normal.ts`: los valores `MULTIPLICADOR_PESO_DIF_MIN` y `PESOS_RAREZA_ENEMIGOS` son ahora constantes privadas, porque no se localizaron importadores. El selector y las pruebas siguen usando sus valores mediante `calcularPesoDifMinEnemigo` y `calcularPesoRarezaEnemigo`; no se altera la probabilidad de Mímico ni la composición de enemigos.
- Se conservan las reglas activas que a primera vista podrían parecer obsoletas, como `crear-habilidad.ts` (el catálogo la utiliza), `presupuesto-curacion.ts` (el combate de party la usa), `configuracionJuego.ts` (fachada de compatibilidad), `enemigos.ts` (adaptación de botín y sprite), y `generar-habilidades.ts` (construcción de las definiciones).
- Los tests unitarios/CI deben pasar antes de considerar esta auditoría cerrada. La búsqueda de referencias permite descartar candidatos; una futura limpieza completa debe revisar también importaciones dinámicas y herramientas fuera de `src/`.

### Auditoría de expediciones: reglas activas y código visual desplazado

- Se ha comprobado que `consumibles-combate.ts` y `recursos-combate.ts` tienen consumidores activos en combate individual, party y componentes. **No** son candidatos obsoletos. Su implementación se ha reformateado y documentado sin alterar el cálculo de porcentajes, topes, redondeo ni el resto fraccionario de maná.
- Las pruebas `tests/correcciones-combate.test.cjs` cubren efectos restauradores inválidos (negativos, NaN, infinitos), restauraciones sin hueco, redondeo, acumulación de maná en cuartos y máximos de regeneración.
- **Ubicación corregida sin fachada:** `escala-combate.ts` solo controla el tamaño y posicionamiento de sprites. Se ha movido de `src/lib/expediciones/` a `src/lib/sprites/`, actualizando `CombateModal.tsx` y `tests/combat-scale.test.cjs`; se eliminó el archivo anterior. No se cambiaron fórmulas de escala ni datos persistidos.
- **Cobertura añadida a CI:** `tests/combat-scale.test.cjs`, antes solo en `test:combat-ui`, forma parte también de `test:progression`. Protege encaje, alturas y límites en tamaños de móvil y escritorio.
- Se conservan el resolver de ataques, los adaptadores tácticos, la selección de proyectiles, los consumibles, la regeneración y las fachadas con consumidores identificados. Las limpiezas siguientes deben partir de una búsqueda exhaustiva de importaciones reales, no del tamaño del archivo.

### Inventario real de sprites y simplificación del pipeline

- Los atlas **que se usan en el navegador** están publicados en `public/sprites/`; los índices que los declaran están en `src/lib/generated/`. `assets/spritesheets/` contiene las fuentes de trabajo y QA, no las imágenes que solicita la UI. La carpeta de fuentes **sigue existiendo** y no debe confundirse con una segunda ruta de runtime.
- La inspección de la rama detectó 6 clases HD publicadas (11 variantes de atlas), 54 enemigos HD y 28 piezas de equipo en el catálogo. Berserker dispone de atlas masculino pero aún no de atlas femenino ni de retratos HD. Las demás clases utilizan el fallback configurado.
- Se retiraron los **105 archivos** de `assets/spritesheets/tier1/` (filas y anclajes históricos sin referencias detectadas), conservando las fuentes HD activas y su procedencia. El historial Git permite recuperar los históricos si fueran necesarios.
- `python scripts/recursos.py resumen` permite comprobar publicaciones y variantes incompletas sin navegar por `assets/`. El validador HD ahora compara **conjuntos de variantes** en vez de exigir el orden `m,f` en el JSON; sigue rechazando ausencias y duplicados. Esto resuelve el error de orden observado en Novato sin tocar las imágenes.
- Para eliminar por completo `assets/spritesheets/` sería necesaria una migración verificada de más de 22.000 archivos de origen y de todos los publicadores, validadores y hashes. Borrarla o moverla masivamente ahora rompería la capacidad de reconstrucción.

## Estado y siguiente orden de trabajo

1. El bloque de auditoría de fachadas y habilidades (`7c58566`) superó la regresión. Los cambios de consumibles, regeneración y escala visual requieren la nueva CI de regresión. El validador HD de sprites sigue siendo independiente.
2. `src/server/services/combate/` tiene mapa por funciones; la normalización y el decremento de cooldowns están en `src/lib/expediciones/cooldowns-habilidades.ts` con reexportaciones compatibles. El cobro de recursos conserva las ramas v2 y legacy y la escritura optimista.
3. Continuar con archivos de expediciones y progresión por función, incluyendo pruebas del comportamiento antes de mover reglas complejas. Buscar candidatos sin consumidores y retirar únicamente API interna demostrablemente sin uso; conservar las fachadas y los contratos funcionales. No dividir servicios ni fusionar PvE/party arbitrariamente.
4. Auditar las dependencias reales y fachadas heredadas; eliminar recursos y código sólo tras comprobar uso en runtime y pruebas. No reunir las dos fórmulas de murallas sin revisar sus consumidores. Mantener commits pequeños, `main` intacta y las regresiones en verde antes de considerar finalizado un bloque.
