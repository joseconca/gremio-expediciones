# Tier 2 Cazador — brief y contrato raster

## Identidad
Primera versión de la evolución de Arquero orientada al rastreo: capucha de bosque, capa corta verde, cuero reforzado, cinturón con bolsas pequeñas, botas de viaje y herrajes de bronce. Se mantiene una paleta verde bosque/marrón para separar visualmente la clase de otras ramas.

## Restricción de capas
El cuerpo se dibuja con las dos manos vacías. No incorporar arco, flechas, carcaj, daga ni otra arma al cuerpo ni a la capa. Las armas se renderizarán mediante el sistema de capas independiente.

## Entrega generada
- Másteres raster PNG masculino y femenino de 256×384, con 4 columnas × 3 filas.
- Seis tiras PNG de 256×128: Idle, Caminar y Recibir daño para ambos sexos.
- 24 fotogramas nativos de 32×64.
- Seis previews y seis informes QA en JSON.
- Los seis informes confirman cuatro frames distintos, alfa real (0–255) y deriva de pies de 0 px.

## Estado
La generación y la regresión de GitHub Actions han terminado en verde. Este paquete es una primera pasada visual; el usuario puede ajustar residuos de fondo/borde y el detalle artístico durante la revisión. No promover al runtime sin revisión visual de las seis tiras.
