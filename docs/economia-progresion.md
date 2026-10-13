# Balance económico: primera pasada

Los valores de oro por hora de este documento son **estimaciones brutas y nominales**. No incluyen probabilidad de derrota, tiempo de recuperación, eventos aleatorios, botín de equipo ni variaciones individuales de velocidad. Sirven para comparar las fórmulas, no como promesa del rendimiento neto de cada partida.

## Expediciones de combate

Las recompensas base son 50, 90, 250, 700 y 1.800 de oro para misiones de 0,5, 1, 3, 9 y 24 horas. El generador suma `floor(rng × recompensaBase × 0,2)`: la media matemática exacta para estos múltiplos de 5 es base + `(floor(base × 0,2) − 1) / 2`, medio oro inferior a la aproximación simplificada del 10 %.

| Duración nominal | Oro medio de la misión | Oro medio bruto por hora |
|---:|---:|---:|
| 30 minutos | 54,5 | 109 |
| 1 hora | 98,5 | 98,5 |
| 3 horas | 274,5 | 91,5 |
| 9 horas | 769,5 | 85,5 |
| 24 horas | 1.979,5 | 82,48 |

Esto no incluye el oro del enemigo ni el botín de equipo. Fácil aplica 0,85 al pago; Difícil aplica 1,25 y aumenta la fuerza del enemigo. La probabilidad de victoria no está fijada como un porcentaje por nivel: depende de las estadísticas y de la resolución del combate. En caso de derrota, el código conserva el 20 % de la recompensa de misión (ajustada por dificultad), pero no entrega el oro del enemigo ni un objeto de botín; la XP Base se reduce al 10 % de la recompensa de victoria.

### Sensibilidad a la probabilidad de victoria

La siguiente tabla usa el pago base medio, dificultad Normal y el porcentaje que se asegura al caer. Los porcentajes de victoria son escenarios hipotéticos para comparar el riesgo; **no son probabilidades atribuidas automáticamente a un personaje**.

| Duración | Victoria 50 % | Victoria 75 % | Victoria 90 % |
|---:|---:|---:|---:|
| 30 minutos | 65,4 oro/h | 87,2 oro/h | 100,3 oro/h |
| 1 hora | 59,1 oro/h | 78,8 oro/h | 90,6 oro/h |
| 3 horas | 54,9 oro/h | 73,2 oro/h | 84,2 oro/h |
| 9 horas | 51,3 oro/h | 68,4 oro/h | 78,7 oro/h |
| 24 horas | 49,5 oro/h | 66,0 oro/h | 75,9 oro/h |

La fórmula es `(recompensa media × [pVictoria + 0,2 × (1 − pVictoria)] × multiplicadorDificultad) / horas`. Los pagos reales incluyen redondeos. La recompensa por enemigo se excluye de esta tabla porque varía con la amenaza derrotada.

### Ejemplo concreto: misión corta contra una Rata Gigante

Para mostrar cómo influyen los ingresos secundarios, uso una misión nominal de 30 minutos, recompensa base media de 54,5 de oro y la Rata Gigante de amenaza 1 (botín base 18). En una victoria se obtiene el pago de la misión más el oro del enemigo; en una derrota solo se asegura el 20 % del pago de misión. Se añade el valor esperado de reventa del botín común, suponiendo espacio de inventario y vendiéndolo por el 35 % del catálogo.

| Escenario hipotético | Oro/h de misión y enemigo | Oro/h esperado de reventa de botín | Total esperado |
|---|---:|---:|---:|
| Fácil, 90 % de victoria | 112,78 | 8,94 | 121,71 |
| Normal, 75 % de victoria | 114,20 | 7,45 | 121,65 |
| Difícil, 55 % de victoria | 111,95 | 5,46 | 117,41 |

Esta no es una simulación del éxito real ni un resultado garantizado: las probabilidades se han supuesto para el análisis, los pagos se redondean en el servidor y el valor de botín se materializa solo si cae un objeto y cabe en el inventario. El equipo equipado no se vende, pero aporta valor de progresión que esta tabla no monetiza.

### Comparación de dificultades

Como las probabilidades de victoria dependen del combate concreto, no existe un porcentaje fijo por dificultad. Para comparar solo la recompensa de misión, uso un escenario explícito: Fácil con un 90 % de victorias, Normal con un 75 % y Difícil con un 55 %. Se conserva el pago del 20 % al perder y se aplican los multiplicadores configurados (0,85 / 1 / 1,25). No se incluyen oro del enemigo ni equipo.

| Duración | Fácil (90 %) | Normal (75 %) | Difícil (55 %) |
|---:|---:|---:|---:|
| 30 minutos | 85,2 oro/h | 87,2 oro/h | 87,2 oro/h |
| 1 hora | 77,0 oro/h | 78,8 oro/h | 78,8 oro/h |
| 3 horas | 71,6 oro/h | 73,2 oro/h | 73,2 oro/h |
| 9 horas | 66,9 oro/h | 68,4 oro/h | 68,4 oro/h |
| 24 horas | 64,5 oro/h | 66,0 oro/h | 66,0 oro/h |

Es una comparación de sensibilidad, no una predicción del éxito real. Difícil queda similar a Normal en esta hipótesis, pero puede entregar más oro del enemigo y mejores recompensas secundarias; si la probabilidad real de victoria cae por debajo del escenario, la rentabilidad cae también.

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
- A 8 km/h efectivos, los 200 km de ida y vuelta consumen unas 25 horas: 77,44 de oro bruto por hora de viaje exitoso antes de riesgos y eventos.

En comercio, la recompensa se obtiene únicamente si se sobrevive a las dos partes de la ruta; un fracaso devuelve 0 de oro comercial. Para el escenario de referencia, 100 km por trayecto a 8 km/h requieren 25 horas de ida y vuelta. El rendimiento esperado, ajustado por éxito y sin eventos, es 38,72 oro/h con un 50 % de éxito, 58,08 con un 75 % y 69,70 con un 90 %. Esos porcentajes son escenarios de análisis, no probabilidades simuladas o fijadas por el juego. Las emboscadas y el clima siguen afectando al resultado.

## Materiales y equipamiento

Los precios unitarios de materiales pasan a 50 para madera, 100 para piedra y 250 para metal. El metal sigue siendo el recurso más valioso (5 veces la madera y 2,5 veces la piedra), pero se evita que una mejora común consuma casi todo el valor de compra de una espada. Los descuentos del Mercado conservan un 10 % por nivel y quedan limitados al nivel 3.

La Espada de Madera cuesta 100; la Espada de Hierro 800; la Espada de Acero 1.800 y la Espada Rúnica 6.500. La Armadura de Acero rara cuesta 5.200 por su utilidad y penalización de velocidad; el precio no se fija únicamente por rareza. El Anillo Maldito cuesta 3.200: aporta +6 de ataque a cambio de −20 de vida, −4 de defensa y −4 de velocidad, por lo que es una pieza ofensiva de riesgo y recompensa. Los accesorios no se pueden mejorar en la Herrería; por eso su catálogo solo declara estadísticas base, sin incrementos de mejora que la interfaz no permitiría obtener.

El coste de oro de la mejora ya no depende del precio comercial. Parte de 60 para armas y 50 para armaduras, aplica multiplicadores por rareza y categoría, y escala con `(nivelMejora + 1)^1,25`. Así una anomalía en el precio de tienda no crea mejoras de cientos de miles o millones. Los costes de materiales siguen escalando por rareza y tramo de mejora.

A modo de referencia, una espada común consume dos unidades de metal (500 de oro de catálogo) y la espada rara consume seis (1.500); la armadura pesada rara consume metal y piedra. Estos valores son el equivalente al precio de compra de materiales, no un segundo cobro en oro: el jugador paga los recursos o los compra en el Mercado.


## Edificios y taberna

Los precios de construcción declarados pasan a ser los costes efectivos iniciales, eliminando el redondeo indirecto que producía un descuento oculto. El oro y los materiales crecen conjuntamente por `1,5^nivelActual`.

Las comidas pasan a costar entre 20 y 110 de oro. Los platos de nivel 1 siguen siendo accesibles y las recetas de nivel 3 cuestan más en proporción a sus bonificaciones combinadas.

La nueva batería `tests/economy-balance.test.cjs` cubre catálogo, independencia del precio de compra, costes de materiales, ingresos nominales por hora, recompensas comerciales, precios de comidas y mejoras de edificios.
