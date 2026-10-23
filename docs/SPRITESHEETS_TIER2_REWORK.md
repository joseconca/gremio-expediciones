# Estado de trabajo — rediseño artístico Tier 2

Última actualización: 2026-10-23. Rama activa: `main`.

## Referencia maestra de estilo (aprobada por el usuario)
La imagen adjunta es la dirección visual de los sprites pendientes: pixel art RPG detallado, volumen y contornos limpios, silueta legible, telas con pliegues y detalles ornamentales a escala de juego. Paleta azul/marfil/oro para Elementalista; cada clase mantiene su identidad. Todos los personajes base van sin armas ni herramientas. Los sprites ya terminados no se rehacen ahora; la armonización global se hace al final, cuando estén los primeros pases de las cuatro clases pendientes.

## Contrato técnico
- Acciones iniciales: `idle`, `walk`, `hurt`, cuatro fotogramas por acción hacia la derecha.
- Atlas runtime en `SPRITESHEETS_PERSONAJES.json`: 256×1920 px, celdas 64×128, cuatro columnas y quince filas.
- Staging: tira 256×128 con cuatro celdas de 64×128; fuentes nativas de 32×64.
- PNG indexado con índice transparente explícito es el formato actual de estos borradores; QA confirma la transparencia y la correspondencia entre tira y frames. No integrar al runtime sin validación final.
- No modificar recursos de producción durante los primeros pases.

## Dirección de arte
- **Elementalista:** azul profundo, marfil y oro; sin armas.
- **Brujo:** carbón/berenjena y violeta; sin libro ni armas.
- **Cazador:** cuero, verde bosque y ocre; sin arco/carcaj/cuchillas.
- **Explorador:** ágil, capa corta, equipo mínimo, distinto del Cazador; sin armas.

## Estado — Elementalista femenino
- Concept art guardado en `rework-staging/f/concept/elementalista-f-concept-96x144.png`.
- `idle-right-4f.png`: primer pase con cuatro frames y transparencia indexada validada.
- `walk-right-4f.png`: primer pase, cuatro frames nativos; QA de dimensiones, transparencia, distinción y recorte aprobado técnicamente.
- `hurt-right-4f.png`: primer pase, cuatro frames de reacción; QA técnico aprobado.
- **Los tres ciclos siguen en staging y no están conectados al runtime.** El movimiento walk es sutil y los tres ciclos se revisarán globalmente al terminar el primer pase de todas las clases.
- Siguiente: Brujo masculino — concept art y luego idle, walk, hurt.

## Historial reciente
- `44b0c84` — concept femenino.
- `6e2ef82` — idle femenino inicial.
- `fcf857c` — restaurar idle validado y añadir la guía de estilo maestra.
- `49e20bc` — walk femenino con cuatro frames y QA.
- Próximo checkpoint: hurt femenino y actualización del plan.
