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
| Cambiar cómo se suman estadísticas, equipo y pasivas | `estadisticas-personaje.ts` |
| Adaptar bonificaciones del equipo al modelo RPG | `bonificaciones-equipo.ts` |
| Modificar descripciones numéricas de habilidades | `descripciones-habilidades.ts` |

## Registro y ejecución de habilidades

- `diseno-habilidades.ts`: **tipos/contratos tácticos**; reexporta los datos del catálogo, no los redefine.
- `crear-habilidad.ts`, `generar-habilidades.ts`: construyen definiciones ejecutables a partir de los datos declarativos.
- `catalogo-redisenado.ts`, `tecnicas-adicionales.ts`: transforman las habilidades del catálogo en técnicas ejecutables.
- `equipo-habilidades.ts`: reglas para equipar habilidades.
- `src/lib/habilidades.ts`: registro público utilizado por la aplicación y las APIs; no es un segundo catálogo.

**Regla de dependencias:** dentro de `progresion/` se importan otros módulos de progresión directamente. `src/lib/configuracionJuego.ts` es una fachada histórica que se conserva para los consumidores externos, no el lugar para crear nuevas reglas.

Antes de extraer más funciones de `estadisticas-personaje.ts`, comprobar qué estructuras comparten con el cálculo final: dividir un archivo solo ayuda cuando reduce acoplamiento y permite encontrar mejor cada responsabilidad.
