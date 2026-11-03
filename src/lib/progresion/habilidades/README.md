# Habilidades: organización para modificarlas

El único catálogo editable de habilidades está en `src/lib/catalogos/habilidades.ts`; este directorio contiene reglas y adaptadores, no definiciones duplicadas.

| Necesito modificar… | Archivo |
|---|---|
| Reglas y tipos de diseño de una técnica | `diseno-habilidades.ts` |
| Adaptación de habilidades al motor táctico v2 | `catalogo-redisenado.ts` |
| Técnicas adicionales y sus conversiones | `tecnicas-adicionales.ts` |
| Valores por defecto al definir habilidades | `crear-habilidad.ts` |
| Construcción de habilidades desde el catálogo editable | `generar-habilidades.ts` |
| Requisitos para aprender habilidades | `aprendizaje.ts` |
| Ranuras de habilidades activas y pasivas | `equipo-habilidades.ts` |
| Niveles máximos, escalado y coste de reinicio | `niveles-habilidad.ts` |
| Descripciones y comparativas de mejoras | `descripciones-habilidades.ts` |

**Punto de entrada público:** `src/lib/habilidades.ts`. Los niveles, costes de mejora y reinicio están en `niveles-habilidad.ts`. El auditor de recursos utiliza únicamente esta ruta nueva, también al consultar una referencia Git; no se mantienen rutas anteriores ni catálogos adicionales.
