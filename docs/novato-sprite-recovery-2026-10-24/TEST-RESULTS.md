# Resultados de QA y autoprueba — 24-10-2026

## Arte local

- `dodge`: 4 PNG aprobados, 128×256, modo indexado, índice de transparencia 0, 4 hashes SHA-256 distintos.
- `block_shield`: 4 PNG aprobados, 128×256, modo indexado, índice de transparencia 0, 4 hashes SHA-256 distintos.
- Cada fotograma tiene JSON QA; hash, dimensiones, ruta y acción/número coinciden.

## Procedimiento de publicación

Se ejecutó `apply_recovery.py` en un repositorio Git desechable con `--no-push`. Resultado: commits separados para arte y checkpoint de cada acción; manifiesto y checkpoint actualizados; orden siguiente correcto: `novato-m-attack_sword-01`; se mantienen las secciones de criterios de aceptación y se indica que los commits no fueron publicados.

**Estado remoto real:** el arte de `dodge` y `block_shield` sigue pendiente de incorporación al repositorio remoto. No se debe interpretar la autoprueba del repositorio desechable como publicación remota. El script verifica el SHA remoto después de cada `git push` en el checkout real.
