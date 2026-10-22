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
Para cada clase, completar un sexo cada vez: concept art → idle derecha (4 frames) → caminar derecha (4 frames) → recibir daño derecha (4 frames) → QA y checkpoint; después repetir para el sexo restante. Solo entonces pasar a la siguiente clase.

## Plan y checkpoints
1. [x] Inspeccionar manifiesto, fuentes Tier 2 y workflows.
2. [x] Confirmar las tres acciones iniciales, cuatro fotogramas por acción y celdas de 64×128.
3. [x] Preparar referencia visual del Elementalista masculino.
4. [x] Extraer cuatro frames nativos RGBA de 32×64 para `idle` derecha.
5. [x] Construir la tira ampliada 256×128 RGBA desde los frames nativos y comprobar alfa, límites y cuatro frames distintos.
6. [ ] Refinar la animación `idle` a nivel artístico y validar visualmente respiración/silueta antes de darla por definitiva.
7. [ ] Crear `walk` derecha del Elementalista masculino (4 frames); después crear `hurt` derecha (4 frames).
8. [ ] QA completo y cierre del Elementalista masculino; después repetir concept → idle → walk → hurt para Elementalista femenino.
9. [ ] Repetir secuencialmente para Brujo, Cazador y Explorador, cada uno masculino y después femenino.
10. [ ] Integrar solo recursos aprobados en los paths de producción y ejecutar los validadores.

## Estado actual — Elementalista masculino
- Diseño de referencia: cabello plateado, manto azul profundo, túnica marfil, ribetes dorados y manos vacías.
- Tira `idle-right-4f.png`: 256×128 px, RGBA y transparencia por píxel; cuatro celdas de 64×128 no vacías y distintas.
- Frames nativos separados: `idle/frames-native-32x64/`, cuatro PNG RGBA de 32×64.
- Ambos recursos están bajo `rework-staging/m/`; no sustituyen los originales ni están conectados al juego.
- **Estado de arte: borrador.** La fuente se extrajo de una referencia compuesta; la calidad y la sutilidad de la animación requieren revisión artística, por lo que no se marca como producción aprobada.
- Próximo checkpoint: trabajar solo `walk` derecha, cuatro frames; después `hurt` derecha.

## Registro de commits
- `3e9cf33` — documentar el rediseño Tier 2 directamente en `main`.
- `f7aa1b5` — separar el plan por personaje y animación.
- `910b6ff` — checkpoint del concept de Elementalista masculino.
- `14d2877` — guardar el primer borrador de idle y su QA en staging.
- `ce888c0` — añadir los cuatro frames nativos RGBA.
- Siguiente commit: reconstruir la tira de idle en RGBA desde los frames nativos.
