# Espadachín Tier 1 — Caminar

Checkpoint de la entrega de arte, todavía separado de las hojas activas del juego.

## Archivos de revisión preparados localmente

- `espadachin-m-walk.png`: tira masculina, 256 × 128 px.
- `espadachin-f-walk.png`: tira femenina, 256 × 128 px.
- Cuatro celdas horizontales de 64 × 128 px por personaje.
- Fondo transparente real; un único ángulo tres cuartos hacia la derecha.
- Sin armas dibujadas dentro del cuerpo: se incorporarán como capas equipables.
- Cuatro fotogramas distintos por sexo, con pies y márgenes normalizados.

## Integridad del recurso

Los PNG y sus previsualizaciones están incluidos en el paquete local de revisión de esta conversación. No se han publicado aquí como blobs de imagen porque el SHA del blob devuelto por la API no coincidió con el hash del archivo local durante la transferencia. No usar archivos binarios hasta que la comparación de hashes confirme que son idénticos.

SHA-256 del PNG local:

- Masculino: `9aace7bba61966a9b4102541a3b14725f40779863160e5a3c827d06e7f597650`
- Femenino: `0e22fb6372152c486f69ef454f6adeaeae1b04d7aaf1f634f5191dd5f275a0ce`

## Próximos pasos

1. Publicar los dos PNG binarios y comprobar sus hashes.
2. Revisar el resultado final a tamaño nativo (64 × 128) y en ampliación nearest-neighbor.
3. Solo después de cerrar Caminar, seguir con Recibir daño.
4. No sustituir las hojas activas hasta completar y validar las 15 acciones por sexo.
