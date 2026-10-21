# Novata — Idle v2 (fuente de trabajo)

## Estado

Este es el primer piloto del flujo nuevo para que las poses mantengan modelo, escala y línea de suelo. La fuente está en `source/novato-f-idle.webp`; la salida PNG y los cuatro frames se generan desde Actions. **No se ha conectado al runtime** y queda pendiente de revisión visual antes de tratarla como arte final.

## Contrato de formato

- Tira horizontal de 256 × 128 px.
- Cuatro frames horizontales de 64 × 128 px.
- Transparencia alfa real, sin fondo, rótulos, paneles ni rejilla.
- Una paleta compartida para la acción, sin reescalado independiente de cada frame.
- Sin armas dibujadas en el cuerpo; el equipo de mano se compone en capas equipables.

## Recursos generados

- `novato-f-idle.png`: tira final.
- `frames/f/novato-f-idle-01.png` … `04.png`: celdas individuales.
- `previews/novato-f-idle-preview.png`: preview ampliada sobre damero generado para revisión, no para juego.
- `qa-report.json`: geometría, transparencia, hashes y validación de fotogramas.

El workflow `.github/workflows/build-novato-v2-idle.yml` produce los PNG, los valida, los guarda en un commit y publica un artefacto de revisión. La fuente WebP está comprimida con pérdida para su transporte; si esta animación se aprueba, se recomienda sustituirla por una fuente PNG lossless de mayor fidelidad sin cambiar el contrato de salida.

## Próximos pasos

1. Revisar el Idle a tamaño nativo y ampliación nearest-neighbor.
2. Aprobar escala y silueta de Novata.
3. Crear Caminar y Recibir daño desde el mismo modelo maestro, reutilizando la escala y paleta.
4. Repetir con Novato masculino y, después, continuar con Espadachín.
5. Integrar el atlas solo cuando los seis estados de ambos sexos pasen QA técnico y artístico.
