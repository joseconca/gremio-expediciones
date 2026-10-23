# Fuentes de sprites — Tier 2

Clases incluidas en esta fase: `caballero`, `duelista`, `sacerdote`, `monje`, `cazador`, `explorador`, `elementalista` y `brujo`. Los híbridos de Tier 2.5 quedan fuera del alcance.

## Estado global — 2026-10-23

Los ocho paquetes de primer pase están generados y versionados en sus directorios `<clase>/v2/`. Cada paquete contiene los másteres masculino y femenino, tres acciones (`idle`, `walk`, `hurt`) para ambos sexos, seis tiras de 256×128, 24 fotogramas nativos de 32×64, seis previews y seis informes QA.

La existencia del paquete **no significa aprobación artística**. Las fichas QA deben registrar cuatro fotogramas distintos, alfa real, dimensiones correctas y estabilidad de la línea de pies; la inspección visual transversal sigue pendiente. Los primeros paquetes de Caballero, Duelista, Sacerdote y Monje pueden conservar halos o residuos de fondo anotados en sus fichas. No borrar ni reconstruir estos recursos ahora: se abordarán durante la pasada global de armonización.

## Convenciones

- Máster raster: `<clase>-<sexo>-core-3rows.webp` o `.png`; los másteres existentes pueden ser de 128×192 o 256×384.
- Tiras por acción: `<clase>-<sexo>-<acción>.png`, 256×128, cuatro celdas de 64×128.
- Frames nativos: `frames-native-32x64/<sexo>/`, cuatro PNG de 32×64 por acción.
- Previews y QA se almacenan al lado de cada acción. El QA técnico no reemplaza la aprobación visual.
- Las armas, herramientas y efectos de combate se superponen mediante capas independientes; no deben quedar dibujados dentro del cuerpo base.
- Los paquetes permanecen versionados como fuentes/referencias. Desde el 23-10-2026, las filas 0-2 de producción usan Idle/Walk/Hurt: canonical v2 para Caballero, Duelista, Sacerdote y Monje; rework-staging para Cazador, Explorador, Elementalista y Brujo. Las filas 3-14 se preservan y no se declaran redibujadas. La armonización visual global de las acciones restantes es trabajo posterior, no un bloqueo para estos tres ciclos.

El inventario canónico está en [`manifest.json`](./manifest.json). El siguiente paso es la auditoría automática de los ocho paquetes y la revisión artística global, no volver a generar desde cero una clase cuyo paquete ya existe.
