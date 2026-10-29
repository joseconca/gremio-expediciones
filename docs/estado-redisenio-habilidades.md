# Estado del rediseño de habilidades

29 de octubre de 2026. Rama: `codex/redisenio-habilidades-rasgos`. Base: `6480b79f862ed72ae689933ea7a59b697b310a8a`.

La fase de habilidades está implementada y activa. Por indicación del usuario, los **rasgos intrínsecos quedan para después**. El plan y catálogo originales son referencias de diseño; el [catálogo jugable](habilidades-v2-catalogo.md) se genera a partir de la implementación real.

## Alcance terminado

- Cinco activas y tres pasivas en API, ficha, escuela, store y combates individual, party y PvP. Herencia por las ramas actuales, sin clases hermanas.
- 367 habilidades: 245 activas y 122 pasivas entre 61 clases. Se mantienen los identificadores anteriores, se añaden cinco propias de Super Novato y una técnica adicional por clase.
- Las 119 pasivas condicionales tienen pares condición/ventaja distintos. Novato conserva su vida plana; Mago conserva la única reserva plana de maná; Archimago sacrifica reserva para convertirla en inteligencia con techo y sin realimentar el maná.
- Cada preparación consumida por un kit tiene un generador accesible entre las habilidades de su rama, sin necesitar rasgos.
- Motor y contexto compartidos: guardias, heridas, regeneración, limpieza, disipación, movimientos, precisión, exposición, acompañantes, pactos, sellos y reacciones. Persistencia de cantidades consumidas y posiciones, incluido el defensor en PvP.
- Presupuestos de área compartidos. Las curaciones de área reparten la reserva del lanzador según vida faltante; los aliados sanos no gastan cuota de curación inmediata.
- Devoluciones limitadas al 25 % del pago y a 10 EN / 5 PM por ciclo entre las tres pasivas. Las respiraciones heredables comparten cooldown. Protecciones simultáneas consumen un presupuesto común; regeneraciones del mismo sanador aplican el pulso más fuerte.
- Descripciones de habilidades y efectos basadas en cantidades reales, con nombre de la fuente y duración. Iconos SVG para las 367 habilidades, incluidos 201 que faltaban.

## Decisiones de esta fase

Los acompañantes son preparaciones de tres órdenes y hasta seis ciclos, sin turno independiente ni mantenimiento periódico. Una orden consume la acción de su técnica y solo se resuelve una por ciclo. Reemplazar o retirar un acompañante no concede premios por muerte.

Las interrupciones debilitan preparaciones o precisión; no quitan turnos completos. Cataclismo consume la compresión del kit; no introduce una interfaz de canalización diferida. Custodia concede protección/preparación en sus habilidades; el futuro rasgo de intercepción no se ha activado.

Super Novato tiene técnicas que combinan sus ataques físico y mágico, y alterna apoyo/ofensiva. Se comprueba como alternativa de final de árbol, aunque su posición de desbloqueo siga siendo especial. No se ha añadido un rasgo intrínseco provisional para elevarlo.

Las pasivas condicionales, Núcleo arcano y las técnicas adicionales de utilidad tienen rango único. Daño, curación y protección escalables conservan mejoras sin aumentar cargas o duraciones indefinidamente.

## Migración y despliegue

`prisma/migrations/20261029203000_redisenio_habilidades/migration.sql` devuelve los puntos de las mejoras anteriores a su clase propietaria y deja los rangos en 1 para poder redistribuirlos. Mantiene compras y ranuras. La segunda ejecución no vuelve a devolver puntos. No hay cambios de esquema.

En el entorno con base de datos debe ejecutarse `npx prisma migrate deploy` junto al despliegue de esta versión. Este checkout no dispone de una conexión de base de datos para verificar la migración real. El merge de código no confirma ni la ejecución de esa migración ni un despliegue automático del alojamiento.

## Validación

Véase [comprobación de habilidades](comprobacion-habilidades-v2.md), con pruebas automatizadas, auditoría de configuraciones y límites de la comprobación. Quedan partidas manuales, revisión visual y prueba de migración con datos reales. Los rasgos son el siguiente trabajo funcional acordado.
