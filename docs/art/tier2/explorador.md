# Tier 2 Explorador — brief y contrato raster

## Identidad
Evolución de Arquero centrada en viaje, exploración y supervivencia. Diferenciar de Cazador con ropa de viaje algo más clara, chaleco arena, bufanda verde azulado, capa corta, botas de caminante y bolsas de suministros/mapas. La trenza lateral distingue la silueta femenina; el masculino tiene pelo corto y prenda de viaje abierta, sin capucha cerrada.

## Restricción de capas
Las dos manos vacías. Sin arco, carcaj, flechas, dagas, espadas ni otras armas dentro del cuerpo. Solo prendas, bolsos, correas y hebillas; el equipo ofensivo se añadirá mediante capas independientes.

## Entrega generada
- Másteres raster PNG masculino y femenino de 256×384 con 4 columnas × 3 filas.
- Seis tiras PNG de 256×128: Idle, Caminar y Recibir daño para ambos sexos.
- 24 frames nativos de 32×64, seis previews y seis informes QA.
- QA confirma cuatro frames distintos, transparencia alfa real y deriva de pies de 0 px al caminar y como máximo 1 px en Idle/Recibir daño.

## Estado
GitHub Actions y la regresión completa han terminado en verde. Primera pasada visual pendiente de aprobación; se aceptan residuos de fondo para una pasada manual posterior. No integrado al runtime.
