# Equilibrio de recursos de habilidades

Revisión de las 301 habilidades actuales: 181 activas y 120 pasivas. Cambian costes, recuperación o cooldown de 135 activas. No se añaden técnicas ni rasgos únicos, ni se modifican las magnitudes de daño/curación, los objetivos o los estados. Referencia anterior: commit `0bae7016d`.

## Criterios

- Los remates físicos individuales se ajustan generalmente a 40–50 EN; las áreas siguen pagando más. Puño del maestro pasa a 25 EN frente a 30 de Puño ascendente; Esfera invocada cuesta 8 PM frente a 10 de Chispa arcana, compensando su menor daño.
- Costes finales explícitos: se retira el multiplicador global de energía. Técnicas ligeras y de preparación cuestan menos que golpes fuertes y áreas; las mejoras de nivel mantienen sus costes.
- Las híbridas dejan de pagar una combinación que recuperaban íntegramente cada turno. Ninja, Hoja del velo, Cazador espectral y Danzaespadas tienen poca inteligencia: pagan más energía y un maná secundario de 3–7, sin exigir una pasiva para usar sus técnicas propias.
- El apoyo a todo el grupo y los ataques de fila/área reciben costes acordes a su alcance. Se conserva una opción mágica barata para personajes entrenados; administrar maná significa reducir la frecuencia de técnicas caras, no prohibir todo lanzamiento sostenible.
- Primeros Auxilios pasa de 20 a 40 EN y de cooldown 5 a 7 (6 al máximo), para que la curación universal de Novato no sustituya con tanta facilidad al sanador. Su efecto se conserva.
- Respiración interior recupera 30 EN y Respiración del vacío 35; ambas tienen cooldown base 6 y mínimo 4 al mejorar. La recuperación pequeña de Luchador/Campeón cuesta una acción ofensiva o de apoyo y no rellena toda la reserva.
- Reserva arcana del Mago pasa de +100 a +20 PM (+25 a rango máximo), en la escala de las demás reservas. Se conserva el efecto; su futura diferenciación con otras pasivas queda fuera de este ajuste.
- Mente calmada y Flujo constante pasan a +3/+4 de regeneración de energía base. La regeneración de maná se mejora con dos decimales: una pasiva de +1 pasa gradualmente a +1,32, sin desperdiciar nueve rangos por redondeo entero.
- Curaciones y purificaciones no bajan de cooldown 2 al mejorar. Las barreras mantienen una carga.
- La vista de habilidades de party muestra el cooldown ajustado al nivel aprendido, igual que el ejecutado por el servidor. Los costes y la mejora se comparten con individual.

## Validación y límites

Se comprueba que las 181 activas sean pagables por su clase propietaria al Job de aprendizaje, incluso a Base 1 y sin equipo ni pasivas. Ninguna requiere más energía o maná que ese personaje. Esto no garantiza que una clase de poca inteligencia pueda pagar todos los hechizos heredados sin adaptar su equipo: heredar una técnica no cambia sus atributos.

El modelo enumera 65.414 rotaciones de tres activas heredables, con configuraciones de dos pasivas que maximizan reserva de maná o regeneración de un recurso. Cada ejecución dura 30 turnos, Base 50, Job y habilidades al máximo, sin equipo. Se usa el mayor recorrido de antecesores, igual que el juego.

El planificador rota habilidades, salta las que no puede pagar o están en cooldown y usa un básico si ninguna está disponible. Es una auditoría de gasto y sostenibilidad; no optimiza daño, no decide cuándo conviene curar y no simula golpes, objetivos, muertes o turnos extra por velocidad. No demuestra igualdad de daño ni tasas de victoria entre clases. Las configuraciones deliberadamente incompatibles con su reserva también aparecen en los extremos.

Comando reproducible para el catálogo actual:

```powershell
node scripts/auditar-recursos-habilidades.cjs
node --test tests/recursos-habilidades.test.cjs
```

La comparación anterior usa una exportación del catálogo de referencia y su función de mejora original. No aplica las pasivas nuevas al catálogo viejo.

## Resultado de la auditoría por clase

La media indica acciones básicas por falta de una técnica disponible, de 30 turnos. No es una puntuación de poder: una rotación de apoyo o con técnicas caras necesita pausas diferentes.

| Clase | Rotaciones | Básicos medios antes | Básicos medios ahora |
|---|---:|---:|---:|
| Novato | 1 | 0 | 5 |
| Espadachín | 20 | 3.3 | 7.5 |
| Acólito | 35 | 1.2 | 1.54 |
| Arquero | 20 | 3.1 | 7.05 |
| Mago | 40 | 0.7 | 1.58 |
| Super Novato | 1680 | 1.13 | 2.58 |
| Caballero | 84 | 5.81 | 8.56 |
| Duelista | 84 | 5.86 | 9.24 |
| Sacerdote | 240 | 0.7 | 1.21 |
| Monje | 240 | 2.7 | 4.49 |
| Cazador | 84 | 5.7 | 7.85 |
| Explorador | 84 | 4.86 | 7.88 |
| Elementalista | 168 | 0.5 | 1.43 |
| Brujo | 252 | 0.5 | 2.2 |
| Cruzado | 1938 | 1.81 | 3.38 |
| Pirata | 816 | 8.36 | 9.6 |
| Druida | 2448 | 0.88 | 3.43 |
| Espadachín rúnico | 2448 | 1.7 | 4.07 |
| Paladín | 220 | 6.33 | 8.6 |
| Guardián real | 220 | 7.67 | 9.65 |
| Asesino | 220 | 7.42 | 9.98 |
| Maestro de espadas | 220 | 7.45 | 9.23 |
| Oráculo | 572 | 0.47 | 0.93 |
| Hierofante | 858 | 0.47 | 0.99 |
| Asceta | 572 | 2.16 | 3.73 |
| Gran maestro | 572 | 3.16 | 3.92 |
| Francotirador | 220 | 7.65 | 9.09 |
| Domabestias | 220 | 7.52 | 9.11 |
| Guardián del bosque | 220 | 3.54 | 5.71 |
| Rastreador | 220 | 6.44 | 8.72 |
| Archimago | 440 | 0.32 | 0.71 |
| Invocador | 660 | 0.32 | 0.56 |
| Nigromante | 660 | 0.38 | 1.75 |
| Demonólogo | 660 | 0.38 | 1.73 |
| Berserker | 84 | 5.75 | 8.55 |
| Luchador | 240 | 2.86 | 4 |
| Centinela | 84 | 5.45 | 8.3 |
| Escriba arcano | 168 | 0.5 | 0.8 |
| Bardo | 84 | 0.93 | 2.33 |
| Comerciante | 20 | 4.4 | 8.15 |
| Chamán | 1632 | 1.46 | 5.07 |
| Inquisidor | 2907 | 0.64 | 6.86 |
| Heraldo de guerra | 2907 | 0.5 | 0.78 |
| Ninja | 1632 | 1.92 | 6.43 |
| Alquimista | 440 | 0.9 | 1.43 |
| Herrero | 220 | 7.16 | 9.34 |
| Verdugo | 220 | 7.16 | 9.22 |
| Saqueador | 220 | 7.16 | 8.95 |
| Campeón de arena | 572 | 2 | 3.26 |
| Mariscal | 220 | 6.9 | 9.48 |
| Vigía | 220 | 6.9 | 8.9 |
| Runista | 440 | 0.38 | 0.68 |
| Abjurador | 440 | 0.83 | 1.45 |
| Señor de la guerra | 2024 | 8.98 | 10.42 |
| Avatar de la tormenta | 6900 | 0.88 | 3.44 |
| Cazador espectral | 6072 | 4.94 | 9.84 |
| Arconte | 6900 | 0.41 | 1.04 |
| Justiciero | 4600 | 2.32 | 3.61 |
| Hoja del velo | 6072 | 4.43 | 8.56 |
| Danzaespadas | 1330 | 4.21 | 8.12 |
| Corsario | 1330 | 8.9 | 9.68 |

## Catálogo de costes revisados

Los costes son los efectivos del catálogo. El cooldown se muestra como base → rango máximo. EN = energía; PM = maná.

### Novato

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Golpe apresurado | 20 EN / 0 PM | 25 EN / 0 PM | 2 → 1 | 0 → 0 |
| Primeros Auxilios | 20 EN / 0 PM | 40 EN / 0 PM | 7 → 6 | 0 → 0 |
| Guardia improvisada | 25 EN / 0 PM | 25 EN / 0 PM | 4 → 3 | 0 → 0 |

### Espadachín

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Estocada | 25 EN / 0 PM | 25 EN / 0 PM | 2 → 1 | 0 → 0 |
| Tajo sangrante | 35 EN / 0 PM | 35 EN / 0 PM | 3 → 2 | 0 → 0 |
| Rompeguardia | 40 EN / 0 PM | 40 EN / 0 PM | 4 → 3 | 0 → 0 |

### Acólito

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Luz sanadora | 0 EN / 6 PM | 0 EN / 8 PM | 3 → 2 | 0 → 0 |
| Rejuvenecer | 0 EN / 7 PM | 0 EN / 12 PM | 4 → 3 | 0 → 0 |
| Golpe consagrado | 0 EN / 7 PM | 0 EN / 12 PM | 3 → 2 | 0 → 0 |
| Escudo de fe | 0 EN / 8 PM | 0 EN / 8 PM | 4 → 3 | 0 → 0 |

### Arquero

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Disparo preciso | 25 EN / 0 PM | 25 EN / 0 PM | 2 → 1 | 0 → 0 |
| Flecha penetrante | 35 EN / 0 PM | 35 EN / 0 PM | 3 → 2 | 0 → 0 |
| Tiro de oportunidad | 35 EN / 0 PM | 35 EN / 0 PM | 3 → 2 | 0 → 0 |

### Mago

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Chispa arcana | 0 EN / 7 PM | 0 EN / 10 PM | 2 → 1 | 0 → 0 |
| Bola de fuego | 0 EN / 10 PM | 0 EN / 20 PM | 3 → 2 | 0 → 0 |
| Concentración arcana | 0 EN / 7 PM | 0 EN / 14 PM | 4 → 3 | 0 → 0 |

### Caballero

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Guardia del Caballero | 40 EN / 0 PM | 30 EN / 0 PM | 4 → 2 | 0 → 0 |
| Provocación | 35 EN / 0 PM | 35 EN / 0 PM | 4 → 2 | 0 → 0 |
| Baluarte de acero | 45 EN / 0 PM | 40 EN / 0 PM | 5 → 3 | 0 → 0 |

### Duelista

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Finta fulminante | 35 EN / 0 PM | 35 EN / 0 PM | 3 → 1 | 0 → 0 |
| Corte final | 50 EN / 0 PM | 40 EN / 0 PM | 4 → 2 | 0 → 0 |
| Danza de hojas | 40 EN / 0 PM | 40 EN / 0 PM | 4 → 2 | 0 → 0 |

### Sacerdote

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Bendición | 0 EN / 10 PM | 0 EN / 16 PM | 4 → 2 | 0 → 0 |
| Purificación | 0 EN / 8 PM | 0 EN / 14 PM | 3 → 2 | 0 → 0 |
| Castigo sagrado | 0 EN / 11 PM | 0 EN / 20 PM | 4 → 2 | 0 → 0 |

### Monje

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Puño ascendente | 30 EN / 0 PM | 30 EN / 0 PM | 2 → 1 | 0 → 0 |
| Respiración interior | 0 EN / 0 PM | 0 EN / 0 PM | 6 → 4 | 30 → 39 |
| Onda chi | 45 EN / 0 PM | 45 EN / 0 PM | 4 → 2 | 0 → 0 |

### Cazador

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Marca de presa | 35 EN / 0 PM | 35 EN / 0 PM | 4 → 2 | 0 → 0 |
| Flecha mortal | 45 EN / 0 PM | 40 EN / 0 PM | 4 → 2 | 0 → 0 |
| Disparo triple | 50 EN / 0 PM | 25 EN / 0 PM | 4 → 2 | 0 → 0 |

### Explorador

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Tiro evasivo | 30 EN / 0 PM | 30 EN / 0 PM | 3 → 1 | 0 → 0 |
| Trampa cegadora | 30 EN / 0 PM | 30 EN / 0 PM | 4 → 2 | 0 → 0 |
| Paso de sombra | 40 EN / 0 PM | 40 EN / 0 PM | 4 → 2 | 0 → 0 |

### Elementalista

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Descarga elemental | 0 EN / 12 PM | 0 EN / 18 PM | 3 → 1 | 0 → 0 |
| Sello elemental | 0 EN / 9 PM | 0 EN / 14 PM | 4 → 2 | 0 → 0 |
| Tormenta elemental | 0 EN / 13 PM | 0 EN / 24 PM | 4 → 2 | 0 → 0 |

### Brujo

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Drenaje vital | 0 EN / 8 PM | 0 EN / 14 PM | 3 → 1 | 0 → 0 |
| Maldición debilitante | 0 EN / 10 PM | 0 EN / 18 PM | 4 → 2 | 0 → 0 |
| Peste maldita | 0 EN / 12 PM | 0 EN / 22 PM | 5 → 3 | 0 → 0 |

### Cruzado

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Golpe cruzado | 40 EN / 4 PM | 40 EN / 8 PM | 3 → 1 | 0 → 0 |
| Voto protector | 20 EN / 6 PM | 25 EN / 11 PM | 4 → 2 | 0 → 0 |
| Juicio sagrado | 30 EN / 6 PM | 30 EN / 11 PM | 4 → 2 | 0 → 0 |

### Pirata

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Abordaje feroz | 40 EN / 0 PM | 40 EN / 0 PM | 3 → 1 | 0 → 0 |
| Bomba de humo | 35 EN / 0 PM | 35 EN / 0 PM | 4 → 2 | 0 → 0 |
| Saqueo audaz | 45 EN / 0 PM | 45 EN / 0 PM | 4 → 2 | 0 → 0 |

### Druida

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Zarzas vivas | 0 EN / 8 PM | 0 EN / 16 PM | 3 → 1 | 0 → 0 |
| Piel de corteza | 0 EN / 7 PM | 0 EN / 14 PM | 4 → 2 | 0 → 0 |
| Lluvia de estrellas | 0 EN / 12 PM | 0 EN / 22 PM | 4 → 2 | 0 → 0 |

### Espadachín rúnico

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Corte rúnico | 30 EN / 5 PM | 30 EN / 9 PM | 3 → 1 | 0 → 0 |
| Marca arcana | 20 EN / 6 PM | 25 EN / 11 PM | 4 → 2 | 0 → 0 |
| Paso rúnico | 20 EN / 5 PM | 25 EN / 9 PM | 4 → 2 | 0 → 0 |

### Paladín

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Martillo sagrado | 35 EN / 5 PM | 35 EN / 9 PM | 3 → 1 | 0 → 0 |
| Escudo redentor | 20 EN / 7 PM | 25 EN / 13 PM | 4 → 2 | 0 → 0 |
| Sentencia luminosa | 45 EN / 8 PM | 45 EN / 15 PM | 5 → 3 | 0 → 0 |

### Guardián real

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Orden inquebrantable | 50 EN / 0 PM | 45 EN / 0 PM | 5 → 3 | 0 → 0 |
| Contraataque real | 45 EN / 0 PM | 45 EN / 0 PM | 4 → 2 | 0 → 0 |
| Muralla viviente | 60 EN / 0 PM | 60 EN / 0 PM | 5 → 3 | 0 → 0 |

### Asesino

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Golpe silencioso | 35 EN / 0 PM | 35 EN / 0 PM | 3 → 1 | 0 → 0 |
| Veneno oculto | 40 EN / 0 PM | 40 EN / 0 PM | 4 → 2 | 0 → 0 |
| Ejecución | 60 EN / 0 PM | 50 EN / 0 PM | 5 → 3 | 0 → 0 |

### Maestro de espadas

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Combo maestro | 45 EN / 0 PM | 30 EN / 0 PM | 3 → 1 | 0 → 0 |
| Guardia perfecta | 35 EN / 0 PM | 30 EN / 0 PM | 4 → 2 | 0 → 0 |
| Corte dimensional | 60 EN / 0 PM | 45 EN / 0 PM | 5 → 3 | 0 → 0 |

### Oráculo

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Destello profético | 0 EN / 8 PM | 0 EN / 16 PM | 3 → 1 | 0 → 0 |
| Presagio sanador | 0 EN / 12 PM | 0 EN / 22 PM | 5 → 3 | 0 → 0 |
| Visión abrumadora | 0 EN / 13 PM | 0 EN / 24 PM | 5 → 3 | 0 → 0 |

### Hierofante

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Martillo ritual | 0 EN / 8 PM | 0 EN / 16 PM | 3 → 1 | 0 → 0 |
| Barrera ritual | 0 EN / 10 PM | 0 EN / 18 PM | 5 → 3 | 0 → 0 |
| Juicio del hierofante | 0 EN / 13 PM | 0 EN / 24 PM | 5 → 3 | 0 → 0 |

### Asceta

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Palma vacía | 35 EN / 0 PM | 35 EN / 0 PM | 3 → 1 | 0 → 0 |
| Respiración del vacío | 0 EN / 0 PM | 0 EN / 0 PM | 6 → 4 | 35 → 46 |
| Mil pasos | 55 EN / 0 PM | 55 EN / 0 PM | 4 → 2 | 0 → 0 |

### Gran maestro

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Puño del maestro | 45 EN / 0 PM | 25 EN / 0 PM | 3 → 1 | 0 → 0 |
| Forma inmutable | 40 EN / 0 PM | 40 EN / 0 PM | 4 → 2 | 0 → 0 |
| Impacto celestial | 60 EN / 0 PM | 45 EN / 0 PM | 5 → 3 | 0 → 0 |

### Francotirador

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Tiro al corazón | 45 EN / 0 PM | 45 EN / 0 PM | 3 → 1 | 0 → 0 |
| Perforación total | 50 EN / 0 PM | 50 EN / 0 PM | 4 → 2 | 0 → 0 |
| Disparo letal | 60 EN / 0 PM | 50 EN / 0 PM | 5 → 3 | 0 → 0 |

### Domabestias

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Llamada salvaje | 40 EN / 0 PM | 40 EN / 0 PM | 3 → 1 | 0 → 0 |
| Trampa de raíces | 45 EN / 0 PM | 45 EN / 0 PM | 4 → 2 | 0 → 0 |
| Cacería en manada | 60 EN / 0 PM | 45 EN / 0 PM | 5 → 3 | 0 → 0 |

### Guardián del bosque

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Raíces guardianas | 30 EN / 0 PM | 30 EN / 0 PM | 4 → 2 | 0 → 0 |
| Flecha verde | 0 EN / 7 PM | 0 EN / 14 PM | 3 → 1 | 0 → 0 |
| Refugio del bosque | 20 EN / 7 PM | 25 EN / 13 PM | 5 → 3 | 0 → 0 |

### Rastreador

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Marcar objetivo | 35 EN / 0 PM | 35 EN / 0 PM | 3 → 1 | 0 → 0 |
| Flecha perseguidora | 45 EN / 0 PM | 35 EN / 0 PM | 3 → 1 | 0 → 0 |
| Emboscada final | 60 EN / 0 PM | 45 EN / 0 PM | 5 → 3 | 0 → 0 |

### Archimago

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Lanza arcana | 0 EN / 10 PM | 0 EN / 10 PM | 3 → 1 | 0 → 0 |
| Explosión elemental | 0 EN / 12 PM | 0 EN / 22 PM | 4 → 2 | 0 → 0 |
| Cataclismo | 0 EN / 16 PM | 0 EN / 30 PM | 5 → 3 | 0 → 0 |

### Invocador

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Esfera invocada | 0 EN / 8 PM | 0 EN / 8 PM | 3 → 1 | 0 → 0 |
| Sellos paralelos | 0 EN / 10 PM | 0 EN / 18 PM | 4 → 2 | 0 → 0 |
| Convergencia | 0 EN / 14 PM | 0 EN / 26 PM | 5 → 3 | 0 → 0 |

### Nigromante

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Toque fúnebre | 0 EN / 9 PM | 0 EN / 18 PM | 3 → 1 | 0 → 0 |
| Plaga oscura | 0 EN / 11 PM | 0 EN / 20 PM | 4 → 2 | 0 → 0 |
| Ejército de sombras | 0 EN / 15 PM | 0 EN / 28 PM | 5 → 3 | 0 → 0 |

### Demonólogo

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Cadena infernal | 0 EN / 9 PM | 0 EN / 18 PM | 3 → 1 | 0 → 0 |
| Pacto de sangre | 0 EN / 11 PM | 0 EN / 20 PM | 4 → 2 | 0 → 0 |
| Abismo | 0 EN / 16 PM | 0 EN / 30 PM | 5 → 3 | 0 → 0 |

### Berserker

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Hachazo sangrante | 35 EN / 0 PM | 35 EN / 0 PM | 3 → 1 | 0 → 0 |
| Furia desatada | 35 EN / 0 PM | 30 EN / 0 PM | 4 → 2 | 0 → 0 |
| Hacha desbocada | 55 EN / 0 PM | 55 EN / 0 PM | 5 → 3 | 0 → 0 |

### Luchador

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Puño firme | 35 EN / 0 PM | 35 EN / 0 PM | 3 → 1 | 10 → 13 |
| Guardia del luchador | 35 EN / 0 PM | 25 EN / 0 PM | 4 → 2 | 0 → 0 |
| Golpe al centro | 55 EN / 0 PM | 45 EN / 0 PM | 5 → 3 | 0 → 0 |

### Centinela

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Empuje de frontera | 35 EN / 0 PM | 35 EN / 0 PM | 3 → 1 | 0 → 0 |
| Cubrir la frontera | 35 EN / 0 PM | 30 EN / 0 PM | 4 → 2 | 0 → 0 |
| Barrido de frontera | 55 EN / 0 PM | 50 EN / 0 PM | 5 → 3 | 0 → 0 |

### Escriba arcano

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Sello debilitante | 0 EN / 8 PM | 0 EN / 14 PM | 3 → 1 | 0 → 0 |
| Glifo de concentración | 0 EN / 8 PM | 0 EN / 12 PM | 4 → 2 | 0 → 0 |
| Inscripción abrasiva | 0 EN / 12 PM | 0 EN / 18 PM | 5 → 3 | 0 → 0 |

### Bardo

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Nota discordante | 0 EN / 8 PM | 0 EN / 14 PM | 3 → 1 | 0 → 0 |
| Compás de marcha | 0 EN / 8 PM | 0 EN / 22 PM | 4 → 2 | 0 → 0 |
| Balada reparadora | 0 EN / 12 PM | 0 EN / 28 PM | 5 → 3 | 0 → 0 |

### Comerciante

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Golpe de oportunidad | 35 EN / 0 PM | 30 EN / 0 PM | 3 → 1 | 0 → 0 |
| Suministros de viaje | 35 EN / 0 PM | 35 EN / 0 PM | 4 → 2 | 0 → 0 |
| Distraer al bandido | 55 EN / 0 PM | 40 EN / 0 PM | 5 → 3 | 0 → 0 |

### Chamán

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Hacha de tormenta | 20 EN / 4 PM | 30 EN / 10 PM | 3 → 1 | 0 → 0 |
| Bendición tribal | 20 EN / 4 PM | 30 EN / 14 PM | 4 → 2 | 0 → 0 |
| Maldición de cenizas | 30 EN / 6 PM | 40 EN / 18 PM | 5 → 3 | 0 → 0 |

### Inquisidor

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Juicio penitente | 0 EN / 8 PM | 0 EN / 16 PM | 3 → 1 | 0 → 0 |
| Absolución | 0 EN / 8 PM | 0 EN / 16 PM | 4 → 2 | 0 → 0 |
| Sentencia del inquisidor | 0 EN / 12 PM | 0 EN / 22 PM | 5 → 3 | 0 → 0 |

### Heraldo de guerra

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Golpe de mando | 20 EN / 4 PM | 25 EN / 8 PM | 3 → 1 | 0 → 0 |
| Grito de avance | 20 EN / 4 PM | 35 EN / 16 PM | 5 → 3 | 0 → 0 |
| Sello de concentración | 30 EN / 6 PM | 30 EN / 18 PM | 5 → 3 | 0 → 0 |

### Ninja

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Corte de sombra | 20 EN / 4 PM | 35 EN / 4 PM | 3 → 1 | 0 → 0 |
| Velo de humo | 20 EN / 4 PM | 25 EN / 3 PM | 4 → 2 | 0 → 0 |
| Arte de las brasas | 30 EN / 6 PM | 45 EN / 7 PM | 5 → 3 | 0 → 0 |

### Alquimista

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Preparado corrosivo | 0 EN / 8 PM | 0 EN / 16 PM | 3 → 1 | 0 → 0 |
| Elixir revitalizante | 0 EN / 8 PM | 0 EN / 18 PM | 4 → 2 | 0 → 0 |
| Reactivo volátil | 0 EN / 12 PM | 0 EN / 30 PM | 5 → 3 | 0 → 0 |

### Herrero

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Golpe de forja | 35 EN / 0 PM | 35 EN / 0 PM | 3 → 1 | 0 → 0 |
| Refuerzo de campaña | 35 EN / 0 PM | 35 EN / 0 PM | 4 → 2 | 0 → 0 |
| Martillo quebrantador | 55 EN / 0 PM | 55 EN / 0 PM | 5 → 3 | 0 → 0 |

### Verdugo

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Hacha quebrantadora | 35 EN / 0 PM | 40 EN / 0 PM | 3 → 1 | 0 → 0 |
| Preparar ejecución | 35 EN / 0 PM | 30 EN / 0 PM | 4 → 2 | 0 → 0 |
| Ejecución implacable | 55 EN / 0 PM | 45 EN / 0 PM | 5 → 3 | 0 → 0 |

### Saqueador

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Desgarro voraz | 35 EN / 0 PM | 40 EN / 0 PM | 3 → 1 | 0 → 0 |
| Paso de saqueo | 35 EN / 0 PM | 25 EN / 0 PM | 4 → 2 | 0 → 0 |
| Cosecha voraz | 55 EN / 0 PM | 55 EN / 0 PM | 5 → 3 | 0 → 0 |

### Campeón de arena

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Puño del campeón | 35 EN / 0 PM | 40 EN / 0 PM | 3 → 1 | 10 → 13 |
| Segundo aliento | 35 EN / 0 PM | 35 EN / 0 PM | 4 → 2 | 15 → 20 |
| Romper el cerco | 55 EN / 0 PM | 55 EN / 0 PM | 5 → 3 | 3 → 4 |

### Mariscal

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Lanza de contención | 35 EN / 0 PM | 50 EN / 0 PM | 3 → 1 | 0 → 0 |
| Formación defensiva | 35 EN / 0 PM | 45 EN / 0 PM | 4 → 2 | 0 → 0 |
| Estocada de mando | 55 EN / 0 PM | 45 EN / 0 PM | 5 → 3 | 0 → 0 |

### Vigía

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Disparo de vigilancia | 35 EN / 0 PM | 35 EN / 0 PM | 3 → 1 | 0 → 0 |
| Posición ventajosa | 35 EN / 0 PM | 30 EN / 0 PM | 4 → 2 | 0 → 0 |
| Salva de frontera | 55 EN / 0 PM | 50 EN / 0 PM | 5 → 3 | 0 → 0 |

### Runista

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Sello abrasador | 0 EN / 8 PM | 0 EN / 18 PM | 3 → 1 | 0 → 0 |
| Inscripción de poder | 0 EN / 8 PM | 0 EN / 16 PM | 4 → 2 | 0 → 0 |
| Círculo de ruptura | 0 EN / 12 PM | 0 EN / 34 PM | 5 → 3 | 0 → 0 |

### Abjurador

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Pulso de rechazo | 0 EN / 8 PM | 0 EN / 16 PM | 3 → 1 | 0 → 0 |
| Barrera de negación | 0 EN / 14 PM | 0 EN / 20 PM | 6 → 4 | 0 → 0 |
| Disipación hostil | 0 EN / 12 PM | 0 EN / 26 PM | 5 → 3 | 0 → 0 |

### Señor de la guerra

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Ruptura de línea | 35 EN / 0 PM | 50 EN / 0 PM | 3 → 1 | 0 → 0 |
| Orden de conquista | 35 EN / 0 PM | 50 EN / 0 PM | 4 → 2 | 0 → 0 |
| Asalto del caudillo | 55 EN / 0 PM | 45 EN / 0 PM | 5 → 3 | 0 → 0 |

### Avatar de la tormenta

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Puño de la tormenta | 20 EN / 4 PM | 45 EN / 22 PM | 5 → 3 | 0 → 0 |
| Canalizar la tempestad | 20 EN / 4 PM | 25 EN / 12 PM | 4 → 2 | 0 → 0 |
| Convergencia del trueno | 30 EN / 6 PM | 40 EN / 18 PM | 5 → 3 | 0 → 0 |

### Cazador espectral

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Flecha espectral | 20 EN / 4 PM | 35 EN / 4 PM | 3 → 1 | 0 → 0 |
| Acecho funerario | 20 EN / 4 PM | 30 EN / 3 PM | 4 → 2 | 0 → 0 |
| Lluvia de ánimas | 30 EN / 6 PM | 45 EN / 7 PM | 5 → 3 | 0 → 0 |

### Arconte

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Convergencia sagrada | 0 EN / 8 PM | 0 EN / 26 PM | 3 → 1 | 0 → 0 |
| Luz del arconte | 0 EN / 16 PM | 0 EN / 34 PM | 6 → 4 | 0 → 0 |
| Mandato celestial | 0 EN / 12 PM | 0 EN / 28 PM | 5 → 3 | 0 → 0 |

### Justiciero

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Puño de justicia | 20 EN / 4 PM | 30 EN / 10 PM | 3 → 1 | 0 → 0 |
| Amparo del justo | 20 EN / 4 PM | 25 EN / 12 PM | 4 → 2 | 0 → 0 |
| Veredicto sagrado | 30 EN / 6 PM | 40 EN / 18 PM | 5 → 3 | 0 → 0 |

### Hoja del velo

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Corte del velo | 20 EN / 4 PM | 35 EN / 4 PM | 3 → 1 | 0 → 0 |
| Filo entre mundos | 20 EN / 4 PM | 30 EN / 3 PM | 4 → 2 | 0 → 0 |
| Ruptura entre mundos | 30 EN / 6 PM | 45 EN / 7 PM | 5 → 3 | 0 → 0 |

### Danzaespadas

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Danza cortante | 20 EN / 4 PM | 40 EN / 5 PM | 3 → 1 | 0 → 0 |
| Danza de la victoria | 20 EN / 4 PM | 35 EN / 5 PM | 4 → 2 | 0 → 0 |
| Último compás | 30 EN / 6 PM | 40 EN / 5 PM | 5 → 3 | 0 → 0 |

### Corsario

| Habilidad | Coste anterior | Coste actual | Cooldown | Recupera EN, base → máximo |
|---|---|---|---|---|
| Abordaje | 35 EN / 0 PM | 40 EN / 0 PM | 3 → 1 | 0 → 0 |
| Maniobra de escape | 35 EN / 0 PM | 25 EN / 0 PM | 4 → 2 | 0 → 0 |
| Salva de abordaje | 55 EN / 0 PM | 55 EN / 0 PM | 5 → 3 | 0 → 0 |


## Comprobaciones finales

- Compilación completa con `npm run build -- --webpack`, TypeScript y ESLint correctos.
- 445 pruebas ejecutadas: 443 superadas. Las dos fallidas son las comprobaciones previas de filtros de Escuela de Batalla; no se han cambiado ni su test ni su pantalla.
- La comparación del catálogo con la referencia confirma que no cambian identidades, daño, curación, objetivos o estados. Solo recursos, recuperación, cooldowns y textos asociados.
- El ajuste es de datos y lógica compartida; no añade una migración de base de datos.
- Pendiente de contraste con partidas reales para ajustar duración de encuentros y eficiencia de configuraciones concretas. Las simulaciones de recursos no sustituyen una comparación completa de rendimiento entre clases.
