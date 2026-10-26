# Boss diario

La misión de tipo `elite` vuelve a formar parte del catálogo desde el primer rango. El jefe y su ubicación se eligen de forma pseudoaleatoria y estable por fecha UTC, entre los jefes adecuados al progreso del personaje. Las victorias de boss no desbloquean rangos de misiones normales.

La disponibilidad usa `Usuario.ultimaMisionElite`, conservando el historial existente y sin migración de datos. El boss reaparece cuando han transcurrido **23 horas desde la última victoria**, incluso si la fecha ha cambiado. Partir, perder o huir no consume el intento.

El servidor valida la disponibilidad al generar el catálogo y de nuevo al iniciar la misión. En party todos los integrantes deben haber cumplido su espera; la victoria registra la fecha para quienes permanecieron en combate, incluidos los caídos. Los retirados no registran una victoria. La liquidación mantiene su protección contra recompensas duplicadas.

El mapa distingue la misión con una corona y el detalle muestra «Boss diario» y explica la espera. El catálogo se actualiza cada minuto mientras la página está abierta.

Comprobación: pruebas de límites de 23 horas y medianoche, rotación y progreso, restricción por integrante y registro de victoria en party, además de TypeScript, lint y compilación de producción.
