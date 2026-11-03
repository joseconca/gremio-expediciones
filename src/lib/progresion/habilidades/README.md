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
| Descripciones y comparativas de mejoras | `descripciones-habilidades.ts` |

**Punto de entrada público:** `src/lib/habilidades.ts`. El archivo `../niveles-habilidad.ts` todavía reside en la raíz de progresión porque el script de auditoría de recursos compara por Git versiones históricas de esa ruta. No moverlo sin adaptar primero ese mecanismo y sus pruebas. No introducir otro catálogo.
