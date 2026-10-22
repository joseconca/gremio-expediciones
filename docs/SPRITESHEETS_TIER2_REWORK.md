# Estado de trabajo: rediseño artístico de clases Tier 2

## Objetivo
Sustituir el aspecto esquemático/derivado de SVG de Elementalista, Brujo, Cazador y Explorador por personajes originales de pixel art, coherentes con las clases refinadas ya existentes.

## Reglas visuales
- Arte original dibujado como pixel art; no usar SVG ni formas vectoriales como personaje final.
- Sin armas integradas en el cuerpo: armas y equipo se superponen como capas independientes.
- Mantener silueta legible, proporciones y sombreado consistentes con las clases ya refinadas.
- Diferenciar las cuatro clases mediante silueta, vestuario, materiales y paleta, no solo cambiando el color.
- Transparencia real en los sprites finales; sin fondos, marcos, rótulos ni elementos de ficha.

## Contrato del spritesheet del proyecto
- El manifiesto `SPRITESHEETS_PERSONAJES.json` define celdas de 64×128 px, 4 columnas y 15 filas (256×1920 px).
- Cada fila corresponde a una animación y contiene cuatro fotogramas en orden.
- El requisito de esta iteración es empezar por las tres primeras acciones que se están trabajando, con cuatro fotogramas por acción. Antes de exportar, confirmar los identificadores exactos de esas acciones en el pipeline vigente y respetar el manifiesto.
- Conservar los frames nativos de 32×64 cuando los genere el pipeline y comprobar centrado, límites, transparencia y continuidad entre frames.

## Estado inicial (2026-10-22)
- [x] Revisado el manifiesto y las rutas de spritesheets de Brujo y Cazador.
- [x] Generada una lámina de exploración visual para orientar siluetas y paletas de las cuatro clases.
- [ ] La lámina de exploración no es un spritesheet de producción y no debe conectarse al juego.
- [ ] Auditar los originales y el workflow de refinado antes de reemplazar assets.
- [ ] Redibujar cada clase con calidad consistente y sin armas.
- [ ] Exportar las tres primeras acciones × cuatro frames con alpha real.
- [ ] Generar previews e informes de QA; validar dimensiones y ausencia de armas.
- [ ] Ejecutar los checks de spritesheets y registrar commits incrementales.

## Dirección de arte por clase
- **Elementalista:** silueta arcana elegante, capas azul profundo y marfil con acentos dorados; detalles elementales discretos, manos libres.
- **Brujo:** silueta oscura y asimétrica, capas carbón/morado y pequeños detalles arcanos; manos libres, sin grimorio ni arma incrustada.
- **Cazador:** explorador de combate robusto, cuero y telas verde bosque/ocre, protecciones prácticas; sin arco, carcaj ni cuchillas.
- **Explorador:** figura más ligera y ágil, capa corta y equipo de viaje en tonos oliva/cuero; diferenciar claramente de Cazador por silueta y ligereza, sin armas.

## Criterio de aceptación
No dar por terminada una clase por tener solo una imagen bonita: el personaje debe poder recortarse en celdas exactas, mantener la misma identidad entre fotogramas, conservar transparencia y dejar libres las zonas donde se superpondrán armas y equipo.
