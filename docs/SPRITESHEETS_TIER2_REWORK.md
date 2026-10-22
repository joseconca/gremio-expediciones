# Estado de trabajo — rediseño artístico Tier 2

Última actualización: 2026-10-22. Rama activa: `main`.

## Objetivo
Rehacer el arte fuente de Elementalista, Brujo, Cazador y Explorador con pixel art original coherente con las clases refinadas, evitando personajes repetidos o con aspecto de primitivas SVG.

## Contrato técnico
- Fuentes actuales: `assets/spritesheets/originales/<clase>/v2/source/<clase>-<sexo>-core-3rows.png` (algunas fuentes son .webp).
- Tres acciones iniciales: `idle`, `walk`, `hurt`, con cuatro frames por acción.
- Atlas runtime definido en `SPRITESHEETS_PERSONAJES.json`: 256×1920 px, celdas de 64×128, cuatro columnas y quince filas.
- Los assets finales deben tener transparencia real, modo RGBA y no incluir fondos ni interfaz; tampoco armas, bastones, grimorios, arcos, carcajes ni cuchillos, porque el equipo va en capas independientes.
- No reemplazar assets de producción hasta pasar QA de dimensiones, alfa, alineación, continuidad de poses y revisión visual.
- Las láminas con paneles, rótulos y arte conceptual son referencias, nunca sprites de producción.

## Dirección de arte
- **Elementalista:** azul profundo, marfil y oro, túnicas fluidas y detalles arcanos; manos vacías.
- **Brujo:** carbón/berenjena, capas asimétricas y ribetes violetas; sin libro ni armas.
- **Cazador:** cuero, verde bosque y ocre, protecciones prácticas; sin arco, carcaj ni cuchillas.
- **Explorador:** silueta ligera, capa corta y equipo de viaje mínimo; debe distinguirse del Cazador y no llevar armas.

## Proceso acordado
Para cada clase, terminar un sexo antes de iniciar el siguiente: concept art → idle derecha (4 frames) → caminar derecha (4 frames) → recibir daño derecha (4 frames) → QA y checkpoint; después repetir para el sexo restante. Solo entonces pasar a la siguiente clase.

## Plan y checkpoints
1. [x] Inspeccionar manifiesto, fuentes Tier 2 y workflows del repositorio.
2. [x] Confirmar el layout de tres acciones y cuatro fotogramas con celdas 64×128.
3. [x] Preparar referencia visual del Elementalista masculino.
4. [x] Crear un primer borrador de `idle` derecha en staging y extraer cuatro frames nativos RGBA de 32×64.
5. [ ] Revisar/refinar el arte y confirmar que los cuatro poses forman un idle natural; verificar alineación y canal alfa.
6. [ ] Construir una tira ampliada 256×128 en RGBA desde los frames nativos y validar la comparación por celda.
7. [ ] Solo tras aprobar `idle`, avanzar a `walk` derecha (4 frames) y luego `hurt` derecha (4 frames).
8. [ ] QA completo y checkpoint de Elementalista masculino; después repetir concept → idle → walk → hurt para Elementalista femenino.
9. [ ] Repetir secuencialmente para Brujo, Cazador y Explorador, cada uno masculino y después femenino.
10. [ ] Integrar solo los recursos aprobados en los paths del pipeline y ejecutar validadores del proyecto.

## Estado actual — Elementalista masculino
- Concepto de referencia: cabello plateado, manto azul profundo, túnica marfil, ribetes dorados y manos vacías.
- Tira preliminar: `assets/spritesheets/originales/elementalista/v2/rework-staging/m/idle-right-4f.png` (256×128, transparencia indexada; no runtime).
- Frames nativos separados: `assets/spritesheets/originales/elementalista/v2/rework-staging/m/idle/frames-native-32x64/` (cuatro PNG RGBA de 32×64 con transparencia real).
- El informe QA documenta explícitamente que el arte todavía es borrador: procede de una referencia compuesta, las poses idle son sutiles y requieren revisión artística.
- No se ha sobrescrito ninguna fuente original ni ningún spritesheet usado por el juego.
- Próximo paso: revisar y mejorar el idle masculino; generar su tira RGBA ampliada y pasar QA antes de iniciar `walk`.

## Registro de commits
- `3e9cf33` — documentar el rediseño Tier 2 directamente en `main`.
- `f7aa1b5` — separar el plan por personaje y animación.
- `910b6ff` — checkpoint del concept de Elementalista masculino.
- `14d2877` — guardar el primer borrador de idle y su QA en staging.
- Siguiente: añadir los cuatro frames nativos RGBA y actualizar QA/estado.
