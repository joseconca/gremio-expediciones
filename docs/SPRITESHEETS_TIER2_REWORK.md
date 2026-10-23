# Estado de trabajo — rediseño artístico Tier 2

Última actualización: 2026-10-23. Rama activa: `main`.

## Referencia maestra de estilo
Pixel art RPG detallado, volumen por luces/sombras, contornos nítidos, siluetas legibles y ropa con pliegues. Cada clase mantiene su paleta; personajes base sin armas ni herramientas. No rehacer las clases ya terminadas: la armonización global se hará cuando todas las pendientes tengan primeros pases.

## Contrato técnico
- Acciones: `idle`, `walk`, `hurt`, cuatro frames mirando a la derecha.
- Atlas runtime: 256×1920 px; celdas 64×128.
- Tira expandida: 256×128 y fuente nativa: 128×64, cuatro celdas cada una.
- PNG indexado con transparencia explícita; QA valida dimensiones, transparencia y correspondencia exacta entre tiras y fuentes.
- Todo en staging, sin sustituir assets de producción.

## Estado
- **Elementalista femenino:** concept, idle, walk y hurt guardados como primeros pases.
- **Brujo masculino:** concept, idle y walk guardados. Paleta carbón/berenjena, violeta y plata; sin libro ni armas. Cuatro frames por animación y QA técnico inicial completado.
- Pendiente: hurt masculino del Brujo; luego Brujo femenino, Cazador masculino/femenino y Explorador masculino/femenino.
- La armonización final se aplaza hasta terminar los primeros pases.

## Historial reciente
- `b2b21b6` — primer pase del Elementalista femenino.
- `b82e093` — concept del Brujo masculino.
- `93bdf3b` — idle masculino del Brujo.
- Próximo checkpoint: hurt masculino del Brujo.
