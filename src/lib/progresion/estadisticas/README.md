# Estadísticas: organización y fórmulas

| Necesito modificar… | Archivo |
|---|---|
| Cómo influye la clase y el nivel Job en atributos | `atributos-clase.ts` |
| Bonificaciones de armas, armaduras y dominio | `bonificaciones-equipo.ts` |
| Bonificaciones pasivas y conversiones de maná | `bonificaciones-pasivas.ts` |
| Estadísticas base e interpretación de cuentas anteriores | `estadisticas-base-personaje.ts` |
| Contratos y suma de modificadores | `modificadores-estadisticas.ts` |

**APIs existentes:** `../estadisticas.ts` (coeficientes y cálculos) y `../estadisticas-personaje.ts` (resultado y desglose total). Conservar sus exportaciones y no duplicar fórmulas.

Estos módulos son cálculos sin persistencia; la base de datos y las transacciones se manejan desde `src/server/services/`.
