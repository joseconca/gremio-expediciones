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

Las armas a dos manos bloquean la mano secundaria. El servidor valida la compatibilidad; un objeto equipado no puede venderse. Al mover un objeto de ranura, se limpia su ubicación anterior y no queda duplicado en dos slots. El equipo no se puede equipar, desequipar ni mejorar mientras el personaje está de viaje o combatiendo; el servidor vuelve a comprobar ese estado dentro de la transacción para evitar cambios concurrentes con el inicio de una expedición.

## Sufijos y rareza

Los objetos básicos y comunes no llevan sufijo. Los objetos de mayor rareza que se obtienen como botín reciben un sufijo persistido en la instancia, junto con sus bonificaciones numéricas. El nombre visible tiene la forma «Espada de madera veloz».

Los enemigos normales no pueden generar sufijos legendarios. Los jefes tienen mayor probabilidad de soltar un objeto y pueden generar sufijos legendarios. Las bonificaciones almacenadas se añaden al cálculo de estadísticas reales de combate; no son solo un cambio visual del nombre. Comprar una copia en la Armería crea un objeto normal, sin rerollear sufijos.

La tabla de sufijos está en `src/lib/sufijosObjetos.ts`; las probabilidades y tablas de botín se definen en `src/lib/enemigos.ts`, y la tirada ponderada en `src/lib/lootObjetos.ts`.

## Venta y recompra

- La venta devuelve el 35 % del precio base de catálogo multiplicado por la cantidad de la pila.
- El sistema guarda una única última venta en `Inventario.ultimaVenta`. Una venta posterior reemplaza la anterior.
- La recompra cuesta el 70 % del precio base (o un mínimo de una moneda por encima de la venta), conserva el sufijo, las bonificaciones y el nivel de mejora, y consume la última venta guardada.
- La venta y la recompra se ejecutan en transacciones. No se puede vender una pieza equipada. No se puede recomprar sin oro o espacio en el inventario.

## Migración

La migración `20261012190000_objetos_instance_system` elimina la restricción que impedía varias instancias de una misma definición, añade los campos de sufijo y bonificaciones, amplía el modelo de equipo y guarda una instantánea de la última venta. También abona una sola vez el 30 % del valor de catálogo por unidad de los objetos legacy incluidos en la tabla SQL; conserva los objetos existentes. Ese abono no se procesa desde una ruta de aplicación, por lo que no vuelve a pagarse con las compras, ventas o sesiones normales.

Antes de ejecutar migraciones sobre PostgreSQL local, comprueba `npx prisma migrate status` y la tabla `_prisma_migrations`. Si el esquema se ha gestionado con `prisma db push` y no tiene historial de migraciones, establece primero una línea base; no ejecutes `npx prisma migrate deploy` a ciegas. La migración no se ha ejecutado sobre tu base local durante esta implementación.
