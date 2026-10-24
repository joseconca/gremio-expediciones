# Arte maestro de Novato masculino

`novato-m-character-illustration.png` es la ilustración de personaje independiente en alta resolución para paneles de personaje, menú de equipo, ficha del aventurero y pantallas de información. No es una celda de animación ni se integra directamente en el atlas de combate.

- Formato: PNG indexado con tabla de transparencia (tRNS).
- Dimensiones esperadas: 448 × 1075 px.
- Uso: ilustración grande en UI, mostrada con `object-fit: contain` y fondo transparente.
- Derivado: limpiado de píxeles sueltos externos, recortado con margen transparente y optimizado a paleta; se preserva la ilustración completa, sin armas.
- Fuente generativa de trabajo: la imagen individual adjunta al checkpoint de 2026-10-24; la composición se conserva como recurso separado del pixel art de 128 × 256.

No ampliar ni recortar esta ilustración para generar frames de combate. Los frames se mantienen bajo `frames/<acción>/` y tienen QA/commits propios. La ilustración se usa como máster visual y referencia de identidad.
