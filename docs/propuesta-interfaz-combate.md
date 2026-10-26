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

## Revisión vigente: un solo bloque de acciones

Habilidades y Objetos ensanchan el propio menú de acciones: órdenes, lista y explicación comparten marco. El historial es una sección independiente y nunca contiene habilidades u objetos.

Aliados y enemigos se muestran simultáneamente, sin pestañas, también con el menú desplegado. En móvil las dos listas compactas se colocan encima del bloque de acciones; en escritorio permanecen a su derecha. Se mantiene la selección desde la escena y desde las fichas enemigas.

La flecha tiene un pulso discreto, desactivado con movimiento reducido. Las fichas enemigas muestran nombres y PV del catálogo; el modelo actual no tiene reservas de maná/energía, por lo que se muestra un guion. La vista sigue siendo una demostración sin llamadas a acciones reales.
