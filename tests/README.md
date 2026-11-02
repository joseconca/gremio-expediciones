# Pruebas de regresión

La estructura de `tests/` se mantiene estable por ahora porque `package.json` y los workflows invocan archivos concretos.

Comandos principales desde la raíz:

- `npm run test:base`: edificios, economía, equipamiento y rutas de la base.
- `npm run test:progression`: profesiones, habilidades y reglas del combate.
- `npm run test:party`: expediciones y combates de comitivas.
- `npm run test:sprite-animation`: alineación y comportamiento de sprites.
- `npm run lint` y `npm run build`: calidad de código y compilación.

Al mover un módulo se actualizan las rutas de sus imports y mocks **en el mismo commit**, sin suavizar aserciones. Los cambios de fórmulas o balance se prueban y registran en commits aparte.
