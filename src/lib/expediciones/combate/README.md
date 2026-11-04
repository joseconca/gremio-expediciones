# Combate: dónde cambiar cada regla

Esta carpeta agrupa las **reglas puras de combate** de PvE, PvP y party. No debe contener consultas Prisma ni rutas HTTP. Los servicios que aplican y persisten sus resultados están en `src/server/services/combate/` y `src/server/services/party/`.

| Quiero cambiar… | Módulo |
|---|---|
| Reglas de ataque, precisión, crítico y daño mitigado | `ataques-basicos.ts` |
| Uso físico o mágico del ataque básico según el arma | `ataque-basico-arma.ts` |
| Validar acciones, objetivos y parámetros de combate | `contrato-accion-combate.ts` |
| Iniciativa proporcional a la velocidad | `iniciativa-combate.ts` |
| Posiciones tácticas, selección de objetivos y formación grupal | `posicion-combate.ts`, `objetivos-combate.ts`, `formacion-party.ts` |
| Aplicación de estados, daños periódicos y barreras | `estados-combate.ts` |
| Esperas entre usos de habilidades | `cooldowns-habilidades.ts` |
| Regeneración de vida, energía, maná y consumo de pociones | `recursos-combate.ts`, `consumibles-combate.ts`, `presupuesto-curacion.ts` |
| Enemigos presentes en el combate y su snapshot | `enemigos-combate.ts` |
| Ejecutar técnicas, pasivas, recursos y efectos tácticos | `tacticas/`: `motor-tactico.ts`, `tipos-tacticos.ts`, `adaptador-tactico.ts`, `preparacion-habilidades.ts`, `mecanicas-habilidades.ts` |

**Contratos tácticos:** `tacticas/tipos-tacticos.ts`. **Ejecución:** `tacticas/motor-tactico.ts` (sin reexports de tipos).

**Resolución de habilidades:** `src/lib/expediciones/combate.ts`. **Ataques básicos, mitigación y precisión:** `src/lib/expediciones/combate/ataques-basicos.ts`. Cada operación se importa de su módulo propietario. Los detalles de UI (proyectiles, descripciones y animaciones) todavía están en `src/lib/expediciones/` y en `src/components/combate/`, no dentro del motor.

Las pruebas de rutas, imports y ausencia de duplicados están en `tests/estructura-lib.test.cjs`. Las fórmulas y casos de combate tienen pruebas específicas bajo `tests/`.
