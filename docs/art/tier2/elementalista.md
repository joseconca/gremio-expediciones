# Tier 2 Elementalista — brief y contrato raster

## Identidad
Rama del Mago centrada en el dominio elemental. Silueta de túnica larga azul/violeta, panel central cian, bordados geométricos dorados, manto posterior violeta y una diadema discreta. El cabello azul plateado diferencia esta clase del mago base. Los motivos elementales están cosidos en la tela: no se incluyen orbes, proyectiles ni efectos mágicos en los sprites del cuerpo.

## Restricción de capas
Manos vacías en las tres acciones. No incluir bastón, varita, arma ni efecto mágico externo; esos elementos se integrarán como capas independientes.

## Contrato de salida
Másteres raster PNG masculino y femenino de 256×384 (4 columnas × 3 filas). El workflow generará seis tiras PNG, 24 frames nativos 32×64, seis previews y seis informes QA. Las fuentes y los recortes permanecen fuera del runtime hasta la revisión de ambos sexos.

## Estado
Generador raster en curso; la siguiente ejecución de GitHub Actions validará dimensiones, alfa, cuatro frames distintos y estabilidad de pies.
