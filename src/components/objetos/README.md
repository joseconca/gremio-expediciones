# Presentación de objetos en el RPG

**Un objeto, una definición.** Los datos, estadísticas, precios y sprites siguen viniendo de `src/lib/catalogos/objetos.ts` y de las funciones públicas de `src/lib/objetos.ts`. No se crean catálogos ni cálculos alternativos de economía.

## Componentes compartidos

- `MiniaturaObjeto.tsx`: botón con miniatura o icono alternativo; abre la ventana que ya usa el proyecto mediante `DescripcionTactil`. Es accesible con ratón, teclado y pantalla táctil. No pone acciones comerciales dentro del panel de información.
- `detalles-objeto.ts`: transforma la definición y el ejemplar (nivel de mejora y bonificaciones) en líneas fáciles de leer. Muestra estadísticas no nulas, rareza, subtipo, manos ocupadas y efectos de consumibles; reutiliza `calcularEstadisticasObjeto`.
- `../ui/DescripcionTactil.tsx`: propietario del portal, clic fuera, Escape, foco y posición del popup. No dupliques esta interacción en tiendas o inventarios.

### ¿Cómo se usa?

En un catálogo (sin nivel de mejora): `<MiniaturaObjeto objeto={objeto} />`.

En equipo, forja o mochila (con una instancia): `<MiniaturaObjeto objeto={item.objeto} instancia={item} />`.

Se puede pasar `claseBoton` para respetar el tamaño y diseño de cada pantalla; `detallesAdicionales` para datos específicos de la tienda (por ejemplo, nivel requerido), y `iconoAlternativo` cuando no existe PNG.

La tarjeta o fila **mantiene su propio layout** (nombre, cantidad, precio, botones Comprar/Equipar/Vender/Mejorar), porque las acciones de cada contexto son diferentes. Solo se comparte la consulta del objeto.

## Dónde cambiar un objeto

- Definición y costes: `src/lib/catalogos/objetos.ts` (fuente única).
- Bonificaciones por nivel y sprite: `src/lib/objetos.ts`.
- Texto o formato de la ventana: `detalles-objeto.ts` (sin alterar mecánicas).
- Aspecto de la miniatura: `MiniaturaObjeto.tsx`.
- Operaciones de compra, venta, forja, inventario y equipamiento: `src/app/base/{armeria,herreria,botica,personaje}/page.tsx`.
- Presentación de ofertas, ventas y forja: `src/components/armeria/` y `src/components/herreria/`.
- Contrato de datos de `GET /api/objetos`: `src/lib/equipamiento/datos-objetos.ts`.
- Carga inicial y recarga compartidas por Armería y Herrería: `src/hooks/useDatosObjetosEdificio.ts`.

Verificación: `npm run test:base` incluye `tests/objetos-presentacion.test.cjs`; revisar también `npm run test:progression`, `npm run lint` y `npm run build`. La interfaz final requiere comprobación visual tanto en móvil como en PC.
