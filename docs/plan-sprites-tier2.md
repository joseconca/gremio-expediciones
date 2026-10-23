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
