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

## Orden de trabajo

1. Caballero — establecer el nivel de detalle y la escala de las clases avanzadas.
2. Duelista — aprovechar la misma familia visual de Espadachín sin copiar la misma silueta.
3. Sacerdote y Monje — trabajar desde la rama visual de Acólito con objetivos distintos: apoyo ceremonial y combate corporal.
4. Cazador y Explorador — distinguir ofensiva de rastreo y movilidad/supervivencia.
5. Elementalista y Brujo — separar magia elemental legible de magia de maldición/oscura.

Este documento define el inicio del trabajo Tier 2; no afirma que sus másteres estén ya producidos.
