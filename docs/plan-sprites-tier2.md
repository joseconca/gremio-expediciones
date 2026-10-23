# Plan de sprites Tier 2 — estado y orden de trabajo

## Referencia maestra aprobada
Adoptar el estilo de pixel art detallado mostrado por el usuario: volúmenes y contornos limpios, proporciones coherentes, paleta rica, capas de tela y adornos integrados, sombras nítidas. Ningún sprite base lleva armas ni herramientas; se superponen como capas independientes. Las clases ya finalizadas no se rehacen en esta fase: la armonización se reserva para la pasada global final.

## Contrato técnico de cada primer pase
- Por clase y sexo: concept art grande → idle derecha (4 frames) → walk derecha (4 frames) → hurt derecha (4 frames) → QA.
- Tira de staging ampliada: 256×128, cuatro celdas de 64×128. Fuente nativa: 128×64, cuatro celdas de 32×64.
- Validar dimensiones, transparencia, que los cuatro frames no estén vacíos ni sean clones, y que cada celda ampliada corresponda a su frame nativo.
- Conservar los másteres grandes por separado para el futuro; nunca sustituirlos por los sprites reducidos.
- No incorporar al runtime hasta completar QA y aprobación en la pasada final.

## Estado de rediseño — 2026-10-23 (actualizado)
- **Elementalista femenino:** concept, idle, walk y hurt están en staging con QA técnico. Se ha archivado el máster hires de idle (1983×793 RGBA) en `/GameAssets/Tier2/Elementalista/` y se ha creado `assets/spritesheets/originales/elementalista/v2/source-hires/female-manifest.json`. En la auditoría no se encontraron fuentes hires independientes de concept, walk ni hurt; el manifiesto deja constancia del hueco, sin etiquetar las hojas reducidas como originales.
- **Brujo masculino y femenino:** primeros pases completos (concept, idle, walk, hurt) en staging; sus masters grandes están preservados en Library y registrados en manifiestos/archivo.
- **Cazador masculino y femenino:** primeros pases completos en staging; concept y tres acciones por sexo, con fuentes hires preservadas y manifiestos.
- **Explorador masculino y femenino:** primeros pases completos en staging; concept y tres acciones por sexo. Se corrigieron y verificaron las hojas femeninas de walk y hurt y se archivaron sus masters grandes por separado.
- **Revisión visual transversal preliminar:** las paletas/siluetas conservan una identidad de clase diferenciada; algunos ciclos idle resultan sutiles en vistas reducidas y quedan candidatos a pulido final. No rehacer las clases ya terminadas todavía.
- **Siguiente:** cerrar auditoría de QA/manifiestos, resolver la procedencia de originales hires que faltan si se recuperan las fuentes y completar la aprobación artística global. No integrar al runtime antes de esa aprobación.


## Checkpoint actual — Cazador masculino

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
