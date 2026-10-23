# Estado de trabajo — rediseño artístico Tier 2

Última actualización: 2026-10-23. Rama activa: `main`.

## Referencia maestra de estilo
La imagen aprobada por el usuario es el estándar de todos los sprites pendientes: pixel art RPG detallado, volumen mediante luces y sombras, contornos nítidos, siluetas legibles y prendas con pliegues/adornos. Cada clase conserva su paleta. Todos los personajes base van sin armas ni herramientas. No rehacer clases ya terminadas: la armonización global se realizará al final.

## Contrato técnico
- Acciones: `idle`, `walk`, `hurt`; cuatro frames mirando a la derecha.
- Atlas runtime: 256×1920 px, celdas de 64×128.
- Tira expandida: 256×128 con cuatro celdas 64×128; fuente nativa: 128×64 con cuatro celdas 32×64.
- Staging indexado con transparencia explícita; QA valida dimensiones, transparencia, diferencia entre frames y correspondencia entre tira/fuente.
- No reemplazar sprites de producción hasta la revisión final.

## Estado actual

- **Elementalista femenino:** concept, idle, walk y hurt guardados como primeros pases en staging. QA técnico inicial completado; la armonización artística queda para el final.
- **Brujo masculino:** concept, idle, walk y hurt en staging, cuatro frames por acción y QA técnico inicial. Los originales grandes exactos están preservados en `/GameAssets/Tier2/Brujo/brujo-m-originales-alta-resolucion.zip`.
- **Brujo femenino:** concept, idle, walk y hurt completos como primer pase en staging. Cada acción tiene cuatro frames, fuente nativa de 32×64 y tira ampliada de 256×128; QA técnico verifica dimensiones, transparencia y correspondencia de las celdas. Sus másteres grandes están en la biblioteca con SHA-256 en `assets/spritesheets/originales/brujo/v2/source-hires/female-manifest.json`. El source original de walk tenía el damero incrustado; el original está preservado intacto y hay una derivación con transparencia real.
- **Cazador masculino:** concept de 128×192 en staging; máster RGBA 1114×1412 y variante adicional archivados en la biblioteca con SHA-256. El ciclo `idle` ya está en staging con cuatro frames hacia la derecha, tira 256×128, fuente nativa 128×64 y QA que verifica dimensiones/transparencia y correspondencia de escalado. También se conserva el strip original de alta resolución 1984×793, separado del runtime. No se han añadido armas.
- **Siguiente:** Cazador masculino `walk` y `hurt` (cuatro frames por acción); después Cazador femenino y Explorador masculino/femenino. No rehacer clases ya terminadas.
- La pasada global de coherencia visual se hará al final, con los primeros pases de todas las clases pendientes listos.

## Historial reciente
- `b2b21b6` — primer pase del Elementalista femenino.
- `b82e093` — concept del Brujo masculino.
- `bd2eada` — idle masculino del Brujo.
- `6c5562b` — hurt masculino del Brujo, cuatro frames y QA técnico.
- `26a001e` — restaurar fuente nativa de walk y sincronizar el estado.
- `c662701` — idle femenino del Brujo y máster hires catalogado.
- `21310ba` — walk femenino del Brujo, original y derivación transparente preservados.
- `ff880fd` — hurt femenino del Brujo.
- `cc90f8b` — concept masculino del Cazador, preview, QA y manifiesto de masters.
- `cc90f8b` — concept masculino del Cazador, preview, QA y manifiesto de masters.
- `f0c892c` — idle masculino del Cazador con QA y masters hires catalogados.
- `2461926` — walk masculino del Cazador con cuatro frames y masters de alta resolución archivados.
- `c17a332` — primer pase completo del Cazador masculino (idle, walk, hurt), masters hires y QA.
- `c4d038d` — concept femenino del Cazador con master hires y QA.
- `fba3f66` — idle femenino del Cazador con master hires y QA.
- `e2bbd28` — walk femenino del Cazador y máster hires.
- `9623aa4` — primer pase completo de Cazador femenino, masters hires y QA.
- `6611e9b` — concept masculino del Explorador con original y derivación transparente.
- `97202c2` — idle masculino del Explorador, master hires y QA.
- `WALK-MALE-EXPLORER` — walk masculino del Explorador, cuatro frames, master hires y QA técnico.
