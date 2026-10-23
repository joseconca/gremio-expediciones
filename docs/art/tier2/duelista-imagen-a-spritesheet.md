# Duelista Tier 2 — extracción desde lámina ilustrada

## Fuente y alcance

La fuente es la lámina ilustrada aportada en la conversación el 22-10-2026, de 1536×1024 px. Contiene las variantes masculina y femenina en dos bloques, con cuatro poses para cada acción en el orden **Idle → Caminar → Recibir daño**.

No se usarán los másteres raster por imagen vectoriales anteriores: se sustituirán por másteres raster PNG recortados de esta referencia. El diseño mantiene las manos vacías y no dibuja armas ni escudos; el equipo se añadirá como capas independientes.

## Contrato de salida

- Máster masculino y femenino de 256×384 px, en una cuadrícula de cuatro columnas por tres filas.
- Cada celda mide 64×128 px para que el generador Tier 2 derive las tiras ampliadas, los fotogramas nativos de 32×64, las previews y los informes QA.
- Línea de pies normalizada entre fotogramas para reducir saltos de altura.
- Fondo del panel eliminado por segmentación basada en el contorno y una máscara de color. Puede quedar algún píxel suelto/halo en ciertos bordes porque la lámina original tiene fondo opaco y las ilustraciones se solapan con la zona del rótulo; se puede hacer una pasada manual de limpieza posterior.
- Checkpoint 2026-10-23: las filas Idle/Walk/Hurt del paquete de Duelista se integraron al runtime en commit 690640b; la revisión de posibles halos en bordes queda como pulido no bloqueante.

## Decisiones de recorte

La primera pose femenina de cada acción tiene una coleta que invade el margen izquierdo de la celda y se superpone con la zona del rótulo. El recorte limita ese margen para evitar que entren letras en el frame; conserva la coleta cercana a la cabeza para mantener la identidad visual. No se añaden armas.

## Validación

El pipeline del repositorio ya ha generado y versionado las seis tiras (tres acciones × dos sexos), 24 frames nativos, seis previews y seis informes QA. El QA técnico de dimensiones/alfa y frames distintos no sustituye la inspección visual. La pasada global debe revisar los recortes y limpiar solo si confirma halo/fondo residual.

## Estado — 2026-10-23
La extracción de Duelista está completa como primer pase y fuera del runtime. Sus másteres raster WebP, tiras y QA están presentes en `assets/spritesheets/originales/duelista/v2/`; el manifiesto Tier 2 ya refleja el paquete generado. No se deben volver a generar los ciclos desde cero.

