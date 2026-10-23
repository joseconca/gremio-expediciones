# Integración de sprites de Tier 0, Tier 1 y Tier 2

## Contrato runtime

- Atlas de cada sexo: PNG RGBA de 256×1920 px, 4 columnas × 15 filas, celdas de 64×128.
- Filas 0-2: idle, walk, hurt. Cada acción usa sus cuatro fotogramas en el orden de izquierda a derecha.
- Se conservan sin modificación las filas 3-14 (consumible, esquiva, bloqueo y ataques por tipo de arma). Las armas no se dibujan encima de estas nuevas poses base.
- El componente SpriteHeroeAnimado ya lee esas tres primeras filas; no se cambia la temporización ni la URL del atlas.
- Los retratos se regeneran a 128×256 desde el primer fotograma Idle, ampliado con vecino más cercano para mantener el pixel art limpio. obtenerSpriteHeroe ya centraliza la cabecera, la hoja de personaje, el inventario y otros retratos, por lo que esas pantallas actualizan el arte sin duplicar rutas.

## Fuentes seleccionadas

| Tier | Clases | Fuente de Idle/Walk/Hurt |
|---|---|---|
| 0 | Novato | Paquete canónico v2 de assets/spritesheets/originales/novato/v2/ |
| 1 | Mago, Espadachín, Acólito, Arquero | Paquetes canónicos v2 de cada clase |
| 2 | Caballero, Duelista, Sacerdote, Monje | Paquetes canónicos v2 |
| 2 | Cazador, Explorador, Elementalista, Brujo | rework-staging (prioritario, ambos sexos y las tres acciones) |

El flujo falla si falta un ciclo de rework-staging para una de las cuatro clases prioritarias; no cae silenciosamente al arte canónico anterior. La selección no usa los antiguos PNG de retrato como fuente. Los retratos PNG se sustituyen por arte Idle seleccionado; los archivos *-logo.svg se conservan porque son emblemas de clase, no retratos de personaje.

## Validación y trazabilidad

scripts/integrar-sprites-tier0-tier2.py comprueba dimensiones, alfa real, fotogramas no vacíos y distintos, correspondencia entre la fila runtime y su tira fuente, integridad literal de las filas 3-14 y hashes de las fuentes/salidas. Produce un informe JSON que se guarda como artefacto de CI. El workflow valida las 26 combinaciones de clase/sexo, las 78 tiras integradas y los 26 retratos.

La promoción integra expresamente solo Idle, Caminar y Recibir daño porque son los ciclos preparados. No declara rediseñados los ataques de las otras doce filas, ni cambia el comportamiento del componente de animación.
