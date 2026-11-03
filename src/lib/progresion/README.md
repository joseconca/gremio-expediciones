# Progresión y profesiones

Los datos que puedes editar están en **`src/lib/catalogos/`**. Esta carpeta implementa sus cálculos y transformaciones: no añadas aquí otra lista de clases ni de habilidades.

## Si quieres cambiar…

| Tarea | Archivo de referencia |
| --- | --- |
| Definir una profesión, tier, requisitos o dominio de armas | `src/lib/catalogos/clases.ts` (datos) y `clases.ts` (reglas) |
| Modificar una habilidad, su nivel o sus costes | `src/lib/catalogos/habilidades.ts` (datos), `niveles-habilidad.ts` (niveles y reseteo) |
| Comprobar qué habilidades puede aprender una clase | `aprendizaje.ts` |
| Cambiar las curvas de experiencia Base y Job | `experiencia.ts` |
| Cambiar coeficientes y fórmulas de atributos RPG | `estadisticas.ts` |
| Cambiar cómo influyen clase y Job en los atributos | `atributos-clase.ts` |
| Calcular el total y el desglose de estadísticas del personaje | `estadisticas-personaje.ts` |
| Revisar estadísticas heredadas, base RPG y aportes por atributo | `estadisticas-base-personaje.ts` |
| Cambiar los contratos y la suma de modificadores | `modificadores-estadisticas.ts` |
| Aplicar dominio de armas, armaduras y escudos y adaptar el equipo al modelo RPG | `bonificaciones-equipo.ts` |
| Calcular bonificaciones pasivas y conversión de maná a inteligencia (Núcleo arcano) | `bonificaciones-pasivas.ts` |
| Modificar descripciones numéricas de habilidades | `descripciones-habilidades.ts` |

## Registro y ejecución de habilidades

- `diseno-habilidades.ts`: **tipos/contratos tácticos**; reexporta los datos del catálogo, no los redefine.
- `crear-habilidad.ts`, `generar-habilidades.ts`: construyen cinco técnicas por escuela desde `catalogos/habilidades.ts`. El orden de ataque, táctica, pasiva, avanzada y maestría es un contrato del catálogo y está protegido por tests.
- `catalogo-redisenado.ts`, `tecnicas-adicionales.ts`: transforman las habilidades del catálogo en técnicas ejecutables. `catalogo-redisenado.ts` adapta pasivas y activas al motor v2 y conserva explícitamente las excepciones de Aguante, Reserva Arcana, Núcleo Arcano, Esfera Invocada y Sellos Paralelos.
- `equipo-habilidades.ts`: reglas para equipar habilidades.
- `src/lib/habilidades.ts`: registro público utilizado por la aplicación y las APIs; no es un segundo catálogo.

**Regla de dependencias:** dentro de `progresion/` se importan otros módulos de progresión directamente. `src/lib/configuracionJuego.ts` es una fachada histórica que se conserva para consumidores anteriores, pero los cambios nuevos deben importar directamente `src/lib/base/edificios.ts`, `src/lib/base/mejoras.ts`, `src/lib/progresion/` o `src/lib/sprites/`, según su responsabilidad. No se elimina la fachada sin comprobar todos los importadores.

**Compatibilidad:** `estadisticas-personaje.ts` sigue exportando `calcularModificadoresEquipo` y sus tipos para el código existente. Las fórmulas de cuentas antiguas viven en `estadisticas-base-personaje.ts` y la conversión especial de maná a inteligencia en `bonificaciones-pasivas.ts`. El cálculo final las utiliza sin cambiar sus reglas; no eliminarlas por parecer heredadas.
