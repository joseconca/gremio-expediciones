# Estado de trabajo — rediseño artístico Tier 2

Última actualización: 2026-10-22. Rama de trabajo: `main`.

## Objetivo
Rehacer el arte fuente de Elementalista, Brujo, Cazador y Explorador para que dejen de parecer personajes repetidos o dibujados con primitivas SVG y tengan identidad de pixel art coherente con las clases que ya se han refinado.

## Contrato técnico confirmado
- Fuente actual: `assets/spritesheets/originales/<clase>/v2/source/<clase>-<sexo>-core-3rows.png` (en algunos personajes .webp).
- Los másteres fuente actuales son hojas de tres filas por cuatro columnas: `idle`, `walk`, `hurt`, cuatro fotogramas por acción.
- Atlas de runtime definido por `SPRITESHEETS_PERSONAJES.json`: 256×1920 px, celdas de 64×128, cuatro columnas y quince filas.
- Se exige transparencia real RGBA. Sin fondo, rótulos, marcos, armas, arcos, carcajes, cuchillos, bastones, grimorios ni otros elementos integrados que deban ser capas aparte.
- No reemplazar assets de producción hasta validar composición, recortes, variedad de fotogramas y transparencia.
- No generar ilustraciones finales con SVG ni usar arte conceptual etiquetado como spritesheet de producción.

## Dirección de arte
- **Elementalista:** silueta de mago elemental avanzada, túnica estructurada azul noche/índigo, marfil y oro, acentos de gema/costuras; manos vacías y sin bastón.
- **Brujo:** silueta sombría y asimétrica, capas carbón/berenjena, ribetes violeta, detalles arcanos discretos; manos vacías y sin libro/arma.
- **Cazador:** cuero curtido y tejidos verde bosque/ocre, silueta robusta y práctica, protecciones de viaje; sin arco, carcaj ni cuchillas.
- **Explorador:** figura ligera y ágil, capa corta y equipo de viaje mínimo, tonos oliva/cuero; claramente diferente del Cazador, sin armas.

## Plan y checkpoints
1. [x] Inspeccionar `SPRITESHEETS_PERSONAJES.json`, fuentes Tier 2 y workflows de generación/refinado.
2. [x] Confirmar que el pipeline fuente usa tres acciones de cuatro fotogramas y que el atlas final utiliza celdas de 64×128.
3. [ ] Crear nuevos másteres de arte original por clase y sexo, manteniendo las manos vacías y separando armas/equipo modular.
4. [ ] Extraer y alinear los doce fotogramas de cada hoja (3 acciones × 4 frames); evitar clones de fotogramas.
5. [ ] Revisar alfa, bordes, altura/caja de personaje, consistencia de la silueta, vestuario y continuidad de animación.
6. [ ] Ejecutar las validaciones de integración del proyecto y generar previews e informes QA.
7. [ ] Confirmar visualmente los resultados antes de sustituir o publicar los assets finales.

## Estado actual
- Revisión del repositorio terminada.
- Las fuentes actuales de Brujo, Cazador, Explorador y Elementalista ya existen, pero muestran fotogramas con escasa variación y necesitan una revisión artística sustancial.
- Se ha generado una primera lámina conceptual para explorar paletas y siluetas; es solo referencia visual, no recurso de runtime.
- Se trabaja directamente en `main`, tal como se ha solicitado. Guardar cambios por checkpoints pequeños y actualizar este documento en cada fase relevante.
