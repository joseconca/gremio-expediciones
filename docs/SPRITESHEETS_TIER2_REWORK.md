# Estado de trabajo — rediseño artístico Tier 2

Última actualización: 2026-10-23. Rama activa: `main`.

## Objetivo
Rehacer el arte fuente de Elementalista, Brujo, Cazador y Explorador con pixel art original coherente con las clases refinadas, evitando personajes repetidos o con aspecto de primitivas SVG.

## Contrato técnico
- Fuentes: `assets/spritesheets/originales/<clase>/v2/source/<clase>-<sexo>-core-3rows.png` (algunas .webp).
- Tres acciones iniciales: `idle`, `walk`, `hurt`, cuatro fotogramas por acción.
- Atlas runtime en `SPRITESHEETS_PERSONAJES.json`: 256×1920 px, celdas de 64×128, cuatro columnas y quince filas.
- Assets finales RGBA con transparencia por píxel, sin fondos ni interfaz; armas y equipo se superponen como capas independientes.
- No reemplazar assets de producción antes de QA de dimensiones, alfa, alineación, continuidad y revisión artística.
- Las láminas con paneles, rótulos y concept art son referencias, no sprites de producción.

## Dirección de arte
- **Elementalista:** azul profundo, marfil y oro; manos vacías.
- **Brujo:** carbón/berenjena, capas asimétricas y violeta; sin libro ni armas.
- **Cazador:** cuero, verde bosque y ocre; sin arco, carcaj ni cuchillas.
- **Explorador:** silueta ligera, capa corta y equipo mínimo; diferenciado del Cazador, sin armas.

## Proceso acordado
Por clase, completar un sexo cada vez: concept art → idle derecha (4 frames) → walk derecha (4 frames) → hurt derecha (4 frames) → QA técnico/artístico y checkpoint; después repetir para el otro sexo. Todo permanece en staging hasta su aprobación.

## Plan y checkpoints
1. [x] Inspeccionar manifiesto, fuentes Tier 2 y workflows.
2. [x] Confirmar acciones, cuatro fotogramas y celdas de 64×128.
3. [x] Preparar referencia de Elementalista masculino.
4. [x] Crear borrador idle derecha: tira RGBA 256×128 y cuatro frames nativos RGBA de 32×64.
5. [x] Crear borrador walk derecha: tira RGBA 256×128 y cuatro frames nativos RGBA de 32×64.
6. [x] Crear borrador hurt derecha: cuatro frames nativos RGBA de 32×64.
7. [x] Generar tira hurt RGBA de 256×128 y comprobar que cada celda coincide con su frame nativo escalado por vecino más próximo.
8. [ ] Refinar artísticamente los tres ciclos del Elementalista masculino y revisar el concept: pose, silueta, timing visual y continuidad.
9. [ ] Cerrar QA artístico/técnico del Elementalista masculino; después hacer Elementalista femenino con concept → idle → walk → hurt.
10. [ ] Repetir secuencialmente para Brujo, Cazador y Explorador, cada uno masculino y después femenino.
11. [ ] Integrar solo recursos aprobados en producción y ejecutar validadores.

## Estado actual — Elementalista masculino
- Referencia: pelo plateado, manto azul profundo, túnica marfil, ribetes dorados y manos vacías.
- `idle-right-4f.png`, `walk-right-4f.png` y `hurt-right-4f.png`: tiras RGBA de 256×128 px, cuatro celdas de 64×128 con transparencia por píxel.
- Cada acción tiene cuatro PNG nativos RGBA de 32×64.
- QA técnico del hurt: dimensiones, alfa, celdas no vacías y coincidencia con los cuatro frames nativos comprobados.
- **Estado artístico: borrador, no aprobado para producción.** El idle y el walk tienen poco movimiento y el hurt necesita una reacción más legible; además, la referencia conceptual debe acercarse más al acabado de las clases aprobadas.
- Todo permanece en `rework-staging/m/`; no se han sobrescrito assets originales ni conectado recursos nuevos al runtime.
- Siguiente: revisar/refinar las tres acciones masculinas; después hacer el concept femenino y sus animaciones.

## Registro de commits
- `3e9cf33` — documentar el rediseño Tier 2 en `main`.
- `f7aa1b5` — separar el plan por personaje y animación.
- `910b6ff` — checkpoint de concept masculino.
- `14d2877` — primer borrador idle.
- `ce888c0` — frames nativos idle.
- `e2f1dad` — tira RGBA idle.
- `7cf8539` — borrador walk y frames nativos RGBA.
- `29aa148` — frames nativos hurt y QA inicial.
- `848b32e` — tira hurt RGBA ampliada, QA técnico comprobado y plan actualizado.
- Próximo checkpoint: arte refinado del Elementalista masculino; los borradores actuales siguen sin aprobarse para producción.
