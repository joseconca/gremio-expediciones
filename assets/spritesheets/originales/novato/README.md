# Novato — inventario de fuentes por acción

Esta carpeta separa las tiras de Novato por sexo y acción para compararlas y rehacerlas sin tocar el runtime:

- `idle/`
- `walk/`
- `hurt/`

## Estado actual

Las tiras que ya están en estas carpetas son **extracciones técnicas de las hojas canónicas existentes**. Se conservaron para no perder checkpoints y para poder comparar los cambios, pero una revisión visual posterior detectó variaciones de escala y lectura entre acciones. Por tanto, no están aprobadas como entrega artística definitiva y no deben integrarse en una nueva spritesheet de producción todavía.

## Nuevo flujo de arte

La siguiente versión se producirá desde una tira PNG de alta resolución, generada como una animación coherente para un solo sexo y una sola acción:

1. Fuente PNG horizontal con 4, 6 u 8 poses, celdas de igual anchura y alfa real.
2. Sin títulos, paneles, líneas de separación, damero pintado ni armas.
3. Idle fija la escala maestra del personaje. Caminar y Recibir daño reutilizan ese valor para mantener la talla entre acciones.
4. `scripts/normalizar-tira-sprites.py` genera tira final, frames 64 × 128, preview y QA.
5. Revisión visual a tamaño nativo y ampliación nearest-neighbor antes de un commit de aprobación.

Se usa PNG como fuente, no GIF, para conservar el alfa completo y los colores. El normalizador rechaza imágenes de presentación con fondos opacos para que no entren accidentalmente en el juego.

El runtime permanece sin cambios hasta que Idle, Caminar y Recibir daño de masculino y femenino se aprueben visualmente.
