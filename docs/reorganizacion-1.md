# Reorganización 1 — estado y contrato

Rama aislada creada desde `main` (84fd4db). La prioridad es reducir puntos de entrada sin alterar reglas, balance ni assets históricos.

## Fase 1: sprites de héroes HD

Entrada para el desarrollador: `python scripts/sprites.py`. Requiere Python 3 y Pillow.

```bash
python scripts/sprites.py estado --clase berserker --sexo m
python scripts/sprites.py actualizar --clase berserker --sexo m --accion idle --tira mi-idle.png
python scripts/sprites.py validar --clase berserker --sexo m
python scripts/sprites.py publicar --clase berserker --sexo m --aprobado
```

`actualizar` acepta una tira RGBA transparente de 512×256 (4 poses de 128×256) o cuatro PNG RGBA `01.png`–`04.png` con `--fotogramas carpeta`. Verifica dimensiones, transparencia, poses distintas y los 60 fotogramas; reconstruye el atlas de preparación, genera QA y previsualización, y recalcula el progreso cuando existe manifiesto. Los fotogramas anteriores y los derivados se restituyen si falla la actualización. La publicación es independiente: exige revisión humana expresada mediante `--aprobado` y sincroniza atlas, reposo, retrato y lista de clases del catálogo de runtime.

**Importante:** no genera ilustraciones nuevas; empaqueta cuatro fotogramas ya preparados. No realiza commits automáticos. Los cambios se revisan y versionan con Git. El comando no publica equipo superpuesto ni modifica animaciones de enemigos. La herramienta `promover-sprites-hd.py` sigue siendo necesaria para publicar y verificar en bloque los equipos y los conjuntos antiguos. No ejecutar a ciegas dicho script después de publicar una clase nueva: su política interna de clases procede del manifiesto de equipo, que puede no incluirla.

Carpeta fuente: `assets/spritesheets/hd-128x256/<clase>/<m|f>/frames/<accion>/`.
Carpeta publicada: `public/sprites/hd-v1/heroes/<clase>/`.
Catálogo runtime: `src/lib/generated/sprites-hd.json` (generado, no modificar manualmente).

### Riesgos y validación pendientes

- Probar en entorno local con Pillow y los sprites reales antes de considerar cerrado el flujo.
- Ajustar el CI para incluir este comando y validar el catálogo publicado frente a la lista de clases.
- Revisar el caso de una nueva clase sin directorio fuente y el contrato de publicación de equipo compartido.
- Conservar los originales y las aprobaciones visuales. No borrar hashes ni QA hasta eliminar su dependencia demostrablemente.
- Evitar regenerar en masa el catálogo porque actualmente la publicación de equipos incluye reglas de composición y manos que el comando individual no modifica.

## Fases posteriores

**2. Clases y habilidades.** Crear un índice de origen por `claseId`, identificar duplicaciones entre `src/lib/habilidades.ts`, `src/lib/habilidades-nuevas.ts`, `src/lib/progresion/diseno-habilidades.ts` y `src/lib/progresion/catalogo-redisenado.ts`. Migrar una familia cada vez, con pruebas de paridad de IDs, costes, tier y progresión. Mantener una sola API pública.

**3. Servicios.** Mapear las entradas de expediciones, combate, party, inventario, edificios y economía antes de mover archivos. Extraer contratos estables y cambiar importaciones por funcionalidad en commits independientes.

**4. Limpieza.** Generar un informe de archivos huérfanos usando búsqueda de imports, referencias dinámicas y assets, revisar pruebas y despliegue. Eliminar exclusivamente aquellos con evidencia de no uso; guardar el inventario en documentación y un commit por grupo.

Ninguna de estas fases posteriores se considera implementada todavía.
