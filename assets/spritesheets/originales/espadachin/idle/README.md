# Espadachín — arte original por acción

Esta carpeta contiene las tiras de trabajo que se van completando antes de montar la hoja final consumida por el juego.

## Idle masculino
- Recurso: `espadachin-m-idle.png`
- Dimensiones: 256 × 128 px.
- Distribución: 4 fotogramas horizontales de 64 × 128 px.
- Dirección: tres cuartos hacia la derecha.
- Armas: ninguna dibujada en el cuerpo; se incorporarán mediante capas equipables en otra fase.
- Validaciones: dimensiones, transparencia, margen dentro de celda y diferencias entre fotogramas comprobadas con script; revisión visual de la tira ampliada.
- Estado: primer corte versionado; pendiente de integrar en la hoja final junto al resto de acciones.

## Orden de ejecución
1. Idle masculino (este commit).
2. Idle femenino (commit independiente).
3. Caminar masculino y femenino.
4. Resto de las acciones según `docs/sprites-personajes-y-plan-arte.md`.

No sustituir los spritesheet activos del juego hasta que las 15 filas estén completadas y validadas.
