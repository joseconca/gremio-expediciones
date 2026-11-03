# Reorganización 1 — mapa de módulos y estado verificable

Rama `reorganizacion-1` creada desde `main` (`84fd4db`). **No fusionar hasta pasar tests, lint, build y prueba visual.** El objetivo es reducir archivos que el desarrollador necesita conocer, sin cambiar las reglas del juego.

## Fase 1 — Sprites HD y recursos

**Punto de entrada recomendado:** `python scripts/recursos.py` (Python 3 + Pillow). Los scripts existentes son motores especializados internos; no se han borrado porque los usa CI y conservan políticas de manos, hashes y procedencia.

```bash
# Vista global: atlas publicados por clase, enemigos y equipo.
python scripts/recursos.py resumen

# Héroes: consultar, actualizar una animación, validar o publicar.
python scripts/recursos.py heroe estado --clase berserker --sexo m
python scripts/recursos.py heroe actualizar --clase berserker --sexo m --accion idle --tira idle.png
python scripts/recursos.py heroe validar --clase berserker --sexo m
python scripts/recursos.py heroe publicar --clase berserker --sexo m --aprobado

# Enemigos: consulta y publicación INDIVIDUAL sin reconstruir los otros 53.
python scripts/recursos.py enemigo estado --id slime_acido
python scripts/recursos.py enemigo validar --id slime_acido
python scripts/recursos.py enemigo publicar --id slime_acido --aprobado

# Equipo superpuesto: consulta por pieza; validación y promoción GLOBALES
# porque los agarres y trayectorias se comparten entre clases.
python scripts/recursos.py equipo estado --id espada_hierro
python scripts/recursos.py equipo validar
python scripts/recursos.py equipo publicar --aprobado
```

Para añadir/actualizar fuentes de enemigos o equipo, usar `actualizar --metadata archivo.json`: delega en los registradores existentes, que requieren procedencia y revisión. **No confundir actualización técnica con aprobación artística.** El comando de héroes acepta tiras PNG RGBA de 512×256 o cuatro `01.png`–`04.png` de 128×256 con `--fotogramas carpeta`; comprueba diferencia entre fotogramas y reconstruye la hoja de 60 fotogramas. No genera arte nuevo ni hace commits automáticamente.

### Disponibilidad real de Berserker

Hay atlas masculino publicado de Berserker, pero no retrato HD masculino ni atlas/retrato femenino publicados. El catálogo runtime `src/lib/generated/sprites-hd.json` ahora distingue `availableSexes` (atlas) y `availablePortraits` (retratos). La UI utiliza el atlas masculino donde existe y recurre a su ancestro legacy para lo que aún falta; evita rutas HD inexistentes. La publicación individual y la global recalculan esos campos.

El publicador global de equipo ya no borra del catálogo las clases publicadas fuera del manifiesto de equipo. **Limitación actual:** la publicación de equipo permanece global, costosa y ligada a todos los agarres; no está implementado todavía un publicador individual verificable de equipo. El publicador individual de enemigos compara los 16 fotogramas y SHA del QA, exige confirmación y conserva las otras entradas del registro.

El directorio histórico `assets/spritesheets/tier1/` se ha eliminado después de comprobar que no había consumidores de sus rutas. Los archivos permanecen recuperables en Git. Las fuentes HD **no** se han eliminado: el pipeline necesita fotogramas, QA y manifiestos para validar y regenerar las publicaciones. El runtime únicamente accede a `public/sprites/` y a los índices generados.

### Ubicaciones a conocer

| Qué | Ruta |
|---|---|
| Comando común | `scripts/recursos.py` |
| Operaciones de héroes | `scripts/sprites.py` |
| Fuentes de héroes | `assets/spritesheets/hd-128x256/<clase>/<sexo>/frames/<accion>/` |
| Fuentes de equipo compartido | `assets/spritesheets/hd-128x256/equipment/` |
| Fuentes de enemigos | `assets/spritesheets/enemies-hd/<enemigo>/` |
| Publicación HD | `public/sprites/hd-v1/`, `public/sprites/enemies-hd-v1/` |
| Registros de runtime | `src/lib/generated/sprites-hd.json` y `enemies-hd.json` |
| Lectura en juego | `src/lib/sprites/heroes.ts`, `src/lib/sprites/enemigos.ts` y `src/lib/sprites/dibujar-heroe.ts` |

## Fase 2 — Clases y habilidades

### Registros públicos (únicos)

- `src/lib/progresion/clases.ts`: tipos, arquetipos, herencia, dominios, desbloqueos y API `CLASES`.
- `src/lib/habilidades.ts`: API `HABILIDADES` y búsquedas, compuesta en el mismo orden anterior.

### Catálogos editables reunidos en una carpeta

- `src/lib/catalogos/clases.ts`: **todas las definiciones de clases** (base y avanzadas), con requisitos, maestrías y bonificaciones.
- `src/lib/catalogos/habilidades.ts`: **todos los datos editables de habilidades**: escuelas, habilidades troncales, evoluciones, Super Novato, diseños V2, nombres y técnicas adicionales.

Los cuatro catálogos canónicos están ahora juntos en `src/lib/catalogos/`: clases, habilidades, objetos y enemigos. No existen otros catálogos editables de estos dominios. Los demás módulos son motores, APIs o **adaptadores temporales sin definiciones copiadas**:

- `src/lib/progresion/clases.ts`: herencia, desbloqueos y API pública `CLASES`.
- `src/lib/habilidades.ts`: construcción de la API `HABILIDADES`, conservando orden e identificadores.
- `src/lib/habilidades-nuevas.ts`: generador de habilidades estándar desde el catálogo único.
- `src/lib/progresion/catalogo-redisenado.ts` y `src/lib/progresion/tecnicas-adicionales.ts`: transformaciones y ejecución de reglas.
- Las rutas legacy de clases, habilidades originales, nombres, Super Novato y técnicas adicionales se han retirado tras actualizar consumidores y pruebas. `progresion/diseno-habilidades.ts` permanece como módulo de tipos, y `progresion/crear-habilidad.ts` contiene únicamente un constructor con defaults.

**Modificar clases o habilidades:** editar exclusivamente uno de los dos catálogos canónicos. Las habilidades V2 actuales se generan desde datos declarativos, no se deben copiar en otros ficheros.

### Catálogos adicionales separados de sus reglas

- `src/lib/catalogos/objetos.ts`: **definiciones de los 62 objetos**. `src/lib/objetos.ts` conserva la API pública de consulta, estadísticas, sprites y costes de forja.
- `src/lib/catalogos/enemigos.ts`: **42 criaturas, 12 jefes y tablas de botín**. `src/lib/enemigos.ts` conserva la API pública, los defaults de drops, la selección por amenaza y las rutas de sprites.
- `src/lib/equipamiento/sufijos.ts`: catálogo pequeño de sufijos más sus reglas; se mantiene junto por ahora para evitar una separación artificial.

Así, los datos se editan en un lugar por dominio, pero las funciones permanecen fuera del catálogo. **No se han cambiado precios, estadísticas, rarezas ni probabilidades**. Los importadores existentes siguen usando `src/lib/objetos.ts` y `src/lib/enemigos.ts`.

## Fase 2.5 — Ordenación de carpetas sin cambiar las reglas

Se han trasladado **módulos completos**. Se conservan exports, IDs, cifras, secuencias de combate y rutas públicas HTTP/Next.js. En cada traslado se han corregido imports de consumidores y rutas de tests; no se han fragmentado funciones.

| Dominio | Ubicación de las reglas y recursos |
|---|---|
| Base y edificios | `src/lib/base/{edificios,mejoras,escuela,taberna}.ts`: catálogo de edificios, construcción, mejoras, escuela y comidas |
| Equipamiento | `src/lib/equipamiento/{inventario,tienda,botin,sufijos}.ts` |
| Progresión y estadísticas | `src/lib/progresion/{descripciones-habilidades,generar-habilidades,estadisticas-personaje}.ts` y reglas de clases, experiencia, atributos y niveles |
| Economía | `src/lib/economia/mercado.ts` |
| Generación de expediciones | `src/lib/expediciones/generador-misiones.ts` |
| Render y catálogos de sprites | `src/lib/sprites/{heroes,enemigos,dibujar-heroe}.ts`; rutas y retrocompatibilidad del héroe centralizadas en `heroes.ts` |
| Catálogos editables | `src/lib/catalogos/{clases,habilidades,objetos,enemigos}.ts` |
| Rutas e interfaz de base | `src/app/base/` y `src/components/base/` (se conservan las URLs) |
| Operaciones persistentes | `src/server/services/` |

`src/lib/configuracionJuego.ts` se conserva como **fachada pública** de edificios, mejoras, estadísticas, experiencia, habilidades y sprites. Ya no contiene fórmulas propias. Las reglas de estadísticas y experiencia Base comparten módulos con la progresión Job (`progresion/estadisticas.ts` y `progresion/experiencia.ts`); el aprendizaje de habilidades está en `progresion/aprendizaje.ts`. El catálogo editable de edificios vive únicamente en `base/edificios.ts`, aunque `tiposJuego.ts` conserva sus antiguos exports para los consumidores.

### Auditoría de los archivos en la raíz de `src/lib/`

Después de estos movimientos quedan solo **ocho archivos TypeScript** en la raíz, con motivos concretos para mantenerlos:

| Archivo | Motivo de mantenerlo aquí |
|---|---|
| `configuracionJuego.ts` | Fachada temporal que conserva imports históricos durante la migración |
| `habilidades.ts`, `objetos.ts`, `enemigos.ts` | APIs públicas de consulta por dominio (catálogos editables en `catalogos/`) |
| `tiposJuego.ts` | Contratos compartidos por varios sistemas; dividirlo requiere estudiar ciclos y consumidores |
| `auth.ts`, `prisma.ts` | Infraestructura y autenticación transversal; se mantienen estables para no cambiar dependencias del servidor |
| `utils.ts` | Dos utilidades generales sin justificación para capas nuevas |

Las descripciones de habilidades, la generación de técnicas y las estadísticas agregadas del personaje ya tienen un único propietario en `progresion/`. No se han copiado reglas: se movieron los módulos enteros, actualizando sus consumidores y tests. **No crear adaptadores nuevos para rutas antiguas una vez que sus consumidores se han migrado.**

La reorganización de scripts y tests se abordará por separado: `scripts/recursos.py` y los workflows invocan rutas concretas que no deben romperse por mover carpetas. La fase siguiente será extraer funciones de archivos grandes **solo cuando estos traslados hayan pasado la regresión completa**.

## Fase 3 — Servicios

Se ha eliminado la duplicación exacta del adaptador `adjuntarPulsosEstado` entre PvE y PvP. Su propietario es ahora `src/server/services/combate/efectos-visualizacion.ts`. Los demás servicios siguen con sus rutas y firmas originales.

Objetivo siguiente: revisar rutas HTTP y extraer una fachada por funcionalidad para combate, expediciones, party, inventario, edificios y economía; migrar consumidores en grupos con pruebas de integración. **No está terminada esta fase.** No mover servicios voluminosos antes de un mapa de llamadas y pruebas de paridad.

## Auditoría de estructura general (2 de noviembre de 2026)

La separación actual tiene sentido y no requiere repartir cada pequeña función en un archivo propio:

| Capa | Fuente de verdad / responsabilidad | Criterio |
|---|---|---|
| Definiciones RPG | `src/lib/catalogos/{clases,habilidades}.ts` | Editar solo ahí; APIs públicas en `progresion/clases.ts` y `lib/habilidades.ts` |
| Objetos y enemigos | `src/lib/catalogos/{objetos,enemigos}.ts` | Datos únicos; reglas, fórmulas y búsquedas fuera |
| Reglas puras de combate | `src/lib/expediciones/` | No acceder a Prisma ni HTTP |
| Operaciones persistentes y PvE/PvP/party | `src/server/services/` | Orquestación, transacciones, validaciones; no replicar el motor táctico |
| API y pantallas | `src/app/`, `src/components/` | Mantener rutas delgadas y componentes de presentación |
| Arte y manifiestos de sprites | `assets/`, `src/lib/generated/`, `scripts/recursos.py` | La fuente artística no es el JSON generado |

## Fase 3.1 — Primeras extracciones de combate y party

Se han hecho extracciones **acotadas**, sin cambiar contratos de turnos, endpoints, estados React ni transacciones:

| Propietario | Contenido | Consumidor |
|---|---|---|
| `src/lib/expediciones/formacion-party.ts` | Carriles, orden de líder y ajuste de una pareja de aliados | `components/combate/CombateModal.tsx` |
| `src/lib/party/recompensas.ts` | Lectura defensiva de recompensa, reparto entero, RNG de botín determinista, agregación de objetos | `server/services/party/combate-party-actions.ts` |
| `src/lib/party/iniciativa.ts` | Recuperación de colas y preparación del siguiente turno de party; reutiliza la iniciativa general | `server/services/party/combate-party-actions.ts` |
| `src/lib/expediciones/enemigos-combate.ts` | Interpretación de rosters persistidos y adaptación de enemigos legacy | `server/services/party/combate-party-actions.ts` |
| `src/components/base/party/tipos.ts` | Contratos de vistas y respuestas de la compañía | `components/base/PanelParty.tsx` |
| `src/components/base/party/vista-combate.ts` | Adaptación pura del combate grupal al contrato de `CombateModal` | `components/base/PanelParty.tsx` |
| `src/components/base/party/VisitasEntrantesParty.tsx` | Visitas entrantes, confirmación de llegada y aceptar/rechazar | `components/base/PanelParty.tsx` |
| `src/components/base/party/TrasladosPropiosParty.tsx` | Traslados, cuenta atrás, mapa y regreso individual | `components/base/PanelParty.tsx` |
| `src/components/base/party/InformeProvisionalParty.tsx` | Informe que se anexa al mapa mientras la party regresa | `components/base/PanelParty.tsx` |
| `src/components/base/party/InformeHistoricoParty.tsx` | Informe histórico con cabecera y detalle plegables | `components/base/PanelParty.tsx` |
| `src/components/base/party/RecompensasInformeParty.tsx` | Una sola presentación de recursos, experiencia y botín para ambos informes | `InformeProvisionalParty.tsx` e `InformeHistoricoParty.tsx` |
| `src/components/base/party/resultado-informe.ts` | Adaptación pura del estado del servidor a informe visible; conserva recompensas y log al reconectar | `components/base/PanelParty.tsx` |
| `src/components/base/party/cliente.ts` | Único cliente HTTP de consulta y acciones de party; serialización de objetivos y cadencia del sondeo | `components/base/PanelParty.tsx` |

Pruebas añadidas a `combat-scale.test.cjs`, `party-rules.test.cjs` y `party-formation.test.cjs`; el mock de `party-combat-actions.test.cjs` referencia el módulo real de recompensas.

**Siguiente corte:** confirmar la regresión de la iniciativa de party y del roster de enemigos, así como los tests de compatibilidad. La entrega de objetos de botín se ha movido a `src/server/services/party/inventario-recompensas.ts`, recibiendo el mismo `Prisma.TransactionClient` del servicio de combate y las dependencias de catálogo/límite inyectadas, sin iniciar una transacción adicional. La liquidación exactamente una vez sigue bajo `combate-party-actions.ts`. Los estados de apertura de los informes y el polling se mantienen en `PanelParty.tsx`. No duplicar las fórmulas de iniciativa, daños, curas ni distribución de loot.

### Áreas identificadas para una extracción posterior con pruebas

1. `src/components/combate/CombateModal.tsx` (~108 KB): separar fases, selectors y paneles visuales. Compartir subcomponentes de PvE/PvP/asedio sin alterar la cronología de turnos.
2. `src/server/services/party/combate-party-actions.ts` (~94 KB): dividir acciones por responsabilidad (objetivos, resultados, efectos y persistencia) manteniendo **un solo motor de reglas**.
3. `src/components/base/PanelParty.tsx` (~89 KB) y `src/app/base/personaje/page.tsx` (~69 KB): extraer secciones independientes, evitando estados duplicados.
4. `src/lib/tiposJuego.ts` (ahora sin el catálogo de edificios): estudiar los tipos por dominio cuando sus dependencias lo permitan; evitar ciclos entre `src/lib` y `src/server`.
5. Evitar reconstruir fachadas innecesarias para catálogos ya consolidados; la compatibilidad solo se conserva cuando existe un consumidor verificado.

**No aplicar una fragmentación masiva sin pruebas de paridad.** Los módulos de operaciones PvP, PvE y party no son catálogos duplicados: su separación refleja flujos distintos. Los ~49 scripts Python/Node incluyen validadores y herramientas invocadas por la CI; `scripts/recursos.py` es la interfaz común, y los motores especializados se conservan mientras sean necesarios.

### Fase 3.2 — Dependencias entre servicios de party (2 de noviembre de 2026)

- `server/services/party/errores.ts` es el propietario de `PartyServiceError`. Los módulos `http.ts`, `expedicion-party-service.ts`, `combate-party-service.ts` y `combate-party-actions.ts` lo importan directamente. `party-service.ts` e `index.ts` mantienen el símbolo público; la clase no se duplica para preservar `instanceof`, códigos y estados HTTP.
- `server/services/party/consultas.ts` centraliza el `Prisma.PersonajeInclude` compartido por los tres servicios de membresía, expediciones y consultas de combate. Se mantienen idénticas todas las ranuras de equipo, habilidades, progresos de clase y objetos del inventario.
- Las pruebas con servicios aislados se adaptaron a las nuevas dependencias. Los cambios están en los commits `7cd9020` y `aecbe48`, sin alterar el motor táctico, los datos guardados ni los tiempos de expedición.
- La ejecución de CI correspondiente debe confirmar el resultado antes de considerar la rama apta para fusionar. El fallo preexistente de la auditoría HD de equipo se examina por separado.

### Fase 3.3 — Liquidación de resultados de party

La rutina transaccional `liquidarRecompensasParty` se trasladó íntegra de `server/services/party/combate-party-actions.ts` a `server/services/party/liquidacion-recompensas.ts`. El orquestador conserva la secuencia de acciones del jugador y turno enemigo, pero delega la liquidación. Se conserva la misma instancia de `Prisma.TransactionClient`, el control optimista por `version`, el guardado `recompensasResueltas`, el botín determinista, los informes y la concesión individual de experiencia. La normalización del log ahora es una única función pura `lib/party/combate-reglas.ts`.

El test de acciones de combate carga y ejecuta la liquidación extraída con sus dependencias simuladas habituales (sin reemplazar su resultado), protegiendo los casos de victoria, derrota, huida, botín, límites del inventario e idempotencia.

El paso al regreso se aisló también en `server/services/party/regreso-combate.ts`. Recibe el mismo `Prisma.TransactionClient`, mantiene las comprobaciones de fase, participantes y versiones, y calcula la fecha de vuelta desde la **hora original del encuentro**, nunca desde el momento en que el jugador termina el combate. Los tests aislados ejecutan la implementación real y verifican ambas fechas. Se añadió una prueba específica para el contrato histórico de normalización del log. **Los resultados del workflow de regresión deberán comprobarse antes de continuar extrayendo turnos.**

### Fase 3.4 — Acciones y turno enemigo con propietarios separados

El servicio histórico `src/server/services/party/combate-party-actions.ts` conserva `ejecutarAccionCombateParty` y reexporta `ejecutarTurnoEnemigoParty` para mantener sin cambios las rutas HTTP y los consumidores externos. La implementación de la segunda está ahora en `server/services/party/turno-enemigo.ts`; su código de selección de objetivo, pulsos, barreras, ataque, cola de iniciativa, actualización de HP y guardado se trasladó sin alterar las secuencias.

- `server/services/party/recursos-turno.ts` contiene la regeneración que comparten ambos tipos de turno, incluidas las estadísticas, el equipo y el control optimista sobre energía/maná.
- `server/services/party/contexto-combate.ts` es el propietario de la validación del identificador, carga del combate y normalización de participantes.
- Los servicios de turnos reutilizan `liquidacion-recompensas.ts` y `regreso-combate.ts` con el mismo cliente transaccional; no hay transacciones nuevas ni dobles liquidaciones.
- El test aislado de combate ejecuta los módulos reales con sus mocks habituales mediante un único cargador. Las pruebas que inspeccionaban el código de animaciones e iniciativa se han redirigido al módulo propietario, conservando las aserciones.

El archivo original de acciones se redujo de **1.313 a unas 864 líneas** en esta etapa. **Falta confirmar la regresión de los commits nuevos** y la comprobación visual antes de reorganizar la UI de combate. No se ha modificado `main` ni la auditoría artística de Novato.

### Fase 3.5 — Interfaz de combate: módulos que se reconocen por su nombre

Las declaraciones de entrada de `CombateModal` (PVE/party, habilidades y recompensas) están ahora en `src/components/combate/tipos.ts`. Se extrajeron dos bloques visuales **sin modificar el diseño**:

- `ResultadoCombate.tsx`: victoria, derrota, huida e informe de bajas y recompensas (incluye el filtrado del botín individual).
- `InformacionCombatientes.tsx`: ventana de estadísticas del jugador, los compañeros y los enemigos.
- `PanelConsumiblesCombate.tsx`: inventario de pociones, detalle de restauración, botones de consumo y estados inhabilitados; la ejecución sigue en el coordinador.
- `PanelHabilidadesCombate.tsx`: muestra habilidades aprendidas/equipadas, costes, cooldowns, selección activa y descripción. `CombateModal.tsx` sigue siendo el único responsable de resolver el objetivo (enemigos, propio, aliados, área) y despachar `ejecutarHabilidad`, para evitar lógica de juego en los elementos visuales. El test de interfaz renderiza estados habilitados/bloqueados y objetivo pendiente.
- `ComandosCombate.tsx`: muestra la barra de acciones y sus estados deshabilitados; el coordinador mantiene los callbacks para seleccionar habilidades, abrir consumibles, atacar y confirmar la huida.
- `CombateModal.tsx`: mantiene la coordinación de animaciones, objetivos y acciones, y decide cuándo mostrar cada panel. Queda reducido de 1.882 a unas 1.507 líneas: sigue siendo grande, así que la siguiente extracción prioritaria será la zona de habilidades/objetos, sin fragmentar cada botón en componentes independientes.

En `src/components/combate/README.md` hay un **mapa de mantenimiento por tarea**, para saber dónde cambiar una mecánica, el aspecto visual o un sprite sin recorrer el repositorio. Los tests de informe se actualizaron para seguir verificando las mismas etiquetas desde su componente propietario. La CI del commit `46afc8d` fue verde, pero **todavía hay que confirmar la regresión del último cambio visual** y la auditoría HD continúa pendiente por una discrepancia de Novato.

**Mapa recomendado para mantenimiento cotidiano:** [`docs/mapa-codigo.md`](mapa-codigo.md). El presente documento conserva el historial técnico de la reorganización y sus precauciones; no es necesario recorrerlo para editar una habilidad, sprite o edificio.

### Fase 3.6 — Asedio y compañía: límites visuales independientes

Se han extraído `ResultadoAsedio.tsx` (resultado PvP) e `InformacionAsedio.tsx` (estadísticas de ambos bandos); `AsedioModal.tsx` conserva el estado, las consultas de apariencia y los turnos. El tipo `HabilidadCombate` es compartido con PvE desde `src/components/combate/tipos.ts`, sin duplicar declaraciones.

`PanelParty.tsx` conserva el sondeo, los intervalos, la resolución de combates y las llamadas HTTP. `AvisoCompaniaParty.tsx` presenta los miembros y avisos del tablón; `ExpedicionActivaParty.tsx` muestra la expedición y sus informes; `ConfirmacionDisolucionParty.tsx` presenta el diálogo de disolución. Las confirmaciones y llamadas HTTP siguen siendo callbacks explícitos del contenedor. El panel principal pasa de unas 941 a unas 657 líneas. El mapeo de datos y participantes hacia `CombateModal` se ha consolidado en `vista-combate.ts`, que ahora proporciona ambos contratos de presentación sin lógica de red.

Ambos modales de combate utilizan el mismo `useBloquearScrollFondo.ts`, con una prueba que reproduce bloqueo, restauración de estilos y posición del scroll.

Los tests que inspeccionan JSX siguen las responsabilidades nuevas sin rebajar las comprobaciones originales. **Estas últimas extracciones requieren confirmar la regresión del HEAD y revisión visual**, por separado del error preexistente de auditoría de sprites HD (Novato).

### Fase 3.7 — Ficha y consulta uniforme de objetos

`AsedioModal.tsx` reutiliza ahora `PanelHabilidadesCombate.tsx` igual que PvE: el panel solo muestra técnicas, costes y cooldowns; la lógica de atacar y lanzar habilidades sigue en el controlador de asedio.

Las vistas **Personaje** (`/base/personaje`), **Botica**, **Armería**, **Herrería** y la hoja rápida usan `src/components/objetos/MiniaturaObjeto.tsx` para presentar una miniatura que abre el panel táctil/teclado existente `DescripcionTactil`. `detalles-objeto.ts` toma los valores del catálogo público `src/lib/objetos.ts` y del ejemplar de inventario (mejora, bonificaciones y cantidad): evita duplicar atributos y fórmulas visuales entre tiendas.

`HojaPersonajeModal.tsx` ya delega habilidades y ranuras a `src/components/personaje/HabilidadesFichaPersonaje.tsx` y `EquipoFichaPersonaje.tsx`. **Ninguna extracción ha alterado las rutas HTTP ni la economía.** La compra, venta, equipamiento y mejora permanecen en sus pantallas y servicios existentes.

La documentación operativa está en `src/components/objetos/README.md` y en el [mapa práctico de código](mapa-codigo.md). Se han añadido tests del formateo, las miniaturas accesibles y los estados de la ficha. Las nuevas ramas del frontend deben confirmarse mediante CI y revisión visual antes de fusionar.

## Fase 4 — Limpieza verificada

No se han borrado históricos de sprites, manifiestos, SHA, QA ni scripts de origen: varios siguen siendo requeridos para garantizar compatibilidad y revisar arte. La reexportación `clases-nuevas.ts` se ha eliminado tras migrar sus consumidores y sus pruebas.

Antes de eliminar cualquier archivo: buscar importaciones estáticas y dinámicas, usos en scripts/CI, rutas públicas y documentación; exigir prueba de regresión y realizar commit dedicado. **La eliminación sistemática de obsoletos está pendiente.**


## Acceso rápido al desarrollo

```bash
npm run audit:estructura
```

- `npm run audit:estructura`: búsqueda orientativa de módulos sin imports entrantes y referencias no resueltas. No elimina nada. Una ruta HTTP, un import dinámico, un archivo de Prisma o un recurso gráfico pueden usarse sin imports normales; cada candidato requiere investigación.
- `src/server/services/expediciones/index.ts`, `combate/index.ts` y `party/index.ts`: fachadas públicas. Las rutas de expediciones y los endpoints explícitos PvE/PvP ya usan los índices. El endpoint de combate genérico continúa pasando por el adaptador antiguo para no romper clientes.
- `src/lib/economia/mercado.ts`: única fuente de validación de recursos, cantidades y nivel del Mercado; usada por `api/mercado/comprar` y `api/mercado/vender`.

### CI y revisión

PR de trabajo en borrador: https://github.com/joseconca/gremio-expediciones/pull/9

Los primeros jobs de CI localizaron dependencias de rutas internas en tests, un chequeo del catálogo HD que no admitía clases añadidas y un tipo opcional en la ficha. Se incorporaron correcciones en commits posteriores. Solo considerar la rama apta para fusionar cuando la ejecución actualizada confirme todos los trabajos verdes y se pruebe visualmente el equipo superpuesto.

## Pruebas incorporadas y validación necesaria

- `python scripts/test-sprites-cli.py`
- `python scripts/test-recursos-cli.py`
- `node --test tests/sprites-hd-runtime.test.cjs`
- `npm run test:progression` (incluye `tests/catalogos-reorganizacion.test.cjs`)
- `npm run test:party`
- `npm run test:base`
- `npm run lint`
- `npm run build`

El workflow de sprites ejecuta las pruebas Python, pero **no se ha verificado una ejecución verde de CI ni una compilación local completa en esta intervención**. La publicación de enemigos y de equipo exige una comprobación visual posterior. Si falla un test existente, investigar el fallo antes de fusionar; no relajar aserciones para declarar éxito.
