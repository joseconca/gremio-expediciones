# Tier 2 Cazador — brief y contrato raster

## Identidad
Evolución de la rama Arquero enfocada en rastreo y caza. Usar silueta ágil, capa corta verde bosque, capucha/cowl, cuero reforzado, cinturón con pequeñas bolsas de suministros y botas de viaje. Paleta verde oscuro, cuero marrón y herrajes de bronce. Mantener proporciones y escala de Tier 2.

## Restricción de capas
El cuerpo se dibuja con **las dos manos vacías**. No incorporar arco, flechas, carcaj, daga ni otra arma al cuerpo ni a la capa. Las armas se renderizarán mediante el sistema de capas independiente. La pequeña bolsa de suministros del cinturón es equipo, no arma.

## Entrega
Dos másteres raster PNG (masculino/femenino) de 256×384: cuatro fotogramas por fila y tres filas (Idle, Caminar, Recibir daño), con celdas de 64×128. El generador no emite SVG. El pipeline produce las seis tiras PNG, frames nativos 32×64, previews e informes QA. Fondo transparente; se acepta algún residuo de borde para una pasada de limpieza manual posterior.

## Estado
El generador raster es un primer borrador artesanal y los másteres se validarán en GitHub Actions. No promover a runtime sin revisión visual de las seis tiras.
