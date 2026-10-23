# Estado de trabajo — rediseño artístico Tier 2

Última actualización: 2026-10-23. Rama activa: `main`.

## Referencia maestra de estilo
Pixel art RPG detallado, volumen por luces y sombras, contornos nítidos, silueta legible, tejidos con pliegues y adornos integrados. Cada clase conserva paleta propia. Todos los personajes base van sin armas ni herramientas. La armonización de clases ya terminadas se reserva para el final.

## Contrato técnico
- Acciones: `idle`, `walk`, `hurt`; cuatro frames por acción hacia la derecha.
- Atlas runtime: 256×1920, celdas 64×128.
- Tira expandida: 256×128, cuatro celdas 64×128; fuente nativa: 128×64, cuatro celdas 32×64.
- PNG indexado con transparencia explícita. QA valida tamaños, transparencia, cuatro poses distintas y correspondencia exacta de escalado entre la fuente y la tira expandida.
- Mantener assets en staging hasta QA final; no reemplazar producción.

## Estado
- **Elementalista femenino:** concept, idle, walk y hurt están en staging; QA técnico inicial listo. Revisión visual conjunta al final.
- **Brujo masculino:** concept, idle y walk en staging. Paleta carbón/berenjena, violeta y plata; filigrana y gemas; sin libro ni armas. Los ciclos tienen cuatro frames y las tiras coinciden con sus fuentes nativas.
- **Brujo masculino hurt** pendiente; después Brujo femenino, Cazador masculino/femenino y Explorador masculino/femenino.
- No rehacer sprites ya terminados. La pasada de coherencia se hará tras los primeros pases de todas las clases pendientes.

## Historial reciente
- `b2b21b6` — primer pase de Elementalista femenino cerrado.
- `b82e093` — concept del Brujo masculino.
- `bd2eada` — idle del Brujo masculino.
- Próximo checkpoint: hurt del Brujo masculino.
