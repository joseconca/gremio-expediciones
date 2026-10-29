# Correcciones de combate

Rama: `correcciones-combate`. Se posponen el rediseño de habilidades y los rasgos únicos de clase.

## Reglas implementadas

- **Progresión:** los niveles Job ganados se acumulan a lo largo del recorrido de antecesores de la profesión activa. Las híbridas toman el recorrido de mayor entrenamiento, sin sumar las ramas ni contar dos veces los antecesores comunes. Los requisitos mínimos de una clase desbloqueada sirven de respaldo cuando falta un registro antiguo. El crecimiento Base se aplica una sola vez; el reparto entre atributos corresponde al arquetipo activo. Entrenar una profesión ajena no aumenta estos atributos.
- **Energía:** máximo base 100, sin crecimiento por fuerza/vitalidad. Regenera el 20 % del máximo por turno propio, más bonificaciones de regeneración; la recuperación efectiva se redondea hacia abajo. Pasivas y equipo pueden aumentar el máximo. Los costes anteriores se multiplican por cinco, con tope 60; las técnicas de recuperación de energía usan la misma escala. No se cambian sus efectos ni se añaden habilidades.
- **Maná:** conserva su crecimiento y reservas. La regeneración base es `2 + inteligencia × 0,1`, más pasivas y equipo, sin recuperar un porcentaje del maná máximo. El resto decimal persiste entre turnos y se descarta al llenar la reserva. Empezar una expedición restablece ese resto.
- **Comidas:** ataque físico, mágico y defensa reciben una parte fija de 3 y su porcentaje, con redondeo del incremento. La velocidad mantiene su parte porcentual. El desayuno incorpora defensa y pierde la iniciativa. Ninguna comida garantiza el primer turno; el orden nuevo se calcula por velocidad. Se conserva una bonificación calculada al crear el combate para mostrar cuánto aportó la comida, incluyendo la posición inicial.
- **Pociones:** aplican la cantidad fija más el porcentaje del máximo del destinatario. Los consumibles de vida, energía y maná se pueden usar en individual PvE y party; se limitan a la reserva que falta y consumen una unidad dentro de la transacción. Las pociones de recursos no requieren tener vida herida. Se mantiene la restricción existente de consumibles en asedios PvP. No se incorporan resurrecciones ni elixires de efectos futuros.
- **Party:** aplica la bonificación de curación del sanador, los máximos del aliado seleccionado, la recuperación de energía de técnicas y la limpieza real de perjuicios. Las técnicas usan el mismo gasto/recuperación de recursos que individual. La regeneración se concede también cuando el mismo actor obtiene dos turnos consecutivos.
- **Estados:** las mejoras conservan correctamente la duración de los estados secundarios. No aumentan las cargas de barrera ni agravan las penalizaciones propias. Los indicadores muestran nombre, cantidad efectiva y turnos restantes; las comidas muestran su aporte al iniciar el combate y las pasivas sus cifras según nivel.

## Preparar una prueba con partidas

1. Configurar `DATABASE_URL` para la base de datos del entorno de pruebas. Este checkout no tiene `.env` ni `.env.local`; no se ha ejecutado una migración sobre una base de datos real.
2. Aplicar las migraciones pendientes y regenerar el cliente:

   ```powershell
   npx prisma migrate deploy
   npx prisma generate
   ```

3. Iniciar desarrollo. En este equipo el aislamiento de Windows dio problemas con los procesos/junctions de Turbopack; webpack permitió completar la compilación:

   ```powershell
   npm run dev -- --webpack
   ```

4. Empezar expediciones nuevas. Los combates que ya estaban activos conservan sus estadísticas congeladas; no se reescriben al aplicar la migración. Las comidas de combates antiguos pueden mostrar su descripción en lugar del importe guardado en los combates nuevos.

## Comprobación manual recomendada

- Comparar Espadachín entrenado y Caballero recién desbloqueado al mismo Base. Repetir con una híbrida y comprobar que entrenar la rama menor no suma ambos recorridos.
- Verificar energía máxima 100 sin mejoras, recuperación 20 por turno y gasto de una técnica de coste 40. Comprobar un personaje rápido con turnos consecutivos.
- Comparar dos reservas de maná con la misma inteligencia/regeneración: aumentar solo la reserva no debe acelerar la recuperación. Una mejora fraccionaria debe acumularse entre turnos.
- Tomar una comida defensiva con poca defensa y comprobar la mejora. Enfrentarse a un rival más rápido con desayuno/ración: la comida no debe forzar el primer turno.
- Repetir curación individual, curación de aliado, purificación y técnica de recuperar energía en solo/party. La pasiva de curación pertenece al lanzador y el máximo de PV al destinatario.
- Usar una poción con curación fija y porcentual; probar pociones de maná/energía con vida completa. No gastar el objeto si el recurso correspondiente está lleno.
- Pulsar los efectos sobre los actores. La ruta de desarrollo `/revision-combate-real` incluye ejemplos de 16 de daño periódico, 18 de curación periódica y una comida con +7 de ataque. La ruta está deshabilitada en producción.

## Validación

- TypeScript sin errores y ESLint de los archivos modificados sin errores.
- Esquema Prisma válido y cliente generado.
- Compilación completa de producción con `npm run build -- --webpack` superada. La compilación predeterminada con Turbopack falla por el arranque de sus procesos auxiliares en este equipo.
- 436 pruebas ejecutadas: 434 pasan. Las dos que fallan son comprobaciones anteriores de filtros de la Escuela de Batalla (`tests/battle-school-layout.test.cjs`); tanto ese test como su página permanecen idénticos al commit de partida. No corresponden al combate ni se han modificado para ocultar sus fallos.
- Las pruebas nuevas cubren evolución, híbridas, independencia de reservas/regeneración, acumulación decimal, pociones y descripciones. Se han añadido regresiones de los servicios individual y party para porcentajes de pociones, maná con vida completa, bonus de curación, limpieza y recuperación de energía.
- Pendiente: aplicar la migración sobre una base de pruebas y verificar visualmente/navegar una partida. La apertura del navegador fue rechazada por la revisión automática debido a su límite de uso.
