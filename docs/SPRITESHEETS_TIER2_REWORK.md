# Estado de trabajo — rediseño artístico Tier 2

Última actualización: 2026-10-23. Rama activa: `main`.

## Referencia maestra de estilo
La imagen aprobada por el usuario es el estándar de todos los sprites pendientes: pixel art RPG detallado, volumen por luces/sombras, contornos nítidos, siluetas legibles, ropa con pliegues y adornos integrados. Las clases conservan paletas propias y todos los personajes base van sin armas ni herramientas. Las clases ya terminadas no se rehacen ahora; la armonización global se hará al final.

## Contrato técnico
- Acciones: `idle`, `walk`, `hurt`, cuatro frames por acción hacia la derecha.
- Atlas runtime: 256×1920 px; celdas 64×128.
- Tira expandida: 256×128 con cuatro celdas 64×128. Fuente nativa de cada acción: tira 128×64 con cuatro celdas 32×64.
- PNG indexado con transparencia explícita; QA valida dimensiones, transparencias, distinción de frames y que cada celda expandida coincida con su fuente nativa.
- Todo se queda en staging hasta revisión y QA final.

## Estado de trabajo
- **Elementalista femenino:** concept, idle, walk y hurt listos como primeros pases en staging. Revisión artística final aplazada.
- **Brujo masculino:** concept guardado en `rework-staging/m/concept/brujo-m-concept-128x192.png`; idle derecho guardado como tira 256×128 más fuente nativa 128×64. Paleta carbón/violeta/plata, filigrana, amatistas y manos vacías. QA técnico inicial completado.
- Siguiente: walk y hurt del Brujo masculino, después Brujo femenino; luego Cazador y Explorador, cada uno masculino y femenino.
- No se rehacen ahora los sprites ya terminados: la armonización global se hará cuando todos los primeros pases pendientes estén listos.

## Historial reciente
- `b2b21b6` — cerrar primer pase del Elementalista femenino.
- `b82e093` — concept del Brujo masculino.
- Próximo checkpoint: walk del Brujo masculino.
