# Estado de implementación del rediseño

Rama: `codex/redisenio-habilidades-rasgos`. Inicio: `6480b79f862ed72ae689933ea7a59b697b310a8a`. Actualización: 29 de octubre de 2026.

**La petición completa todavía no está terminada. No publicar ni presentar esta rama como el rediseño completo de las 61 clases.**

## Decisiones aprobadas

- Cinco activas y tres pasivas equipadas; sustituye el diseño original de tres y dos.
- Rasgo intrínseco de la clase actual, sin herencia de rasgos.
- Rediseñar las 301 habilidades actuales, añadir cinco propias a Super Novato y al menos una adicional por clase: objetivo inicial de 367 habilidades equipables y 61 rasgos.
- Probar las configuraciones de ocho ranuras, no reutilizar conclusiones de equilibrio del equipo antiguo.

## Terminado y activo

- La API de equipo acepta exactamente `activa_1` a `activa_5` y `pasiva_1` a `pasiva_3`.
- Escuela/ficha, store, selección de batalla, PvE, PvP y party reconocen las nuevas ranuras. Contador y listado de batalla muestran hasta cinco activas.
- Corregida autocuración en party: usa los PV y efectos posteriores al pulso del inicio del turno. No recupera accidentalmente efectos que ya habían expirado.

## Preparado, sin activar en el catálogo jugable

- Motor táctico puro: estado por participante, presupuestos de área, curación efectiva, guardia limitada, redirección sin cadenas, consumo de pulsos, devolución limitada por pago/ciclo, transferencias, acompañantes, mantenimiento, pactos, sellos y reacciones.
- Definición explícita de una técnica adicional por cada una de las 61 clases, con coste, objetivo e instrucciones ejecutables. Se exportan como `HABILIDADES_ADICIONALES`, pero **aún no se incorporan a `HABILIDADES`**. Muchas necesitan las preparaciones del kit rediseñado.
- Adaptador de técnicas y puntos de integración en el resolver compartido, PvE y party. Estado JSON tipado y validado, visualización de cantidades y duraciones, y procesamiento de regeneración transferida.
- No se han sustituido las habilidades actuales por sus descripciones futuras. No hay rasgos exclusivos activos todavía.

## Pendiente imprescindible

1. Implementar los 61 rasgos con condiciones y efectos reales, incluirlos en creación/reanudación de combate y mostrarlos en la ficha y en batalla.
2. Rediseñar el comportamiento de las 301 habilidades existentes conforme al catálogo; sustituir las pasivas repetidas, incluida la conversión del Archimago sin realimentación.
3. Añadir las cinco habilidades propias de Super Novato y medirlo contra T3.5 contando su dominio de equipo.
4. Completar los generadores de cada preparación y validar que las técnicas heredadas no dependan de un rasgo que ya no se tiene. Algunas técnicas adicionales aún necesitan diferenciar mejor su transformación respecto a otras ramas.
5. Completar las interacciones del motor antes de activarlo: resistencias, intenciones, canales, campos, provocación, precisión/exposición en todos los ataques y transferencia de vínculos. Las primitivas no constituyen por sí solas esos comportamientos completos.
6. Integrar los relojes de ciclo y acompañantes en las colas reales, incluida su persistencia, muerte, sustitución y retirada. Revisar las reacciones elementales y su presupuesto total por acción.
7. Completar el contexto y los resultados tácticos del defensor PvP; las técnicas futuras no deben habilitarse sin ese adaptador.
8. Completar el contrato de objetivos para habilidades hostiles de utilidad que no causen daño; el contrato antiguo infiere objetivo por `efecto === "dano"`. Actualizar API y store juntos.
9. Completar persistencia de posición y efectos en todas las salidas terminales y normales, y pruebas transaccionales de técnicas entre varios aliados. Evitar doble consumo de guardias entre resolver táctico y adaptación antigua.
10. Registrar el catálogo nuevo solo cuando funcione el árbol completo, con migración idempotente de puntos/rangos y selección de equipo anterior conservada.
11. Ejecutar simulaciones de contribución por tier, áreas 1/3/9, velocidades relativas y búsqueda de combinaciones heredadas de cinco activas y tres pasivas. Todavía no existe una comprobación global del equilibrio nuevo.
12. Pruebas visuales y pruebas con base de datos real de migración, reintentos y partidas guardadas. En este checkout no se ha ejecutado una migración contra una base real.

## Comprobaciones del punto de control

- Suite completa: 465 pruebas; 463 pasan y dos fallan en `battle-school-layout.test.cjs`, fallos preexistentes documentados en el plan original.
- Las 20 pruebas añadidas cubren ranuras, primitivas del motor, serialización, cobertura de las 61 técnicas, paridad del resolver para party de un miembro y la regresión de autocuración.
- TypeScript y lint de los archivos nuevos/modificados del motor pasan.
- Compilación de producción con Webpack correcta. La primera ejecución aislada falló con `EPERM` al crear salida de Next; la ejecución con permisos de escritura suficientes terminó correctamente.
- La comparación del resolver táctico es una prueba unitaria de la misma entrada y semilla/estado. **No equivale todavía a comprobar todos los servicios reales ni el equilibrio de los kits futuros.**

Referencias: [plan original actualizado](plan-redisenio-habilidades.md), [catálogo original propuesto](plan-redisenio-habilidades-catalogo.md), [técnicas adicionales preparadas](tecnicas-adicionales-propuesta.md).
