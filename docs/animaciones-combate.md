# Sistema de animaciones de combate

## Objetivo

Centralizar la presentación de las acciones visuales del combate para reutilizar movimiento cuerpo a cuerpo, proyectiles, curación, defensa, estados e impactos en PvE, parties y asedios/PvP. La animación debe expresar el resultado ya resuelto: **no calcula ni altera las reglas del combate**.

## Estado de la auditoría inicial

En la rama `main` revisada para esta implementación:

- `src/components/combate/CombateModal.tsx` contiene la secuencia `mostrarResultadoAccion` para PvE y parties. Gestiona esperas, actor animado, daño, curación y pulsos de estado.
- `src/components/combate/AsedioModal.tsx` implementa otra secuencia equivalente para asedios/PvP.
- `src/app/globals.css` contiene las animaciones CSS heredadas de movimiento e impacto (`combate-ataque`, `combate-ataque-fuerte`, versiones del enemigo y `combate-shake`).
- `src/lib/expediciones/combate.ts` declara `AccionAnimadaCombate`, resuelve ataques y habilidades y devuelve los resultados numéricos.
- `src/lib/tiposJuego.ts` declara `AnimacionHabilidad` y las definiciones de habilidad. Las habilidades existentes usan la animación heredada.
- Los indicadores de curación duran aproximadamente 700 ms en la secuencia actual y se renderizan de manera específica en cada modal.
- Las acciones de party ya transportan algunos IDs de actor/objetivo en el JSON de última acción, pero el tipo compartido no recogía esos campos. La asignación visual de objetivos en el modal aún presupone en varios caminos que el ataque de un jugador va contra el enemigo.
- Hay iconos de habilidades como `public/sprites/habilidades/bola_fuego.svg` y `chispa_mago.svg`; son iconos de interfaz, no una biblioteca de proyectiles en vuelo. El commit más reciente de `main` (`d9e2607`, `png arrow`) ya añade `public/sprites/projectiles/arrow.png`; debe inspeccionarse y reutilizarse en la fase de proyectiles si sus dimensiones y orientación encajan.

## Contrato y compatibilidad

### Separación de responsabilidades

1. El servidor resuelve daño, curación, fallos, críticos, estados, consumo de recursos y avance del turno.
2. La acción de resultado transporta identidades de origen/destino y, opcionalmente, metadatos visuales serializables.
3. El cliente traduce ese resultado a una secuencia de eventos gráficos.
4. Los componentes de escena representan los eventos, localizando a los actores reales en las coordenadas actuales del navegador.

No se deben enviar coordenadas de pantalla ni guardar estado temporal de CSS en el servidor. Los metadatos visuales tampoco deben intervenir en la resolución numérica.

### Campos opcionales introducidos en la fase 1

- `actorUsuarioId`: identifica al miembro que realizó la acción cuando `actor: "jugador"` representa a alguien de una party.
- `objetivoUsuarioId`: identifica al participante concreto que recibe el efecto principal si no es el enemigo.
- `objetivosUsuarioIds`: reserva una forma serializable de declarar varios participantes afectados por una acción de área.
- `presentacion`: especifica la forma de representar la acción, por ejemplo cuerpo a cuerpo, proyectil, curación, defensa, estado o área.
- `pulsosEstado[].objetivoUsuarioId`: permite asociar un pulso de curación/daño con el participante real, además del destino heredado `jugador`/`enemigo`.
- `DefinicionHabilidad.presentacionVisual`: permite configurar el modo, proyectil, elemento y efecto de impacto de una habilidad sin sobrecargar el significado del campo legado `animacion`.

Todos estos campos son opcionales para que las acciones ya serializadas y los resolvedores existentes mantengan la compatibilidad durante la migración. Si falta `presentacion`, las siguientes fases deben conservar la interpretación visual heredada.

### Vocabulario visual

- Modos: `cuerpo_a_cuerpo`, `proyectil`, `curacion`, `defensiva`, `estado`, `area`.
- Proyectiles reutilizables iniciales: `flecha`, `esfera_arcana`, `bola_fuego`, `esquirla_hielo`, `rayo`, `energia_sagrada`, `semilla_natural`, `orbe_sombra`.
- Elementos: físico, arcano, fuego, hielo, rayo, sagrado, naturaleza y sombras.
- Impactos: golpe, destello, explosión, escarcha, onda, veneno y sagrado.

No inferir el elemento solo por `tipoDano: "magico"`; una habilidad debe configurar la presentación concreta. El icono de la habilidad y el recurso que vuela por la escena son assets con usos diferentes.

## Plan por fases

### Fase 1 — contrato de acciones e inventario del sistema

- [x] Añadir tipos serializables y opcionales para la presentación visual.
- [x] Recoger en `AccionAnimadaCombate` los IDs de participantes que ya se transmitían ad hoc en party.
- [x] Exponer metadatos visuales opcionales en `DefinicionHabilidad`.
- [x] Documentar el diseño y las limitaciones confirmadas.
- [x] Registrar la validación de la rama. La última ejecución completa antes de las pruebas nuevas de targeting dejó pasar las pruebas de animación, `test:party`, lint y build; los fallos pendientes son expectativas económicas/forja relacionadas con el cambio de rarezas/precios: `test:base` espera 138 y obtiene 75; `test:progression` espera 123 de oro de forja y obtiene 90, y falla una comparación de materiales.

### Fase 2 — controlador compartido

- [x] Crear un hook/controlador común para ejecutar y cancelar secuencias, gestionar IDs de eventos y garantizar la limpieza de temporizadores.
- [x] Extraer la capa de efectos superpuestos a la escena para evitar que el proyectil quede recortado por contenedores de personajes.
- [x] Migrar primero el ataque cuerpo a cuerpo conservando tiempos, estados y estilos heredados.
- [x] Sustituir el código duplicado de secuenciación en `CombateModal` y `AsedioModal` por el controlador común.
- [x] Mantener la cancelación de temporizadores y evitar que una secuencia desactualizada limpie una acción posterior.

### Fase 3 — curación y efectos de estado

- [x] Elevar y desvanecer los números de curación durante 1,55 s.
- [x] Añadir contorno blanco brillante y halo verde al sprite que recibe curación, también si el objetivo es un enemigo o un miembro de party.
- [x] Reutilizar el indicador en curaciones directas y en el robo de vida, manteniendo el daño y la recuperación como señales independientes.
- [x] Añadir una señal de defensa/escudo con halo azul cuando el actor recibe un beneficio defensivo, y animación flotante para cada pulso de daño/curación de los estados.
- [x] Mantener cada pulso como elemento independiente y dar feedback a los estados periódicos sin sustituir el número de daño o curación de la acción principal.

### Fase 4 — proyectiles físicos

- [x] Reutilizar `public/sprites/projectiles/arrow.png`, añadido previamente a `main`, sin duplicar el recurso.
- [x] Crear una capa de efectos fuera de los contenedores de los personajes y medir las anclas reales para calcular origen, destino, vector y ángulo.
- [x] Marcar los ataques básicos con arco mediante metadatos visuales explícitos en PvE, PvP/asedio y turnos de jugadores de party.
- [x] Mantener los proyectiles separados de la lógica de daño y no ejecutar el desplazamiento cuerpo a cuerpo durante su vuelo.
- [x] No mostrar un impacto válido en fallos; si falta el sprite, utilizar un símbolo alternativo sin interrumpir el combate.
- [ ] Inspección visual manual pendiente. Las comprobaciones automatizadas específicas de proyectiles y assets pasan; la CI completa sigue roja por las expectativas económicas/forja ajenas a esta funcionalidad descritas en la fase 1.
- [ ] Los proyectiles mágicos y la asignación de presentación por habilidad quedan para la fase 5; los perfiles de enemigos aún no declaran tipo de ataque a distancia.

### Fase 5 — magia elemental

- [x] Reutilizar el motor de proyectiles para habilidades mágicas; el modo, el sprite, el elemento y el impacto se configuran explícitamente por habilidad.
- [x] Asignar proyectiles a Chispa arcana (esfera arcana), Bola de fuego (fuego), Descarga elemental (rayo) y Drenaje vital (orbe de sombra), además de las habilidades de arco existentes.
- [x] Añadir recursos SVG transparentes para esfera arcana, bola de fuego, esquirla de hielo, rayo, energía sagrada, semilla natural y orbe de sombra. Se conserva `arrow.png` para la flecha.
- [x] Mantener los efectos lógicos de habilidades como la quemadura separados de su presentación.
- [x] Añadir pruebas de selección visual y de propagación del metadato en aciertos y fallos.
- [x] Mantener fallback si un sprite no se carga.
- [x] Las pruebas específicas de presentación, propagación de metadatos y targeting pasan en las ejecuciones posteriores a las correcciones; el estado global sigue condicionado por las expectativas económicas/forja descritas en la fase 1.

### Fase 6 — objetivos y efectos compuestos

- [x] Extraer un resolvedor puro común de destinos visuales y reutilizarlo en PvE, party y ambas perspectivas del asedio PvP.
- [x] Dar prioridad a los IDs explícitos de actor/objetivo sobre los fallbacks visuales y asociar los pulsos de estado al destinatario real.
- [x] Mantener diferenciados el daño al objetivo y la curación por robo de vida sobre el actor de origen.
- [x] Añadir pruebas unitarias para PvE, atacante/objetivo de party, turno enemigo de party, destino de curación, robo de vida y perspectiva de defensor PvP.
- [x] Integrar selección de habilidad y objetivo en el modal, regla lógica por equipo/patrón y validación real en el servidor de party. El servicio persiste curaciones/mejoras sobre un aliado o varios de manera transaccional; las curaciones de área emiten feedback por destinatario. Ver [docs/objetivos-combate.md](https://github.com/joseconca/gremio-expediciones/blob/mejora-animaciones/docs/objetivos-combate.md).
- [x] Añadir pruebas para formación 3×3, objetivos inválidos, casillas/filas/columnas/adyacentes, selección propia por defecto, objetivos caídos/retirados y curación/mejora individual y de área en party.
- [x] Persistir rosters de hasta nueve enemigos en PvE y party, generar encuentros de 1–3 enemigos por amenaza/party, resolver el daño por enemigo y esperar a derrotarlos a todos para cerrar el combate.
- [x] Renderizar cada enemigo con su casilla, HP y selección de objetivo; declarar Bola de fuego como ataque a adyacentes y devolver daño individual para feedback en áreas.
- [ ] Inspección visual manual pendiente; los fallos económicos/forja pendientes son los acordados para una revisión posterior.

### Fase 7 — pruebas, accesibilidad y rendimiento

- [x] Añadir pruebas del contrato y propagación de la presentación, mapeo de objetivos y señales compuestas daño/curación.
- [x] Añadir comprobaciones de existencia de todos los assets de proyectil, fallback de carga, anclas de escena y capa superpuesta.
- [x] Añadir comprobaciones de `prefers-reduced-motion`, cancelación de temporizadores y filtrado de proyectiles obsoletos.
- [ ] Validar el global de suites sin confundirlo con el alcance funcional: los tests de targeting/party, lint y build pasan; `test:base` y dos expectativas de `test:progression` siguen fallando por expectativas de rareza/forja pendientes de actualización.
- [ ] Verificar visualmente PC, móvil, varios participantes y el modo asedio/PvP en un navegador conectado al juego. No se ha realizado aún una inspección visual manual.
- [x] Mantener la resolución del turno separada de los metadatos de animación y cancelar temporizadores al desmontar o sustituir una secuencia.
- [ ] Probar visualmente en navegador enemigos caídos, acciones simultáneas y cambios de objetivo durante una animación; la mejora básica de defensa/estados ya está implementada.

## Ritmo de turnos y golpes finales

- El turno enemigo PvE conserva una espera aleatoria de 300–1500 ms antes de cada acción; el turno automático de party usa el mismo intervalo. Los enemigos reciben turnos individuales en la cola de iniciativa, en lugar de atacar todos en un bloque.
- La cola de iniciativa reparte acciones en proporción a la velocidad relativa al combatiente más lento e intercala sus eventos temporales; no hay un tope fijo de tres acciones. Los empates usan un hash determinista de la semilla, el actor y la ronda. La cola se persiste en el combate para mantener el orden entre peticiones y recargas.
- Cada acción enemiga devuelve el daño individual y los PV anteriores/posteriores del golpe. La escena anima cada atacante por separado, muestra el daño y actualiza visualmente la vida golpe a golpe. Esto modifica la presentación, mientras el daño y el avance de la acción continúan siendo atómicos en el servidor.
- Cuando una acción termina el combate, la presentación mantiene el impacto 550 ms adicionales para que se aprecien la bajada de vida y el daño antes del resultado. En asedio, el panel de resultado también espera a que termine esa presentación.

## Criterios de aceptación globales

- Ambos modales comparten la secuenciación de efectos.
- Curación claramente visible y asociada al receptor real.
- Ataques físicos, flechas y magia utilizan modos de presentación diferenciados.
- El destino no se deduce por defecto del tipo de actor cuando existe un ID de objetivo.
- Una acción compuesta puede mostrar daño y curación a la vez.
- Los recursos ausentes no rompen el combate; la lógica de juego permanece independiente de la animación.
- Las suites existentes y el build continúan pasando.
