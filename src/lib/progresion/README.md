# Progresión y profesiones

Los datos que puedes editar están en **`src/lib/catalogos/`**. Esta carpeta implementa sus cálculos y transformaciones: no añadas aquí otra lista de clases ni de habilidades. Las fórmulas y el desglose de atributos están agrupados en `estadisticas/`, incluidos `estadisticas/estadisticas.ts` y `estadisticas/estadisticas-personaje.ts`. Todos los consumidores importan directamente su ubicación actual.

## Si quieres cambiar…

| Tarea | Archivo de referencia |
| --- | --- |
| Definir una profesión, tier, requisitos o dominio de armas | `src/lib/catalogos/clases.ts` (datos) y `clases.ts` (reglas) |
| Modificar una habilidad, su nivel o sus costes | `src/lib/catalogos/habilidades.ts` (datos), `habilidades/niveles-habilidad.ts` (niveles y reseteo) |
| Comprobar qué habilidades puede aprender una clase | `habilidades/aprendizaje.ts` |
| Cambiar las curvas de experiencia Base y Job | `experiencia.ts` |
| Cambiar coeficientes y fórmulas de atributos RPG | `estadisticas/estadisticas.ts` |
| Cambiar cómo influyen clase y Job en los atributos | `estadisticas/atributos-clase.ts` |
| Calcular el total y el desglose de estadísticas del personaje | `estadisticas/estadisticas-personaje.ts` |
| Revisar estadísticas heredadas, base RPG y aportes por atributo | `estadisticas/estadisticas-base-personaje.ts` |
| Cambiar los contratos y la suma de modificadores | `estadisticas/modificadores-estadisticas.ts` |
| Aplicar dominio de armas, armaduras y escudos y adaptar el equipo al modelo RPG | `estadisticas/bonificaciones-equipo.ts` |
| Calcular bonificaciones pasivas y conversión de maná a inteligencia (Núcleo arcano) | `estadisticas/bonificaciones-pasivas.ts` |
| Modificar descripciones numéricas de habilidades | `habilidades/descripciones-habilidades.ts` |

Las reglas de diseño, transformación y técnicas adicionales del motor están ahora en `habilidades/` (no es otro catálogo editable).

## Registro y ejecución de habilidades

- `habilidades/diseno-habilidades.ts`: **tipos/contratos tácticos**; reexporta los datos del catálogo, no los redefine.
- `habilidades/crear-habilidad.ts`, `habilidades/generar-habilidades.ts`: construyen cinco técnicas por escuela desde `catalogos/habilidades.ts`. El orden de ataque, táctica, pasiva, avanzada y maestría es un contrato del catálogo y está protegido por tests.
- `habilidades/catalogo-redisenado.ts`, `habilidades/tecnicas-adicionales.ts`: transforman las habilidades del catálogo en técnicas ejecutables. `habilidades/catalogo-redisenado.ts` adapta pasivas y activas al motor v2 y conserva explícitamente las excepciones de Aguante, Reserva Arcana, Núcleo Arcano, Esfera Invocada y Sellos Paralelos.
- `habilidades/equipo-habilidades.ts`: reglas para equipar habilidades.
- `src/lib/habilidades.ts`: registro público utilizado por la aplicación y las APIs; no es un segundo catálogo.

**Regla de dependencias:** importar directamente desde `src/lib/base/`, `src/lib/progresion/`, `src/lib/catalogos/` o `src/lib/sprites/` según su responsabilidad. La fachada de configuración anterior se eliminó: no mantener imports ni reexports de compatibilidad.

**API actual:** `estadisticas/estadisticas-personaje.ts` exporta `calcularModificadoresEquipo` y sus tipos desde su ubicación definitiva. Las fórmulas de cuentas antiguas viven en `estadisticas/estadisticas-base-personaje.ts` y la conversión especial de maná a inteligencia en `estadisticas/bonificaciones-pasivas.ts`. El cálculo final las utiliza sin cambiar sus reglas; no eliminarlas por parecer heredadas.
