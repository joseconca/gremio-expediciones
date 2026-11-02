# Gremio-Expediciones

## Guía de desarrollo en la rama `reorganizacion-1`

**Fuentes editables:** [clases](src/lib/catalogos/clases.ts) · [habilidades](src/lib/catalogos/habilidades.ts) · [objetos](src/lib/catalogos/objetos.ts) · [enemigos](src/lib/catalogos/enemigos.ts). Los módulos de juego conservan sus APIs de consulta.

## Mapa de carpetas

- `src/lib/catalogos/`: datos editables de clases, habilidades, objetos y enemigos.
- `src/lib/base/`: reglas de la base, empezando por las comidas de taberna.
- `src/lib/equipamiento/`: inventario, sufijos, tienda y botín.
- `src/lib/economia/`: mercado y precios.
- `src/lib/expediciones/`: reglas de expedición, combate y generación de misiones.
- `src/lib/sprites/`: lectura y renderizado de héroes y enemigos HD.
- `src/app/base/` y `src/components/base/`: rutas y UI de edificios (no se mueven para mantener las URLs).
- `src/server/services/`: persistencia y operaciones del servidor.

[Mapa detallado y estado de la reorganización](docs/reorganizacion-1.md). Para recursos gráficos, usar la interfaz pública `scripts/recursos.py` y no modificar los JSON generados manualmente.

Para consultar y publicar sprites sin abrir manifiestos ni editar hashes:

```bash
python scripts/recursos.py heroe estado --clase berserker --sexo m
python scripts/recursos.py enemigo estado --id slime_acido
python scripts/recursos.py equipo estado --id espada_hierro
```

Para investigar posibles módulos sin referencias antes de limpiar el repositorio:

```bash
npm run audit:estructura
```

Consulta [el mapa de arquitectura y el estado de la reorganización](docs/reorganizacion-1.md). Los recursos de Berserker todavía están publicados de forma parcial; la disponibilidad se consulta por sexo y tipo de recurso. Los comandos no generan arte nuevo y la promoción exige validación y aprobación visual. No fusionar la rama hasta superar la CI.

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
