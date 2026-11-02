# Interfaz de combate

La UI se encuentra aquí; **las reglas de daño, turnos, botín y persistencia no viven en componentes React**. Este mapa indica el primer archivo que conviene abrir según lo que quieras cambiar.

## ¿Dónde modifico cada cosa?

| Quiero modificar… | Archivo principal |
| --- | --- |
| Qué sucede al pulsar **Atacar**, **Habilidad**, **Objeto** o **Huir**; objetivos; estado del modal | `CombateModal.tsx` |
| Diseño del informe al terminar, victoria, derrota, botín obtenido o perdido | `ResultadoCombate.tsx` |
| Ventana **Info**: estadísticas de aventureros, aliados y enemigos | `InformacionCombatientes.tsx` |
| Tipos de datos y callbacks que recibe el combate desde PvE o party | `tipos.ts` |
| Los sprites de héroes que se animan en la escena | `SpriteHeroeAnimado.tsx`; definiciones en `src/lib/sprites/heroes.ts` |
| Los sprites de los enemigos | `SpriteEnemigoAnimado.tsx`; definiciones en `src/lib/sprites/enemigos.ts` |
| Posición y barras de vida de los combatientes en otras vistas | `EstadoSobreActor.tsx` y `PanelCombatientes.tsx` |
| Iconos de estados, duraciones y efectos de comida | `IndicadoresEfectosCombate.tsx` |
| Animaciones, impactos, números flotantes, pausas y proyectiles | `animaciones/useAnimacionesCombate.ts` y `animaciones/CapaEfectosCombate.tsx` |
| Historial de acciones | `HistorialCombate.tsx` |
| Colores y composición propios de combate | `combate-rpg.module.css` y estilos compartidos en `src/app/globals.css` |
| Modal de asedio PvP | `AsedioModal.tsx` |

## Lógica del juego: fuera de la interfaz

- **Ataques, habilidades y efectos:** `src/lib/expediciones/combate.ts`, `estados-combate.ts`, `objetivos-combate.ts`; las definiciones se editan en los catálogos de `src/lib/catalogos/`.
- **Expediciones individuales:** `src/server/services/combate/` y `src/server/services/expediciones/`.
- **Combate de party:** `src/server/services/party/combate-party-actions.ts` (jugador), `turno-enemigo.ts` (enemigos), `recursos-turno.ts`, `liquidacion-recompensas.ts`, `regreso-combate.ts`. Consulta `src/server/services/party/README.md` antes de cambiar reglas de concurrencia.
- **Origen de sprites HD:** utiliza `python scripts/recursos.py` y su flujo de validación/publicación. No edites a mano los atlas derivados ni los hashes.

## Criterios para continuar reorganizando

1. Un componente nuevo debe representar **una zona reconocible de la pantalla** o una interacción completa, no una envoltura de dos líneas.
2. `CombateModal` coordina el estado; los componentes de presentación reciben datos y callbacks y no hacen peticiones ni modifican recompensas.
3. Mantener estables las props públicas, la accesibilidad, el orden de animaciones y el funcionamiento de PvE/party.
4. Cambiar la prueba para buscar cada comportamiento en su **módulo propietario**; no eliminar aserciones al mover código.
5. Hacer un commit por extracción y comprobar regresión, lint y build antes de fusionar con `main`.
