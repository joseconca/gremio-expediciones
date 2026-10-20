# Novato — Idle (archivo de referencia)

Esta carpeta archiva la fila Idle que se extrajo de la hoja canónica para inspección. **No se considera todavía arte final aprobado**, porque la revisión de las tres acciones de Novato detectó diferencias de escala/estilo entre filas que se deben corregir mediante una fuente de animación coherente.

- Tira actual: 256 × 128 px, cuatro celdas de 64 × 128 px.
- Fuente de referencia: `public/sprites/heroes/novato/novato-m-sheet.png` y la hoja femenina correspondiente.
- Frames y QA existentes en `frames/`, `previews/` y `qa-report-*.json`.
- Idle tiene tres poses únicas; el frame 4 vuelve al frame 1 para cerrar el ciclo actual. La nueva fuente deberá producir cuatro poses intencionales y coherentes, sin recurrir a copias si la animación de origen permite variación.
- Las armas no se dibujan dentro del cuerpo; se componen por capas equipables.

## Estado

Estos archivos son **referencias temporales**, no sustituirán el runtime. La nueva entrega debe partir de una única tira PNG de alta resolución, con 4/6/8 celdas iguales y transparencia real, normalizada con `scripts/normalizar-tira-sprites.py`. No usar GIF como máster ni introducir fondos, etiquetas o marcos de presentación.
