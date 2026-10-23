# Estado de trabajo — rediseño artístico Tier 2

Última actualización: 2026-10-23. Rama activa: `main`.

## Referencia maestra de estilo
Se usa la imagen aprobada por el usuario como estándar para todos los sprites pendientes: pixel art RPG detallado, sombras con volumen, siluetas legibles, prendas con capas y pliegues, adornos bien integrados, transparencia y cero armas/herramientas. El Elementalista usa azul/marfil/oro; otras clases conservan paletas y siluetas propias. No rehacer clases ya terminadas hasta la pasada global al final.

## Contrato técnico
- Acciones: `idle`, `walk`, `hurt`, cuatro frames por acción hacia la derecha.
- Atlas runtime: 256×1920 px, celdas 64×128, cuatro columnas y quince filas.
- Staging: tira 256×128 por acción, cuatro celdas; frames fuente 32×64.
- Los borradores pueden ser PNG indexados con índice transparente explícito. Se validan dimensiones, transparencia, frames distintos y correspondencia tira/fuentes antes de aprobarlos.
- Mantener staging aislado; no reemplazar sprites de producción.

## Dirección por clase
- **Elementalista:** azul profundo, marfil y oro; sin armas.
- **Brujo:** carbón/berenjena, capas asimétricas, violeta/amethyst y detalles plateados; sin libro ni armas.
- **Cazador:** cuero, verde bosque y ocre; sin arco/carcaj/cuchillas.
- **Explorador:** ropa ligera, capa corta y equipo mínimo; distinto del Cazador, sin armas.

## Progreso
- **Elementalista femenino:** concept, idle, walk y hurt en staging. Los tres ciclos tienen cuatro frames; QA técnico básico completado. La armonización artística se deja para el final.
- **Brujo masculino:** concept creado y guardado en `rework-staging/m/concept/brujo-m-concept-128x192.png`; cabello negro con mecha violeta, ojos púrpura, túnicas carbón/berenjena, bordados plateados y gemas amatista, manos vacías. QA de dimensiones/transparencia sin aprobación de runtime.
- Siguiente: Brujo masculino — idle → walk → hurt, cuatro frames cada una, después comenzar Brujo femenino.

## Historial reciente
- `fcf857c` — restaurar idle femenino válido y registrar la guía de estilo.
- `49e20bc` — walk femenino y QA.
- `b2b21b6` — hurt femenino y QA.
- Próximo checkpoint: concept de Brujo masculino.
