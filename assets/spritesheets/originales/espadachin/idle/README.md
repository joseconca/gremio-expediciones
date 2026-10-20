# Espadachín — arte original por acción

Carpeta de trabajo para los recursos originales validados por acción y sexo, antes de montar la hoja final que usa el juego.

## Idle
- `espadachin-m-idle.png`: cuatro frames masculinos.
- `espadachin-f-idle.png`: cuatro frames femeninos.
- Ambos recursos: 256 × 128 px, cuatro celdas horizontales de 64 × 128 px.
- Orientación única: tres cuartos hacia la derecha.
- Diseño original de cuerpo completo. No deriva del Novato ni usa el Novato como plantilla.
- Armas: no están dibujadas en el cuerpo; se añadirán por capas y anclajes según arma, acción y fotograma.
- Validación: dimensiones, transparencia real, márgenes de cada celda, pies alineados y diferencias entre fotogramas comprobados con script; las tiras ampliadas se revisaron visualmente.
- Codificación: PNG indexado con índice transparente (tRNS) para reducir el peso; se carga con alfa real y los píxeles visibles conservan su color.

## Estado y siguientes entregas
Idle masculino y femenino quedan versionados en commits separados. Son tiras de trabajo, no sustituyen aún los recursos activos del juego. La siguiente entrega es Caminar masculino y femenino, también en commits separados; después se avanza acción por acción según `docs/sprites-personajes-y-plan-arte.md`.
