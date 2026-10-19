# Sistema de objetos del RPG

## Inventario e instancias

El inventario admite 30 filas de objetos. Cada fila representa una instancia con identificador propio; pueden existir varias copias de la misma definición, y cada copia conserva su nivel de mejora, sufijo y bonificaciones. El límite se comprueba en servidor al comprar y recomprar, y también al entregar botín.

Los consumibles pueden guardarse en cantidades en una instancia; una pila ocupa un espacio. Vender la pila la vende completa.

## Ranuras de equipamiento

El personaje puede llevar diez piezas:

1. Arma principal, de una o dos manos.
2. Mano secundaria.
3. Casco.
4. Armadura de torso.
5. Pantalones.
6. Botas.
7. Guantes.
8. Collar.
9. Anillo 1.
10. Anillo 2.

Cada arma declara `subtipo` con su familia (espada, arco, daga, etc.). Las armaduras de cuerpo declaran `subtipo` como `ligera`, `media` o `pesada`. El escudo de mano secundaria declara `subtipo: escudo` y usa el sistema de dominio de equipo, no el de categorías de armadura. Las piezas de tipo accesorio (collares y anillos) quedan exentas de penalizaciones de armadura.

Las armas a dos manos bloquean la mano secundaria. El servidor valida la compatibilidad; un objeto equipado no puede venderse. Al mover un objeto de ranura, se limpia su ubicación anterior y no queda duplicado en dos slots. El equipo no se puede equipar, desequipar ni mejorar mientras el personaje está de viaje o combatiendo; el servidor vuelve a comprobar ese estado dentro de la transacción para evitar cambios concurrentes con el inicio de una expedición.

## Variedad del botín

La Armería agrupa la tienda en secciones separadas de armas, armaduras y escudos, y accesorios. El catálogo también reserva para los enemigos equipo que no se puede comprar: nuevas familias de armas físicas y mágicas, mejoras para cada ranura defensiva, anillos, collares, amuletos y una poción de recuperación superior.

Las tablas de los enemigos normales se amplían por rareza; los encuentros raros y épicos pueden conceder piezas superiores a las de tienda, y los enemigos legendarios y jefes incluyen el equipo de mayor nivel. La probabilidad de botín permanece vinculada a la rareza del enemigo, sin aumentar artificialmente por añadir opciones a las tablas.

## Sufijos y rareza

Los objetos básicos y comunes no llevan sufijo. Los objetos de mayor rareza que se obtienen como botín reciben un sufijo persistido en la instancia, junto con sus bonificaciones numéricas. El nombre visible tiene la forma «Espada de madera veloz».

Los enemigos normales no pueden generar sufijos legendarios. Los jefes tienen mayor probabilidad de soltar un objeto y pueden generar sufijos legendarios. Las bonificaciones almacenadas se añaden al cálculo de estadísticas reales de combate; no son solo un cambio visual del nombre. Comprar una copia en la Armería crea un objeto normal, sin rerollear sufijos.

La tabla de sufijos está en `src/lib/sufijosObjetos.ts`; las probabilidades y tablas de botín se definen en `src/lib/enemigos.ts`, y la tirada ponderada en `src/lib/lootObjetos.ts`.

## Consumibles en combate

En combate PvE, el panel **Objetos** muestra los consumibles curativos que lleva el personaje. Usar una poción consume una unidad y restaura los puntos de vida definidos por el objeto, sin superar los PV máximos. No se permite gastar una poción si el personaje ya está al máximo de vida, si no posee la instancia indicada o si el objeto no es un consumible curativo. El consumo, la actualización de la salud de combate y el avance de versión se guardan en la misma transacción para impedir duplicados en peticiones concurrentes.

Los consumibles en asedios PvP continúan deshabilitados; no se habilitan hasta que el flujo de ambos participantes y su persistencia de recursos tenga cobertura equivalente de pruebas.

## Venta y recompra

- La venta devuelve el 35 % del precio base de catálogo multiplicado por la cantidad de la pila.
- El sistema guarda una única última venta en `Inventario.ultimaVenta`. Una venta posterior reemplaza la anterior.
- La recompra cuesta el 70 % del precio base (o un mínimo de una moneda por encima de la venta), conserva el sufijo, las bonificaciones y el nivel de mejora, y consume la última venta guardada.
- La venta y la recompra se ejecutan en transacciones. No se puede vender una pieza equipada. No se puede recomprar sin oro o espacio en el inventario.

## Estado de estabilización

Verificado en la rama `estabilizacion-clases-objetos`:
- [x] Bonificaciones del equipo aplicadas a máximos y regeneración de Energía/Maná durante el combate.
- [x] Equipar, desequipar y mejorar bloqueados durante viaje/combate, con revalidación en transacción.
- [x] Uso de consumibles curativos en combate PvE: propiedad, cantidad, PV máximos y consumo atómico.
- [x] Inventario máximo de 30 instancias y mensaje explícito cuando un botín no cabe.
- [x] Venta y recompra conservan la instancia, sufijo, mejoras y bonificaciones; la recompra duplicada se rechaza.
- [x] CI completa: pruebas de base/API, motor del mundo, progresión, ESLint y build de producción.

Pendiente antes de cerrar por completo el sistema de objetos:
- [ ] Validación integral manual/UI de compras, venta, recompra, equipo y consumibles en una partida real.
- [ ] Consumibles durante asedios PvP, cuando estén cubiertos los dos participantes y la persistencia de sus estados.
- [ ] Revisar el recorrido de edificios y las integraciones de tienda una vez cerrada la verificación del núcleo de objetos.

## Migración

La migración `20261012190000_objetos_instance_system` elimina la restricción que impedía varias instancias de una misma definición, añade los campos de sufijo y bonificaciones, amplía el modelo de equipo y guarda una instantánea de la última venta. También abona una sola vez el 30 % del valor de catálogo por unidad de los objetos legacy incluidos en la tabla SQL; conserva los objetos existentes. Ese abono no se procesa desde una ruta de aplicación, por lo que no vuelve a pagarse con las compras, ventas o sesiones normales.

Antes de ejecutar migraciones sobre PostgreSQL local, comprueba `npx prisma migrate status` y la tabla `_prisma_migrations`. Si el esquema se ha gestionado con `prisma db push` y no tiene historial de migraciones, establece primero una línea base; no ejecutes `npx prisma migrate deploy` a ciegas. La migración no se ha ejecutado sobre tu base local durante esta implementación.
