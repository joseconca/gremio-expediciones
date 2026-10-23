# Plan de sprites Tier 2 — estado y orden de trabajo

## Referencia maestra aprobada
Adoptar el estilo de pixel art detallado mostrado por el usuario: volúmenes y contornos limpios, proporciones coherentes, paleta rica, capas de tela y adornos integrados, sombras nítidas. Ningún sprite base lleva armas ni herramientas; se superponen como capas independientes. Las clases ya finalizadas no se rehacen en esta fase: la armonización se reserva para la pasada global final.

## Contrato técnico de cada primer pase
- Por clase y sexo: concept art grande → idle derecha (4 frames) → walk derecha (4 frames) → hurt derecha (4 frames) → QA.
- Tira de staging ampliada: 256×128, cuatro celdas de 64×128. Fuente nativa: 128×64, cuatro celdas de 32×64.
- Validar dimensiones, transparencia, que los cuatro frames no estén vacíos ni sean clones, y que cada celda ampliada corresponda a su frame nativo.
- Conservar los másteres grandes por separado para el futuro; nunca sustituirlos por los sprites reducidos.
- No incorporar al runtime hasta completar QA y aprobación en la pasada final.

## Estado de rediseño — 2026-10-23
- **Elementalista femenino:** concept, idle, walk y hurt están en staging con QA técnico inicial.
- **Brujo masculino:** concept y tres acciones terminadas en staging; cuatro frames por acción. Másteres grandes exactos en `/GameAssets/Tier2/Brujo/brujo-m-originales-alta-resolucion.zip`.
- **Brujo femenino:** concept e idle/walk/hurt terminados como primer pase en staging; cuatro frames por acción y QA inicial. Másteres grandes en `/GameAssets/Tier2/Brujo/`; el walk original tenía checkerboard incrustado, preservado intacto junto a una derivación transparente.
- **Siguiente:** Cazador masculino, después Cazador femenino, Explorador masculino y Explorador femenino.
- Cuando estén listos los primeros pases de las cuatro clases, realizar una revisión de coherencia y después estudiar la armonización de los sprites ya terminados. No rehacerlos antes.


## Checkpoint actual — Cazador masculino

- Concept seleccionado: cazador forestal con capa verde, cuero práctico, ocre y marfil; manos vacías y sin arma.
- Máster original RGBA de 1114×1412 preservado en la biblioteca en `/GameAssets/Tier2/Cazador/cazador-m-concept-hires.png`, junto con una variante alternativa de alta resolución. Ambos tienen hash en `assets/spritesheets/originales/cazador/v2/source-hires/manifest.json`.
- Vista compacta de revisión guardada en `assets/spritesheets/originales/cazador/v2/rework-staging/m/concept/cazador-m-concept-128x192.png`. No es sprite de producción.
- **Idle** y **walk** masculinos están guardados en staging, cuatro frames hacia la derecha cada uno; fuente nativa 128×64 y tira 256×128. QA confirma transparencia indexada, cuatro frames distintos y correspondencia exacta entre fuente nativa y escala ampliada. Los masters hires permanecen por separado en la biblioteca; en walk se conserva tanto el original con damero como la derivación transparente.
- Siguiente ciclo: hurt masculino hacia la derecha, cuatro frames. Guardar cada checkpoint, mantener los masters de alta resolución y no rehacer clases terminadas.
