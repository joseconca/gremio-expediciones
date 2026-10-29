# Catálogo jugable de habilidades

Generado desde `HABILIDADES` por `node scripts/generar-catalogo-habilidades-v2.cjs`. Valores de rango 1. Estado: 29 de octubre de 2026.

61 clases; 245 activas y 122 pasivas. Equipo máximo: cinco activas y tres pasivas de la clase actual y sus antecesoras. Los rasgos intrínsecos se revisarán después.

## Novato

Tier 0.

### Golpe apresurado

ID: `golpe_apresurado`. Activa; 25 EN, 0 PM; CD 2 ciclos; objetivo enemigo, individual. Job 1; rango máximo 3.

Ataque con potencia ×1.15.

### Primeros auxilios

ID: `primeros_auxilios`. Activa; 40 EN, 0 PM; CD 7 ciclos; objetivo aliado, individual. Job 3; rango máximo 3.

Cura un 15 % de vida máxima. Vendaje: 7.5 % de vida por turno durante 2 turnos.

### Guardia improvisada

ID: `guardia_improvisada`. Activa; 25 EN, 0 PM; CD 4 ciclos; objetivo propio, individual. Job 5; rango máximo 3.

Protección del 10 % de vida del lanzador durante 2 turnos.

### Aguante de aprendiz

ID: `aguante_aprendiz`. Pasiva. Job 8; rango máximo 3.

Aumenta la vida máxima en 8 puntos.

### Instinto superviviente

ID: `instinto_superviviente`. Pasiva. Job 9; rango máximo 1.

Al usar una técnica con menos del 30 % de vida, obtienes protección equivalente al 3 % de tu vida máxima. Una vez por combate. Las ventajas de la misma familia no se acumulan.

### Evaluar el peligro

ID: `novato_tecnica_adicional`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo enemigo, individual. Job 10; rango máximo 1.

Debilita una preparación enemiga; no hace perder su turno. Prepara 10 puntos de precisión para un intento de ataque, durante 2 turnos.

## Espadachín

Tier 1.

### Estocada

ID: `estocada_espadachin`. Activa; 25 EN, 0 PM; CD 2 ciclos; objetivo enemigo, individual. Job 1; rango máximo 5.

Ataque con potencia ×1.25. Consume apertura para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico. Prepara apertura durante 3 turnos para técnicas y pasivas compatibles.

### Tajo sangrante

ID: `tajo_sangrante`. Activa; 35 EN, 0 PM; CD 3 ciclos; objetivo enemigo, individual. Job 10; rango máximo 5.

Ataque con potencia ×0.9. Herida: 14 % del ataque por pulso durante 2 turnos.

### Rompeguardia

ID: `rompeguardia`. Activa; 40 EN, 0 PM; CD 4 ciclos; objetivo enemigo, individual. Job 20; rango máximo 5.

Ataque con potencia ×0.85. Retira una mejora del rival. Expone un 15 % de defensa para un impacto, durante 2 turnos.

### Técnica de duelo

ID: `tecnica_duelo`. Pasiva. Job 20; rango máximo 1.

Al atacar a un rival protegido, preparas 5 puntos de precisión para un impacto. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Corazón de acero

ID: `corazon_acero`. Pasiva. Job 10; rango máximo 1.

Al conceder protección, eliminas una herida propia. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Cambio de empuñadura

ID: `espadachin_tecnica_adicional`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo propio, individual. Job 15; rango máximo 1.

Retira un efecto de guardia del lanzador. Prepara apertura durante 2 turnos para técnicas y pasivas compatibles.

## Acólito

Tier 1.

### Luz sanadora

ID: `luz_acolito`. Activa; 0 EN, 8 PM; CD 3 ciclos; objetivo aliado, individual. Job 1; rango máximo 5.

Cura un 18 % de vida máxima.

### Rejuvenecer

ID: `rejuvenecer`. Activa; 0 EN, 12 PM; CD 4 ciclos; objetivo aliado, individual. Job 10; rango máximo 5.

Cura un 7.5 % por turno durante tres turnos.

### Golpe consagrado

ID: `golpe_consagrado`. Activa; 0 EN, 12 PM; CD 3 ciclos; objetivo enemigo, individual. Job 20; rango máximo 5.

Ataque con potencia ×1.1. Adelanta y consume un pulso de cura pendiente.

### Escudo de fe

ID: `escudo_fe`. Activa; 0 EN, 8 PM; CD 4 ciclos; objetivo aliado, individual. Job 18; rango máximo 5.

Protección del 14 % de vida del lanzador durante 2 turnos.

### Plegaria constante

ID: `plegaria_constante`. Pasiva. Job 20; rango máximo 1.

Al cambiar de destinatario respecto a la técnica anterior, recuperas hasta el 25 % del maná pagado, con límite compartido de 5 PM por ciclo. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Corazón compasivo

ID: `corazon_compasivo`. Pasiva. Job 10; rango máximo 1.

Al sobrar parte de una curación, preparas dos pulsos de cura del 1 % de tu vida máxima cada uno. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Recogimiento

ID: `acolito_tecnica_adicional`. Activa; 0 EN, 10 PM; CD 4 ciclos; objetivo aliado, individual. Job 15; rango máximo 1.

Transfiere un 50 % de tu regeneración a un aliado, conservando su duración. Sobre ti convierte el 20 % en recuperación, sin duplicar presupuesto.

## Arquero

Tier 1.

### Disparo preciso

ID: `disparo_arquero`. Activa; 25 EN, 0 PM; CD 2 ciclos; objetivo enemigo, individual. Job 1; rango máximo 5.

Ataque con potencia ×1.2. Consume punteria para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico. Prepara punteria durante 3 turnos para técnicas y pasivas compatibles.

### Flecha penetrante

ID: `flecha_penetrante`. Activa; 35 EN, 0 PM; CD 3 ciclos; objetivo enemigo, individual. Job 10; rango máximo 5.

Ataque con potencia ×1.05. Retira una mejora del rival.

### Tiro de oportunidad

ID: `tiro_oportunidad`. Activa; 35 EN, 0 PM; CD 3 ciclos; objetivo enemigo, individual. Job 20; rango máximo 5.

Ataque con potencia ×1.25. Prepara presa durante 3 turnos para técnicas y pasivas compatibles. Prepara punteria durante 3 turnos para técnicas y pasivas compatibles.

### Ojo de halcón

ID: `ojo_halcon`. Pasiva. Job 20; rango máximo 1.

Al actuar sobre un objetivo marcado por ti, preparas 5 puntos de precisión para un impacto. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Puntería tranquila

ID: `punteria_tranquila`. Pasiva. Job 10; rango máximo 1.

Al usar una técnica de apoyo, conservas un enlace residual para la siguiente técnica de tu clase de origen. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Disparo de señal

ID: `arquero_tecnica_adicional`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo enemigo, individual. Job 15; rango máximo 1.

Expone un 15 % de defensa para un impacto, durante 2 turnos.

## Mago

Tier 1.

### Chispa arcana

ID: `chispa_mago`. Activa; 0 EN, 10 PM; CD 2 ciclos; objetivo enemigo, individual. Job 1; rango máximo 5.

Ataque con potencia ×1.25. Aplica arcano; puede consumir una preparación elemental compatible.

### Bola de fuego

ID: `bola_fuego`. Activa; 0 EN, 20 PM; CD 3 ciclos; objetivo enemigo, adyacentes. Job 10; rango máximo 5.

Ataque con potencia ×1.75. Herida: 7 % del ataque por pulso durante 2 turnos. Afecta a adyacentes; el presupuesto se reparte entre sus objetivos. Aplica fuego; puede consumir una preparación elemental compatible.

### Concentración arcana

ID: `concentracion_arcana`. Activa; 0 EN, 14 PM; CD 4 ciclos; objetivo propio, individual. Job 20; rango máximo 5.

Prepara concentracion durante 3 turnos para técnicas y pasivas compatibles. Protección del 6 % de vida del lanzador durante 2 turnos.

### Reserva arcana

ID: `reserva_arcana`. Pasiva. Job 20; rango máximo 5.

Aumenta el maná máximo en 20 puntos.

### Mente despejada

ID: `mente_despejada`. Pasiva. Job 10; rango máximo 1.

Al usar una técnica con menos del 30 % de maná, acortas en un pulso una herida propia sin sufrirlo. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Disipar chispa

ID: `mago_tecnica_adicional`. Activa; 0 EN, 10 PM; CD 4 ciclos; objetivo enemigo, individual. Job 15; rango máximo 1.

Consume hasta 2 cargas de brasa si existen. Retira un efecto de guardia del destinatario. Expone un 5 % de defensa para un impacto, durante 2 turnos.

## Super Novato

Tier 1.5; clase secreta con objetivo de potencia de final de árbol.

### Técnica de enlace

ID: `superNovato_enlace`. Activa; 35 EN, 0 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×2. Consume enlace para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico. Prepara enlace durante 3 turnos para técnicas y pasivas compatibles.

### Recurso improvisado

ID: `superNovato_recurso`. Activa; 0 EN, 8 PM; CD 6 ciclos; objetivo propio, individual. Job 20; rango máximo 10.

Cura un 8 % de vida máxima. Recupera 15 de energia.

### Lección práctica

ID: `superNovato_leccion`. Activa; 35 EN, 5 PM; CD 5 ciclos; objetivo enemigo, individual. Job 40; rango máximo 10.

Ataque con potencia ×1.75. Consume enlace para proteger al lanzador un 4 % de su vida; sin ella conserva su efecto básico. Prepara proxima disciplina durante 3 turnos para técnicas y pasivas compatibles.

### Aprendiz incansable

ID: `superNovato_incansable`. Pasiva. Job 25; rango máximo 1.

Al alternar una técnica ofensiva y una de apoyo, recuperas hasta el 25 % de la energía pagada, con límite compartido de 10 EN por ciclo. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Plan de contingencia

ID: `superNovato_contingencia`. Pasiva. Job 60; rango máximo 1.

Al usar una técnica con menos del 30 % de vida, recuperas hasta el 2 % de tu vida máxima. Una vez por combate. Las ventajas de la misma familia no se acumulan.

### Cambiar de lección

ID: `superNovato_tecnica_adicional`. Activa; 25 EN, 3 PM; CD 4 ciclos; objetivo propio, individual. Job 20; rango máximo 1.

Retira un efecto de preparacion del lanzador. Te desplazas a fila central. Prepara proxima disciplina durante 2 turnos para técnicas y pasivas compatibles.

## Caballero

Tier 2.

### Guardia del Caballero

ID: `guardia_caballero`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo aliado, individual. Job 1; rango máximo 10.

Protección del 16 % de vida del lanzador durante 2 turnos. Prepara custodia durante 3 turnos para técnicas y pasivas compatibles.

### Provocación

ID: `provocacion`. Activa; 35 EN, 0 PM; CD 4 ciclos; objetivo enemigo, individual. Job 15; rango máximo 10.

Ataque con potencia ×0.95. Prepara provocacion durante 3 turnos para técnicas y pasivas compatibles.

### Muro viviente

ID: `muro_viviente`. Pasiva. Job 30; rango máximo 1.

Al conceder protección, conservas un enlace residual para la siguiente técnica de tu clase de origen. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Baluarte de acero

ID: `baluarte_acero`. Activa; 40 EN, 0 PM; CD 5 ciclos; objetivo propio, individual. Job 30; rango máximo 10.

Protección del 14 % de vida del lanzador durante 2 turnos. Consume custodia para proteger al lanzador un 4 % de su vida; sin ella conserva su efecto básico.

### Veteranía del Caballero

ID: `veterania_caballero`. Pasiva. Job 40; rango máximo 1.

Al usar una técnica de apoyo, acortas en un pulso una herida propia sin sufrirlo. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Relevo de escudo

ID: `caballero_tecnica_adicional`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo aliado, individual. Job 20; rango máximo 1.

Transfiere un 50 % de tu protección a un aliado, conservando su duración. Sobre ti convierte el 20 % en recuperación, sin duplicar presupuesto.

## Duelista

Tier 2.

### Finta fulminante

ID: `finta_fulminante`. Activa; 35 EN, 0 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.05. Prepara lectura durante 3 turnos para técnicas y pasivas compatibles.

### Corte final

ID: `corte_final`. Activa; 40 EN, 0 PM; CD 4 ciclos; objetivo enemigo, individual. Job 15; rango máximo 10.

Ataque con potencia ×1.65. Consume lectura para aumentar hasta 15 % el daño; sin ella conserva su efecto básico.

### Reflejos del Duelista

ID: `reflejos_duelista`. Pasiva. Job 30; rango máximo 1.

Al consumir una preparación, preparas 5 puntos de precisión para un impacto. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Danza de hojas

ID: `danza_hojas`. Activa; 40 EN, 0 PM; CD 4 ciclos; objetivo propio, individual. Job 30; rango máximo 10.

Protección del 10 % de vida del lanzador durante 2 turnos. Prepara lectura durante 3 turnos para técnicas y pasivas compatibles.

### Mano firme

ID: `mano_firme_duelista`. Pasiva. Job 40; rango máximo 1.

Al alternar una técnica ofensiva y una de apoyo, conservas un enlace residual para la siguiente técnica de tu clase de origen. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Desafío medido

ID: `duelista_tecnica_adicional`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo enemigo, individual. Job 20; rango máximo 1.

Debilita una preparación enemiga; no hace perder su turno. Prepara lectura durante 2 turnos para técnicas y pasivas compatibles.

## Sacerdote

Tier 2.

### Bendición

ID: `bendicion_sacerdote`. Activa; 0 EN, 16 PM; CD 4 ciclos; objetivo aliado, individual. Job 1; rango máximo 10.

Cura un 20 % de vida máxima. Prepara triaje durante 3 turnos para técnicas y pasivas compatibles.

### Purificación

ID: `purificacion`. Activa; 0 EN, 14 PM; CD 3 ciclos; objetivo aliado, individual. Job 15; rango máximo 10.

Cura un 9 % de vida máxima. Elimina un perjuicio del destinatario.

### Manos piadosas

ID: `manos_piadosas`. Pasiva. Job 30; rango máximo 1.

Al actuar sobre un objetivo por debajo del 50 % de vida, acortas en un pulso una herida propia sin sufrirlo. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Castigo sagrado

ID: `castigo_sagrado`. Activa; 0 EN, 20 PM; CD 4 ciclos; objetivo enemigo, individual. Job 30; rango máximo 10.

Ataque con potencia ×1.1. Prepara sentencia durante 3 turnos para técnicas y pasivas compatibles.

### Luz persistente

ID: `luz_persistente`. Pasiva. Job 40; rango máximo 1.

Al usar una regeneración, recuperas hasta el 2 % de tu vida máxima. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Cerrar la herida

ID: `sacerdote_tecnica_adicional`. Activa; 0 EN, 10 PM; CD 4 ciclos; objetivo aliado, individual. Job 20; rango máximo 1.

Adelanta y consume un pulso de cura pendiente. Retira un efecto de herida del destinatario.

## Monje

Tier 2.

### Puño ascendente

ID: `puno_ascendente`. Activa; 30 EN, 0 PM; CD 2 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.15. Prepara chi durante 3 turnos para técnicas y pasivas compatibles.

### Respiración interior

ID: `respiracion_interior`. Activa; 0 EN, 0 PM; CD 6 ciclos; objetivo propio, individual. Job 15; rango máximo 10.

Recupera 30 de energia. Prepara chi durante 3 turnos para técnicas y pasivas compatibles.

### Disciplina marcial

ID: `disciplina_marcial`. Pasiva. Job 30; rango máximo 1.

Al preparar una técnica, preparas 5 puntos de precisión para un impacto. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Onda chi

ID: `onda_chi`. Activa; 45 EN, 0 PM; CD 4 ciclos; objetivo enemigo, individual. Job 30; rango máximo 10.

Ataque con potencia ×1.55. Consume chi para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico. Retira una mejora del rival.

### Mente calmada

ID: `mente_calmada`. Pasiva. Job 40; rango máximo 1.

Al usar una técnica con menos del 30 % de energía, eliminas una herida propia. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Soltar tensión

ID: `monje_tecnica_adicional`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo propio, individual. Job 20; rango máximo 1.

Consume hasta 2 cargas de chi si existen. Retira un efecto de exposicion del lanzador. Protección del 4 % de vida del lanzador durante 1 turnos.

## Cazador

Tier 2.

### Marca de presa

ID: `marca_presa`. Activa; 35 EN, 0 PM; CD 4 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1. Prepara presa durante 3 turnos para técnicas y pasivas compatibles. Prepara debilidad durante 3 turnos para técnicas y pasivas compatibles.

### Flecha mortal

ID: `flecha_mortal`. Activa; 40 EN, 0 PM; CD 4 ciclos; objetivo enemigo, individual. Job 15; rango máximo 10.

Ataque con potencia ×1.55. Consume debilidad para aumentar hasta 15 % el daño; sin ella conserva su efecto básico.

### Instinto depredador

ID: `instinto_depredador`. Pasiva. Job 30; rango máximo 1.

Al actuar sobre un objetivo por debajo del 50 % de vida, conservas un enlace residual para la siguiente técnica de tu clase de origen. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Disparo triple

ID: `disparo_triple`. Activa; 25 EN, 0 PM; CD 4 ciclos; objetivo enemigo, individual. Job 30; rango máximo 10.

Ataque con potencia ×1.4. Prepara presa durante 3 turnos para técnicas y pasivas compatibles. Adelanta y consume un pulso de daño pendiente.

### Piel de rastreador

ID: `piel_rastreador`. Pasiva. Job 40; rango máximo 1.

Al actuar sobre un objetivo marcado por ti, resistes parcialmente el siguiente perjuicio durante dos turnos. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Cambiar de presa

ID: `cazador_tecnica_adicional`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo enemigo, individual. Job 20; rango máximo 1.

Marca al destinatario con presa durante 2 turnos. Debilita una preparación enemiga; no hace perder su turno.

## Explorador

Tier 2.

### Tiro evasivo

ID: `tiro_evasivo`. Activa; 30 EN, 0 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.1. Prepara ruta durante 3 turnos para técnicas y pasivas compatibles.

### Trampa cegadora

ID: `trampa_cegadora`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo aliado, individual. Job 15; rango máximo 10.

Prepara trampa durante 3 turnos para técnicas y pasivas compatibles. Debilita una preparación enemiga; no hace perder su turno.

### Paso ligero

ID: `paso_ligero`. Pasiva. Job 30; rango máximo 1.

Al usar una técnica de movilidad, recuperas hasta el 25 % de la energía pagada, con límite compartido de 10 EN por ciclo. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Paso de sombra

ID: `paso_sombra`. Activa; 40 EN, 0 PM; CD 4 ciclos; objetivo propio, individual. Job 30; rango máximo 10.

Te desplazas a retaguardia. Consume ruta para proteger al lanzador un 4 % de su vida; sin ella conserva su efecto básico.

### Supervivencia

ID: `supervivencia_explorador`. Pasiva. Job 40; rango máximo 1.

Al consumir una preparación, preparas dos pulsos de cura del 1 % de tu vida máxima cada uno. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Rastro falso

ID: `explorador_tecnica_adicional`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo propio, individual. Job 20; rango máximo 1.

Te desplazas a retaguardia. Resiste un 15 % de la potencia del siguiente perjuicio, durante 2 turnos.

## Elementalista

Tier 2.

### Descarga elemental

ID: `descarga_elemental`. Activa; 0 EN, 18 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.25. Aplica rayo; puede consumir una preparación elemental compatible.

### Sello glacial

ID: `sello_elemental`. Activa; 0 EN, 14 PM; CD 4 ciclos; objetivo enemigo, individual. Job 15; rango máximo 10.

Ataque con potencia ×1.05. Prepara afinidad durante 3 turnos para técnicas y pasivas compatibles. Aplica hielo; puede consumir una preparación elemental compatible.

### Resonancia elemental

ID: `resonancia_elemental`. Pasiva. Job 30; rango máximo 1.

Al completar una reacción elemental, resistes parcialmente el siguiente perjuicio durante dos turnos. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Tormenta elemental

ID: `tormenta_elemental`. Activa; 0 EN, 24 PM; CD 4 ciclos; objetivo enemigo, fila. Job 30; rango máximo 10.

Ataque con potencia ×1.9. Afecta a fila; el presupuesto se reparte entre sus objetivos. Consume afinidad para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico. Aplica fuego; puede consumir una preparación elemental compatible.

### Corazón elemental

ID: `corazon_elemental`. Pasiva. Job 40; rango máximo 1.

Al completar una reacción elemental, conservas un enlace residual para la siguiente técnica de tu clase de origen. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Templar elemento

ID: `elementalista_tecnica_adicional`. Activa; 0 EN, 10 PM; CD 4 ciclos; objetivo enemigo, individual. Job 20; rango máximo 1.

Prepara elemento durante 2 turnos para técnicas y pasivas compatibles.

## Brujo

Tier 2.

### Drenaje vital

ID: `drenaje_vital`. Activa; 0 EN, 14 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.1. Drena un 15 % del daño efectivo, con límite del 8 % de vida del lanzador. Adelanta y consume un pulso de daño pendiente.

### Maldición debilitante

ID: `maldicion_debilitante`. Activa; 0 EN, 18 PM; CD 4 ciclos; objetivo enemigo, individual. Job 15; rango máximo 10.

Ataque con potencia ×0.8. Herida: 14 % del ataque por pulso durante 2 turnos. Prepara maldicion durante 3 turnos para técnicas y pasivas compatibles.

### Pacto sombrío

ID: `pacto_sombrio`. Pasiva. Job 30; rango máximo 1.

Al aplicar o consumir una herida, obtienes protección equivalente al 3 % de tu vida máxima. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Peste maldita

ID: `peste_maldita`. Activa; 0 EN, 22 PM; CD 5 ciclos; objetivo enemigo, adyacentes. Job 30; rango máximo 10.

Ataque con potencia ×1.65. Afecta a adyacentes; el presupuesto se reparte entre sus objetivos. Consume maldicion para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico. Prepara maldicion durante 3 turnos para técnicas y pasivas compatibles.

### Eco maldito

ID: `eco_maldito`. Pasiva. Job 40; rango máximo 1.

Al eliminar una mejora enemiga, conservas un enlace residual para la siguiente técnica de tu clase de origen. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Romper maleficio

ID: `brujo_tecnica_adicional`. Activa; 0 EN, 10 PM; CD 4 ciclos; objetivo enemigo, individual. Job 20; rango máximo 1.

Adelanta y consume un pulso de daño pendiente. Consume hasta 2 cargas de maldicion si existen.

## Cruzado

Tier 2.5.

### Golpe cruzado

ID: `golpe_cruzado`. Activa; 40 EN, 8 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.2. Prepara consuelo durante 3 turnos para técnicas y pasivas compatibles.

### Voto protector

ID: `voto_protector`. Activa; 25 EN, 11 PM; CD 4 ciclos; objetivo aliado, individual. Job 15; rango máximo 10.

Cura un 16 % de vida máxima. Consume consuelo para recuperar un 4 % de vida del lanzador; sin ella conserva su efecto básico.

### Juicio sagrado

ID: `juicio_sagrado`. Activa; 30 EN, 11 PM; CD 4 ciclos; objetivo enemigo, individual. Job 25; rango máximo 10.

Ataque con potencia ×1.4. Consume custodia para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico. Retira una mejora del rival.

### Fe inquebrantable

ID: `fe_inquebrantable`. Pasiva. Job 35; rango máximo 1.

Al conceder protección, recuperas hasta el 2 % de tu vida máxima. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Aura cruzada

ID: `aura_cruzada`. Pasiva. Job 45; rango máximo 1.

Al recuperar vida real de un aliado, resistes parcialmente el siguiente perjuicio durante dos turnos. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Reconciliación

ID: `cruzado_tecnica_adicional`. Activa; 25 EN, 3 PM; CD 4 ciclos; objetivo aliado, individual. Job 20; rango máximo 1.

Consume guardia y convierte parte de su presupuesto pendiente.

## Pirata

Tier 2.5.

### Abordaje feroz

ID: `abordaje_feroz`. Activa; 40 EN, 0 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.1. Prepara treta durante 3 turnos para técnicas y pasivas compatibles.

### Bomba de humo

ID: `bomba_humo`. Activa; 35 EN, 0 PM; CD 4 ciclos; objetivo propio, individual. Job 20; rango máximo 10.

Te desplazas a retaguardia. Protección del 8 % de vida del lanzador durante 2 turnos. Prepara treta durante 3 turnos para técnicas y pasivas compatibles.

### Saqueo audaz

ID: `saqueo_audaz`. Activa; 45 EN, 0 PM; CD 4 ciclos; objetivo enemigo, individual. Job 40; rango máximo 10.

Ataque con potencia ×1.1. Retira una guardia rival y conserva un 50 % durante un máximo de dos turnos. Consume treta para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico.

### Instinto del mar

ID: `instinto_del_mar`. Pasiva. Job 25; rango máximo 1.

Al usar una técnica de movilidad, eliminas una herida propia. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Botín pirata

ID: `botin_pirata`. Pasiva. Job 45; rango máximo 1.

Al eliminar una mejora enemiga, recuperas hasta el 25 % de la energía pagada, con límite compartido de 10 EN por ciclo. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Botín de combate

ID: `pirata_tecnica_adicional`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo enemigo, individual. Job 20; rango máximo 1.

Retira una guardia rival y conserva un 50 % durante un máximo de dos turnos.

## Druida

Tier 2.5.

### Zarzas vivas

ID: `zarzas_vivas`. Activa; 0 EN, 16 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×0.9. Herida: 14 % del ataque por pulso durante 2 turnos. Prepara crecimiento durante 3 turnos para técnicas y pasivas compatibles. Aplica naturaleza; puede consumir una preparación elemental compatible.

### Piel de corteza

ID: `piel_corteza`. Activa; 0 EN, 14 PM; CD 4 ciclos; objetivo aliado, individual. Job 20; rango máximo 10.

Protección del 11 % de vida del lanzador durante 2 turnos. Prepara crecimiento durante 3 turnos para técnicas y pasivas compatibles.

### Lluvia de estrellas

ID: `lluvia_estrellas`. Activa; 0 EN, 22 PM; CD 4 ciclos; objetivo aliado, fila. Job 40; rango máximo 10.

Cura un 23 % de vida máxima. Afecta a fila; el presupuesto se reparte entre sus objetivos. Consume crecimiento para recuperar un 4 % de vida del lanzador; sin ella conserva su efecto básico.

### Vínculo simbiótico

ID: `simbiotico`. Pasiva. Job 25; rango máximo 1.

Al usar una regeneración, conservas un enlace residual para la siguiente técnica de tu clase de origen. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Raíces místicas

ID: `raices_misticas`. Pasiva. Job 45; rango máximo 1.

Al completar una reacción elemental, preparas dos pulsos de cura del 1 % de tu vida máxima cada uno. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Trasplantar

ID: `druida_tecnica_adicional`. Activa; 25 EN, 3 PM; CD 4 ciclos; objetivo aliado, individual. Job 20; rango máximo 1.

Transfiere un 50 % de tu regeneración a un aliado, conservando su duración. Sobre ti convierte el 20 % en recuperación, sin duplicar presupuesto. Prepara semilla durante 2 turnos para técnicas y pasivas compatibles. Adelanta y consume un pulso de cura pendiente.

## Espadachín rúnico

Tier 2.5.

### Corte rúnico

ID: `corte_runa`. Activa; 30 EN, 9 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.2. Consume runa para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico. Prepara runa durante 3 turnos para técnicas y pasivas compatibles.

### Marca arcana

ID: `marca_arcana`. Activa; 25 EN, 11 PM; CD 4 ciclos; objetivo enemigo, individual. Job 20; rango máximo 10.

Ataque con potencia ×1.05. Prepara runa hostil durante 3 turnos para técnicas y pasivas compatibles. Prepara runa durante 3 turnos para técnicas y pasivas compatibles.

### Paso rúnico

ID: `paso_runique`. Activa; 25 EN, 9 PM; CD 4 ciclos; objetivo propio, individual. Job 40; rango máximo 10.

Te desplazas a fila central. Protección del 9 % de vida del lanzador durante 2 turnos. Prepara runa durante 3 turnos para técnicas y pasivas compatibles.

### Runas grabadas

ID: `runas_grabadas`. Pasiva. Job 25; rango máximo 1.

Al consumir una preparación, conservas un enlace residual para la siguiente técnica de tu clase de origen. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Filo imbuido

ID: `filo_imbuido`. Pasiva. Job 45; rango máximo 1.

Al alternar una técnica ofensiva y una de apoyo, expones un 5 % de defensa enemiga para un impacto. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Borrar la runa

ID: `espadachin_runico_tecnica_adicional`. Activa; 25 EN, 3 PM; CD 4 ciclos; objetivo propio, individual. Job 20; rango máximo 1.

Consume hasta 2 cargas de runa si existen. Te desplazas a fila central. Resiste un 15 % de la potencia del siguiente perjuicio, durante 2 turnos.

## Paladín

Tier 3.

### Martillo sagrado

ID: `martillo_sagrado`. Activa; 35 EN, 9 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.25. Prepara voto durante 3 turnos para técnicas y pasivas compatibles.

### Escudo redentor

ID: `escudo_redentor`. Activa; 25 EN, 13 PM; CD 4 ciclos; objetivo aliado, individual. Job 25; rango máximo 10.

Cura un 17 % de vida máxima. Consume voto para recuperar un 4 % de vida del lanzador; sin ella conserva su efecto básico.

### Sentencia luminosa

ID: `sentencia_luminosa`. Activa; 45 EN, 15 PM; CD 5 ciclos; objetivo enemigo, individual. Job 45; rango máximo 10.

Ataque con potencia ×1.35. Prepara agravio durante 3 turnos para técnicas y pasivas compatibles. Protección del 4 % de vida del lanzador durante 2 turnos.

### Juramento del Paladín

ID: `juramento_paladin`. Pasiva. Job 30; rango máximo 1.

Al recuperar vida real de un aliado, conservas un enlace residual para la siguiente técnica de tu clase de origen. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Corazón puro

ID: `corazon_puro`. Pasiva. Job 55; rango máximo 1.

Al limpiar un perjuicio, resistes parcialmente el siguiente perjuicio durante dos turnos. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Renovar el voto

ID: `paladin_tecnica_adicional`. Activa; 25 EN, 3 PM; CD 4 ciclos; objetivo aliado, individual. Job 20; rango máximo 1.

Protección del 8 % de vida del lanzador durante 2 turnos. Prepara custodia durante 3 turnos para técnicas y pasivas compatibles. Resiste un 15 % de la potencia del siguiente perjuicio, durante 2 turnos.

## Guardián real

Tier 3.

### Orden inquebrantable

ID: `orden_inquebrantable`. Activa; 45 EN, 0 PM; CD 5 ciclos; objetivo aliado, individual. Job 1; rango máximo 10.

Protección del 18 % de vida del lanzador durante 2 turnos. Prepara custodia durante 3 turnos para técnicas y pasivas compatibles.

### Contraataque real

ID: `contraataque_real`. Activa; 45 EN, 0 PM; CD 4 ciclos; objetivo enemigo, individual. Job 25; rango máximo 10.

Ataque con potencia ×1.3. Consume custodia para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico.

### Muralla viviente

ID: `muralla_viviente`. Activa; 60 EN, 0 PM; CD 5 ciclos; objetivo aliado, fila. Job 45; rango máximo 10.

Afecta a fila; el presupuesto se reparte entre sus objetivos. Protección del 24 % de vida del lanzador durante 2 turnos. Prepara custodia durante 3 turnos para técnicas y pasivas compatibles.

### Sangre real

ID: `sangre_real`. Pasiva. Job 30; rango máximo 1.

Al conceder protección, acortas en un pulso una herida propia sin sufrirlo. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Placas impenetrables

ID: `placas_impenetrables`. Pasiva. Job 55; rango máximo 1.

Al apoyar a un aliado de tu misma fila, obtienes protección equivalente al 3 % de tu vida máxima. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Evacuación

ID: `guardian_real_tecnica_adicional`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo aliado, individual. Job 20; rango máximo 1.

Protección del 8 % de vida del lanzador durante 2 turnos. Prepara custodia durante 3 turnos para técnicas y pasivas compatibles. Te desplazas a fila central.

## Asesino

Tier 3.

### Golpe silencioso

ID: `golpe_silencioso`. Activa; 35 EN, 0 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.25. Prepara exposicion durante 3 turnos para técnicas y pasivas compatibles.

### Veneno oculto

ID: `veneno_oculto`. Activa; 40 EN, 0 PM; CD 4 ciclos; objetivo enemigo, individual. Job 25; rango máximo 10.

Ataque con potencia ×0.9. Herida: 14 % del ataque por pulso durante 2 turnos. Prepara ejecucion durante 3 turnos para técnicas y pasivas compatibles.

### Ejecución

ID: `ejecucion`. Activa; 50 EN, 0 PM; CD 5 ciclos; objetivo enemigo, individual. Job 45; rango máximo 10.

Ataque con potencia ×1.75. Consume ejecucion para aumentar hasta 15 % el daño; sin ella conserva su efecto básico.

### Paso sin ruido

ID: `paso_sin_ruido`. Pasiva. Job 30; rango máximo 1.

Al usar una técnica de movilidad, resistes parcialmente el siguiente perjuicio durante dos turnos. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Anatomía precisa

ID: `anatomia_precisa`. Pasiva. Job 55; rango máximo 1.

Al actuar sobre un objetivo por debajo del 50 % de vida, expones un 5 % de defensa enemiga para un impacto. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Cortar la retirada

ID: `asesino_tecnica_adicional`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo enemigo, individual. Job 20; rango máximo 1.

Consume hasta 2 cargas de exposicion si existen. Debilita una preparación enemiga; no hace perder su turno.

## Maestro de espadas

Tier 3.

### Combo maestro

ID: `combo_maestro`. Activa; 30 EN, 0 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.25. Prepara forma durante 3 turnos para técnicas y pasivas compatibles.

### Guardia perfecta

ID: `guardia_perfecta`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo propio, individual. Job 25; rango máximo 10.

Protección del 12 % de vida del lanzador durante 2 turnos. Prepara forma defensiva durante 3 turnos para técnicas y pasivas compatibles.

### Corte dimensional

ID: `corte_dimension`. Activa; 45 EN, 0 PM; CD 5 ciclos; objetivo enemigo, individual. Job 45; rango máximo 10.

Ataque con potencia ×1.75. Consume forma para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico. Consume forma defensiva para aumentar hasta 15 % el daño; sin ella conserva su efecto básico.

### Filo perfecto

ID: `filo_perfecto`. Pasiva. Job 30; rango máximo 1.

Al alternar una técnica ofensiva y una de apoyo, resistes parcialmente el siguiente perjuicio durante dos turnos. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Ritmo de combate

ID: `ritmo_de_combate`. Pasiva. Job 55; rango máximo 1.

Al preparar una técnica, conservas un enlace residual para la siguiente técnica de tu clase de origen. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Recomponer la forma

ID: `maestro_espadas_tecnica_adicional`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo propio, individual. Job 20; rango máximo 1.

Retira un efecto de exposicion del lanzador. Prepara forma defensiva durante 2 turnos para técnicas y pasivas compatibles.

## Oráculo

Tier 3.

### Destello profético

ID: `destello_profetico`. Activa; 0 EN, 16 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1. Prepara augurio durante 3 turnos para técnicas y pasivas compatibles. Prepara observacion durante 3 turnos para técnicas y pasivas compatibles.

### Presagio sanador

ID: `presagio_sanador`. Activa; 0 EN, 22 PM; CD 5 ciclos; objetivo aliado, individual. Job 25; rango máximo 10.

Cura un 7.5 % por turno durante tres turnos. Prepara augurio durante 3 turnos para técnicas y pasivas compatibles.

### Visión abrumadora

ID: `vision_abrumadora`. Activa; 0 EN, 24 PM; CD 5 ciclos; objetivo enemigo, individual. Job 45; rango máximo 10.

Ataque con potencia ×1.4. Consume augurio para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico. Debilita una preparación enemiga; no hace perder su turno.

### Vista interior

ID: `vista_interior`. Pasiva. Job 30; rango máximo 1.

Al preparar una técnica, acortas en un pulso una herida propia sin sufrirlo. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Augurio favorable

ID: `augurio_favorable`. Pasiva. Job 55; rango máximo 1.

Al actuar sobre un objetivo por debajo del 50 % de vida, preparas dos pulsos de cura del 1 % de tu vida máxima cada uno. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Revisar el augurio

ID: `oraculo_tecnica_adicional`. Activa; 0 EN, 10 PM; CD 4 ciclos; objetivo propio, individual. Job 20; rango máximo 1.

Consume hasta 2 cargas de augurio si existen. Resiste un 15 % de la potencia del siguiente perjuicio, durante 2 turnos.

## Hierofante

Tier 3.

### Martillo ritual

ID: `martillo_ritual`. Activa; 0 EN, 16 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.15. Prepara verso durante 3 turnos para técnicas y pasivas compatibles.

### Barrera ritual

ID: `barrera_ritual`. Activa; 0 EN, 18 PM; CD 5 ciclos; objetivo aliado, individual. Job 25; rango máximo 10.

Cura un 6.5 % por turno durante tres turnos. Prepara ritual durante 3 turnos para técnicas y pasivas compatibles.

### Juicio del hierofante

ID: `juicio_del_hierofante`. Activa; 0 EN, 24 PM; CD 5 ciclos; objetivo aliado, fila. Job 45; rango máximo 10.

Cura un 24 % de vida máxima. Afecta a fila; el presupuesto se reparte entre sus objetivos. Consume verso para recuperar un 4 % de vida del lanzador; sin ella conserva su efecto básico.

### Ritual perenne

ID: `ritual_perenne`. Pasiva. Job 30; rango máximo 1.

Al usar una regeneración, resistes parcialmente el siguiente perjuicio durante dos turnos. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Reserva sagrada

ID: `reserva_sagrada`. Pasiva. Job 55; rango máximo 1.

Al usar una técnica de apoyo, recuperas hasta el 25 % del maná pagado, con límite compartido de 5 PM por ciclo. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Clausura piadosa

ID: `hierofante_tecnica_adicional`. Activa; 0 EN, 10 PM; CD 4 ciclos; objetivo aliado, individual. Job 20; rango máximo 1.

Consume campo y convierte parte de su presupuesto pendiente. Adelanta y consume un pulso de cura pendiente.

## Asceta

Tier 3.

### Palma vacía

ID: `palma_vacia`. Activa; 35 EN, 0 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.15. Consume vacio para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico. Prepara vacio durante 3 turnos para técnicas y pasivas compatibles.

### Respiración del vacío

ID: `respiracion_del_vacio`. Activa; 0 EN, 0 PM; CD 6 ciclos; objetivo propio, individual. Job 25; rango máximo 10.

Recupera 35 de energia. Prepara vacio durante 3 turnos para técnicas y pasivas compatibles.

### Mil pasos

ID: `mil_pasos`. Activa; 55 EN, 0 PM; CD 4 ciclos; objetivo propio, individual. Job 45; rango máximo 10.

Te desplazas a retaguardia. Consume vacio para proteger al lanzador un 4 % de su vida; sin ella conserva su efecto básico.

### Cuerpo templado

ID: `cuerpo_templado`. Pasiva. Job 30; rango máximo 1.

Al usar una técnica con menos del 30 % de energía, resistes parcialmente el siguiente perjuicio durante dos turnos. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Flujo constante

ID: `flujo_constante`. Pasiva. Job 55; rango máximo 1.

Al consumir una preparación, recuperas hasta el 25 % de la energía pagada, con límite compartido de 10 EN por ciclo. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Paso vacío

ID: `asceta_tecnica_adicional`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo propio, individual. Job 20; rango máximo 1.

Te desplazas a retaguardia. Retira un efecto de exposicion del lanzador.

## Gran maestro

Tier 3.

### Puño del maestro

ID: `puño_del_maestro`. Activa; 25 EN, 0 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.25. Prepara forma durante 3 turnos para técnicas y pasivas compatibles.

### Forma inmutable

ID: `forma_inmutable`. Activa; 40 EN, 0 PM; CD 4 ciclos; objetivo propio, individual. Job 25; rango máximo 10.

Protección del 10 % de vida del lanzador durante 2 turnos. Prepara forma durante 3 turnos para técnicas y pasivas compatibles.

### Impacto celestial

ID: `impacto_celestial`. Activa; 45 EN, 0 PM; CD 5 ciclos; objetivo enemigo, individual. Job 45; rango máximo 10.

Ataque con potencia ×1.75. Consume forma para aumentar hasta 15 % el daño; sin ella conserva su efecto básico.

### Disciplina absoluta

ID: `disciplina_absoluta`. Pasiva. Job 30; rango máximo 1.

Al alternar una técnica ofensiva y una de apoyo, obtienes protección equivalente al 3 % de tu vida máxima. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Respiración maestra

ID: `respiracion_maestra`. Pasiva. Job 55; rango máximo 1.

Al preparar una técnica, recuperas hasta el 25 % de la energía pagada, con límite compartido de 10 EN por ciclo. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Deshacer la forma

ID: `gran_maestro_tecnica_adicional`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo propio, individual. Job 20; rango máximo 1.

Consume hasta 2 cargas de forma si existen. Protección del 4 % de vida del lanzador durante 1 turnos.

## Francotirador

Tier 3.

### Tiro al corazón

ID: `tiro_al_corazon`. Activa; 45 EN, 0 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.45. Consume mira para aumentar hasta 15 % el daño; sin ella conserva su efecto básico. Prepara mira durante 3 turnos para técnicas y pasivas compatibles.

### Perforación total

ID: `perforacion_total`. Activa; 50 EN, 0 PM; CD 4 ciclos; objetivo enemigo, columna. Job 25; rango máximo 10.

Ataque con potencia ×2. Afecta a columna; el presupuesto se reparte entre sus objetivos. Prepara mira durante 3 turnos para técnicas y pasivas compatibles.

### Disparo letal

ID: `disparo_letal`. Activa; 50 EN, 0 PM; CD 5 ciclos; objetivo enemigo, individual. Job 45; rango máximo 10.

Ataque con potencia ×1.8. Consume mira para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico.

### Ojo de águila

ID: `ojo_de_aguila`. Pasiva. Job 30; rango máximo 1.

Al actuar sobre un objetivo marcado por ti, conservas un enlace residual para la siguiente técnica de tu clase de origen. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Pulso estable

ID: `pulso_estable`. Pasiva. Job 55; rango máximo 1.

Al preparar una técnica, obtienes protección equivalente al 3 % de tu vida máxima. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Abandonar la mira

ID: `francotirador_tecnica_adicional`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo propio, individual. Job 20; rango máximo 1.

Consume hasta 2 cargas de mira si existen. Te desplazas a retaguardia. Protección del 4 % de vida del lanzador durante 1 turnos.

## Domabestias

Tier 3.

### Llamada salvaje

ID: `llamada_salvaje`. Activa; 40 EN, 0 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×0.7. Prepara un acompañante de tres órdenes y hasta seis ciclos; reemplaza el anterior y no tiene turno independiente.

### Trampa de raíces

ID: `trampa_de_raices`. Activa; 45 EN, 0 PM; CD 4 ciclos; objetivo enemigo, individual. Job 25; rango máximo 10.

Ataque con potencia ×0.9. Prepara trampa durante 3 turnos para técnicas y pasivas compatibles. Retira una mejora del rival.

### Cacería en manada

ID: `caceria_en_manada`. Activa; 45 EN, 0 PM; CD 5 ciclos; objetivo enemigo, individual. Job 45; rango máximo 10.

Ataque con potencia ×1.05. Resuelve una orden del acompañante; máximo una por ciclo.

### Vínculo bestial

ID: `vinculo_bestial`. Pasiva. Job 30; rango máximo 1.

Al invocar un acompañante, preparas dos pulsos de cura del 1 % de tu vida máxima cada uno. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Sentidos agudos

ID: `sentidos_agudos`. Pasiva. Job 55; rango máximo 1.

Al dar una orden al acompañante, preparas 5 puntos de precisión para un impacto. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Llamada de refugio

ID: `domabestias_tecnica_adicional`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo aliado, individual. Job 20; rango máximo 1.

Resuelve una orden del acompañante; máximo una por ciclo.

## Guardián del bosque

Tier 3.

### Raíces guardianas

ID: `raices_guardianas`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo aliado, fila. Job 1; rango máximo 10.

Afecta a fila; el presupuesto se reparte entre sus objetivos. Protección del 24 % de vida del lanzador durante 2 turnos. Prepara territorio durante 3 turnos para técnicas y pasivas compatibles.

### Flecha verde

ID: `flecha_verde`. Activa; 0 EN, 14 PM; CD 3 ciclos; objetivo enemigo, individual. Job 25; rango máximo 10.

Ataque con potencia ×1.25. Consume territorio para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico. Aplica naturaleza; puede consumir una preparación elemental compatible.

### Refugio del bosque

ID: `refugio_del_bosque`. Activa; 25 EN, 13 PM; CD 5 ciclos; objetivo aliado, fila. Job 45; rango máximo 10.

Cura un 7.5 % por turno durante tres turnos. Afecta a fila; el presupuesto se reparte entre sus objetivos.

### Piel de roble

ID: `piel_de_roble`. Pasiva. Job 30; rango máximo 1.

Al conceder protección, resistes parcialmente el siguiente perjuicio durante dos turnos. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Viaje silvestre

ID: `viaje_silvestre`. Pasiva. Job 55; rango máximo 1.

Al usar una técnica de movilidad, obtienes protección equivalente al 3 % de tu vida máxima. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Sendero protegido

ID: `guardian_bosque_tecnica_adicional`. Activa; 25 EN, 3 PM; CD 4 ciclos; objetivo aliado, individual. Job 20; rango máximo 1.

Transfiere un 50 % de tu protección a un aliado, conservando su duración. Sobre ti convierte el 20 % en recuperación, sin duplicar presupuesto. Resiste un 15 % de la potencia del siguiente perjuicio, durante 2 turnos.

## Rastreador

Tier 3.

### Marcar objetivo

ID: `marcar_objetivo`. Activa; 35 EN, 0 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.05. Prepara observacion durante 3 turnos para técnicas y pasivas compatibles.

### Flecha perseguidora

ID: `flecha_perseguidora`. Activa; 35 EN, 0 PM; CD 3 ciclos; objetivo enemigo, individual. Job 25; rango máximo 10.

Ataque con potencia ×1.25. Consume observacion para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico. Prepara presa durante 3 turnos para técnicas y pasivas compatibles.

### Emboscada final

ID: `emboscada_final`. Activa; 45 EN, 0 PM; CD 5 ciclos; objetivo enemigo, individual. Job 45; rango máximo 10.

Ataque con potencia ×1.55. Consume observacion para aumentar hasta 15 % el daño; sin ella conserva su efecto básico. Prepara observacion durante 3 turnos para técnicas y pasivas compatibles.

### Rastreo experto

ID: `rastreo_experto`. Pasiva. Job 30; rango máximo 1.

Al cambiar de destinatario respecto a la técnica anterior, conservas un enlace residual para la siguiente técnica de tu clase de origen. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Paso del cazador

ID: `paso_del_cazador`. Pasiva. Job 55; rango máximo 1.

Al actuar sobre un objetivo marcado por ti, obtienes protección equivalente al 3 % de tu vida máxima. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Invalidar el rastro

ID: `rastreador_tecnica_adicional`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo enemigo, individual. Job 20; rango máximo 1.

Consume hasta 2 cargas de observacion si existen. Debilita una preparación enemiga; no hace perder su turno.

## Archimago

Tier 3.

### Lanza arcana

ID: `lanza_arcana`. Activa; 0 EN, 10 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.3. Consume compresion para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico. Prepara compresion durante 3 turnos para técnicas y pasivas compatibles.

### Explosión elemental

ID: `explosion_elemental`. Activa; 0 EN, 22 PM; CD 4 ciclos; objetivo enemigo, fila. Job 25; rango máximo 10.

Ataque con potencia ×2. Afecta a fila; el presupuesto se reparte entre sus objetivos. Consume compresion para aumentar hasta 15 % el daño; sin ella conserva su efecto básico.

### Cataclismo

ID: `cataclismo`. Activa; 0 EN, 30 PM; CD 5 ciclos; objetivo enemigo, fila. Job 45; rango máximo 10.

Ataque con potencia ×2.3. Afecta a fila; el presupuesto se reparte entre sus objetivos. Consume compresion para aumentar hasta 15 % el daño; sin ella conserva su efecto básico. Expone un 10 % de defensa para un impacto, durante 2 turnos.

### Núcleo arcano

ID: `nucleo_arcano`. Pasiva. Job 30; rango máximo 1.

Sacrifica el 10 % de maná máximo estable para convertirlo en inteligencia, limitada al 20 % de tu inteligencia previa y a 12 puntos. No realimenta maná.

### Recuperación profunda

ID: `reserva_infinita`. Pasiva. Job 55; rango máximo 1.

Al preparar una técnica, recuperas hasta el 25 % del maná pagado, con límite compartido de 5 PM por ciclo. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Descompresión

ID: `archimago_tecnica_adicional`. Activa; 0 EN, 10 PM; CD 4 ciclos; objetivo propio, individual. Job 20; rango máximo 1.

Consume hasta 2 cargas de compresion si existen. Retira un efecto de exposicion del lanzador. Prepara estabilidad arcana durante 2 turnos para técnicas y pasivas compatibles.

## Invocador

Tier 3.

### Esfera invocada

ID: `esfera_invocada`. Activa; 0 EN, 16 PM; CD 5 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×0.7. Prepara un acompañante de tres órdenes y hasta seis ciclos; reemplaza el anterior y no tiene turno independiente.

### Sellos paralelos

ID: `sellos_paralelos`. Activa; 0 EN, 10 PM; CD 2 ciclos; objetivo enemigo, individual. Job 25; rango máximo 10.

Ataque con potencia ×0.65. Resuelve una orden del acompañante; máximo una por ciclo.

### Convergencia

ID: `convergencia`. Activa; 0 EN, 26 PM; CD 5 ciclos; objetivo enemigo, fila. Job 45; rango máximo 10.

Ataque con potencia ×1.3. Afecta a fila; el presupuesto se reparte entre sus objetivos. Consume acompanante y convierte parte de su presupuesto pendiente.

### Familiar arcano

ID: `familiar_arcano`. Pasiva. Job 30; rango máximo 1.

Al invocar un acompañante, recuperas hasta el 25 % del maná pagado, con límite compartido de 5 PM por ciclo. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Vínculo elemental

ID: `vinculo_elemental`. Pasiva. Job 55; rango máximo 1.

Al dar una orden al acompañante, conservas un enlace residual para la siguiente técnica de tu clase de origen. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Disolver familiar

ID: `invocador_tecnica_adicional`. Activa; 0 EN, 10 PM; CD 4 ciclos; objetivo propio, individual. Job 20; rango máximo 1.

Consume acompanante y convierte parte de su presupuesto pendiente.

## Nigromante

Tier 3.

### Toque fúnebre

ID: `toque_funebre`. Activa; 0 EN, 18 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.15. Drena un 18 % del daño efectivo, con límite del 8 % de vida del lanzador. Prepara fragmento durante 3 turnos para técnicas y pasivas compatibles. Adelanta y consume un pulso de daño pendiente. Resuelve una orden del acompañante; máximo una por ciclo.

### Plaga oscura

ID: `plaga_oscura`. Activa; 0 EN, 20 PM; CD 4 ciclos; objetivo enemigo, individual. Job 25; rango máximo 10.

Ataque con potencia ×0.9. Herida: 18 % del ataque por pulso durante 2 turnos. Prepara fragmento durante 3 turnos para técnicas y pasivas compatibles.

### Ejército de sombras

ID: `ejercito_de_sombras`. Activa; 0 EN, 28 PM; CD 5 ciclos; objetivo enemigo, individual. Job 45; rango máximo 10.

Ataque con potencia ×0.8. Consume fragmento para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico. Prepara un acompañante de tres órdenes y hasta seis ciclos; reemplaza el anterior y no tiene turno independiente.

### Manto fúnebre

ID: `manto_funebre`. Pasiva. Job 30; rango máximo 1.

Al aplicar o consumir una herida, acortas en un pulso una herida propia sin sufrirlo. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Alma persistente

ID: `alma_persistente`. Pasiva. Job 55; rango máximo 1.

Al sacrificar un efecto propio, obtienes protección equivalente al 3 % de tu vida máxima. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Descanso prestado

ID: `nigromante_tecnica_adicional`. Activa; 0 EN, 10 PM; CD 4 ciclos; objetivo enemigo, individual. Job 20; rango máximo 1.

Consume herida y convierte parte de su presupuesto pendiente.

## Demonólogo

Tier 3.

### Cadena infernal

ID: `cadena_infernal`. Activa; 0 EN, 18 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.1. Prepara contrato durante 3 turnos para técnicas y pasivas compatibles.

### Pacto de sangre

ID: `pacto_de_sangre`. Activa; 0 EN, 20 PM; CD 4 ciclos; objetivo propio, individual. Job 25; rango máximo 10.

Compromete 8 % de vida sin poder matarte; no cuenta como daño enemigo. Prepara contrato durante 3 turnos para técnicas y pasivas compatibles.

### Abismo

ID: `abismo`. Activa; 0 EN, 30 PM; CD 5 ciclos; objetivo enemigo, fila. Job 45; rango máximo 10.

Ataque con potencia ×1.9. Afecta a fila; el presupuesto se reparte entre sus objetivos. Consume pacto y convierte parte de su presupuesto pendiente. Consume contrato para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico.

### Pacto menor

ID: `pacto_menor`. Pasiva. Job 30; rango máximo 1.

Al comprometer vida en un pacto, recuperas hasta el 25 % del maná pagado, con límite compartido de 5 PM por ciclo. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Corazón infernal

ID: `corazon_infernal`. Pasiva. Job 55; rango máximo 1.

Al recuperar vida real de un aliado, eliminas una herida propia. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Revocar contrato

ID: `demonologo_tecnica_adicional`. Activa; 0 EN, 10 PM; CD 4 ciclos; objetivo propio, individual. Job 20; rango máximo 1.

Retira un efecto de pacto del lanzador. Protección del 4 % de vida del lanzador durante 1 turnos.

## Berserker

Tier 2.

### Hachazo sangrante

ID: `berserker_ataque`. Activa; 35 EN, 0 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1. Herida: 14 % del ataque por pulso durante 2 turnos. Prepara furia durante 3 turnos para técnicas y pasivas compatibles.

### Furia desatada

ID: `berserker_tactica`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo propio, individual. Job 15; rango máximo 10.

Prepara furia durante 3 turnos para técnicas y pasivas compatibles. Expone un 10 % de defensa para un impacto, durante 2 turnos.

### Corazón indómito

ID: `berserker_pasiva`. Pasiva. Job 25; rango máximo 1.

Al aplicar o consumir una herida, resistes parcialmente el siguiente perjuicio durante dos turnos. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Hacha desbocada

ID: `berserker_avanzada`. Activa; 55 EN, 0 PM; CD 5 ciclos; objetivo enemigo, fila. Job 30; rango máximo 10.

Ataque con potencia ×1.9. Afecta a fila; el presupuesto se reparte entre sus objetivos. Consume furia para aumentar hasta 15 % el daño; sin ella conserva su efecto básico.

### Maestría de riesgo

ID: `berserker_maestria`. Pasiva. Job 40; rango máximo 1.

Al sacrificar un efecto propio, acortas en un pulso una herida propia sin sufrirlo. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Frenar la furia

ID: `berserker_tecnica_adicional`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo propio, individual. Job 20; rango máximo 1.

Consume hasta 2 cargas de furia si existen. Retira un efecto de herida del lanzador. Protección del 4 % de vida del lanzador durante 1 turnos.

## Luchador

Tier 2.

### Puño firme

ID: `luchador_ataque`. Activa; 35 EN, 0 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.15. Prepara contacto durante 3 turnos para técnicas y pasivas compatibles.

### Guardia del luchador

ID: `luchador_tactica`. Activa; 25 EN, 0 PM; CD 4 ciclos; objetivo propio, individual. Job 15; rango máximo 10.

Protección del 10 % de vida del lanzador durante 2 turnos. Prepara contacto durante 3 turnos para técnicas y pasivas compatibles.

### Fondo físico

ID: `luchador_pasiva`. Pasiva. Job 25; rango máximo 1.

Al usar una técnica con menos del 30 % de energía, obtienes protección equivalente al 3 % de tu vida máxima. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Golpe al centro

ID: `luchador_avanzada`. Activa; 45 EN, 0 PM; CD 5 ciclos; objetivo enemigo, individual. Job 30; rango máximo 10.

Ataque con potencia ×1.35. Consume contacto para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico. Debilita una preparación enemiga; no hace perder su turno.

### Maestría de contacto

ID: `luchador_maestria`. Pasiva. Job 40; rango máximo 1.

Al conceder protección, preparas 5 puntos de precisión para un impacto. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Soltar el agarre

ID: `luchador_tecnica_adicional`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo propio, individual. Job 20; rango máximo 1.

Consume hasta 2 cargas de contacto si existen. Retira un efecto de exposicion del lanzador. Resiste un 15 % de la potencia del siguiente perjuicio, durante 2 turnos.

## Centinela

Tier 2.

### Empuje de frontera

ID: `centinela_ataque`. Activa; 35 EN, 0 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.15. Prepara senal durante 3 turnos para técnicas y pasivas compatibles. Prepara vigilia durante 3 turnos para técnicas y pasivas compatibles.

### Cubrir la frontera

ID: `centinela_tactica`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo aliado, fila. Job 15; rango máximo 10.

Afecta a fila; el presupuesto se reparte entre sus objetivos. Protección del 21 % de vida del lanzador durante 2 turnos. Prepara vigilia durante 3 turnos para técnicas y pasivas compatibles.

### Vigilancia

ID: `centinela_pasiva`. Pasiva. Job 25; rango máximo 1.

Al actuar sobre un objetivo marcado por ti, acortas en un pulso una herida propia sin sufrirlo. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Barrido de frontera

ID: `centinela_avanzada`. Activa; 50 EN, 0 PM; CD 5 ciclos; objetivo enemigo, fila. Job 30; rango máximo 10.

Ataque con potencia ×1.7. Afecta a fila; el presupuesto se reparte entre sus objetivos. Consume vigilia para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico.

### Maestría de frontera

ID: `centinela_maestria`. Pasiva. Job 40; rango máximo 1.

Al cambiar de destinatario respecto a la técnica anterior, obtienes protección equivalente al 3 % de tu vida máxima. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Cambiar la vigilancia

ID: `centinela_tecnica_adicional`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo propio, individual. Job 20; rango máximo 1.

Protección del 8 % de vida del lanzador durante 2 turnos. Prepara custodia durante 3 turnos para técnicas y pasivas compatibles. Prepara vigilia durante 2 turnos para técnicas y pasivas compatibles.

## Escriba arcano

Tier 2.

### Sello debilitante

ID: `escriba_arcano_ataque`. Activa; 0 EN, 14 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1. Sello debilidad: reserva un 18 % del mejor ataque durante 3 turnos; se consume al cerrar un circuito.

### Glifo de concentración

ID: `escriba_arcano_tactica`. Activa; 0 EN, 12 PM; CD 4 ciclos; objetivo aliado, individual. Job 15; rango máximo 10.

Protección del 9 % de vida del lanzador durante 2 turnos. Prepara enlace de escritura durante 3 turnos para técnicas y pasivas compatibles.

### Lectura profunda

ID: `escriba_arcano_pasiva`. Pasiva. Job 25; rango máximo 1.

Al consumir una preparación, resistes parcialmente el siguiente perjuicio durante dos turnos. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Inscripción abrasiva

ID: `escriba_arcano_avanzada`. Activa; 0 EN, 18 PM; CD 5 ciclos; objetivo enemigo, individual. Job 30; rango máximo 10.

Ataque con potencia ×0.9. Herida: 14 % del ataque por pulso durante 2 turnos. Consume enlace de escritura para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico. Sello abrasion: reserva un 18 % del mejor ataque durante 3 turnos; se consume al cerrar un circuito.

### Maestría de escritura

ID: `escriba_arcano_maestria`. Pasiva. Job 40; rango máximo 1.

Al eliminar una mejora enemiga, preparas 5 puntos de precisión para un impacto. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Corrección marginal

ID: `escriba_arcano_tecnica_adicional`. Activa; 0 EN, 10 PM; CD 4 ciclos; objetivo propio, individual. Job 20; rango máximo 1.

Retira un efecto de sello del lanzador. Prepara enlace de escritura durante 2 turnos para técnicas y pasivas compatibles.

## Bardo

Tier 2.

### Nota discordante

ID: `bardo_ataque`. Activa; 0 EN, 14 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.05. Prepara nota durante 3 turnos para técnicas y pasivas compatibles.

### Compás de marcha

ID: `bardo_tactica`. Activa; 0 EN, 22 PM; CD 4 ciclos; objetivo aliado, fila. Job 15; rango máximo 10.

Afecta a fila; el presupuesto se reparte entre sus objetivos. Protección del 18 % de vida del lanzador durante 2 turnos. Prepara melodia durante 3 turnos para técnicas y pasivas compatibles.

### Respiración del cantor

ID: `bardo_pasiva`. Pasiva. Job 25; rango máximo 1.

Al usar una técnica de apoyo, recuperas hasta el 25 % de la energía pagada, con límite compartido de 10 EN por ciclo. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Balada reparadora

ID: `bardo_avanzada`. Activa; 0 EN, 28 PM; CD 5 ciclos; objetivo aliado, fila. Job 30; rango máximo 10.

Cura un 7.5 % por turno durante tres turnos. Afecta a fila; el presupuesto se reparte entre sus objetivos. Consume nota para recuperar un 4 % de vida del lanzador; sin ella conserva su efecto básico.

### Maestría de interpretación

ID: `bardo_maestria`. Pasiva. Job 40; rango máximo 1.

Al usar una regeneración, acortas en un pulso una herida propia sin sufrirlo. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Silencio entre versos

ID: `bardo_tecnica_adicional`. Activa; 0 EN, 10 PM; CD 4 ciclos; objetivo aliado, individual. Job 20; rango máximo 1.

Retira un efecto de campo del lanzador. Retira un efecto de exposicion del destinatario.

## Comerciante

Tier 2.

### Golpe de oportunidad

ID: `comerciante_ataque`. Activa; 30 EN, 0 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.05. Prepara suministro durante 3 turnos para técnicas y pasivas compatibles.

### Suministros de viaje

ID: `comerciante_tactica`. Activa; 35 EN, 0 PM; CD 4 ciclos; objetivo aliado, individual. Job 15; rango máximo 10.

Cura un 10 % de vida máxima. Prepara suministro durante 3 turnos para técnicas y pasivas compatibles.

### Preparación del mercader

ID: `comerciante_pasiva`. Pasiva. Job 25; rango máximo 1.

Al sobrar parte de una curación, obtienes protección equivalente al 3 % de tu vida máxima. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Distraer al bandido

ID: `comerciante_avanzada`. Activa; 40 EN, 0 PM; CD 5 ciclos; objetivo enemigo, individual. Job 30; rango máximo 10.

Ataque con potencia ×1. Consume suministro para proteger al lanzador un 4 % de su vida; sin ella conserva su efecto básico. Prepara distraccion durante 3 turnos para técnicas y pasivas compatibles.

### Maestría de intendencia

ID: `comerciante_maestria`. Pasiva. Job 40; rango máximo 1.

Al sobrar parte de una curación, recuperas hasta el 25 % de la energía pagada, con límite compartido de 10 EN por ciclo. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Reserva de emergencia

ID: `comerciante_tecnica_adicional`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo propio, individual. Job 20; rango máximo 1.

Consume hasta 2 cargas de suministro si existen. Protección del 4 % de vida del lanzador durante 1 turnos.

## Chamán

Tier 2.5.

### Hacha de tormenta

ID: `chaman_ataque`. Activa; 30 EN, 10 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.15. Prepara carga natural durante 3 turnos para técnicas y pasivas compatibles. Aplica rayo; puede consumir una preparación elemental compatible.

### Bendición tribal

ID: `chaman_tactica`. Activa; 30 EN, 14 PM; CD 4 ciclos; objetivo aliado, fila. Job 15; rango máximo 10.

Afecta a fila; el presupuesto se reparte entre sus objetivos. Protección del 20 % de vida del lanzador durante 2 turnos. Prepara totem durante 3 turnos para técnicas y pasivas compatibles.

### Vigor ancestral

ID: `chaman_pasiva`. Pasiva. Job 25; rango máximo 1.

Al completar una reacción elemental, obtienes protección equivalente al 3 % de tu vida máxima. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Maldición de cenizas

ID: `chaman_avanzada`. Activa; 40 EN, 18 PM; CD 5 ciclos; objetivo enemigo, fila. Job 30; rango máximo 10.

Ataque con potencia ×1.8. Afecta a fila; el presupuesto se reparte entre sus objetivos. Consume carga natural para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico. Aplica fuego; puede consumir una preparación elemental compatible.

### Maestría totémica

ID: `chaman_maestria`. Pasiva. Job 40; rango máximo 1.

Al sacrificar un efecto propio, resistes parcialmente el siguiente perjuicio durante dos turnos. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Desanclar tótem

ID: `chaman_tecnica_adicional`. Activa; 25 EN, 3 PM; CD 4 ciclos; objetivo propio, individual. Job 20; rango máximo 1.

Consume campo y convierte parte de su presupuesto pendiente. Te desplazas a retaguardia. Protección del 4 % de vida del lanzador durante 1 turnos.

## Inquisidor

Tier 2.5.

### Juicio penitente

ID: `inquisidor_ataque`. Activa; 0 EN, 16 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×0.95. Retira una mejora del rival. Prepara testimonio durante 3 turnos para técnicas y pasivas compatibles.

### Absolución

ID: `inquisidor_tactica`. Activa; 0 EN, 16 PM; CD 4 ciclos; objetivo aliado, individual. Job 15; rango máximo 10.

Cura un 12 % de vida máxima. Elimina un perjuicio del destinatario. Prepara testimonio durante 3 turnos para técnicas y pasivas compatibles.

### Voluntad inquisitorial

ID: `inquisidor_pasiva`. Pasiva. Job 25; rango máximo 1.

Al limpiar un perjuicio, acortas en un pulso una herida propia sin sufrirlo. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Sentencia del inquisidor

ID: `inquisidor_avanzada`. Activa; 0 EN, 22 PM; CD 5 ciclos; objetivo enemigo, individual. Job 30; rango máximo 10.

Ataque con potencia ×1.45. Consume testimonio para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico. Prepara sentencia durante 3 turnos para técnicas y pasivas compatibles.

### Maestría de examen

ID: `inquisidor_maestria`. Pasiva. Job 40; rango máximo 1.

Al eliminar una mejora enemiga, expones un 5 % de defensa enemiga para un impacto. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Archivar testimonio

ID: `inquisidor_tecnica_adicional`. Activa; 0 EN, 10 PM; CD 4 ciclos; objetivo aliado, individual. Job 20; rango máximo 1.

Consume hasta 2 cargas de testimonio si existen. Retira un efecto de exposicion del destinatario. Resiste un 15 % de la potencia del siguiente perjuicio, durante 2 turnos.

## Heraldo de guerra

Tier 2.5.

### Golpe de mando

ID: `heraldo_guerra_ataque`. Activa; 25 EN, 8 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.1. Prepara orden durante 3 turnos para técnicas y pasivas compatibles.

### Grito de avance

ID: `heraldo_guerra_tactica`. Activa; 35 EN, 16 PM; CD 5 ciclos; objetivo aliado, fila. Job 15; rango máximo 10.

Afecta a fila; el presupuesto se reparte entre sus objetivos. Protección del 21 % de vida del lanzador durante 2 turnos. Prepara orden durante 3 turnos para técnicas y pasivas compatibles.

### Autoridad

ID: `heraldo_guerra_pasiva`. Pasiva. Job 25; rango máximo 1.

Al cambiar de destinatario respecto a la técnica anterior, preparas 5 puntos de precisión para un impacto. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Sello de concentración

ID: `heraldo_guerra_avanzada`. Activa; 30 EN, 18 PM; CD 5 ciclos; objetivo aliado, fila. Job 30; rango máximo 10.

Afecta a fila; el presupuesto se reparte entre sus objetivos. Protección del 18 % de vida del lanzador durante 2 turnos. Prepara concentracion durante 3 turnos para técnicas y pasivas compatibles. Consume orden para proteger al lanzador un 4 % de su vida; sin ella conserva su efecto básico.

### Maestría de mando

ID: `heraldo_guerra_maestria`. Pasiva. Job 40; rango máximo 1.

Al alternar una técnica ofensiva y una de apoyo, recuperas hasta el 25 % del maná pagado, con límite compartido de 5 PM por ciclo. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Contraorden

ID: `heraldo_guerra_tecnica_adicional`. Activa; 25 EN, 3 PM; CD 4 ciclos; objetivo propio, individual. Job 20; rango máximo 1.

Consume hasta 2 cargas de orden si existen. Protección del 4 % de vida del lanzador durante 1 turnos.

## Ninja

Tier 2.5.

### Corte de sombra

ID: `ninja_ataque`. Activa; 35 EN, 4 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.1. Herida: 14 % del ataque por pulso durante 2 turnos. Prepara senuelo durante 3 turnos para técnicas y pasivas compatibles.

### Velo de humo

ID: `ninja_tactica`. Activa; 25 EN, 3 PM; CD 4 ciclos; objetivo propio, individual. Job 15; rango máximo 10.

Te desplazas a retaguardia. Protección del 8 % de vida del lanzador durante 2 turnos. Prepara senuelo durante 3 turnos para técnicas y pasivas compatibles.

### Paso silencioso

ID: `ninja_pasiva`. Pasiva. Job 25; rango máximo 1.

Al usar una técnica de movilidad, preparas 5 puntos de precisión para un impacto. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Arte de las brasas

ID: `ninja_avanzada`. Activa; 45 EN, 7 PM; CD 5 ciclos; objetivo enemigo, fila. Job 30; rango máximo 10.

Ataque con potencia ×1.8. Afecta a fila; el presupuesto se reparte entre sus objetivos. Consume senuelo para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico. Aplica fuego; puede consumir una preparación elemental compatible.

### Maestría del engaño

ID: `ninja_maestria`. Pasiva. Job 40; rango máximo 1.

Al consumir una preparación, acortas en un pulso una herida propia sin sufrirlo. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Recoger el señuelo

ID: `ninja_tecnica_adicional`. Activa; 25 EN, 3 PM; CD 4 ciclos; objetivo propio, individual. Job 20; rango máximo 1.

Consume hasta 2 cargas de senuelo si existen. Retira un efecto de marca del lanzador. Te desplazas a retaguardia.

## Alquimista

Tier 2.5.

### Preparado corrosivo

ID: `alquimista_ataque`. Activa; 0 EN, 16 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×0.95. Prepara reactivo durante 3 turnos para técnicas y pasivas compatibles.

### Elixir revitalizante

ID: `alquimista_tactica`. Activa; 0 EN, 18 PM; CD 4 ciclos; objetivo aliado, individual. Job 15; rango máximo 10.

Cura un 13 % de vida máxima. Elimina un perjuicio del destinatario.

### Dosificación

ID: `alquimista_pasiva`. Pasiva. Job 25; rango máximo 1.

Al sobrar parte de una curación, conservas un enlace residual para la siguiente técnica de tu clase de origen. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Reactivo volátil

ID: `alquimista_avanzada`. Activa; 0 EN, 30 PM; CD 5 ciclos; objetivo enemigo, fila. Job 30; rango máximo 10.

Ataque con potencia ×1.8. Afecta a fila; el presupuesto se reparte entre sus objetivos. Consume reactivo para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico. Retira una mejora del rival.

### Maestría de neutralización

ID: `alquimista_maestria`. Pasiva. Job 40; rango máximo 1.

Al limpiar un perjuicio, preparas dos pulsos de cura del 1 % de tu vida máxima cada uno. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Neutralización

ID: `alquimista_tecnica_adicional`. Activa; 0 EN, 10 PM; CD 4 ciclos; objetivo aliado, individual. Job 20; rango máximo 1.

Retira un efecto de herida del destinatario. Resiste un 15 % de la potencia del siguiente perjuicio, durante 2 turnos.

## Herrero

Tier 2.5.

### Golpe de forja

ID: `herrero_ataque`. Activa; 35 EN, 0 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.1. Retira una mejora del rival.

### Refuerzo de campaña

ID: `herrero_tactica`. Activa; 35 EN, 0 PM; CD 4 ciclos; objetivo aliado, individual. Job 15; rango máximo 10.

Protección del 13 % de vida del lanzador durante 2 turnos. Prepara refuerzo durante 3 turnos para técnicas y pasivas compatibles.

### Temple del acero

ID: `herrero_pasiva`. Pasiva. Job 25; rango máximo 1.

Al conceder protección, preparas dos pulsos de cura del 1 % de tu vida máxima cada uno. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Martillo quebrantador

ID: `herrero_avanzada`. Activa; 55 EN, 0 PM; CD 5 ciclos; objetivo enemigo, fila. Job 30; rango máximo 10.

Ataque con potencia ×1.8. Afecta a fila; el presupuesto se reparte entre sus objetivos. Consume refuerzo para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico.

### Maestría de reparación

ID: `herrero_maestria`. Pasiva. Job 40; rango máximo 1.

Al consumir una preparación, obtienes protección equivalente al 3 % de tu vida máxima. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Desmontar refuerzo

ID: `herrero_tecnica_adicional`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo propio, individual. Job 20; rango máximo 1.

Consume hasta 2 cargas de refuerzo si existen. Protección del 4 % de vida del lanzador durante 1 turnos.

## Verdugo

Tier 3.

### Hacha quebrantadora

ID: `verdugo_ataque`. Activa; 40 EN, 0 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.15. Retira una mejora del rival. Prepara ejecucion durante 3 turnos para técnicas y pasivas compatibles.

### Preparar ejecución

ID: `verdugo_tactica`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo enemigo, individual. Job 15; rango máximo 10.

Ataque con potencia ×1.35. Prepara ejecucion durante 3 turnos para técnicas y pasivas compatibles.

### Fuerza implacable

ID: `verdugo_pasiva`. Pasiva. Job 25; rango máximo 1.

Al atacar a un rival protegido, conservas un enlace residual para la siguiente técnica de tu clase de origen. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Ejecución implacable

ID: `verdugo_avanzada`. Activa; 45 EN, 0 PM; CD 5 ciclos; objetivo enemigo, individual. Job 30; rango máximo 10.

Ataque con potencia ×1.85. Consume ejecucion para aumentar hasta 15 % el daño; sin ella conserva su efecto básico.

### Maestría del cadalso

ID: `verdugo_maestria`. Pasiva. Job 40; rango máximo 1.

Al actuar sobre un objetivo por debajo del 50 % de vida, preparas 5 puntos de precisión para un impacto. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Suspender sentencia

ID: `verdugo_tecnica_adicional`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo propio, individual. Job 20; rango máximo 1.

Consume hasta 2 cargas de ejecucion si existen. Retira un efecto de exposicion del lanzador. Protección del 4 % de vida del lanzador durante 1 turnos.

## Saqueador

Tier 3.

### Desgarro voraz

ID: `saqueador_ataque`. Activa; 40 EN, 0 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.05. Herida: 16 % del ataque por pulso durante 2 turnos. Drena un 10 % del daño efectivo, con límite del 8 % de vida del lanzador.

### Paso de saqueo

ID: `saqueador_tactica`. Activa; 25 EN, 0 PM; CD 4 ciclos; objetivo propio, individual. Job 15; rango máximo 10.

Cura un 10 % de vida máxima. Te desplazas a retaguardia.

### Instinto rapaz

ID: `saqueador_pasiva`. Pasiva. Job 25; rango máximo 1.

Al aplicar o consumir una herida, preparas 5 puntos de precisión para un impacto. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Cosecha voraz

ID: `saqueador_avanzada`. Activa; 55 EN, 0 PM; CD 5 ciclos; objetivo enemigo, individual. Job 30; rango máximo 10.

Ataque con potencia ×1.25. Consume herida y convierte parte de su presupuesto pendiente.

### Maestría del despojo

ID: `saqueador_maestria`. Pasiva. Job 40; rango máximo 1.

Al sacrificar un efecto propio, preparas dos pulsos de cura del 1 % de tu vida máxima cada uno. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Cauterizar

ID: `saqueador_tecnica_adicional`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo enemigo, individual. Job 20; rango máximo 1.

Consume herida y convierte parte de su presupuesto pendiente.

## Campeón de arena

Tier 3.

### Puño del campeón

ID: `campeon_arena_ataque`. Activa; 40 EN, 0 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.2. Prepara adaptacion durante 3 turnos para técnicas y pasivas compatibles.

### Segundo aliento

ID: `campeon_arena_tactica`. Activa; 35 EN, 0 PM; CD 4 ciclos; objetivo propio, individual. Job 15; rango máximo 10.

Cura un 10 % de vida máxima. Prepara adaptacion durante 3 turnos para técnicas y pasivas compatibles.

### Resistencia de arena

ID: `campeon_arena_pasiva`. Pasiva. Job 25; rango máximo 1.

Al alternar una técnica ofensiva y una de apoyo, acortas en un pulso una herida propia sin sufrirlo. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Romper el cerco

ID: `campeon_arena_avanzada`. Activa; 55 EN, 0 PM; CD 5 ciclos; objetivo enemigo, fila. Job 30; rango máximo 10.

Ataque con potencia ×1.9. Afecta a fila; el presupuesto se reparte entre sus objetivos. Consume adaptacion para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico.

### Maestría del duelo largo

ID: `campeon_arena_maestria`. Pasiva. Job 40; rango máximo 1.

Al usar una técnica con menos del 30 % de energía, recuperas hasta el 25 % de la energía pagada, con límite compartido de 10 EN por ciclo. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Romper el clinch

ID: `campeon_arena_tecnica_adicional`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo propio, individual. Job 20; rango máximo 1.

Consume hasta 2 cargas de adaptacion si existen. Retira un efecto de marca del lanzador. Te desplazas a fila central.

## Mariscal

Tier 3.

### Lanza de contención

ID: `mariscal_ataque`. Activa; 50 EN, 0 PM; CD 3 ciclos; objetivo enemigo, fila. Job 1; rango máximo 10.

Ataque con potencia ×1.75. Afecta a fila; el presupuesto se reparte entre sus objetivos. Prepara formacion durante 3 turnos para técnicas y pasivas compatibles.

### Formación defensiva

ID: `mariscal_tactica`. Activa; 45 EN, 0 PM; CD 4 ciclos; objetivo aliado, individual. Job 15; rango máximo 10.

Protección del 12 % de vida del lanzador durante 2 turnos. Prepara formacion durante 3 turnos para técnicas y pasivas compatibles.

### Disciplina de mando

ID: `mariscal_pasiva`. Pasiva. Job 25; rango máximo 1.

Al usar una técnica de movilidad, acortas en un pulso una herida propia sin sufrirlo. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Estocada de mando

ID: `mariscal_avanzada`. Activa; 45 EN, 0 PM; CD 5 ciclos; objetivo enemigo, individual. Job 30; rango máximo 10.

Ataque con potencia ×1.5. Consume formacion para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico.

### Maestría de coordinación

ID: `mariscal_maestria`. Pasiva. Job 40; rango máximo 1.

Al usar una técnica de área, resistes parcialmente el siguiente perjuicio durante dos turnos. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Disolver formación

ID: `mariscal_tecnica_adicional`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo aliado, individual. Job 20; rango máximo 1.

Consume hasta 2 cargas de formacion si existen. Protección del 8 % de vida del lanzador durante 2 turnos. Prepara custodia durante 3 turnos para técnicas y pasivas compatibles.

## Vigía

Tier 3.

### Disparo de vigilancia

ID: `vigia_ataque`. Activa; 35 EN, 0 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.15. Prepara respuesta durante 3 turnos para técnicas y pasivas compatibles.

### Posición ventajosa

ID: `vigia_tactica`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo propio, individual. Job 15; rango máximo 10.

Te desplazas a retaguardia. Prepara respuesta durante 3 turnos para técnicas y pasivas compatibles. Protección del 7 % de vida del lanzador durante 2 turnos.

### Ojo de frontera

ID: `vigia_pasiva`. Pasiva. Job 25; rango máximo 1.

Al cambiar de destinatario respecto a la técnica anterior, resistes parcialmente el siguiente perjuicio durante dos turnos. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Salva de frontera

ID: `vigia_avanzada`. Activa; 50 EN, 0 PM; CD 5 ciclos; objetivo enemigo, fila. Job 30; rango máximo 10.

Ataque con potencia ×1.9. Afecta a fila; el presupuesto se reparte entre sus objetivos. Consume respuesta para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico.

### Maestría de observación

ID: `vigia_maestria`. Pasiva. Job 40; rango máximo 1.

Al preparar una técnica, expones un 5 % de defensa enemiga para un impacto. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Ceder la ventana

ID: `vigia_tecnica_adicional`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo aliado, individual. Job 20; rango máximo 1.

Consume hasta 2 cargas de respuesta si existen. Protección del 4 % de vida del lanzador durante 1 turnos.

## Runista

Tier 3.

### Sello abrasador

ID: `runista_ataque`. Activa; 0 EN, 18 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×0.9. Herida: 14 % del ataque por pulso durante 2 turnos. Sello circuito: reserva un 18 % del mejor ataque durante 3 turnos; se consume al cerrar un circuito.

### Inscripción de poder

ID: `runista_tactica`. Activa; 0 EN, 16 PM; CD 4 ciclos; objetivo aliado, individual. Job 15; rango máximo 10.

Protección del 10 % de vida del lanzador durante 2 turnos. Prepara circuito durante 3 turnos para técnicas y pasivas compatibles.

### Tinta arcana

ID: `runista_pasiva`. Pasiva. Job 25; rango máximo 1.

Al consumir una preparación, recuperas hasta el 25 % del maná pagado, con límite compartido de 5 PM por ciclo. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Círculo de ruptura

ID: `runista_avanzada`. Activa; 0 EN, 34 PM; CD 5 ciclos; objetivo enemigo, fila. Job 30; rango máximo 10.

Ataque con potencia ×1.7. Afecta a fila; el presupuesto se reparte entre sus objetivos. Consume circuito para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico. Cierra y consume tus sellos del objetivo.

### Maestría de circuitos

ID: `runista_maestria`. Pasiva. Job 40; rango máximo 1.

Al atacar a un rival protegido, expones un 5 % de defensa enemiga para un impacto. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Circuito abierto

ID: `runista_tecnica_adicional`. Activa; 0 EN, 10 PM; CD 4 ciclos; objetivo aliado, individual. Job 20; rango máximo 1.

Retira un efecto de sello del lanzador. Resiste un 15 % de la potencia del siguiente perjuicio, durante 2 turnos.

## Abjurador

Tier 3.

### Pulso de rechazo

ID: `abjurador_ataque`. Activa; 0 EN, 16 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.05. Consume contramagia para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico. Retira una mejora del rival.

### Barrera de negación

ID: `abjurador_tactica`. Activa; 0 EN, 20 PM; CD 6 ciclos; objetivo aliado, individual. Job 15; rango máximo 10.

Bloquea el siguiente impacto directo durante dos turnos; los pulsos no la consumen. Prepara contramagia durante 3 turnos para técnicas y pasivas compatibles.

### Conocimiento protector

ID: `abjurador_pasiva`. Pasiva. Job 25; rango máximo 1.

Al conceder protección, recuperas hasta el 25 % del maná pagado, con límite compartido de 5 PM por ciclo. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Disipación hostil

ID: `abjurador_avanzada`. Activa; 0 EN, 26 PM; CD 5 ciclos; objetivo enemigo, fila. Job 30; rango máximo 10.

Ataque con potencia ×1.65. Afecta a fila; el presupuesto se reparte entre sus objetivos. Retira una mejora del rival.

### Maestría de negación

ID: `abjurador_maestria`. Pasiva. Job 40; rango máximo 1.

Al eliminar una mejora enemiga, resistes parcialmente el siguiente perjuicio durante dos turnos. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Descargar barrera

ID: `abjurador_tecnica_adicional`. Activa; 0 EN, 10 PM; CD 4 ciclos; objetivo aliado, individual. Job 20; rango máximo 1.

Transfiere un 50 % de tu protección a un aliado, conservando su duración. Sobre ti convierte el 20 % en recuperación, sin duplicar presupuesto. Elimina un perjuicio del destinatario.

## Señor de la guerra

Tier 3.5.

### Ruptura de línea

ID: `senor_guerra_ataque`. Activa; 50 EN, 0 PM; CD 3 ciclos; objetivo enemigo, fila. Job 1; rango máximo 10.

Ataque con potencia ×1.85. Afecta a fila; el presupuesto se reparte entre sus objetivos. Prepara frente durante 3 turnos para técnicas y pasivas compatibles.

### Orden de conquista

ID: `senor_guerra_tactica`. Activa; 50 EN, 0 PM; CD 4 ciclos; objetivo aliado, fila. Job 15; rango máximo 10.

Afecta a fila; el presupuesto se reparte entre sus objetivos. Protección del 24 % de vida del lanzador durante 2 turnos. Prepara frente durante 3 turnos para técnicas y pasivas compatibles.

### Presencia del caudillo

ID: `senor_guerra_pasiva`. Pasiva. Job 25; rango máximo 1.

Al consumir una preparación de ruptura, obtienes protección equivalente al 3 % de tu vida máxima. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Asalto del caudillo

ID: `senor_guerra_avanzada`. Activa; 45 EN, 0 PM; CD 5 ciclos; objetivo enemigo, individual. Job 30; rango máximo 10.

Ataque con potencia ×1.9. Consume frente para aumentar hasta 15 % el daño; sin ella conserva su efecto básico.

### Maestría de frentes

ID: `senor_guerra_maestria`. Pasiva. Job 40; rango máximo 1.

Al conceder protección, expones un 5 % de defensa enemiga para un impacto. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Cerrar el frente

ID: `senor_guerra_tecnica_adicional`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo aliado, individual. Job 20; rango máximo 1.

Consume hasta 2 cargas de frente si existen. Protección del 8 % de vida del lanzador durante 2 turnos. Prepara custodia durante 3 turnos para técnicas y pasivas compatibles.

## Avatar de la tormenta

Tier 3.5.

### Puño de la tormenta

ID: `avatar_tormenta_ataque`. Activa; 45 EN, 22 PM; CD 5 ciclos; objetivo enemigo, fila. Job 1; rango máximo 10.

Ataque con potencia ×1.8. Afecta a fila; el presupuesto se reparte entre sus objetivos. Consume tempestad para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico. Aplica rayo; puede consumir una preparación elemental compatible.

### Canalizar la tempestad

ID: `avatar_tormenta_tactica`. Activa; 25 EN, 12 PM; CD 4 ciclos; objetivo propio, individual. Job 15; rango máximo 10.

Prepara tempestad durante 3 turnos para técnicas y pasivas compatibles. Protección del 10 % de vida del lanzador durante 2 turnos.

### Equilibrio elemental

ID: `avatar_tormenta_pasiva`. Pasiva. Job 25; rango máximo 1.

Al pagar energía y maná en la misma técnica, recuperas hasta el 25 % del maná pagado, con límite compartido de 5 PM por ciclo. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Convergencia del trueno

ID: `avatar_tormenta_avanzada`. Activa; 40 EN, 18 PM; CD 5 ciclos; objetivo enemigo, individual. Job 30; rango máximo 10.

Ataque con potencia ×1.9. Consume tempestad para aumentar hasta 15 % el daño; sin ella conserva su efecto básico.

### Maestría de canalización

ID: `avatar_tormenta_maestria`. Pasiva. Job 40; rango máximo 1.

Al preparar una técnica, preparas dos pulsos de cura del 1 % de tu vida máxima cada uno. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Disipar tempestad

ID: `avatar_tormenta_tecnica_adicional`. Activa; 25 EN, 3 PM; CD 4 ciclos; objetivo propio, individual. Job 20; rango máximo 1.

Consume campo y convierte parte de su presupuesto pendiente. Retira un efecto de exposicion del lanzador.

## Cazador espectral

Tier 3.5.

### Flecha espectral

ID: `cazador_espectral_ataque`. Activa; 35 EN, 4 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.2. Drena un 15 % del daño efectivo, con límite del 8 % de vida del lanzador. Prepara vinculo funeral durante 3 turnos para técnicas y pasivas compatibles.

### Acecho funerario

ID: `cazador_espectral_tactica`. Activa; 30 EN, 3 PM; CD 4 ciclos; objetivo aliado, individual. Job 15; rango máximo 10.

Protección del 12 % de vida del lanzador durante 2 turnos. Prepara observacion durante 3 turnos para técnicas y pasivas compatibles.

### Ojo del más allá

ID: `cazador_espectral_pasiva`. Pasiva. Job 25; rango máximo 1.

Al aplicar o consumir una herida, conservas un enlace residual para la siguiente técnica de tu clase de origen. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Lluvia de ánimas

ID: `cazador_espectral_avanzada`. Activa; 45 EN, 7 PM; CD 5 ciclos; objetivo enemigo, fila. Job 30; rango máximo 10.

Ataque con potencia ×1.8. Herida: 8 % del ataque por pulso durante 2 turnos. Afecta a fila; el presupuesto se reparte entre sus objetivos. Consume observacion para recuperar un 4 % de vida del lanzador; sin ella conserva su efecto básico.

### Maestría del vínculo

ID: `cazador_espectral_maestria`. Pasiva. Job 40; rango máximo 1.

Al cambiar de destinatario respecto a la técnica anterior, preparas dos pulsos de cura del 1 % de tu vida máxima cada uno. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Liberar vínculo

ID: `cazador_espectral_tecnica_adicional`. Activa; 25 EN, 3 PM; CD 4 ciclos; objetivo propio, individual. Job 20; rango máximo 1.

Retira un efecto de vinculo del lanzador. Adelanta y consume un pulso de cura pendiente.

## Arconte

Tier 3.5.

### Convergencia sagrada

ID: `arconte_ataque`. Activa; 0 EN, 26 PM; CD 3 ciclos; objetivo enemigo, fila. Job 1; rango máximo 10.

Ataque con potencia ×1.85. Afecta a fila; el presupuesto se reparte entre sus objetivos. Prepara luz durante 3 turnos para técnicas y pasivas compatibles.

### Luz del arconte

ID: `arconte_tactica`. Activa; 0 EN, 34 PM; CD 6 ciclos; objetivo aliado, fila. Job 15; rango máximo 10.

Cura un 26 % de vida máxima. Afecta a fila; el presupuesto se reparte entre sus objetivos. Elimina un perjuicio del destinatario. Prepara luz durante 3 turnos para técnicas y pasivas compatibles.

### Gracia arcana

ID: `arconte_pasiva`. Pasiva. Job 25; rango máximo 1.

Al usar una técnica de apoyo, resistes parcialmente el siguiente perjuicio durante dos turnos. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Mandato celestial

ID: `arconte_avanzada`. Activa; 0 EN, 28 PM; CD 5 ciclos; objetivo aliado, fila. Job 30; rango máximo 10.

Afecta a fila; el presupuesto se reparte entre sus objetivos. Protección del 23 % de vida del lanzador durante 2 turnos. Consume luz para proteger al lanzador un 4 % de su vida; sin ella conserva su efecto básico.

### Maestría de concordia

ID: `arconte_maestria`. Pasiva. Job 40; rango máximo 1.

Al sobrar parte de una curación, recuperas hasta el 2 % de tu vida máxima. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Redistribuir santuario

ID: `arconte_tecnica_adicional`. Activa; 0 EN, 10 PM; CD 4 ciclos; objetivo aliado, individual. Job 20; rango máximo 1.

Transfiere un 50 % de tu protección a un aliado, conservando su duración. Sobre ti convierte el 20 % en recuperación, sin duplicar presupuesto. Consume luz para recuperar un 4 % de vida del lanzador; sin ella conserva su efecto básico.

## Justiciero

Tier 3.5.

### Puño de justicia

ID: `justiciero_ataque`. Activa; 30 EN, 10 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.25. Prepara deuda durante 3 turnos para técnicas y pasivas compatibles.

### Amparo del justo

ID: `justiciero_tactica`. Activa; 25 EN, 12 PM; CD 4 ciclos; objetivo aliado, individual. Job 15; rango máximo 10.

Cura un 15 % de vida máxima. Protección del 6 % de vida del lanzador durante 2 turnos. Prepara deuda durante 3 turnos para técnicas y pasivas compatibles.

### Convicción

ID: `justiciero_pasiva`. Pasiva. Job 25; rango máximo 1.

Al recuperar vida real de un aliado, acortas en un pulso una herida propia sin sufrirlo. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Veredicto sagrado

ID: `justiciero_avanzada`. Activa; 40 EN, 18 PM; CD 5 ciclos; objetivo enemigo, fila. Job 30; rango máximo 10.

Ataque con potencia ×1.85. Afecta a fila; el presupuesto se reparte entre sus objetivos. Consume deuda para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico.

### Maestría de reparación

ID: `justiciero_maestria`. Pasiva. Job 40; rango máximo 1.

Al sobrar parte de una curación, resistes parcialmente el siguiente perjuicio durante dos turnos. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Saldar agravio

ID: `justiciero_tecnica_adicional`. Activa; 25 EN, 3 PM; CD 4 ciclos; objetivo aliado, individual. Job 20; rango máximo 1.

Consume hasta 2 cargas de deuda si existen. Protección del 4 % de vida del lanzador durante 1 turnos.

## Hoja del velo

Tier 3.5.

### Corte del velo

ID: `hoja_velo_ataque`. Activa; 35 EN, 4 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.25. Consume velo para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico.

### Filo entre mundos

ID: `hoja_velo_tactica`. Activa; 30 EN, 3 PM; CD 4 ciclos; objetivo propio, individual. Job 15; rango máximo 10.

Te desplazas a fila central. Prepara velo durante 3 turnos para técnicas y pasivas compatibles. Protección del 8 % de vida del lanzador durante 2 turnos.

### Acero del velo

ID: `hoja_velo_pasiva`. Pasiva. Job 25; rango máximo 1.

Al consumir una preparación de ruptura, preparas 5 puntos de precisión para un impacto. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Ruptura entre mundos

ID: `hoja_velo_avanzada`. Activa; 45 EN, 7 PM; CD 5 ciclos; objetivo enemigo, fila. Job 30; rango máximo 10.

Ataque con potencia ×1.85. Afecta a fila; el presupuesto se reparte entre sus objetivos. Consume velo para aumentar hasta 15 % el daño; sin ella conserva su efecto básico.

### Maestría de tránsito

ID: `hoja_velo_maestria`. Pasiva. Job 40; rango máximo 1.

Al usar una técnica de movilidad, conservas un enlace residual para la siguiente técnica de tu clase de origen. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Anclar al mundo

ID: `hoja_velo_tecnica_adicional`. Activa; 25 EN, 3 PM; CD 4 ciclos; objetivo propio, individual. Job 20; rango máximo 1.

Consume hasta 2 cargas de velo si existen. Retira un efecto de exposicion del lanzador.

## Danzaespadas

Tier 3.5.

### Danza cortante

ID: `danzaespadas_ataque`. Activa; 40 EN, 5 PM; CD 3 ciclos; objetivo enemigo, fila. Job 1; rango máximo 10.

Ataque con potencia ×1.8. Afecta a fila; el presupuesto se reparte entre sus objetivos. Prepara compas durante 3 turnos para técnicas y pasivas compatibles.

### Danza de la victoria

ID: `danzaespadas_tactica`. Activa; 35 EN, 5 PM; CD 4 ciclos; objetivo aliado, fila. Job 15; rango máximo 10.

Afecta a fila; el presupuesto se reparte entre sus objetivos. Protección del 20 % de vida del lanzador durante 2 turnos. Prepara compas durante 3 turnos para técnicas y pasivas compatibles.

### Gracia del acero

ID: `danzaespadas_pasiva`. Pasiva. Job 25; rango máximo 1.

Al usar una técnica de movilidad, recuperas hasta el 25 % del maná pagado, con límite compartido de 5 PM por ciclo. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Último compás

ID: `danzaespadas_avanzada`. Activa; 40 EN, 5 PM; CD 5 ciclos; objetivo enemigo, individual. Job 30; rango máximo 10.

Ataque con potencia ×1.8. Consume compas para aumentar hasta 15 % el daño; sin ella conserva su efecto básico.

### Maestría del compás

ID: `danzaespadas_maestria`. Pasiva. Job 40; rango máximo 1.

Al alternar una técnica ofensiva y una de apoyo, preparas 5 puntos de precisión para un impacto. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Romper el compás

ID: `danzaespadas_tecnica_adicional`. Activa; 25 EN, 3 PM; CD 4 ciclos; objetivo aliado, individual. Job 20; rango máximo 1.

Consume hasta 2 cargas de compas si existen. Transfiere un 50 % de tu protección a un aliado, conservando su duración. Sobre ti convierte el 20 % en recuperación, sin duplicar presupuesto. Te desplazas a fila central.

## Corsario

Tier 3.5.

### Abordaje

ID: `corsario_ataque`. Activa; 40 EN, 0 PM; CD 3 ciclos; objetivo enemigo, individual. Job 1; rango máximo 10.

Ataque con potencia ×1.2. Prepara incursion durante 3 turnos para técnicas y pasivas compatibles. Prepara incursion durante 3 turnos para técnicas y pasivas compatibles.

### Maniobra de escape

ID: `corsario_tactica`. Activa; 25 EN, 0 PM; CD 4 ciclos; objetivo propio, individual. Job 15; rango máximo 10.

Te desplazas a retaguardia. Protección del 10 % de vida del lanzador durante 2 turnos. Prepara incursion durante 3 turnos para técnicas y pasivas compatibles.

### Veterano del abordaje

ID: `corsario_pasiva`. Pasiva. Job 25; rango máximo 1.

Al actuar sobre un objetivo marcado por ti, recuperas hasta el 25 % de la energía pagada, con límite compartido de 10 EN por ciclo. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Salva de abordaje

ID: `corsario_avanzada`. Activa; 55 EN, 0 PM; CD 5 ciclos; objetivo enemigo, fila. Job 30; rango máximo 10.

Ataque con potencia ×1.85. Afecta a fila; el presupuesto se reparte entre sus objetivos. Consume incursion para ignorar hasta 15 % de defensa; sin ella conserva su efecto básico.

### Maestría de incursión

ID: `corsario_maestria`. Pasiva. Job 40; rango máximo 1.

Al consumir una preparación, recuperas hasta el 2 % de tu vida máxima. Una vez por ciclo. Las ventajas de la misma familia no se acumulan.

### Abandonar abordaje

ID: `corsario_tecnica_adicional`. Activa; 30 EN, 0 PM; CD 4 ciclos; objetivo propio, individual. Job 20; rango máximo 1.

Consume hasta 2 cargas de incursion si existen. Te desplazas a retaguardia. Protección del 4 % de vida del lanzador durante 1 turnos.
