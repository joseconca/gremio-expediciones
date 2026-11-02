# Reorganización 1 — mapa de módulos y estado verificable

Rama `reorganizacion-1` creada desde `main` (`84fd4db`). **No fusionar hasta pasar tests, lint, build y prueba visual.** El objetivo es reducir archivos que el desarrollador necesita conocer, sin cambiar las reglas del juego.

## Fase 1 — Sprites HD y recursos

**Punto de entrada recomendado:** `python scripts/recursos.py` (Python 3 + Pillow). Los scripts existentes son motores especializados internos; no se han borrado porque los usa CI y conservan políticas de manos, hashes y procedencia.

```bash
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
| Lectura en juego | `src/lib/sprites-heroes-hd.ts`, `src/lib/sprites-enemigos-hd.ts` |

## Fase 2 — Clases y habilidades

### Registros públicos (únicos)

- `src/lib/progresion/clases.ts`: tipos, arquetipos, herencia, dominios, desbloqueos y API `CLASES`.
- `src/lib/habilidades.ts`: API `HABILIDADES` y búsquedas, compuesta en el mismo orden anterior.

### Dos catálogos editables (uno por dominio)

- `src/lib/progresion/catalogos/clases.ts`: **todas las definiciones de clases** (base y avanzadas), con requisitos, maestrías y bonificaciones.
- `src/lib/progresion/catalogos/habilidades.ts`: **todos los datos editables de habilidades**: escuelas, habilidades troncales, evoluciones, Super Novato, diseños V2, nombres y técnicas adicionales.

No existen otros catálogos editables de estos dominios. Los demás módulos son motores, APIs o **adaptadores temporales sin definiciones copiadas**:

- `src/lib/progresion/clases.ts`: herencia, desbloqueos y API pública `CLASES`.
- `src/lib/habilidades.ts`: construcción de la API `HABILIDADES`, conservando orden e identificadores.
- `src/lib/habilidades-nuevas.ts`: generador de habilidades estándar desde el catálogo único.
- `src/lib/progresion/catalogo-redisenado.ts` y `src/lib/progresion/tecnicas-adicionales.ts`: transformaciones y ejecución de reglas.
- Las rutas legacy de catálogos, diseño V2 y nombres solo reexportan constantes; son transitorias hasta migrar sus consumidores. `catalogos/crear-habilidad.ts` contiene únicamente un constructor con defaults.

**Modificar clases o habilidades:** editar exclusivamente uno de los dos catálogos canónicos. Las habilidades V2 actuales se generan desde datos declarativos, no se deben copiar en otros ficheros.

### Catálogos adicionales separados de sus reglas

- `src/lib/catalogos/objetos.ts`: **definiciones de los 62 objetos**. `src/lib/objetos.ts` conserva la API pública de consulta, estadísticas, sprites y costes de forja.
- `src/lib/catalogos/enemigos.ts`: **42 criaturas, 12 jefes y tablas de botín**. `src/lib/enemigos.ts` conserva la API pública, los defaults de drops, la selección por amenaza y las rutas de sprites.
- `src/lib/sufijosObjetos.ts`: catálogo pequeño de sufijos más sus reglas; se mantiene junto por ahora para evitar una separación artificial.

Así, los datos se editan en un lugar por dominio, pero las funciones permanecen fuera del catálogo. **No se han cambiado precios, estadísticas, rarezas ni probabilidades**. Los importadores existentes siguen usando `src/lib/objetos.ts` y `src/lib/enemigos.ts`.

## Fase 3 — Servicios

Se ha eliminado la duplicación exacta del adaptador `adjuntarPulsosEstado` entre PvE y PvP. Su propietario es ahora `src/server/services/combate/efectos-visualizacion.ts`. Los demás servicios siguen con sus rutas y firmas originales.

Objetivo siguiente: revisar rutas HTTP y extraer una fachada por funcionalidad para combate, expediciones, party, inventario, edificios y economía; migrar consumidores en grupos con pruebas de integración. **No está terminada esta fase.** No mover servicios voluminosos antes de un mapa de llamadas y pruebas de paridad.

## Auditoría de estructura general (2 de noviembre de 2026)

La separación actual tiene sentido y no requiere repartir cada pequeña función en un archivo propio:

| Capa | Fuente de verdad / responsabilidad | Criterio |
|---|---|---|
| Definiciones RPG | `src/lib/progresion/catalogos/{clases,habilidades}.ts` | Editar solo ahí; APIs públicas en `progresion/clases.ts` y `lib/habilidades.ts` |
| Objetos y enemigos | `src/lib/catalogos/{objetos,enemigos}.ts` | Datos únicos; reglas, fórmulas y búsquedas fuera |
| Reglas puras de combate | `src/lib/expediciones/` | No acceder a Prisma ni HTTP |
| Operaciones persistentes y PvE/PvP/party | `src/server/services/` | Orquestación, transacciones, validaciones; no replicar el motor táctico |
| API y pantallas | `src/app/`, `src/components/` | Mantener rutas delgadas y componentes de presentación |
| Arte y manifiestos de sprites | `assets/`, `src/lib/generated/`, `scripts/recursos.py` | La fuente artística no es el JSON generado |

### Áreas identificadas para una extracción posterior con pruebas

1. `src/components/combate/CombateModal.tsx` (~108 KB): separar fases, selectors y paneles visuales. Compartir subcomponentes de PvE/PvP/asedio sin alterar la cronología de turnos.
2. `src/server/services/party/combate-party-actions.ts` (~94 KB): dividir acciones por responsabilidad (objetivos, resultados, efectos y persistencia) manteniendo **un solo motor de reglas**.
3. `src/components/base/PanelParty.tsx` (~89 KB) y `src/app/base/personaje/page.tsx` (~69 KB): extraer secciones independientes, evitando estados duplicados.
4. `src/lib/tiposJuego.ts` (725 líneas): candidatear tipos por dominio cuando sus dependencias lo permitan; evitar ciclos entre `src/lib` y `src/server`.
5. Las rutas de compatibilidad de los catálogos antiguos reexportan constantes: eliminarlas únicamente tras migrar sus importadores y verificar tests, scripts y CI; no reintroducir datos ahí.

**No aplicar una fragmentación masiva sin pruebas de paridad.** Los módulos de operaciones PvP, PvE y party no son catálogos duplicados: su separación refleja flujos distintos. Los ~49 scripts Python/Node incluyen validadores y herramientas invocadas por la CI; `scripts/recursos.py` es la interfaz común, y los motores especializados se conservan mientras sean necesarios.

## Fase 4 — Limpieza verificada

No se han borrado históricos de sprites, manifiestos, SHA, QA ni scripts de origen: varios siguen siendo requeridos para garantizar compatibilidad y revisar arte. La reexportación `clases-nuevas.ts` se ha eliminado tras migrar sus consumidores y sus pruebas.

Antes de eliminar cualquier archivo: buscar importaciones estáticas y dinámicas, usos en scripts/CI, rutas públicas y documentación; exigir prueba de regresión y realizar commit dedicado. **La eliminación sistemática de obsoletos está pendiente.**


## Acceso rápido al desarrollo

```bash
npm run audit:estructura
```

- `npm run audit:estructura`: búsqueda orientativa de módulos sin imports entrantes y referencias no resueltas. No elimina nada. Una ruta HTTP, un import dinámico, un archivo de Prisma o un recurso gráfico pueden usarse sin imports normales; cada candidato requiere investigación.
- `src/server/services/expediciones/index.ts`, `combate/index.ts` y `party/index.ts`: fachadas públicas. Las rutas de expediciones y los endpoints explícitos PvE/PvP ya usan los índices. El endpoint de combate genérico continúa pasando por el adaptador antiguo para no romper clientes.
- `src/lib/economia.ts`: única fuente de validación de recursos, cantidades y nivel del Mercado; usada por `api/mercado/comprar` y `api/mercado/vender`.

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
