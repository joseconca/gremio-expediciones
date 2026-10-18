# Sprites de héroes por clase

Cada carpeta usa el identificador estable de la clase del juego y contiene:

- `<id>-m.png`: sprite masculino.
- `<id>-f.png`: sprite femenino.
- `<id>-logo.svg`: emblema provisional para miniaturas y listados.

Los dos PNG iniciales son copias de `../warrior-m.png` y `../warrior-f.png`, por lo que ninguna clase se queda sin imagen mientras se preparan los sprites definitivos. El SVG actual es un emblema de muestra; reemplázalo por el logo propio de la clase conservando el nombre y la ruta. La aplicación resuelve los sprites a partir de la profesión activa y conserva compatibilidad con las etiquetas antiguas.

Clases legacy sin una definición jugable propia: `guerrero` y `comerciante`.
