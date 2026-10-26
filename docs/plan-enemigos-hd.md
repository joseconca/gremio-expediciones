# Enemigos HD — fantasía medieval

Catálogo de 54 enemigos y jefes, obtenido de `ENEMIGOS` y `JEFES_ELITE`. Se conserva cada ID y la identidad de la criatura. Las copias antiguas que son simples referencias compartidas no limitan el diseño nuevo.

Contrato: una hoja RGBA por enemigo con cuatro columnas y cuatro filas en orden `idle`, `hurt`, `attack`, `dodge`. Las celdas parten de 384 × 384 y crecen en múltiplos de 64 si una pose amplia lo necesita; el tamaño exacto de cada hoja está en su informe. El cuerpo conserva la altura fijada por especie en `scale-targets.json`, sin reducirlo para encajar un ataque. La referencia real es el espadachín HD de 155 píxeles de altura visible: humanos de 168 aproximadamente, orcos de 192, ogros de 224; las especies pequeñas mantienen sus proporciones. La [comparativa 1:1](../assets/spritesheets/enemies-hd/previews/scale-comparison.png) usa los mismos píxeles y la misma línea de suelo, sin ajustar cada figura a su recuadro. Cada informe conserva el anclaje corporal para respetar esta escala al integrarlo en combate.

Detalle y acabado ilustrado de los personajes HD, contorno legible, materiales pintados y perspectiva lateral de tres cuartos hacia la derecha. Cada criatura mantiene una única escala en las dieciséis poses. Reposo con apoyo estable, respiración sutil y sin deriva horizontal; ataque con anticipación, impacto y recuperación. Sin fondos, suelo, texto ni sombras incrustadas.

Dirección artística vigente tras la última revisión: acabado pintado de fantasía RPG y proporciones serias acordes a los personajes jugables. Reducir el aspecto chibi, las cabezas y ojos sobredimensionados, las extremidades cortas y las expresiones caricaturescas. Los humanoides adultos se comparan directamente con el espadachín como referencia de anatomía y estilo, aproximadamente cuatro a cuatro cabezas y media de altura. Las especies no humanas conservan su anatomía propia con el mismo tratamiento más sobrio. Se mantienen los tamaños por especie ya corregidos. Evitar tanto mascotas adorables como realismo fotográfico o terror. Los bocetos y versiones sustituidas se conservan; ninguna hoja implica aprobación artística del usuario.

Producción mediante la herramienta integrada de generación de imágenes, con los personajes HD como referencia de estilo. Se conservan originales, instrucciones, hashes, fotogramas y previsualizaciones animadas. El ensamblado solo separa, alinea y empaqueta el arte; no dibuja criaturas ni inventa poses.

Se revisa cada hoja completa, transparencia, dieciséis poses, márgenes y coherencia del diseño. El progreso se guarda en commits de `creacion-sprite-sheets`. El manifiesto de `assets/spritesheets/enemies-hd` indica el avance real. La integración en combate y la publicación en main se realizan después de revisar la biblioteca terminada.

La biblioteca completa está disponible en la [galería animada](../assets/spritesheets/enemies-hd/previews/revision.html), con navegación por rango/jefes y vista a tamaño real. La revisión de proporciones sustituyó 19 diseños: goblin, bandido, orco, murciélago, kobold, arbalestero, cultista, gnoll, hombre lagarto, arpía, nigromante, centauro, sacerdotisa, vampiro, demonio menor, reina de las sombras, minotauro, basilisco y troll. Los nueve jefes restantes de la última tanda se generaron directamente con la dirección más seria. Se comprobaron también las tres cabezas de la hidra y la continuidad del equipo en las poses; el cetro de la reina y el reposo de la sacerdotisa recibieron correcciones específicas. El usuario aprobó el arte y pidió integrarlo el 26 de octubre de 2026.

Integración: `SpriteEnemigoAnimado` usa los atlas originales de `public/sprites/enemies-hd-v1`, con selección de fila desde los eventos reales del combate, reloj compartido de cuerpo/sombra/silueta, anclaje por especie y escala independiente del tamaño de celda. Reposo en bucle; daño, ataque y esquiva se reproducen una vez; se respeta movimiento reducido y se conserva un recurso estático si falla una carga. Los turnos de varios atacantes reinician el reloj de cada enemigo. `/revision-enemigos` permite comprobar las cuatro acciones de las 54 criaturas con el mismo componente del combate. La compilación de producción con webpack, TypeScript, ESLint y 38 pruebas de sprites y presentación pasan. El navegador verificó un humanoide y un jefe; la prueba manual de una expedición completa queda disponible para el usuario. Publicación en main pendiente de autorización.



<!-- ENEMIES_HD_PROGRESS_START -->
## Avance verificable

54 / 54 enemigos candidatos; 864 / 864 fotogramas. Arte aprobado e integración en la rama completada; publicación en main pendiente.

| Enemigo | Estado |
|---|---|
| Mímico | 16 fotogramas; candidato revisado |
| Slime Ácido | 16 fotogramas; candidato revisado |
| Rata Gigante | 16 fotogramas; candidato revisado |
| Goblin Explorador | 16 fotogramas; candidato revisado |
| Bandido del Camino | 16 fotogramas; candidato revisado |
| Orco Despiadado | 16 fotogramas; candidato revisado |
| Esqueleto Guerrero | 16 fotogramas; candidato revisado |
| Ogro | 16 fotogramas; candidato revisado |
| Araña de las Sombras | 16 fotogramas; candidato revisado |
| Troll de las Cavernas | 16 fotogramas; candidato revisado |
| Minotauro | 16 fotogramas; candidato revisado |
| Lobo Hambriento | 16 fotogramas; candidato revisado |
| Murciélago Sanguinario | 16 fotogramas; candidato revisado |
| Avispa Gigante | 16 fotogramas; candidato revisado |
| Kobold Trampero | 16 fotogramas; candidato revisado |
| Bandido Arbalestero | 16 fotogramas; candidato revisado |
| Zombi Errante | 16 fotogramas; candidato revisado |
| Hiena Salvaje | 16 fotogramas; candidato revisado |
| Cultista Encapuchado | 16 fotogramas; candidato revisado |
| Gnoll Merodeador | 16 fotogramas; candidato revisado |
| Ghoul de la Cripta | 16 fotogramas; candidato revisado |
| Hombre Lagarto | 16 fotogramas; candidato revisado |
| Gólem de Barro | 16 fotogramas; candidato revisado |
| Oso Cavernario | 16 fotogramas; candidato revisado |
| Espectro Errante | 16 fotogramas; candidato revisado |
| Arpía Cazadora | 16 fotogramas; candidato revisado |
| Nigromante Aprendiz | 16 fotogramas; candidato revisado |
| Guardián de la Cripta | 16 fotogramas; candidato revisado |
| Basilisco Joven | 16 fotogramas; candidato revisado |
| Centauro Saqueador | 16 fotogramas; candidato revisado |
| Gárgola Ancestral | 16 fotogramas; candidato revisado |
| Elemental de Roca | 16 fotogramas; candidato revisado |
| Sacerdotisa Oscura | 16 fotogramas; candidato revisado |
| Mantícora | 16 fotogramas; candidato revisado |
| Ogro Chamán | 16 fotogramas; candidato revisado |
| Caballero Maldito | 16 fotogramas; candidato revisado |
| Wyvern Joven | 16 fotogramas; candidato revisado |
| Elemental de Fuego | 16 fotogramas; candidato revisado |
| Vampiro Noble | 16 fotogramas; candidato revisado |
| Demonio Menor | 16 fotogramas; candidato revisado |
| Dragón Negro Joven | 16 fotogramas; candidato revisado |
| Gigante de Escarcha | 16 fotogramas; candidato revisado |
| Señor de la Frontera | 16 fotogramas; candidato revisado |
| Reina de las Sombras | 16 fotogramas; candidato revisado |
| Titán de Hierro | 16 fotogramas; candidato revisado |
| Dragón del Bosque Verde | 16 fotogramas; candidato revisado |
| Capitán de los Orcos | 16 fotogramas; candidato revisado |
| Reina Araña | 16 fotogramas; candidato revisado |
| Archimago Exiliado | 16 fotogramas; candidato revisado |
| Dragón del Pantano | 16 fotogramas; candidato revisado |
| Rey No Muerto | 16 fotogramas; candidato revisado |
| Hidra de Tres Cabezas | 16 fotogramas; candidato revisado |
| Señor del Abismo | 16 fotogramas; candidato revisado |
| Dragón Anciano | 16 fotogramas; candidato revisado |

Previsualizaciones por rango en `assets/spritesheets/enemies-hd/previews`. Se mantienen las fuentes y todas las revisiones anteriores.
<!-- ENEMIES_HD_PROGRESS_END -->
