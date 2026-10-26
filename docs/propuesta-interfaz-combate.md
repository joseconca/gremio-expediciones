# Propuesta visual de combate

Ruta de demostración: `/propuesta-combate`. No sustituye `CombateModal` ni llama a acciones del juego.

Revisión solicitada: conservar la escena superior, eliminar el cuadro central de objetivo, usar flecha y anillo rojo, sustituir el panel inferior por órdenes clásicas verticales y estados compactos. La cuarta orden es **Huir**, nunca Esquivar. En la demostración muestra una salida simulada; no representa el resultado ni la probabilidad de la huida real.

## Condiciones para una futura integración

Cambiar la presentación manteniendo los controladores y contratos actuales de `CombateModal.tsx`:

- Atacar: objetivo seleccionado y restricciones de turno/procesamiento.
- Habilidades: equipadas, costes de energía/maná, enfriamientos, descripción, selección de aliados/enemigos y objetivos múltiples.
- Objetos: inventario real, cantidades, recursos recuperados y restricciones de uso.
- Huir: `ejecutarHuida`, `puedeHuir` y comportamiento específico de solo/party. No convertir la acción en una animación de esquiva ni dar por garantizado su éxito.
- Estadísticas y efectos: PV, recursos de cada profesión, efectos activos, posiciones, aliados caídos o retirados y turno del participante.
- Mantener detalles, historial expandido, animaciones, impactos, selección accesible y movimiento reducido.
- Mantener victoria, derrota, retirada, recompensas, pérdidas, botín e informes/cierre.

Los datos, costes y acciones de la propuesta son ejemplos visuales, no implementaciones alternativas de estas reglas. Antes de integrar, conectar cada control a su función existente y verificar solo y party en móvil y escritorio.
