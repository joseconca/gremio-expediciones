# Estado de trabajo — rediseño artístico Tier 2

Última actualización: 2026-10-23. Rama activa: `main`.

## Referencia maestra de estilo
La imagen aprobada por el usuario es el estándar de todos los sprites pendientes: pixel art RPG detallado, volumen por luces/sombras, contornos nítidos, siluetas legibles, ropa con pliegues y adornos integrados. Cada clase mantiene paleta propia y todos los personajes base van sin armas ni herramientas. La armonización de clases ya terminadas se pospone hasta el final.

## Contrato técnico
- `idle`, `walk`, `hurt`: cuatro frames por acción mirando a la derecha.
- Atlas runtime: 256×1920 px; celdas 64×128.
- Tira expandida: 256×128 con cuatro celdas 64×128; fuente nativa: 128×64 con cuatro celdas 32×64.
- PNG indexado con transparencia explícita; QA valida dimensiones, transparencia, frames distintos y coincidencia de escalado exacta.
- Todo permanece en staging hasta QA final; no se reemplazan assets de producción.

## Estado
- **Elementalista femenino:** concept, idle, walk y hurt listos como primeros pases en staging. QA técnico inicial completado; armonización artística aplazada.
- **Brujo masculino:** concept en `rework-staging/m/concept/brujo-m-concept-128x192.png`; idle en `idle-right-4f.png` más `idle-native-4f.png`, con cuatro frames, transparencia explícita y QA inicial.
- Próximo: walk y hurt del Brujo masculino, después Brujo femenino; seguir con Cazador y Explorador, primero masculino y luego femenino.
- No rehacer clases ya terminadas: la pasada de coherencia será al final, después de los primeros pases de todas las pendientes.

## Historial reciente
- `b2b21b6` — cerrar primer pase del Elementalista femenino.
- `b82e093` — concept del Brujo masculino.
- Próximo checkpoint: walk del Brujo masculino.
