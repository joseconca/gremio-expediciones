# Fuentes artísticas de sprites (no runtime)

Esta carpeta **no se utiliza para mostrar sprites en el navegador**. Los spritesheets publicados están en `public/sprites/`, y las rutas disponibles se indican en `src/lib/generated/`.

Aquí se conservan los fotogramas originales, las fuentes y los informes de QA necesarios para regenerar correctamente los atlas HD:

- `spritesheets/hd-128x256/`: héroes y equipo superpuesto compartido
- `spritesheets/enemies-hd/`: enemigos HD
- `spritesheets/originales/`: fuentes v2 anteriores y su trazabilidad

La carpeta histórica `spritesheets/tier1/` se retiró por carecer de consumidores identificados. Los históricos permanecen disponibles en Git.

**Uso habitual:** no necesitas abrir estos directorios ni editar los manifiestos. Ejecuta `python scripts/recursos.py resumen` para ver los sprites publicados; usa `python scripts/recursos.py heroe estado --clase berserker --sexo m` para ver uno en particular. Las instrucciones están en `scripts/README.md`.

No borrar ni trasladar las fuentes HD activas mientras los validadores, publicadores e informes hagan referencia a ellas.
