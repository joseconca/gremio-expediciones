# Tier 2 Elementalista — brief y contrato raster

## Identidad
Rama del Mago centrada en dominio elemental. Túnica larga azul/violeta, panel central cian, bordados geométricos dorados, manto violeta y diadema discreta. El cabello azul plateado diferencia esta clase del Mago base. Los motivos son bordados en la tela: sin orbes, proyectiles ni efectos mágicos en los sprites del cuerpo.

## Restricción de capas
Las manos quedan vacías en las tres acciones. No se incluye bastón, varita, arma ni efecto externo; estos elementos se integrarán mediante capas independientes.

## Entrega generada
- Dos másteres PNG (masculino y femenino), 256×384, cuatro columnas por tres filas.
- Seis tiras PNG de 256×128 (Idle, Caminar y Recibir daño para ambos sexos).
- 24 frames nativos de 32×64, seis previews y seis informes QA.
- QA confirma cuatro frames distintos, alfa real (0–255) y deriva de pies de 0 px al caminar y como máximo 1 px en Idle/Recibir daño.

## Estado
GitHub Actions de sprites completado en verde. La regresión completa se ha lanzado sobre el mismo commit. Paquete pendiente de revisión visual y no integrado al runtime.
