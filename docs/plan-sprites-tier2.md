# Plan de sprites Tier 2 — estado y orden de trabajo

## Referencia maestra aprobada
Adoptar el estilo de pixel art detallado mostrado por el usuario: volúmenes y contornos limpios, proporciones coherentes, paleta rica, capas de tela y adornos integrados, sombras nítidas. Ningún sprite base lleva armas ni herramientas; se superponen como capas independientes. Las clases ya finalizadas no se rehacen en esta fase: la armonización se reserva para la pasada global final.

## Contrato técnico de cada primer pase
- Por clase y sexo: concept art grande → idle derecha (4 frames) → walk derecha (4 frames) → hurt derecha (4 frames) → QA.
- Máster de tres filas: 128×192 o 256×384; cuatro poses por acción y sexo.
- Tira de acción ampliada: 256×128, cuatro celdas de 64×128. Los frames nativos canónicos son cuatro PNG de 32×64 en `frames-native-32x64/<sexo>/`.
- En el staging aislado del rediseño Elementalista, los frames nativos se conservan como PNG RGBA individuales en lugar de una tira nativa compuesta.
- Validar dimensiones, transparencia, que los cuatro frames no estén vacíos ni sean clones, y que cada celda ampliada corresponda a su frame nativo.
- Conservar los másteres grandes por separado para el futuro; nunca sustituirlos por los sprites reducidos.
- No incorporar al runtime hasta completar QA y aprobación en la pasada final.

## Estado global de Tier 2 — snapshot canónico de main, 2026-10-23

- **Cobertura global:** las ocho clases del manifiesto (Caballero, Duelista, Sacerdote, Monje, Cazador, Explorador, Elementalista y Brujo), ambos sexos y las tres acciones `idle`, `walk`, `hurt` tienen paquete v2 generado. Son 48 tiras de acción, 192 frames nativos y 16 másteres de fuente. El inventario se sincronizó en `assets/spritesheets/originales/tier2/manifest.json`.
- **Cobertura del rediseño:** las cuatro clases prioritarias —Elementalista, Brujo, Cazador y Explorador— tienen además 24 tiras separadas en `rework-staging`, cuatro poses por acción y sexo. En Elementalista, los frames nativos de este staging son PNG individuales; en las otras tres clases hay también una tira nativa compuesta.
- **Estado técnico:** los paquetes canónicos incluyen seis informes QA, previews y fuentes nativas. Se ha añadido `scripts/auditar-paquetes-tier2.py` a la regresión para comprobar másteres, dimensiones, alfa, hashes, cuatro poses únicas, correspondencia entre tira y frames nativos y estado fuera del runtime.
- **Integridad del rework-staging:** el [workflow de reparación y auditoría](https://github.com/joseconca/gremio-expediciones/actions/runs/40023186175) terminó en verde y validó las 24 combinaciones. Reparó 11 tiras derivadas dañadas: Elementalista femenina (`idle`, `walk`, `hurt`), Brujo masculino (`idle`, `walk`, `hurt`) y femenino (`idle`), Cazador masculino (`idle`, `walk`, `hurt`) y Explorador femenino (`walk`). Commit automático de los artefactos reparados: `72ee175`. La reparación conservó los frames/másteres fuente y no modificó el runtime.
- **Pendiente:** aprobación artística transversal. Caballero, Duelista, Sacerdote y Monje tienen notas de posibles residuos/halos; las cuatro clases prioritarias necesitan revisión de silueta, continuidad y detalle. No rehacer recursos completos ni sustituir assets de producción durante esta fase.
- **Runtime:** todos los paquetes canónicos siguen marcados `runtime_integrated: false`; el staging de rediseño también permanece desconectado. QA técnico correcto no equivale a aprobación visual.
- **Siguiente paso:** comprobar la regresión sobre el commit que contiene las reparaciones y realizar la pasada artística global clase por clase. Limpiar solo defectos visuales confirmados; la armonización de clases ya terminadas queda para el final.

## Revisión visual inicial del rework-staging — 2026-10-23

- **Artefactos revisados:** las 24 tiras de Elementalista, Brujo, Cazador y Explorador (ambos sexos, tres acciones). [Paquete de comparación de paletas y QA visual](https://github.com/joseconca/gremio-expediciones/actions/runs/40024442073). Los candidatos son solo de revisión; ninguna tira original fue sustituida.
- **Cazador:** el `walk` masculino presenta brillos crema/blancos mucho más dominantes que `idle`; la variante femenina también merece una comparación de contraste. El mapeo automático al conjunto de colores de `idle` cambió el 86,57 % de los píxeles RGB visibles en el `walk` masculino, pero la distancia RGB media fue 7,972 y la revisión visual no mostró una mejora suficiente. No promover ese candidato: el origen necesita una armonización artística controlada por materiales.
- **Brujo:** el `walk` pierde presencia violeta frente al manto de `idle`, sobre todo en el masculino. El candidato de paleta cambió el 99,88 % de píxeles RGB visibles en el `walk` masculino, pero la distancia RGB media fue solo 6,454; muchos cambios son pequeños y no recuperan por sí solos la lectura del violeta. No promoverlo automáticamente.
- **Explorador:** el `hurt` queda más apagado que `idle`/`walk`. Parte puede deberse a la pose de retroceso; confirmar que la bajada de contraste sea intencional y que el equipo siga legible antes de retocar.
- **Elementalista:** los cuatro fotogramas `idle`, especialmente los femeninos, muestran variación visual muy sutil aunque pasan el requisito técnico de fotogramas diferentes. Mejorar el bob de cuerpo/cabeza y el movimiento secundario de túnica/cabello en el redibujo; no duplicar ni sustituir assets canónicos durante esta revisión.
- **Criterio técnico de los candidatos:** los informes nuevos miden cambio exacto de RGB, distancia media/P95/máxima y preservación de alfa/límites de silueta. El porcentaje de píxeles que cambia no se interpreta como una medida de mejora perceptiva. Todos siguen con aprobación de runtime en falso.
- **Siguiente trabajo:** corregir el arte fuente de Cazador y Brujo con una paleta material coherente a través de las acciones, y mejorar la variación de `idle` de Elementalista. Después revisar los halos anotados de Caballero, Duelista, Sacerdote y Monje. No aplicar filtros globales ni integrar candidatos de paleta por lotes.

**Nota sobre checkpoints:** las secciones siguientes son registros históricos; las líneas «Siguiente» reflejan el estado de aquel commit, no la lista global actual.

## Checkpoint histórico — Cazador masculino

- Concept seleccionado: cazador forestal con capa verde, cuero práctico, ocre y marfil; manos vacías y sin arma.
- Máster original RGBA de 1114×1412 preservado en la biblioteca en `/GameAssets/Tier2/Cazador/cazador-m-concept-hires.png`, junto con una variante alternativa de alta resolución. Ambos tienen hash en `assets/spritesheets/originales/cazador/v2/source-hires/manifest.json`.
- Vista compacta de revisión guardada en `assets/spritesheets/originales/cazador/v2/rework-staging/m/concept/cazador-m-concept-128x192.png`. No es sprite de producción.
- **Idle**, **walk** y **hurt** masculinos del Cazador están guardados en staging, cuatro frames mirando a la derecha por acción; fuente nativa 128×64 y tira 256×128. QA verifica transparencia, cuatro frames únicos y equivalencia al ampliar. Los masters de alta resolución permanecen por separado en la biblioteca; walk conserva además original con damero y derivación transparente.
- Siguiente: concept del Cazador femenino, luego idle, walk y hurt de cuatro frames cada uno. Mantener masters hires y no rehacer clases terminadas.


## Checkpoint — Cazador femenino

- Concept original con trenza castaña rojiza, capa verde y cuero práctico; sin armas. Máster RGBA 1114×1412 preservado en `/GameAssets/Tier2/Cazador/cazador-f-concept-hires.png`, SHA-256 `94eefa5dfe988f85ee659388c86cf90dd97ed57dac9a4d244b38dc2d0cef8a67`.
- Preview de concept 128×192 guardado en staging con QA.
- `idle`, `walk` y `hurt` femeninos ya están en staging: cuatro frames hacia la derecha por acción, fuente nativa 128×64 y tira 256×128. QA confirma transparencia, cuatro poses distintas y escalado exacto. Masters RGBA preservados en la biblioteca con hashes.
- Siguiente: concept del Explorador masculino; después sus tres animaciones y finalmente Explorador femenino.


## Checkpoint — Explorador masculino

- Concept orientado a viajero: capa ligera verde oliva, bufanda marfil, detalles de brújula y equipo de ruta; manos vacías, sin armas.
- Concept: original RGBA 1114×1412 conservado exactamente en `/GameAssets/Tier2/Explorador/explorador-m-concept-hires-checkerboard.png`; la fuente con damero está opaca, y su derivación transparente está archivada por separado. Preview indexado 128×192 y QA en staging.
- `idle` ya está en staging: cuatro frames mirando a la derecha, fuente nativa 128×64 y tira ampliada 256×128, con QA que verifica transparencia, cuatro frames distintos y escalado exacto. Tanto el original de idle RGBA 1983×793 con damero como su derivación transparente están archivados en la biblioteca y anotados en el manifiesto.
- `walk` masculino está ahora en staging: cuatro frames distintos hacia la derecha, fuente nativa de 128×64 y tira ampliada de 256×128. QA confirma transparencia indexada, cuatro frames únicos y equivalencia exacta del escalado. Original hires RGB 1983×793 con damero y derivación RGBA transparente preservados por separado y registrados en el manifiesto.
- `hurt` masculino ya está en staging: cuatro poses de 32×64, tira 256×128 y QA que confirma transparencia indexada, cuatro celdas distintas y escalado exacto. Original RGB 1983×793 con damero y derivación RGBA se conservan en la biblioteca con hashes.
- Concept del Explorador femenino ya preservado: master RGBA 1024×1536 y derivación transparente archivados por separado, preview indexado 128×192 y QA en staging.
- `idle` y `walk` femeninos están validados en staging con hojas nativas y ampliadas. La auditoría de `walk` detectó y reparó una nativa duplicada y una expansión corrupta; el último commit contiene la expansión regenerada y QA exacto. Los masters se preservan por separado.
- `hurt` femenino ya está generado en staging: cuatro poses distintas, nativa 128×64 y expansión 256×128 validada. El master RGBA original 1984×793, derivación y cuatro recortes hires están archivados.
- Siguiente: revisión visual global de las clases completadas. Mantener las hojas fuera del runtime hasta esa revisión.


Checkpoint 23-10-2026 — Explorador femenino `hurt`: completado primer pase y QA técnico; el máster grande y los recortes de cada pose están preservados en la biblioteca. Pendiente revisión artística transversal; sin integración al runtime.


Integridad 23-10-2026: SHA de objeto Git verificado contra los bytes binarios locales para ambas hojas de `hurt` femenino; QA registra 63 colores más transparencia, cuatro poses distintas y escalado exacto. Runtime no integrado.


Checkpoint de documentación (23-10-2026): se limpiaron las notas obsoletas de los QA de concepto de ambos Exploradores. Su primer pase completo está en staging; falta la revisión artística transversal, no la generación de sus ciclos base.


Checkpoint 23-10-2026 — Auditoría de másteres Elementalista: se recuperaron y archivaron los originales hires femeninos de concept, idle, walk y hurt; el manifiesto registra sus hashes y una variante de hurt con damero. La revisión visual preliminar confirma identidades de clase diferenciadas; la aprobación final y cualquier armonización siguen pendientes.


Checkpoint de recuperación de fuentes — 23-10-2026: el Elementalista femenino ya tiene cuatro originales hires separados y archivados (concept 1114×1412, idle/walk 1983×793, hurt 2172×724 RGBA) más una alternativa opaca de hurt. Se reparó la preview de concept y se añadió QA. La pasada final global de sprites sigue pendiente.


Checkpoint 23-10-2026 — Elementalista masculino: idle/walk/hurt siguen en staging; se archivaron dos referencias compuestas hires y se documentó que no hay un master hires aislado para cada acción. Elementalista femenina: concept/idle/walk/hurt originales encontrados, archivados y registrados en female-manifest.json.


Checkpoint de auditoría 23-10-2026: manifiestos de Cazador separados por sexo y deduplicados; manifest del Explorador masculino limpiado. El siguiente commit corrige las notas QA antiguas de conceptos para alinearlas con los ciclos ya presentes.


Checkpoint QA 23-10-2026: corregidas tres notas de concept obsoletas (Brujo masculino, Cazador masculino y Cazadora) que aún marcaban idle/walk/hurt como tareas futuras. El estado real queda alineado con los archivos versionados; aprobación de runtime sigue pendiente.


Checkpoint de integridad 23-10-2026: el blob de la preview de concept del Elementalista femenino coincide con los bytes locales (SHA de Git e1e608b2…, SHA-256 bda85579…). La miniatura tiene 96×144 px y transparencia indexada 0.


Checkpoint de QA 23-10-2026: auditoría de las 31 fichas de staging finalizada. Corregidas cinco notas desfasadas sobre clases pendientes; la miniatura femenina de concept coincide exactamente con los bytes locales. Las 31 fichas mantienen aprobación de runtime en falso hasta la revisión artística global.
