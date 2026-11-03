# Herramientas de desarrollo

**Punto de entrada público para sprites:** `python scripts/recursos.py`.

Desde ahí se consultan, registran, validan y publican recursos de héroes, enemigos y equipo. `scripts/sprites.py` y los demás `.py` son tareas especializadas utilizadas por la herramienta, las pruebas o GitHub Actions. No son catálogos de juego; tampoco deben renombrarse o moverse sin actualizar primero los workflows y tests que los invocan.

- `python scripts/recursos.py resumen` — muestra en una orden clases HD publicadas, variantes pendientes, enemigos y equipo, consultando los archivos del runtime.
- `python scripts/recursos.py inventario` — cuenta archivos y bytes de fuentes HD, enemigos y originales, distinguiendo fotogramas, atlas intermedios y previsualizaciones; **no borra nada ni declara automáticamente seguro un archivo**.
- `python scripts/recursos.py heroe estado --clase berserker --sexo m`
- `python scripts/recursos.py enemigo estado --id slime_acido`
- `python scripts/recursos.py equipo estado --id espada_hierro`
- `npm run audit:estructura` muestra candidatos a módulos sin importaciones, **no** autoriza borrarlos.

**Regla para futuras limpiezas:** revisar primero `.github/workflows/`, `tests/` y las llamadas entre scripts. Mover herramientas es un cambio de estructura separado de cambios artísticos o de comportamiento.

**Ubicación de los spritesheets:** el juego sirve los atlas publicados desde `public/sprites/`. La carpeta `assets/spritesheets/` conserva exclusivamente las fuentes artísticas editables y QA para reconstruirlos; no se carga en el navegador. `src/lib/generated/` mantiene los índices. No es correcto borrar las fuentes HD mientras los publicadores dependan de ellas. Se retiró `assets/spritesheets/tier1/` por no tener consumidores detectados; su contenido histórico se puede recuperar desde Git.
