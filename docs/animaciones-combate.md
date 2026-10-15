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
- [ ] Validación completa pendiente: Regression llega a `test:base` y falla en `las mejoras no heredan anomalías del precio de compra` (esperado 138, real 75). Es una prueba económica de archivos no modificados en esta rama; el job omite entonces progresión, party, lint y build. Hay otra ejecución para el commit actual en curso.

### Fase 2 — controlador compartido

- [x] Crear un hook/controlador común para ejecutar y cancelar secuencias, gestionar IDs de eventos y garantizar la limpieza de temporizadores.
- [ ] Extraer la capa de efectos superpuestos a la escena para evitar que el proyectil quede recortado por contenedores de personajes.
- [x] Migrar primero el ataque cuerpo a cuerpo conservando tiempos, estados y estilos heredados.
- [x] Sustituir el código duplicado de secuenciación en `CombateModal` y `AsedioModal` por el controlador común.
- [x] Mantener la cancelación de temporizadores y evitar que una secuencia desactualizada limpie una acción posterior.

### Fase 3 — curación y efectos de estado

- [x] Elevar y desvanecer los números de curación durante 1,55 s.
- [x] Añadir contorno blanco brillante y halo verde al sprite que recibe curación, también si el objetivo es un enemigo o un miembro de party.
- [x] Reutilizar el indicador en curaciones directas y en el robo de vida, manteniendo el daño y la recuperación como señales independientes.
- [ ] Pulir los pulsos de curación progresiva, la presentación de defensa/escudo y el solapamiento de múltiples efectos de estado.

### Fase 4 — proyectiles físicos

- Añadir una biblioteca de sprites de proyectil separada de los iconos de habilidades.
- Implementar un movimiento origen-destino medido desde las posiciones reales de los sprites, no con distancias fijas.
- Empezar por una flecha para ataques básicos y habilidades de arco.
- Mostrar impacto solo cuando corresponda; fallos y esquivas deben usar una secuencia distinta.
- Cubrir tanto el movimiento jugador→enemigo como enemigo→jugador y participante→enemigo.

### Fase 5 — magia elemental

- Reutilizar el motor de proyectiles para fuego, hielo, arcano y futuros elementos.
- Configurar por habilidad `presentacionVisual` y no deducir fuego únicamente a partir del daño mágico.
- Separar trayectoria, efecto de impacto y aplicación lógica de estados como quemadura.
- Proporcionar fallback visual si falla la carga de un sprite.

### Fase 6 — objetivos y efectos compuestos

- Resolver de forma consistente el ID del origen y del destino para jugador, enemigo y cada miembro de party.
- Permitir efectos sobre aliados solo junto a una ampliación explícita de las reglas/servicios de selección y resolución de objetivos; no basta con animarlos.
- Añadir cobertura de multiobjetivo/área cuando exista selección de objetivos compatible.
- Representar daño, curación y estados derivados de una sola acción como eventos visuales independientes.
- Comprobar enemigos que se curan, objetivos caídos/retirados y cierre del modal durante una animación.

### Fase 7 — pruebas, accesibilidad y rendimiento

- Añadir pruebas del contrato, mapeo de objetivos, secuencias y fallback de assets.
- Ejecutar `npm run test:base`, `npm run test:progression`, `npm run test:party`, `npm run lint` y `npm run build`.
- Verificar visualmente PC, móvil, varios participantes y el modo asedio/PvP.
- Respetar `prefers-reduced-motion` en las animaciones nuevas y reducir flashes repetitivos.
- Comprobar que la secuencia visual no modifica la resolución del turno ni deja acciones bloqueadas al desmontar componentes.

## Criterios de aceptación globales

- Ambos modales comparten la secuenciación de efectos.
- Curación claramente visible y asociada al receptor real.
- Ataques físicos, flechas y magia utilizan modos de presentación diferenciados.
- El destino no se deduce por defecto del tipo de actor cuando existe un ID de objetivo.
- Una acción compuesta puede mostrar daño y curación a la vez.
- Los recursos ausentes no rompen el combate; la lógica de juego permanece independiente de la animación.
- Las suites existentes y el build continúan pasando.
