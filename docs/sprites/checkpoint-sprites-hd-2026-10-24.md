# Checkpoint de arte HD — 24-10-2026

## Rama y objetivo

- Repositorio: `joseconca/gremio-expediciones`
- Rama activa: `creacion-sprite-sheets`
- Contrato: un PNG individual por fotograma de animación, celda final de 128 × 256 px, transparencia real y QA por archivo.
- Orden de producción: Tier 0 → Tier 1 → Tier 2; una clase y un sexo cada vez. Completar las 15 acciones de cada variante antes de empezar la siguiente.

## Estado confirmado

**Novato masculino (Tier 0)**

- `Idle`: frames 01–04 completos como PNG individuales y con QA.
- `Walk`: frames 01–04 completos como PNG individuales y con QA.
- `Hurt`: frames 01–04 completos como PNG individuales, con QA por frame. La acción se generó en una tanda de cuatro poses y después se separó en celdas individuales.
- `Use Consumable`: frames 01–04 completos como PNG individuales, con QA por frame. Acción producida en una tanda de cuatro poses y separada en celdas de 128×256.
- Siguiente recurso exacto: `novato-m-dodge-01` (Esquivar, frame 01). No se ha empezado Novato femenino ni otra clase.
- El ciclo Walk está completo técnicamente; todavía requiere revisión visual conjunta de cadencia y línea de suelo.

**Ilustración maestra para menús**

- Archivo: `assets/spritesheets/hd-128x256/novato/m/artwork/novato-m-character-illustration.png`
- Resolución: 448 × 1075 px.
- Peso: 41 535 bytes.
- SHA-256: `8f3532f025c1e32cce43f41deb79c72dae830939210ac052806a5a332d98b0e6`
- QA: `assets/spritesheets/hd-128x256/novato/m/artwork/novato-m-character-illustration.qa.json`
- Estado: importada y hash verificado en CI. Falta revisión en la UI real antes de conectar componentes de perfil/menú/inventario.
- Esta ilustración es un recurso independiente; nunca debe convertirse automáticamente en fotogramas de combate.

## CI y commits

- Importación de ilustración: [workflow run #40088680223](https://github.com/joseconca/gremio-expediciones/actions/runs/40088680223) — concluido correctamente.
- Pipeline de ensamblado por PNG individuales: [workflow run #40085136592](https://github.com/joseconca/gremio-expediciones/actions/runs/40085136592) — concluido correctamente.
- Commit de importación de la ilustración: `39fbcbec3f653a2938538eecc7d4a333ec824111`.
- El manifiesto de `assets/spritesheets/hd-128x256/manifest.json` es la fuente de verdad para el siguiente frame y el avance por variante.

## Criterios de aceptación que no deben relajarse

1. Generar una acción completa con cuatro poses en una tanda cuando sea más eficiente; después separar y guardar cada pose como PNG individual. No integrar la composición de referencia como recurso de juego.
2. Si la generación devuelve varias poses, etiquetas, cuadrículas o una presentación, descartarla como arte de producción.
3. PNG final de 128 × 256 px, canal alfa/transparencia reales, cuerpo sin recortes accidentales, escala y línea de suelo coherentes con el resto del ciclo.
4. Cada PNG debe tener su propio JSON de QA. Validar dimensiones, transparencia, hash y unicidad dentro de la acción.
5. Hacer commit al completar cada acción de cuatro fotogramas; actualizar el manifiesto, conservar cuatro QA individuales y registrar el siguiente punto exacto.
6. No modificar hojas de producción ni rutas consumidas por el juego hasta completar ensamblado y revisión visual.

## Próxima sesión

Crear **Novato masculino · Esquivar (dodge)** como una tanda de cuatro poses. Separarlas a PNG individuales, verificar dimensiones/transparencia/alfa y QA, revisar visualmente la acción y guardar un commit para el lote. Después continuar con Bloquear (block_shield).
