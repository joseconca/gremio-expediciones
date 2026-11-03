# Economía: precios y contratos del Mercado

Las reglas puras están en `mercado.ts`. Las rutas de `src/app/api/mercado/comprar/` y `src/app/api/mercado/vender/` conservan autenticación, comprobación de edificio y las escrituras condicionadas `updateMany` sobre saldo y existencias.

- `validarSolicitudMercado`: misma validación de JSON, recurso y cantidad en compra y venta, con los mensajes originales.
- `calcularPrecioRecurso`: compra con descuento del Mercado (niveles 1–3).
- `calcularPrecioVentaRecurso`: **25 % del precio base**, sin aplicar descuentos de compra.
- `calcularPrecioVentaObjeto` y `calcularPrecioRecompraObjeto`: **35 %** y **70 %** del catálogo, respectivamente, con la regla original de recompra por encima de la venta.

Los límites `MAX_CANTIDAD_MERCADO` y `MAX_INT_POSTGRES` no se pueden omitir en las rutas: protegen importes y desbordamientos. No sustituir los `updateMany` condicionales por un `update` de lectura previa: dos operaciones simultáneas deben competir por saldo y recursos sin duplicarlos.

Para modificar costes de edificios, requisitos o niveles máximos, editar `src/lib/base/edificios.ts`, no este archivo. Los costes de forja están en `src/lib/objetos.ts` y el inventario en `src/lib/equipamiento/`.

Pruebas: `tests/economy-balance.test.cjs` protege precios, descuentos, validaciones y construcción; `tests/base-economic-routes.test.cjs` protege errores y actualizaciones condicionadas de las APIs.
