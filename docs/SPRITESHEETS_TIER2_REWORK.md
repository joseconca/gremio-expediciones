# Estado de trabajo — rediseño artístico Tier 2

Última actualización: 2026-10-22. Rama activa: `main`.

## Objetivo
Rehacer el arte fuente de Elementalista, Brujo, Cazador y Explorador con pixel art original coherente con las clases refinadas, evitando personajes repetidos o con aspecto de primitivas SVG.

## Contrato técnico
- Fuentes: `assets/spritesheets/originales/<clase>/v2/source/<clase>-<sexo>-core-3rows.png` (algunas .webp).
- Tres acciones iniciales: `idle`, `walk`, `hurt`, cuatro fotogramas por acción.
- Atlas runtime en `SPRITESHEETS_PERSONAJES.json`: 256×1920 px, celdas de 64×128, cuatro columnas y quince filas.
- Assets finales en RGBA, con transparencia por píxel, sin fondos ni interfaz; armas y equipo van en capas independientes.
- No reemplazar assets de producción antes de QA dimensional, alfa, alineación, continuidad y revisión artística.
- Las láminas con paneles o rótulos solo son referencias, no sprites de producción.

## Dirección de arte
- **Elementalista:** azul profundo, marfil y oro; manos vacías.
- **Brujo:** carbón/berenjena, capas asimétricas y violeta; sin libro ni armas.
- **Cazador:** cuero, verde bosque y ocre; sin arco, carcaj ni cuchillas.
- **Explorador:** silueta ligera, capa corta y equipo mínimo; diferenciado del Cazador, sin armas.

## Proceso acordado
Por clase, completar un sexo cada vez: concept art → idle derecha (4 frames) → walk derecha (4 frames) → hurt derecha (4 frames) → QA y checkpoint; después repetir para el otro sexo. Todo permanece en staging hasta su aprobación.

## Plan y checkpoints
1. [x] Inspeccionar manifiesto, fuentes Tier 2 y workflows.
2. [x] Confirmar las tres acciones, cuatro fotogramas y celdas de 64×128.
3. [x] Preparar referencia visual de Elementalista masculino.
4. [x] Crear borrador de idle derecha: cuatro frames nativos RGBA de 32×64 y tira RGBA de 256×128.
5. [x] Crear borrador de walk derecha: cuatro frames nativos RGBA de 32×64 y tira RGBA de 256×128.
6. [x] Crear cuatro frames nativos RGBA de hurt derecha.
7. [ ] Generar y validar la tira ampliada RGBA de hurt (256×128); refinar artísticamente las tres acciones masculinas.
8. [ ] Completar Elementalista femenino con concept → idle → walk → hurt.
9. [ ] Repetir secuencialmente para Brujo, Cazador y Explorador, cada uno masculino y después femenino.
10. [ ] Integrar solo recursos aprobados en producción y ejecutar los validadores.

## Estado actual — Elementalista masculino
- Diseño de referencia: cabello plateado, manto azul profundo, túnica marfil, ribetes dorados y manos vacías.
- `idle-right-4f.png` y `walk-right-4f.png`: tiras RGBA de 256×128 con cuatro celdas no vacías y distintas; ambas tienen frames nativos RGBA de 32×64.
- `hurt/frames-native-32x64/`: cuatro frames nativos RGBA de 32×64. La tira ampliada hurt aún está pendiente de inclusión y validación en GitHub.
- **Estado de arte: borradores, no aprobados para producción.** Idle requiere más micro-movimiento, walk más claridad en apoyos de las piernas y hurt una reacción más legible.
- Todo sigue bajo `rework-staging/m/`; no se han sobrescrito fuentes originales ni sprites de runtime.
- Próximo paso: terminar la tira RGBA de hurt, revisar las tres acciones masculinas y después pasar al concept del Elementalista femenino.

## Registro de commits
- `3e9cf33` — documentar el rediseño Tier 2 en `main`.
- `f7aa1b5` — separar el plan por personaje y animación.
- `910b6ff` — checkpoint del concepto masculino.
- `14d2877` — primer borrador idle.
- `ce888c0` — frames nativos RGBA idle.
- `e2f1dad` — tira ampliada RGBA idle.
- `7cf8539` — borrador walk y frames nativos RGBA.
- Siguiente commit: frames nativos RGBA de hurt con QA actualizado.
