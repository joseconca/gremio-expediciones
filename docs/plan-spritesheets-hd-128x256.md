# Producción de sprites de personajes

Único documento operativo. Rama: `creacion-sprite-sheets`.
Estado verificable: [manifest.json](../assets/spritesheets/hd-128x256/manifest.json).
Los informes automáticos son derivados técnicos, no planes alternativos.

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
