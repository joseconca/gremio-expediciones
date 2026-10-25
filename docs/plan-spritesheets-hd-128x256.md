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

El cuerpo es canónico; el arma se alinea a las manos, no al centro de la silueta.
Registrar agarre principal/secundario, orientación y profundidad por frame.
Compartir un único índice de frame entre cuerpo, equipo y sombra.
Probar partes detrás y delante del cuerpo; una máscara de manos/antebrazo puede preservar el agarre.
Las armas largas pueden necesitar un lienzo mayor con origen común y desbordamiento controlado; no reducir el cuerpo para encajarlas.
Reutilizar trayectorias entre clases solo si sus agarres son compatibles.
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
