# Plan de sprites v2 — Tier 2

## Alcance

Crear arte propio para las ocho clases de Tier 2, en dos ramas por cada clase de Tier 1. No reutilizar como máster el retrato estático ni recortar una hoja de producción genérica: cada clase debe tener una silueta y equipamiento reconocibles antes de generar sus tiras.

| Rama de origen | Clase | Identidad visual a establecer |
|---|---|---|
| Espadachín | Caballero | Placas completas, capa heráldica y silueta defensiva; sin arma dibujada dentro del cuerpo |
| Espadachín | Duelista | Armadura ligera/media, líneas estilizadas y postura de esgrima |
| Acólito | Sacerdote | Vestiduras ceremoniales, estola y símbolos sagrados más ornamentados |
| Acólito | Monje | Ropajes marciales, vendas/brazales y postura disciplinada |
| Arquero | Cazador | Cuero reforzado, equipo de rastreo y herramientas de caza |
| Arquero | Explorador | Equipo ligero de viaje, capas y accesorios para supervivencia/trampas |
| Mago | Elementalista | Túnica con motivos elementales y silueta de canalización |
| Mago | Brujo | Vestiduras oscuras, amuletos y lenguaje visual de maldiciones |

## Primera clase: Caballero

Brief inicial: distinguirlo del Espadachín por mayor masa de armadura, hombreras y protección de piernas, manto corto con heráldica propia y una silueta que sugiera protección de aliados. Mantener el rostro y escala en la misma familia visual Tier 0/1, orientado a la derecha, fondo transparente y armas como capas separadas.

## Contrato técnico por clase y sexo

- Máster de tres filas con cuatro fotogramas por fila: Idle, Caminar y Recibir daño.
- Fuente nativa 32×64 por frame; tira canónica de 256×128 con celdas ampliadas a 64×128 para el atlas actual.
- Paleta consistente entre las tres acciones de cada sexo, alfa real, cuatro poses visibles distintas y pies estables al caminar.
- Salida en `assets/spritesheets/originales/<id>/v2/`: máster en `source/<id>-<sexo>-core-3rows.webp`, tiras `idle/walk/hurt`, frames nativos, previews e informes QA.
- Validar visualmente los frames, además de dimensiones y hashes. No promover una clase al runtime hasta revisar ambos sexos.
- Solo tras aprobar las seis tiras, añadir el ID a la lista explícita del workflow de Tier 2; no incluir aún las clases híbridas de Tier 2.5.

## Estado de preparación

Duelista ya dispone de dos másteres raster WebP basados en láminas de imagen 4×3; se eliminó la fuente vectorial SVG y el rasterizador correspondiente. El siguiente paso automático reconstruye sus seis tiras, frames nativos, previews e informes QA. El cuerpo se mantiene desarmado; armas y escudos son capas independientes.

## Orden de trabajo

1. Caballero — paquete generado; revisar halos/fondo.
2. Duelista — paquete raster generado; sin armas incrustadas.
3. Sacerdote — paquete PNG generado desde las láminas compartidas; sin armas incrustadas.
4. Monje — primera versión raster generada desde el panel de referencia; sin armas incrustadas.
5. Cazador y Explorador — diferenciar ofensiva de rastreo y movilidad/supervivencia; quitar arcos/armas del cuerpo. **Cazador ya tiene su paquete raster PNG completo**, pendiente de revisión visual. La siguiente clase activa es Explorador.
6. Elementalista y Brujo — distinguir magia elemental de maldición y mantener los bastones/efectos en capas separadas.

## Estado de trabajo — 22 de octubre de 2026

- **Caballero:** paquete v2 masculino y femenino ya generado en `assets/spritesheets/originales/caballero/v2/`; requiere limpieza visual posterior del fondo residual. No está integrado al runtime.
- **Duelista:** másteres SVG editables para ambos sexos, rasterización PNG 128×192, seis tiras de 256×128, 24 frames nativos 32×64, seis previews y seis informes QA. Las seis tiras tienen cuatro frames distintos, alfa real y deriva de pies de 2 px en QA. No está integrado al runtime.
- **Estado actual:** Caballero, Duelista, Sacerdote y Monje tienen sus paquetes v2 generados. **Cazador tiene ya las dos fuentes raster PNG, seis tiras, 24 frames nativos, previews y QA en `assets/spritesheets/originales/cazador/v2/`.** Está pendiente de aprobación visual y no se ha integrado al runtime. La siguiente clase es Explorador; después Elementalista y Brujo.

La generación del paquete de Cazador terminó en verde en [GitHub Actions](https://github.com/joseconca/gremio-expediciones/actions/runs/39840572903); la regresión también terminó en verde en [GitHub Actions](https://github.com/joseconca/gremio-expediciones/actions/runs/39840572707).
