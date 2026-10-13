# Balance económico: primera pasada

Los valores de oro por hora de este documento son **estimaciones brutas y nominales**. No incluyen probabilidad de derrota, tiempo de recuperación, eventos aleatorios, botín de equipo ni variaciones individuales de velocidad. Sirven para comparar las fórmulas, no como promesa del rendimiento neto de cada partida.

## Expediciones de combate

Las recompensas base son 50, 90, 250, 700 y 1.800 de oro para misiones de 0,5, 1, 3, 9 y 24 horas. La variación de la recompensa está entre el 0 y el 20 %, con media matemática del 10 % sobre la base.

| Duración nominal | Oro medio de la misión | Oro medio bruto por hora |
|---:|---:|---:|
| 30 minutos | 55 | 110 |
| 1 hora | 99 | 99 |
| 3 horas | 275 | 91,7 |
| 9 horas | 770 | 85,6 |
| 24 horas | 1.980 | 82,5 |

Esto no incluye el oro que entrega el enemigo ni el multiplicador de dificultad. Fácil aplica 0,85 al pago; Difícil aplica 1,25 y aumenta la fuerza del enemigo. El ingreso esperado ajustado por riesgo depende de la probabilidad de victoria.

## Comercio entre bases

El oro base comercial pasa a 8 por kilómetro. Las bonificaciones quedan limitadas: nivel de personaje hasta +40 %, Mercado hasta +10 %, afinidad hasta +25 %, capacidad extra hasta +50 % y clase Comerciante +10 %. Al multiplicarse entre sí, los límites evitan que la combinación alcance importes desproporcionados.

Escenario de referencia: 100 km, nivel 15, Mercado 3, afinidad 100, capacidad 20 y clase Comerciante:
- Oro base: 800.
- Recompensa sin eventos: 1.936.
- Si la velocidad media efectiva es 8 km/h, ida y vuelta suman unas 12,5 horas: cerca de 155 de oro bruto por hora antes de riesgos y eventos.

Se mantienen las emboscadas y el clima. La recompensa se pierde en caso de fracaso, por lo que la cifra anterior no es neta: depende de las estadísticas reales y de sobrevivir a ambas partes del viaje.

## Materiales y equipamiento

Los precios unitarios de materiales pasan a 50 para madera, 100 para piedra y 350 para metal. El metal sigue siendo el recurso más valioso, pero baja su coste relativo para que las mejoras comunes sean alcanzables. Los descuentos del Mercado conservan un 10 % por nivel y quedan limitados al nivel 3.

La Espada de Madera cuesta 100; la Espada de Hierro 800; la Espada de Acero 1.800 y la Espada Rúnica 6.500. La Armadura de Acero rara cuesta 5.200 por su utilidad y penalización de velocidad; el precio no se fija únicamente por rareza. El Anillo Maldito cuesta 3.200, mantiene penalizaciones iniciales pero estas son compensables con mejoras.

El coste de oro de la mejora ya no depende del precio comercial. Parte de 60 para armas y 50 para armaduras, aplica multiplicadores por rareza y categoría, y escala con `(nivelMejora + 1)^1,25`. Así una anomalía en el precio de tienda no crea mejoras de cientos de miles o millones. Los costes de materiales siguen escalando por rareza y tramo de mejora.

## Edificios y taberna

Los precios de construcción declarados pasan a ser los costes efectivos iniciales, eliminando el redondeo indirecto que producía un descuento oculto. El oro y los materiales crecen conjuntamente por `1,5^nivelActual`.

Las comidas pasan a costar entre 20 y 110 de oro. Los platos de nivel 1 siguen siendo accesibles y las recetas de nivel 3 cuestan más en proporción a sus bonificaciones combinadas.

La nueva batería `tests/economy-balance.test.cjs` cubre catálogo, independencia del precio de compra, costes de materiales, ingresos nominales por hora, recompensas comerciales, precios de comidas y mejoras de edificios.
