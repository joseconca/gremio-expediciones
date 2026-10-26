# Enemigos HD — fantasía medieval

Catálogo de 54 enemigos y jefes, obtenido de `ENEMIGOS` y `JEFES_ELITE`. Se conserva cada ID y la identidad de la criatura. Las copias antiguas que son simples referencias compartidas no limitan el diseño nuevo.

Contrato: una hoja RGBA de 1024 × 1024 por enemigo, con cuatro columnas y cuatro filas en orden `idle`, `hurt`, `attack`, `dodge`. Celda de 256 × 256; detalle y acabado ilustrado de los personajes HD, contorno legible, materiales pintados y perspectiva lateral de tres cuartos hacia la derecha. El margen adicional admite animales largos, alas y jefes. Cada criatura mantiene una única escala en las dieciséis poses. Reposo con apoyo estable, respiración sutil y sin deriva horizontal; ataque con anticipación, impacto y recuperación. Sin fondos, suelo, texto ni sombras incrustadas.

Dirección artística vigente: enemigos caricaturescos, animados y expresivos, pero con malicia y carácter de adversarios. El usuario rechazó tanto los primeros bocetos demasiado serios como las versiones de ojos grandes y aspecto adorable. Se busca un punto intermedio de fantasía medieval: gestos exagerados, siluetas claras, mirada pícara o desafiante y materiales pintados. Evitar rasgos de mascota, ojos brillantes gigantes, coloretes, proporciones de bebé y sonrisas inocentes; también evitar realismo sombrío y terror. Las versiones anteriores se conservan como bocetos sustituidos y no se contabilizan como hojas aprobadas.

Producción mediante la herramienta integrada de generación de imágenes, con los personajes HD como referencia de estilo. Se conservan originales, instrucciones, hashes, fotogramas y previsualizaciones animadas. El ensamblado solo separa, alinea y empaqueta el arte; no dibuja criaturas ni inventa poses.

Se revisa cada hoja completa, transparencia, dieciséis poses, márgenes y coherencia del diseño. Cada enemigo terminado se guarda con un commit en `creacion-sprite-sheets`. El manifiesto de `assets/spritesheets/enemies-hd` indica el avance real. La integración en combate y la publicación en main se realizan después de revisar la biblioteca terminada.

