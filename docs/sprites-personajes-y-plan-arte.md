# Estándar de arte y plan de sprites de personajes

## Objetivo artístico

Cada clase jugable debe tener un diseño propio, reconocible a tamaño de combate. La referencia de calidad es el pixel art de RPG de fantasía/MMO con siluetas memorables, proporciones legibles, volúmenes de metal y tela, sombras deliberadas, reflejos por grupos de píxeles y una paleta coherente. Se pueden tomar como referencia los estándares visuales de juegos como Ragnarok Online, Lineage II o World of Warcraft, sin copiar sus personajes ni sus recursos.

**No reutilizar el cuerpo de Novato ni construir clases colocando accesorios sobre una silueta común.** Cada clase tiene que diseñarse y dibujarse como personaje original de cuerpo completo: anatomía, silueta, ropa, armadura, capa, pelo, accesorios cosidos y paleta coherentes entre sí. Novato sirve como referencia de calidad y proporciones generales, no como plantilla que se vista.

Las armas no se dibujan dentro de los sprites del cuerpo. Se representan en capas independientes para mostrar el arma equipada de cada personaje y permitir cambiarla sin duplicar las animaciones. Las poses de ataque sí deben preparar las manos y el cuerpo para el anclaje del arma que corresponda. El escudo y demás equipo que deba cambiarse visualmente también debe estudiarse como capa independiente cuando se implemente ese sistema.

## Contrato técnico de la spritesheet final

- Formato: PNG con transparencia real; se acepta RGBA o PNG indexado con índice transparente (tRNS). No usar un fondo negro, blanco ni un damero pintado.
- Lienzo final por personaje/sexo: **256 × 1920 px**.
- Celda de cada fotograma: **64 × 128 px**.
- Columnas: **4**, fotogramas de izquierda a derecha.
- Filas: **15**, una acción por fila y ordenadas como se define abajo.
- Orientación: un único perfil/ángulo tres cuartos mirando hacia la derecha. No crear filas ni sprites mirando hacia arriba, abajo o izquierda; no duplicar trabajo para otras direcciones.
- Masculino y femenino son recursos distintos. Se conservan la misma celda, escala de cámara, línea de suelo y lenguaje visual, pero cada diseño tiene identidad propia.
- Mantener el personaje completo dentro de cada celda, sin cortar pelo, manos, capa, botas ni efectos que pertenezcan al cuerpo. Centrar los pies y mantener una línea de suelo consistente entre frames y acciones.
- Evitar texto, etiquetas, marcos, sombras de presentación, fondos y separadores dentro de las imágenes de juego.
- La hoja final no se reconstruye ni se publica sobre la hoja que consume el juego hasta validar las 15 filas. Mientras falten acciones, los recursos se guardan por separado en la carpeta de trabajo de arte.

## Tabla de filas

Los índices son de base cero para el código. En el PNG final la coordenada Y de la fila es `fila × 128`. Cada fila contiene cuatro frames, y cada frame ocupa 64 × 128 px.

| Índice | Acción | ID |
|---:|---|---|
| 0 | Idle | `idle` |
| 1 | Caminar | `walk` |
| 2 | Recibir daño | `hurt` |
| 3 | Usar consumible | `use_consumable` |
| 4 | Esquivar | `dodge` |
| 5 | Bloquear con escudo | `block_shield` |
| 6 | Ataque con espada | `attack_sword` |
| 7 | Ataque con hacha | `attack_axe` |
| 8 | Ataque con lanza | `attack_spear` |
| 9 | Ataque con daga | `attack_dagger` |
| 10 | Ataque con arco | `attack_bow` |
| 11 | Ataque con bastón | `attack_staff` |
| 12 | Ataque con maza | `attack_mace` |
| 13 | Ataque con libro | `attack_book` |
| 14 | Ataque con guantes | `attack_gloves` |

## Estructura de trabajo y publicación

Guardar el arte original y validado por acción, sexo y clase, separado de las hojas activas:

```text
assets/spritesheets/originales/
  espadachin/
    idle/
      espadachin-m-idle.png   # 256 × 128; cuatro frames masculinos
      espadachin-f-idle.png   # 256 × 128; cuatro frames femeninos
    walk/
    hurt/
    use_consumable/
    dodge/
    block_shield/
    attack_sword/
    attack_axe/
    attack_spear/
    attack_dagger/
    attack_bow/
    attack_staff/
    attack_mace/
    attack_book/
    attack_gloves/

public/sprites/heroes/espadachin/
  espadachin-m-sheet.png      # export final de 256 × 1920; cuando esté completo
  espadachin-f-sheet.png      # export final de 256 × 1920; cuando esté completo
```

Los archivos de trabajo deben conservar las cuatro celdas a tamaño nativo; los maestros de mayor resolución pueden archivarse aparte como fuentes, pero no se usan en runtime. Si se genera una imagen de concepto mayor, la reducción a tamaño de juego se revisa a 100 % y con ampliación nearest-neighbor, no se da por aprobada solo porque la versión grande se vea bien.

## Proceso por entregas y commits

1. **Idle masculino**: diseño original completo y cuatro frames; exportación y validación de transparencia, dimensiones, márgenes y continuidad.
2. **Idle femenino**: mismo control de calidad, diseño original propio.
3. **Caminar masculino y femenino**, validando ciclo y apoyos de pies.
4. Seguir con las filas restantes en el orden de la tabla, por acción y sexo; evitar generar todas las animaciones en una operación monolítica.
5. Mantener un commit pequeño y recuperable por entrega terminada (como mínimo un commit por sexo y acción; el commit debe incluir los PNG y actualizar este documento si cambia el estado).
6. Al completar las 15 acciones, montar y validar cada hoja final de 256 × 1920, comprobando orden, alpha, celdas, anclajes y ausencia de armas integradas antes de sustituir recursos de runtime.

### Criterios de aceptación para cada acción

- PNG de trabajo con dimensiones exactas de 256 × 128, cuatro celdas de 64 × 128.
- Transparencia real, sin damero, halo de fondo ni píxeles sueltos fuera del personaje.
- Cuatro fotogramas que muestren una animación intencional; no repetir cuatro copias idénticas ni aplicar solo cambios automáticos de color.
- La silueta completa permanece dentro de cada celda. Los pies no saltan de altura por errores de recorte.
- La clase es identificable por su diseño original, no por un accesorio colocado encima de la base de otra clase.
- Las manos y poses están libres de armas dibujadas en el cuerpo. Las capas de arma se añadirán mediante anclajes por acción/frame en una etapa independiente.
- Abrir y revisar el PNG final con cuadrícula de transparencia y ampliación por vecino más cercano; ejecutar las validaciones del repo que correspondan antes de cerrar la entrega.

## Estado actual

**Completado en esta fase:** Idle masculino y femenino del Espadachín están versionados en commits independientes bajo `assets/spritesheets/originales/espadachin/idle/`. Cada recurso tiene 256 × 128 px (4 × 64 × 128), transparencia real y cuatro fotogramas distintos; no se han dibujado armas dentro del cuerpo. Estos recursos todavía no sustituyen las hojas activas. La siguiente entrega es **Caminar masculino y femenino**, seguida de las acciones restantes en el orden de la tabla.
