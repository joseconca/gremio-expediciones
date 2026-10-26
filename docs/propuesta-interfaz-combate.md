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


## Integración en combate real — 26 de octubre de 2026

La presentación aprobada se aplica ahora a `CombateModal` (solo/party PvE) y `AsedioModal` (atacante/defensor). El panel inferior reserva su propio espacio; las órdenes expanden su menú a la derecha, el historial queda independiente y ambos bandos permanecen visibles. Info reutiliza las estadísticas reales existentes. La selección mantiene anillo rojo y flecha animada, respetando movimiento reducido.

`PanelCombatientes` muestra energía, maná o ambos según la profesión activa. No inventa reservas de enemigos PvE ni del rival de asedio: esos snapshots no contienen tales valores. Se mantienen las reglas existentes de habilidades, cooldowns de cada lado del asedio, consumibles, huida, turnos, efectos, animaciones, resultados y recompensas. Asedio conserva su conjunto de acciones: no se han añadido huida, objetos ni asedios de party, que el juego actual no ofrece.

Los bosses reciben un límite de escala mayor, ajustado a los márgenes de la escena y al tamaño de sus animaciones. No se cambia la composición de encuentros; las formaciones siguen admitiendo varios enemigos.

Verificación: compilación de producción, TypeScript y lint; 35 pruebas de panel/recursos, 75 de party, 134 de progresión/combate y 28 de sprites. Revisión visual de los componentes reales con fixtures locales en 390×760 y escritorio, incluyendo jefe, selección, objetos, Info y cooldown del defensor. No se ha completado una batalla autenticada contra el servidor.

`/revision-combate-real` sirve únicamente en desarrollo y monta los mismos componentes con datos de prueba y acciones sin efectos. En producción devuelve notFound. La propuesta original sigue disponible como referencia visual. Esta integración se guarda en la rama de trabajo; su publicación es una acción separada.


## Nueva revisión visual: barras sobre los personajes (sin publicar)

`/propuesta-combate` muestra una alternativa aislada: nombre, vida y recursos encima de cada sprite; estados, mejoras y comida en una fila de iconos bajo las barras. Los iconos muestran turnos restantes o duración de expedición y se pueden pulsar para consultar el detalle. Se reutiliza `IndicadoresEfectosCombate` para la interacción.

La formación vuelve a estar escalonada en profundidad. El menú de acciones gana 24 px útiles en móvil y 24 px respecto al menú de combate actual de escritorio; desaparece el bloque inferior de fichas. Siguen disponibles solo/party, móvil/escritorio, selección de enemigos, menús de habilidades y objetos, historial ampliable e Info. El botón de tamaño real facilita evaluar cada vista sin reducción.

Es una propuesta con datos simulados: no modifica los componentes del combate real ni se ha publicado en main.


## Integración aprobada de las barras superiores — 26 de octubre de 2026

La revisión se aplica al combate real PvE solo/party y al asedio. `EstadoSobreActor` agrupa nombre, PV y los recursos de la clase sobre el sprite. Los iconos de efectos, comida y pasivas quedan fuera del recuadro en una fila transparente de altura fija, incluso sin efectos. Se ha comprobado en navegador que alternar un buff mantiene exactamente la posición y altura del recuadro y del actor.

En móvil las tres posiciones usan coordenadas distintas de profundidad, manteniendo el valor táctico persistido. La distribución deja margen superior para las barras. Los enemigos normales se normalizan según la altura real de su atlas: estar junto a un borde ajusta su posición antes de reducirlos. Los bosses conservan su escala especial. El menú inferior queda dedicado a acciones e historial, con 202 px en móvil y 232 px en escritorio (174 px en horizontal corto).

La party envía las comidas activas y los identificadores de pasivas equipadas para mostrar los indicadores de cada integrante. Se conservan acciones, restricciones por modo, turnos, recursos, cooldowns, objetivos, animaciones, estados, informes y recompensas. No requiere cambios de esquema ni migración de datos.


## Separación del turno y anclaje de sombras

El aviso de espera/turno de party ocupa una franja de 24 px en el flujo entre escena y menú, sin superponerse al área de personajes. El menú se compacta a 180 px en móvil, 196 px en escritorio y 164 px en horizontal corto. Se verificó en móvil que los actores inferiores conservan 18 px de separación respecto a la franja.

Héroes HD, héroes legacy y enemigos comparten `estiloSombraCombate`: proyección achatada hacia el fondo, origen en el centro inferior de los pies, sin inversión horizontal adicional. Se mantienen el frame, el equipo y la orientación del actor. Una prueba geométrica verifica que ambos pies permanecen fijos, la silueta se proyecta hacia arriba y conserva el orden izquierda/derecha.


## Parejas centradas

Las parties de dos se centran dentro del espacio útil y acortan su separación vertical. Si comparten carril o están próximos horizontalmente, se reserva la altura necesaria para el sprite y sus barras. Se conservan los carriles, el orden relativo, la escala y los datos tácticos; la formación de tres no se modifica. Verificado en móvil y escritorio y con pruebas para el mismo carril, carriles distintos y escenas pequeñas.
