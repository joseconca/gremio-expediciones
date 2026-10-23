# Estado de trabajo — rediseño artístico Tier 2

Última actualización: 2026-10-23. Rama activa: `main`.

## Referencia maestra de estilo (aprobada por el usuario)
La imagen adjunta es el estándar de los sprites pendientes: pixel art RPG detallado, volumen mediante luces/sombras, contornos y silueta legibles, ropa con pliegues y adornos integrados, paleta profunda azul/marfil/oro para Elementalista, sin armas ni herramientas. Cada clase conserva su propia silueta y paleta. No se rehacen los sprites ya terminados: la armonización global se hará al final, tras tener los primeros pases de todas las clases pendientes.

## Contrato técnico
- Tres acciones: `idle`, `walk`, `hurt`; cuatro fotogramas por acción, mirando a la derecha.
- Atlas runtime: 256×1920 px; celdas 64×128, cuatro columnas, quince filas.
- Tiras de revisión: 256×128, cuatro celdas. Frames nativos: 32×64.
- PNG de staging puede usar transparencia por índice explícito; se valida el tamaño, el alfa/transparencia, los cuatro frames y la correspondencia entre tira y fuentes.
- Mantener todo bajo `rework-staging`; no reemplazar assets de producción durante los primeros pases.

## Dirección de arte
- **Elementalista:** azul profundo, marfil y oro; túnicas fluidas, manos vacías.
- **Brujo:** carbón/berenjena, capas asimétricas y violeta; sin libro ni armas.
- **Cazador:** cuero, verde bosque y ocre; sin arco, carcaj ni cuchillas.
- **Explorador:** ágil, capa corta, equipo mínimo; distinto del Cazador y sin armas.

## Estado — Elementalista femenino
- Concept art: `rework-staging/f/concept/elementalista-f-concept-96x144.png`.
- `idle-right-4f.png`: primer pase, 4 fotogramas, 256×128, transparencia indexada validada.
- `walk-right-4f.png`: primer pase, 4 fotogramas, 256×128; las cuatro celdas coinciden con los frames nativos indexados escalados por vecino más próximo.
- `hurt` pendiente.
- No está conectado al runtime; la revisión artística final se pospone hasta completar los primeros pases del resto de clases.

## Orden
Por clase: masculino → femenino; concept → idle → walk → hurt → QA. Continuar sin esperar aprobaciones intermedias. Tras Elementalista, seguir con Brujo, Cazador y Explorador. Después hacer la pasada de armonización de todos los sprites pendientes y ya terminados.

## Historial reciente
- `44b0c84` — concept femenino.
- `6e2ef82` — idle femenino indexado y QA inicial.
- `fcf857c` — restaurar idle femenino validado y fijar la guía de estilo.
- Próximo checkpoint: hurt femenino.
