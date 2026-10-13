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

Esto no incluye el oro del enemigo ni el botín de equipo. Fácil aplica 0,85 al pago; Difícil aplica 1,25 y aumenta la fuerza del enemigo. La probabilidad de victoria no está fijada como un porcentaje por nivel: depende de las estadísticas y de la resolución del combate. En caso de derrota, el código conserva el 20 % de la recompensa de misión (ajustada por dificultad), pero no entrega el oro del enemigo ni un objeto de botín; la XP Base se reduce al 10 % de la recompensa de victoria.

### Sensibilidad a la probabilidad de victoria

La siguiente tabla usa el pago base medio, dificultad Normal y el porcentaje que se asegura al caer. Los porcentajes de victoria son escenarios hipotéticos para comparar el riesgo; **no son probabilidades atribuidas automáticamente a un personaje**.

| Duración | Victoria 50 % | Victoria 75 % | Victoria 90 % |
|---:|---:|---:|---:|
| 30 minutos | 66,0 oro/h | 88,0 oro/h | 101,2 oro/h |
| 1 hora | 59,4 oro/h | 79,2 oro/h | 91,1 oro/h |
| 3 horas | 55,0 oro/h | 73,3 oro/h | 84,3 oro/h |
| 9 horas | 51,3 oro/h | 68,4 oro/h | 78,7 oro/h |
| 24 horas | 49,5 oro/h | 66,0 oro/h | 75,9 oro/h |

La fórmula es `(recompensa media × [pVictoria + 0,2 × (1 − pVictoria)] × multiplicadorDificultad) / horas`. Los pagos reales incluyen redondeos. La recompensa por enemigo se excluye de esta tabla porque varía con la amenaza derrotada.

### Valor secundario del botín de equipo

El servidor tira un objeto solamente al regresar de una victoria y si queda espacio en el inventario. Las probabilidades predeterminadas de botín son 8 % para enemigos comunes, 14 % poco comunes, 22 % raros, 32 % épicos, 42 % legendarios y 70 % jefes. Algunos enemigos tienen probabilidades o tablas personalizadas.

Para estimar su contribución económica he convertido el precio de catálogo de los objetos de las tablas genéricas en valor de reventa, al 35 % del catálogo (sin atribuir valor monetario al sufijo, las mejoras ni el uso del objeto):

| Rareza del enemigo / tabla | Prob. de botín | Reventa media si cae un objeto | Valor esperado por victoria |
|---|---:|---:|---:|
| Común | 8 % | 62,06 | 4,97 |
| Poco común | 14 % | 300,08 | 42,01 |
| Raro | 22 % | 679,50 | 149,49 |
| Épico | 32 % | 1.664,09 | 532,51 |
| Legendario | 42 % | 1.764,00 | 740,88 |
| Jefe | 70 % | 1.704,57 | 1.193,20 |

Son medias teóricas para las tablas genéricas de rareza, no pagos garantizados. Un objeto personalizado puede tener otro valor esperado; si el inventario está lleno, el botín se pierde, y si equipas el objeto, su valor de uso puede ser superior a la reventa. La victoria entrega además el oro propio del enemigo, calculado por amenaza y dificultad, que tampoco se incluye en la tabla base.

## Comercio entre bases

El oro base comercial pasa a 8 por kilómetro. Las bonificaciones quedan limitadas: nivel de personaje hasta +40 %, Mercado hasta +10 %, afinidad hasta +25 %, capacidad extra hasta +50 % y clase Comerciante +10 %. Al multiplicarse entre sí, los límites evitan que la combinación alcance importes desproporcionados.

Escenario de referencia: 100 km, nivel 15, Mercado 3, afinidad 100, capacidad 20 y clase Comerciante:
- Oro base: 800.
- Recompensa sin eventos: 1.936.
- Si la velocidad media efectiva es 8 km/h, ida y vuelta suman unas 12,5 horas: cerca de 155 de oro bruto por hora antes de riesgos y eventos.

En comercio, la recompensa se obtiene únicamente si se sobrevive a las dos partes de la ruta; un fracaso devuelve 0 de oro comercial. Para el escenario de referencia, la sensibilidad sin eventos es: 77,44 oro/h con 50 % de éxito, 116,16 con 75 % y 139,39 con 90 %. Esos porcentajes son escenarios de análisis, no probabilidades simuladas o fijadas por el juego. Las emboscadas y el clima siguen afectando al resultado.

## Materiales y equipamiento

Los precios unitarios de materiales pasan a 50 para madera, 100 para piedra y 350 para metal. El metal sigue siendo el recurso más valioso, pero baja su coste relativo para que las mejoras comunes sean alcanzables. Los descuentos del Mercado conservan un 10 % por nivel y quedan limitados al nivel 3.

La Espada de Madera cuesta 100; la Espada de Hierro 800; la Espada de Acero 1.800 y la Espada Rúnica 6.500. La Armadura de Acero rara cuesta 5.200 por su utilidad y penalización de velocidad; el precio no se fija únicamente por rareza. El Anillo Maldito cuesta 3.200, mantiene penalizaciones iniciales pero estas son compensables con mejoras.

El coste de oro de la mejora ya no depende del precio comercial. Parte de 60 para armas y 50 para armaduras, aplica multiplicadores por rareza y categoría, y escala con `(nivelMejora + 1)^1,25`. Así una anomalía en el precio de tienda no crea mejoras de cientos de miles o millones. Los costes de materiales siguen escalando por rareza y tramo de mejora.

## Edificios y taberna

Los precios de construcción declarados pasan a ser los costes efectivos iniciales, eliminando el redondeo indirecto que producía un descuento oculto. El oro y los materiales crecen conjuntamente por `1,5^nivelActual`.

Las comidas pasan a costar entre 20 y 110 de oro. Los platos de nivel 1 siguen siendo accesibles y las recetas de nivel 3 cuestan más en proporción a sus bonificaciones combinadas.

La nueva batería `tests/economy-balance.test.cjs` cubre catálogo, independencia del precio de compra, costes de materiales, ingresos nominales por hora, recompensas comerciales, precios de comidas y mejoras de edificios.
