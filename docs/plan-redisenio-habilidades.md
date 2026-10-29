# Plan de rediseño de habilidades y rasgos de clase

Propuesta para revisión · 29 de octubre de 2026 · Base: `main`, commit `6480b79f862ed72ae689933ea7a59b697b310a8a`.

**Estado: fase de habilidades implementada; rasgos aplazados por indicación del usuario. Consultar [estado actual](estado-redisenio-habilidades.md) y [catálogo jugable](habilidades-v2-catalogo.md).**

Actualización aprobada: cinco activas y tres pasivas equipadas, más al menos una habilidad propia adicional en cada clase. Esta decisión sustituye las referencias a 5A/3P del diseño original y obliga a repetir el equilibrio de combinaciones con ocho ranuras. El catálogo adjunto sigue siendo la especificación original; no es una declaración de funcionalidad ya implementada.

 Este documento y el [catálogo completo de las 61 clases](plan-redisenio-habilidades-catalogo.md) forman una sola propuesta. El catálogo define cada rasgo y cada habilidad propia, incluidos costes iniciales e identificadores. No se propone cambiar ahora las condiciones de desbloqueo, el árbol de clases ni los sprites.

## 1. Decisiones principales

1. Ampliar a **5 activas y 3 pasivas**, elegidas entre la clase actual y todos sus antecesores. En híbridas se incluyen sus ramas completas, sin habilidades de clases hermanas.
2. Añadir **un rasgo intrínseco de la clase activa**, gratuito y visible. No se equipa, no ocupa una pasiva y no se hereda. Cambiar de clase cambia el rasgo; no acumula los de sus antecesoras.
3. Cada clase tendrá una forma distinta de tomar decisiones. Una evolución añade una posibilidad táctica; no necesita otra versión de «golpe», «cura» o «reserva» con cifras superiores.
4. Conservar las habilidades heredadas como opciones útiles. Una técnica no puede depender exclusivamente de un rasgo que el descendiente ya no tiene: ella misma o un evento general debe generar su preparación. El rasgo mejora esa interacción, sin ser una llave obligatoria.
5. Mantener el equilibrio de recursos recién publicado: energía base 100 y recuperación del 20 % por turno propio; maná creciente y regeneración más lenta. Los costes del catálogo son un punto de partida, con excepciones explícitas para nuevas funciones.
6. Super Novato será una alternativa secreta de nivel final, con identidad combinatoria, tres activas y dos pasivas propias. Su objetivo de equilibrio será T3.5, no T1.5.
7. Aplicar exactamente el mismo cálculo, eventos, selección y límites en individual y party. Las diferencias serán los participantes y objetivos disponibles, no versiones distintas de las habilidades.

## 2. Qué significa evitar habilidades repetidas

Una habilidad debe cambiar al menos una decisión relevante: cuándo usarla, contra qué objetivo, qué preparación consume, qué riesgo acepta o qué recurso convierte. Cambiar nombre, elemento decorativo, porcentaje o coste no basta.

Ejemplos concretos del catálogo:

| Situación actual o riesgo | Sustitución propuesta | Diferencia jugable |
|---|---|---|
| Varias pasivas de maná máximo | Solo Mago conserva Reserva arcana | Opción simple de reserva para toda la rama |
| Otra reserva en Archimago | Núcleo arcano convierte reserva en inteligencia | Sacrifica autonomía para concentrar potencia |
| Maestrías genéricas de precisión o reserva | Cada clase recibe una pasiva condicional de su especialidad | Cambia una interacción, no otro atributo permanente |
| Varios ataques físicos directos | Espadachín abre guardias; Duelista lee ataques; Asesino aprovecha exposición; Maestro de espadas encadena formas | Cada uno exige y recompensa decisiones distintas |
| Varias curas más grandes | Acólito atiende urgencias; Sacerdote combina triaje y limpieza; Oráculo anticipa daño; Hierofante mantiene un ritual | Diferentes tiempos, riesgos y reparto |
| Varias áreas mágicas | Elementalista reacciona; Archimago comprime forma; Invocador consume su acompañante; Runista cierra circuitos | No son cuatro bolas de fuego con otro número |

Compartir un efecto básico, como sangrado o escudo, sí es aceptable si su aplicación, consumo y contrapartida son distintos. Dos habilidades heredables que hagan la misma función con mejor coeficiente deben fusionarse o cambiar de función. Se revisarán también parejas entre ramas de híbridas, no solo dentro de cada clase.

El Novato conserva una pasiva sencilla de vida y el Mago una de maná: son puntos de entrada deliberados. No se añaden equivalentes superiores. Las subidas de rango de una misma habilidad pueden mejorar sus cifras; lo que evitamos es vender esa misma habilidad como otra técnica de otra clase.

## 3. Organización del equipo y de los rasgos

La ampliación aprobada ofrece ocho ranuras: cinco activas para combinar preparación, daño, defensa y recuperación, y tres pasivas. El equilibrio debe revisarse con esos ocho huecos y límites compartidos de activación, sin sumar varias devoluciones por el mismo pago.

El rasgo da identidad incluso si se equipan ocho habilidades heredadas. Ejemplos: Caballero protege a un aliado; Duelista lee el tipo de ataque; Elementalista produce reacciones; Runista conecta inscripciones; Super Novato alterna disciplinas. No se exige llevar las tres activas propias para que una clase funcione.

Reglas de construcción:

- Una técnica que consume marcas funciona de forma básica sin ellas y explica cómo obtenerlas sin su rasgo original. Los estados que sean exclusivos de un kit tendrán al menos una técnica equipable que los cree. No se presentan como tres habilidades independientes si en realidad requieren dos ranuras para funcionar: se mostrará esa sinergia.
- Las preparaciones y marcas caducan: por defecto, dos turnos propios del creador, salvo duración explícita. Máximo dos cargas por creador; una marca de presa o vínculo activo por creador.
- El cambio de clase se hace fuera del combate y limpia preparaciones, acompañantes y depósitos de su rasgo. No permite guardar cargas de varias profesiones.
- Las pasivas económicas de Comerciante se revisan aparte de su presupuesto de combate. Los suministros temporales no crean objetos, oro ni botín permanente.
- El catálogo conserva cuatro activas propias de Acólito; el límite de equipo será cinco. Se distingue Escudo de fe de su curación y del rasgo preventivo.

### Generadores al heredar una técnica

Esta tabla completa las fichas del catálogo y tiene prioridad sobre cualquier lectura que haga depender una técnica de su rasgo de origen. La función básica siempre está disponible; la preparación mejora su utilidad, no desbloquea el botón.

| Estado o familia | Generación sin rasgo original | Qué aporta el rasgo activo |
|---|---|---|
| Apertura de Espadachín | Estocada sin Apertura prepara una para la siguiente técnica; no la consume en el mismo golpe | Permite prepararla alternando básico y técnica |
| Réplica de Duelista | Su técnica de guardia prepara una lectura al recibir el siguiente ataque | Puede obtenerla también al recibir o esquivar sin esa guardia |
| Chi, Vacío y formas marciales | Respiración genera Chi; la recuperación del Asceta prepara Vacío si cruza el umbral; las técnicas del Gran maestro llevan etiquetas de forma que puede consumir su final | Amplían las situaciones de preparación, sin duplicar cargas |
| Presa, Puntería y ejecución | La técnica de marcado/observación del kit crea su estado; el disparo preparado crea su propia línea de tiro; el ataque de preparación del Verdugo crea ejecución | Facilitan mantener o conseguir la preparación mediante el juego normal |
| Reacción elemental | Las técnicas de agua/frío/fuego dejan su etiqueta; la técnica entrante comprueba y consume la pareja | Permite conservar una preparación elemental adicional, sin segunda reacción por acción |
| Compresión de Archimago | Lanza arcana sin cargas prepara una para el siguiente hechizo; Cataclismo funciona sin ella con menor presupuesto | Las preparaciones pagadas permiten reunir hasta dos |
| Maldición, fragmentos y pacto | Las técnicas de maldición crean su fuente; la herida del Nigromante puede completar un fragmento; el pacto activo crea y explica su compromiso de vida | Ofrecen otra vía acotada de obtención o mantenimiento |
| Runa de arma, circuito y sello | Las técnicas de inscripción generan las runas/sellos que sus cierres reconocen; el cierre detecta por sí mismo dos sellos compatibles | Facilitan enlazar, conservar o transformar esos estados |
| Luz del Arconte | Luz del arconte reserva una parte acotada del exceso real de su propia cura; sin exceso Mandato conserva una protección básica | Puede alimentar el depósito también mediante preparaciones arcanas |
| Acompañante y tótem | Invocar/Anclar crea una entidad temporal completa; la orden sin entidad ofrece una protección personal pequeña y nunca un pulso fantasma | Familiar menor inicial o interacción adicional con la entidad, sin añadir otra |
| Formación, frente, vínculo e incursión | Sus respectivas técnicas de orden, custodia o incursión crean el estado; los finales tienen una resolución básica si falta | Permiten abrirlo con otras acciones normales o prolongar su uso limitado |
| Velo, compás y tempestad | La técnica de movilidad, apoyo o canalización del propio kit prepara su estado | Añaden una forma alternativa de prepararlo, sin saltarse el coste de su final |

Los estados son compatibles solo cuando sus etiquetas lo declaran: una Apertura no es automáticamente un circuito, una ejecución ni una runa. En el caso del Elementalista, el mojado será una aplicación auxiliar de su técnica de hielo al no consumir una reacción; no se añade una cuarta activa obligatoria. Las preparaciones producidas por técnicas no activan de nuevo su propio rasgo sobre el mismo evento.

No debe haber una «tasa de complejidad» oculta: si un final necesita otra activa de su kit, se evalúa con esas dos ranuras ocupadas. Si exige dos preparaciones diferentes, consume las tres; su resultado debe justificar ese coste de equipo sin superar el presupuesto total por ciclo.

## 4. Evolución, tiers y Super Novato

Se conserva el progreso de Job por la rama que ya acordamos: Base se cuenta una vez; Job acumulado por el camino válido de antecesores; en híbridas, el camino más alto, sin sumar las dos ramas. El rediseño no introduce otro multiplicador por profesiones desbloqueadas.

El poder de un tier superior vendrá del conjunto de atributos, rasgo, herramientas disponibles y rango de habilidades. No añadiremos simultáneamente un gran aumento universal de atributos y todas las ventajas nuevas. Un rasgo nuevo se presupuesta junto con las pasivas que sustituye; no se apila sobre el catálogo antiguo íntegro.

Objetivos iniciales de validación, no resultados medidos:

- Al evolucionar, no perder rendimiento por desaparecer el Job anterior. Revisar también cambios de arquetipo: conservar inversión no garantiza por sí solo conservar cada atributo.
- Comparar padre e hijo al desbloquearse con el mismo equipo legal y la inversión realmente disponible. El hijo conserva un equipo heredado funcional y obtiene al menos una ventaja relevante de rol. No exigir que ya haya aprendido su final de Job 45.
- A inversión comparable, buscar una mejora aproximada del 8–12 % de contribución de rol por tier completo, y del 4–6 % por medio tier. Son bandas para detectar anomalías en simulaciones, no una bonificación automática al daño.
- Medir protección, curación útil y acceso a objetivos además de daño. Una clase de apoyo no tiene que vencer en duelo a todas las inferiores para justificar su tier.
- No garantizar victoria universal: una clase inferior especializada puede tener una buena respuesta concreta. Sí evitar que la evolución sea un empeoramiento habitual en su propio rol.

**Super Novato:** mantener el desbloqueo secreto y Job máximo 80 actuales. Conservar inicialmente su acceso a equipo y su bono de dominio existente, pero contabilizar ese bono en su presupuesto total. A Job alto, su rendimiento objetivo será el de T3.5: versatilidad y enlaces, con picos inferiores a un especialista en su situación ideal. No heredará rasgos ni accederá gratuitamente a todos los finales avanzados. Sus propias habilidades evitan que sea solo una colección de herramientas iniciales. Los enlaces usarán etiquetas de origen explícitas, no deducciones ambiguas por nombre; una habilidad híbrida cuenta como una disciplina.

## 5. Recursos y números iniciales

### Energía y maná

Se conservan 100 EN de base, regeneración del 20 % del máximo al llegar el turno propio y las mejoras explícitas existentes. No introduciría más pasivas planas de capacidad: las sustitutas ofrecen gestión condicional. El maná mantiene su crecimiento y regeneración propios; las preparaciones mágicas no pueden producir maná ilimitado.

El catálogo adjunto muestra los costes y CD de rango 1. Mantenerlos inicialmente permite aislar el cambio de función; no significa conservar el daño antiguo si una técnica ahora añade protección o más objetivos. Excepciones detalladas: las nuevas activas de Super Novato y la invocación/orden del Invocador.

Límites comunes para el primer ajuste numérico:

| Mecánica | Límite inicial propuesto |
|---|---|
| Devolución pasiva de un coste | 25 % de lo realmente pagado; máximo 10 EN o 5 PM por ciclo y actor, compartido entre fuentes |
| Recuperación del básico del Mago | Hasta 3 PM/ciclo, sin superar el 25 % del último hechizo pagado; no funciona sin gasto previo pendiente de amortizar |
| Descuento preparado | Hasta 20 % del siguiente coste; una preparación, no acumulable; redondeo único al pagar |
| Conversiones entre EN y PM | Pérdida neta respecto al valor del recurso; no activan nuevas devoluciones ni se convierten de vuelta en el mismo ciclo |
| Drenaje | Solo sobre daño efectivo causado, máximo 20 % de ese daño y 8 % de vida máxima del receptor por acción |
| Curación sobrante convertida | Hasta 25 % del exceso real; una conversión por acción y sin activar otra conversión |
| Depósito por daño recibido | Solo daño enemigo real después de mitigación; no costes de vida, daño propio ni barreras absorbidas |
| Recursos de emergencia | Una activación por combate; nunca tres salvaciones por elegir tres modos |
| Técnica activa de recuperación de EN | Mantener el mínimo de CD 4 al mejorarla; pagar acción y mostrar su recuperación neta |

La devolución por una preparación se produce una vez sobre el pago original, nunca sobre mantenimiento o sobre recursos ya devueltos. Los efectos de recuperación activa expresamente diseñados para ello no se convierten en pasivas mediante copias.

### Única conversión de reserva en inteligencia

Para Núcleo arcano del Archimago propongo:

```text
M0 = maná máximo estable antes de esta conversión
I0 = inteligencia estable antes de esta conversión
inteligencia ganada = min(floor(M0 × 0,10), floor(I0 × 0,20), 12)
maná máximo final = floor(M0 × 0,90)
```

El maná final no vuelve a subir por la inteligencia creada por esta misma pasiva. Equipo y otras pasivas estables entran antes; beneficios temporales no multiplican la conversión. Por ejemplo, con 160 PM y 40 INT: gana 8 INT y queda en 144 PM. Al quitar la pasiva se recalcula desde las fuentes originales. Si el límite de INT reduce la ganancia, el sacrificio sigue siendo el 10 % completo: es una elección de construcción visible, no una reserva gratuita.

### Potencia, área y rangos

Para la primera simulación se definirá una unidad B: daño esperado de un básico acertado del actor sobre el objetivo, con equipo y defensas del escenario. Sirve para comparar presupuestos; las fórmulas finales conservarán escalado explícito y no usarán un resultado aleatorio como base.

- Ataque barato: alrededor de 1,1–1,3 B. Ataque con utilidad: 0,8–1,1 B más su utilidad. Final individual con condición o preparación: 1,8–2,2 B como punto inicial, no además del daño antiguo íntegro.
- Un área no reproduce el ataque individual completo en nueve casillas. Presupuesto total inicial 1,8–2,4 B para una fila o zona pequeña, hasta 2,8 B para un final anunciado caro; se reparte y muestra el alcance. Probar objetivos 1, 3 y 9. El objetivo central puede recibir más, dentro del mismo total.
- Cura urgente de un objetivo: punto de partida 15–20 % de su vida máxima; cura progresiva total 20–25 % durante tres turnos. Conservar Primeros auxilios como excepción inicial conocida y revisar su curación total, coste y CD juntos.
- Cura colectiva: reserva compartida basada en el lanzador y su atributo de curación; no un porcentaje completo independiente por cada uno de nueve destinatarios. Se reparte entre heridos y no se gasta en vida llena.
- Una protección breve empieza alrededor del 10–15 % de vida máxima del receptor; una colectiva reparte una reserva común. Reducciones porcentuales de daño: tope inicial combinado del 50 %, separado de defensa y resistencias; no inmunidad por sumar guardias.
- «Menor», «parcial» o «pequeña» en el catálogo significa como máximo un 25 % del efecto completo equivalente, y sale del presupuesto de esa acción. «Preparar precisión» significa +10 puntos para un impacto; «exponer» o «romper parcialmente» empieza en 15 % de defensa/protección aplicable para un impacto, sin defensa negativa. Son parámetros iniciales comunes, no habilidades nuevas repetidas.
- Rango de habilidad: conservar límites de aprendizaje actuales. Antes de trasladar la curva automática, revisar cada habilidad de preparación, invocación, copia o recuperación. No crecer simultáneamente daño, duración, cargas y frecuencia. Los rasgos no consumen puntos y escalan con progreso propio hasta su tope, sin multiplicarse por cada antecesor.

Los coeficientes concretos por acción, reparto de áreas y magnitud de los rasgos se fijarán en la fase de simulación descrita abajo. No afirmo que los 306 diseños estén ya equilibrados por haberles asignado un coste. Estas bandas son condiciones de partida y aceptación para hacer ese ajuste revisable.

## 6. Estados, reacciones y prevención de combinaciones rotas

### Tiempos y acumulación

- **Turno propio:** momento en que actúa un personaje; recupera recursos y avanza sus efectos periódicos según la regla declarada. **Ciclo:** vuelta completa de iniciativa; actualmente es el reloj de los CD. Mantener esta distinción y escribirla en la interfaz.
- Beneficios de igual familia no suman porcentajes de varias fuentes: se aplica la magnitud más alta y se conservan por separado las procedencias y expiraciones. Un efecto más débil no prolonga gratis uno fuerte. Al expirar el fuerte puede quedar el débil solo por su duración original pendiente.
- Heridas periódicas: una instancia por familia, creador y objetivo, con límite global de contribución revisado en party. Reaplicar renueva o sustituye, no añade pulsos retroactivos.
- Adelantar una cura o herida descuenta ese pulso de su futuro. Transferir o copiar parcialmente un efecto no crea otro presupuesto completo. Si se usa una reserva de curación para proteger, esa parte deja de estar disponible para curar.
- Una acción con varios impactos activa como máximo una vez sus efectos de recuperación, marca y reacción. Las reacciones no vuelven a generar reacciones del mismo evento.
- Preparaciones interrumpidas no cobran dos veces. La acción de preparación paga el coste; la resolución posterior forma parte de ella y consume el turno propio indicado, sin una acción adicional gratuita. Cancelación voluntaria no concede devolución por interrupción enemiga.

### Reacciones elementales

Tres interacciones iniciales, con etiquetas de elemento reales en las técnicas:

| Preparación + elemento entrante | Resultado inicial |
|---|---|
| Mojado + frío | Escarcha: penaliza precisión de una preparación; no pierde el turno |
| Mojado + rayo | Conducción: desplaza parte del presupuesto a un adyacente; no añade otro golpe completo |
| Brasa + frío | Choque: consume la brasa y adelanta un pulso pendiente; no repite su daño futuro |

Máximo una reacción por acción. Sin preparación compatible, el hechizo conserva su función básica. Una reacción no aplica a la vez todos los elementos ni depende de tener activo el rasgo Elementalista; el rasgo facilita preparar la combinación.

### Protección, control y acompañantes

- Provocar penaliza ataques contra otros y guía la IA; no elige una acción por un jugador. Protección redirige parcialmente un único impacto directo por ciclo; no encadena redirecciones entre protectores.
- Evitar cadenas de aturdimiento o silencio total. Interrumpir afecta una preparación concreta y tiene una ventana de resistencia a la misma fuente. Los jefes muestran qué control resisten; reciben una utilidad alternativa acotada, no una inmunidad invisible universal.
- Un acompañante persistente por personaje, incluido el familiar intrínseco. Una orden consume la acción del propietario y el pulso del acompañante de ese ciclo. Pulso automático y orden no se suman. No entra como otro personaje con iniciativa y generación independiente de recursos.
- Para acompañantes temporales: duración y mantenimiento visibles; propuesta inicial de tres ciclos. Si no puede pagarse, se retira antes del pulso. Sacrificar, reemplazar o retirar voluntariamente no cuenta como muerte enemiga ni final natural para obtener recompensas.
- Un campo, canción o tótem mantenido de cada familia por creador; reemplazarlo termina el anterior. Presupuesto de grupo compartido, mantenimiento pagado antes de resolver. Una canción no concede iniciativa ni primer turno.
- Boss único, ausencia de muertes y juego en solitario deben ofrecer una vía alternativa para cargas de Nigromante, Saqueador y otros. Las técnicas de apoyo pueden seleccionar al propio actor cuando corresponda; nunca dependen obligatoriamente de un segundo jugador.

## 7. Catálogo completo y cambios representativos

El [catálogo detallado](plan-redisenio-habilidades-catalogo.md) contiene las **61 identidades, 61 rasgos, 184 activas y 122 pasivas** propuestas. Conserva las 301 habilidades actuales por ID, rediseña su función y añade cinco propias a Super Novato: total 306 habilidades equipables.

Cada ficha incluye padres, función, rasgo, habilidades, nivel de Job y coste/CD inicial. Se incluyen todas las clases, con arte terminado o pendiente. No se implementará el contenido solo para las que ya tengan sprite.

Algunas separaciones importantes entre ramas:

| Familia | Diferencias propuestas |
|---|---|
| Caballero / Paladín / Guardián real | Interceptar y contener / alternar protección y castigo / custodiar a un destinatario y resistir presión |
| Duelista / Asesino / Maestro de espadas | Lectura del rival / ventanas de exposición / secuencia de formas |
| Sacerdote / Oráculo / Hierofante | Triaje y limpieza / previsión / ritual mantenido |
| Monje / Asceta / Gran maestro | Preparar chi / cruzar umbrales de energía / alternar formas marciales |
| Cazador / Francotirador / Domabestias | Mantener presa / disparo anunciado / dirigir un acompañante |
| Explorador / Guardián del bosque / Rastreador | Trampas y retirada / territorio / observar patrones |
| Elementalista / Archimago / Invocador | Reacciones / compresión y reserva / órdenes y sacrificio del familiar |
| Brujo / Nigromante / Demonólogo | Maldiciones / fragmentos y duración / comprometer vida mediante pactos |
| Escriba / Runista / Abjurador | Inscripciones / circuitos / responder a magia bloqueada |
| Centinela / Mariscal / Vigía | Proteger una fila / formación / respuesta a intenciones |
| Berserker / Verdugo / Saqueador | Presión a cambio de exposición / ejecución preparada / consumir heridas |
| Híbridas finales | Combinar funciones de sus ramas mediante una mecánica propia; no sumar sus dos rasgos completos |

## 8. Motor y datos que habrá que preparar

El catálogo actual permite daño, curación, mejoras y perjuicios simples. Este diseño requiere además marcas, cargas, preparación interrumpible, vínculos, campos, acompañantes, reservas y eventos de consumo. Cambiar solo descripciones dejaría muchas habilidades sin comportamiento real.

Propuesta de arquitectura a concretar al implementar:

1. Catálogo tipado de rasgos y habilidades. Separar coste, objetivos, presupuesto, condición y resolución. Evitar listas mágicas de clases por nombre y plantillas que generen pasivas idénticas.
2. Resolución común por eventos: pago, impacto, daño efectivo, curación efectiva/exceso, mitigación, retirada, interrupción y fin natural. Cada evento conserva actor, fuente original, objetivo, acción y ciclo; impide activarse a sí mismo repetidamente.
3. Estado de combate persistido para cargas, rasgo activo, preparaciones, vínculos y acompañantes. Mismo formato y reloj en individual y party; reanudar o reintentar una petición no repite un pulso ni una recompensa.
4. Selección previa de modo/objetivo. Pagar solo después de validar. Si un vínculo permite elegirse a uno mismo, el selector debe ofrecerlo tanto en solo como en grupo.
5. Descripciones calculadas desde la misma definición que resuelve el combate. Mostrar cambios de equipo, rango y pasivas sin párrafos estáticos contradictorios.

Antes de tocar componentes Next.js se leerán las guías locales de la versión instalada, como exige AGENTS.md.

## 9. Interfaz y migración

- Mostrar el rasgo en la ficha de clase y en batalla, separado de las dos pasivas. Las cargas muestran origen, máximo y condición de gasto.
- Escuela: agrupar por clase de origen y función; filtros de activa/pasiva y heredada/propia; indicar sinergias, preparación requerida y qué funciona sin el rasgo.
- Selección de objetivos y modos antes del gasto: cura, energía, orden, cobertura, fila, etc. Evitar habilidades con dos destinatarios obligatorios si puede elegirse el vínculo y luego actuar sobre él.
- Información al pulsar un efecto: nombre, fuente, cantidad real, condición y duración con reloj explícito. Ejemplo: «Sangrado: 16 de daño al inicio de tu turno. 3 turnos propios restantes». Ejemplo de reserva: «Luz: 24/40. Se consume al usar Mandato celestial».
- Respetar el cierre pulsando fuera o Escape, sin reintroducir el botón Cerrar. Comida muestra su aportación real y no añade iniciativa.
- Conservar IDs de habilidades existentes. Guardar una versión del catálogo y un registro de migración; no aplicar una migración destructiva al volver a desplegar.
- Restituir íntegramente los puntos invertidos en habilidades rediseñadas. Conservarlas desbloqueadas/compradas, con rango restablecido a 1; separar propiedad de compra e inversión de mejoras si hoy comparten campo. No cobrar otra vez ni duplicar puntos por refundir ambos conceptos.
- Guardar el equipo anterior como referencia y solicitar revisar sus cinco ranuras tras la actualización; no equipar automáticamente nuevas técnicas ni borrar sin aviso la selección válida. Si un rango 1 invalida una condición, señalarlo y desactivar esa ranura hasta revisarla.
- Los cinco desbloqueos nuevos de Super Novato respetan sus Job indicados y no se regalan al rango máximo. Los rasgos no exigen compra. Copia de seguridad y prueba de migración con perfiles reales anonimizados antes del despliegue.

## 10. Orden de implementación propuesto

| Fase | Alcance | Condición para continuar |
|---|---|---|
| 1. Contratos y presupuestos | Eventos, tiempos, familias, costes y fórmulas; especificar generadores de cada preparación | Ninguna habilidad heredable queda bloqueada por perder el rasgo |
| 2. Motor común | Rasgos, estados persistentes, límites y descripciones; mismo resolver en solo/party | Pruebas de eventos, reintentos, recursos y acumulación |
| 3. Piloto completo | Novato; Espadachín → Caballero/Duelista; Mago → Elementalista/Archimago; Acólito → Sacerdote | Combates completos, evolución sin pérdida y equipo heredado viable |
| 4. Mecánicas especiales | Acompañantes, rituales, sellos, posiciones y pactos | Sin acciones gratuitas, bucles ni multiplicación por tamaño de party |
| 5. Resto de clases | Completar las 61 fichas, todas las híbridas y Super Novato | Cobertura y simulaciones de combinaciones heredadas |
| 6. Ajuste numérico | Rangos, áreas, curación útil, mantenimiento y contribución por tier | Informe comparativo reproducible; corregir dominantes antes de publicar |
| 7. Migración y validación visual | Escuela, equipo, tooltips, perfiles existentes y sesiones guardadas | Lista de comprobación completa en individual y party |

Cada fase debe quedar revisable en commits pequeños. No publicaría medio árbol con rasgos nuevos enfrentándose a habilidades antiguas intactas. Se puede desarrollar por fases detrás de una versión de reglas y activar el conjunto cuando pase la validación. El usuario ha autorizado ejecutar todas estas fases en una rama nueva, con cinco activas, tres pasivas y al menos una habilidad adicional por clase. El estado real de avance se documenta en estado-redisenio-habilidades.md.

## 11. Comprobaciones y criterios de aceptación

### Cobertura y diseño

- Las 61 clases tienen un rasgo exclusivo y un kit propio completo; Super Novato incluido. Las 301 habilidades actuales tienen un destino por ID y las cinco nuevas uno inequívoco.
- Cada técnica tiene propósito, generador de sus condiciones, alternativa sin ellas y coste. No quedan pasivas duplicadas de reserva/precisión con otra cifra.
- Ninguna necesita equipo o pasivas obligatorias para pagar su coste al desbloquearse. Se prueban los tres huecos activos, sin presuponer cinco técnicas a la vez.

### Mecánicas y paridad

- Pruebas unitarias para conversión sin realimentación, pulsos adelantados, depósitos, límites de devolución, redirección única, acompañantes y final natural frente a sacrificio.
- Reproducir las mismas acciones y semilla con un personaje en solo y en party de un miembro: recursos, daño, cura, duración y CD idénticos.
- Party con varios actores: autor correcto de marcas, cura al destinatario elegido, bonificaciones de sus atributos y equipo, áreas repartidas y límites de disparo por actor/ciclo. Comprobar también combatientes caídos y objetivos que desaparecen.
- Probar velocidades relativas 1:1, 2:1 y 3:1; los pulsos por ciclo no se multiplican por turnos adicionales. Ninguna comida altera el primer turno.
- Persistir y reabrir un combate con preparaciones y vínculos; repetir una petición; no repetir pagos, curas o ataques. Validar cancelación y mantenimiento insuficiente.

### Equilibrio de kits

- Escenarios deterministas de 6, 12 y 20 ciclos, contra un enemigo, fila de tres y grupo de nueve; con y sin barreras, limpieza, daño periódico y resistencias.
- Separar duelo, jefe sin enemigos menores y combate de party. Medir daño efectivo, daño evitado, curación útil, turnos invertidos en preparar y autonomía, no solo daño de una técnica aislada.
- Comparar padre/hijo al evolucionar, al mismo progreso y al máximo propio. Probar equipo heredado y configuraciones mixtas de 5A/3P; buscar combinaciones dominantes entre todas las ramas de híbridas.
- Ejecutar búsqueda automática de combinaciones legales con poda por familia y, después, simular las candidatas más fuertes. Revisar especialmente recuperación + copias, ritual + velocidad, daño periódico + adelanto y protección + redirección.
- Super Novato: comparar al máximo contra T3.5 especialistas en sus mejores y peores escenarios. No basta con que alcance su daño de entrenamiento; debe pagar su versatilidad y no multiplicar el bono de dominio con enlaces.
- PvP, si comparte motor: ningún bloqueo permanente, provocación que controle al jugador o bucle de curación/recursos. Las mismas reglas de origen y presupuesto deben limitar esas combinaciones.

### Regresión y entrega

Ejecutar las pruebas existentes, las nuevas pruebas del motor, comprobación de tipos, lint y compilación. Hay dos fallos preexistentes documentados en pruebas de disposición de Escuela: se registrarán aparte y no se atribuirá un pase completo mientras sigan fallando. Verificar visualmente Escuela, selección de objetivos, rasgo y tooltips. No declarar validado el juego mediante una inspección estática del catálogo.

Al terminar la futura implementación se entregarán: resumen por clase, tabla de costes y coeficientes finales, resultados de simulación, migración verificada y una lista concreta de partidas manuales pendientes. **La especificación no equivale a una implementación terminada: consultar el estado de avance y sus comprobaciones.**
