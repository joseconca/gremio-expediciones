# Estado de trabajo — rediseño artístico Tier 2

Última actualización: 2026-10-22. Rama activa: `main`.

## Objetivo
Rehacer el arte fuente de Elementalista, Brujo, Cazador y Explorador con pixel art original coherente con las clases refinadas, evitando personajes repetidos o con aspecto de primitivas SVG.

## Contrato técnico
- Fuentes actuales: `assets/spritesheets/originales/<clase>/v2/source/<clase>-<sexo>-core-3rows.png` (algunas fuentes son .webp).
- Tres acciones iniciales: `idle`, `walk`, `hurt`, con cuatro frames por acción.
- Atlas runtime definido en `SPRITESHEETS_PERSONAJES.json`: 256×1920 px, 64×128 por celda, 4 columnas y 15 filas.
- Los sprites finales deben tener transparencia real y modo RGBA, sin fondo ni interfaz; tampoco deben incluir armas, bastones, grimorios, arcos, carcajes ni cuchillos, pues el equipo va en capas separadas.
- No reemplazar assets de producción hasta pasar QA de dimensiones, alfa, alineación, continuidad de poses y revisión visual.
- Las láminas con paneles, texto y arte conceptual solo son referencias, nunca sprites finales.

## Dirección de arte
- **Elementalista:** azul profundo, marfil y oro, túnicas fluidas, detalles arcanos; manos vacías.
- **Brujo:** carbón/berenjena, capas asimétricas y ribetes violetas; sin libro ni armas.
- **Cazador:** cuero, verde bosque y ocre, protecciones prácticas; sin arco, carcaj ni cuchillas.
- **Explorador:** silueta ligera, capa corta y equipo de viaje mínimo; diferenciación clara frente al Cazador; sin armas.

## Proceso acordado
Para cada clase, terminar un sexo antes de iniciar el siguiente: concept art → idle derecha (4 frames) → caminar derecha (4 frames) → recibir daño derecha (4 frames) → QA y commit; después repetir para el sexo restante. Solo entonces pasar a la siguiente clase.

## Plan y checkpoints
1. [x] Inspeccionar manifiesto, fuentes Tier 2 y workflows del repositorio.
2. [x] Confirmar tres filas iniciales y celdas de 64×128.
3. [x] Preparar referencia visual para Elementalista masculino.
4. [x] Crear un primer borrador de `idle` derecha para Elementalista masculino en staging (4 celdas de 64×128).
5. [ ] Revisar y rehacer los detalles del borrador si hace falta; convertir a RGBA y confirmar alfa contra el pipeline real.
6. [ ] Crear `walk` derecha del Elementalista masculino (4 frames).
7. [ ] Crear `hurt` derecha del Elementalista masculino (4 frames).
8. [ ] QA completo y checkpoint final del Elementalista masculino; después concept → idle → walk → hurt para Elementalista femenino.
9. [ ] Repetir secuencialmente para Brujo, Cazador y Explorador, primero masculino y luego femenino.
10. [ ] Integrar únicamente recursos aprobados en los paths finales del pipeline y ejecutar los validadores del proyecto.

## Estado actual — Elementalista masculino
- Concepto: cabello plateado, manto azul profundo, túnica marfil con ribetes dorados y manos vacías.
- Primer borrador `idle` hacia la derecha guardado en `assets/spritesheets/originales/elementalista/v2/rework-staging/m/idle-right-4f.png`.
- La tira mide 256×128 px y contiene cuatro celdas distintas de 64×128 con transparencia de índice PNG. **Todavía no está en modo RGBA y no está aprobada para runtime**; su informe QA deja explícita esta limitación y requiere revisión visual porque la fuente de trabajo procede de una referencia compuesta.
- El asset queda en `rework-staging`; no sustituye las fuentes ni altera los sprites cargados por el juego.
- Próximo paso: perfeccionar y validar únicamente esta animación antes de avanzar a `walk`.

## Registro de commits
- `3e9cf33` — documentar el plan de rediseño Tier 2 directamente en `main`.
- `f7aa1b5` — reducir el flujo a una clase y una animación por iteración.
- `910b6ff` — checkpoint del concepto de Elementalista masculino.
- Siguiente commit: primer borrador de `idle` derecha y su informe QA, ambos en staging.
