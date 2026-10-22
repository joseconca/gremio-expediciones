# Estado de trabajo — rediseño artístico Tier 2

Última actualización: 2026-10-22. Rama activa: `main`.

## Objetivo
Rehacer el arte fuente de Elementalista, Brujo, Cazador y Explorador con pixel art original coherente con las clases refinadas, evitando personajes repetidos o con aspecto de primitivas SVG.

## Contrato técnico
- Fuentes actuales: `assets/spritesheets/originales/<clase>/v2/source/<clase>-<sexo>-core-3rows.png` (algunas fuentes son .webp).
- Tres acciones iniciales: `idle`, `walk`, `hurt`, con cuatro fotogramas por acción.
- Atlas runtime de `SPRITESHEETS_PERSONAJES.json`: 256×1920 px, celdas de 64×128, cuatro columnas y quince filas.
- Los assets finales deben tener transparencia por píxel en modo RGBA y no incluir fondos ni interfaz; las armas y equipo se superponen en capas independientes.
- No reemplazar assets de producción sin QA de dimensiones, alfa, alineación, continuidad y revisión visual.
- Las láminas con paneles, rótulos y concept art son referencias, no sprites de producción.

## Dirección de arte
- **Elementalista:** azul profundo, marfil y oro, túnicas fluidas y detalles arcanos; manos vacías.
- **Brujo:** carbón/berenjena, capas asimétricas y ribetes violetas; sin libro ni armas.
- **Cazador:** cuero, verde bosque y ocre, protecciones prácticas; sin arco, carcaj ni cuchillas.
- **Explorador:** silueta ligera, capa corta y equipo de viaje mínimo; diferenciación clara frente al Cazador; sin armas.

## Proceso acordado
Para cada clase, completar un sexo cada vez: concept art → idle derecha (4 frames) → caminar derecha (4 frames) → recibir daño derecha (4 frames) → QA y checkpoint; después repetir para el sexo restante. Solo entonces pasar a la siguiente clase. Los recursos permanecen en staging hasta revisión artística.

## Plan y checkpoints
1. [x] Inspeccionar manifiesto, fuentes Tier 2 y workflows.
2. [x] Confirmar tres acciones iniciales, cuatro fotogramas por acción y celdas de 64×128.
3. [x] Preparar referencia visual del Elementalista masculino.
4. [x] Crear la primera tira `idle` derecha: cuatro frames nativos RGBA de 32×64 y tira RGBA de 256×128.
5. [x] Crear un primer borrador `walk` derecha: cuatro frames nativos RGBA de 32×64 y tira RGBA de 256×128.
6. [ ] Refinar visualmente `idle` y `walk`; los ciclos iniciales son borradores extraídos de referencia compuesta y no alcanzan aún criterio final de producción.
7. [ ] Crear `hurt` derecha del Elementalista masculino (4 frames).
8. [ ] QA artístico y técnico completo del Elementalista masculino; después terminar Elementalista femenino mediante concept → idle → walk → hurt.
9. [ ] Repetir secuencialmente para Brujo, Cazador y Explorador, cada uno masculino y después femenino.
10. [ ] Integrar solo recursos aprobados en los paths de producción y ejecutar validadores del proyecto.

## Estado actual — Elementalista masculino
- Concepto de referencia: cabello plateado, manto azul profundo, túnica marfil, ribetes dorados y manos vacías.
- `idle-right-4f.png`: 256×128, RGBA, canal alfa por píxel, cuatro celdas de 64×128 no vacías y distintas.
- Frames nativos de idle: `idle/frames-native-32x64/`, cuatro PNG RGBA de 32×64.
- `walk-right-4f.png`: 256×128, RGBA, canal alfa por píxel, cuatro celdas de 64×128 no vacías y distintas.
- Frames nativos de walk: `walk/frames-native-32x64/`, cuatro PNG RGBA de 32×64.
- Todos esos recursos se encuentran bajo `rework-staging/m/`; no sustituyen los originales ni están conectados al juego.
- **Estado de arte: borrador.** Ambos ciclos proceden de una referencia compuesta; el movimiento de piernas y telas es sutil y debe refinarse/redibujarse antes de producción.
- Próximo checkpoint: crear únicamente `hurt` derecha del Elementalista masculino y validarla en el mismo formato.

## Registro de commits
- `3e9cf33` — documentar el rediseño Tier 2 en `main`.
- `f7aa1b5` — separar el plan por personaje y animación.
- `910b6ff` — checkpoint del concepto de Elementalista masculino.
- `14d2877` — primer borrador de idle en staging.
- `ce888c0` — frames nativos RGBA de idle.
- `e2f1dad` — tira ampliada de idle RGBA.
- Siguiente commit: primer borrador de walk y su QA en staging.
