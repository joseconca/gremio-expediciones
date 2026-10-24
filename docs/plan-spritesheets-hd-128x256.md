# Plan de producción de spritesheets HD (128×256 por fotograma)

**Rama de trabajo:** `creacion-sprite-sheets`  
**Fecha de inicio:** 2026-10-24  
**Estado:** planificación y auditoría inicial completadas; producción artística pendiente.  
**Documento de seguimiento vivo:** [`assets/spritesheets/hd-128x256/manifest.json`](../assets/spritesheets/hd-128x256/manifest.json)

## 1. Objetivo

Renovar desde arte de mayor definición las hojas completas de las 13 clases jugables de Tier 0, Tier 1 y Tier 2, primero un sexo y después el otro de cada clase. Mantener la dirección de arte de RPG medieval fantástico, con una influencia general de los MMO/RPG clásicos como Ragnarok Online, pero con más detalle en rostros, telas, cuero y metal. La referencia sirve para el lenguaje visual, no para copiar recursos protegidos.

No se trata de ampliar por vecino más cercano las celdas existentes de 64×128. El arte nuevo debe contener información visual real a la resolución objetivo. Los conceptos conservados se reutilizarán como referencia de identidad, vestuario, paleta y silueta cuando aporten valor; las clases sin una fuente suficientemente definida se rediseñarán desde cero. Las fuentes antiguas se conservarán hasta verificar que ya no se necesitan.

## 2. Contrato técnico HD objetivo

- **Fotograma:** 128×256 px.
- **Hoja completa por clase y sexo:** 512×3840 px, PNG RGBA con transparencia real.
- **Cuadrícula:** 4 columnas × 15 filas, cuatro poses de izquierda a derecha por acción.
- **Cobertura:** las 15 filas en cada hoja; no se considera terminada una hoja que contenga solo Idle/Caminar/Recibir daño.
- **Orientación:** perfil o tres cuartos consistente, siempre mirando a la derecha.
- **Composición:** cuerpo completo dentro de cada celda, escala de cámara y línea de suelo consistentes; no cortar pelo, manos, capa ni botas.
- **Diseño:** personajes completos y reconocibles entre sí. No vestir una silueta común para simular clases distintas.
- **Equipo:** no incrustar armas, escudos ni equipo intercambiable en el cuerpo base. Las poses deben preparar manos y anatomía para las capas de equipo del juego.
- **Acabado:** detalles finos y sombreado por planos, con siluetas nítidas y materiales legibles. Evitar suavizado automático como sustituto del detalle artístico.
- **Runtime:** las hojas HD se mantendrán aisladas en staging hasta validar y aprobar el conjunto; no sustituir el arte activo durante la producción.

### Orden de filas (índice base cero)

| Fila | ID | Acción |
|---:|---|---|
| 0 | `idle` | Reposo |
| 1 | `walk` | Caminar |
| 2 | `hurt` | Recibir daño |
| 3 | `use_consumable` | Usar consumible |
| 4 | `dodge` | Esquivar |
| 5 | `block_shield` | Bloquear con escudo |
| 6 | `attack_sword` | Ataque con espada |
| 7 | `attack_axe` | Ataque con hacha |
| 8 | `attack_spear` | Ataque con lanza |
| 9 | `attack_dagger` | Ataque con daga |
| 10 | `attack_bow` | Ataque con arco |
| 11 | `attack_staff` | Ataque con bastón |
| 12 | `attack_mace` | Ataque con maza |
| 13 | `attack_book` | Ataque con libro |
| 14 | `attack_gloves` | Ataque con guantes |

## 3. Orden de producción

Trabajar una combinación de **clase + sexo** de principio a fin, incluyendo sus 15 acciones, antes de pasar al siguiente sexo. Así no se mezclan diseños ni quedan hojas parciales dispersas.

1. **Tier 0:** Novato masculino → Novato femenino.
2. **Tier 1:** Mago masculino/femenino → Espadachín masculino/femenino → Acólito masculino/femenino → Arquero masculino/femenino.
3. **Tier 2:** Caballero → Duelista → Sacerdote → Monje → Cazador → Explorador → Elementalista → Brujo. Para cada clase, completar masculino y después femenino antes de avanzar.

No se iniciará el segundo sexo de una clase hasta que la hoja del primero tenga sus 15 filas ensambladas y haya pasado la validación técnica. La revisión visual sigue siendo requisito separado de la validación automática.

## 4. Flujo para cada clase y sexo

1. **Inspección de fuentes:** revisar la hoja activa, los másteres v2, los conceptos, los informes QA, los commits y los documentos existentes de esa clase.
2. **Brief visual:** fijar silueta, anatomía, vestuario, paleta, pelo, materiales y rasgos distintivos antes de generar acciones.
3. **Concepto de alta definición:** reutilizar y reconstruir el concepto si existe una fuente útil. Si solo hay una fuente pequeña, usarla como referencia y crear arte nuevo; no usar el escalado de la hoja antigua como arte final.
4. **Producción por acción:** generar/normalizar una tira de cuatro poses por cada una de las 15 acciones. Mantener constante el personaje, la cámara, la escala, la iluminación y la línea de suelo.
5. **Ensamblado:** componer las 15 tiras de 512×256 en una hoja exacta de 512×3840. El proceso debe comprobar los límites de celda y no permitir que se mezclen filas o fotogramas.
6. **QA automatizado:** verificar dimensiones, RGBA/alfa real, 15 filas, cuatro fotogramas visibles y distintos por fila, ausencia de celdas vacías, integridad de recorte, hashes y línea de suelo razonablemente estable.
7. **QA visual:** revisar la hoja completa, cada fila ampliada y la versión a tamaño real de juego. Comprobar especialmente manos, rostro, contornos, transparencias/halos, continuidad de movimiento y que los ataques tengan poses útiles para el anclaje de armas.
8. **Commit de checkpoint:** guardar arte fuente, hoja ensamblada, preview e informe QA juntos. Actualizar el manifiesto de estado en el mismo checkpoint o inmediatamente después.
9. **Promoción posterior:** cuando la colección esté validada, adaptar validador, tests y exportadores; integrar los atlas completos en producción en un commit separado. No promover filas HD mezcladas con las antiguas por accidente.

## 5. Estructura de trabajo propuesta

El staging nuevo debe quedar aislado de `v2` y de las imágenes que consume el runtime:

```text
assets/spritesheets/hd-128x256/
  manifest.json
  <clase>/
    <m|f>/
      concept/                 # solo si existe o se crea un concepto útil
      source/                  # fuentes originales sin pérdida
      actions/
        idle.png               # tira normalizada 512×256
        walk.png
        ...
        attack_gloves.png
      <clase>-<sexo>-sheet.png # hoja completa 512×3840
      preview.png
      qa-report.json
```

Las rutas y nombres definitivos se comprobarán al crear el primer paquete; no deben cambiarse a mitad de la producción sin actualizar el generador y el manifiesto. La exportación a `public/sprites/heroes/<clase>/` se reserva para la fase de integración.

## 6. Auditoría inicial del repositorio

- El contrato activo actual está definido en `SPRITESHEETS_PERSONAJES.json`, `docs/spritesheets-personajes.md`, `docs/sprites-personajes-y-plan-arte.md` y los validadores de integración. Describe celdas de 64×128 y hojas de 256×1920; **no debe confundirse con el contrato HD objetivo**.
- Ya existen másteres v2, tiras, frames, previews e informes QA en `assets/spritesheets/originales/`. Se deben reutilizar para referencia y trazabilidad, no asumir que ya son arte HD.
- Se verificó que existen fuentes de alta resolución para **Brujo, Cazador, Elementalista y Explorador** en la biblioteca persistente del proyecto, además de manifiestos/paquetes relacionados en Git. No todas esas fuentes están guardadas en el repositorio; antes de utilizarlas se deben recuperar en el staging HD con ruta original, dimensiones, tipo de alfa y SHA-256.
  - **Brujo:** existen concept y acciones femeninas de alta resolución; las fuentes masculinas están dentro de `brujo-m-originales-alta-resolucion.zip`. Al menos una fuente Idle tiene un damero opaco incrustado: no debe tratarse como transparencia real.
  - **Cazador:** hay concept y fuentes de Idle/Caminar/Recibir daño para ambos sexos, además de variantes. Elegir la referencia canónica tras revisión visual y de alfa; separar originales de derivados con fondo corregido.
  - **Elementalista:** la variante femenina dispone de concepto aislado y fuentes de acción. Los archivos masculinos localizados son láminas compuestas con paneles/texto, no un máster de personaje limpio; sirven como referencia y habrá que reconstruir el arte utilizable del personaje masculino.
  - **Explorador:** hay concepto y fuentes de acción de alta resolución para ambos sexos. Algunas fuentes originales llevan damero opaco y existen derivados separados; preservar ambos y verificar visualmente los contornos del derivado.
- Para **Novato, Mago, Espadachín, Acólito, Arquero, Caballero, Duelista, Sacerdote y Monje** no se identificó un paquete `source-hires` equivalente en el inventario de Git. Hay que inspeccionar el arte conceptual y másteres disponibles de cada uno; si la resolución/detalle no basta, redibujar a partir de un brief, no ampliar las celdas de 64×128.
- La auditoría de alta resolución inicial se registra en `assets/spritesheets/hd-128x256/manifest.json`. No se elimina ningún original ni derivado: la limpieza queda aplazada hasta demostrar duplicidad y ausencia de referencias.
- `src/components/combate/SpriteHeroeAnimado.tsx` posiciona la hoja por porcentajes (`400% 1500%`) y mantiene una ventana con proporción 1:2; el doble de resolución conserva la misma proporción. No se debe dar por validado el renderizado solo por ello: durante la integración se comprobarán el filtrado visual, las pruebas de dimensiones y la generación de retratos.
- Los workflows antiguos de sprites tienen disparadores y pasos que apuntan expresamente a `main` y varios generadores están fijados a 64×128. No deben ejecutarse para producir estos recursos. El nuevo pipeline deberá ser específico de HD y escribir exclusivamente en `creacion-sprite-sheets`.
- El marcador raíz `.spritesheets-clase-refinados-v1` evita volver a ejecutar un refinado anterior. Se conserva salvo que una inspección posterior pruebe que es obsoleto y que ningún workflow lo necesita.

## 7. Herramientas HD separadas

El workflow quedó probado en GitHub Actions el 24-10-2026 y terminó en verde: [run 40079854725](https://github.com/joseconca/gremio-expediciones/actions/runs/40079854725), commit probado `303cff2`. La prueba cubre la estructura y el QA técnico con imágenes sintéticas; no reemplaza la revisión visual de sprites reales.

Se ha creado un pipeline independiente del contrato legado:

- `scripts/ensamblar-spritesheet-hd.py`: exige las 15 tiras de acción en `<clase>/<sexo>/actions/<accion>.png`, cada una de 512×256 RGBA, valida los cuatro frames y compone la hoja de 512×3840. Genera además un informe QA con hashes; con `--preview` produce una vista de revisión con damero, nunca un recurso runtime.
- `scripts/validar-spritesheet-hd.py`: valida la hoja completa y puede guardar un informe JSON independiente.
- `scripts/test-spritesheets-hd.py`: prueba el ensamblado con tiras sintéticas y verifica que la ausencia de una acción haga fallar el proceso antes de crear una hoja.
- `.github/workflows/validar-spritesheets-hd.yml`: ejecuta comprobación de sintaxis y pruebas sintéticas solo para cambios del pipeline HD en la rama de trabajo o en una futura PR a `main`. No necesita imágenes artísticas ni modifica atlas.

Ejemplo de uso cuando se hayan creado las 15 tiras de Novato masculino:

```bash
python scripts/ensamblar-spritesheet-hd.py --class-id novato --sex m --preview
```

El comando fallará deliberadamente mientras falte cualquier acción. Este pipeline no reduce ni amplía los sprites antiguos, no accede a rutas runtime y no aprueba por sí solo la calidad artística.

## 8. Limpieza de archivos

No borrar fuentes ni artefactos durante esta primera fase. Tras completar la auditoría de uso:

- conservar conceptos originales, másteres seleccionados, salidas fuente reproducibles, QA y previews necesarios para revisar el arte;
- identificar duplicados exactos mediante hash y referencias reales de scripts/workflows;
- eliminar solo derivados redundantes o artefactos temporales que no sean fuente canónica, no formen parte de la trazabilidad y no estén referenciados;
- registrar cualquier eliminación en el manifiesto y en un commit separado.

## 9. Criterios de aceptación de una hoja

Una variante no se marca como terminada hasta cumplir todos estos puntos:

- [ ] hoja PNG RGBA de 512×3840 px y transparencia real;
- [ ] 60 celdas de 128×256 px: 4 fotogramas × 15 acciones;
- [ ] cada fila tiene cuatro poses visibles, diferenciadas y en el orden correcto;
- [ ] ningún fotograma vacío, cortado, desplazado o con píxeles de otra celda;
- [ ] línea de suelo, escala y cámara consistentes;
- [ ] silueta, cara, prendas y materiales coherentes entre las 15 acciones;
- [ ] equipo/armas no incrustados en el cuerpo base;
- [ ] preview completa e informe JSON reproducible, con hashes;
- [ ] revisión visual a resolución nativa y a escala de combate superada;
- [ ] estado actualizado y commit de checkpoint publicado.

## 10. Estrategia de commits y recuperación

Crear commits pequeños y verificables; no acumular muchas clases en un único commit. Como mínimo, un checkpoint por concepto validado, por paquete de acciones cuando la interrupción pueda dejar trabajo difícil de recuperar y por cada hoja final de clase/sexo. El manifiesto se actualiza en cada cambio de estado y registra el último commit conocido.

La rama de trabajo no se fusionará a `main` sin aprobación explícita del conjunto. Al reanudar el trabajo, leer primero este plan y `assets/spritesheets/hd-128x256/manifest.json`; usar el siguiente elemento pendiente, no repetir clases ya marcadas como completadas.
