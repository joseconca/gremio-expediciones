# Estado de trabajo — rediseño artístico Tier 2

Última actualización: 2026-10-23. Rama activa: `main`.

## Referencia maestra de estilo
La imagen aprobada por el usuario es el estándar de todos los sprites pendientes: pixel art RPG detallado, volumen mediante luces y sombras, contornos nítidos, siluetas legibles y prendas con pliegues/adornos. Cada clase conserva su paleta. Todos los personajes base van sin armas ni herramientas. No rehacer clases ya terminadas: la armonización global se realizará al final.

## Contrato técnico
- Acciones: `idle`, `walk`, `hurt`; cuatro frames mirando a la derecha.
- Atlas runtime: 256×1920 px, celdas de 64×128.
- Tira expandida: 256×128 con cuatro celdas 64×128; fuente nativa: 128×64 con cuatro celdas 32×64.
- Staging indexado con transparencia explícita; QA valida dimensiones, transparencia, diferencia entre frames y correspondencia entre tira/fuente.
- No reemplazar sprites de producción hasta la revisión final.

## Estado actual — snapshot global auditado, 2026-10-23

- **Tier 2 completo como primer pase:** el manifiesto contiene ocho clases (Caballero, Duelista, Sacerdote, Monje, Cazador, Explorador, Elementalista y Brujo). Cada clase/sexo tiene `idle`, `walk` y `hurt`: 48 tiras, 192 frames nativos y seis informes QA por clase. Los másteres y paquetes están versionados en `assets/spritesheets/originales/<clase>/v2/`.
- **Rediseño prioritario:** Elementalista, Brujo, Cazador y Explorador tienen además 24 tiras de staging, cubriendo las tres acciones por ambos sexos. Ninguna de esas tiras reemplaza los assets de producción.
- **QA y formatos:** las tiras canónicas miden 256×128 (cuatro celdas de 64×128) y los frames nativos 32×64. Brujo, Cazador y Explorador del staging también conservan tiras nativas 128×64; Elementalista conserva cuatro PNG nativos separados por acción y sexo. El script `scripts/auditar-paquetes-tier2.py` queda incorporado al flujo de regresión para revisar dimensiones, transparencia real, hashes, poses únicas y equivalencia entre tira y frames.
- **Reparación verificada:** [GitHub Actions](https://github.com/joseconca/gremio-expediciones/actions/runs/40023186175) reconstruyó 11 tiras de staging corruptas y pasó la auditoría de las 24 acciones. Los artefactos se guardaron en `main` en el commit `72ee175`. Se mantuvieron fuentes/másteres originales y runtime sin cambios.
- **Aprobación artística:** sigue pendiente para las ocho clases. Caballero, Duelista, Sacerdote y Monje pueden requerir limpieza de borde/fondo; las cuatro clases prioritarias necesitan revisión final de silueta y lectura del movimiento. No se regeneran desde cero: la limpieza se limitará a defectos confirmados.
- **Runtime:** los QA de los paquetes canónicos siguen con `runtime_integrated: false`; los recursos del staging también se mantienen fuera del runtime. Superar QA técnico no equivale a aprobación artística ni a integración.
- **Siguiente:** confirmar la regresión de `main` tras el commit de reparación y, después, realizar la pasada artística transversal de las seis tiras por clase. Armonizar las clases ya terminadas solo en la pasada final.

**Nota:** las secciones de checkpoint e historial que siguen son registros de fases anteriores; las líneas «Siguiente» dentro de esos registros son históricas.

**Nota:** la sección «Historial reciente» y los checkpoints posteriores conservan el estado documentado en sus fechas; las instrucciones «Siguiente» de esos apuntes son históricas, no la lista actual de tareas.

## Historial reciente
- `b2b21b6` — primer pase del Elementalista femenino.
- `b82e093` — concept del Brujo masculino.
- `bd2eada` — idle masculino del Brujo.
- `6c5562b` — hurt masculino del Brujo, cuatro frames y QA técnico.
- `26a001e` — restaurar fuente nativa de walk y sincronizar el estado.
- `c662701` — idle femenino del Brujo y máster hires catalogado.
- `21310ba` — walk femenino del Brujo, original y derivación transparente preservados.
- `ff880fd` — hurt femenino del Brujo.
- `cc90f8b` — concept masculino del Cazador, preview, QA y manifiesto de masters.
- `cc90f8b` — concept masculino del Cazador, preview, QA y manifiesto de masters.
- `f0c892c` — idle masculino del Cazador con QA y masters hires catalogados.
- `2461926` — walk masculino del Cazador con cuatro frames y masters de alta resolución archivados.
- `c17a332` — primer pase completo del Cazador masculino (idle, walk, hurt), masters hires y QA.
- `c4d038d` — concept femenino del Cazador con master hires y QA.
- `fba3f66` — idle femenino del Cazador con master hires y QA.
- `e2bbd28` — walk femenino del Cazador y máster hires.
- `9623aa4` — primer pase completo de Cazador femenino, masters hires y QA.
- `6611e9b` — concept masculino del Explorador con original y derivación transparente.
- `97202c2` — idle masculino del Explorador, master hires y QA.
- `e34fb02` — walk masculino del Explorador con master hires original/derivado y QA.


## Checkpoint actualizado — Explorador masculino (23-10-2026)

- Concept, `idle`, `walk` y `hurt` están versionados en staging. Las tres animaciones contienen cuatro frames nativos de 32×64 y tiras ampliadas de 256×128; los QA comprueban dimensiones, transparencia, cuatro poses únicas y correspondencia exacta al escalar.
- Se conservan los masters de alta resolución en la biblioteca, incluyendo los originales con damero y sus derivaciones transparentes separadas. El manifiesto registra sus SHA-256.
- Ninguna de estas hojas está conectada al runtime ni aprobada como arte final. El concept femenino del Explorador ya está guardado; siguiente: `idle`, `walk` y `hurt` femeninos.


## Checkpoint actualizado — Explorador masculino (23-10-2026)

- Concept, `idle`, `walk` y `hurt` están versionados en staging. Las tres animaciones contienen cuatro frames nativos de 32×64 y tiras ampliadas de 256×128; los QA comprueban dimensiones, transparencia, cuatro poses únicas y correspondencia exacta al escalar.
- Se conservan los masters de alta resolución en la biblioteca, incluyendo los originales con damero y sus derivaciones transparentes separadas. El manifiesto registra sus SHA-256.
- Ninguna de estas hojas está conectada al runtime ni aprobada como arte final. El concept femenino del Explorador ya está guardado; siguiente: `idle`, `walk` y `hurt` femeninos.


## Checkpoint actualizado — Explorador femenino (23-10-2026)

- Concept preservado como preview indexado 128×192 en staging. El original RGBA 1024×1536 se conserva sin modificar en la biblioteca, y hay una derivación transparente separada; ambos hashes constan en `assets/spritesheets/originales/explorador/v2/source-hires/female-manifest.json`.
- Diseño: pelo castaño corto y a capas, capa verde/teal, equipo ligero de viaje y emblemas de brújula; manos vacías, sin armas.
- Siguiente: `idle`, `walk` y `hurt`, cuatro frames por acción. No conectar al runtime hasta la revisión artística global.


## Checkpoint — Explorador femenino `idle` (23-10-2026)

- `idle` tiene cuatro frames nativos de 32×64 y tira ampliada de 256×128; el QA confirma cuatro poses únicas, transparencia indexada y escalado exacto.
- Los masters originales RGBA y las derivaciones transparentes de `idle` y `walk` se conservan por separado y constan en `assets/spritesheets/originales/explorador/v2/source-hires/female-manifest.json`.
- Siguiente: `hurt` femenino. Sin runtime integration hasta la revisión global.


## Checkpoint — Explorador femenino `walk` (23-10-2026)

- `walk` femenino: los cuatro frames nativos 32×64 y la tira ampliada 256×128 ya están corregidos. La auditoría eliminó la tira corrupta y restauró la nativa; el segundo checkpoint reconstruyó la expansión. QA confirma que coincide píxel a píxel con la ampliación por vecino más cercano. El master original RGB con damero y la derivación transparente se conservan por separado.
- Siguiente: `hurt` femenino, luego revisión artística global. No integrar al runtime.


## Reparación de integridad — Explorador femenino `walk` (23-10-2026)

- Auditado el checkpoint `927af1d`: la nativa publicada duplicaba la tira de `idle` y la ampliada no superaba la validación de PNG. Se restaura la nativa correcta (`d943786d…`) y se elimina la ampliada defectuosa en vez de conservarla como válida.
- El primer commit de reparación marcó la expansión como pendiente; el checkpoint inmediatamente posterior la regeneró, verificó píxel a píxel y cerró la acción `walk`. El master original y su derivación transparente siguen archivados en la biblioteca.
- Siguiente: `hurt` femenino.


## Checkpoint — reparación completada de `walk` femenino (23-10-2026)

- `f2a0314` restauró la nativa correcta y retiró la expansión corrupta.
- Este checkpoint repone `walk-right-4f.png` (256×128, indexado con transparencia); la optimización de paleta se verificó sin ninguna diferencia de píxeles frente a la ampliación por vecino más cercano de la nativa.
- QA actualizado y manifiesto/documentación sincronizados. `walk` se considera completo en staging; no está conectado al runtime. Siguiente: `hurt` femenino.


## Checkpoint — Explorador femenino `hurt` (23-10-2026)

- `hurt` en staging: cuatro frames de 32×64, tira nativa 128×64 indexada con índice transparente 0 y tira 256×128 ampliada por vecino más cercano. QA confirma cuatro poses únicas, celdas no vacías y coincidencia exacta de la expansión.
- El máster RGBA original de 1984×793 se preserva sin modificar en la biblioteca; la derivación transparente y los cuatro recortes individuales hires también están archivados, cada uno con hash SHA-256.
- Sigue pendiente la aprobación artística entre clases. Ninguna hoja de `rework-staging` se conecta al runtime todavía.


## Verificación de integridad binaria — Explorador femenino `hurt` (23-10-2026)

- Se revalidaron los Git blob SHA-1 frente a los bytes locales exactos de ambas PNG, además del SHA-256 en QA. La hoja nativa mide 128×64 (4.748 bytes) y la ampliada 256×128 (6.650 bytes).
- Las cuatro celdas del PNG nativo son distintas; la tira ampliada coincide píxel a píxel con el escalado nearest-neighbour. Paleta indexada de 63 colores útiles más índice transparente 0.
- Los másteres hires y los recortes por pose permanecen en la biblioteca; el runtime sigue sin cambios. La aprobación artística transversal continúa pendiente.


## Auditoría de estado — Explorador (23-10-2026)

- Conceptos masculino y femenino, más `idle`, `walk` y `hurt` de ambos, ya están presentes en `rework-staging`; el QA de los conceptos se actualizó para no marcar esas animaciones como tareas pendientes.
- La revisión automática preliminar de los QA consultados solo deja `runtimeApproved: false`, que es deliberado mientras no se complete la revisión artística global. El runtime de producción sigue intacto.


## Revisión visual transversal preliminar — 23-10-2026

- Comparadas las hojas hires disponibles y las hojas de staging de Brujo, Cazador, Explorador y Elementalista femenino. La identidad de clase se lee en la paleta y silueta: violeta y ornamentación arcana para Brujo; verde forestal/cuero para Cazador; verde de viaje más ligero y equipo de ruta para Explorador; azul marino, marfil y oro para Elementalista.
- El acabado base sigue la referencia aprobada (pliegues, contornos, sombras y ornamento integrados); no se encontraron motivos para rehacer ahora las clases terminadas. La lectura de movimiento de algunos `idle` es sutil en las vistas reducidas, así que se deja como punto de revisión para la pasada final.
- La revisión de QA consultada confirma que los únicos checks falsos generalizados son `runtimeApproved: false`/`requiresArtReview: true`, que son intencionales hasta la aprobación artística final; las excepciones de origen de alta resolución se documentan en el manifiesto de Elementalista femenino.
- No se ha integrado ningún asset de `rework-staging` al runtime. Siguiente paso: cerrar la auditoría de manifests/QA pendientes, resolver la procedencia hires faltante si se recuperan las fuentes, y solo entonces decidir la armonización final.


## Recuperación de originales Elementalista femenino — 23-10-2026

- Se localizaron por nombre genérico cuatro fuentes hires separadas: concept (1114×1412), idle y walk (1983×793), hurt (2172×724). Las copias canónicas en `/GameAssets/Tier2/Elementalista/` preservan los bytes originales y sus SHA-256 están registrados en el manifiesto femenino.
- Se preservó además una variante de hurt con damero incrustado; no se usa para la extracción porque existe otra fuente de hurt con alfa real.
- La miniatura `elementalista-f-concept-96x144.png` fue reconstruida desde el concept hires con índice transparente 0, y se agregó `elementalista-f-concept.qa.json`. Los ciclos siguen separados en staging y no están integrados al runtime.


## Originales compuestos del Elementalista masculino — 23-10-2026

- Se preservaron dos hojas hires exactas en `/GameAssets/Tier2/Elementalista/`. Ambas contienen concepto y filas de acciones con paneles/texto; son referencias compuestas, no masters aislados de cada animación.
- Los tres ciclos masculinos continúan en staging, con cuatro frames. La procedencia se añadió a cada QA y el manifiesto `male-manifest.json` distingue los references hires de los frames extraídos.


## Auditoría de manifiestos — 23-10-2026

- Se separó el manifiesto del Cazador por sexo: `source-hires/manifest.json` contiene ahora solo fuentes masculinas; `female-manifest.json` registra concept, idle, walk y hurt femeninos. Se eliminaron las entradas duplicadas de idle en el manifiesto masculino, conservando la variante seleccionada y las alternativas.
- Se eliminaron los registros duplicados de hurt original/derivado en el manifiesto del Explorador masculino. No se borró ningún archivo de la biblioteca.
- Los dos manifiestos del Elementalista también quedaron separados por sexo. Los QA distinguen fuentes hires originales, referencias compuestas y tiras reducidas de staging.


## Limpieza de notas QA obsoletas — 23-10-2026

- Se actualizaron los QA de concepto del Brujo masculino y del Cazador masculino/femenino: ya no indican que `idle`, `walk` o `hurt` están pendientes cuando los tres ciclos están versionados en staging.
- Los estados siguen siendo de revisión; se mantiene `runtimeApproved: false` hasta la aprobación artística global.


## Verificación binaria de preview — 23-10-2026

- La miniatura de concept de Elementalista femenino se volvió a publicar con un blob binario comprobado. El SHA de objeto Git remoto coincide exactamente con `git hash-object` local (`e1e608b2…`); los 1.914 bytes representan una PNG indexada de 96×144 con transparencia en el índice 0.


## Cierre de auditoría QA — 23-10-2026

- Se corrigieron cinco notas históricas que aplazaban la revisión hasta completar clases que ya tenían concept + idle/walk/hurt en staging: hurt del Brujo femenino, hurt/walk del Brujo masculino, hurt de la Elementalista femenina e idle del Explorador masculino.
- Todos los QA de staging revisados mantienen `runtimeApproved: false`; las hojas permanecen fuera del runtime, como exige el plan. No se detectaron checks técnicos explícitos falsos en las 31 fichas QA consultadas; los valores false de runtime/art-review son intencionales.
- Se verificó que la miniatura compacta del concept de la Elementalista femenina (96×144) publica el blob binario exacto; tamaño remoto 1.914 bytes, Git blob `e1e608b2…`, SHA-256 `bda85579…`.
