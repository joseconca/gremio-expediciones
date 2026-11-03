# Estadísticas: organización y fórmulas

| Necesito modificar… | Archivo |
|---|---|
| Cómo influye la clase y el nivel Job en atributos | `atributos-clase.ts` |
| Bonificaciones de armas, armaduras y dominio | `bonificaciones-equipo.ts` |
| Bonificaciones pasivas y conversiones de maná | `bonificaciones-pasivas.ts` |
| Estadísticas base e interpretación de cuentas anteriores | `estadisticas-base-personaje.ts` |
| Contratos y suma de modificadores | `modificadores-estadisticas.ts` |
| Coeficientes y cálculos derivados RPG | `estadisticas.ts` |
| Estadísticas completas y desglose del personaje | `estadisticas-personaje.ts` |

**Módulos principales de esta carpeta:** `estadisticas.ts` (coeficientes y cálculos RPG) y `estadisticas-personaje.ts` (resultado y desglose total). Los consumidores usan directamente estas rutas; no hay archivos puente en la raíz de `progresion/`.

Estos módulos son cálculos sin persistencia; la base de datos y las transacciones se manejan desde `src/server/services/`.
