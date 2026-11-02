# Catálogos del juego

Esta carpeta contiene las **definiciones editables** del juego:

- `clases.ts`: profesiones, tiers, requisitos, maestrías y bonificaciones.
- `habilidades.ts`: técnicas, pasivas, costes, diseños y reglas declarativas V2.
- `objetos.ts`: equipamiento, consumibles y demás objetos.
- `enemigos.ts`: criaturas, jefes y tablas de botín.

## Cómo trabajar aquí

1. Para cambiar **datos**, edita el catálogo correspondiente, sin crear otro registro paralelo.
2. Para cambiar **comportamiento**, trabaja en las funciones y servicios del dominio (`src/lib/progresion/`, `src/lib/expediciones/`, `src/lib/objetos.ts`, `src/lib/enemigos.ts` o `src/server/services/`).
3. Mantén IDs, tipos y firmas públicas al reorganizar rutas. No renombres IDs persistidos sin una migración.
4. Los consumidores deben importar de las APIs existentes, no depender del orden físico de los catálogos.
5. Tras mover archivos, verifica importaciones, pruebas, compilación y sprites. No alteres balance ni tiempos en un commit de estructura.

Los JSON de `src/lib/generated/` son artefactos derivados de sprites, **no** nuevos catálogos editables.
