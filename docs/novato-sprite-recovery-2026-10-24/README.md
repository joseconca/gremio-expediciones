# Novato masculino — paquete de recuperación de sprites

Fecha de origen del paquete: 2026-10-24  
Publicación confirmada: 2026-10-25  
Rama de destino: `creacion-sprite-sheets`  
Repositorio: https://github.com/joseconca/gremio-expediciones/tree/creacion-sprite-sheets

## Estado remoto verificado

Actualización 2026-10-25: las acciones `dodge` y `block_shield` ya están publicadas en las rutas de producción de la rama `creacion-sprite-sheets`, reutilizando directamente los blobs binarios originales almacenados en esta carpeta. Commit de arte Esquivar: `50e15fa1ebafdf372ee257ec024d504ea607c37f`. Commit de arte Bloquear con escudo: `8d90a4e23b623185e944795101c344f4b59f2309`. Manifiesto y checkpoint actualizados después de publicar. Siguiente recurso: `novato-m-attack_sword-01`.

## Contenido

- `dodge/`: cuatro PNG individuales `novato-m-dodge-01..04.png`, cada uno de 128×256, modo indexado y transparencia real por índice 0. Caja de alfa coherente; los cuatro SHA-256 son distintos. Cada PNG trae su JSON QA.
- `block_shield/`: cuatro PNG individuales y QA. Las poses son guardia, bloqueo alto, absorción del impacto en posición baja y recuperación. El fondo verde se retiró y la base de los pies se alinea en `y=248`.
- `reference/`: referencias visuales locales; **no se copian a runtime**.
- `apply_recovery.py`: script de incorporación reproducible para aplicar desde el checkout del repositorio.
- `manifest-local.json`: inventario del estado de recuperación; no reemplaza el manifiesto remoto.

## Publicación completada

Los PNG y QA de `dodge/` y `block_shield/` ya están publicados bajo `assets/spritesheets/hd-128x256/novato/m/frames/<action>/`. No ejecutes el script de recuperación contra esta rama: está pensado para cuando aún faltaban los destinos y, correctamente, rechazará los archivos que ya existen. Se conserva como herramienta de recuperación reproducible y evidencia de QA.

## Procedimiento original de incorporación desde un checkout local (histórico)

1. Descarga y extrae este ZIP fuera del repositorio, por ejemplo en `C:\Temp\novato-sprite-recovery-2026-10-24`.
2. Abre una terminal en la raíz del checkout `gremio-expediciones` que ya tenga configurado `origin` y credenciales de GitHub.
3. Ejecuta:

   ```powershell
   python C:\Temp\novato-sprite-recovery-2026-10-24\apply_recovery.py --source C:\Temp\novato-sprite-recovery-2026-10-24
   ```

El script exige la rama `creacion-sprite-sheets`, checkout limpio y `HEAD` sincronizado con `origin/creacion-sprite-sheets`. Valida dimensiones, transparencia PNG, hashes SHA-256, QA por frame y ausencia de duplicados dentro de cada acción antes de copiar nada. Hace un commit de arte y otro de documentación por cada acción, hace push tras cada commit y compara el SHA remoto con `HEAD` antes de seguir. Conserva las secciones de aceptación del checkpoint y refleja si se usó `--no-push`. Si las credenciales o la sincronización fallan, se detiene y deja intactos los commits ya creados; no fuerza cambios ni sobrescribe archivos existentes distintos.

### Pruebas locales del procedimiento

- Validación de QA: 8/8 PNG aprobados; 4 hashes SHA-256 únicos por acción.
- Prueba en repositorio Git desechable: 4 commits creados (arte + documentación para cada acción), rutas correctas, manifiesto y checkpoint sincronizados, siguiente recurso `novato-m-attack_sword-01`.
- En modo `--no-push`, el checkpoint indica explícitamente que el commit es local y no está publicado.
- La prueba anterior era previa a la publicación. La publicación real se ha verificado mediante los árboles de GitHub: los ocho PNG y los ocho QA existen en las rutas de producción; el manifiesto refleja los dos commits.

## No integrar todavía en runtime

No se ha ensamblado ninguna spritesheet ni se han modificado rutas consumidas por el juego. Los ocho QA técnicos pasan; la revisión artística de cadencia y silueta sigue pendiente. No promover a runtime hasta completar y revisar la hoja de 60 fotogramas de la variante.
