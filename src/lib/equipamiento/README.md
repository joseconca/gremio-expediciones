# Equipamiento: dónde modificar cada regla

Esta carpeta concentra reglas puras de armas, armaduras, accesorios, instancias y tiendas. Las rutas HTTP están en `src/app/api/objetos/` y no se deben incorporar aquí consultas Prisma.

| Archivo | Responsabilidad |
| --- | --- |
| `inventario.ts` | Construcción de los objetos visibles, equipo, creación de inventario y **límite común** de 30 huecos con `hayHuecoInventario` |
| `ranuras.ts` | Identificadores de equipo para las pantallas y `estaInstanciaEquipadaPersistida` para venta/forja, con las diez ranuras persistidas |
| `ultima-venta.ts` | Creación y lectura del recibo `inventario.ultimaVenta` para venta y recompra de la **misma instancia** |
| `tienda.ts` | Requisitos por rareza y disponibilidad de Armería |
| `sufijos.ts` | Nombres y bonificaciones de objetos con sufijos |
| `botin.ts` | Tiradas y características de drops |
| `datos-objetos.ts` | Tipo de respuesta compartido de `GET /api/objetos` |

**No fusionar contratos diferentes:** comprar genera una nueva instancia sin sufijo; vender guarda un único recibo con mejora y bonificaciones; recomprar restaura el ID, sufijo y la mejora y consume ese recibo una sola vez; la forja exige estar equipado y cobra oro/materiales dentro de una transacción; party puede apilar ciertos objetos. Conservar sus transacciones, actualizaciones condicionadas y errores HTTP.

Los precios de venta (**35 %**) y recompra (**70 %**) se calculan en `src/lib/economia/mercado.ts`. Los objetos y sus valores se editan únicamente en `src/lib/catalogos/objetos.ts`.
