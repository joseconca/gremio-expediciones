# Comprobación de habilidades con cinco activas y tres pasivas

29 de octubre de 2026. Catálogo: 61 clases, 367 habilidades (245 activas, 122 pasivas).

## Pruebas automatizadas

Resultado de cierre: **480 pruebas correctas, cero fallos**. TypeScript, ESLint de los archivos TypeScript modificados/nuevos y compilación de producción correctos. Los 201 SVG nuevos son XML válido.

- `node --test tests/*.test.cjs`: suite completa del proyecto.
- `npx tsc --noEmit`: comprobación de tipos.
- ESLint sobre los archivos TypeScript modificados y nuevos.
- `npm run build -- --webpack`: compilación de producción.
- Validación XML de los 201 iconos SVG añadidos y existencia de iconos de todo el catálogo.

La matriz de paridad recorre las 245 activas a rango 1, equipadas en la quinta ranura con hasta otras cuatro activas y tres pasivas legales. Compara el resolutor individual con el servicio de acciones de party, usando los mismos atributos y estado, y contrasta daño, PV, defensa y efectos persistidos. La base de datos está simulada; no es una prueba contra PostgreSQL ni una revisión visual.

Hay regresiones específicas de curación de otros aliados, autocuración tras pulsos, limpieza y restauración de defensa, protección de varios aliados, curación ponderada de una fila y consumo persistido de una guardia parcial en dos peticiones. Se comprueban también límites entre tres pasivas, ausencia de sobreletal en el drenaje, cura del lanzador al consumir Observación, acompañantes manuales, preparaciones sin rasgos, cooldown compartido y conversión de maná sin realimentación.

## Auditoría de configuraciones

Comando reproducible: `node scripts/auditar-habilidades-v2.cjs`. Genera `work/auditoria-habilidades-v2.json` local; no necesita conexión ni escribe en la base de datos.

28.134 simulaciones deterministas sobre las 61 clases, con hasta 24 configuraciones candidatas por clase: habilidades propias, daño, sostenimiento, recuperación, preparaciones y áreas; pasivas propias, recursos, supervivencia y preparación. Cada configuración usa hasta cinco activas y tres pasivas legales. Novato todavía no dispone de habilidades suficientes para llenar todos los huecos.

Se cruzan 6/12/20 ciclos, 1/3/9 objetivos y 1/2/3 acciones del actor por ciclo. Los aliados auxiliares procesan sus pulsos una vez por ciclo. Se usan el resolutor real y los cálculos compartidos de recursos, estados y cooldown. Se comprueba que los recursos sean finitos y no negativos y que las devoluciones por acción respeten 10 EN / 5 PM. Las pruebas unitarias verifican además el límite acumulado del ciclo y del pago.

El modelo usa nivel base 30, Job máximo de la rama, sin equipo y una presión fija del 8 % de vida máxima por ciclo. Esa presión ignora defensa y evasión: sirve para provocar situaciones y buscar acumulaciones, no para ordenar todas las clases. La selección de técnicas es heurística y no explora exhaustivamente todas las combinaciones, secuencias ni estados posibles. La contribución suma daño, curación efectiva y absorción: no es una probabilidad de victoria ni una garantía de superioridad para cada enfrentamiento.

Super Novato alcanza 2.169 de contribución en el escenario de referencia de doce ciclos y una acción, dentro del intervalo observado de T3.5 (1.119–3.587). Es evidencia de que no se queda en una potencia de Tier 1; no demuestra que gane a cada clase. La progresión conserva el crecimiento de la rama y las técnicas superiores añaden decisiones y presupuestos propios.

## Verificación pendiente en el entorno de juego

1. Ejecutar `npx prisma migrate deploy` con la conexión real y comprobar el reintegro de puntos de un personaje que tuviera mejoras. Aquí solo se ha validado la cobertura de propietarios y las cláusulas de conservación del SQL, no su ejecución real.
2. Revisar visualmente escuela, ficha, selección de las cinco activas y ventanas de efectos en móvil y escritorio.
3. Jugar combates individuales y de party con daño, apoyo, híbridos y Super Novato. Probar herencia, consumos, áreas sobre distintas filas y reanudación del combate guardado.
4. Ajustar costes o potencia con resultados reales de las clases de apoyo, movilidad y control, cuya contribución no queda recogida por completo en la presión fija del simulador.

Los rasgos intrínsecos no forman parte de este cambio; se diseñarán y probarán después.
