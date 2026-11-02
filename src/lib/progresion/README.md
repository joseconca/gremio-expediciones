# Progresión y profesiones

- `clases.ts`: registro público de clases, herencia, requisitos y bonificaciones calculadas.
- `aprendizaje.ts`: requisitos y listado de habilidades aprendibles para cada profesión.
- `experiencia.ts`: experiencia Base y Job, aplicación de ganancias de Job.
- `estadisticas.ts`: estadísticas derivadas RPG e iniciales históricas del personaje.
- `estadisticas-personaje.ts`: agregación final de equipo, atributos y habilidades del personaje.
- `descripciones-habilidades.ts`: textos y comparaciones numéricas para visualizar técnicas.
- `generar-habilidades.ts`: convierte datos del catálogo único en habilidades estándar.
- `niveles-habilidad.ts`: niveles de habilidades y costes de reseteo.
- `catalogo-redisenado.ts`, `tecnicas-adicionales.ts`: transformación de datos declarativos en técnicas ejecutables.

**Fuente editable de datos:** `src/lib/catalogos/clases.ts` y `src/lib/catalogos/habilidades.ts`. No añadir definiciones de profesiones o técnicas en esta carpeta.

Se conservan los exports anteriores de `src/lib/configuracionJuego.ts` y `src/lib/habilidades.ts` mientras sean consumidos.
