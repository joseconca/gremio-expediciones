# Estado de trabajo — rediseño artístico Tier 2

Última actualización: 2026-10-23. Rama activa: `main`.

## Referencia maestra de estilo (aprobada por el usuario)
La imagen adjunta se adopta como estándar visual para todos los sprites pendientes:
- Pixel art RPG detallado, con píxeles deliberados, silueta legible y volumen por luces y sombras.
- Proporciones consistentes con la celda 64×128 y detalles de rostro, cabello, bordados, cuero y metal legibles al tamaño de juego.
- Paleta controlada de sombras profundas y luces cálidas; evitar aspecto vectorial/SVG y formas planas.
- Ropa con capas, pliegues y adornos integrados; cada clase conserva silueta y paleta propias.
- **Personajes sin armas ni herramientas**: manos y cuerpo preparados para el equipamiento por capas.
- Nada de fondos, rótulos ni interfaz en sprites finales.
- No rehacer las clases ya terminadas ahora. La armonización visual global queda para el final, cuando todas las clases pendientes tengan su primer pase.

## Contrato técnico
- Fuentes: `assets/spritesheets/originales/<clase>/v2/source/<clase>-<sexo>-core-3rows.png` (algunas .webp).
- Acciones iniciales: `idle`, `walk`, `hurt`; cuatro fotogramas cada una, orientados a la derecha.
- Atlas runtime de `SPRITESHEETS_PERSONAJES.json`: 256×1920 px; celdas 64×128, cuatro columnas y quince filas.
- Tiras por acción en staging: 256×128 px, cuatro celdas de 64×128. Fuente de revisión: cuatro frames de 32×64.
- Se exige transparencia real. Las tiras pueden permanecer indexadas con índice transparente durante staging; cualquier cambio de formato se documentará y validará.
- Todo permanece aislado en staging hasta QA; no se reemplazan archivos de producción durante los primeros pases.

## Dirección de arte por clase
- **Elementalista:** azul profundo, marfil y oro, telas fluidas y detalles arcanos; manos vacías.
- **Brujo:** carbón/berenjena, capas asimétricas y ribetes violetas; sin libro ni armas.
- **Cazador:** cuero, verde bosque y ocre, protecciones prácticas; sin arco, carcaj ni cuchillas.
- **Explorador:** silueta ligera, capa corta y equipo mínimo; claramente distinto del Cazador; sin armas.

## Orden de trabajo
Por clase, completar masculino y luego femenino: concept → idle (4) → walk (4) → hurt (4) → QA técnico. No detenerse a pedir aprobación intermedia. Después avanzar a la siguiente clase. Tras cubrir las cuatro clases pendientes se hará la pasada final de coherencia del conjunto, incluidos los sprites ya terminados.

## Estado — Elementalista femenino
- Concept art: `rework-staging/f/concept/elementalista-f-concept-96x144.png`.
- `idle-right-4f.png`: 256×128, cuatro celdas 64×128. Se ha restaurado al PNG indexado válido con transparencia explícita; un borrador RGBA incompleto se descartó.
- QA: dimensiones, transparencia, cuatro frames distintos y correspondencia con fuentes nativas comprobados.
- **Estado:** primer pase de idle listo para revisión, no aprobado para producción. Walk y hurt siguen pendientes.
- Siguiente: guardar walk derecho (4 frames), después hurt (4 frames), y pasar a Brujo masculino sin rehacer clases ya terminadas.

## Historial de checkpoints relevantes
- `910b6ff` — concept de Elementalista masculino.
- `7cf8539` — borrador de walk masculino.
- `848b32e` — tira hurt masculino.
- `44b0c84` — concept femenino en staging.
- `6e2ef82` — idle femenino indexado y QA inicial.
- Próximo checkpoint: walk femenino.
