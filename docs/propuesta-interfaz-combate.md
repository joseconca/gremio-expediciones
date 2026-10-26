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

## Revisión vigente: panel anclado al borde inferior

El panel de combate ocupa una región propia en el flujo de la pantalla (180 px en escritorio y 270 px en la maqueta móvil de 390 × 760). La escena ocupa el espacio restante y no queda detrás del panel. Se eliminan las ventanas flotantes, márgenes exteriores, sombras y marcos dobles del menú; un borde superior y separadores interiores mantienen la estética RPG.

Ambos equipos siguen visibles: franja superior compacta en el panel móvil y columnas a la derecha en escritorio. El bloque de acciones se ensancha dentro del panel, sin invadir la escena. El historial permanece separado y se expande dentro de esta región inferior. Esta revisión sustituye el posicionamiento flotante de las revisiones anteriores.

Ajuste de compactación: se elimina el nombre del actor sobre las órdenes y la franja inferior vacía. El panel gana 34 px de escena en escritorio y 40 px en móvil.

## Información de participantes e historial

Las órdenes se compactan a 33 px en escritorio y 36 px en móvil. El historial muestra hasta cuatro entradas sin encabezado: anteriores en gris claro y última en blanco. El pequeño control +/− amplía el área y permite consultar todas las entradas; no oculta el texto.

Info, junto al turno, abre un diálogo accesible con todos los participantes, vida, recurso disponible, ataques, defensas, velocidad, posición, estado y efectos. Los valores aliados son muestras de diseño y los enemigos usan el catálogo; al integrar deben sustituirse por el estado real de la batalla. Se conserva la lógica de combate existente.
