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
- **Cazador masculino:** concept creado como preview 128×192 en staging; el máster RGBA 1114×1412 queda archivado en la biblioteca con SHA-256. Se conserva además una segunda variante de alta resolución. No tiene armas ni herramientas. Idle, walk y hurt pendientes.
- **Siguiente:** Cazador masculino: idle → walk → hurt, cuatro frames mirando a la derecha; después Cazador femenino, Explorador masculino y Explorador femenino. No rehacer clases ya terminadas.
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
- Próximo checkpoint: idle del Cazador masculino.
- Próximo checkpoint: concept del Cazador masculino.
