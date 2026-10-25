# Spritesheets de personajes

Novato, Mago, Espadachín, Acólito y Arquero usan los nuevos cuerpos HD de 128×256 y equipo compartido entre clases, con una hoja por sexo. El montaje, las sombras y las acciones están conectados al combate individual, grupo y asedio. Las demás clases mantienen su arte actual.

La pantalla `/revision-sprites` permite revisar las cinco clases con el montaje real del juego: sexo, arma, escudo, acción, orientación y tamaño de grupo. El plan y las validaciones se conservan en [el documento de sprites HD](docs/plan-spritesheets-hd-128x256.md).

## Recursos anteriores y clases pendientes

Paquete listo para extraer en la raíz del repositorio. Contiene 35 identificadores de clase/personaje heredados, con una hoja masculina y otra femenina por cada uno.

- Formato: PNG con canal alfa y fondo transparente.
- Tamaño de hoja: 256 × 1920 px.
- Cada celda: 64 × 128 px.
- Disposición: 4 fotogramas horizontales en cada fila; 15 filas.
- Todos los personajes miran hacia la derecha.

## Orden de filas

1. Idle; 2. Caminar; 3. Recibir daño; 4. Usar consumible; 5. Esquivar; 6. Bloquear con escudo; 7. Ataque con espada; 8. Ataque con hacha; 9. Ataque con lanza; 10. Ataque con daga; 11. Ataque con arco; 12. Ataque con bastón; 13. Ataque con maza; 14. Ataque con libro; 15. Ataque con guantes.

Las paletas se adaptan por familia de clase para mantener un aspecto medieval fantástico y diferenciar las ramas. La lógica de reproducir filas en combate y las hojas de armas superpuestas se harán en una iteración posterior.
