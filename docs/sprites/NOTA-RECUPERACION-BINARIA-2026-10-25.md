# Nota de recuperación binaria — 2026-10-25

## Estado verificado

- Rama: `creacion-sprite-sheets`
- Último commit remoto conocido al iniciar la verificación: `91bed37139bde910c679c7ffdcefbe45b56d8c55`
- Manifiesto consultado: `assets/spritesheets/hd-128x256/manifest.json`
- El manifiesto aún marca `nextFrame: novato-m-dodge-01`.
- Los PNG de producción para `dodge` y `block_shield` no se encuentran publicados en las rutas previstas.
- Los assets de las dos acciones se conservan localmente en los ZIP de recuperación creados el 2026-10-24; sus hashes SHA-256 están incluidos en los QA individuales.

## Límite de publicación en esta sesión

El conector de GitHub disponible crea blobs desde cadenas Base64 textuales, pero aquí no expone un canal de bytes local a la API. Los intentos de reconstruir cadenas grandes en llamadas de herramienta dieron un contenido distinto al original (blob SHA incompatible). Se detuvo la publicación para no incorporar PNG corruptos. Esta nota no afirma que las acciones estén integradas ni adelanta el checkpoint.

## Siguiente paso seguro

Desde un checkout local limpio de esta rama, aplicar el script `apply_recovery.py` incluido en el paquete de recuperación con `--source` apuntando a la carpeta extraída. El script verifica dimensiones, alfa, SHA-256, QA, rama, sincronización remota y el SHA del push después de cada commit. Solo entonces deben actualizarse manifiesto y checkpoint para avanzar a `novato-m-attack_sword-01`.

No modificar recursos de runtime hasta completar las quince acciones y la revisión artística de la hoja completa.
