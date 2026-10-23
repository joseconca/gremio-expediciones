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

- **Elementalista femenino:** concept, idle, walk y hurt guardados como primeros pases en staging. QA técnico inicial completado; la armonización artística se hará al final.
- **Brujo masculino:** concept, idle, walk y hurt guardados en staging; cuatro fotogramas por acción. Tiras 256×128, fuentes nativas 128×64 y QA de transparencia/dimensiones/coincidencia tira-fuente. No conectado al runtime.
- **Originales de alta resolución:** concept 1114×1412; idle, walk y hurt 1983×793. Los cuatro PNG exactos están preservados en la biblioteca en `/GameAssets/Tier2/Brujo/brujo-m-originales-alta-resolucion.zip`. Sus hashes SHA-256 se registran en `assets/spritesheets/originales/brujo/v2/source-hires/manifest.json`. El idle grande lleva el damero de transparencia horneado como fondo opaco; se conserva como referencia y no debe usarse directamente como sprite transparente.
- **Siguiente:** Brujo femenino (concept → idle → walk → hurt), después Cazador y Explorador, cada uno masculino y femenino, sin rehacer clases ya terminadas.
- La pasada global de coherencia visual queda para el final, cuando estén listos los primeros pases de todas las clases pendientes.

## Historial reciente
- `b2b21b6` — primer pase del Elementalista femenino.
- `b82e093` — concept del Brujo masculino.
- `bd2eada` — idle masculino del Brujo.
- `6c5562b` — hurt masculino del Brujo, cuatro frames y QA técnico.
- `26a001e` — restaurar fuente nativa de walk y sincronizar el estado.
- Próximo checkpoint: concept del Brujo femenino; las fuentes grandes exactas están archivadas aparte.
