# Novato — Idle

Este recurso es una copia independiente de la fila Idle de la hoja canónica de Novato. No se dibuja equipo sobre otra clase y no modifica runtime.

- Tira de 256 × 128 px; cuatro celdas horizontales de 64 × 128 px.
- Fuente: `public/sprites/heroes/novato/novato-m-sheet.png` y su variante femenina.
- Frames RGBA separados en `frames/m/` y `frames/f/`, previews en `previews/`, informes en `qa-report-m.json` y `qa-report-f.json`.
- El loop usa tres poses visuales: el cuarto fotograma vuelve al primero para cerrar la animación sin salto. La validación exige al menos tres fotogramas únicos en Idle.
- Las armas no se dibujan dentro del cuerpo; se componen como capas equipables.

Los recursos están archivados bajo `assets/spritesheets/originales/novato/idle/` para revisión y futura integración; la hoja activa no se ha modificado.
