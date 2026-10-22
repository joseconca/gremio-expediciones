# Estado de trabajo — rediseño artístico Tier 2

Última actualización: 2026-10-22. Rama de trabajo: `main`.

## Objetivo
Rehacer el arte fuente de Elementalista, Brujo, Cazador y Explorador para que tengan identidad de pixel art coherente con las clases ya refinadas y no parezcan personajes repetidos o hechos con primitivas SVG.

## Contrato técnico confirmado
- Fuente actual: `assets/spritesheets/originales/<clase>/v2/source/<clase>-<sexo>-core-3rows.png` (en algunos personajes .webp).
- Cada máster de origen usa tres filas de animación y cuatro columnas: `idle`, `walk`, `hurt`; cuatro fotogramas por acción.
- Atlas de runtime en `SPRITESHEETS_PERSONAJES.json`: 256×1920 px, celdas de 64×128, cuatro columnas y quince filas.
- Los assets finales requieren RGBA y transparencia real. No deben incluir fondo, rótulos, marcos, armas, arcos, carcajes, cuchillos, bastones ni grimorios; el equipo se superpone en capas independientes.
- No reemplazar assets de producción hasta validar dimensiones, recortes, silueta, variedad de fotogramas y transparencia.
- Las láminas generadas como tablero o presentación son referencias de arte, no spritesheets aptos para integrar directamente.

## Dirección de arte
- **Elementalista:** túnica azul noche/índigo, marfil y oro; detalles de gema y una silueta arcana fluida, manos vacías y sin bastón.
- **Brujo:** capas carbón y berenjena, ribetes violeta y silueta sombría asimétrica; sin libro ni arma.
- **Cazador:** cuero curtido y tejidos verde bosque/ocre, silueta práctica y protecciones de viaje; sin arco, carcaj ni cuchillas.
- **Explorador:** figura ligera y ágil, capa corta y equipo de viaje mínimo, tonos oliva/cuero; diferenciado del Cazador y sin armas.

## Proceso de trabajo acordado
Trabajar **un solo personaje cada vez**, sin pedir a la generación que resuelva toda la familia ni todas las animaciones de golpe. Para cada clase:
1. Concept art del personaje masculino y revisión de su identidad visual.
2. Construir y validar solamente `idle` mirando a la derecha (4 fotogramas).
3. Después construir `walk` mirando a la derecha (4 fotogramas).
4. Después construir `hurt` mirando a la derecha (4 fotogramas).
5. Consolidar fuente, previsualización y QA; solo entonces hacer la versión femenina repitiendo los pasos y pasar a la siguiente clase.

## Plan y checkpoints
1. [x] Inspeccionar el manifiesto, las fuentes Tier 2 y los workflows de generación/refinado.
2. [x] Confirmar el layout de tres acciones × cuatro fotogramas y las celdas de 64×128.
3. [ ] Crear un máster visual final para Elementalista masculino, sin armas ni UI.
4. [ ] Generar y revisar `idle` derecha, en una iteración separada.
5. [ ] Generar y revisar `walk` derecha, en una iteración separada.
6. [ ] Generar y revisar `hurt` derecha, en una iteración separada.
7. [ ] Validar alpha, límites, tamaño, consistencia de poses y cuatro fotogramas distintos por acción.
8. [ ] Versionar checkpoint de Elementalista masculino y repetir el proceso para la versión femenina.
9. [ ] Continuar con Brujo, Cazador y Explorador, realizando commits incrementales.

## Estado actual
- Revisión del repositorio terminada; trabajo en la rama `main`, conforme a la petición del usuario.
- Las fuentes actuales de Brujo, Cazador, Explorador y Elementalista muestran poca variación entre fotogramas y necesitan revisión artística.
- Las imágenes exploratorias de esta sesión mezclan concept art y ejemplos de animación en tableros compuestos. **No se consideran sprites de producción y no deben integrarse en runtime.**
- Se ha aislado una ilustración principal para revisar el diseño de Elementalista masculino: pelo plateado, manto azul profundo, túnica marfil, bordado dorado y manos vacías. La copia de revisión se mantiene fuera de los assets del juego y no sustituye al máster fuente.
- Próximo checkpoint: generar solo los cuatro fotogramas de `idle` mirando a la derecha, con alpha real, después validarlos antes de iniciar `walk`.
- El flujo se ha reducido a un solo personaje y una sola etapa por iteración para evitar acumular arte incompleto o sobrescribir recursos válidos.
