# Estado de trabajo — rediseño artístico Tier 2

Última actualización: 2026-10-23. Rama activa: `main`.

## Referencia maestra de estilo (aprobada por el usuario)
La imagen adjunta de Elementalista femenino/masculino se adopta como **estándar visual para todos los sprites pendientes**:
- Pixel art RPG de alta definición, con píxeles deliberados, silueta legible y volumen por luces/sombras.
- Proporciones y contorno consistentes con la escala de celda 64×128; detalles de rostro, cabello, bordados, cuero y metal legibles al tamaño del juego.
- Paleta controlada con sombras profundas y luces cálidas, sin degradados suaves que parezcan vectoriales ni formas planas tipo SVG.
- Ropa con varias capas, pliegues y adornos integrados; cada clase conserva una silueta y paleta propia.
- Personajes con manos/cuerpo preparados para equipo por capas. **Sin armas, libros, arcos, carcajes ni herramientas** en el sprite base.
- Mantener transparencia real; ninguna lámina de presentación con fondo, rótulos o UI entra en producción.
- **No rehacer clases que ya estaban terminadas ahora.** La armonización visual de los sprites ya acabados queda para una pasada global al final, cuando estén listos los primeros pases de todas las clases pendientes.

## Contrato técnico
- Fuentes: `assets/spritesheets/originales/<clase>/v2/source/<clase>-<sexo>-core-3rows.png` (algunas .webp).
- Tres acciones iniciales: `idle`, `walk`, `hurt`, cuatro fotogramas por acción.
- Atlas runtime en `SPRITESHEETS_PERSONAJES.json`: 256×1920 px, celdas de 64×128, cuatro columnas y quince filas.
- Tiras de staging: 256×128 por acción; cuatro celdas de 64×128. Fuentes de revisión: cuatro frames de 32×64.
- Los sprites finales deben tener canal alfa real y estar aislados del fondo; armas y equipo se superponen como capas independientes.
- Todo permanece en staging hasta QA. No se reemplazan recursos en producción mientras se hacen primeros pases.

## Dirección de arte por clase
- **Elementalista:** azul profundo, marfil y oro, túnicas fluidas y detalles arcanos; manos vacías.
- **Brujo:** carbón/berenjena, capas asimétricas y ribetes violetas; sin libro ni armas.
- **Cazador:** cuero, verde bosque y ocre, protecciones prácticas; sin arco, carcaj ni cuchillas.
- **Explorador:** silueta ligera, capa corta y equipo mínimo; diferenciación clara frente al Cazador; sin armas.

## Orden de trabajo
Por clase, terminar el primer pase masculino y después el femenino: concept → idle derecha (4) → walk derecha (4) → hurt derecha (4) → QA técnico. No detenerse esperando aprobación intermedia. Después pasar a la siguiente clase. Con los primeros pases de las cuatro clases completados, hacer la pasada final de coherencia visual para los sprites nuevos y los ya terminados.

## Estado actual — Elementalista femenino
- Concept art guardado en `rework-staging/f/concept/elementalista-f-concept-96x144.png`.
- `idle-right-4f.png`: tira RGBA 256×128; cuatro celdas de 64×128.
- Las fuentes nativas indexadas previas se conservan. QA confirma transparencia, cuatro frames no vacíos y distintos y correspondencia exacta con las celdas ampliadas.
- **Estado:** primer pase de idle creado; revisión artística pendiente, no es aún un asset conectado a runtime.
- Siguiente: crear walk y hurt con el mismo estándar, validar ambos, terminar Elementalista femenino, y continuar con Brujo masculino/femenino, Cazador masculino/femenino y Explorador masculino/femenino.

## Historial de commits
- `3e9cf33` — documentar el rediseño Tier 2.
- `f7aa1b5` — plan por personaje/animación.
- `910b6ff` — concept masculino.
- `14d2877` — borrador idle masculino.
- `ce888c0` — frames nativos idle masculino.
- `e2f1dad` — tira RGBA idle masculino.
- `7cf8539` — borrador walk masculino.
- `29aa148` — frames nativos hurt masculino.
- `848b32e` — tira hurt RGBA.
- `1c3724d` — QA de hurt y estado artístico.
- `44b0c84` — concept femenino.
- `6e2ef82` — idle femenino indexado y QA inicial.
- Siguiente checkpoint: sustituir la tira indexada de idle femenino por la exportación RGBA y mantener el QA sincronizado.
