# Plan artístico de producción — Novato masculino

Actualizado: 2026-10-25  
Rama: `creacion-sprite-sheets`

## Estado de partida verificado

El manifiesto remoto marca como terminadas técnicamente cuatro acciones de Novato masculino: Idle, Walk, Hurt y Use Consumable (4 PNG por acción, con QA individual). La siguiente acción oficial continúa siendo `dodge`. No se considera publicada ninguna acción si faltan los PNG reales y sus QA en GitHub.

El paquete de recuperación `novato-sprite-recuperacion-esquivar-bloquear.zip` contiene los ocho PNG de Dodge y Block Shield, los ocho QA y `apply_recovery.py`. El script valida hashes, dimensión 128×256, alfa real y estructura QA; exige checkout limpio y sincronizado, rama correcta, crea commit artístico más commit de checkpoint por cada acción y verifica el SHA remoto después de cada push.

## Orden restante

| Nº | Acción | Clave | Nota de diseño |
|---|---|---|---|
| 5 | Esquivar | `dodge` | Cuatro poses compactas: guardia baja, desplazamiento evasivo, agacharse y recuperar guardia. Evitar siluetas demasiado horizontales. |
| 6 | Bloquear con escudo | `block_shield` | Cuatro poses: guardia, elevar escudo, absorber impacto, recuperar posición. Escudo siempre visible y coherente. |
| 7 | Ataque con espada 1H | `attack_sword` | Preparación, corte, extensión/impacto, recuperación. Espada visible sin cortar manos ni efecto. |
| 8 | Ataque con hacha | `attack_axe` | Preparación, giro, impacto descendente/lateral, recuperación. |
| 9 | Ataque con lanza | `attack_spear` | Nivelar arma, avanzar, estocada, retirar lanza. |
| 10 | Ataque con daga | `attack_dagger` | Movimiento rápido y compacto; cambios legibles de mano y peso. |
| 11 | Ataque con arco | `attack_bow` | Preparar arco, tensar, soltar proyectil, recuperar. |
| 12 | Ataque con bastón | `attack_staff` | Preparar canalización, reunir energía, lanzar, disipar. |
| 13 | Ataque con maza | `attack_mace` | Cargar golpe, giro, impacto contundente, recuperación. |
| 14 | Ataque con libro | `attack_book` | Abrir grimorio, canalizar, lanzar hechizo, cerrar/recuperar. |
| 15 | Ataque con guantes | `attack_gloves` | Combos cortos de puño; desplazamiento de cadera y brazos. |

## Producción y control de calidad

Para cada acción:
1. Generar una sola lámina de cuatro poses con el mismo diseño maestro (cabello castaño, bufanda roja, camisa marfil, correas de cuero, pantalones azules, botas marrones), sin títulos ni cuadrículas como recurso final.
2. Separar cuatro PNG transparentes de 128×256 y preservar el personaje completo.
3. Verificar alpha real, celda, línea de suelo, escala, arma/objeto visible y cuatro hashes diferentes dentro de la acción.
4. Crear un QA JSON por PNG y un contacto de revisión separado que no se copie a runtime.
5. Commit de arte; actualizar manifiesto y checkpoint en un commit siguiente; verificar el SHA remoto.

## Dependencias y límites

- No avanzar el manifiesto ni declarar commits de arte hasta que los PNG estén realmente publicados.
- Mantener las rutas HD aisladas de runtime hasta completar las 15 acciones y aprobar una revisión visual de la hoja de 60 celdas.
- Acabar todas las acciones del Novato masculino antes de empezar Novato femenino.
- Después seguir el orden Tier 1 y Tier 2 ya establecido en el manifiesto.
