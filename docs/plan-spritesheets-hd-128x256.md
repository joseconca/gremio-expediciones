# Producción de sprites de personajes

Único documento operativo. Rama de continuación: `nuevas-clases` (producción anterior en `creacion-sprite-sheets`).
Estado verificable: [manifest.json](../assets/spritesheets/hd-128x256/manifest.json).
Los informes automáticos son derivados técnicos, no planes alternativos.

## Ampliación del catálogo — 27 de octubre de 2026

Catálogo contrastado con `src/lib/progresion/clases.ts`: 61 clases y 122 variantes por sexo. La auditoría estricta inicial confirma 1.560 fotogramas válidos y cero inválidos, correspondientes a Novato, las cuatro troncales y las ocho clases originales de tier 2. Quedan 48 clases sin biblioteca HD propia: Super Novato (1.5), seis de tier 2, diez de tier 2.5, veintitrés de tier 3 y ocho de tier 3.5. Son 96 variantes y 1.440 acciones por producir. Los sprites legacy y los fallbacks de antecesoras no cuentan como arte HD nuevo.

El manifiesto incluye ahora las 61 clases y ambos sexos, también las variantes todavía sin comenzar. `node scripts/cobertura-clases-hd.cjs --write` contrasta el catálogo real y genera `previews/class-coverage.json`; ejecutar antes el auditor para refrescar los hashes y recuentos. Ese informe es derivado: el manifiesto sigue siendo el único registro de producción.

Continuar por tier, clase, sexo masculino/femenino y las quince acciones del contrato, empezando por Super Novato. Cada acción conserva su PNG grande original, prompt, cuatro frames, procedencia y previews. Commit por acción, revisión de equipo compartido por sexo al cerrar una variante. La creación solicitada se realiza en `nuevas-clases`; la promoción y la publicación en main requieren la revisión del conjunto.

Dirección artística corregida por el usuario para Super Novato: inspiración en el Super Novice de Ragnarok Online. Túnica blanca y azul cobalto sin mangas, corbatín blanco, pantalones marrones, cinturón de utilidades, cadena lateral y botas oscuras. La revisión inicial con bufanda granate y chaqueta marfil se conserva como fuente anterior, pero queda descartada como identidad de esta clase. `variants[].artDirection.actionsToRework` identifica las acciones que aún requieren el nuevo vestuario; una acción técnicamente válida con el diseño descartado no completa la variante. Referencia oficial: https://ragnarokonline.gungho.jp/gameguide/character/novice/supernovice.html.

### Entrega candidata de Super Novato (tier 1.5)

Masculino y femenino: quince acciones y sesenta fotogramas por variante, dos atlas RGBA de 512×3840, originales de alta resolución y prompts conservados por acción. [Comparativa estática](../assets/spritesheets/hd-128x256/previews/superNovato-overview.png) y [comparativa animada](../assets/spritesheets/hd-128x256/previews/superNovato-overview.gif). La animación sincroniza fases para revisión, sin definir la temporización final del juego.

Cada variante pasa 682 comprobaciones con las mismas capas de equipo de su sexo, sin avisos ni desplazamientos por clase. Corregido el agarre de la tercera pose de Caminar masculino y una manga residual en Daga; las revisiones que alteraron gestos o contactos se conservan identificadas en la procedencia. La estabilización de reposo cubre ahora 28 variantes y mantiene como máximo un píxel de variación del apoyo.

Validación acumulada: 1.680 frames válidos, cero inválidos; 29 pruebas de animación/runtime y siete pruebas del pipeline aprobadas. El informe de cobertura incluye 28 variantes técnicamente completas. Son recursos candidatos para revisión artística: no se han promovido al runtime ni publicado en main. Guardados commits por acción y cierre de variante en `nuevas-clases`.

Quedan 47 clases por producir (94 variantes, 1.410 acciones y 5.640 frames): seis de tier 2, diez de tier 2.5, veintitrés de tier 3 y ocho de tier 3.5. Siguiente variante: `berserker-m`, después `berserker-f`, conservando la separación por clase, sexo y acción.

## Estado actual — 26 de octubre de 2026

Tier 2 completo como biblioteca candidata: ocho clases en orden, masculino y femenino, dieciséis atlas y 960 fotogramas nuevos. Las 240 acciones conservan las fuentes grandes y sus instrucciones de generación. Las comparativas con equipo reutilizan las mismas capas por sexo y no añaden desplazamientos por clase: 10.912 comprobaciones de contacto sin avisos. La auditoría general cuenta 1.560 fotogramas válidos y ninguno inválido, incluyendo Novato y Tier 1.

Revisar la [galería estática](../assets/spritesheets/hd-128x256/previews/tier2-overview.png), la [galería animada](../assets/spritesheets/hd-128x256/previews/tier2-overview.gif) y las comparativas `equipment-review` de cada variante. El [informe conjunto](../assets/spritesheets/hd-128x256/previews/tier2-verification.json) reúne los puntos de control verificados desde GitHub. Hay commits por acción y por cierre de variante en la rama indicada arriba.

Próximo paso: revisión del usuario de Tier 2 y, después, su incorporación al juego con autorización de publicación. La integración ya aprobada de Novato y Tier 1 sigue siendo la activa. Las siguientes clases mantienen el orden del manifiesto, las mismas referencias corporales, la separación de equipo por sexo y el guardado por acción.

### Corrección de deriva horizontal en reposo

El usuario detectó que la maga se desplazaba lateralmente al cambiar de fotograma, mientras el espadachín masculino permanecía estable. Se midió el punto medio del apoyo de las botas en las 26 variantes HD completas: 13 necesitaban compensación. `alinear-reposo-hd.py` conserva los hashes y medidas en `idle-alignment-report.json` y genera `posiciones-idle-hd.json`; `--check` detecta datos obsoletos si cambian los originales. La deriva de la maga pasa de 9 píxeles a un máximo de medio píxel de variación del contorno; todas las variantes quedan en un píxel o menos. El espadachín masculino conserva sus cuatro posiciones.

La compensación horizontal del cuerpo conserva las fuentes, atlas, movimientos verticales y demás acciones. La [comparativa inicial](../assets/spritesheets/hd-128x256/previews/idle-alignment.gif) muestra la maga y el espadachín antes y después de estabilizar el cuerpo.

La revisión posterior del usuario detectó movimiento residual del equipo: se le estaba aplicando también la compensación corporal y el escudo femenino tenía un salto adicional de ocho píxeles en su cuarto fotograma. La solución actual mantiene para `idle` la capa de equipo y la máscara de dedos de la primera pose compartida; únicamente el cuerpo utiliza sus cuatro fotogramas y su compensación horizontal. Así se conservan parpadeo y respiración, y el equipo no deriva ni adquiere ajustes por clase. El reflejo se aplica al conjunto y las otras catorce acciones mantienen su sincronización completa por fase.

Revisadas las trece variantes femeninas con cinco combinaciones de equipo en sus cuatro fases: [galería animada](../assets/spritesheets/hd-128x256/previews/idle-equipment-f.gif), [cuatro poses con espada y escudo](../assets/spritesheets/hd-128x256/previews/idle-equipment-f-poses.png) y [comparativa de la maga](../assets/spritesheets/hd-128x256/previews/idle-equipment-comparison.gif). Las capas proceden de los atlas compactos usados por el juego. El informe valida 3.328 contactos de reposo en las 26 variantes sin avisos; las 22 pruebas de sprites, el análisis de código y la comprobación de tipos pasan.

## Contrato

- Cuerpo HD: PNG con alfa real, celda 128×256; atlas RGBA 512×3840.
- Cuatro fotogramas por acción. Quince filas de animación, hacia la derecha.
- Runtime anterior: celdas 64×128, atlas 256 × 1920 px. Se conserva hasta promover una variante completa.
- No incrustar armas, escudos, proyectiles ni estelas en el cuerpo. Equipo y efectos son capas separadas; probar también el consumible por separado.
- Misma identidad, cámara, iluminación y escala corporal entre acciones. Agacharse no aumenta el tamaño del cuerpo.
- Conservar fuentes grandes originales. No ampliar sprites antiguos para declararlos HD.

| Fila | Acción |
|---:|---|
| 0 | idle |
| 1 | walk |
| 2 | hurt |
| 3 | use_consumable |
| 4 | dodge |
| 5 | block_shield |
| 6 | attack_sword |
| 7 | attack_axe |
| 8 | attack_spear |
| 9 | attack_dagger |
| 10 | attack_bow |
| 11 | attack_staff |
| 12 | attack_mace |
| 13 | attack_book |
| 14 | attack_gloves |

## Orden y entregas

1. Recuperar Novato masculino: validar todos los PNG, buscar originales y sustituir archivos defectuosos. Corregir el progreso usando los bytes reales.
2. Consolidar la referencia visual: rostro, pelo castaño, bufanda granate, camisa marfil, cuero, pantalón azul y botas marrones. Revisar las acciones existentes juntas.
3. Probar cuatro poses de espada con una capa de arma. Fijar agarres, profundidad, espacio y sincronización antes de fabricar todos los ataques.
4. Completar las 15 acciones masculinas, revisar el atlas y continuar con Novato femenino.
5. Tier 1: Mago, Espadachín, Acólito y Arquero. Masculino y femenino de cada clase.
6. Tier 2: Caballero, Duelista, Sacerdote, Monje, Cazador, Explorador, Elementalista y Brujo. Masculino y femenino de cada clase.
7. Promover hojas completas revisadas de forma progresiva. Probar Novato pronto en desarrollo; no mezclar filas HD y antiguas en un atlas runtime.

Cada variante contiene 60 frames. Total Tier 0–2: 26 hojas y 1.560 frames corporales.

## Unidad de producción: una acción

1. Consultar manifiesto y referencia; no reabrir auditorías resueltas.
2. Crear una tanda coherente de cuatro poses; corregir solo las defectuosas.
3. Guardar fuente original y cuatro PNG individuales en `assets/spritesheets/hd-128x256/<clase>/<sexo>/frames/<accion>/`.
4. Mantener escala común y anclaje corporal. No centrar cada silueta por separado si elimina desplazamientos intencionados o mueve las manos respecto al arma.
5. Validar CRC PNG, decodificación completa, tamaño, alfa, recorte y diferencias en píxeles RGBA. Un hash de archivo distinto no demuestra otra pose.
6. Revisar secuencia animada y contacto a escala de combate: anatomía, identidad, continuidad y equipo. El QA técnico no aprueba arte.
7. Commit por acción con arte, procedencia y manifiesto. Publicar y comprobar los bytes remotos antes de afirmar que está guardada.

No crear un documento ni instalador por acción. No regenerar previews con bots que escriban commits en paralelo. Los derivados se guardan en el mismo checkpoint.

## Capas de equipo

El esquema de agarres es canónico y común a todas las clases del mismo sexo. El cuerpo adapta sus manos al esquema; el arma no se desplaza para corregir cada clase. Masculino y femenino tienen esquemas independientes.
Registrar agarre principal/secundario, orientación y profundidad por frame.
Compartir un único índice de frame entre cuerpo, equipo y sombra.
Probar partes detrás y delante del cuerpo; una máscara de manos/antebrazo puede preservar el agarre.
Las armas largas pueden necesitar un lienzo mayor con origen común y desbordamiento controlado; no reducir el cuerpo para encajarlas.
Reutilizar el mismo spritesheet de cada arma en todas las clases del mismo sexo: mismos agarres por acción/fotograma, orientación, escala, origen, profundidad y temporización. Para dos manos también se fija el agarre secundario. Las máscaras de oclusión deben conservar el contacto con el mango. La ropa y la silueta pueden variar, pero no los puntos de contacto ni la orientación de las manos. No se permiten offsets o escalas de equipo por clase.
La primera prueba de espada no valida todo el catálogo: comprobar después bloqueo, dos manos y arco.

## Integración

`SpriteHeroeAnimado.tsx` aún reproduce Idle, Caminar y Recibir daño. Se ampliará a las 15 acciones y capas con temporización compartida tras el ensayo de equipo.
Revisar combate individual, party y asedios, inversión horizontal, sombra, móvil y movimiento reducido. Mantener fallbacks antiguos por clase/sexo.
No hacer merge a `main` sin aprobación del conjunto que se vaya a promover.

## Herramientas y conservación

- `ensamblar-spritesheet-hd.py`: atlas final; exige los 60 PNG.
- `validar-spritesheet-hd.py`: validación del atlas final.
- `ensamblar-progreso-spritesheet-hd.py`: preview de desarrollo, nunca runtime.
- `test-spritesheets-hd.py`: regresiones del pipeline con imágenes sintéticas.
- `auditar-paquetes-tier2.py` y `validar-integracion-sprites-v2.py`: comprobación de fuentes y recursos anteriores todavía activos.

Se retiraron los generadores, instaladores y workflows v2 de escritura. Las fuentes útiles permanecen en `assets/spritesheets/originales/`; las entregas antiguas únicas están en `delivery-sources/`. El historial completo sigue en Git.
Los briefs y procedencias útiles se conservan en el manifiesto. Los PNG corruptos no cuentan como progreso y se sustituyen al recuperar originales válidos.

## Definición de terminado

Una acción exige cuatro PNG válidos, cuatro poses legibles, identidad consistente y revisión de capas. Una hoja exige las 15 acciones, atlas sin recortes/halos y prueba a tamaño de juego.
Estado técnico, revisión visual y publicación son independientes. La existencia de un archivo o un QA antiguo no implica aprobación.
Publicar bytes desde archivos mediante Git o blobs programáticos; nunca transcribir Base64 manualmente. Tras publicar, verificar el objeto Git y cargar el PNG completo desde el remoto.

## Comandos de trabajo

```bash
python scripts/auditar-sprites-hd.py --write
python scripts/auditar-sprites-hd.py
python scripts/ensamblar-progreso-spritesheet-hd.py --class-id novato --sex m
python scripts/test-auditar-sprites-hd.py
python scripts/test-spritesheets-hd.py
```

El auditor comprueba todos los frames presentes y conserva el detalle en el manifiesto. `--strict` rechaza también los archivos inválidos ya conocidos; la comprobación normal de CI garantiza que no se oculte una regresión cambiando solo los PNG. Una corrupción conocida es deuda pendiente, no una aprobación. `actionsCompleted` solo acepta revisión visual asociada a los hashes actuales; `audit.technicalActions` indica filas técnicamente utilizables.
Las previews incluyen contacto y GIF por acción técnicamente completa. Las fuentes recuperadas pueden guardarse como candidatas aunque aún requieran corrección de poses o equipo; nunca se convierten automáticamente en una acción aprobada.

`normalizar-accion-hd.py` extrae cuatro celdas con un recorte y escala compartidos. Conserva el PNG fuente, respeta el desplazamiento relativo entre poses y genera RGBA sin reducir la paleta. Su limpieza de alfa y transformación exacta se registran en `variants[].sources`. No sustituye la revisión artística ni calcula anclajes de armas.

## Checkpoint local — 2026-10-25

Novato masculino: 60 PNG corporales presentes; atlas candidato completo. La escala automática por anchura hacía que Idle y los ataques tuvieran cabezas de tamaños diferentes. Las fuentes nuevas de 2172×724 usan ahora una escala común de 0,23 y pies en y=248 (altura de pie aproximada: 156 px); el espacio superior queda disponible para equipo. No ajustar cada acción para llenar la celda. Bloquear y Esquivar heredados se reducen juntos, sin ampliar ni regenerar sus poses; la transformación y hashes anteriores quedan en el manifiesto. La revisión de continuidad y agarres sigue pendiente.

`normalizar-accion-hd.py --fixed-scale 0.23` conserva esta escala y rechaza poses que no caben, en vez de encoger automáticamente el personaje.

El bloqueo inicial del conector se resolvió el 25-10-2026 mediante Git con permiso. La continuación se publicó en `creacion-sprite-sheets`; una descarga independiente desde GitHub verificó los PNG completos y sus hashes. El recibo de publicación está en el manifiesto.

## Entrega corporal de Novato — 2026-10-25

- Masculino y femenino: 15 acciones y 60 PNG individuales por variante; sin equipo incrustado. Ambas hojas de 512×3840 son candidatas de revisión, no recursos promovidos al juego.
- Escala común, originales grandes conservados y prompts de las tandas nuevas registrados en el manifiesto. Los prompts ausentes del checkpoint heredado se identifican como ausentes, sin inventarlos.
- Corregidos el agarre de lanza masculino (dos manos separadas) y la alternancia de piernas de Caminar femenino. El normalizador admite el pequeño cambio de tamaño de la fuente editada sin deformarla ni perder un personaje.
- Previews individuales y comparativa animada de las 15 acciones. La comparativa sincroniza las cuatro fases para revisión; no define tiempos de combate.
- Prueba de espada en ambos sexos: agarres, ángulos, profundidad y máscaras de mano ligados a los hashes del cuerpo. Lienzo de equipo 256×256 con origen corporal (64,0), sin reducir el cuerpo para encajar el arma. Se usa el icono actual de espada a tamaño nativo como ensayo técnico; no se declara equipo HD nuevo ni validación del resto del catálogo.

Pendiente: revisión artística de los bucles a tamaño de combate, compatibilidad de escudo/dos manos/arco/consumible e integración de las 15 acciones en el renderer, incluidos reflejo horizontal y movimiento reducido. Mantener el runtime anterior hasta esa revisión y no fusionar con main sin aprobación.

Se conservan los commits por acción y los checkpoints de herramientas. Los 29 commits de arte y el contrato compartido se publicaron en `creacion-sprite-sheets`. La verificación remota del commit `fd6b653d` confirmó 120 fotogramas, 28 fuentes, dos atlas y ocho capas de espada; las 14 pruebas locales pasan. La revisión artística y la promoción al runtime siguen pendientes.

## Agarres compartidos entre clases — 2026-10-25

`manifest.json/equipmentRigs` contiene un esquema masculino y otro femenino. Las 26 variantes apuntan al esquema de su sexo. Espada ya tiene sus cuatro agarres y trayectorias trasladados a esta referencia común; las pruebas de Novato conservan únicamente los hashes específicos del cuerpo. El compositor rechaza agarres y transformaciones particulares por clase.

Las otras catorce acciones conservan las referencias corporales de Novato por sexo. Sus contactos numéricos con equipo, agarres secundarios y oclusiones todavía requieren revisión con las capas correspondientes. Asignar un esquema a una variante no valida por sí solo esos contactos ni convierte los recursos antiguos de Tier 2 en compatibles. Comprobar el contacto real de ambas manos usando exactamente la misma capa de equipo.

## Entrega corporal de Tier 1 — 2026-10-25

Orden: Mago, Espadachín, Acólito, Arquero; masculino y femenino de cada clase. Se reutilizan las quince secuencias de Novato como referencias geométricas del sexo correspondiente. El exportador registrado conserva su transformación de coordenadas completa, sin recalcular el centro según la anchura de túnicas, capas o armaduras. Si el vestuario rebasa la celda, se corrige el arte; no se desplaza el equipo.

`registrar-accion-hd.py` conserva cada fuente, prompt, hashes de las poses canónicas y cuatro PNG exportados en el manifiesto. Las referencias geométricas no sustituyen la revisión del contacto de manos: las acciones siguen como candidatas hasta verificar la misma capa de equipo por sexo. Un commit por acción y publicación por checkpoints.

| Clase | Masculino | Femenino |
|---|---:|---:|
| Mago | 60 fotogramas / 15 acciones | 60 fotogramas / 15 acciones |
| Espadachín | 60 fotogramas / 15 acciones | 60 fotogramas / 15 acciones |
| Acólito | 60 fotogramas / 15 acciones | 60 fotogramas / 15 acciones |
| Arquero | 60 fotogramas / 15 acciones | 60 fotogramas / 15 acciones |

Total nuevo: 480 PNG corporales y ocho atlas candidatos de 512×3840, con sus originales, prompts y previews. [Vista conjunta](../assets/spritesheets/hd-128x256/previews/tier1-overview.png) y [comparativa animada](../assets/spritesheets/hd-128x256/previews/tier1-overview.gif). Esta comparativa muestra cuatro fases sincronizadas para revisión; no define tiempos de combate.

Esquivar y Bloquear masculinos usan referencias ampliadas únicamente como plantillas geométricas, derivadas de Novato. El arte final de cada clase se genera de nuevo en alta resolución. Una calibración corporal común a las cuatro poses conserva la altura relativa al agacharse; no se ajusta cada silueta para llenar su celda. Las transformaciones y originales sustituidos quedan registrados.

Las 17 pruebas locales pasan. La auditoría estricta confirma 600 fotogramas válidos acumulados con Novato y ninguno inválido. Las diez variantes con prueba de espada producen exactamente los mismos cuatro PNG de arma para cada sexo, sin offsets particulares por clase. Se revisaron sus composiciones de contacto. El ensayo usa el icono existente; no representa un catálogo HD de equipo terminado.

Una descarga independiente de GitHub del commit de arte `9823b3a6` verificó 899 PNG completos: 600 cuerpos, 150 fuentes originales, diez atlas, cuarenta capas de espada y 99 previews/referencias. Se compararon los hashes con los archivos locales y con los registros del manifiesto. El recibo se conserva en `manifest.json/publication`.

Próximo paso: revisión artística de las ocho hojas a tamaño de combate y pruebas de escudo, dos manos, arco y consumible con equipo compartido. La promoción al juego y el merge a main siguen pendientes de esa revisión. Tier 2 conserva su lugar posterior en el plan.

## Catálogo HD de equipo compartido — 2026-10-25

Se han creado originales nuevos de las 24 armas del catálogo, los dos escudos, una poción abierta y la flecha común. Se conservan los 30 originales generados, incluidas dos revisiones sustituidas, sus prompts y hashes. El arte se exporta desde alta resolución con una única reducción uniforme, sin ampliar los iconos antiguos. [Catálogo y comparativas por objeto](../assets/spritesheets/hd-128x256/equipment/previews/README.md).

El contrato de producción está en `equipment/manifest.json`: 56 hojas (una por objeto y sexo), celdas de 384×384 y atlas de 1536×5760. El cuerpo sigue midiendo 128×256 y se coloca en (128,64); el espacio adicional permite dibujar las armas largas sin reducir al personaje. Las quince filas siguen el orden corporal; las acciones incompatibles con un objeto son transparentes. Hay 1.104 fotogramas activos de equipo, reutilizados en 5.520 composiciones de revisión.

Los centros de contacto se midieron sobre las poses canónicas y se comprobaron con Novato, Mago, Espadachín, Acólito y Arquero, en ambos sexos. La misma capa, escala, orientación, origen y temporización sirven para las cinco clases. No hay desplazamientos por clase. Hachas de dos manos y lanzas siguen ambos agarres; las manos pueden deslizar sobre el mango entre fases mediante un agarre del modelo común a todas las clases. Los bastones liberan la mano de lanzamiento cuando la pose lo requiere. El arco incluye cuerda tensada y flecha antes de soltar; la flecha posterior tiene su propia capa. Los guantes cubren ambos puños. Las máscaras compartidas restauran los dedos por delante de los mangos cuando corresponde; no se modifican los PNG corporales.

`registrar-equipo-hd.py` conserva los originales y registra la reducción. `ensamblar-equipo-hd.py` monta cada capa una sola vez por objeto/sexo y genera PNG y GIF comparativos sobre las cinco clases. `galeria-equipo-hd.py` prepara el catálogo y una galería HTML local con selección de objeto, sexo, acción, animación, escala y reflejo.

Las 23 pruebas locales pasan. `validar-equipo-hd.py` comprueba fuentes, hashes, decodificación completa, celdas idénticas a los fotogramas, reproducción del montaje a partir del contrato, contacto de las manos, ausencia de recortes y conservación de los 600 cuerpos. Se comprueba el reflejo reversible de los 1.104 fotogramas. El compositor del juego deberá reflejar cuerpo, equipo y máscaras juntos; su comportamiento en combate se revisará durante la integración.

Estado: candidatos revisados para Novato y Tier 1, pendientes de revisión del usuario e incorporación al juego. El código del juego no cambia en esta entrega. Las antiguas pruebas de espada de 256×256 quedan como historial; para integrar el catálogo HD se usa el nuevo contrato de 384×384. Tier 2 deberá respetar estos agarres cuando se produzcan sus cuerpos. No se fusiona con main ni se activa el nuevo catálogo en el juego en este paso.

La entrega de arte `5da0a068` se publicó y verificó mediante una descarga independiente: 1495 PNG completos y 276 GIF con todos sus fotogramas, comparados con los archivos locales y con los hashes del manifiesto remoto. GitHub también completó correctamente las 23 pruebas y la validación de toda la biblioteca: [ejecución de validación](https://github.com/joseconca/gremio-expediciones/actions/runs/40221780885). El recibo está en `equipment/manifest.json/publication`.

## Incorporación al juego autorizada — 2026-10-25

El usuario solicita incorporar Novato y Tier 1 con sus armas para comprobar el resultado en el juego antes de continuar con otras clases. Esta autorización sustituye la espera de integración de los checkpoints anteriores; no implica aprobación visual del resto de clases ni de un combate todavía no probado.

`public/sprites/hd-v1/` contiene diez atlas corporales, diez Idle originales, diez retratos calibrados y 56 atlas de equipo. `promover-sprites-hd.py` copia los atlas corporales y compacta las zonas transparentes de las armas sin escalar ni cambiar ningún píxel visible. Genera un contrato compacto de montaje sin prompts ni fuentes de producción. La calibración de los retratos usa una escala y origen comunes, exclusivamente para que las caras encajen en las miniaturas existentes. Los cuerpos de combate conservan sus PNG y coordenadas.

`SpriteHeroeAnimado` selecciona HD para las cinco clases terminadas y conserva las hojas anteriores para las demás. El nuevo compositor dibuja cuerpo, equipo y dedos desde un único índice de fotograma, respeta la profundidad y refleja la composición completa. La sombra y la silueta de selección reciben la misma acción y el mismo instante de inicio. El equipo se carga y comparte por objeto/sexo; ninguna clase usa un atlas de arma particular. Si falta un arma se conserva el cuerpo; si falla el atlas corporal se usa el recurso anterior.

Los ataques se eligen según el objeto equipado, incluidos guantes y libros; pociones, daño, esquiva y bloqueo tienen sus filas correspondientes. Las armas de dos manos excluyen el escudo. La cuerda y la flecha del arco se sincronizan con la salida del proyectil. El movimiento reducido selecciona una pose estable. La información visual del equipo se transmite a los miembros de party. El rival de asedio usa ahora la misma animación reflejada; una consulta autenticada, limitada a los dos participantes, obtiene únicamente clase, sexo, profesión activa y los identificadores de arma/escudo. No cambia la resolución ni los valores del combate.

La pantalla `/revision-sprites` permite revisar el montaje real sin iniciar combates: ambas variantes, las cinco clases, todos los equipos, acciones, orientación y tamaño de grupo. Se comprobó en navegador escritorio, lanza femenina en las cinco clases, reflejo y sombra a tamaño de grupo, y arco en una anchura móvil de 390 px sin desbordamiento horizontal. [Captura del montaje en el juego](../assets/spritesheets/hd-128x256/equipment/previews/integracion-juego.jpg).

Validación: compilación de producción y lint correctos; 43 pruebas de sprites/presentación/acceso visual y 75 pruebas de party correctas. Progresión: 132 correctas y dos fallos reproducidos sin cambios en `origin/main` (`c2c63889`): límite Job 40 frente a la expectativa 20, y máximo de recurso 113 frente a 23. Se conservan como deuda previa; esta integración no modifica esas reglas. No se ha ejecutado un combate real autenticado contra la base de datos desde esta sesión.

Próximo paso: el usuario comprueba el resultado jugando. Resolver sus observaciones antes de crear más clases. Tier 2 permanece pendiente.

La validación del paquete de juego reconstruye los 1.104 fotogramas de equipo desde los atlas compactos y confirma sus píxeles y alfa contra las fuentes revisadas. La memoria de imagen decodificada de las armas se reduce un 98,27 % (8.556.916 píxeles frente a 495.452.160). La caché conserva como máximo 16 imágenes; los actores montados mantienen sus referencias activas. El informe está en `runtime-integration-report.json`.

La validación de sprites de GitHub sobre la PR #3 pasa, incluidos los atlas compactos. Una descarga independiente del commit `b4715b37` verifica los 86 PNG de juego completos, el contrato de composición y la captura del navegador. La suite general de base da 85 correctas y un fallo previo: exige que los PNG de Botica y Mercado sean idénticos, aunque ambos archivos ya difieren en main; sus bytes y la prueba no han cambiado. Estos tres fallos previos (uno de base y dos de progresión) explican el estado rojo de Regression; sus pasos de sprites, party, lint y build pasan.

La integración está publicada en `creacion-sprite-sheets` y preparada en [PR #3](https://github.com/joseconca/gremio-expediciones/pull/3). La publicación directa en main fue rechazada por la revisión automática de permisos por requerir una autorización específica para cambiar la rama principal. Se ha solicitado ese permiso; hasta recibirlo, main conserva su versión anterior. La vista local de revisión usa la integración completa.

El usuario ha autorizado expresamente fusionar la PR #3 y publicar en main. GitHub confirma la fusión en `0b1afefbb88fc7024c3d9959a13247f467ce4329`; el código y los recursos públicos de main coinciden con la integración validada. La solicitud anterior de permiso queda resuelta. Próximo paso: verificación del usuario jugando, antes de producir más clases. La publicación en GitHub no acredita por sí sola el despliegue de un servidor externo.


<!-- TIER2_PROGRESS_START -->
## Producción HD de Tier 2

El usuario ha probado la integración anterior de Novato, Tier 1 y equipo, la considera correcta y solicita continuar con Tier 2 en orden. Se mantiene el mismo esquema de agarres por sexo y el mismo proceso de originales grandes, cuatro poses por acción y commits por acción.

| Clase | Masculino | Femenino |
|---|---|---|
| Caballero | 60 / 15 acciones; contactos revisados | 60 / 15 acciones; contactos revisados |
| Duelista | 60 / 15 acciones; contactos revisados | 60 / 15 acciones; contactos revisados |
| Sacerdote | 60 / 15 acciones; contactos revisados | 60 / 15 acciones; contactos revisados |
| Monje | 60 / 15 acciones; contactos revisados | 60 / 15 acciones; contactos revisados |
| Cazador | 60 / 15 acciones; contactos revisados | 60 / 15 acciones; contactos revisados |
| Explorador | 60 / 15 acciones; contactos revisados | 60 / 15 acciones; contactos revisados |
| Elementalista | 60 / 15 acciones; contactos revisados | 60 / 15 acciones; contactos revisados |
| Brujo | 60 / 15 acciones; contactos revisados | 60 / 15 acciones; contactos revisados |

Los atlas completos son candidatos para revisión del usuario. `revisar-contactos-clase-hd.py` reutiliza las capas de equipo ya existentes, registra los hashes corporales y genera comparativas de las quince acciones. El resultado técnico no sustituye la revisión artística. Las fuentes y revisiones sustituidas permanecen conservadas. Tier 2 no se activa automáticamente en el juego por generar un atlas.
<!-- TIER2_PROGRESS_END -->

## Ampliación del catálogo de clases — 2026-10-27

Se trabaja en `nuevas-clases`. El catálogo actual contiene 61 clases y 122 variantes; el informe derivado `previews/class-coverage.json` compara las clases reales con el manifiesto para que también figuren las especializaciones intermedias. El usuario ha aprobado el estilo de Super Novato inspirado en Ragnarok Online y solicita continuar con todas las clases pendientes, con una identidad propia y una apariencia más avanzada según su nivel.

| Clase nueva | Masculino | Femenino | Rasgos propios |
|---|---|---|---|
| Super Novato | 60 / 15 acciones | 60 / 15 acciones | Blanco y azul; estilo inspirado en Ragnarok Online |
| Berserker | 60 / 15 acciones; 682 contactos | 60 / 15 acciones; 682 contactos | Hierro oscuro asimétrico, cuello de pelo claro, cuero rojo oscuro y hebilla animal |
| Luchador | 60 / 15 acciones; 682 contactos | 60 / 15 acciones; 682 contactos | Chaleco turquesa y negro, vendas, coderas de cuero y broche de puño en cobre |
| Centinela | 60 / 15 acciones; 682 contactos | 60 / 15 acciones; 682 contactos | Láminas de bronce, mangas verde oscuro, tabardo claro y emblemas de puerta |
| Escriba Arcano | 60 / 15 acciones; 682 contactos | 60 / 15 acciones; 682 contactos | Abrigo pergamino y tinta, gafas de latón, broche de pluma y sellos violetas |
| Bardo | 60 / 15 acciones; 682 contactos | 60 / 15 acciones; 682 contactos | Boina ciruela con pluma marfil, jubón verde petróleo y broche de lira |
| Comerciante | 60 / 15 acciones; 682 contactos | 60 / 15 acciones; 682 contactos | Abrigo ocre, chaleco verde botella, gafas ovaladas, cadena de reloj y bolsillos cuadrados |
| Cruzado | 60 / 15 acciones; 682 contactos | 60 / 15 acciones; 682 contactos | Acero con bordes dorados, peto marfil, tabardo rojo vino y emblema solar |
| Pirata | 60 / 15 acciones; 682 contactos | 60 / 15 acciones; 682 contactos | Bicornio azul con nudo de latón, chaqueta coral e índigo, fajín óxido y botas marinas |

Las ocho últimas clases suman 960 fotogramas nuevos; hay 2.640 cuerpos válidos acumulados, ninguno inválido, y 39 clases todavía pendientes (1.170 acciones). Cada sexo y acción conserva su original grande, instrucciones, revisiones y commit. Se corrigieron prendas residuales, la continuidad de accesorios y puntos de agarre antes de cerrar los atlas. Las comparativas completas están en `previews/CLASE-overview.gif` para cada clase terminada. La auditoría estricta y las 29 pruebas de animación pasan. Se ha corregido la copia de instrucciones en los metadatos de 38 revisiones: ahora coincide con el archivo de instrucciones específico de cada revisión, que ya estaba conservado junto al original.

La revisión ampliada `equipment-review/ACCION-grips.png` permite comprobar las manos con el equipo real. El control automático de contacto puede encontrar tela u otro brazo y no acredita por sí solo un agarre correcto. Se corrigió la tercera pose de daga masculina en estas ocho clases: el puño delantero debe alcanzar el punto compartido (84,161), equivalente a (1462,318) en la fuente canónica grande; la referencia antigua masculina dejaba separación. Se conservan completas las otras tres poses de sus fuentes anteriores. No se mueven armas ni se añaden ajustes por clase. Escriba Arcano utiliza además su montaje equipado como referencia de corrección. Las clases anteriores a esta ampliación requieren todavía esta comprobación visual ampliada.

Para la lanza masculina de Centinela se seleccionan poses completas de dos revisiones generadas de la misma acción: fases 1, 2 y 4 de la cuarta revisión; fase 3 de la quinta. `registrar-accion-hd.py --frame-source N=PATH` conserva cada original, hash, transformación y procedencia por fotograma. No retoca píxeles ni desplaza miembros o equipo: exporta cada pose con la transformación canónica idéntica. Las cuatro celdas finales se han reproducido de forma independiente desde sus originales y coinciden byte a byte. Las revisiones descartadas, incluidas las que excedían la celda, permanecen conservadas.

La lanza femenina de Comerciante conserva las poses 1 y 3 originales y las poses 2 y 4 de su segunda revisión para mantener las gafas en todas las fases. Las cuatro celdas se reproducen byte a byte desde los originales con la transformación canónica; el historial conserva ambas revisiones anteriores aunque la fuente principal repita sus bytes.

El manifiesto conserva la dirección artística de las seis especializaciones nuevas de Tier 2, las diez híbridas de Tier 2.5, las 23 superiores de Tier 3 y las ocho de Tier 3.5, con una política de diferenciación por nivel: las clases híbridas combinan sus linajes y las superiores añaden materiales e insignias, manteniendo la escala corporal y el equipo compartido. `cerrar-clase-hd.py` comprueba ambos atlas y los hashes de los contactos antes de registrar la clase como candidata y crear su comparativa. Este cierre técnico no concede aprobación artística ni activa recursos en el juego.

Siguiente clase: Druida, masculino y femenino; después las demás híbridas de Tier 2.5, Tier 3 y Tier 3.5. Super Novato cubre la única clase de Tier 1.5 del catálogo actual.
