# Sprites y representación visual de combatientes

Esta carpeta contiene el acceso a los sprites **del runtime**, no los archivos de arte que se regeneran con las herramientas.

- `heroes.ts`: clases, sexo, rutas, filas y logos de sprites de héroes.
- `enemigos.ts`: lectura de atlas, tamaño y metadatos de los enemigos.
- `escala-combate.ts`: altura de referencia, escala máxima y desplazamiento seguro de enemigos según el tamaño visible de la pantalla. **Es presentación visual, no daño ni reglas de turno.**

La pantalla `src/components/combate/CombateModal.tsx` consume los cálculos de `escala-combate.ts`. Se verifican con `tests/combat-scale.test.cjs` dentro de la regresión. No trasladar estas fórmulas al motor táctico ni introducir aquí Prisma.

Los atlas finales que carga el navegador están en `public/sprites/hd-v1/heroes/`, `public/sprites/hd-v1/equipment/` y `public/sprites/enemies-hd-v1/`. Los sprites de respaldo siguen en `public/sprites/heroes/`. Los originales editables están en `assets/spritesheets/`; los JSON de `src/lib/generated/` indican qué atlas HD están disponibles. **No asumir que todas las clases cuentan con ambos atlas HD**: el juego conserva fallbacks.

Para consultar la publicación sin entrar en `assets/`, ejecuta `python scripts/recursos.py resumen`. Para reemplazar arte no edites a mano los derivados JSON; consulta `docs/mapa-codigo.md`.
